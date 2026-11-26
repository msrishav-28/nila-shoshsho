import {audioPart} from './audioPart';

test('does not label m4a recordings as wav', () => {
  expect(audioPart('file:///data/speech.m4a')).toEqual({
    name: 'speech.m4a',
    type: 'audio/m4a',
  });
  expect(audioPart('file:///data/speech.wav')).toEqual({
    name: 'speech.wav',
    type: 'audio/wav',
  });
});
