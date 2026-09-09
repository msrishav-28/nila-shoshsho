import {createContext, useEffect, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {accountFetch, setUnauthorizedHandler} from '../utils/api';

export const UserContext = createContext();

const persistSession = async nextUser => {
  if (nextUser?.accessToken) {
    await AsyncStorage.setItem('accessToken', nextUser.accessToken);
  }
  await AsyncStorage.setItem('user', JSON.stringify(nextUser));
};

export const UserProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setUnauthorizedHandler(async () => {
      setUser(null);
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('accessToken');
    });
  }, []);

  const signup = async userData => {
    try {
      setLoading(true);
      const res = await accountFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await persistSession(data.user);
        return {success: true, message: 'Signup Successful!'};
      } else {
        return {success: false, message: data.error || data.message};
      }
    } catch (err) {
      return {success: false, message: 'Error occurred while signing up.'};
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailPassword = async loginData => {
    try {
      setLoading(true);
      const res = await accountFetch('/auth/login-email', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await persistSession(data.user);
        return {success: true, message: 'Login Successful!'};
      } else {
        return {success: false, message: data.message};
      }
    } catch (err) {
      return {
        success: false,
        message: 'Error logging in with email and password',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await accountFetch('/auth/logout', {
        method: 'POST',
      });
    } catch (err) {
      if (err) {
        // Network may be down. Local sign-out still proceeds.
      }
    }
    setUser(null);
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('accessToken');
    setLoading(false);
    return {success: true, message: 'Logout Successful!'};
  };

  const updateUser = async userData => {
    try {
      setLoading(true);

      if (userData) {
        const res = await accountFetch('/auth/update-profile', {
          method: 'PUT',
          body: JSON.stringify(userData),
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          await persistSession(data.user);
          return {success: true, message: 'Profile updated successfully!'};
        } else {
          return {
            success: false,
            message: data.message || 'Failed to update profile.',
          };
        }
      }

      return {success: false, message: 'No data provided to update.'};
    } catch (err) {
      return {success: false, message: `${err}`};
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePic = async profilePic => {
    try {
      const response = await accountFetch('/auth/update-profile-pic', {
        method: 'PUT',
        body: JSON.stringify({
          profilePic: profilePic,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        await persistSession(data.user);
        return {
          success: true,
          message: 'Profile picture updated successfully',
        };
      } else {
        return {
          success: false,
          message: data.message || 'Failed to update profile picture',
        };
      }
    } catch (err) {
      return {
        success: false,
        message: 'An error occurred during the image upload.',
      };
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        signup,
        loginWithEmailPassword,
        logout,
        updateUser,
        updateProfilePic,
        setUser,
      }}>
      {children}
    </UserContext.Provider>
  );
};
