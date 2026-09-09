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
import {theme} from '../../theme.config';
import {adviceFetch} from '../../utils/api';
import {UserContext} from '../../context/UserContext';
import EmptyState from '../../components/EmptyState';
import {useTranslation} from 'react-i18next';

const PriceComparison = () => {
  const {t} = useTranslation();
  const {user} = useContext(UserContext);
  const [commodity, setCommodity] = useState('');
  const [stateA, setStateA] = useState(user?.location?.state || '');
  const [stateB, setStateB] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!commodity.trim() || !stateA.trim() || !stateB.trim()) {
      setError(t('marketCompare.needFields'));
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({
        commodity: commodity.trim(),
        state_a: stateA.trim(),
        state_b: stateB.trim(),
      });
      const res = await adviceFetch('/api/market-compare?' + params.toString());
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('marketCompare.unavailable'));
        return;
      }
      setResult(data);
    } catch (err) {
      setError(t('marketCompare.unavailable'));
    } finally {
      setLoading(false);
    }
  };

  const side = (key, label) => {
    const records = result?.[key]?.records || [];
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{label}</Text>
        {records.length === 0 ? (
          <Text style={styles.meta}>{t('marketCompare.emptyPair')}</Text>
        ) : (
          records.map((row, i) => (
            <View key={`${key}-${i}`} style={styles.row}>
              <Text style={styles.market}>{row.market}</Text>
              <Text style={styles.price}>
                {row.modal_price} {row.unit || 'Rs/quintal'}
              </Text>
              <Text style={styles.meta}>
                {row.source || result.source}
                {row.asOf ? ` · ${row.asOf}` : ''}
              </Text>
            </View>
          ))
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.body}>
      <Text style={styles.title}>{t('marketCompare.title')}</Text>
      <TextInput
        style={styles.input}
        value={commodity}
        onChangeText={setCommodity}
        placeholder={t('marketCompare.crop')}
        placeholderTextColor={theme.inkFaint}
      />
      <TextInput
        style={styles.input}
        value={stateA}
        onChangeText={setStateA}
        placeholder={t('marketCompare.stateA')}
        placeholderTextColor={theme.inkFaint}
      />
      <TextInput
        style={styles.input}
        value={stateB}
        onChangeText={setStateB}
        placeholder={t('marketCompare.stateB')}
        placeholderTextColor={theme.inkFaint}
      />
      <TouchableOpacity style={styles.btn} onPress={run} disabled={loading}>
        {loading ? (
          <ActivityIndicator color={theme.inkInverse} />
        ) : (
          <Text style={styles.btnText}>{t('marketCompare.submit')}</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!result && !error && !loading ? (
        <EmptyState
          icon="swap-horizontal-outline"
          title={t('marketCompare.emptyTitle')}
          body={t('marketCompare.emptyBody')}
        />
      ) : null}
      {result ? (
        <>
          <Text style={styles.meta}>{result.source}</Text>
          {side('state_a', result.state_a?.state || stateA)}
          {side('state_b', result.state_b?.state || stateB)}
        </>
      ) : null}
    </ScrollView>
  );
};

export default PriceComparison;

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
  meta: {...theme.type.meta, marginBottom: 8},
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    marginTop: 12,
    ...theme.shadow1,
  },
  cardTitle: {...theme.type.callout, marginBottom: 8},
  row: {marginBottom: 10},
  market: {...theme.type.bodyStrong},
  price: {...theme.type.callout, fontVariant: ['tabular-nums']},
});
