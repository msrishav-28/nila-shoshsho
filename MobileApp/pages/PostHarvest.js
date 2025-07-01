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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import { theme } from '../theme.config';
import { AIBACKEND_URL } from '../backendConfig';
import { UserContext } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import VoicePlayer from '../components/VoicePlayer';

const API_URL = `${AIBACKEND_URL}/postharvest`;

const PostHarvest = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [crop, setCrop] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [region, setRegion] = useState(user.location.state);
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [lang, setLang] = useState('English');
  const [voiceText , setVoiceText] = useState('');

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      console.log("storedLang:", storedLang);
      setLang(storedLang);
    };
    loadLanguage();
  }, []);

  const latitude = user?.location?.lat || 0;
  const longitude = user?.location?.lon || 0;

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleDateConfirm = (date) => {
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    setHarvestDate(formattedDate);
    hideDatePicker();
  };

  const handleSubmit = async () => {
    if (!crop.trim() || !harvestDate || !region.trim()) {
      Toast.show({
        type: 'error',
        text1: t('postHarvest.results.error'),
        text2: t('postHarvest.results.noInstructions'),
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponseData(null);
    try {
      const payload = {
        crop,
        harvest_date: harvestDate,
        region,
        latitude,
        longitude,
        lang,
      };
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.beginning_text && data.plan && data.weather) {
        setResponseData(data);
        const planText = data.plan.map(item => 
          `${item.action} on ${item.date} for ${item.duration}`
        ).join(', ');
        setVoiceText(`${data.beginning_text} Now talking about plan: ${planText}`);
        Toast.show({
          type: 'success',
          text1: t('postHarvest.results.success'),
          text2: t('postHarvest.results.successMessage'),
        });
      } else {
        setError(t('postHarvest.results.noInstructions'));
        Toast.show({
          type: 'error',
          text1: t('postHarvest.results.error'),
          text2: t('postHarvest.results.noInstructions'),
        });
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.message || t('postHarvest.results.errorOccurred');
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: t('postHarvest.results.error'),
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'drying':
        return 'sunny-outline';
      case 'grading and cleaning':
        return 'filter-outline';
      case 'storage preparation':
        return 'cube-outline';
      case 'packaging':
        return 'briefcase-outline';
      case 'transport to market':
        return 'car-outline';
      default:
        return 'leaf-outline';
    }
  };

  const renderPlanItem = ({ item }) => (
    <View style={styles.planCard}>
      <Icon name={getActionIcon(item.action)} size={24} color={theme.primary} style={styles.planIcon} />
      <View style={styles.planDetails}>
        <Text style={styles.planAction}>{item.action}</Text>
        <Text style={styles.planDate}>
          <Icon name="calendar-outline" size={16} color={theme.text2} /> {item.date}
        </Text>
        <Text style={styles.planDuration}>
          <Icon name="time-outline" size={16} color={theme.text2} /> {item.duration}
        </Text>
      </View>
    </View>
  );

  const renderWeatherItem = ({ item, index }) => (
    <View style={styles.weatherCard}>
      <Text style={styles.weatherDate}>{item}</Text>
      <View style={styles.weatherRow}>
        <Icon name="thermometer-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather.temp_min[index]}{t('postHarvest.weather.temperature')} - {responseData.weather.temp_max[index]}{t('postHarvest.weather.temperature')}
        </Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="water-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>
          {responseData.weather.humidity_min[index]}{t('postHarvest.weather.humidity')} - {responseData.weather.humidity_max[index]}{t('postHarvest.weather.humidity')}
        </Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="rainy-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>{responseData.weather.precipitation[index]} {t('postHarvest.weather.precipitation')}</Text>
      </View>
      <View style={styles.weatherRow}>
        <Icon name="speedometer-outline" size={18} color={theme.primary} />
        <Text style={styles.weatherText}>{responseData.weather.wind_speed_max[index]} {t('postHarvest.weather.windSpeed')}</Text>
      </View>
    </View>
  );

  return (
    <View style={theme.container}>
      <Header text={t('postHarvest.title')} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.description}>
            {t('postHarvest.description')}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t('postHarvest.fields.crop')}
            placeholderTextColor={theme.text3}
            value={crop}
            onChangeText={setCrop}
          />
          <TouchableOpacity
            style={styles.input}
            onPress={showDatePicker}
            disabled={loading}
          >
            <View style={styles.dateInputRow}>
              <Icon name="calendar-outline" size={20} color={theme.text3} style={styles.dateIcon} />
              <Text style={[styles.dateText, !harvestDate && styles.placeholderText]}>
                {harvestDate || t('postHarvest.fields.harvestDate')}
              </Text>
            </View>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={hideDatePicker}
            textColor={theme.text}
            headerTextIOS="Pick a date"
            confirmTextIOS="Confirm"
            cancelTextIOS="Cancel"
            confirmTextStyle={{
              color: theme.primary,
              fontSize: theme.fs6,
              fontFamily: theme.font.bold,
            }}
            cancelTextStyle={{
              color: theme.text2,
              fontSize: theme.fs6,
              fontFamily: theme.font.regular,
            }}
            accentColor={theme.primary}
            buttonTextColorIOS={theme.primary}
          />
          <TextInput
            style={styles.input}
            placeholder={t('postHarvest.fields.region')}
            placeholderTextColor={theme.text3}
            value={region}
            onChangeText={setRegion}
            editable={false}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('postHarvest.buttons.loading') : t('postHarvest.buttons.getInstructions')}
            </Text>
          </TouchableOpacity>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {responseData && (
            <View style={styles.resultContainer}>
              <VoicePlayer text={voiceText} lang={lang} />
              <View style={styles.textSection}>
                <Text style={styles.sectionText}>{responseData.beginning_text}</Text>
              </View>

              <Text style={styles.sectionTitle}>{t('postHarvest.sections.postHarvestPlan')}</Text>
              <FlatList
                data={responseData.plan}
                renderItem={renderPlanItem}
                keyExtractor={(item, index) => index.toString()}
                style={styles.planList}
              />

              <Text style={styles.sectionTitle}>{t('postHarvest.sections.weatherForecast')}</Text>
              <FlatList
                data={responseData.weather.dates}
                renderItem={renderWeatherItem}
                keyExtractor={(item) => item}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.weatherList}
              />

              <View style={styles.textSection}>
                <Text style={styles.sectionText}>{responseData.conclusion_text}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'column',
    backgroundColor: '#fff',
    gap: 7,
    marginBottom: -10,
  },
  backButton: {
    padding: 10,
    backgroundColor: theme.darkBrown,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
    width: 50,
  },
  appName: {
    fontSize: theme.fs0,
    fontFamily: theme.font.dark,
    color: theme.text2,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingHorizontal: 14,
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
    borderRadius: 5,
    padding: 14,
    marginVertical: 10,
    fontSize: theme.fs6,
    backgroundColor: '#fff',
    color: theme.text,
    fontFamily: theme.font.regular,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: theme.fs6,
    color: theme.text,
    fontFamily: theme.font.regular,
  },
  placeholderText: {
    color: theme.text3,
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
  sectionText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
  },
  sectionTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text2,
    marginVertical: 12,
  },
  planList: {
    marginVertical: 8,
  },
  planCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 6,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignItems: 'center',
  },
  planIcon: {
    marginRight: 12,
  },
  planDetails: {
    flex: 1,
  },
  planAction: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 4,
  },
  planDate: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginBottom: 2,
  },
  planDuration: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
  },
  weatherList: {
    marginVertical: 8,
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: 12,
    marginRight: 12,
    borderColor: theme.border,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
});

export default PostHarvest;