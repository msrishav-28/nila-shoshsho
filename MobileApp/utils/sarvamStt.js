import {Audio} from 'expo-av';
import {adviceFetch} from './api';
import {audioPart} from './audioPart';
import {adviceLang} from './lang';

let activeRecording = null;

export function isSarvamRecording() {
  return Boolean(activeRecording);
}

export async function startSarvamRecording() {
  if (activeRecording) {
    return;
  }
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    const err = new Error('Microphone is not available');
    err.code = 'mic-denied';
    throw err;
  }
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  activeRecording = recording;
}

export async function stopSarvamTranscription(lang) {
  const recording = activeRecording;
  activeRecording = null;
  if (!recording) {
    return '';
  }
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  if (!uri) {
    const err = new Error('Could not hear speech');
    err.code = 'empty';
    throw err;
  }
  const form = new FormData();
  const part = audioPart(uri);
  form.append('audio', {uri, name: part.name, type: part.type});
  form.append('lang', adviceLang(lang));
  const res = await adviceFetch('/voice/stt', {method: 'POST', body: form});
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Voice listen is unavailable');
    err.code = String(res.status);
    throw err;
  }
  const transcript = (data.transcript || '').trim();
  if (!transcript) {
    const err = new Error('Could not hear speech');
    err.code = 'empty';
    throw err;
  }
  return transcript;
}

export async function cancelSarvamRecording() {
  const recording = activeRecording;
  activeRecording = null;
  if (recording) {
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      // Recording may already be stopped.
    }
  }
}
