import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';
import {HomeScreen} from './HomeScreen';
import {request} from './data';
import {openLink} from './marketUi';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({t: (_key, {defaultValue}) => defaultValue}),
}));
jest.mock('./data', () => ({request: jest.fn()}));
jest.mock('./marketUi', () => ({openLink: jest.fn()}));
jest.mock('./ui', () =>
  Object.fromEntries(
    [
      'Button',
      'Card',
      'Columns',
      'Field',
      'IconButton',
      'Illustration',
      'Notice',
      'Row',
      'Screen',
      'Stack',
      'Text',
    ].map(name => [name, name]),
  ),
);

const user = {
  _id: 'synthetic-farmer',
  location: {lat: 18.52, lon: 73.85, state: 'Maharashtra'},
};
let app;

async function render() {
  await act(async () => {
    app = ReactTestRenderer.create(<HomeScreen user={user} go={jest.fn()} />);
  });
}

function textValues() {
  return app.root.findAllByType('Text').map(node => node.props.children);
}

afterEach(async () => {
  await act(async () => app?.unmount());
  jest.clearAllMocks();
});

test('shows the forecast valid time, provider and license when daily weather is unavailable', async () => {
  const forecast = {
    kind: 'forecast',
    temperature: 21.5,
    asOf: '2026-11-20T04:00:00+00:00',
    source: 'MET Norway forecast',
    sourceUrl: 'https://www.met.no/',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  };
  request.mockImplementation(async (_client, path) =>
    path.startsWith('/weather')
      ? {
          open_meteo: {current: forecast, daily: null},
          imd: null,
          warnings: null,
        }
      : {records: []},
  );
  await render();
  const weather = app.root
    .findAllByType('Row')
    .find(row => row.props.title === 'Near-term forecast · 22°C');
  expect(weather.props.description).toBe(
    `${forecast.source} · Valid ${forecast.asOf}`,
  );
  weather.props.onPress();
  app.root
    .findAllByType('Button')
    .find(button => button.props.label === 'Weather data license')
    .props.onPress();
  expect(openLink.mock.calls).toEqual([
    [forecast.sourceUrl],
    [forecast.licenseUrl],
  ]);
  expect(textValues()).toEqual(
    expect.arrayContaining([
      'Daily weather outlook is unavailable right now.',
      'No mandi records were returned for this search.',
    ]),
  );
});

test('shows daily data independently when current conditions and the mandi feed are unavailable', async () => {
  request.mockImplementation(async (_client, path) => {
    if (!path.startsWith('/weather')) {
      throw new Error('Mandi feed unavailable');
    }
    return {
      open_meteo: {
        current: null,
        daily: {
          dates: ['2026-11-20'],
          temp_min: [12],
          temp_max: [24],
          source: 'Open-Meteo',
        },
      },
    };
  });
  await render();
  const daily = app.root
    .findAllByType('Row')
    .find(row => row.props.title === 'Daily weather outlook');
  expect(daily.props.description).toBe('Open-Meteo · 2026-11-20 · 12–24 °C');
  expect(textValues()).toContain('Current weather is unavailable right now.');
  expect(textValues()).toContain('Mandi price data is unavailable right now.');
  expect(textValues()).not.toContain(
    'No mandi records were returned for this search.',
  );
});

test('maps catalog IDs to Refined 2 destinations and ignores unknown IDs', async () => {
  jest.useFakeTimers();
  const go = jest.fn();
  try {
    request.mockImplementation(async (_client, path) =>
      path.startsWith('/search')
        ? {
            results: [
              {id: 'compare', title: 'Price compare', route: 'Compare'},
              {id: 'unrecognized', title: 'Unknown tool', route: 'Unknown'},
            ],
          }
        : {records: []},
    );
    await act(async () => {
      app = ReactTestRenderer.create(<HomeScreen user={user} go={go} />);
    });
    const search = app.root
      .findAllByType('Field')
      .find(node => node.props.placeholder === 'Find a farm tool');
    await act(async () => search.props.onChangeText('compare'));
    await act(async () => jest.advanceTimersByTime(300));
    expect(request).toHaveBeenCalledWith(
      'advice',
      '/search?q=compare',
      expect.any(Object),
    );
    const rows = app.root.findAllByType('Row');
    expect(rows.some(row => row.props.title === 'Unknown tool')).toBe(false);
    await act(async () =>
      rows.find(row => row.props.title === 'Price compare').props.onPress(),
    );
    expect(go).toHaveBeenCalledWith('Market', {tab: 'Compare'});
  } finally {
    jest.useRealTimers();
  }
});
