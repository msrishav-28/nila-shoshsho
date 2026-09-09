import React, {useContext, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import {ActivityIndicator} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';

const Login = () => {
  const {t} = useTranslation();
  const {loginWithEmailPassword, loading} = useContext(UserContext);
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: t('login.emailRequiredTitle'),
        text2: t('login.emailRequiredMsg'),
      });
      return;
    }
    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('login.passwordTitle'),
        text2: t('login.passwordMsg'),
      });
      return;
    }
    try {
      const result = await loginWithEmailPassword({
        email: email.trim(),
        password,
      });
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: result.message,
          text2: t('login.successMsg'),
        });
        navigation.reset({
          index: 0,
          routes: [{name: 'MainApp'}],
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('login.failedTitle'),
          text2: result.message || t('login.failedMsg'),
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('login.failedTitle'),
        text2: err.message || t('login.failedMsg'),
      });
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Welcome')}>
          <Image
            source={require('../assets/icons/back.png')}
            style={{width: 25, height: 25}}
          />
        </TouchableOpacity>
        <Text style={styles.appName}>{t('login.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, {paddingHorizontal: 24}]}>
        <Text style={styles.description}>{t('login.desc')}</Text>

        <TextInput
          placeholder={t('login.emailPlaceholder')}
          placeholderTextColor={theme.text3}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder={t('login.passwordPlaceholder')}
          placeholderTextColor={theme.text3}
          secureTextEntry={!showPassword}
          style={styles.input}
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.togglePassword}>
          <Text
            style={{
              color: theme.darkBrown,
              fontFamily: theme.font.bold,
              fontSize: theme.fs6,
            }}>
            {showPassword ? t('login.hidePassword') : t('login.showPassword')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={{padding: 20}}>
        <TouchableOpacity style={styles.signupButton} onPress={handleLogin}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signupText}>{t('login.submit')}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.loginLink}>
          <Text style={styles.footer}>{t('login.noAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={[styles.footer, {color: theme.darkBrown}]}>
              {' '}
              {t('login.goSignup')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'column',
    backgroundColor: '#fff',
    gap: 7,
    marginBottom: -10,
  },
  backButton: {
    padding: 10,
    backgroundColor: theme.darkBrown,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
    width: 50,
  },
  appName: {
    fontSize: theme.fs0,
    fontFamily: theme.font.dark,
    color: theme.text2,
  },
  form: {},
  description: {
    fontSize: theme.fs7,
    fontFamily: theme.font.light,
    color: theme.text2,
    marginBottom: 10,
  },
  footer: {
    fontSize: theme.fs6,
    fontFamily: theme.font.light,
    color: theme.text2,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
    padding: 12,
    marginVertical: 8,
    fontSize: theme.fs6,
    backgroundColor: '#fff',
    color: theme.text,
    fontFamily: theme.font.regular,
  },
  togglePassword: {
    marginTop: -4,
    marginBottom: 10,
    alignSelf: 'flex-end',
  },
  signupButton: {
    backgroundColor: theme.secondary,
    padding: 14,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  signupText: {
    color: '#fff',
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
  },
  loginLink: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 10,
  },
});

export default Login;
