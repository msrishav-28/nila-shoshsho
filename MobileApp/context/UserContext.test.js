import React, {useContext} from 'react';
import {act, create} from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {readSessionToken, writeSessionToken} from '../utils/sessionToken';
import {adviceFetch, getAccessToken, setAccessToken} from '../utils/api';
import {UserContext, UserProvider} from './UserContext';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('../utils/sessionToken', () => ({
  readSessionToken: jest.fn(),
  writeSessionToken: jest.fn(),
}));

const profile = {
  _id: 'synthetic-farmer',
  profileVersion: 3,
  profilePic: 'https://example.test/signed-photo',
};
const token = 'synthetic-token';
const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});
let app;
let session;
let fetchMock;

function Probe() {
  session = useContext(UserContext);
  return null;
}

async function render() {
  await act(async () => {
    app = create(
      <UserProvider>
        <Probe />
      </UserProvider>,
    );
  });
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await setAccessToken(null);
  jest.clearAllMocks();
  readSessionToken.mockResolvedValue(null);
  fetchMock = jest.spyOn(global, 'fetch');
});

afterEach(async () => {
  await act(async () => app?.unmount());
  fetchMock.mockRestore();
});

test('migrates the legacy token, validates it and removes the stored profile and signed links', async () => {
  await AsyncStorage.setItem(
    'user',
    JSON.stringify({...profile, accessToken: token}),
  );
  fetchMock.mockResolvedValueOnce(
    response(200, {success: true, user: {...profile, accessToken: token}}),
  );
  await render();
  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/auth\/me$/),
    expect.objectContaining({
      headers: {Authorization: `Bearer ${token}`},
    }),
  );
  expect(writeSessionToken).toHaveBeenCalledWith(token);
  expect(await AsyncStorage.getItem('user')).toBeNull();
  expect(session.user).toEqual(profile);
  expect(session.user.accessToken).toBeUndefined();
});

test('keeps the session after incomplete logout and clears it on authenticated advice 401', async () => {
  readSessionToken.mockResolvedValue(token);
  fetchMock
    .mockResolvedValueOnce(response(200, {success: true, user: profile}))
    .mockResolvedValueOnce(
      response(502, {success: false, message: 'Session could not be ended'}),
    )
    .mockResolvedValueOnce(response(401, {code: 'unauthorized'}));
  await render();
  await act(async () => {
    await expect(session.logout()).rejects.toMatchObject({status: 502});
  });
  expect(session.user).toEqual(profile);
  expect(getAccessToken()).toBe(token);
  await act(async () => {
    await adviceFetch('/weather');
  });
  expect(session.user).toBeNull();
  expect(getAccessToken()).toBeNull();
  expect(writeSessionToken).toHaveBeenLastCalledWith(null);
});

test('uses public login and preserves the server conflict on a profile update', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response(200, {success: true, user: {...profile, accessToken: token}}),
    )
    .mockResolvedValueOnce(
      response(409, {
        success: false,
        message: 'Profile changed. Reload it and retry.',
      }),
    );
  await render();
  await act(async () => {
    await session.loginWithEmailPassword({
      email: 'farmer@example.test',
      password: 'fixture',
    });
    await expect(
      session.updateUser({profileVersion: 3, bio: 'Synthetic'}),
    ).rejects.toMatchObject({status: 409});
  });
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    profileVersion: 3,
    bio: 'Synthetic',
  });
  expect(session.user.profileVersion).toBe(3);
});
