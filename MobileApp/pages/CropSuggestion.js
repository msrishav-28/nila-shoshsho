import React, { useContext, useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import { theme } from '../theme.config';
import { AIBACKEND_URL } from '../backendConfig';
import { UserContext } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

const API_URL = `${AIBACKEND_URL}/crop_suggestion`;
const CALENDAR_API_URL = `${AIBACKEND_URL}/crop_calendar`;

const CropSuggestion = () => {
  const { t } = useTranslation();
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [city, setCity] = useState(user.location?.city || '');
  const [state, setState] = useState(user.location?.state || '');
  const [landAcres, setLandAcres] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState();
  const [selectedTab, setSelectedTab] = useState('suggest');
  const [cropName, setCropName] = useState('');
  const [calendarData, setCalendarData] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [loadingCrop, setLoadingCrop] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      setLang(storedLang);
    };
    loadLanguage();
  }, []);

  const location = {
    lat: user?.location?.lat || 0,
    lon: user?.location?.lon || 0,
  };

  const handleSubmit = async () => {
    if (!city.trim() || !state.trim() || !landAcres.trim()) {
      Toast.show({
        type: 'error',
        text1: t('cropSuggestion.errors.invalidInput'),
        text2: t('cropSuggestion.errors.fillAllFields'),
      });
      return;
    }

    if (isNaN(landAcres) || parseFloat(landAcres) <= 0) {
      Toast.show({
        type: 'error',
        text1: t('cropSuggestion.errors.invalidInput'),
        text2: t('cropSuggestion.errors.landAcresInvalid'),
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponseData(null);

    try {
      const payload = {
        latitude: location.lat,
        longitude: location.lon,
        region: `${city.trim()}, ${state.trim()}`,
        land_acres: parseFloat(landAcres),
        lang,
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.recommendations && data.recommendations.length > 0) {
        setResponseData(data);
        Toast.show({
          type: 'success',
          text1: t('cropSuggestion.success.recommendationsGenerated'),
          text2: t('cropSuggestion.success.recommendationsGenerated'),
        });
      } else {
        setError(t('cropSuggestion.errors.noRecommendations'));
        Toast.show({
          type: 'error',
          text1: t('cropSuggestion.errors.invalidInput'),
          text2: t('cropSuggestion.errors.noRecommendations'),
        });
      }
    } catch (err) {
      const errorMessage = err?.message || t('cropSuggestion.errors.anErrorOccurred');
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: t('cropSuggestion.errors.invalidInput'),
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalendarRequest = async (crop) => {
    setCalendarLoading(true);
    setLoadingCrop(crop);
    setCalendarError(null);
    setCalendarData(null);
    setCropName(crop);

    try {
      const payload = {
        crop,
        region: `${city.trim()}, ${state.trim()}`,
        latitude: location.lat,
        longitude: location.lon,
        lang,
      };

      const res = await fetch(CALENDAR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.calendar && data.calendar.length > 0) {
        setCalendarData(data);
        setSelectedTab('calendar');
        Toast.show({
          type: 'success',
          text1: t('cropSuggestion.success.calendarGenerated'),
          text2: t('cropSuggestion.success.calendarGenerated'),
        });
      } else {
        setCalendarError(t('cropSuggestion.errors.noCalendarData'));
        Toast.show({
          type: 'error',
          text1: t('cropSuggestion.errors.invalidInput'),
          text2: t('cropSuggestion.errors.noCalendarData'),
        });
      }
    } catch (err) {
      const errorMessage = err?.message || t('cropSuggestion.errors.anErrorOccurred');
      setCalendarError(errorMessage);
      Toast.show({
        type: 'error',
        text1: t('cropSuggestion.errors.invalidInput'),
        text2: errorMessage,
      });
    } finally {
      setCalendarLoading(false);
      setLoadingCrop(null);
    }
  };

  const handleDirectCalendarSubmit = async () => {
    if (!cropName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('cropSuggestion.errors.invalidInput'),
        text2: t('cropSuggestion.errors.enterCropName'),
      });
      return;
    }
    await handleCalendarRequest(cropName);
  };

  const renderWeatherItem = () => (
    <View style={styles.weatherCard}>
      <Text style={styles.weatherDate}>{t('cropSuggestion.results.weatherPlaceholder')}</Text>
      <Text style={styles.weatherText}>{t('cropSuggestion.results.noWeatherData')}</Text>
    </View>
  );

  const renderRecommendationTable = () => {
    const headers = [
      t('cropSuggestion.results.table.crop'),
      t('cropSuggestion.results.table.totalYield'),
      t('cropSuggestion.results.table.yieldPerAcre'),
      t('cropSuggestion.results.table.risk'),
    ];
    const rows = responseData.recommendations.map((item) => [
      item.crop,
      `${item.estimated_total_yield_kg} kg`,
      `${item.expected_yield_per_acre_kg} kg`,
      `${item.risk_percent}%`,
      item.crop,
    ]);

    return (
      <View style={styles.tableContainer}>
        <View style={styles.tableRow}>
          {headers.map((header, index) => (
            <View key={index} style={styles.tableHeaderCell}>
              <Text style={styles.tableHeaderText}>{header}</Text>
            </View>
          ))}
        </View>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex}>
            <View style={styles.tableRow}>
              {row.slice(0, 4).map((cell, cellIndex) => (
                <View key={cellIndex} style={styles.tableCell}>
                  {cellIndex === 0 && (
                    <Icon
                      name={getCropIcon(cell)}
                      size={18}
                      color={theme.primary}
                      style={styles.cellIcon}
                    />
                  )}
                  <Text style={styles.tableCellText}>{cell}</Text>
                </View>
              ))}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.calendarButton, calendarLoading && loadingCrop === row[4] && styles.buttonDisabled]}
                onPress={() => handleCalendarRequest(row[4])}
                disabled={calendarLoading && loadingCrop === row[4]}
              >
                <Text style={styles.calendarButtonText}>
                  {calendarLoading && loadingCrop === row[4]
                    ? t('cropSuggestion.button.loading')
                    : t('cropSuggestion.button.generateCalendar')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const getCropIcon = (crop) => {
    const cropIconMap = {
      Bajra: 'leaf-outline',
      Jowar: 'leaf-outline',
      Moong: 'nutrition-outline',
      Urad: 'nutrition-outline',
    };
    return cropIconMap[crop] || 'leaf-outline';
  };

  const renderReason = () => (
    <View style={styles.textSection}>
      <View style={styles.sectionHeader}>
        <Icon
          name="information-circle-outline"
          size={20}
          color={theme.primary}
          style={styles.sectionIcon}
        />
        <Text style={styles.sectionSubtitle}>{t('cropSuggestion.results.reason')}</Text>
      </View>
      <Text style={styles.sectionText}>{responseData.reason}</Text>
    </View>
  );

  const renderRegionSeason = () => (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Icon name="location-outline" size={18} color={theme.primary} />
        <Text style={styles.infoText}>
          {t('cropSuggestion.results.region')}: {responseData.region}
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Icon name="calendar-outline" size={18} color={theme.primary} />
        <Text style={styles.infoText}>
          {t('cropSuggestion.results.season')}: {responseData.season}
        </Text>
      </View>
    </View>
  );

  const renderCalendar = () => {
    if (!calendarData) return null;

    return (
      <View style={styles.resultContainer}>
        <Text style={styles.sectionTitle}>
          {t('cropSuggestion.results.calendarFor', { crop: cropName })}
        </Text>
        <Text style={styles.sectionText}>
          {t('cropSuggestion.results.duration')}: {calendarData.duration_weeks} {t('cropSuggestion.results.weeks')}
        </Text>
        <Text style={styles.sectionText}>
          {t('cropSuggestion.results.weatherSummary')}: {calendarData.weather_summary}
        </Text>
        <FlatList
          data={calendarData.calendar}
          keyExtractor={(item) => `week-${item.week}`}
          renderItem={({ item }) => (
            <View style={styles.weekCard}>
              <Text style={styles.weekTitle}>
                {t('cropSuggestion.results.week')} {item.week}
              </Text>
              {item.tasks.map((task, index) => (
                <View key={index} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{task.task_title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                  <Text style={styles.taskDuration}>
                    {t('cropSuggestion.results.duration')}: {task.duration}
                  </Text>
                </View>
              ))}
            </View>
          )}
        />
      </View>
    );
  };

  const renderSuggestTab = () => (
    <>
      <Text style={styles.description}>{t('cropSuggestion.description')}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={t('cropSuggestion.inputs.city')}
          placeholderTextColor={theme.text3}
          value={city}
          onChangeText={setCity}
          numberOfLines={1}
          multiline={false}
        />
        <TextInput
          style={styles.input}
          placeholder={t('cropSuggestion.inputs.state')}
          placeholderTextColor={theme.text3}
          value={state}
          onChangeText={setState}
          numberOfLines={1}
          multiline={false}
        />
      </View>
      <TextInput
        style={styles.input}
        placeholder={t('cropSuggestion.inputs.landAcres')}
        placeholderTextColor={theme.text3}
        value={landAcres}
        onChangeText={setLandAcres}
        keyboardType="numeric"
        numberOfLines={1}
        ellipsizeMode='tail'
      />
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? t('cropSuggestion.button.loading') : t('cropSuggestion.button.getRecommendations')}
        </Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {responseData && (
        <View style={styles.resultContainer}>
          <Text style={styles.sectionTitle}>{t('cropSuggestion.results.cropRecommendations')}</Text>
          {renderReason()}
          <Text style={styles.sectionTitle}>{t('cropSuggestion.results.recommendations')}</Text>
          {renderRecommendationTable()}
          <Text style={styles.sectionTitle}>{t('cropSuggestion.results.regionSeason')}</Text>
          {renderRegionSeason()}
          <Text style={styles.sectionTitle}>{t('cropSuggestion.results.weatherConditions')}</Text>
          {renderWeatherItem()}
        </View>
      )}
    </>
  );

  const renderCalendarTab = () => (
    <>
      <Text style={styles.description}>{t('cropSuggestion.calendarDescription')}</Text>
      <TextInput
        style={styles.input}
        placeholder={t('cropSuggestion.inputs.cropName')}
        placeholderTextColor={theme.text3}
        value={cropName}
        onChangeText={setCropName}
        numberOfLines={1}
        multiline={false}
      />
      <TouchableOpacity
        style={[styles.button, calendarLoading && styles.buttonDisabled]}
        onPress={handleDirectCalendarSubmit}
        disabled={calendarLoading}
      >
        <Text style={styles.buttonText}>
          {calendarLoading ? t('cropSuggestion.button.loading') : t('cropSuggestion.button.generateCalendar')}
        </Text>
      </TouchableOpacity>
      {calendarError && <Text style={styles.errorText}>{calendarError}</Text>}
      {renderCalendar()}
    </>
  );

  return (
    <View style={theme.container}>
      <Header text={t('cropSuggestion.header')} />
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'suggest' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('suggest')}
        >
          <Text style={[styles.tabText, selectedTab === 'suggest' && styles.tabTextActive]}>
            {t('cropSuggestion.tabs.suggest')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, selectedTab === 'calendar' && styles.tabButtonActive]}
          onPress={() => setSelectedTab('calendar')}
        >
          <Text style={[styles.tabText, selectedTab === 'calendar' && styles.tabTextActive]}>
            {t('cropSuggestion.tabs.calendar')}
          </Text>
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {selectedTab === 'suggest' ? renderSuggestTab() : renderCalendarTab()}
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
    width: '49%',
    paddingTop: 15,
    overflow: 'hidden',
  },
  inputRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 16,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text2,
    marginTop: 12,
  },
  sectionSubtitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 8,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginLeft: 8,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 8,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  weatherDate: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 8,
  },
  weatherText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
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
    paddingVertical: 8,
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    alignItems: 'center',
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableHeaderText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.bold,
    color: theme.text,
    textAlign: 'center',
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  tableCellText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    textAlign: 'center',
  },
  cellIcon: {
    marginRight: 4,
  },
  calendarButton: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarButtonText: {
    color: '#fff',
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: theme.primary,
  },
  tabText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
  },
  tabTextActive: {
    color: theme.primary,
    fontFamily: theme.font.bold,
  },
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 8,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  weekTitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 8,
  },
  taskCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 5,
    padding: 10,
    marginVertical: 4,
  },
  taskTitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
  },
  taskDescription: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginVertical: 4,
  },
  taskDuration: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text3,
  },
});

export default CropSuggestion;