import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Markdown from 'react-native-markdown-display';
import {UserContext} from '../context/UserContext';
import {theme} from '../theme.config';
import {adviceLang, adviceLangName} from '../utils/lang';
import {hasMapPoint} from '../utils/place';
import {
  appendFile,
  chooseDocument,
  openRemoteDocument,
  readRemoteDocument,
} from './device';
import {
  documentName,
  freshDocumentUrl,
  isHttpsDocument,
  savedDocuments,
} from './documents';
import {submissionKey} from './plots';
import {request, useAction} from './data';
import {dataRows, INDIA_STATES, normalized} from './marketData';
import {
  Button,
  Card,
  Field,
  Icon,
  Notice,
  Result,
  Row,
  Screen,
  Select,
  Stack,
  Tabs,
  Text,
} from './ui';

const languages = [
  {label: 'English', value: 'English'},
  {label: 'हिन्दी', value: 'Hindi'},
  {label: 'বাংলা', value: 'Bengali'},
  {label: 'ಕನ್ನಡ', value: 'Kannada'},
  {label: 'മലയാളം', value: 'Malayalam'},
  {label: 'मराठी', value: 'Marathi'},
  {label: 'தமிழ்', value: 'Tamil'},
  {label: 'తెలుగు', value: 'Telugu'},
];
const statuses = {
  OPEN: 'Open',
  ACCEPTED: 'Accepted',
  DONE: 'Completed',
  CANCELED: 'Canceled',
};
const pdfType = 'application/pdf';

const placeName = user => user?.location?.village || user?.location?.city || '';
const samePlace = (user, place) =>
  [user?.location?.village, user?.location?.city].some(
    name => normalized(name) && normalized(name) === normalized(place),
  );

function requireValue(value, label) {
  const formatted = value.trim();
  if (!formatted) {
    throw new Error(`Enter ${label}.`);
  }
  return formatted;
}

function requirePositive(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }
  return number;
}

function getPoint(user, go, place, region, farm) {
  if (farm?.plotId && hasMapPoint(farm)) {
    return {
      latitude: Number(farm.location.lat),
      longitude: Number(farm.location.lon),
    };
  }
  const matchesRegion =
    !region ||
    !user?.location?.state ||
    normalized(region) === normalized(user.location.state);
  if (
    !hasMapPoint(user) ||
    (place && !samePlace(user, place)) ||
    !matchesRegion
  ) {
    const error = new Error(
      'Weather-based guidance needs a matching saved map location. Add the location in your profile.',
    );
    error.openProfile = () => go('UpdateProfile', {section: 'address'});
    throw error;
  }
  return {
    latitude: Number(user.location.lat),
    longitude: Number(user.location.lon),
  };
}

function dateValue(value) {
  const match = value.trim().match(/^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/);
  if (!match) {
    throw new Error('Enter a date as DD / MM / YYYY.');
  }
  const [, day, month, year] = match;
  const result = `${year}-${month}-${day}`;
  const parsed = new Date(`${result}T00:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== result
  ) {
    throw new Error('Enter a valid calendar date.');
  }
  return result;
}

function useAdviceLocale() {
  const {i18n} = useTranslation();
  return adviceLang(i18n.resolvedLanguage, i18n.language);
}

function useTaskText(namespace) {
  const {t, i18n} = useTranslation();
  const english = adviceLang(i18n.resolvedLanguage, i18n.language) === 'en';
  return (key, copy, legacy) =>
    t(`refined.tasks.${namespace}.${key}`, {
      defaultValue: !english && legacy ? t(legacy, {defaultValue: copy}) : copy,
    });
}

function Pair({children}) {
  const {width, fontScale} = useWindowDimensions();
  return width < 350 || fontScale > 1.3 ? (
    <Stack gap={12}>{children}</Stack>
  ) : (
    <View style={styles.pair}>
      {React.Children.map(children, child => (
        <View style={styles.pairItem}>{child}</View>
      ))}
    </View>
  );
}

function FarmContext({farm, go}) {
  return (
    <Card tone="muted" style={styles.compactCard}>
      <Row
        title={farm?.name || 'Add your farm'}
        description={
          farm
            ? [farm.crop, farm.place].filter(Boolean).join(' · ')
            : 'Reuse crop and location in every task'
        }
        icon="map-pin"
        onPress={() => go(farm ? 'FarmMonitoring' : 'FarmSetup')}
      />
    </Card>
  );
}

function ControlDate({label, value, onChangeText}) {
  return (
    <Field
      label={label}
      placeholder="DD / MM / YYYY"
      value={value}
      onChangeText={onChangeText}
      autoCorrect={false}
      maxLength={14}
    />
  );
}

function AdviceResult({action, title}) {
  const {data, error, pending} = action;
  if (pending || error) {
    return (
      <Stack gap={8}>
        <Result error={error} pending={pending} />
        {error?.openProfile ? (
          <Button
            label="Edit profile location"
            variant="secondary"
            onPress={error.openProfile}
          />
        ) : null}
      </Stack>
    );
  }
  const content =
    data?.advice || data?.recommendation || data?.translated_document;
  if (!content) {
    return null;
  }
  return (
    <Stack>
      <Card>
        <Stack gap={8}>
          <Text variant="heading">{title}</Text>
          <Markdown style={markdownStyles} onLinkPress={isHttpsDocument}>
            {content}
          </Markdown>
          {data.rate_available === false ? (
            <Text variant="caption" tone="muted">
              Field-specific application rates are unavailable.
            </Text>
          ) : null}
          {data.source || data.soil_source ? (
            <Text variant="caption" tone="muted">
              {data.source || data.soil_source}
            </Text>
          ) : null}
        </Stack>
      </Card>
      <WeatherOverlay weather={data.weather} />
    </Stack>
  );
}

function WeatherOverlay({weather}) {
  if (!Array.isArray(weather?.dates) || !weather.dates.length) {
    return null;
  }
  return (
    <Card>
      <Stack gap={8}>
        <Text variant="heading">Weather outlook</Text>
        {weather.dates.map((date, index) => {
          const low = weather.temp_min?.[index];
          const high = weather.temp_max?.[index];
          const rain = weather.precipitation?.[index];
          const wind = weather.wind_speed_max?.[index];
          const readings = [
            low != null && high != null ? `${low}–${high} °C` : null,
            rain != null ? `${rain} mm rain` : null,
            wind != null ? `${wind} km/h wind` : null,
          ].filter(Boolean);
          return (
            <Stack key={date} gap={2}>
              <Text variant="label">{date}</Text>
              <Text variant="small" tone="muted">
                {readings.join(' · ') || 'Readings unavailable'}
              </Text>
            </Stack>
          );
        })}
        {weather.source ? (
          <Text variant="caption" tone="muted">
            {weather.source}
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

function submitAdvice(action, path, body, textField) {
  return action.run(async () => {
    const response = await request('advice', path, {
      method: 'POST',
      body: body(),
    });
    if (
      typeof response?.[textField] !== 'string' ||
      !response[textField].trim()
    ) {
      throw new Error('The service did not return guidance. Try again.');
    }
    return response;
  });
}

function CropWindow({entry, action}) {
  return (
    <Card>
      <Stack gap={8}>
        <Text variant="heading">{entry.crop}</Text>
        {entry.season ? (
          <Text variant="small" tone="muted">
            {entry.season}
          </Text>
        ) : null}
        {Array.isArray(entry.sow_months) && entry.sow_months.length ? (
          <Text variant="small">Sowing · {entry.sow_months.join(' – ')}</Text>
        ) : null}
        {Array.isArray(entry.harvest_months) && entry.harvest_months.length ? (
          <Text variant="small">
            Harvest · {entry.harvest_months.join(' – ')}
          </Text>
        ) : null}
        {entry.source ? (
          <Text variant="caption" tone="muted">
            {entry.source}
          </Text>
        ) : null}
        {action ? (
          <Button
            label={`View ${entry.crop} calendar`}
            variant="secondary"
            onPress={action}
          />
        ) : null}
      </Stack>
    </Card>
  );
}

function CropPlanning({back, farm, go, params, user}) {
  const copy = useTaskText('cropPlanning');
  const [tab, setTab] = useState(
    params?.tab === 'Calendar' ? 'Calendar' : 'Choose a crop',
  );
  const [city, setCity] = useState(
    farm?.plotId ? '' : farm?.place || user?.location?.city || placeName(user),
  );
  const [state, setState] = useState(
    farm?.plotId ? '' : user?.location?.state || '',
  );
  const [acres, setAcres] = useState(String(farm?.acres || ''));
  const [crop, setCrop] = useState(params?.crop || farm?.crop || '');
  const suggestion = useAction();
  const calendar = useAction();
  const lang = useAdviceLocale();

  const findCrops = () =>
    suggestion.run(() => {
      const place = requireValue(city, 'a city or village');
      const region = requireValue(state, 'a state');
      const land_acres = requirePositive(acres, 'land size');
      return request('advice', '/crop_suggestion', {
        method: 'POST',
        body: {
          ...getPoint(user, go, place, region, farm),
          land_acres,
          lang,
          region,
        },
      });
    });

  function loadCalendar(name) {
    return calendar.run(async () => {
      const selectedCrop = requireValue(name, 'a crop');
      const pointSource = farm?.plotId ? farm : user;
      const location = pointSource?.location;
      const usePoint =
        hasMapPoint(pointSource) &&
        (!farm?.place || samePlace(user, farm.place));
      const result = await request('advice', '/crop_calendar', {
        method: 'POST',
        body: {
          crop: selectedCrop,
          region: usePoint ? location?.state || location?.city : farm?.place,
          latitude: usePoint ? Number(location.lat) : 0,
          longitude: usePoint ? Number(location.lon) : 0,
        },
      });
      if (typeof result?.window?.crop !== 'string') {
        throw new Error(
          'A crop calendar was unavailable. Try another crop or try again later.',
        );
      }
      return result;
    });
  }

  const showCrop = name => {
    setCrop(name);
    setTab('Calendar');
    loadCalendar(name);
  };
  const results = dataRows(suggestion.data?.windows).filter(
    entry => typeof entry.crop === 'string',
  );

  return (
    <Screen
      title={copy('title', 'Crop planning', 'cropSuggestion.header')}
      back={back}>
      <Stack>
        <Tabs
          items={['Choose a crop', 'Calendar']}
          value={tab}
          onChange={setTab}
        />
        {tab === 'Calendar' ? (
          <Stack>
            <Text variant="heading">Follow your crop’s season</Text>
            <FarmContext farm={farm} go={go} />
            <Field
              label={copy('crop', 'Crop', 'cropSuggestion.inputs.cropName')}
              placeholder="Choose a crop"
              value={crop}
              onChangeText={setCrop}
            />
            <Button
              label={copy(
                'openCalendar',
                'View calendar',
                'cropSuggestion.button.generateCalendar',
              )}
              onPress={() => loadCalendar(crop)}
              disabled={calendar.pending}
            />
            <Result error={calendar.error} pending={calendar.pending} />
            {calendar.data?.window ? (
              <>
                <CropWindow entry={calendar.data.window} />
                {calendar.data.note ? (
                  <Text variant="small" tone="muted">
                    {calendar.data.note}
                  </Text>
                ) : null}
                <WeatherOverlay weather={calendar.data.weather} />
              </>
            ) : (
              <Notice title="Your seasonal guide" tone="default">
                See available sowing and harvest periods, alongside weather
                information for your location.
              </Notice>
            )}
            <Row
              title="Change crop"
              description="Return to crop options"
              onPress={() => setTab('Choose a crop')}
            />
          </Stack>
        ) : (
          <Stack>
            <Text variant="heading">Plan for your place</Text>
            <FarmContext farm={farm} go={go} />
            <Pair>
              <Field
                label={copy('city', 'City', 'cropSuggestion.inputs.city')}
                placeholder="Your city"
                value={city}
                onChangeText={setCity}
              />
              <Field
                label={copy('state', 'State', 'cropSuggestion.inputs.state')}
                placeholder="Your state"
                value={state}
                onChangeText={setState}
              />
            </Pair>
            <Field
              label={copy(
                'area',
                'Land size',
                'cropSuggestion.inputs.landAcres',
              )}
              placeholder="Area in acres"
              keyboardType="decimal-pad"
              value={acres}
              onChangeText={setAcres}
            />
            <Button
              label={copy(
                'find',
                'Find crop options',
                'cropSuggestion.button.getRecommendations',
              )}
              onPress={findCrops}
              disabled={suggestion.pending}
            />
            <AdviceResult action={suggestion} />
            {results.length ? (
              <Stack>
                <Text variant="heading">
                  {suggestion.data.season || 'Crop options'}
                </Text>
                {results.map(entry => (
                  <CropWindow
                    key={entry.crop}
                    entry={entry}
                    action={() => showCrop(entry.crop)}
                  />
                ))}
                <WeatherOverlay weather={suggestion.data.weather} />
              </Stack>
            ) : (
              <Notice
                title={
                  suggestion.data
                    ? 'No crop options available'
                    : 'From choice to calendar'
                }>
                {suggestion.data
                  ? 'Try the calendar for a crop you already grow.'
                  : 'Choose a crop from your results to see its sowing and harvest calendar.'}
              </Notice>
            )}
          </Stack>
        )}
      </Stack>
    </Screen>
  );
}

const methods = [
  ['Drip', 'droplet'],
  ['Sprinkler', 'cloud-rain'],
  ['Surface', 'layers'],
  ['Subsurface', 'arrow-down'],
  ['Manual', 'tool'],
];
const soilInputs = [
  ['soil_ph', 'Soil pH', 'e.g. 6.5', 14],
  ['soil_organic_carbon', 'Carbon (%)', 'Enter value', 100],
  ['soil_nitrogen', 'Nitrogen (%)', 'Enter value', 100],
  ['soil_clay', 'Clay (%)', 'Enter value', 100],
  [
    'soil_organic_carbon_stock',
    'Carbon stock (Mg/ha)',
    'Enter value',
    Infinity,
  ],
];

function WaterSoil({back, farm, go, params, user}) {
  const copy = useTaskText('waterSoil');
  const [tab, setTab] = useState(
    params?.tab === 'Nutrients' ? 'Nutrients' : 'Irrigation',
  );
  const [crop, setCrop] = useState(farm?.crop || '');
  const [acres, setAcres] = useState(String(farm?.acres || ''));
  const [method, setMethod] = useState('');
  const [soil, setSoil] = useState({});
  const plan = useAction();
  const nutrients = useAction();
  const openPortal = useAction();
  const lang = useAdviceLocale();

  const planWater = () =>
    submitAdvice(
      plan,
      '/water_management',
      () => {
        const selectedCrop = requireValue(crop, 'a crop');
        const area = requirePositive(acres, 'field size');
        if (!method) {
          throw new Error('Choose an irrigation method.');
        }
        return {
          ...getPoint(user, go, farm?.place, undefined, farm),
          crop: selectedCrop,
          field_size_acres: area,
          irrigation_method: method,
          lang,
        };
      },
      'advice',
    );

  const adviseNutrients = () =>
    submitAdvice(
      nutrients,
      '/api/fertilizer_recommendation',
      () => {
        const selectedCrop = requireValue(crop, 'a crop');
        const soil_health_card = {};
        for (const [key, label, , limit] of soilInputs) {
          if (soil[key]?.trim()) {
            const value = Number(soil[key]);
            if (!Number.isFinite(value) || value < 0 || value > limit) {
              throw new Error(`Enter a valid value for ${label}.`);
            }
            soil_health_card[key] = value;
          }
        }
        if (
          Object.keys(soil_health_card).length &&
          soil_health_card.soil_ph == null
        ) {
          throw new Error('Enter soil pH to use your Soil Health Card values.');
        }
        const {latitude: lat, longitude: lon} = getPoint(
          user,
          go,
          farm?.place,
          undefined,
          farm,
        );
        return {
          lat,
          lon,
          crop: selectedCrop,
          lang,
          region: farm?.plotId
            ? undefined
            : user?.location?.state || user?.location?.city,
          ...(soil_health_card.soil_ph == null ? {} : {soil_health_card}),
        };
      },
      'recommendation',
    );

  const soilField = index => {
    const [key, label, placeholder] = soilInputs[index];
    return (
      <Field
        label={label}
        placeholder={placeholder}
        keyboardType="decimal-pad"
        value={soil[key] || ''}
        onChangeText={value => setSoil(current => ({...current, [key]: value}))}
      />
    );
  };

  return (
    <Screen
      title={copy('title', 'Water & soil', 'waterManagement.title')}
      back={back}>
      <Stack>
        <Tabs
          items={['Irrigation', 'Nutrients']}
          value={tab}
          onChange={setTab}
        />
        {tab === 'Irrigation' ? (
          <Stack>
            <FarmContext farm={farm} go={go} />
            <Pair>
              <Field
                label={copy('crop', 'Crop', 'waterManagement.fields.crop')}
                placeholder="Crop name"
                value={crop}
                onChangeText={setCrop}
              />
              <Field
                label={copy(
                  'area',
                  'Field size',
                  'waterManagement.fields.fieldSize',
                )}
                placeholder="Acres"
                keyboardType="decimal-pad"
                value={acres}
                onChangeText={setAcres}
              />
            </Pair>
            <Text variant="label">
              {copy(
                'method',
                'Irrigation method',
                'waterManagement.fields.irrigationMethod',
              )}
            </Text>
            <View accessibilityRole="radiogroup" style={styles.methods}>
              {methods.map(([label, icon]) => (
                <Pressable
                  key={label}
                  accessibilityRole="radio"
                  accessibilityState={{checked: method === label}}
                  onPress={() => setMethod(label)}
                  style={[
                    styles.method,
                    method === label && styles.selectedMethod,
                  ]}>
                  <Icon name={icon} size={18} color={theme.paddy} />
                  <Text variant="small">{label}</Text>
                </Pressable>
              ))}
            </View>
            <Button
              label={copy(
                'irrigation',
                'Plan irrigation',
                'waterManagement.buttons.getPlan',
              )}
              onPress={planWater}
              disabled={plan.pending}
            />
            <Text variant="small" tone="muted">
              Weather-based guidance. Check soil moisture in the field.
            </Text>
            <AdviceResult action={plan} title="Irrigation guidance" />
          </Stack>
        ) : (
          <Stack>
            <Field
              label={copy('crop', 'Crop', 'waterManagement.fields.crop')}
              placeholder="For example, jowar"
              value={crop}
              onChangeText={setCrop}
            />
            <Stack gap={4}>
              <Text variant="heading">Soil details · optional</Text>
              <Text variant="small" tone="muted">
                Copy these values from your Soil Health Card.
              </Text>
            </Stack>
            <Pair>
              {soilField(0)}
              {soilField(1)}
            </Pair>
            <Pair>
              {soilField(2)}
              {soilField(3)}
            </Pair>
            {soilField(4)}
            <Button
              label={copy(
                'nutrients',
                'Get nutrient guidance',
                'fertilizer.button.getRecommendations',
              )}
              onPress={adviseNutrients}
              disabled={nutrients.pending}
            />
            <AdviceResult
              action={nutrients}
              title={copy(
                'nutrientResults',
                'Nutrient guidance',
                'fertilizer.results.fertilizerRecommendations',
              )}
            />
            <Row
              title={copy(
                'soilCard',
                'Open Soil Health Card portal',
                'fertilizer.soilCardLink',
              )}
              description="soilhealth.dac.gov.in"
              icon="external-link"
              onPress={() =>
                openPortal.run(() =>
                  Linking.openURL('https://soilhealth.dac.gov.in'),
                )
              }
            />
            <Result error={openPortal.error} pending={openPortal.pending} />
          </Stack>
        )}
      </Stack>
    </Screen>
  );
}

function AfterHarvest({back, farm, go, params, user}) {
  const copy = useTaskText('afterHarvest');
  const [tab, setTab] = useState(
    params?.tab === 'Transport' ? 'Transport' : 'Storage',
  );
  const [crop, setCrop] = useState(farm?.crop || '');
  const [date, setDate] = useState('');
  const [region, setRegion] = useState(
    farm?.plotId ? '' : user?.location?.state || '',
  );
  const storage = useAction();
  const lang = useAdviceLocale();
  const [hasOpenedTransport, setHasOpenedTransport] = useState(
    tab === 'Transport',
  );

  const changeTab = next => {
    if (next === 'Transport') {
      setHasOpenedTransport(true);
    }
    setTab(next);
  };
  const adviseStorage = () =>
    submitAdvice(
      storage,
      '/postharvest',
      () => {
        const harvest_date = dateValue(date);
        const selectedCrop = requireValue(crop, 'a crop');
        const selectedRegion = requireValue(region, 'a region');
        return {
          ...getPoint(user, go, farm?.place, selectedRegion, farm),
          crop: selectedCrop,
          harvest_date,
          region: selectedRegion,
          lang,
        };
      },
      'advice',
    );

  return (
    <Screen
      title={copy('title', 'After harvest', 'postHarvest.title')}
      back={back}>
      <Stack>
        <Tabs
          items={['Storage', 'Transport']}
          value={tab}
          onChange={changeTab}
        />
        {tab === 'Storage' ? (
          <Stack>
            <Text variant="heading">Plan what happens next</Text>
            <FarmContext farm={farm} go={go} />
            <Field
              label={copy('crop', 'Crop', 'postHarvest.fields.crop')}
              placeholder="For example, wheat"
              value={crop}
              onChangeText={setCrop}
            />
            <ControlDate
              label={copy(
                'harvestDate',
                'Harvest date',
                'postHarvest.fields.harvestDate',
              )}
              value={date}
              onChangeText={setDate}
            />
            <Select
              label={copy('region', 'Region', 'postHarvest.fields.region')}
              placeholder="Choose your region"
              value={region}
              onChange={setRegion}
              options={INDIA_STATES}
            />
            <Button
              label={copy(
                'requestStorage',
                'Get storage guidance',
                'postHarvest.buttons.getInstructions',
              )}
              onPress={adviseStorage}
              disabled={storage.pending}
            />
            <Text variant="small" tone="muted">
              Guidance uses your crop details and available weather information.
            </Text>
            <AdviceResult
              action={storage}
              title={copy(
                'storageResult',
                'Storage guidance',
                'postHarvest.sections.postHarvestPlan',
              )}
            />
            <Row
              title={copy('pickup', 'Arrange a pickup', 'logistics.create')}
              description="Post a transport job"
              icon="truck"
              onPress={() => changeTab('Transport')}
            />
          </Stack>
        ) : null}
        {hasOpenedTransport ? (
          <View style={tab === 'Transport' ? null : styles.hidden}>
            <JobsPanel
              user={user}
              farm={farm}
              partner={user?.role === 'Logistics'}
            />
          </View>
        ) : null}
      </Stack>
    </Screen>
  );
}

function JobsPanel({partner, user, farm}) {
  const copy = useTaskText('logistics');
  const [view, setView] = useState('Available');
  const [jobs, setJobs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [locationFilter, setLocationFilter] = useState('');
  const [crop, setCrop] = useState(farm?.crop || '');
  const [quantity, setQuantity] = useState('');
  const [city, setCity] = useState(farm?.place || placeName(user));
  const [state, setState] = useState(user?.location?.state || '');
  const postAttempt = useRef(null);
  const posting = useRef(false);
  const write = useAction();

  const loadJobs = useCallback(async signal => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await request('account', '/logistics/jobs', {signal});
      if (!Array.isArray(data?.jobs)) {
        throw new Error('Pickup information is unavailable.');
      }
      if (!signal?.aborted) {
        setJobs(dataRows(data.jobs).filter(job => job.id != null));
      }
    } catch (error) {
      if (!signal?.aborted) {
        if (error?.status === 403) {
          setJobs(null);
        }
        setLoadError(error);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadJobs(controller.signal);
    return () => controller.abort();
  }, [loadJobs]);

  const update = useCallback(job => {
    setJobs(current => [
      job,
      ...(current || []).filter(item => item.id !== job.id),
    ]);
  }, []);

  const postJob = async () => {
    if (
      posting.current ||
      (write.error?.status === 429 && write.error.retryAt > Date.now())
    ) {
      return;
    }
    posting.current = true;
    try {
      await write.run(async () => {
        const body = {
          crop: requireValue(crop, 'a crop'),
          quantityKg: requirePositive(quantity, 'quantity in kilograms'),
          pickupCity: requireValue(city, 'a pickup city'),
          pickupState: requireValue(state, 'a pickup state'),
        };
        const payload = JSON.stringify(body);
        if (postAttempt.current?.payload !== payload) {
          postAttempt.current = {payload, key: submissionKey()};
        }
        const data = await request('account', '/logistics/jobs', {
          method: 'POST',
          headers: {'Idempotency-Key': postAttempt.current.key},
          body: payload,
        });
        if (data?.job?.id == null) {
          throw new Error(
            'Could not confirm the pickup. Retry this submission or refresh your jobs before starting a new one.',
          );
        }
        postAttempt.current = null;
        update(data.job);
        setQuantity('');
        return data.job;
      });
    } finally {
      posting.current = false;
    }
  };

  const changeJob = (id, change) =>
    write.run(async () => {
      try {
        const data = await request(
          'account',
          `/logistics/jobs/${encodeURIComponent(id)}/${change}`,
          {method: 'PUT'},
        );
        if (data?.job?.id == null) {
          throw new Error(
            'Could not confirm the pickup status. Refresh your jobs to check.',
          );
        }
        update(data.job);
        return data.job;
      } catch (error) {
        if ([403, 404, 409].includes(error?.status)) {
          await loadJobs();
        }
        throw error;
      }
    });

  const isAvailable = view === 'Available';
  const search = normalized(locationFilter);
  const visible = (jobs || []).filter(job => {
    if (!partner) {
      return true;
    }
    if (!isAvailable) {
      return job.status !== 'OPEN';
    }
    return (
      job.status === 'OPEN' &&
      normalized(`${job.pickupCity || ''} ${job.pickupState || ''}`).includes(
        search,
      )
    );
  });
  const emptyTitle = partner
    ? isAvailable
      ? 'No pickups available'
      : 'No accepted pickups yet'
    : 'No pickups posted yet';
  const emptyBody = partner
    ? isAvailable
      ? 'New requests will appear here when farmers post them.'
      : 'Keep track of the jobs you take here.'
    : 'Your posted jobs and their status will appear here.';
  const busy = write.pending || loading;
  const approvalRequired =
    partner &&
    (loadError?.status === 403 || (user?.carrierApproved === false && !jobs));

  if (approvalRequired) {
    return (
      <Stack>
        <Notice title="Carrier approval required">
          Your account needs staff approval before you can view or accept
          pickups.
        </Notice>
        <Result
          error={loadError?.status === 403 ? null : loadError}
          pending={loading}
        />
        <Button
          label="Check approval"
          variant="secondary"
          onPress={() => loadJobs()}
          disabled={busy}
        />
      </Stack>
    );
  }

  return (
    <Stack>
      {partner ? (
        <>
          <Tabs
            items={['Available', 'Accepted']}
            value={view}
            onChange={setView}
          />
          <Text variant="heading">
            {isAvailable ? 'Find your next pickup' : 'Accepted pickups'}
          </Text>
          {isAvailable ? (
            <Field
              label="Location"
              value={locationFilter}
              placeholder="Choose area"
              onChangeText={setLocationFilter}
            />
          ) : null}
        </>
      ) : (
        <>
          <Text variant="heading">
            {copy('postHeading', 'Arrange a crop pickup', 'logistics.create')}
          </Text>
          <Pair>
            <Field
              label={copy('crop', 'Crop', 'logistics.crop')}
              placeholder="Crop name"
              value={crop}
              onChangeText={setCrop}
            />
            <Field
              label={copy('quantity', 'Quantity', 'logistics.quantity')}
              placeholder="Kilograms"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
          </Pair>
          <Field
            label={copy('city', 'Pickup city', 'logistics.city')}
            placeholder="City or village"
            value={city}
            onChangeText={setCity}
          />
          <Select
            label={copy('state', 'Pickup state', 'logistics.state')}
            placeholder="Select state"
            options={INDIA_STATES}
            value={state}
            onChange={setState}
          />
          <Button
            label={copy('post', 'Post pickup', 'logistics.post')}
            onPress={postJob}
            disabled={busy}
          />
        </>
      )}
      <Result error={write.error} pending={write.pending} />
      <Result error={loadError} pending={loading} />
      {visible.map(job => {
        const label = [job.pickupCity, job.pickupState]
          .filter(Boolean)
          .join(', ');
        const affordance = partner
          ? job.status === 'OPEN'
            ? ['Accept pickup', 'accept']
            : job.status === 'ACCEPTED'
            ? ['Mark complete', 'done']
            : null
          : job.status === 'OPEN'
          ? ['Cancel pickup', 'cancel']
          : null;
        return (
          <Card key={job.id}>
            <Stack gap={8}>
              <Text variant="heading">
                {job.crop} · {job.quantityKg} kg
              </Text>
              {label ? <Text variant="small">{label}</Text> : null}
              <Text variant="small" tone="muted">
                {statuses[job.status] || 'Status unavailable'}
              </Text>
              {affordance ? (
                <Button
                  label={affordance[0]}
                  onPress={() => changeJob(job.id, affordance[1])}
                  variant="secondary"
                  disabled={busy}
                />
              ) : null}
            </Stack>
          </Card>
        );
      })}
      {!loading && !loadError && !visible.length ? (
        <Notice title={emptyTitle} tone="default">
          {emptyBody}
        </Notice>
      ) : null}
      {partner || loadError ? (
        <Button
          label="Refresh jobs"
          variant="secondary"
          icon="refresh-cw"
          onPress={() => loadJobs()}
          disabled={busy}
        />
      ) : null}
      {partner && isAvailable ? (
        <Row
          title="Accepted pickups"
          description="Keep track of the jobs you take"
          onPress={() => setView('Accepted')}
        />
      ) : null}
    </Stack>
  );
}

function TransportJobs({back, user, farm}) {
  const copy = useTaskText('logistics');
  return (
    <Screen
      title={copy('title', 'Transport jobs', 'logistics.header')}
      back={back}>
      <JobsPanel user={user} farm={farm} partner={user?.role === 'Logistics'} />
    </Screen>
  );
}

const openDocument = (id, refreshProfile, action) =>
  action.run(() =>
    openRemoteDocument(() => freshDocumentUrl(refreshProfile, id)),
  );

function ensurePdf(file, maxBytes) {
  if (file.type !== pdfType && !/\.pdf$/i.test(file.name || '')) {
    throw new Error('Choose a PDF document.');
  }
  const bytes = file.size ?? file.blob?.size;
  if (bytes > maxBytes) {
    throw new Error(`Choose a PDF smaller than ${maxBytes / 1024 / 1024} MB.`);
  }
  return {...file, type: pdfType};
}

function Documents({back, go, user}) {
  const copy = useTaskText('documents');
  const {refreshProfile} = useContext(UserContext);
  const [selectedFile, setSelectedFile] = useState(null);
  const uploadController = useRef(null);
  useEffect(() => () => uploadController.current?.abort(), []);
  const pickFile = useAction();
  const upload = useAction();
  const open = useAction();
  const list = useAction();
  const reload = list.run;
  useEffect(() => {
    reload(refreshProfile);
  }, [reload, refreshProfile]);
  const ids = savedDocuments(user);

  const choose = () =>
    pickFile.run(async () => {
      const file = await chooseDocument();
      if (file) {
        setSelectedFile(ensurePdf(file, 10 * 1024 * 1024));
      }
    });
  const save = async () => {
    const result = await upload.run(async () => {
      if (!selectedFile) {
        throw new Error('Choose a PDF first.');
      }
      const form = new FormData();
      appendFile(form, 'document', selectedFile);
      const controller = new AbortController();
      uploadController.current = controller;
      const data = await request('account', '/upload/upload-doc', {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });
      if (controller.signal.aborted) {
        return null;
      }
      if (!data?.success || !Array.isArray(data.user?.documents)) {
        throw new Error('The service did not confirm the upload.');
      }
      setSelectedFile(null);
      return data;
    });
    if (result) {
      reload(refreshProfile);
    }
  };

  return (
    <Screen title={copy('title', 'Documents', 'documents.header')} back={back}>
      <Stack>
        <Stack gap={4}>
          <Text variant="heading">Your farm paperwork, together</Text>
          <Text variant="small" tone="muted">
            Keep a document here, then open or translate it when you need it.
          </Text>
        </Stack>
        <Button
          label="Add a document"
          icon="plus"
          onPress={choose}
          disabled={pickFile.pending || upload.pending}
        />
        <Result error={list.error} pending={list.pending} />
        {list.error ? (
          <Button
            label="Refresh documents"
            variant="secondary"
            onPress={() => reload(refreshProfile)}
          />
        ) : null}
        {ids.length ? (
          ids.map(id => (
            <Card key={id}>
              <Stack gap={8}>
                <Text variant="label">{documentName(id)}</Text>
                <Pair>
                  <Button
                    label="Open original"
                    variant="secondary"
                    onPress={() => openDocument(id, refreshProfile, open)}
                  />
                  <Button
                    label={copy(
                      'translate',
                      'Translate',
                      'documents.translate.button',
                    )}
                    variant="secondary"
                    onPress={() => go('DocumentTranslate', {documentId: id})}
                  />
                </Pair>
              </Stack>
            </Card>
          ))
        ) : !list.pending && !list.error ? (
          <Notice title="No documents yet" tone="default">
            Choose a file from your device.
          </Notice>
        ) : null}
        <Result error={open.error} pending={open.pending} />
        <Notice title="Translate from a document" tone="default">
          Open a saved file and choose Translate. You won’t need to upload it
          again.
        </Notice>
        <Row
          title="Choose a file to upload"
          description={selectedFile?.name || 'No file selected'}
          icon="file-text"
          onPress={upload.pending || pickFile.pending ? undefined : choose}
        />
        {selectedFile ? (
          <Button
            label={copy(
              'upload',
              'Upload PDF',
              'documents.upload.uploadButton',
            )}
            onPress={save}
            disabled={upload.pending}
          />
        ) : null}
        <Result
          error={pickFile.error || upload.error}
          pending={pickFile.pending || upload.pending}
        />
        {upload.data ? (
          <Text variant="small" tone="muted">
            Document saved.
          </Text>
        ) : null}
        <Button
          label="Translate a PDF from this device"
          variant="ghost"
          onPress={() => go('DocumentTranslate')}
        />
      </Stack>
    </Screen>
  );
}

function DocumentTranslate({back, params, user}) {
  const copy = useTaskText('documents');
  const [file, setFile] = useState(null);
  const lang = useAdviceLocale();
  const [target, setTarget] = useState(() => adviceLangName(lang));
  const {refreshProfile} = useContext(UserContext);
  const [id, setId] = useState(() =>
    savedDocuments(user).includes(params?.documentId) ? params.documentId : '',
  );
  const [selecting, setSelecting] = useState(false);
  const pickFile = useAction();
  const translate = useAction();
  const open = useAction();
  const ids = savedDocuments(user);
  const maxBytes = 8 * 1024 * 1024;

  const choose = () =>
    pickFile.run(async () => {
      const nextFile = await chooseDocument();
      if (nextFile) {
        setFile(ensurePdf(nextFile, maxBytes));
        setId('');
        setSelecting(false);
        translate.reset();
      }
    });
  const submit = () =>
    translate.run(async () => {
      if (!file && !id) {
        throw new Error('Choose a saved or local PDF first.');
      }
      const targetLanguage = target || adviceLangName(lang);
      let remoteFile;
      try {
        if (id) {
          const url = await freshDocumentUrl(refreshProfile, id);
          remoteFile = await readRemoteDocument(url, documentName(id));
        }
        const source = ensurePdf(remoteFile || file, maxBytes);
        const form = new FormData();
        appendFile(form, 'file', source);
        form.append('target_language', targetLanguage);
        const data = await request('advice', '/translate', {
          method: 'POST',
          body: form,
        });
        if (
          typeof data?.translated_document !== 'string' ||
          !data.translated_document.trim()
        ) {
          throw new Error(
            'No translation was returned. Try another PDF or try again later.',
          );
        }
        return data;
      } finally {
        await remoteFile?.cleanup?.().catch(() => {});
      }
    });

  return (
    <Screen
      title={copy(
        'translateTitle',
        'Translate document',
        'documents.translate.title',
      )}
      back={back}>
      <Stack>
        <Text variant="heading">One document, another language</Text>
        <Stack gap={4}>
          <Text variant="label">Document</Text>
          <Button
            label={
              file?.name ||
              (id ? documentName(id) : 'Choose saved file or upload')
            }
            icon="file-text"
            variant="secondary"
            disabled={translate.pending}
            onPress={() => setSelecting(!selecting)}
          />
        </Stack>
        {selecting ? (
          <Card>
            <Stack gap={8}>
              {ids.map(savedId => (
                <Row
                  key={savedId}
                  title={documentName(savedId)}
                  icon="file-text"
                  onPress={() => {
                    setId(savedId);
                    setFile(null);
                    setSelecting(false);
                    translate.reset();
                  }}
                />
              ))}
              <Button
                label="Choose a PDF from this device"
                variant="secondary"
                onPress={choose}
                disabled={pickFile.pending}
              />
            </Stack>
          </Card>
        ) : null}
        <Result error={pickFile.error} pending={pickFile.pending} />
        <Select
          label="Translate into"
          placeholder="Select language"
          options={languages}
          value={target}
          onChange={setTarget}
        />
        <Button
          label={copy(
            'translateTitle',
            'Translate document',
            'documents.translate.title',
          )}
          onPress={submit}
          disabled={translate.pending || pickFile.pending}
        />
        <AdviceResult
          action={translate}
          title={copy(
            'translated',
            'Translated document',
            'documents.translate.translatedDocument',
          )}
        />
        <Notice title="Keep the original" tone="default">
          Your original stays available beside its translation.
        </Notice>
        {id ? (
          <Button
            label="Open original PDF"
            variant="secondary"
            onPress={() => openDocument(id, refreshProfile, open)}
          />
        ) : null}
        <Result error={open.error} pending={open.pending} />
        <Text variant="small" tone="muted">
          Check important names, dates and figures against the original
          document.
        </Text>
      </Stack>
    </Screen>
  );
}

const screens = {
  CropPlanning,
  WaterSoil,
  AfterHarvest,
  Documents,
  DocumentTranslate,
  TransportJobs,
};

export function TaskScreen({screen, ...props}) {
  const Component = screens[screen];
  return Component ? <Component {...props} /> : null;
}

const markdownStyles = {
  body: {
    color: theme.ink,
    fontFamily: theme.font.regular,
    fontSize: 15,
    lineHeight: 22,
  },
};

const styles = StyleSheet.create({
  pair: {flexDirection: 'row', gap: 12},
  pairItem: {flex: 1, minWidth: 0},
  compactCard: {paddingHorizontal: 12, paddingVertical: 5},
  methods: {flexDirection: 'row', gap: 8, flexWrap: 'wrap'},
  method: {
    minHeight: 48,
    flexGrow: 1,
    flexBasis: '29%',
    backgroundColor: theme.surface,
    borderColor: theme.hairline,
    borderWidth: 1,
    borderRadius: theme.r3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 4,
  },
  selectedMethod: {backgroundColor: theme.paddySoft, borderColor: theme.paddy},
  hidden: {display: 'none'},
});
