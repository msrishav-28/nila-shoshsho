import {Platform} from 'react-native';

const localHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_ACCOUNT_API_URL || `http://${localHost}:5001/api`
).replace(/\/+$/, '');
export const AIBACKEND_URL = (
  process.env.EXPO_PUBLIC_ADVICE_API_URL || `http://${localHost}:5002`
).replace(/\/+$/, '');
