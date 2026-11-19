import {PermissionsAndroid, Platform} from 'react-native';
import {Audio} from 'expo-av';
import * as FileSystem from 'expo-file-system';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service';
import {audioPart} from '../utils/audioPart';

async function hasPermission(permission) {
  return (
    (await PermissionsAndroid.check(permission)) ||
    (await PermissionsAndroid.request(permission)) ===
      PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function choosePhoto({camera = false, base64 = false} = {}) {
  if (
    camera &&
    Platform.OS === 'android' &&
    !(await hasPermission(PermissionsAndroid.PERMISSIONS.CAMERA))
  ) {
    throw new Error(
      'Allow camera access to take a photo. You can also choose a saved photo.',
    );
  }
  const open = camera ? launchCamera : launchImageLibrary;
  const response = await open({
    mediaType: 'photo',
    quality: 0.8,
    maxWidth: 1600,
    maxHeight: 1600,
    includeBase64: base64,
  });
  if (response.didCancel) {
    return null;
  }
  const photo = response.assets?.[0];
  if (!photo?.uri) {
    throw new Error(response.errorMessage || 'Could not open a photo.');
  }
  return {
    uri: photo.uri,
    name: photo.fileName || 'photo.jpg',
    type: photo.type || 'image/jpeg',
    base64: photo.base64,
    size: photo.fileSize,
  };
}

export async function chooseDocument() {
  try {
    const [file] = await pick({type: [types.pdf], allowMultiSelection: false});
    if (!file?.uri) {
      return null;
    }
    const [copy] = await keepLocalCopy({
      destination: 'cachesDirectory',
      files: [{uri: file.uri, fileName: file.name || 'document.pdf'}],
    });
    const uri = copy?.status === 'success' ? copy.localUri : file.uri;
    return {
      uri,
      name: file.name || 'document.pdf',
      type: 'application/pdf',
      size: file.size,
    };
  } catch (error) {
    if (
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED
    ) {
      return null;
    }
    throw error;
  }
}

export async function readRemoteDocument(url, name = 'document.pdf') {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error(
      'This saved document has no secure download link. Choose the original file to continue.',
    );
  }
  const uri = `${
    FileSystem.cacheDirectory
  }translation-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
  const cleanup = () => FileSystem.deleteAsync(uri, {idempotent: true});
  try {
    const result = await FileSystem.downloadAsync(url, uri);
    if (result.status < 200 || result.status >= 300) {
      throw new Error(
        'Could not open the saved PDF. Choose the original file to continue.',
      );
    }
    return {uri, name, type: 'application/pdf', cleanup};
  } catch (error) {
    await cleanup().catch(() => {});
    throw error;
  }
}

export function appendFile(form, key, {uri, name, type}) {
  form.append(key, {uri, name, type});
}

export async function getLocation() {
  if (Platform.OS === 'android') {
    const {ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION} =
      PermissionsAndroid.PERMISSIONS;
    const results = await PermissionsAndroid.requestMultiple([
      ACCESS_FINE_LOCATION,
      ACCESS_COARSE_LOCATION,
    ]);
    if (!Object.values(results).includes(PermissionsAndroid.RESULTS.GRANTED)) {
      throw new Error('Location permission was declined.');
    }
  } else if (
    (await Geolocation.requestAuthorization('whenInUse')) !== 'granted'
  ) {
    throw new Error('Location permission was declined.');
  }
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      ({coords}) => resolve(coords),
      () =>
        reject(
          new Error('Current location is unavailable. Try again outdoors.'),
        ),
      {enableHighAccuracy: false, timeout: 12000, maximumAge: 60000},
    );
  });
}

export async function recordVoice() {
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow microphone access to speak, or type your question.');
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  let recording;
  try {
    recording = (
      await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      )
    ).recording;
  } catch (error) {
    await Audio.setAudioModeAsync({allowsRecordingIOS: false}).catch(() => {});
    throw error;
  }
  let finished = false;
  const stop = async () => {
    if (finished) {
      return null;
    }
    finished = true;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      return uri
        ? {
            uri,
            ...audioPart(uri),
            cleanup: () => FileSystem.deleteAsync(uri, {idempotent: true}),
          }
        : null;
    } finally {
      await Audio.setAudioModeAsync({allowsRecordingIOS: false}).catch(
        () => {},
      );
    }
  };
  return {
    stop,
    cancel: async () => {
      const file = await stop();
      await file?.cleanup();
    },
  };
}

export async function playVoice(base64, onFinish) {
  const {sound} = await Audio.Sound.createAsync({
    uri: `data:audio/wav;base64,${base64}`,
  });
  sound.setOnPlaybackStatusUpdate(status => {
    if (status.didJustFinish) {
      sound.unloadAsync().catch(() => {});
      onFinish();
    }
  });
  try {
    await sound.playAsync();
  } catch (error) {
    await sound.unloadAsync().catch(() => {});
    throw error;
  }
  return () => sound.unloadAsync().catch(() => {});
}
