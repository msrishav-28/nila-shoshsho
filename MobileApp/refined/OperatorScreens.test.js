import React from 'react';
import {act, create} from 'react-test-renderer';
import {request} from './data';
import {
  readAccountPreference,
  writeAccountPreference,
} from './accountPreferences';

jest.mock('./data', () => ({
  ...jest.requireActual('./data'),
  request: jest.fn(),
}));
jest.mock('./accountPreferences', () => ({
  readAccountPreference: jest.fn(),
  writeAccountPreference: jest.fn(),
}));
jest.mock('./ui', () =>
  Object.fromEntries(
    [
      'Button',
      'Field',
      'Notice',
      'Result',
      'Screen',
      'Select',
      'Stack',
      'Text',
    ].map(name => [name, name]),
  ),
);

process.env.EXPO_PUBLIC_VOICE_CALLBACK_PILOT = 'true';
const {StaffReviewScreen, VoiceCallbackScreen} = require('./OperatorScreens');
const user = {_id: '00000000-0000-4000-8000-000000000001'};
const target = '00000000-0000-4000-8000-000000000002';
let app;

async function render(Screen) {
  await act(async () => {
    app = create(<Screen user={user} />);
  });
}

function named(type, label) {
  return app.root.findAllByType(type).find(node => node.props.label === label);
}

const tap = label => act(async () => named('Button', label).props.onPress());

afterEach(async () => {
  await act(async () => app?.unmount());
  jest.resetAllMocks();
});

test('submits a staff decision only after confirmation and displays server access denial', async () => {
  request.mockRejectedValueOnce(
    Object.assign(new Error('Staff access required'), {status: 403}),
  );
  await render(StaffReviewScreen);
  await act(async () => {
    named('Field', 'Account UUID').props.onChangeText(target);
    named('Select', 'Decision').props.onChange('approve');
    named('Field', 'Reason').props.onChangeText('Synthetic review');
  });
  await tap('Review decision');
  expect(request).not.toHaveBeenCalled();
  await tap('Record decision');
  expect(request).toHaveBeenCalledWith(
    'account',
    `/reviews/${target}/carrier`,
    {
      method: 'PUT',
      body: {approved: true, reason: 'Synthetic review'},
    },
  );
  expect(app.root.findByType('Result').props.error.status).toBe(403);
});

test('requires consent, persists the retry key and blocks replacement after an unknown result', async () => {
  readAccountPreference.mockResolvedValue(null);
  writeAccountPreference.mockResolvedValue(undefined);
  request
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValueOnce({callbackId: target, status: 'unknown'});
  await render(VoiceCallbackScreen);
  expect(named('Button', 'Request one call').props.disabled).toBe(true);
  await tap('I agree to receive one call');
  await tap('Request one call');
  const saved = JSON.parse(writeAccountPreference.mock.calls[0][2]);
  expect(request).toHaveBeenCalledWith('account', '/voice-callbacks', {
    method: 'POST',
    headers: {'Idempotency-Key': saved.key},
    body: {consent: true},
  });
  await tap('Retry same callback request');
  expect(request.mock.calls[1]).toEqual(request.mock.calls[0]);
  expect(named('Button', 'Start a new request')).toBeUndefined();
  expect(
    app.root.findAllByType('Text').map(node => node.props.children),
  ).toContain('Check with your pilot operator before requesting another call.');
});

test('resumes a queued callback, polls after ten seconds and stops at completion', async () => {
  jest.useFakeTimers();
  try {
    readAccountPreference.mockResolvedValue(
      JSON.stringify({
        key: 'fixture-key',
        callbackId: target,
        status: 'queued',
      }),
    );
    writeAccountPreference.mockResolvedValue(undefined);
    request.mockResolvedValue({callbackId: target, status: 'completed'});
    await render(VoiceCallbackScreen);
    await act(async () => jest.advanceTimersByTime(9999));
    expect(request).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));
    expect(request).toHaveBeenCalledWith(
      'account',
      `/voice-callbacks/${target}`,
      expect.objectContaining({signal: expect.any(Object)}),
    );
    await act(async () => jest.advanceTimersByTime(30000));
    expect(request).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});
