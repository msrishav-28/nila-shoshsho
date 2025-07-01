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
import VoicePlayer from '../components/VoicePlayer';

const API_URL = `${AIBACKEND_URL}/water_management`;

const WaterManagement = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [crop, setCrop] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [irrigationMethod, setIrrigationMethod] = useState('');
  const [soilType] = useState('dry'); // Fixed as per request
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('English');
  const [voiceText, setVoiceText] = useState('');

  const irrigationMethods = [
    { name: 'Drip', icon: 'water-outline' },
    { name: 'Sprinkler', icon: 'rainy-outline' },
    { name: 'Surface', icon: 'earth-outline' },
    { name: 'Subsurface', icon: 'layers-outline' },
    { name: 'Manual', icon: 'hand-right-outline' },
  ];

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      setLang(storedLang || 'English');
    };
    loadLanguage();
  }, []);

  const latitude = user?.location?.lat || 0;
  const longitude = user?.location?.lon || 0;

  const handleSubmit = async () => {
    if (!crop.trim() || !fieldSize || !irrigationMethod) {
      Toast.show({
        type: 'error',
        text1: t('waterManagement.results.error'),
        text2: t('waterManagement.results.noInstructions'),
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponseData(null);
    try {
      const payload = {
        crop,
        field_size_acres: parseFloat(fieldSize),
        irrigation_method: irrigationMethod,
        soil_type: soilType,
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
      if (data.explanation && data.irrigation_schedule && data.water_saving_tips) {
        setResponseData(data);
        const scheduleText = data.irrigation_schedule.map(item => 
          `${item.method} irrigation on ${item.date} for ${item.duration_minutes} minutes`
        ).join(', ');
        setVoiceText(`${data.explanation} Irrigation schedule: ${scheduleText}`);
        Toast.show({
          type: 'success',
          text1: t('waterManagement.results.success'),
          text2: t('waterManagement.results.successMessage'),
        });
      } else {
        setError(t('waterManagement.results.noInstructions'));
        Toast.show({
          type: 'error',
          text1: t('waterManagement.results.error'),
          text2: t('waterManagement.results.noInstructions'),
        });
      }
    } catch (err) {
      const errorMessage = typeof err === 'string' ? err : err?.message || t('waterManagement.results.errorOccurred');
      setError(errorMessage);
      Toast.show({
        type: 'error',
        text1: t('waterManagement.results.error'),
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getScheduleIcon = (method) => {
    switch (method.toLowerCase()) {
      case 'drip':
        return 'water-outline';
      case 'sprinkler':
        return 'rainy-outline';
      case 'surface':
        return 'earth-outline';
      case 'subsurface':
        return 'layers-outline';
      case 'manual':
        return 'hand-right-outline';
      default:
        return 'water-outline';
    }
  };

  const renderIrrigationMethod = ({ item }) => (
    <TouchableOpacity
      style={[styles.methodCard, irrigationMethod === item.name && styles.methodCardSelected]}
      onPress={() => setIrrigationMethod(item.name)}
    >
      <Icon name={item.icon} size={24} color={irrigationMethod === item.name ? '#fff' : theme.primary} />
      <Text style={[styles.methodText, irrigationMethod === item.name && styles.methodTextSelected]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderScheduleItem = ({ item }) => (
    <View style={styles.scheduleCard}>
      <Icon name={getScheduleIcon(item.method)} size={24} color={theme.primary} style={styles.scheduleIcon} />
      <View style={styles.scheduleDetails}>
        <Text style={styles.scheduleMethod}>{item.method}</Text>
        <Text style={styles.scheduleDate}>
          <Icon name="calendar-outline" size={16} color={theme.text2} /> {item.date}
        </Text>
        <Text style={styles.scheduleDuration}>
          <Icon name="time-outline" size={16} color={theme.text2} /> {item.duration_minutes} min
        </Text>
        <Text style={styles.scheduleWater}>
          <Icon name="water-outline" size={16} color={theme.text2} /> {item.water_mm} mm
        </Text>
      </View>
    </View>
  );

  const renderTipItem = ({ item }) => (
    <View style={styles.tipCard}>
      <Icon name="bulb-outline" size={24} color={theme.primary} style={styles.tipIcon} />
      <View style={styles.tipDetails}>
        <Text style={styles.tipText}>{item.tip}</Text>
        <Text style={styles.tipBenefit}>{item.benefit}</Text>
      </View>
    </View>
  );

  return (
    <View style={theme.container}>
      <Header text={t('waterManagement.title')} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.description}>
            {t('waterManagement.description')}
          </Text>

          <TextInput
            style={styles.input}
            placeholder={t('waterManagement.fields.crop')}
            placeholderTextColor={theme.text3}
            value={crop}
            onChangeText={setCrop}
          />
          <TextInput
            style={styles.input}
            placeholder={t('waterManagement.fields.fieldSize')}
            placeholderTextColor={theme.text3}
            value={fieldSize}
            onChangeText={setFieldSize}
            keyboardType="numeric"
          />
          <Text style={styles.sectionTitle}>{t('waterManagement.fields.irrigationMethod')}</Text>
          <FlatList
            data={irrigationMethods}
            renderItem={renderIrrigationMethod}
            keyExtractor={(item) => item.name}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.methodList}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('waterManagement.buttons.loading') : t('waterManagement.buttons.getPlan')}
            </Text>
          </TouchableOpacity>
          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
          {responseData && (
            <View style={styles.resultContainer}>
              <VoicePlayer text={voiceText} lang={lang} />
              <View style={styles.textSection}>
                <Text style={styles.sectionText}>{responseData.explanation}</Text>
                <Text style={styles.sectionText}>
                  {t('waterManagement.results.totalWater')}: {responseData.total_water_liters} L ({responseData.total_water_mm} mm)
                </Text>
              </View>

              <Text style={styles.sectionTitle}>{t('waterManagement.sections.irrigationSchedule')}</Text>
              <FlatList
                data={responseData.irrigation_schedule}
                renderItem={renderScheduleItem}
                keyExtractor={(item, index) => index.toString()}
                style={styles.scheduleList}
              />

              <Text style={styles.sectionTitle}>{t('waterManagement.sections.waterSavingTips')}</Text>
              <FlatList
                data={responseData.water_saving_tips}
                renderItem={renderTipItem}
                keyExtractor={(item, index) => index.toString()}
                style={styles.tipList}
              />
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
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text2,
    marginVertical: 12,
  },
  methodList: {
    marginVertical: 8,
  },
  methodCard: {
    alignItems: 'center',
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
    width: 100,
  },
  methodCardSelected: {
    backgroundColor: theme.primary,
  },
  methodText: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginTop: 4,
  },
  methodTextSelected: {
    color: '#fff',
  },
  scheduleList: {
    marginVertical: 8,
  },
  scheduleCard: {
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
  scheduleIcon: {
    marginRight: 12,
  },
  scheduleDetails: {
    flex: 1,
  },
  scheduleMethod: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 4,
  },
  scheduleDate: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginBottom: 2,
  },
  scheduleDuration: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
    marginBottom: 2,
  },
  scheduleWater: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
  },
  tipList: {
    marginVertical: 8,
  },
  tipCard: {
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
  tipIcon: {
    marginRight: 12,
  },
  tipDetails: {
    flex: 1,
  },
  tipText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginBottom: 4,
  },
  tipBenefit: {
    fontSize: theme.fs7,
    fontFamily: theme.font.regular,
    color: theme.text2,
  },
});

export default WaterManagement;