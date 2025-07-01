import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import Header from '../components/Header';
import { theme } from '../theme.config';
import { AIBACKEND_URL } from '../backendConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import VoicePlayer from '../components/VoicePlayer';

const API_URL = `${AIBACKEND_URL}/plant-disease`;

const HealthBar = ({ status, t }) => {
  const healthLevels = {
    healthy: { percent: 100, color: '#4caf50' },
    'mildly affected': { percent: 65, color: '#ffc107' },
    'severely affected': { percent: 30, color: '#ff9800' },
    dead: { percent: 0, color: '#f44336' },
  };

  const health = healthLevels[status.toLowerCase()] || {
    percent: 50,
    color: '#9e9e9e',
  };

  const getTranslatedStatus = (status) => {
    const statusMap = {
      healthy: t('cropCare.health.statuses.healthy'),
      'mildly affected': t('cropCare.health.statuses.mildlyAffected'),
      'severely affected': t('cropCare.health.statuses.severelyAffected'),
      dead: t('cropCare.health.statuses.dead'),
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <View style={styles.healthBarContainer}>
      <View style={[styles.healthBar, { backgroundColor: '#e0e0e0' }]}>
        <View
          style={[
            styles.healthBarFill,
            { width: `${health.percent}%`, backgroundColor: health.color },
          ]}
        />
      </View>
      <Text style={styles.healthStatus}>{getTranslatedStatus(status)}</Text>
    </View>
  );
};

const Cropcare = () => {
  const { t, i18n } = useTranslation();
  const [image, setImage] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('en'); // Default to 'en'

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguageValue'); // Use appLanguageValue for language code
      if (storedLang) {
        setLang(storedLang);
        i18n.changeLanguage(storedLang); // Sync with i18next
      }
    };
    loadLanguage();
  }, [i18n]);

  const pickImage = async () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.7,
          includeBase64: false,
        },
        async response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            setError(
              t('cropCare.errors.imagePicker', {
                message: response.errorMessage,
              }),
            );
            return;
          }
          if (response.assets && response.assets.length > 0) {
            setImage(response.assets[0]);
            setDiagnosis(null);
            setError(null);
            await uploadImage(response.assets[0]);
          }
        },
      );
    } catch (err) {
      setError(t('cropCare.errors.failedImagePicker'));
      console.error('Image picker error:', err);
    }
  };

  const takePhoto = async () => {
    try {
      launchCamera(
        {
          mediaTypeetten: 'photo',
          quality: 0.7,
          includeBase64: false,
          saveToPhotos: true,
        },
        async response => {
          if (response.didCancel) return;
          if (response.errorCode) {
            setError(
              t('cropCare.errors.camera', { message: response.errorMessage }),
            );
            return;
          }
          if (response.assets && response.assets.length > 0) {
            setImage(response.assets[0]);
            setDiagnosis(null);
            setError(null);
            await uploadImage(response.assets[0]);
          }
        },
      );
    } catch (err) {
      setError(t('cropCare.errors.failedCamera'));
      console.error('Camera error:', err);
    }
  };

  const uploadImage = async img => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: Platform.OS === 'ios' ? img.uri.replace('file://', '') : img.uri,
        name: img.fileName || 'photo.jpg',
        type: img.type || 'image/jpeg',
      });
      formData.append('lang', i18n.language || lang); // Use i18n.language

      console.log('Uploading image:', img.uri);
      console.log(formData);

      const res = await axios.post(API_URL, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Accept: 'application/json',
        },
        timeout: 30000,
      });

      if (res.data && res.data.disease) {
        setDiagnosis(res.data);
      } else {
        setError(t('cropCare.errors.invalidResponse'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
        setError(
          t('cropCare.errors.serverError', {
            status: err.response.status,
            message: err.response.data?.error || '',
          }),
        );
      } else if (err.request) {
        setError(t('cropCare.errors.noResponse'));
      } else {
        setError(t('cropCare.errors.requestError', { message: err.message }));
      }
    } finally {
      setLoading(false);
    }
  };

  // Create a summary text for VoicePlayer
  const getDiagnosisText = () => {
    if (!diagnosis) return '';
    const parts = [];
    if (diagnosis.disease) parts.push(`Disease: ${diagnosis.disease}`);
    if (diagnosis.plant) parts.push(`Plant: ${diagnosis.plant}`);
    if (diagnosis.type_of_disease)
      parts.push(`Type of disease: ${diagnosis.type_of_disease}`);
    if (diagnosis.plant_health)
      parts.push(`Plant health: ${diagnosis.plant_health}`);
    if (diagnosis.leaf_health)
      parts.push(`Leaf health: ${diagnosis.leaf_health}`);
    if (diagnosis.disease_symptoms && diagnosis.disease_symptoms.length > 0)
      parts.push(`Symptoms: ${diagnosis.disease_symptoms.join(', ')}`);
    if (diagnosis.treatment_procedure)
      parts.push(`Treatment: ${diagnosis.treatment_procedure}`);
    return parts.join('. ');
  };

  return (
    <View style={[theme.container]}>
      <Header text={t('cropCare.header')} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={{
            width: '100%',
            flexDirection: 'column',
            gap: 5,
            marginBottom: 20,
            borderWidth: 0.9,
            borderColor: '#f0f0f0',
            borderRadius: 10,
          }}>
          <Image
            source={require('../assets/images/cropcare.jpg')}
            style={{
              width: '100%',
              height: 120,
              objectFit: 'cover',
              borderRadius: 10,
            }}
          />
        </View>
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.uploadBtn]}
            onPress={pickImage}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {image ? t('cropCare.changeImage') : t('cropCare.uploadImage')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraBtn]}
            onPress={takePhoto}
            disabled={loading}>
            <Text style={styles.buttonText}>{t('cropCare.takePhoto')}</Text>
          </TouchableOpacity>
        </View>
        {image && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: image.uri }}
              style={styles.preview}
              resizeMode="contain"
            />
          </View>
        )}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2e7d32" />
            <Text style={styles.loadingText}>{t('cropCare.analyzing')}</Text>
          </View>
        )}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {diagnosis && (
          <View style={styles.resultContainer}>
            {/* VoicePlayer with diagnosis summary */}
            <VoicePlayer text={getDiagnosisText()} lang={i18n.language || lang} />
            <View style={styles.diagnosisHeader}>
              <Text style={styles.diseaseName}>
                {diagnosis.disease || t('cropCare.noDisease')}
              </Text>
              {diagnosis.treatment_required && (
                <View style={styles.treatmentBadge}>
                  <Text style={styles.treatmentBadgeText}>
                    {t('cropCare.treatment.required')}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.infoSection}>
              <Text>Plant:</Text>
              <Text style={styles.plantName}>
                {diagnosis.plant || t('cropCare.unknownPlant')}
              </Text>
              {diagnosis.type_of_disease && (
                <Text style={styles.diseaseType}>
                  {t('cropCare.treatment.type', {
                    type: diagnosis.type_of_disease,
                  })}
                </Text>
              )}
            </View>
            <View style={styles.healthSection}>
              {diagnosis.plant_health && (
                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>
                    {t('cropCare.health.plantHealth')}
                  </Text>
                  <View style={styles.healthBarWrapper}>
                    <HealthBar status={diagnosis.plant_health} t={t} />
                  </View>
                </View>
              )}
              {diagnosis.leaf_health && (
                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>
                    {t('cropCare.health.leafHealth')}
                  </Text>
                  <View style={styles.healthBarWrapper}>
                    <HealthBar status={diagnosis.leaf_health} t={t} />
                  </View>
                </View>
              )}
            </View>
            {diagnosis.disease_symptoms &&
              diagnosis.disease_symptoms.length > 0 && (
                <View style={styles.symptomsSection}>
                  <Text style={styles.sectionTitle}>{t('cropCare.symptoms')}</Text>
                  {diagnosis.disease_symptoms.map((symptom, idx) => (
                    <View key={idx} style={styles.symptomItem}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.symptomText}>{symptom}</Text>
                    </View>
                  ))}
                </View>
              )}
            {diagnosis.treatment_procedure && (
              <View style={styles.treatmentSection}>
                <Text style={styles.sectionTitle}>
                  {t('cropCare.treatment.procedure')}
                </Text>
                <Markdown style={markdownStyles}>
                  {diagnosis.treatment_procedure}
                </Markdown>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 10,
    paddingBottom: 40,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtn: {
    backgroundColor: theme.primary,
    marginRight: 8,
    borderRadius: 5,
  },
  cameraBtn: {
    backgroundColor: theme.secondary,
    marginLeft: 8,
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: theme.font.bold,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  preview: {
    width: '100%',
    height: 240,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 12,
    color: '#555',
    fontSize: 13,
    fontFamily: theme.font.regular,
  },
  errorBox: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 13,
    fontFamily: theme.font.regular,
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 0,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  diagnosisHeader: {
    backgroundColor: '#f1f8e9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  diseaseName: {
    fontSize: 17,
    color: '#2e7d32',
    flex: 1,
    fontFamily: theme.font.bold,
  },
  treatmentBadge: {
    backgroundColor: '#fff8e1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffecb3',
  },
  treatmentBadgeText: {
    color: '#ff6f00',
    fontSize: 12,
    fontFamily: theme.font.regular,
  },
  infoSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  plantName: {
    fontSize: 16,
    color: '#424242',
    marginBottom: 4,
    fontFamily: theme.font.bold,
  },
  diseaseType: {
    fontSize: 14,
    color: '#7b1fa2',
    fontFamily: theme.font.regular,
  },
  healthSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  healthRow: {
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 13,
    color: 'red',
    marginBottom: 4,
    fontFamily: theme.font.regular,
  },
  healthBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
  },
  healthStatus: {
    marginLeft: 10,
    fontSize: 13,
    color: theme.secondary,
    width: 120,
  },
  symptomsSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 15,
    color: '#424242',
    marginBottom: 10,
    fontFamily: theme.font.bold,
  },
  symptomItem: {
    flexDirection: 'row',
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    marginRight: 8,
    fontSize: 13,
    color: '#2e7d32',
    fontFamily: theme.font.regular,
  },
  symptomText: {
    flex: 1,
    fontSize: 13,
    color: '#424242',
    fontFamily: theme.font.regular,
  },
  treatmentSection: {
    padding: 16,
  },
});

const markdownStyles = {
  body: { color: '#424242', fontSize: 14, fontFamily: theme.font.regular },
  strong: { fontFamily: theme.font.bold },
  h3: {
    fontSize: 17,
    marginTop: 12,
    color: '#2e7d32',
    fontFamily: theme.font.bold,
  },
  h4: {
    fontSize: 16,
    marginTop: 10,
    fontFamily: theme.font.bold,
    color: '#388e3c',
  },
  li: { marginBottom: 6, fontFamily: theme.font.bold },
  bullet_list: { marginTop: 8, marginBottom: 8, fontFamily: theme.font.bold },
};

export default Cropcare;