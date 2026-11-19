import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {UserContext} from '../context/UserContext';
import {accountFetch, adviceFetch} from '../utils/api';
import {TaskScreen} from './TaskScreens';

jest.mock('../utils/api', () => ({
  accountFetch: jest.fn(),
  adviceFetch: jest.fn(),
}));
jest.mock('./device', () => ({
  chooseDocument: jest.fn(),
  readRemoteDocument: jest.fn(),
  appendFile: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
}));
jest.mock('react-native-markdown-display', () => 'Markdown');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key, {defaultValue}) => defaultValue,
    i18n: {resolvedLanguage: 'en'},
  }),
}));
jest.mock('./ui', () =>
  Object.fromEntries(
    [
      'Button',
      'Card',
      'Field',
      'Icon',
      'Notice',
      'Result',
      'Row',
      'Screen',
      'Select',
      'Stack',
      'Tabs',
      'Text',
    ].map(name => [name, name]),
  ),
);

const user = {
  _id: 'test',
  location: {city: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.85},
};
const farm = {name: 'East field', place: 'Pune', crop: 'Wheat', acres: 4};
const apiResponse = data =>
  Promise.resolve({ok: true, json: () => Promise.resolve(data)});
let renderer;

async function render(screen, props = {}) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <UserContext.Provider value={{setUser: jest.fn()}}>
        <TaskScreen
          screen={screen}
          user={user}
          go={jest.fn()}
          back={jest.fn()}
          {...props}
        />
      </UserContext.Provider>,
    );
  });
  return renderer.root;
}

function named(root, type, label) {
  return root.findAllByType(type).find(node => node.props.label === label);
}

async function change(root, field, label, value) {
  await act(async () => named(root, field, label).props.onChangeText(value));
}

async function tap(root, label) {
  await act(async () => named(root, 'Button', label).props.onPress());
}

beforeEach(() => jest.clearAllMocks());
afterEach(async () => {
  await act(async () => renderer?.unmount());
});

test('uses a national calendar without weather coordinates for a different farm location', async () => {
  adviceFetch.mockImplementation(() =>
    apiResponse({
      window: {crop: 'Wheat', sow_months: ['November', 'December']},
    }),
  );
  const root = await render('CropPlanning', {
    farm: {...farm, place: 'Nashik'},
    params: {tab: 'Calendar'},
  });
  await tap(root, 'View calendar');
  expect(adviceFetch).toHaveBeenCalledWith(
    '/crop_calendar',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        crop: 'Wheat',
        region: 'Nashik',
        latitude: 0,
        longitude: 0,
      }),
    }),
  );
});

test('rejects an impossible harvest date and sends the corrected date without timezone shifts', async () => {
  adviceFetch.mockImplementation(() =>
    apiResponse({advice: 'Keep harvested grain dry.'}),
  );
  const root = await render('AfterHarvest', {farm});
  await change(root, 'Field', 'Harvest date', '31 / 02 / 2026');
  await tap(root, 'Get storage guidance');
  expect(adviceFetch).not.toHaveBeenCalled();
  await change(root, 'Field', 'Harvest date', '28 / 02 / 2026');
  await tap(root, 'Get storage guidance');
  const [path, options] = adviceFetch.mock.calls[0];
  expect(path).toBe('/postharvest');
  expect(JSON.parse(options.body)).toMatchObject({
    harvest_date: '2026-02-28',
    latitude: 18.52,
    longitude: 73.85,
  });
});

test('shows the posted pickup returned by the account service', async () => {
  const pickup = {
    id: 42,
    crop: 'Wheat',
    quantityKg: 80,
    pickupCity: 'Pune',
    pickupState: 'Maharashtra',
    status: 'OPEN',
  };
  accountFetch.mockImplementation((_path, {method}) =>
    apiResponse(method === 'POST' ? {job: pickup} : {jobs: []}),
  );
  const root = await render('AfterHarvest', {farm, params: {tab: 'Transport'}});
  await change(root, 'Field', 'Quantity', '80');
  await tap(root, 'Post pickup');
  expect(accountFetch).toHaveBeenLastCalledWith(
    '/logistics/jobs',
    expect.objectContaining({method: 'POST'}),
  );
  expect(named(root, 'Button', 'Cancel pickup')).toBeDefined();
});
