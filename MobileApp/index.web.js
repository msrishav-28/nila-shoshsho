/* eslint-env browser */

import '@expo/metro-runtime';
import {registerRootComponent} from 'expo';
import {FontDisplay, loadAsync} from 'expo-font';
import App from './App';
import i18n from './i18n';

const fonts = {
  'Poppins-Regular': require('./assets/fonts/Poppins-Regular.ttf'),
  'Poppins-Medium': require('./assets/fonts/Poppins-Medium.ttf'),
  'Poppins-SemiBold': require('./assets/fonts/Poppins-SemiBold.ttf'),
  'Poppins-Bold': require('./assets/fonts/Poppins-Bold.ttf'),
  Feather: require('react-native-vector-icons/Fonts/Feather.ttf'),
};

for (const [family, source] of Object.entries(fonts)) {
  loadAsync(family, {uri: source, display: FontDisplay.SWAP}).catch(error => {
    console.warn(`Could not load ${family}`, error);
  });
}

i18n.on('languageChanged', language => {
  document.documentElement.lang = language;
});
registerRootComponent(App);
