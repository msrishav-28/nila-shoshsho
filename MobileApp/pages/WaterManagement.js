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
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import { theme } from '../theme.config';
import { adviceFetch } from '../utils/api';
import { UserContext } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import VoicePlayer from '../components/VoicePlayer';

const API_PATH = '/water_management';

const WaterManagement = () => {
  const { user } = useContext(UserContext);
  const { t } = useTranslation();
  const [crop, setCrop] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [irrigationMethod, setIrrigationMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('English');

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
        latitude,
        longitude,
        lang,
      };
      const res = await adviceFetch(API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.advice) {
        const message = data.error || t('waterManagement.results.noInstructions');
        setError(message);
        Toast.show({
          type: 'error',
          text1: t('waterManagement.results.error'),
          text2: message,
        });
        return;
      }
      setResponseData(data);
      Toast.show({
        type: 'success',
        text1: t('waterManagement.results.success'),
        text2: t('waterManagement.results.successMessage'),
      });
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
          <Text style={styles.description}>{t('waterManagement.disclaimer')}</Text>

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
              <VoicePlayer text={responseData.advice} lang={lang} />
              <View style={styles.textSection}>
                <Text style={styles.sectionText}>{responseData.advice}</Text>
                <Text style={styles.sectionText}>{t('waterManagement.disclaimer')}</Text>
                {responseData.source ? (
                  <Text style={styles.sectionText}>{responseData.source}</Text>
                ) : null}
              </View>
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
});

export default WaterManagement;