import {PermissionsAndroid, Platform} from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {File, Paths} from 'expo-file-system';
import {
  Accuracy,
  getCurrentPositionAsync,
  getLastKnownPositionAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
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

function cacheFile(prefix, extension) {
  return new File(
    Paths.cache,
    `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`,
  );
}

async function removeFile(file) {
  if (file.exists) {
    file.delete();
  }
}

export async function readRemoteDocument(url, name = 'document.pdf') {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error(
      'This saved document has no secure download link. Choose the original file to continue.',
    );
  }
  const file = cacheFile('translation', 'pdf');
  const cleanup = () => removeFile(file);
  try {
    const downloaded = await File.downloadFileAsync(url, file);
    return {uri: downloaded.uri, name, type: 'application/pdf', cleanup};
  } catch {
    await cleanup().catch(() => {});
    throw new Error(
      'Could not open the saved PDF. Choose the original file to continue.',
    );
  }
}

export function appendFile(form, key, {uri, name, type}) {
  form.append(key, {uri, name, type});
}

export async function getLocation() {
  const permission = await requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Location permission was declined.');
  }
  let timeout;
  try {
    const lastKnown = await getLastKnownPositionAsync({maxAge: 60000});
    if (lastKnown) {
      return lastKnown.coords;
    }
    const deadline = new Promise((resolve, reject) => {
      timeout = setTimeout(reject, 12000);
    });
    const {coords} = await Promise.race([
      getCurrentPositionAsync({accuracy: Accuracy.Balanced}),
      deadline,
    ]);
    return coords;
  } catch {
    throw new Error('Current location is unavailable. Try again outdoors.');
  } finally {
    clearTimeout(timeout);
  }
}

export async function recordVoice() {
  const permission = await requestRecordingPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Allow microphone access to speak, or type your question.');
  }
  await setAudioModeAsync({allowsRecording: true, playsInSilentMode: true});
  let recorder;
  try {
    const {extension, sampleRate, numberOfChannels, bitRate, android, ios} =
      RecordingPresets.HIGH_QUALITY;
    recorder = new AudioModule.AudioRecorder({
      extension,
      sampleRate,
      numberOfChannels,
      bitRate,
      isMeteringEnabled: false,
      ...Platform.select({android, ios}),
    });
    await recorder.prepareToRecordAsync();
    await recorder.record();
  } catch (error) {
    const uri = recorder?.uri;
    recorder?.release();
    if (uri) {
      await removeFile(new File(uri)).catch(() => {});
    }
    await setAudioModeAsync({allowsRecording: false}).catch(() => {});
    throw error;
  }
  let finished = false;
  const stop = async () => {
    if (finished) {
      return null;
    }
    finished = true;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      return uri
        ? {uri, ...audioPart(uri), cleanup: () => removeFile(new File(uri))}
        : null;
    } catch (error) {
      if (recorder.uri) {
        await removeFile(new File(recorder.uri)).catch(() => {});
      }
      throw error;
    } finally {
      recorder.release();
      await setAudioModeAsync({allowsRecording: false}).catch(() => {});
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
  const file = cacheFile('read-aloud', 'wav');
  let player;
  let subscription;
  let released = false;
  const cleanup = () => {
    if (released) {
      return;
    }
    released = true;
    subscription?.remove();
    player?.release();
    removeFile(file).catch(() => {});
  };
  try {
    await setAudioModeAsync({playsInSilentMode: true});
    file.create();
    await file.write(base64, {encoding: 'base64'});
    player = createAudioPlayer(file.uri);
    subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish && !released) {
        cleanup();
        onFinish();
      }
    });
    player.play();
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}
