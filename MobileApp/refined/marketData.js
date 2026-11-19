export const INDIA_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const MARKET_COMMODITIES = [
  'Banana',
  'Cluster Beans',
  'Dry Chillies',
  'Green Peas',
  'Groundnut',
  'Maize',
  'Mango',
  'Onion',
  {label: 'Paddy', value: 'Paddy(Dhan)(Common)'},
  'Potato',
  'Rice',
  'Tomato',
  'Wheat',
];

export const MARKET_DISTRICTS = {
  'Andhra Pradesh': [
    'Anantapur',
    'Chittoor',
    'East Godavari',
    'Kadapa',
    'Krishna',
    'Kurnool',
    'Visakhapatnam',
  ],
  Gujarat: ['Ahmedabad', 'Gandhinagar', 'Rajkot', 'Surat', 'Vadodara'],
  Karnataka: ['Belagavi', 'Bengaluru', 'Dharwad', 'Hubli', 'Mysuru', 'Tumkur'],
  Maharashtra: ['Aurangabad', 'Kolhapur', 'Mumbai', 'Nagpur', 'Nashik', 'Pune'],
  Rajasthan: ['Ajmer', 'Bikaner', 'Jaipur', 'Jodhpur', 'Kota', 'Udaipur'],
  'Tamil Nadu': [
    'Chennai',
    'Coimbatore',
    'Erode',
    'Madurai',
    'Salem',
    'Tiruchirappalli',
  ],
  'Uttar Pradesh': ['Agra', 'Kanpur', 'Lucknow', 'Meerut', 'Varanasi'],
  'West Bengal': ['Asansol', 'Durgapur', 'Howrah', 'Kolkata', 'Siliguri'],
};

export const MYSCHEME_HOME = 'https://www.myscheme.gov.in';

export function httpUrl(value) {
  return typeof value === 'string' &&
    /^https?:\/\/[^/?#\\]/i.test(value) &&
    !/\s/.test(value)
    ? value
    : '';
}

export function firstText(...values) {
  return (
    values.find(value => typeof value === 'string' && value.trim())?.trim() ||
    ''
  );
}

export function dataRows(value) {
  return Array.isArray(value)
    ? value.filter(
        item => item && typeof item === 'object' && !Array.isArray(item),
      )
    : [];
}

export function normalized(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function commodityValue(value) {
  const match = MARKET_COMMODITIES.find(item =>
    typeof item === 'string'
      ? normalized(item) === normalized(value)
      : [item.label, item.value].some(
          candidate => normalized(candidate) === normalized(value),
        ),
  );
  return typeof match === 'object' ? match.value : match || value || '';
}

export function farmLocation(farm, user) {
  const profileLocation = user?.location || {};
  const savedPlace = farm?.place || '';
  // A separately typed farm name is not evidence that its coordinates match the profile.
  return !savedPlace ||
    [profileLocation.city, profileLocation.village].some(
      name => normalized(name) === normalized(savedPlace),
    )
    ? profileLocation
    : {};
}

function schemeItems(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return [value?.items, value?.item, value?.hits].find(Array.isArray) || [];
}

export function extractSchemeCards(payload) {
  const root = payload?.schemes ?? payload;
  const records = [
    root,
    root?.data,
    root?.hits,
    root?.data?.hits,
    root?.data?.hits?.hits,
  ];
  const cards = new Map();
  for (const list of records) {
    for (const item of dataRows(schemeItems(list))) {
      const fields = item.fields || item;
      const english = fields.en || {};
      const title = [
        fields.schemeName,
        fields.schemeShortTitle,
        fields.name,
        fields.title,
        english.schemeName,
        english.name,
        english.title,
        item.schemeName,
        item.title,
      ]
        .find(value => typeof value === 'string' && value.trim())
        ?.trim();
      if (!title) {
        continue;
      }
      const slug = [fields.slug, item.slug].find(
        value => typeof value === 'string' && value.trim(),
      );
      const link =
        [fields.url, fields.link, item.url, item.link]
          .map(httpUrl)
          .find(Boolean) ||
        (slug
          ? `${MYSCHEME_HOME}/schemes/${encodeURIComponent(slug.trim())}`
          : MYSCHEME_HOME);
      cards.set(`${title}|${link}`, {title, link});
    }
  }
  return [...cards.values()];
}

export function asQuery(fields) {
  return new URLSearchParams(
    Object.entries(fields).filter(([, value]) => value !== '' && value != null),
  ).toString();
}
