import React, {useState, useContext} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';
import Header from '../components/Header';
import {BACKEND_URL} from '../backendConfig';
import Toast from 'react-native-toast-message';

const PasswordChange = () => {
  const {user} = useContext(UserContext);
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState('confirmation'); // confirmation, otp, newPassword
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle OTP generation
  const handleGenerateOTP = async () => {
    if (!user?.phoneNo) {
      setError('Phone number not found in user profile');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log(user.phoneNo);
      const response = await fetch(`${BACKEND_URL}/otp/otp-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({phoneNo: user.phoneNo}),
      });

      const data = await response.json();
      if (data.success) {
        setCurrentStep('otp');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('An error occurred while sending OTP');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification
  const handleVerifyOTP = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/otp/otp-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({phoneNo: user.phoneNo, otp}),
      });

      const data = await response.json();
      if (data.success) {
        setTimeout(() => {
          Toast.show({
            type: 'success',
            text1: 'Otp verified',
            text2: 'Your otp has been verified successfully.',
          });
          setCurrentStep('newPassword');
          setLoading(false);
        }, 2000);
      } else {
        setError(data.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('An error occurred while verifying OTP');
      setLoading(false);
    }
  };

  //handle update password
  const updatePassword = async () => {
    if (!newPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password not entered',
        text2: 'Please enter a valid password',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password does not match',
        text2: 'Entered passwords are not matching.',
      });
      return;
    }
    if (newPassword === confirmPassword) {
      setError('');
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_URL}/auth/update-password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({newPassword}),
        });
        const data = await response.json();
        if (data.success) {
          Toast.show({
            type: 'success',
            text1: 'Password updated',
            text2: 'Your password has been updated successfully',
          });
          navigation.navigate('Settings');
        } else {
          Toast.show({
            type: 'error',
            text1: 'An Error occured',
            text2: data.message + '.',
          });
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: 'An Error occured',
          text2: 'Please try again later',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  // Render Confirmation Section
  const renderConfirmation = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.description}>
        Are you sure you want to change your password? We will send a one-time
        password (OTP) to your registered phone number to verify your identity.
      </Text>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleGenerateOTP}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Sending OTP...' : 'Yes, Change Password'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render OTP Section
  const renderOTP = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.description}>
        We have sent an OTP to your registered phone number ({user?.phoneNo}).
        Please enter the 4-digit code below.
      </Text>
      <View style={styles.input}>
        <Text style={styles.label}>One-Time Password (OTP)</Text>
        <TextInput
          style={styles.textInput}
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Enter OTP"
          placeholderTextColor={theme.text3}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}>
        <Text style={styles.buttonText}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.resendButton}
        onPress={handleGenerateOTP}
        disabled={loading}>
        <Text style={styles.resendText}>Resend OTP</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNewPassword = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.description}>
        Enter your new password below. Make sure it is strong and secure.
      </Text>
      <View style={styles.input}>
        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.textInput}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="Enter new password"
          placeholderTextColor={theme.text3}
        />
      </View>
      <View style={styles.input}>
        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.textInput}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="Confirm new password"
          placeholderTextColor={theme.text3}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={updatePassword}
        disabled={loading}>
        <Text style={styles.buttonText}>Update Password</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={theme.container}>
      <Header text="Update Password" />
      <ScrollView
        contentContainerStyle={[styles.form, {paddingHorizontal: 24}]}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {currentStep === 'confirmation' && renderConfirmation()}
        {currentStep === 'otp' && renderOTP()}
        {currentStep === 'newPassword' && renderNewPassword()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingBottom: 20,
  },
  sectionContainer: {
    marginVertical: 20,
  },
  description: {
    fontSize: theme.fs7,
    fontFamily: theme.font.light,
    color: theme.text2,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  label: {
    fontSize: theme.fs7,
    fontFamily: theme.font.bold,
    color: theme.text3,
    marginBottom: 4,
  },
  textInput: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text,
  },
  button: {
    backgroundColor: theme.darkBrown,
    padding: 15,
    borderRadius: 3,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: '#fff',
  },
  resendButton: {
    alignItems: 'center',
    marginVertical: 10,
  },
  resendText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text3,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: 'red',
    marginVertical: 10,
    textAlign: 'center',
  },
});

export default PasswordChange;
