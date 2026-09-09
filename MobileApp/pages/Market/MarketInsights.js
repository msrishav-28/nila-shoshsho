import React, {useContext, useState} from 'react';
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
import {theme} from '../../theme.config';
import {adviceFetch} from '../../utils/api';
import {adviceLang} from '../../utils/lang';
import {UserContext} from '../../context/UserContext';
import EmptyState from '../../components/EmptyState';
import VoicePlayer from '../../components/VoicePlayer';

const MarketInsights = () => {
  const {user} = useContext(UserContext);
  const {t, i18n} = useTranslation();
  const [crop, setCrop] = useState('');
  const [stateName, setStateName] = useState(user?.location?.state || '');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!crop.trim() || !stateName.trim()) {
      setError(t('marketInsights.needFields'));
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await adviceFetch('/market/insights', {
        method: 'POST',
        body: JSON.stringify({
          crop: crop.trim(),
          state: stateName.trim(),
          lang: adviceLang(i18n.language),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('marketInsights.unavailable'));
        return;
      }
      setResult(data);
    } catch (err) {
      setError(t('marketInsights.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body}>
      <Text style={styles.title}>{t('marketInsights.title')}</Text>
      <TextInput
        style={styles.input}
        value={crop}
        onChangeText={setCrop}
        placeholder={t('marketInsights.crop')}
        placeholderTextColor={theme.inkFaint}
      />
      <TextInput
        style={styles.input}
        value={stateName}
        onChangeText={setStateName}
        placeholder={t('marketInsights.state')}
        placeholderTextColor={theme.inkFaint}
      />
      <TouchableOpacity style={styles.btn} onPress={run} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={theme.inkInverse} />
        ) : (
          <Text style={styles.btnText}>{t('marketInsights.submit')}</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!result && !error && !loading ? (
        <EmptyState
          icon="trending-up-outline"
          title={t('marketInsights.emptyTitle')}
          body={t('marketInsights.emptyBody')}
        />
      ) : null}
      {result?.insight ? (
        <View style={styles.card}>
          <Text style={styles.meta}>{t('marketInsights.liveComment')}</Text>
          <VoicePlayer text={result.insight} lang={i18n.language} />
          <Text style={styles.bodyText}>{result.insight}</Text>
          {result.source ? (
            <Text style={styles.meta}>
              {result.source}{result.asOf ? ` · ${result.asOf}` : ''}
            </Text>
          ) : null}
        </View>
      ) : null}
      {(result?.records || []).map((row, i) => (
        <Text key={i} style={styles.meta}>
          {row.market} {row.modal_price} Rs/quintal
          {row.asOf || row.arrival_date
            ? ` · ${row.asOf || row.arrival_date}`
            : ''}
        </Text>
      ))}
    </ScrollView>
  );
};

export default MarketInsights;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.canvas},
  body: {padding: 20, paddingBottom: 40},
  title: {...theme.type.titleSm, marginBottom: 12},
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
  btn: {
    minHeight: 52,
    backgroundColor: theme.paddy,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  btnText: {...theme.type.button},
  error: {color: theme.alert, marginBottom: 12, fontFamily: theme.font.regular},
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    ...theme.shadow1,
  },
  bodyText: {...theme.type.body, marginTop: 8},
  meta: {...theme.type.meta, marginTop: 8},
});
