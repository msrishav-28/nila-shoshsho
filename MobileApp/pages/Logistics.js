import React, {useContext, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import Toast from 'react-native-toast-message';
import {theme} from '../theme.config';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import StatusChip from '../components/StatusChip';
import {UserContext} from '../context/UserContext';
import {accountFetch} from '../utils/api';

const Logistics = () => {
  const {t} = useTranslation();
  const {user} = useContext(UserContext);
  const isLogistics = user?.role === 'Logistics';
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [crop, setCrop] = useState('');
  const [quantityKg, setQuantityKg] = useState('');
  const [pickupCity, setPickupCity] = useState(user?.location?.city || '');
  const [pickupState, setPickupState] = useState(user?.location?.state || '');

  const load = async () => {
    setLoading(true);
    try {
      const res = await accountFetch('/logistics/jobs');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || t('logistics.error'));
      }
      setJobs(data.jobs || []);
    } catch (err) {
      Toast.show({type: 'error', text1: err.message});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createJob = async () => {
    const qty = Number(quantityKg);
    if (!crop.trim() || !Number.isFinite(qty) || qty <= 0) {
      Toast.show({type: 'error', text1: t('logistics.invalid')});
      return;
    }
    setSaving(true);
    try {
      const res = await accountFetch('/logistics/jobs', {
        method: 'POST',
        body: JSON.stringify({
          crop: crop.trim(),
          quantityKg: qty,
          pickupCity: pickupCity.trim(),
          pickupState: pickupState.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('logistics.error'));
      }
      setCrop('');
      setQuantityKg('');
      setJobs(prev => [data.job, ...prev]);
    } catch (err) {
      Toast.show({type: 'error', text1: err.message});
    } finally {
      setSaving(false);
    }
  };

  const act = async (path, method = 'PUT') => {
    try {
      const res = await accountFetch(path, {method});
      const data = await res.json();
      if (res.status === 403) {
        Toast.show({type: 'error', text1: t('logistics.forbidden')});
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || t('logistics.error'));
      }
      if (data.job) {
        setJobs(prev => prev.map(job => (job.id === data.job.id ? data.job : job)));
      } else {
        load();
      }
    } catch (err) {
      Toast.show({type: 'error', text1: err.message});
    }
  };

  return (
    <View style={theme.container}>
      <Header text={t('logistics.header')} />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {!isLogistics ? (
          <View style={styles.form}>
            <Text style={styles.section}>{t('logistics.create')}</Text>
            <TextInput
              style={styles.input}
              value={crop}
              onChangeText={setCrop}
              placeholder={t('logistics.crop')}
              placeholderTextColor={theme.inkFaint}
            />
            <TextInput
              style={styles.input}
              value={quantityKg}
              onChangeText={setQuantityKg}
              placeholder={t('logistics.quantity')}
              placeholderTextColor={theme.inkFaint}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={pickupCity}
              onChangeText={setPickupCity}
              placeholder={t('logistics.city')}
              placeholderTextColor={theme.inkFaint}
            />
            <TextInput
              style={styles.input}
              value={pickupState}
              onChangeText={setPickupState}
              placeholder={t('logistics.state')}
              placeholderTextColor={theme.inkFaint}
            />
            <TouchableOpacity style={styles.primary} onPress={createJob} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={theme.inkInverse} />
              ) : (
                <Text style={styles.primaryText}>{t('logistics.post')}</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.section}>{t('logistics.partnerCopy')}</Text>
        )}

        {loading ? <ActivityIndicator color={theme.paddy} /> : null}
        {!loading && jobs.length === 0 ? (
          <EmptyState
            icon="bus-outline"
            title={t('logistics.emptyTitle')}
            body={
              isLogistics ? t('logistics.emptyPartner') : t('logistics.emptyFarmer')
            }
          />
        ) : null}

        {jobs.map(job => (
          <View key={job.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.crop}>{job.crop}</Text>
              <StatusChip status={job.status} />
            </View>
            <Text style={styles.meta}>
              {job.quantityKg} kg
              {job.pickupCity || job.pickupState
                ? ` · ${[job.pickupCity, job.pickupState].filter(Boolean).join(', ')}`
                : ''}
            </Text>
            <View style={styles.actions}>
              {!isLogistics && job.status === 'OPEN' ? (
                <TouchableOpacity
                  style={styles.ghost}
                  onPress={() => act(`/logistics/jobs/${job.id}/cancel`)}>
                  <Text style={styles.ghostDanger}>{t('logistics.cancel')}</Text>
                </TouchableOpacity>
              ) : null}
              {isLogistics && job.status === 'OPEN' ? (
                <TouchableOpacity
                  style={styles.primarySmall}
                  onPress={() => act(`/logistics/jobs/${job.id}/accept`)}>
                  <Text style={styles.primaryText}>{t('logistics.accept')}</Text>
                </TouchableOpacity>
              ) : null}
              {isLogistics && job.status === 'ACCEPTED' ? (
                <TouchableOpacity
                  style={styles.primarySmall}
                  onPress={() => act(`/logistics/jobs/${job.id}/done`)}>
                  <Text style={styles.primaryText}>{t('logistics.done')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {paddingBottom: 40},
  section: {...theme.type.callout, marginBottom: 12, marginTop: 8},
  form: {marginBottom: 24},
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.hairline,
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    color: theme.ink,
    fontFamily: theme.font.regular,
    fontSize: 17,
  },
  primary: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: theme.paddy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primarySmall: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: theme.paddy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {...theme.type.button},
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  crop: {...theme.type.titleSm, flex: 1},
  meta: {...theme.type.meta},
  actions: {flexDirection: 'row', gap: 8, marginTop: 12},
  ghost: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.alert,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostDanger: {...theme.type.callout, color: theme.alert},
});

export default Logistics;
