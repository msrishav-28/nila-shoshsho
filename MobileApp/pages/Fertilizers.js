import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import {theme} from '../theme.config';
import {AIBACKEND_URL} from '../backendConfig';
import {UserContext} from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';

const API_URL = `${AIBACKEND_URL}/api/fertilizer_recommendation`;

const Fertilizers = () => {
  const {t} = useTranslation();
  const {user} = useContext(UserContext);
  const navigation = useNavigation();
  const [crop, setCrop] = useState('');

  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState();

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      setLang(storedLang);
    };
    loadLanguage();
  }, []);

  const location = {
    city: user?.location?.city || '',
    country: user?.location?.country || '',
    lat: user?.location?.lat || 0,
    lon: user?.location?.lon || 0,
    region: user?.location?.state || '',
  };

  const handleSubmit = async () => {
    if (!crop.trim()) {
      Toast.show({
        type: 'error',
        text1: t('fertilizer.errors.invalidInput'),
        text2: t('fertilizer.errors.fillAllFields'),
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      const payload = {
        crop: crop.trim(),
        lat: user.location?.lat || 0,
        lon: user.location?.lon || 0,
        lang: lang,
        region: user.location?.city + ' ' + user.location?.state || 'Pune',
      };

      console.log(payload);

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log(data);
      if (data.status === 'success' && data.recommendation) {
        setResponseData(data);
        Toast.show({
          type: 'success',
          text1: t('fertilizer.success.recommendationsGenerated'),
          text2: t('fertilizer.success.recommendationsGenerated'),
        });
      } else {
        setError(t('fertilizer.errors.noRecommendations'));
        Toast.show({
          type: 'error',
          text1: t('fertilizer.errors.invalidInput'),
          text2: t('fertilizer.errors.noRecommendations'),
        });
      }
    } catch (err) {
      const errorMessage =
        err?.message || t('fertilizer.errors.anErrorOccurred');
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: t('fertilizer.errors.invalidInput'),
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const renderWeatherItem = () => (
    <View style={styles.weatherCard}>
      <Text style={styles.weatherDate}>
        {t('fertilizer.results.currentWeather')}
      </Text>
      <View style={styles.weatherRow}>
        <Icon name="thermometer-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather_data.temperature}°C
        </Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="water-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather_data.humidity}%
        </Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="rainy-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather_data.precipitation} mm
        </Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="speedometer-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather_data.windspeed} km/h
        </Text>
      </View>
    </View>
  );

  const renderSummaryTable = () => {
    const tableRegex = /\|.*\|.*\|.*\|.*\|/g;
    const tableRows = responseData.recommendation.match(tableRegex) || [];
    const headers = tableRows[0]
      ?.split('|')
      .map(h => h.trim())
      .filter(h => h);
    const rows = tableRows.slice(2).map(row =>
      row
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell),
    );

    if (!headers || !rows.length) return null;

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableRow}>
          {headers.map((header, index) => (
            <Text key={index} style={[styles.tableCell, styles.tableHeader]}>
              {header}
            </Text>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {row.map((cell, cellIndex) => (
              <Text key={cellIndex} style={styles.tableCell}>
                {cell}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderRecommendationWithIcons = () => {
    const summaryTableIndex =
      responseData.recommendation.indexOf('**Summary Table**');
    const recommendationText =
      summaryTableIndex !== -1
        ? responseData.recommendation.slice(0, summaryTableIndex).trim()
        : responseData.recommendation;

    const sections = recommendationText.split('\n\n');
    return sections.map((section, index) => {
      const titleMatch = section.match(/\*\*(.*?)\*\*/);
      const title = titleMatch ? titleMatch[1] : '';
      const content = section.replace(/\*\*(.*?)\*\*/, '').trim();
      let iconName = 'leaf-outline';

      // Map section titles to their translated versions for icon selection
      const sectionTitleMap = {
        [t('fertilizer.sections.soilAnalysis').toLowerCase()]: 'flask-outline',
        [t('fertilizer.sections.recommendedFertilizer').toLowerCase()]:
          'nutrition-outline',
        [t('fertilizer.sections.applicationRates').toLowerCase()]:
          'scale-outline',
        [t('fertilizer.sections.timingMethod').toLowerCase()]:
          'calendar-outline',
        [t('fertilizer.sections.localContext').toLowerCase()]: 'cash-outline',
        [t('fertilizer.sections.environmentalSafety').toLowerCase()]:
          'warning-outline',
        [t('fertilizer.sections.additionalAmendments').toLowerCase()]:
          'construct-outline',
        [t('fertilizer.sections.expectedOutcomes').toLowerCase()]:
          'trending-up-outline',
      };

      // Try to find a match in the section title map
      Object.entries(sectionTitleMap).forEach(([key, value]) => {
        if (title.toLowerCase().includes(key)) {
          iconName = value;
        }
      });

      return (
        <View key={index} style={styles.recommendationSection}>
          {title && (
            <View style={styles.sectionHeader}>
              <Icon
                name={iconName}
                size={20}
                color={theme.primary}
                style={styles.sectionIcon}
              />
              <Text style={styles.sectionSubtitle}>{title}</Text>
            </View>
          )}
          <Text style={styles.sectionText}>{content}</Text>
        </View>
      );
    });
  };

  return (
    <View style={theme.container}>
      <Header text={t('fertilizer.header')} />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.description}>{t('fertilizer.description')}</Text>
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <TextInput
              style={styles.input}
              placeholder={t('fertilizer.inputs.cropName')}
              placeholderTextColor={theme.text3}
              value={crop}
              onChangeText={setCrop}
              numberOfLines={1}
              multiline={false}
            />
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading
                ? t('fertilizer.button.loading')
                : t('fertilizer.button.getRecommendations')}
            </Text>
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {responseData && (
            <View style={styles.resultContainer}>
              <Text style={styles.sectionTitle}>
                {t('fertilizer.results.fertilizerRecommendations')}
              </Text>
              <View style={styles.textSection}>
                {renderRecommendationWithIcons()}
              </View>

              <Text style={styles.sectionTitle}>
                {t('fertilizer.results.weatherConditions')}
              </Text>
              {renderWeatherItem()}
              <Text style={styles.sectionTitle}>
                {t('fertilizer.results.summaryTable')}
              </Text>
              {renderSummaryTable()}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 10,
  },
  description: {
    fontSize: theme.fs7,
    fontFamily: theme.font.light,
    color: theme.text2,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
    padding: 10,
    marginVertical: 3,
    fontSize: theme.fs6,
    backgroundColor: '#fff',
    color: theme.text,
    fontFamily: theme.font.regular,
    width: '100%',
    paddingTop: 15,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
  },
  errorText: {
    color: '#c62828',
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    marginVertical: 12,
    textAlign: 'center',
  },
  resultContainer: {
    marginBottom: 24,
  },
  textSection: {
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    padding: 16,
    marginVertical: 12,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationSection: {
    marginBottom: 12,
    marginTop: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginTop: -15,
  },
  sectionTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text2,
  },
  sectionSubtitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    width: '80%',
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 8,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    width: 180,
  },
  weatherDate: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  weatherText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginLeft: 8,
  },
  tableContainer: {
    marginVertical: 12,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingVertical: 10,
  },
  tableHeader: {
    fontFamily: theme.font.bold,
    color: theme.text,
  },
  tableCell: {
    flex: 1,
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
});

export default Fertilizers;
