import React, {useState} from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {AskNilaScreen} from './AskNilaScreen';
import {recordVoice} from './device';
import {request} from './data';

jest.mock('./device', () => ({appendFile: jest.fn(), recordVoice: jest.fn()}));
jest.mock('./data', () => ({
  message: error => error.message,
  request: jest.fn(),
}));
jest.mock('./accountPreferences', () => ({
  readVoicePreference: async () => '',
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({i18n: {language: 'en'}}),
}));
jest.mock('./ui', () =>
  Object.fromEntries(
    [
      'Button',
      'Card',
      'Columns',
      'Field',
      'Icon',
      'Notice',
      'Row',
      'Screen',
      'Select',
      'Stack',
      'Text',
    ].map(name => [name, name]),
  ),
);

function Draft({offline = false}) {
  const [voiceDraft, setVoiceDraft] = useState('');
  return (
    <AskNilaScreen
      voiceDraft={voiceDraft}
      setVoiceDraft={setVoiceDraft}
      offline={offline}
    />
  );
}

function button(app, label) {
  return app.root
    .findAllByType('Button')
    .find(node => node.props.label === label);
}

async function press(app, label) {
  await act(async () => button(app, label).props.onPress());
}

test('transcribes into an editable review and sends only on the explicit action', async () => {
  const cleanup = jest.fn();
  recordVoice.mockResolvedValue({
    stop: async () => ({cleanup}),
    cancel: jest.fn().mockResolvedValue(null),
  });
  request.mockImplementation(async (_client, path) =>
    path === '/voice/stt'
      ? {transcript: 'What is the mandi price?'}
      : {answer: 'Choose a crop and market.'},
  );
  let app;
  await act(async () => {
    app = ReactTestRenderer.create(<Draft />);
  });
  try {
    await press(app, 'Speak');
    await press(app, 'Stop recording');
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(request.mock.calls.map(([, path]) => path)).toEqual(['/voice/stt']);
    expect(button(app, 'Send question')).toBeDefined();
    await press(app, 'Edit words');
    const field = app.root.findByType('Field');
    expect(field.props.value).toBe('What is the mandi price?');
    await act(async () =>
      field.props.onChangeText('What is the price of wheat?'),
    );
    await press(app, 'Send question');
    expect(request).toHaveBeenLastCalledWith(
      'advice',
      '/chatbot/ask',
      expect.objectContaining({
        body: {
          question: 'What is the price of wheat?',
          lang: 'en',
          has_image: false,
        },
      }),
    );
    expect(JSON.stringify(app.toJSON())).toContain('Choose a crop and market.');
  } finally {
    await act(async () => app?.unmount());
  }
});

test('retains the typed draft when Send is pressed offline', async () => {
  request.mockClear();
  let app;
  await act(async () => {
    app = ReactTestRenderer.create(<Draft offline />);
  });
  try {
    await press(app, 'Type');
    await act(async () =>
      app.root
        .findByType('Field')
        .props.onChangeText('How should I store rice?'),
    );
    await press(app, 'Send question');
    expect(request).not.toHaveBeenCalled();
    expect(JSON.stringify(app.toJSON())).toContain('How should I store rice?');
    await press(app, 'Edit question');
    expect(app.root.findByType('Field').props.value).toBe(
      'How should I store rice?',
    );
  } finally {
    await act(async () => app?.unmount());
  }
});
