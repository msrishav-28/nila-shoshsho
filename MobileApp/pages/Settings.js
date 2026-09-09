import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {theme} from '../theme.config';
import {useNavigation} from '@react-navigation/native';
import {AnimatedCircularProgress} from 'react-native-circular-progress';
import Header from '../components/Header';
import {useContext, useEffect, useState} from 'react';
import {UserContext} from '../context/UserContext';
import {accountFetch} from '../utils/api';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';

const Settings = () => {
  const navigation = useNavigation();
  const {logout} = useContext(UserContext);
  const [progress, setProgress] = useState(0);
  const {t} = useTranslation();

  const btnList = [
    {name: t('update_profile'), route: 'UpdateProfile'},
    {name: t('document'), route: 'Documents'},
    {name: t('change_language'), route: 'LanguageChange'},
    {name: t('change_password'), route: 'PasswordChange'},
    {name: t('logistics.header'), route: 'Logistics'},
  ];

  useEffect(() => {
    const fetchProfileCompletion = async () => {
      try {
        const res = await accountFetch('/auth/profile-completion', {
          method: 'GET',
        });
        const data = await res.json();
        if (data.success) {
          setProgress(data.percentage);
        } else {
          setProgress(0);
          Toast.show({
            type: 'error',
            text1: t('settingsToasts.profileFetchTitle'),
            text2: data.message,
          });
        }
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('settingsToasts.profileFetchTitle'),
          text2: err.toString(),
        });
      }
    };
    fetchProfileCompletion();
  }, []);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: t('settingsToasts.logoutTitle'),
          text2: result.message,
        });
        navigation.navigate('Welcome');
      } else {
        Toast.show({
          type: 'error',
          text1: t('settingsToasts.logoutErrorTitle'),
          text2: result.message,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('settingsToasts.logoutErrorTitle'),
        text2: String(err),
      });
    }
  };

  return (
    <View style={theme.container}>
      <Header text={t('settings')} />
      <View
        style={{
          marginVertical: 20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        <AnimatedCircularProgress
          size={80}
          width={7}
          fill={progress}
          tintColor={theme.secondary}
          backgroundColor="#e0e0e0"
          duration={1000}>
          {() => (
            <Text
              style={{
                fontSize: 15,
                color: theme.text,
                fontFamily: theme.font.regular,
                marginTop: 3,
              }}>
              {progress}%
            </Text>
          )}
        </AnimatedCircularProgress>
        <Text
          style={{
            fontSize: 13,
            color: theme.text3,
            fontFamily: theme.font.regular,
            marginTop: 3,
            width: theme.width - 130,
          }}>{t('profile_complete', {progress})}</Text>
      </View>
      <View style={[{marginHorizontal: -20, marginTop: 5, height: '78%'}]}>
        <ScrollView style={[{width: '100%', height: '100%'}]}>
          {btnList.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.button}
              onPress={() => {
                if (item.route) navigation.navigate(item.route);
              }}>
              <Text style={styles.buttonText}>{item.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.button} onPress={handleLogout}>
            <Text style={[styles.buttonText, {color: 'red'}]}>{t('logout')}</Text>
          </TouchableOpacity>
          <View style={{height: 300}}></View>
        </ScrollView>
      </View>
    </View>
  );
};
export default Settings;

const styles = StyleSheet.create({
  button: {
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
  },
  buttonText: {
    fontSize: theme.fs5,
    color: theme.text2,
    fontFamily: theme.font.bold,
    marginTop: 3,
  },
});
