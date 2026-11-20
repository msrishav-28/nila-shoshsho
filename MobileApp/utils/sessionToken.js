import * as SecureStore from 'expo-secure-store';

const key = 'nila.accessToken';

export const readSessionToken = () => SecureStore.getItemAsync(key);
export const writeSessionToken = token =>
  token
    ? SecureStore.setItemAsync(key, token)
    : SecureStore.deleteItemAsync(key);
