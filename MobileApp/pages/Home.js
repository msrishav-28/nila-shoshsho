import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useTranslation} from 'react-i18next';
import SearchBar from '../components/SearchBar';
import {adviceFetch, accountFetch} from '../utils/api';

const tools = [
  {key: 'postharvest', titleKey: 'features.postHarvest', icon: require('../assets/icons/harvest.png'), nav: 'PostHarvest'},
  {key: 'sprinkler', titleKey: 'features.sprinkler', icon: require('../assets/icons/sprinkler.png'), nav: 'WaterManagement'},
  {key: 'cropcare', titleKey: 'features.cropCare', icon: require('../assets/icons/crop.png'), nav: 'Crop Care'},
  {key: 'fertilize', titleKey: 'features.fertilize', icon: require('../assets/icons/fertilizers.png'), nav: 'Fertilizers'},
  {key: 'market', titleKey: 'features.market', icon: require('../assets/icons/market.png'), nav: 'Market'},
  {key: 'schemes', titleKey: 'features.schemes', icon: require('../assets/icons/scheme.png'), nav: 'Scheme'},
  {key: 'news', titleKey: 'features.news', icon: require('../assets/icons/news.png'), nav: 'News'},
];

const getGreeting = (t) => {
  const hour = new Date().getHours();
  if (hour < 6) return t('HomePage.greetings.night');
  if (hour < 12) return t('HomePage.greetings.morning');
  if (hour < 17) return t('HomePage.greetings.afternoon');
  if (hour < 21) return t('HomePage.greetings.evening');
  return t('HomePage.greetings.night');
};

const Home = () => {
  const {t} = useTranslation();
  const {user} = useContext(UserContext);
  const navigation = useNavigation();
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [mandi, setMandi] = useState(null);
  const [alertKind, setAlertKind] = useState(null);

  const lat = user?.location?.lat;
  const lon = user?.location?.lon;
  const hasPlace = lat && lon && Number(lat) !== 0 && Number(lon) !== 0;
  const place = user?.location?.city || user?.location?.village || user?.location?.state || '';

  useEffect(() => {
    const load = async () => {
      if (!hasPlace) {
        setLoadingWeather(false);
        setWeatherError(t('HomePage.errors.weatherLocationFetch'));
        return;
      }
      try {
        const res = await adviceFetch(`/weather?lat=${lat}&lon=${lon}`);
        const data = await res.json();
        if (!res.ok) {
          setWeatherError(data.error || t('HomePage.errors.weatherFetch'));
        } else {
          setWeather(data);
        }
      } catch (err) {
        setWeatherError(t('HomePage.errors.weatherFetch'));
      } finally {
        setLoadingWeather(false);
      }
    };
    load();
  }, [hasPlace, lat, lon, t]);

  useEffect(() => {
    const loadMandi = async () => {
      const state = user?.location?.state;
      if (!state) {
        return;
      }
      try {
        const res = await adviceFetch(
          `/api/market-prices?state=${encodeURIComponent(state)}&limit=1`,
        );
        const data = await res.json();
        if (res.ok && data.records?.[0]) {
          setMandi(data.records[0]);
        }
      } catch (err) {
        setMandi(null);
      }
    };
    loadMandi();
  }, [user?.location?.state]);

  useEffect(() => {
    const ping = async () => {
      if (!hasPlace) {
        return;
      }
      try {
        const res = await accountFetch('/notifications/weather-check', {method: 'POST'});
        const data = await res.json();
        if (res.ok && data.kind && data.kind !== 'update') {
          setAlertKind(data);
        }
      } catch (err) {
        setAlertKind(null);
      }
    };
    ping();
  }, [hasPlace]);

  const current = weather?.open_meteo?.current || {};
  const daily = weather?.open_meteo?.daily || {};
  const days = (daily.dates || []).slice(0, 7);

  if (!user) {
    return (
      <View style={[theme.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={theme.paddy} />
      </View>
    );
  }

  const firstName = (user.username || '').trim().split(' ')[0];

  return (
    <View style={theme.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.identity} onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Profile">
          <View style={styles.avatarWrap}>
            {user.profilePic ? (
              <Image source={{uri: user.profilePic}} style={styles.avatar} />
            ) : (
              <Image
                source={
                  user.gender === 'Female'
                    ? require('../assets/icons/female-farmer.png')
                    : require('../assets/icons/male-farmer.png')
                }
                style={styles.avatar}
              />
            )}
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.greet}>{getGreeting(t)}</Text>
            <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
            <Text style={styles.place} numberOfLines={1}>
              {place || t('HomePage.errors.weatherLocationFetch')}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')} accessibilityLabel="Notifications" style={styles.iconBtn}>
            <Icon name="notifications-outline" size={22} color={theme.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('LanguageChange')} accessibilityLabel="Language" style={styles.iconBtn}>
            <Icon name="language-outline" size={22} color={theme.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} accessibilityLabel="Settings" style={styles.iconBtn}>
            <Icon name="settings-outline" size={22} color={theme.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 120}}>
        <SearchBar
          placeholder={t('HomePage.searchBar.placeholder')}
          caption={t('HomePage.searchBar.caption')}
          toEdit
        />

        <View style={styles.card}>
          {loadingWeather ? (
            <ActivityIndicator color={theme.paddy} />
          ) : weatherError && !weather ? (
            <Text style={styles.meta}>{weatherError}</Text>
          ) : (
            <>
              <View style={styles.row}>
                <Icon name="location" size={16} color={theme.monsoon} />
                <Text style={styles.callout}>{place || '—'}</Text>
              </View>
              <View style={styles.weatherHero}>
                <Text style={styles.temp}>
                  {current.temperature != null ? `${Math.round(current.temperature)}°` : '—'}
                </Text>
                <View>
                  <Text style={styles.meta}>
                    {current.windspeed != null ? `${Math.round(current.windspeed)} km/h` : ''}
                    {current.humidity != null ? `  ${Math.round(current.humidity)}%` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {current.source || t('HomePage.weather.openMeteo')}
                  </Text>
                  {weather?.imd ? (
                    <View style={styles.imdChip}>
                      <Text style={styles.imdChipText}>
                        {t('HomePage.weather.imdChip')}
                        {weather.imd.station ? ` · ${weather.imd.station}` : ''}
                        {weather.imd.today_forecast ? ` · ${weather.imd.today_forecast}` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {days.length ? (
                <View style={styles.forecast}>
                  {days.map((date, idx) => (
                    <View key={date} style={styles.forecastDay}>
                      <Text style={styles.meta}>
                        {new Date(date).toLocaleDateString('en-IN', {weekday: 'short'})}
                      </Text>
                      <Text style={styles.callout}>
                        {daily.precipitation?.[idx] >= 2 ? t('HomePage.forecast.rain') : t('HomePage.forecast.sky')}
                      </Text>
                      <Text style={styles.meta}>
                        {Math.round(daily.temp_max?.[idx] ?? 0)}°/{Math.round(daily.temp_min?.[idx] ?? 0)}°
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>

        {alertKind?.title ? (
          <View style={[styles.card, {backgroundColor: theme.turmericTint}]}>
            <Text style={styles.callout}>{alertKind.title}</Text>
            <Text style={styles.meta}>{alertKind.body}</Text>
          </View>
        ) : null}

        <Text style={styles.section}>{t('HomePage.sections.farmServices')}</Text>
        <View style={styles.grid}>
          {tools.map(item => (
            <TouchableOpacity
              key={item.key}
              style={styles.tile}
              onPress={() => navigation.navigate(item.nav)}
              accessibilityRole="button"
              accessibilityLabel={t(`HomePage.${item.titleKey}`)}>
              <Image source={item.icon} style={styles.tileIcon} />
              <Text style={styles.tileLabel}>{t(`HomePage.${item.titleKey}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mandi ? (
          <View style={styles.card}>
            <Text style={styles.meta}>{mandi.commodity} · {mandi.market}</Text>
            <Text style={styles.price}>{mandi.modal_price}</Text>
            <Text style={styles.meta}>
              Rs/quintal{mandi.source ? ` · ${mandi.source}` : ''}
              {mandi.asOf ? ` · ${mandi.asOf}` : ''}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity style={styles.ask} onPress={() => navigation.navigate('Chatbot')} accessibilityRole="button">
          <Icon name="chatbubble-ellipses-outline" size={22} color={theme.paddy} />
          <Text style={styles.askText}>{t('HomePage.chatbot.chatButton')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  identity: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.surface,
    ...theme.shadow1,
  },
  avatar: {width: 48, height: 48},
  greet: {...theme.type.meta},
  name: {...theme.type.titleSm},
  place: {...theme.type.meta, color: theme.monsoon},
  actions: {flexDirection: 'row', gap: 4},
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.recessed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    marginTop: 16,
    ...theme.shadow1,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8},
  callout: {...theme.type.callout},
  meta: {...theme.type.meta},
  weatherHero: {flexDirection: 'row', alignItems: 'center', gap: 16},
  temp: {...theme.type.temp},
  imdChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: theme.monsoonSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imdChipText: {...theme.type.meta, color: theme.monsoon},
  forecast: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 12},
  forecastDay: {alignItems: 'center', flex: 1},
  section: {...theme.type.callout, color: theme.inkSoft, marginTop: 24, marginBottom: 8},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  tile: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadow1,
  },
  tileIcon: {width: 40, height: 40, marginBottom: 8, tintColor: theme.paddy},
  tileLabel: {...theme.type.callout, textAlign: 'center'},
  price: {...theme.type.price, marginVertical: 4},
  ask: {
    marginTop: 24,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.paddy,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  askText: {...theme.type.button, color: theme.paddy},
});

export default Home;
