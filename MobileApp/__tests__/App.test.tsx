import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import App from '../App';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: () => () => {},
}));
jest.mock('react-native-localize', () => ({
  getLocales: () => [{languageCode: 'en'}],
}));
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
jest.mock('../refined/device', () => ({}));

it('boots into the Refined 2 welcome screen for a new session', async () => {
  await AsyncStorage.clear();
  let app: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    app = ReactTestRenderer.create(<App />);
  });
  expect(JSON.stringify(app!.toJSON())).toContain(
    'A little guidance. A better farming day.',
  );
  await ReactTestRenderer.act(async () => app!.unmount());
});
