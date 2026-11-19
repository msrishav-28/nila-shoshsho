import {
  AudioModule,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import {File} from 'expo-file-system';
import {playVoice, recordVoice} from './device';

jest.mock('expo-audio', () => ({
  AudioModule: {AudioRecorder: jest.fn()},
  RecordingPresets: {HIGH_QUALITY: {extension: '.m4a', android: {}, ios: {}}},
  createAudioPlayer: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Paths: {cache: 'cache'},
}));
jest.mock('expo-location', () => ({}));
jest.mock('@react-native-documents/picker', () => ({}));
jest.mock('react-native-image-picker', () => ({}));

beforeEach(() => {
  jest.clearAllMocks();
  setAudioModeAsync.mockResolvedValue(undefined);
});

test('keeps the native speech upload format and releases the recorder once', async () => {
  const cache = {exists: true, delete: jest.fn()};
  const recorder = {
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    record: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
    release: jest.fn(),
    uri: 'file:///voice.m4a',
  };
  File.mockImplementation(() => cache);
  requestRecordingPermissionsAsync.mockResolvedValue({granted: true});
  AudioModule.AudioRecorder.mockImplementation(() => recorder);

  const recording = await recordVoice();
  const file = await recording.stop();
  expect(file).toMatchObject({name: 'speech.m4a', type: 'audio/m4a'});
  expect(AudioModule.AudioRecorder).toHaveBeenCalledWith(
    expect.objectContaining({extension: '.m4a'}),
  );
  expect(recorder.record).toHaveBeenCalledTimes(1);
  expect(recorder.release).toHaveBeenCalledTimes(1);
  expect(setAudioModeAsync).toHaveBeenLastCalledWith({allowsRecording: false});
  expect(await recording.stop()).toBeNull();
  await file.cleanup();
  expect(cache.delete).toHaveBeenCalledTimes(1);
});

test('cleans up the read-aloud player and local WAV when playback ends', async () => {
  const file = {
    uri: 'file:///answer.wav',
    exists: true,
    create: jest.fn(),
    write: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn(),
  };
  const subscription = {remove: jest.fn()};
  const player = {
    play: jest.fn(),
    release: jest.fn(),
    addListener: jest.fn(() => subscription),
  };
  const onFinish = jest.fn();
  File.mockImplementation(() => file);
  createAudioPlayer.mockReturnValue(player);

  const cancel = await playVoice('encoded-audio', onFinish);
  expect(file.write).toHaveBeenCalledWith('encoded-audio', {
    encoding: 'base64',
  });
  const [event, statusChanged] = player.addListener.mock.calls[0];
  expect(event).toBe('playbackStatusUpdate');
  statusChanged({didJustFinish: true});
  cancel();
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(subscription.remove).toHaveBeenCalledTimes(1);
  expect(player.release).toHaveBeenCalledTimes(1);
  expect(file.delete).toHaveBeenCalledTimes(1);
});
