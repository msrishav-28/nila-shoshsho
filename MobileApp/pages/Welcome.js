import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';

const Welcome = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();

  return (
    <View style={theme.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.jpg')}
            style={styles.logo}
          />
        </View>

        <View style={styles.contentContainer}>
          <Text style={styles.appName}>{t('welcome.name')}</Text>
          <Text style={styles.description}>{t('welcome.desc')}</Text>

          <TouchableOpacity
            style={[styles.button, {backgroundColor: theme.paddy}]}
            onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.buttonText}>{t('welcome.createAccount')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, {backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.paddy}]}
            onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.buttonText, {color: theme.paddy}]}>{t('welcome.haveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.madeWithLove}>
        <Text style={styles.madeWithLoveText}>{t('welcome.madeInIndia')}</Text>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 270,
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: '10%',
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: 'contain',
  },
  contentContainer: {
    marginTop: '10%',
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  appName: {
    fontSize: theme.fs0,
    fontFamily: theme.font.dark,
    color: theme.text2,
    marginBottom: 10,
  },
  description: {
    fontSize: theme.fs7,
    fontFamily: theme.font.light,
    color: theme.text2,
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    width: '90%',
    minHeight: 52,
    padding: 14,
    borderRadius: 14,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: theme.fs4,
    fontFamily: theme.font.bold,
    color: theme.white,
    textAlign: 'center',
  },
  madeWithLove: {
    position : 'absolute',
    width : '100%',
    alignItems: 'center',
    justifyContent: 'center',
    bottom : 7,
    marginLeft  :  '4%'
  },
  madeWithLoveText: {
    fontSize: 13,
    fontFamily: theme.font.light,
    color: theme.text2,
    opacity: 0.7,
  },
});

export default Welcome;
