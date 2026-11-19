import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {adviceFetch} from '../utils/api';
import {getLocation} from './device';
import {MarketScreen} from './MarketScreens';

jest.mock('../utils/api', () => ({adviceFetch: jest.fn()}));
jest.mock('./device', () => ({getLocation: jest.fn()}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options = {}) =>
      (options.defaultValue || key).replace('{{state}}', options.state || ''),
    i18n: {language: 'en'},
  }),
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
      'Tabs',
      'Text',
    ].map(name => [name, name]),
  ),
);

const user = {
  _id: 'farmer-test',
  location: {city: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.85},
};
const farm = {name: 'East field', place: 'Pune', crop: 'Wheat'};
const ok = body => ({ok: true, json: async () => body});

let renderer;
async function render(props) {
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <MarketScreen
        screen="Market"
        user={user}
        farm={farm}
        go={jest.fn()}
        back={jest.fn()}
        {...props}
      />,
    );
  });
  return renderer.root;
}
async function press(root, type, key, label) {
  const node = root.findAllByType(type).find(item => item.props[key] === label);
  await act(async () => node.props.onPress());
}

beforeEach(() => jest.resetAllMocks());
afterEach(async () => {
  await act(async () => renderer?.unmount());
});

test('requests device location only on explicit action and never reuses coordinates from a different town', async () => {
  const root = await render({
    farm: {...farm, place: 'Nashik'},
    params: {tab: 'Stores'},
  });
  const field = root
    .findAllByType('Field')
    .find(item => item.props.label === 'Location');
  await act(async () => field.props.onChangeText('Nashik'));
  await press(root, 'Button', 'label', 'Find stores');
  expect(getLocation).not.toHaveBeenCalled();
  expect(adviceFetch).not.toHaveBeenCalled();

  getLocation.mockResolvedValue({latitude: 19.99, longitude: 73.78});
  adviceFetch.mockResolvedValue(
    ok({stores: [{id: '1', name: 'Farm supplies'}]}),
  );
  await press(root, 'Row', 'title', 'Use current location');
  expect(getLocation).toHaveBeenCalledTimes(1);
  expect(adviceFetch).toHaveBeenCalledWith(
    '/stores/nearby?lat=19.99&lon=73.78',
    expect.any(Object),
  );
  expect(JSON.stringify(renderer.toJSON())).toContain('Farm supplies');
});

test('keeps the outlook unavailable and labels returned rows as current state arrivals', async () => {
  adviceFetch.mockResolvedValue(
    ok({
      insight: 'State arrival commentary',
      records: [
        {
          market: 'Pune',
          modal_price: 2300,
          unit: 'Rs/quintal',
          arrival_date: '19/11/2026',
        },
      ],
    }),
  );
  const root = await render({params: {tab: 'Outlook'}});
  const field = root
    .findAllByType('Field')
    .find(item => item.props.label === 'Market');
  await act(async () => field.props.onChangeText('Pune'));
  await press(root, 'Button', 'label', 'View outlook');
  expect(adviceFetch).toHaveBeenCalledWith(
    '/market/insights',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({crop: 'Wheat', state: 'Maharashtra', lang: 'en'}),
    }),
  );
  const tree = JSON.stringify(renderer.toJSON());
  expect(tree).toContain('Not enough history yet');
  expect(tree).toContain('Current arrivals across Maharashtra');
  expect(tree).toContain('2300 Rs/quintal');
});
