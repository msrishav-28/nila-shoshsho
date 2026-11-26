import {createContext, useCallback, useEffect, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getAccessToken,
  restoreAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from '../utils/api';
import {request} from '../refined/data';

export const UserContext = createContext();

function readProfile(data) {
  if (typeof data?.user?._id !== 'string' || !data.user._id) {
    throw new Error('The server did not return a valid account.');
  }
  const {accessToken, ...profile} = data.user;
  return {accessToken, profile};
}

async function migrateSession() {
  let token = getAccessToken() || (await restoreAccessToken());
  const legacy = await AsyncStorage.multiGet(['accessToken', 'user']);
  if (!token) {
    const [[, stored], [, savedProfile]] = legacy;
    if (stored) {
      token = stored;
    } else if (savedProfile) {
      try {
        token = JSON.parse(savedProfile)?.accessToken;
      } catch {
        // A damaged legacy profile cannot restore a session.
      }
    }
    if (typeof token === 'string' && token) {
      await setAccessToken(token);
    }
  }
  if (legacy.some(([, value]) => value !== null)) {
    await AsyncStorage.multiRemove(['accessToken', 'user']);
  }
  return getAccessToken();
}

export const UserProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [restoreError, setRestoreError] = useState(null);
  const migration = useRef(null);
  const profileRevision = useRef(0);

  const clearSession = useCallback(async token => {
    if (getAccessToken() === token) {
      profileRevision.current += 1;
      setUser(null);
      await setAccessToken(null);
    }
  }, []);

  const refreshProfile = useCallback(async signal => {
    const token = getAccessToken();
    const revision = ++profileRevision.current;
    const data = await request('account', '/auth/me', {signal});
    const {profile} = readProfile(data);
    if (!token || token !== getAccessToken()) {
      throw new Error('Sign in again to access your account.');
    }
    if (revision === profileRevision.current) {
      setUser(profile);
    }
    return profile;
  }, []);

  const restoreSession = useCallback(async () => {
    setBooting(true);
    setRestoreError(null);
    try {
      if (!migration.current) {
        migration.current = migrateSession().catch(error => {
          migration.current = null;
          throw error;
        });
      }
      await migration.current;
      if (getAccessToken()) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          await refreshProfile(controller.signal);
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      if (error?.status !== 401) {
        setRestoreError(error);
      }
    } finally {
      setBooting(false);
    }
  }, [refreshProfile]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    restoreSession();
    return () => setUnauthorizedHandler(null);
  }, [clearSession, restoreSession]);

  const forgetSession = async () => {
    setRestoreError(null);
    try {
      await clearSession(getAccessToken());
    } catch (error) {
      setRestoreError(error);
    }
  };

  const authenticate = async (path, body) => {
    setLoading(true);
    try {
      const data = await request('account', path, {
        method: 'POST',
        publicRequest: true,
        body,
      });
      const {accessToken, profile} = readProfile(data);
      if (typeof accessToken !== 'string' || !accessToken) {
        throw new Error('The server did not issue a sign-in token.');
      }
      try {
        await setAccessToken(accessToken);
      } catch (error) {
        await clearSession(accessToken);
        throw error;
      }
      setUser(profile);
      return {success: true, user: profile};
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const token = getAccessToken();
    try {
      const data = await request('account', '/auth/logout', {method: 'POST'});
      await clearSession(token);
      return data;
    } catch (error) {
      if (error?.status === 401 && !getAccessToken()) {
        return {success: true};
      }
      throw error;
    }
  };

  const update = async (path, body) => {
    const token = getAccessToken();
    // A GET started before this write cannot replace the saved profile.
    ++profileRevision.current;
    const data = await request('account', path, {method: 'PUT', body});
    const {profile} = readProfile(data);
    if (token && token === getAccessToken()) {
      ++profileRevision.current;
      setUser(profile);
    }
    return {success: true, user: profile};
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        booting,
        restoreError,
        restoreSession,
        forgetSession,
        refreshProfile,
        signup: body => authenticate('/auth/signup', body),
        loginWithEmailPassword: body => authenticate('/auth/login-email', body),
        logout,
        updateUser: body => update('/auth/update-profile', body),
        updateProfilePic: profilePic =>
          update('/auth/update-profile-pic', {profilePic}),
      }}>
      {children}
    </UserContext.Provider>
  );
};
