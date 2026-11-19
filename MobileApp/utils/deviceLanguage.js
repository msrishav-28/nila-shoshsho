import {getLocales} from 'react-native-localize';

export const getDeviceLanguage = () => getLocales()[0]?.languageCode;
