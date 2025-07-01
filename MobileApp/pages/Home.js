// Home.js
import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Platform,
  Dimensions,
  PermissionsAndroid,
  Linking,
} from 'react-native';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import Geolocation from 'react-native-geolocation-service';
import {getWeatherByCoords, getCityName} from '../utils/weather';
// import { ScrollView } from 'react-native-gesture-handler';
import {ScrollView} from 'react-native';
import SearchBar from '../components/SearchBar';
import {useTranslation} from 'react-i18next';
import VoicePlayer from '../components/VoicePlayer';
const schemesData = require('../assets/schemes.json');

const featureCards = [
  {
    key: 'postharvest',
    titleKey: 'features.postHarvest',
    icon: require('../assets/icons/harvest.png'),
    nav: 'PostHarvest',
    color: '#fffde7',
  },
  {
    key: 'sprinkler',
    titleKey: 'features.sprinkler',
    icon: require('../assets/icons/sprinkler.png'),
    nav: 'WaterManagement',
    color: '#effeff',
  },
  {
    key: 'cropcare',
    titleKey: 'features.cropCare',
    icon: require('../assets/icons/crop.png'),
    nav: 'Crop Care',
    color: '#e1f5fe',
  },
  {
    key: 'fertilize',
    titleKey: 'features.fertilize',
    icon: require('../assets/icons/fertilizers.png'),
    nav: 'Fertilizers',
    color: '#e8f5e9',
  },
  {
    key: 'market',
    titleKey: 'features.market',
    icon: require('../assets/icons/market.png'),
    nav: 'Market',
    color: '#fce4ec',
  },
  {
    key: 'schemes',
    titleKey: 'features.schemes',
    icon: require('../assets/icons/scheme.png'),
    nav: 'Scheme',
    color: '#e8f5e9',
  },
  {
    key: 'news',
    titleKey: 'features.news',
    icon: require('../assets/icons/news.png'),
    nav: 'News',
    color: '#d8e5e9',
  },
];

const windowWidth = Dimensions.get('window').width;

// Weather code to emoji/icon mapping (Open-Meteo)
const weatherCodeMap = {
  0: {icon: '☀️', descKey: 'weather.codes.0'},
  1: {icon: '🌤️', descKey: 'weather.codes.1'},
  2: {icon: '⛅', descKey: 'weather.codes.2'},
  3: {icon: '☁️', descKey: 'weather.codes.3'},
  45: {icon: '🌫️', descKey: 'weather.codes.45'},
  48: {icon: '🌫️', descKey: 'weather.codes.48'},
  51: {icon: '🌦️', descKey: 'weather.codes.51'},
  53: {icon: '🌦️', descKey: 'weather.codes.53'},
  55: {icon: '🌦️', descKey: 'weather.codes.55'},
  56: {icon: '🌧️', descKey: 'weather.codes.56'},
  57: {icon: '🌧️', descKey: 'weather.codes.57'},
  61: {icon: '🌦️', descKey: 'weather.codes.61'},
  63: {icon: '🌧️', descKey: 'weather.codes.63'},
  65: {icon: '🌧️', descKey: 'weather.codes.65'},
  66: {icon: '🌧️', descKey: 'weather.codes.66'},
  67: {icon: '🌧️', descKey: 'weather.codes.67'},
  71: {icon: '🌨️', descKey: 'weather.codes.71'},
  73: {icon: '🌨️', descKey: 'weather.codes.73'},
  75: {icon: '❄️', descKey: 'weather.codes.75'},
  77: {icon: '❄️', descKey: 'weather.codes.77'},
  80: {icon: '🌧️', descKey: 'weather.codes.80'},
  81: {icon: '🌧️', descKey: 'weather.codes.81'},
  82: {icon: '🌧️', descKey: 'weather.codes.82'},
  85: {icon: '🌨️', descKey: 'weather.codes.85'},
  86: {icon: '🌨️', descKey: 'weather.codes.86'},
  95: {icon: '⛈️', descKey: 'weather.codes.95'},
  96: {icon: '⛈️', descKey: 'weather.codes.96'},
  99: {icon: '⛈️', descKey: 'weather.codes.99'},
};

function getWeatherIcon(code) {
  return weatherCodeMap[code]?.icon || '❓';
}

function getWeatherDesc(code, t) {
  return weatherCodeMap[code]?.descKey
    ? t(`HomePage.${weatherCodeMap[code].descKey}`)
    : t('Unknown');
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {weekday: 'short'});
}

const Home = () => {
  const {t} = useTranslation();
  const {user} = useContext(UserContext);
  const navigation = useNavigation();
  const [weather, setWeather] = useState(null);
  const [city, setCity] = useState('');
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [weatherError, setWeatherError] = useState(null);

  // Request location permissions (for Android)
  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      return true; // iOS permission is handled by info.plist
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message:
            'This app needs access to your location to show local weather.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  useEffect(() => {
    const getLocationAndWeather = async () => {
      try {
        const hasPermission = await requestLocationPermission();

        if (!hasPermission) {
          setWeatherError(t('HomePage.errors.weatherPermission'));
          setLoadingWeather(false);
          return;
        }

        Geolocation.getCurrentPosition(
          async position => {
            try {
              const weatherData = await getWeatherByCoords(
                position.coords.latitude,
                position.coords.longitude,
              );
              setWeather(weatherData);
              console.log(weatherData);

              const cityName = await getCityName(
                position.coords.latitude,
                position.coords.longitude,
              );
              setCity(cityName);

              setLoadingWeather(false);
            } catch (error) {
              setWeatherError(t('HomePage.errors.weatherFetch'));
              setLoadingWeather(false);
            }
          },
          error => {
            setWeatherError(
              `${t('HomePage.errors.locationError')}${error.message}`,
            );
            setLoadingWeather(false);
          },
          {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
        );
      } catch (e) {
        setWeatherError(t('HomePage.errors.weatherLocationFetch'));
        setLoadingWeather(false);
      }
    };

    getLocationAndWeather();
  }, [t]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 10 && hour <= 6) return t('HomePage.greetings.night');
    if (hour < 12) return t('HomePage.greetings.morning');
    if (hour < 17) return t('HomePage.greetings.afternoon');
    return t('HomePage.greetings.evening');
  };

  const getFirstName = name => {
    if (!name) return '';
    const firstPart = name.trim().split(' ')[0];
    return firstPart.length > 12 ? firstPart.slice(0, 12) + '…' : firstPart;
  };

  const renderFeatureCard = ({item}) => (
    <TouchableOpacity
      style={[styles.featureCard, {backgroundColor: item.color}]}
      onPress={() => navigation.navigate(item.nav)}
      activeOpacity={0.85}>
      <Image source={item.icon} style={styles.featureCardIcon} />
      <Text style={styles.featureCardText}>
        {t(`HomePage.${item.titleKey}`)}
      </Text>
    </TouchableOpacity>
  );

  const renderSchemeCard = ({ item }) => (
    <TouchableOpacity
      style={styles.schemeCard}
      onPress={() => item.link && Linking.openURL(item.link)}
      activeOpacity={0.9}>
      <Text style={styles.schemeCardTitle}>{item.name}</Text>
      <Text style={styles.schemeCardDesc}>{item.desc}</Text>
      <Text style={styles.schemeCardLink}>
        {t('HomePage.sections.learnMore')}
      </Text>
    </TouchableOpacity>
  );

  if (user) {
    return (
      <View style={theme.container}>
        <StatusBar
          translucent
          backgroundColor={'transparent'}
          barStyle="dark-content"
        />
        <View
          style={{
            position: 'absolute',
            top: -140,
            right: -140,
            width: 250,
            height: 250,
            backgroundColor: 'rgba(139, 195, 74, 0.3)',
            borderRadius : 3400
          }}>
          </View>
        <View style={[styles.header]}>
          <TouchableOpacity
            style={styles.sec1}
            onPress={() => navigation.navigate('Profile')}>
            <View
              style={{
                borderRadius: 10,
                backgroundColor: '#fff',
                alignSelf: 'flex-start',
                ...Platform.select({
                  android: {
                    elevation: 5,
                  },
                  ios: {
                    shadowColor: '#000',
                    shadowOffset: {width: 0, height: 2},
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                  },
                }),
              }}>
              {user.profilePic ? (
                <Image
                  source={{uri: user.profilePic}}
                  style={{width: 50, height: 50, borderRadius: 10, margin: 1}}
                />
              ) : (
                <Image
                  source={
                    user.gender === 'Male'
                      ? require('../assets/icons/male-farmer.png')
                      : require('../assets/icons/female-farmer.png')
                  }
                  style={{width: 45, height: 45, borderRadius: 10, margin: 5}}
                />
              )}
            </View>
            <View
              style={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                marginLeft: -5,
              }}>
              <Text
                style={{
                  fontSize: theme.fs5,
                  fontFamily: theme.font.regular,
                  color: theme.text2,
                  marginBottom: -5,
                }}>
                {getGreeting()}
              </Text>
              <Text
                style={{
                  fontSize: theme.fs2,
                  fontFamily: theme.font.bold,
                  color: theme.text,
                }}>
                {getFirstName(user.username)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.sec2}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}>
              <Image
                source={require('../assets/icons/bell.png')}
                style={{width: 24, height: 24}}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('LanguageChange')}>
              <Icon name="language" size={27} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Icon name="settings" size={27} color="black" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Scrollable content below header */}
        <ScrollView
          contentContainerStyle={{paddingBottom: 64}}
          showsVerticalScrollIndicator={false}>
          <SearchBar
            value={null}
            onChangeText={null}
            placeholder={t('HomePage.searchBar.placeholder')}
            toEdit={true}
          />
          {/* Weather Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.weatherSection}>
              {loadingWeather ? (
                <View style={styles.weatherLoading}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.weatherLoadingText}>
                    {t('HomePage.weather.fetching')}
                  </Text>
                </View>
              ) : weatherError ? (
                <Text style={styles.weatherError}>{weatherError}</Text>
              ) : weather && weather.current_weather && weather.daily ? (
                <View style={styles.weatherContent}>
                  <View style={styles.currentWeather}>
                    <View style={styles.weatherLocationContainer}>
                      <Icon name="location" size={18} color={theme.primary} />
                      <Text style={styles.cityText}>{city}</Text>
                    </View>
                    <View style={styles.weatherMainInfo}>
                      <View style={{alignItems: 'center', marginRight: 16}}>
                        <Text style={styles.tempText}>
                          {Math.round(weather.current_weather.temperature)}°C
                        </Text>
                        <View style={styles.windRow}>
                          <Text style={styles.windIcon}>🌬️</Text>
                          <Text style={styles.windText}>
                            {Math.round(weather.current_weather.windspeed)}{' '}
                            {t('HomePage.weather.windSpeed')}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.weatherIconContainer}>
                        <Text style={styles.weatherIconText}>
                          {getWeatherIcon(weather.current_weather.weathercode)}
                        </Text>
                        <Text style={styles.weatherDesc}>
                          {getWeatherDesc(
                            weather.current_weather.weathercode,
                            t,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.forecastContainer}>
                      {weather.daily.time.slice(0, 7).map((date, idx) => (
                        <View key={idx} style={styles.forecastCard}>
                          <Text style={styles.forecastDay}>
                            {formatDay(date)}
                          </Text>
                          <Text style={styles.forecastIcon}>
                            {getWeatherIcon(weather.daily.weathercode[idx])}
                          </Text>
                          <Text style={styles.forecastTemp}>
                            {Math.round(weather.daily.temperature_2m_max[idx])}
                            °/
                            {Math.round(weather.daily.temperature_2m_min[idx])}°
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}
            </View>
          </View>

          {/* Features Section */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              {t('HomePage.sections.farmServices')}
            </Text>
            <View style={styles.sectionBox}>
              <FlatList
                data={featureCards}
                renderItem={renderFeatureCard}
                keyExtractor={item => item.key}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{paddingHorizontal: 10, gap: 14}}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            {t('HomePage.sections.govSchemes')}
          </Text>
          <View style={styles.sectionBox}>
            <FlatList
              data={schemesData}
              renderItem={renderSchemeCard}
              keyExtractor={item => String(item.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingHorizontal: 10, gap: 14}}
            />
          </View>

          <View
            style={{
              width: '98%',
              backgroundColor: theme.darkBrown,
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: theme.r3,
              elevation: 2,
              marginHorizontal: '1%',
              paddingVertical: 20,
              paddingHorizontal: 15,
              gap: 20,
              marginTop: 20,
            }}>
            <Image
              source={require('../assets/icons/grow.png')}
              style={{width: 66, height: 66}}
            />
            <View
              style={{
                width: '69%',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
              <Text
                style={{
                  fontSize: theme.fs6,
                  color: 'white',
                  fontFamily: theme.font.regular,
                  textAlign: 'center',
                }}>
                {t('HomePage.suggestion.title')}
              </Text>
              <TouchableOpacity
                style={{
                  marginVertical: 10,
                  width: '100%',
                  height: 45,
                  backgroundColor: 'white',
                  borderRadius: 3,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => navigation.navigate('CropSuggestion')}>
                <Text
                  style={{
                    fontFamily: theme.font.bold,
                    color: 'black',
                    fontSize: 12,
                    marginTop: 3,
                  }}>
                  {t('HomePage.suggestion.btn')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              width: '98%',
              backgroundColor: theme.blue,
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginVertical: 20,
              borderRadius: theme.r3,
              elevation: 2,
              marginHorizontal: '1%',
              paddingVertical: 20,
            }}>
            <Text
              style={{
                fontSize: theme.fs6,
                color: theme.text,
                fontFamily: theme.font.regular,
                textAlign: 'center',
              }}>
              {t('HomePage.chatbot.needHelp')}
            </Text>
            <TouchableOpacity
              style={{
                marginVertical: 10,
                width: '88%',
                height: 45,
                backgroundColor: 'white',
                borderRadius: theme.r3,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => navigation.navigate('Chatbot')}>
              <Text
                style={{
                  fontFamily: theme.font.bold,
                  color: theme.text2,
                  fontSize: 12,
                  marginTop: 3,
                }}>
                {t('HomePage.chatbot.chatButton')}
              </Text>
            </TouchableOpacity>
          </View>
          <View
            style={{
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              width: '100%',
            }}>
            <Text
              style={{
                fontFamily: theme.font.bold,
                color: theme.darkBrown,
                fontSize: 60,
                marginTop: 100,
              }}>
              {'Krishi'}
            </Text>
            <Text
              style={{
                fontFamily: theme.font.bold,
                color: theme.text3,
                fontSize: 60,
                marginTop: -40,
              }}>
              {'Setu'}
            </Text>
            <Text
              style={{
                fontFamily: theme.font.regular,
                color: theme.text3,
                fontSize: 15,
                marginTop: -15,
              }}>
              {t('HomePage.branding.tagline')}
            </Text>
          </View>
          <View style={{height: 200}}></View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        theme.container,
        {justifyContent: 'center', alignItems: 'center'},
      ]}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={{marginTop: 16, color: theme.text2}}>
        {t('HomePage.loading.userInfo')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sec1: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  sec2: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  profileImageContainer: {
    borderRadius: 5,
    backgroundColor: '#fff',
    padding: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 5,
  },
  greetingContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  greetingText: {
    fontSize: theme.fs5,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginBottom: -2,
  },
  usernameText: {
    fontSize: theme.fs3,
    fontFamily: theme.font.bold,
    color: theme.text,
  },
  headerIcon: {
    padding: 4,
  },

  // Section container styling
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: 'gray',
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  // Weather section styling
  weatherSection: {
    backgroundColor: theme.card,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  weatherLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  weatherLoadingText: {
    color: theme.text2,
    marginTop: 8,
    fontFamily: theme.font.regular,
  },
  weatherError: {
    color: theme.primary,
    textAlign: 'center',
    padding: 16,
    fontFamily: theme.font.regular,
  },
  weatherContent: {
    padding: 12,
  },
  currentWeather: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 10,
  },
  weatherLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityText: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginLeft: 4,
  },
  weatherMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tempText: {
    fontSize: theme.fs1,
    fontFamily: theme.font.bold,
    color: theme.text,
  },
  weatherIconContainer: {
    alignItems: 'center',
  },
  weatherIconText: {
    fontSize: 36,
  },
  weatherDesc: {
    fontSize: theme.fs6,
    color: theme.text2,
    fontFamily: theme.font.regular,
    marginTop: 2,
  },
  windRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  windIcon: {
    fontSize: 18,
    marginRight: 4,
    color: '#90caf9',
  },
  windText: {
    fontSize: theme.fs7,
    color: theme.text2,
    fontFamily: theme.font.bold,
  },

  // Forecast styling
  forecastContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  forecastCard: {
    alignItems: 'center',
    width: '14%', // 7 days = ~14% width each
    padding: 4,
  },
  forecastDay: {
    fontSize: theme.fs7,
    color: theme.text2,
    fontFamily: theme.font.bold,
    marginBottom: 2,
  },
  forecastIcon: {
    fontSize: 20,
    marginVertical: 2,
  },
  forecastTemp: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text,
    marginTop: 2,
  },

  // Feature cards styling
  featureCardsList: {
    paddingVertical: 8,
    gap: 14,
    paddingHorizontal: 4,
  },
  featureCard: {
    height: 120,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 20,
    minWidth: 120,
  },
  featureCardIcon: {
    width: 42,
    height: 42,
    marginBottom: 10,
  },
  featureCardText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
  },

  // Scheme cards styling
  schemeCardsList: {
    paddingVertical: 8,
    gap: 12,
    paddingHorizontal: 4,
  },
  schemeCard: {
    width: 190,
    backgroundColor: theme.card,
    borderRadius: theme.r3,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  schemeCardTitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.primary,
    marginBottom: 4,
  },
  schemeCardDesc: {
    fontSize: theme.fs7,
    color: theme.text2,
    marginBottom: 8,
    fontFamily: theme.font.regular,
  },
  schemeCardLink: {
    fontSize: theme.fs7,
    color: theme.link,
    fontFamily: theme.font.bold,
  },
});

export default Home;
