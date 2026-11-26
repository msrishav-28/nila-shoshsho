import React from 'react';
import {act, create} from 'react-test-renderer';
import {FarmScreen} from './FarmScreens';
import {request} from './data';
import {usePlots} from './plots';

jest.mock('../utils/api', () => ({getAccessToken: () => 'fixture'}));
jest.mock('./data', () => ({
  ...jest.requireActual('./data'),
  request: jest.fn(),
}));
jest.mock('./device', () => ({getLocation: jest.fn()}));
jest.mock('./ui', () =>
  Object.fromEntries(
    [
      'Button',
      'Card',
      'Field',
      'Notice',
      'Result',
      'Row',
      'Screen',
      'Stack',
      'Text',
    ].map(name => [name, name]),
  ),
);

const user = {_id: 'farmer-1', role: 'Farmer'};
const plot = {
  plotId: '00000000-0000-4000-8000-000000000123',
  crop: 'Wheat',
  lat: 21.5,
  lon: 73.5,
  areaAcres: 4,
  sowingDate: '2026-11-01',
};
const go = jest.fn();
const back = jest.fn();
let app;

function Harness(props) {
  const plotState = usePlots(user._id, false);
  return (
    <FarmScreen
      user={user}
      plotState={plotState}
      go={go}
      back={back}
      {...props}
    />
  );
}

async function render(props) {
  await act(async () => {
    app = create(<Harness {...props} />);
  });
}

function field(type, label) {
  return app.root.findAllByType(type).find(node => node.props.label === label);
}

const tap = label => act(async () => field('Button', label).props.onPress());
const change = (label, value) =>
  act(async () => field('Field', label).props.onChangeText(value));

afterEach(async () => {
  await act(async () => app?.unmount());
  jest.resetAllMocks();
});

test('requires explicit save and reuses the creation key when the response was lost', async () => {
  request
    .mockResolvedValueOnce({plots: []})
    .mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValueOnce({success: true, plot});
  await render({
    screen: 'FarmSetup',
    legacyFarm: {crop: 'Wheat', acres: 4},
    params: {useLegacy: true},
  });
  expect(request).toHaveBeenCalledTimes(1);
  await change('Sowing date', plot.sowingDate);
  await change('Latitude', String(plot.lat));
  await change('Longitude', String(plot.lon));
  await tap('Save plot to account');
  await tap('Save plot to account');
  const [, first, retry] = request.mock.calls;
  expect(first).toEqual([
    'account',
    '/plots',
    {
      method: 'POST',
      headers: {
        'Idempotency-Key': expect.stringMatching(/^[A-Za-z0-9_-]{8,100}$/),
      },
      body: {
        crop: plot.crop,
        lat: plot.lat,
        lon: plot.lon,
        areaAcres: plot.areaAcres,
        sowingDate: plot.sowingDate,
      },
    },
  ]);
  expect(retry).toEqual(first);
  expect(back).toHaveBeenCalledTimes(1);
});

test('patches an existing plot and requires a second action before deleting it', async () => {
  request
    .mockResolvedValueOnce({plots: [plot]})
    .mockResolvedValueOnce({success: true, plot: {...plot, areaAcres: 5}})
    .mockResolvedValueOnce({success: true});
  await render({screen: 'FarmSetup', params: {plotId: plot.plotId}});
  await change('Area in acres', '5');
  await tap('Save plot to account');
  expect(request).toHaveBeenLastCalledWith(
    'account',
    `/plots/${plot.plotId}`,
    expect.objectContaining({
      method: 'PATCH',
      body: expect.objectContaining({areaAcres: 5}),
    }),
  );
  await tap('Delete plot');
  expect(request).toHaveBeenCalledTimes(2);
  await tap('Confirm deletion');
  expect(request).toHaveBeenLastCalledWith('account', `/plots/${plot.plotId}`, {
    method: 'DELETE',
  });
});
