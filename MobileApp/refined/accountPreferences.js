import AsyncStorage from '@react-native-async-storage/async-storage';

function preferenceKey(user, name) {
  return user?._id ? `refined:${user._id}:${name}` : null;
}

export async function readAccountPreference(user, name) {
  const key = preferenceKey(user, name);
  return key ? AsyncStorage.getItem(key) : null;
}

export async function writeAccountPreference(user, name, value) {
  const key = preferenceKey(user, name);
  if (!key) {
    throw new Error('Log in again to save this preference.');
  }
  await AsyncStorage.setItem(key, value);
}

export async function readVoicePreference(user) {
  return (await readAccountPreference(user, 'voiceLanguage')) || '';
}
