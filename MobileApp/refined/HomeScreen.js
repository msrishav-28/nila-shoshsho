import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {useTranslation} from 'react-i18next';
import {hasMapPoint} from '../utils/place';
import {request} from './data';
import {httpUrl} from './marketData';
import {openLink} from './marketUi';
import {
  Button,
  Card,
  Columns,
  Field,
  IconButton,
  Illustration,
  Notice,
  Row,
  Screen,
  Stack,
  Text,
} from './ui';

const tools = [
  {
    route: 'CropPlanning',
    title: 'Crop planning',
    description: 'Seasons & calendar',
    icon: 'calendar',
    terms: 'suggestion choose crop sow harvest',
  },
  {
    route: 'WaterSoil',
    title: 'Water & soil',
    description: 'Irrigation & nutrients',
    icon: 'droplet',
    terms: 'fertilizer moisture clay irrigation soil health card',
  },
  {
    route: 'AfterHarvest',
    title: 'After harvest',
    description: 'Storage & transport',
    icon: 'package',
    terms: 'post harvest logistics pickup',
  },
  {
    route: 'Documents',
    title: 'Documents',
    description: 'Keep & translate',
    icon: 'file-text',
    terms: 'upload pdf document language',
  },
];
const extraTools = [
  {
    route: 'CropCare',
    title: 'Crop Care',
    description: 'Check a crop photo',
    icon: 'feather',
    terms: 'leaf plant disease',
  },
  {
    route: 'Market',
    title: 'Market',
    description: 'Prices, comparisons and nearby stores',
    icon: 'shopping-bag',
    terms: 'mandi market outlook news',
  },
  {
    route: 'Schemes',
    title: 'Schemes',
    description: 'Government support',
    icon: 'layers',
    terms: 'government insurance assistance',
  },
  {
    route: 'FarmMonitoring',
    title: 'Your farm',
    description: 'Plot details and monitoring',
    icon: 'map',
    terms: 'location farm observations',
  },
  {
    route: 'News',
    title: 'Agriculture news',
    description: 'News and official announcements',
    icon: 'rss',
    terms: 'stories',
  },
  {
    route: 'AskNila',
    title: 'Ask Nila',
    description: 'Speak or type',
    icon: 'message-circle',
    terms: 'voice assistant help',
  },
];

function useLocalPicture(user, farm, offline) {
  const [picture, setPicture] = useState(null);
  const id = user?.id || user?._id || user?.email;
  const farmLat = farm?.location?.lat ?? farm?.latitude;
  const farmLon = farm?.location?.lon ?? farm?.longitude;
  const hasFarmPoint = hasMapPoint({location: {lat: farmLat, lon: farmLon}});
  const lat = hasFarmPoint ? farmLat : user?.location?.lat;
  const lon = hasFarmPoint ? farmLon : user?.location?.lon;
  const state = farm?.state || farm?.location?.state || user?.location?.state;
  const hasWeatherLocation = hasMapPoint({location: {lat, lon}});
  const key =
    id && (hasWeatherLocation || state)
      ? `refined.picture.${id}.${lat ?? ''}.${lon ?? ''}.${state ?? ''}.${
          farm?.crop ?? ''
        }`
      : null;

  useEffect(() => {
    if (!key) {
      return;
    }
    let active = true;
    const controller = new AbortController();
    async function load() {
      try {
        const cached = await AsyncStorage.getItem(key);
        if (active && cached) {
          setPicture({key, ...JSON.parse(cached), cached: true});
        }
      } catch {
        // A bad cache entry does not prevent refresh.
      }
      if (offline || !active) {
        return;
      }
      const marketQuery = `state=${encodeURIComponent(
        state || '',
      )}&commodity=${encodeURIComponent(farm?.crop || '')}&limit=1`;
      const [weather, market] = await Promise.allSettled([
        hasWeatherLocation
          ? request('advice', `/weather?lat=${lat}&lon=${lon}`, {
              signal: controller.signal,
            })
          : null,
        state
          ? request('advice', `/api/market-prices?${marketQuery}`, {
              signal: controller.signal,
            })
          : null,
      ]);
      if (!active) {
        return;
      }
      const current = weather.value?.open_meteo?.current;
      const record = market.value?.records?.[0];
      const next = {
        weather: current,
        market: record,
        marketSource: market.value?.source,
        fetchedAt: new Date().toISOString(),
      };
      setPicture({
        key,
        ...next,
        daily: weather.value?.open_meteo?.daily,
        warningsUnavailable: weather.value?.warnings === null,
        marketEmpty:
          Array.isArray(market.value?.records) && !market.value.records.length,
      });
      if (current || record) {
        AsyncStorage.setItem(key, JSON.stringify(next)).catch(() => {});
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [key, hasWeatherLocation, lat, lon, state, farm?.crop, offline]);

  return {
    hasWeatherLocation,
    hasMarketLocation: Boolean(state),
    picture: key && picture?.key === key ? picture : null,
  };
}

function LocalPicture({
  data,
  hasWeatherLocation,
  hasMarketLocation,
  offline,
  go,
}) {
  const weather = data?.weather;
  const daily = data?.daily;
  const forecast = weather?.kind === 'forecast';
  const sourceUrl = httpUrl(weather?.sourceUrl);
  const licenseUrl = httpUrl(weather?.licenseUrl);
  const market = data?.market;
  const price = market?.modal_price ?? market?.modalPrice;
  const arrival = market?.arrival_date || market?.asOf;
  const marketSource = market?.source || data?.marketSource;
  const hasPrice =
    price != null && price !== '' && arrival && market?.unit && marketSource;
  return (
    <Card>
      <Text variant="section">
        {offline && !weather && !market
          ? 'No saved updates yet'
          : 'Your local picture'}
      </Text>
      {data?.cached || (offline && data) ? (
        <Text variant="caption" tone="muted">
          Saved {new Date(data.fetchedAt).toLocaleString()}
        </Text>
      ) : null}
      {weather?.temperature != null ? (
        <>
          <Row
            title={`${
              forecast ? 'Near-term forecast' : 'Current weather'
            } · ${Math.round(weather.temperature)}°C`}
            description={[
              weather.source,
              weather.asOf &&
                (forecast
                  ? `Valid ${weather.asOf}`
                  : `As of ${weather.asOf} UTC`),
            ]
              .filter(Boolean)
              .join(' · ')}
            icon="cloud"
            onPress={sourceUrl ? () => openLink(sourceUrl) : undefined}
          />
          {forecast && licenseUrl ? (
            <Button
              label="Weather data license"
              variant="ghost"
              onPress={() => openLink(licenseUrl)}
            />
          ) : null}
        </>
      ) : hasWeatherLocation && !offline && data && !data.cached ? (
        <Text tone="muted">Current weather is unavailable right now.</Text>
      ) : null}
      {daily?.dates?.length ? (
        <Row
          title="Daily weather outlook"
          description={[
            daily.source,
            daily.dates[0],
            daily.temp_min?.[0] != null && daily.temp_max?.[0] != null
              ? `${daily.temp_min[0]}–${daily.temp_max[0]} °C`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          icon="calendar"
        />
      ) : hasWeatherLocation && !offline && data && !data.cached ? (
        <Text tone="muted">
          Daily weather outlook is unavailable right now.
        </Text>
      ) : null}
      {data?.warningsUnavailable && !offline ? (
        <Text variant="caption" tone="muted">
          Official weather warnings are unavailable.
        </Text>
      ) : null}
      {hasPrice ? (
        <Row
          title={`${market.commodity}: ${price} ${market.unit}`}
          description={`${marketSource} · ${arrival}`}
          icon="trending-up"
          onPress={() => go('Market')}
        />
      ) : hasMarketLocation && !offline && data && !data.cached ? (
        <Text tone="muted">
          {data?.marketEmpty
            ? 'No mandi records were returned for this search.'
            : 'Mandi price data is unavailable right now.'}
        </Text>
      ) : null}
      {offline && !weather && !hasPrice ? (
        <Text tone="muted">
          Connect to load local weather and market information.
        </Text>
      ) : !offline && !hasWeatherLocation && !hasMarketLocation ? (
        <Text tone="muted">
          Add a location to see weather and mandi information.
        </Text>
      ) : !offline && !data ? (
        <Text tone="muted">Loading local updates…</Text>
      ) : null}
      {offline ? (
        <Button
          label="Try again"
          variant="ghost"
          onPress={() => NetInfo.refresh().catch(() => {})}
        />
      ) : null}
    </Card>
  );
}

export function HomeScreen({user, farm, go, offline}) {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const matching = [...tools, ...extraTools].filter(item =>
    `${item.title} ${item.description} ${item.terms}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const {hasWeatherLocation, hasMarketLocation, picture} = useLocalPicture(
    user,
    farm,
    offline,
  );
  function toolRows(items) {
    return items.map(item => (
      <Row
        key={item.route}
        title={item.title}
        description={item.description}
        icon={item.icon}
        end={null}
        onPress={() => go(item.route)}
        style={styles.tool}
      />
    ));
  }
  const farmAction = () => go(farm ? 'FarmMonitoring' : 'FarmSetup');
  return (
    <Screen
      title={t('refined.farmingDay', {defaultValue: 'Your farming day'})}
      eyebrow="NILA SHOSSHO"
      primary="Home"
      go={go}
      hideAsk={offline}
      right={
        <IconButton
          label="Profile and settings"
          icon="user"
          onPress={() => go('Settings')}
        />
      }>
      {offline ? (
        <Notice title="You are offline" tone="info">
          Live advice and voice need a connection. Saved information stays
          available when it has been downloaded.
        </Notice>
      ) : (
        <Card tone="green" style={styles.hero}>
          <Stack gap={8} style={styles.heroCopy}>
            <Text variant="heading">{farm?.name || 'Make it your farm'}</Text>
            <Text variant="small" tone="muted">
              {farm
                ? [farm.crop, farm.place].filter(Boolean).join(' · ')
                : 'Add a crop and village for local guidance.'}
            </Text>
          </Stack>
          <Illustration name="farm" style={styles.heroArt} />
        </Card>
      )}
      <Button
        label={
          offline
            ? 'Continue with your farm'
            : farm
            ? 'View your farm'
            : 'Add your farm'
        }
        icon={farm ? 'map' : 'plus'}
        variant="secondary"
        onPress={farmAction}
      />
      {!offline ? (
        <Field
          placeholder="Find a farm tool"
          icon="search"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      ) : null}
      {query.trim() && !offline ? (
        <Card>
          <Text variant="section">Search results</Text>
          {matching.length ? (
            toolRows(matching)
          ) : (
            <Text tone="muted">No tools match this search.</Text>
          )}
        </Card>
      ) : (
        <Columns>
          <Stack gap={12}>
            {!offline ? (
              <Text variant="section">Tools for the season</Text>
            ) : null}
            <View style={styles.tools}>{toolRows(tools)}</View>
          </Stack>
          <LocalPicture
            data={picture}
            hasWeatherLocation={hasWeatherLocation}
            hasMarketLocation={hasMarketLocation}
            offline={offline}
            go={go}
          />
        </Columns>
      )}
    </Screen>
  );
}

export function StartupScreen() {
  return (
    <Screen title="Nila Shoshsho" eyebrow="NILA SHOSSHO" kind="auth">
      <Stack gap={20} style={styles.startup} accessibilityLiveRegion="polite">
        <Illustration name="startup" style={styles.startupArt} />
        <Text variant="section">Getting your farm ready…</Text>
        <Text variant="small" tone="muted">
          Your guidance will be here shortly.
        </Text>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {flexDirection: 'row', alignItems: 'center', minHeight: 144},
  heroCopy: {flex: 1, minWidth: 0},
  heroArt: {width: '37%', maxWidth: 210, height: 110},
  tools: {flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3},
  tool: {width: '50%', minHeight: 76, paddingHorizontal: 3},
  startup: {
    alignItems: 'center',
    alignSelf: 'center',
    paddingTop: 58,
    width: '100%',
    gap: 20,
  },
  startupArt: {width: '100%', height: 290, maxWidth: 300},
});
