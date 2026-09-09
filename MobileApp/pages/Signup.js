import React, {useContext, useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';
import {ActivityIndicator} from 'react-native-paper';
import {useTranslation} from 'react-i18next';

const Signup = () => {
  const {t} = useTranslation();
  const {signup, loading} = useContext(UserContext);

  const navigation = useNavigation();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [role, setRole] = useState('');
  const [gender, setGender] = useState('');

  const [openRole, setOpenRole] = useState(false);
  const [openGender, setOpenGender] = useState(false);

  const [roleItems, setRoleItems] = useState([
    {label: t('signup.roleFarmer'), value: 'Farmer'},
    {label: t('signup.roleLogistics'), value: 'Logistics'},
  ]);
  const [genderItems, setGenderItems] = useState([
    {label: t('signup.genderMale'), value: 'Male'},
    {label: t('signup.genderFemale'), value: 'Female'},
    {label: t('signup.genderOther'), value: 'Other'},
  ]);

  const handleSignup = async () => {
    if (!username.trim() || !email.trim() || !password || !role || !gender) {
      Toast.show({
        type: 'error',
        text1: t('signup.requiredTitle'),
        text2: t('signup.requiredMsg'),
      });
      return;
    }
    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('signup.passwordTitle'),
        text2: t('signup.passwordMsg'),
      });
      return;
    }
    const userData = {
      username: username.trim(),
      email: email.trim(),
      password,
      role,
      gender,
    };

    try {
      const result = await signup(userData);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: result.message,
          text2: t('signup.successMsg'),
        });
        navigation.reset({
          index: 0,
          routes: [{name: 'MainApp'}],
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('signup.failedTitle'),
          text2: result.message || t('signup.failedMsg'),
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('signup.failedTitle'),
        text2: err.message || t('signup.failedMsg'),
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
        <Text style={styles.appName}>{t('signup.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, {paddingHorizontal: 24}]}>
        <Text style={styles.description}>{t('signup.desc')}</Text>

        <TextInput
          placeholder={t('signup.usernamePlaceholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          placeholder={t('signup.emailPlaceholder')}
          placeholderTextColor={theme.text3}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          placeholder={t('signup.passwordPlaceholder')}
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
            {showPassword ? t('signup.hidePassword') : t('signup.showPassword')}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.rowDropdowns,
            {zIndex: openRole ? 999 : openGender ? 998 : 1},
          ]}>
          <View style={{flex: 1}}>
            <DropDownPicker
              open={openRole}
              value={role}
              items={roleItems}
              setOpen={setOpenRole}
              setValue={setRole}
              setItems={setRoleItems}
              placeholder={t('signup.rolePlaceholder')}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>
          <View style={{flex: 1}}>
            <DropDownPicker
              open={openGender}
              value={gender}
              items={genderItems}
              setOpen={setOpenGender}
              setValue={setGender}
              setItems={setGenderItems}
              placeholder={t('signup.genderPlaceholder')}
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>
        </View>
      </ScrollView>

      <View style={{padding: 20}}>
        <TouchableOpacity style={styles.signupButton} onPress={handleSignup}>
          {loading ? (
            <ActivityIndicator color='white' />
          ) : (
            <Text style={styles.signupText}>{t('signup.submit')}</Text>
          )}
        </TouchableOpacity>
        <View style={styles.loginLink}>
          <Text style={styles.footer}>{t('signup.hasAccount')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.footer, {color: theme.darkBrown}]}>
              {' '}
              {t('signup.goLogin')}
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
  rowDropdowns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  dropdown: {
    borderColor: theme.border,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs6,
    color: theme.text,
  },
  dropdownContainer: {
    borderColor: theme.border,
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

export default Signup;
