import {createContext, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BACKEND_URL} from '../backendConfig';

export const UserContext = createContext();

export const UserProvider = ({children}) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const signup = async userData => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
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
      const res = await fetch(`${BACKEND_URL}/auth/login-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
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

  const loginWithPhonePassword = async loginData => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/auth/login-phone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        return {success: true, message: 'Login Successful!'};
      } else {
        return {success: false, message: data.message};
      }
    } catch (err) {
      return {
        success: false,
        message: 'Error logging in with phone and password',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data.success) {
        setUser(null);
        await AsyncStorage.removeItem('user');
        return {success: true, message: 'Logout Successful!'};
      } else {
        return {success: false, message: data.message};
      }
    } catch (err) {
      return {success: false, message: 'Error occurred while logging out.'};
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async userData => {
    try {
      setLoading(true);

      if (userData) {
        const res = await fetch(`${BACKEND_URL}/auth/update-profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        console.log('result', data);
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
          await AsyncStorage.setItem('user', JSON.stringify(data.user));
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
      console.log(err);
      return {success: false, message: `${err}`};
    } finally {
      setLoading(false);
    }
  };

  const updateProfilePic = async profilePic => {
    try {
      console.log('Sending profile pic update request');

      const response = await fetch(`${BACKEND_URL}/auth/update-profile-pic`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profilePic: profilePic,
        }),
      });

      const data = await response.json();
      console.log('profile data' , data)
      if (data.success) {
        setUser(data.user)
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
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
      console.log('Error updating profile pic:', err);
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
        loginWithPhonePassword,
        logout,
        updateUser,
        updateProfilePic,
        setUser,
      }}>
      {children}
    </UserContext.Provider>
  );
};
