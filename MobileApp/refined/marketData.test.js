import {
  asQuery,
  commodityValue,
  extractSchemeCards,
  farmLocation,
} from './marketData';

test('never attaches account coordinates to a separately named farm', () => {
  const user = {
    location: {city: 'Pune', state: 'Maharashtra', lat: 18.52, lon: 73.85},
  };
  expect(farmLocation({place: 'Nashik'}, user)).toEqual({});
  expect(farmLocation({place: ' pune '}, user)).toEqual(user.location);
  expect(farmLocation(null, user)).toEqual(user.location);
});

test('retains the backend commodity spelling and the first market page offset', () => {
  const query = new URLSearchParams(
    asQuery({commodity: commodityValue('paddy'), state: '', offset: 0}),
  );
  expect(query.get('commodity')).toBe('Paddy(Dhan)(Common)');
  expect(query.has('state')).toBe(false);
  expect(query.get('offset')).toBe('0');
});

test('deduplicates scheme records and rejects non-HTTP link schemes', () => {
  const scheme = {
    fields: {
      schemeName: 'Farm support',
      slug: 'farm support',
      url: 'intent://farm-support',
    },
  };
  const payload = {schemes: {data: {hits: {hits: [scheme, scheme]}}}};
  expect(extractSchemeCards(payload)).toEqual([
    {
      title: 'Farm support',
      link: 'https://www.myscheme.gov.in/schemes/farm%20support',
    },
  ]);
});
