import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';

const resources = {
  en: {translation: en},
  hi: {translation: hi},
  mr: {translation: mr},
  ta: {translation: ta},
};

const fallbackLng = 'en';

const initI18n = async () => {
  try {
    const storedLang = await AsyncStorage.getItem('appLanguageValue');
    const defaultLang = RNLocalize.getLocales()[0]?.languageCode || fallbackLng;

    await i18n
      .use(initReactI18next)
      .init({
        compatibilityJSON: 'v3',
        resources,
        fallbackLng,
        lng: storedLang || defaultLang,
        interpolation: {
          escapeValue: false,
        },
      });
  } catch (error) {
    console.error("Error initializing i18n:", error);
  }
};

initI18n(); // Call async init

export default i18n;
