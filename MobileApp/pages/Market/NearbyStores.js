import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import {theme} from '../../theme.config';
import {adviceFetch} from '../../utils/api';
import {UserContext} from '../../context/UserContext';
import EmptyState from '../../components/EmptyState';

const NearbyStores = () => {
  const {user} = useContext(UserContext);
  const [stores, setStores] = useState([]);
  const [mandis, setMandis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [source, setSource] = useState('');

  const load = async (lat, lon) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
      });
      const state = user?.location?.state;
      if (state) {
        params.append('state', state);
      }
      const res = await adviceFetch(`/stores/nearby?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Stores are unavailable');
      }
      setStores(data.stores || []);
      setMandis(data.mandis || []);
      setSource(
        [data.storeSource, data.mandiSource].filter(Boolean).join(' · '),
      );
    } catch (err) {
      setError(err.message || 'Stores are unavailable');
      setStores([]);
      setMandis([]);
      setSource('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      const profileLat = Number(user?.location?.lat);
      const profileLon = Number(user?.location?.lon);
      if (profileLat && profileLon) {
        await load(profileLat, profileLon);
        return;
      }
      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError('Location is needed for nearby stores');
            setLoading(false);
            return;
          }
        }
        Geolocation.getCurrentPosition(
          pos => load(pos.coords.latitude, pos.coords.longitude),
          () => {
            setError('Location is needed for nearby stores');
            setLoading(false);
          },
          {enableHighAccuracy: true, timeout: 12000},
        );
      } catch {
        setError('Location is needed for nearby stores');
        setLoading(false);
      }
    };
    run();
  }, [user?.location?.lat, user?.location?.lon, user?.location?.state]);

  const openMaps = item => {
    if (item.mapsUrl) {
      Linking.openURL(item.mapsUrl);
    }
  };
  const call = item => {
    if (item.telUrl) {
      Linking.openURL(item.telUrl);
    }
  };

  const renderStore = ({item}) => {
    const open = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.storeCard}
        onPress={() => setExpandedId(open ? null : item.id)}
        activeOpacity={0.9}>
        <View style={styles.storeBasicInfo}>
          <View style={styles.storeIconContainer}>
            <Icon name="store" size={28} color={theme.paddy} />
          </View>
          <View style={styles.storeDetails}>
            <Text style={styles.storeName}>{item.name}</Text>
            <Text style={styles.storeType}>{item.type}</Text>
            <Text style={styles.metricText}>{item.address}</Text>
          </View>
        </View>
        {open ? (
          <View style={styles.expandedContent}>
            {item.phone ? (
              <Text style={styles.expandedText}>{item.phone}</Text>
            ) : null}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton} onPress={() => call(item)}>
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.directionButton]}
                onPress={() => openMaps(item)}>
                <Text style={styles.actionButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.paddy} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={stores}
        keyExtractor={item => String(item.id)}
        renderItem={renderStore}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          source ? <Text style={styles.meta}>{source}</Text> : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title={error ? 'Stores unavailable' : 'No farm shops mapped here'}
            body={
              error ||
              'Live OpenStreetMap shops only. Mandis still list below if AGMARKNET returned rows.'
            }
          />
        }
        ListFooterComponent={
          mandis.length ? (
            <View style={styles.mandiBlock}>
              <Text style={styles.section}>Mandis (AGMARKNET)</Text>
              {mandis.map((row, idx) => (
                <View key={`${row.name}-${idx}`} style={styles.mandiCard}>
                  <Text style={styles.storeName}>{row.name}</Text>
                  <Text style={styles.metricText}>
                    {[row.district, row.commodity].filter(Boolean).join(' · ')}
                  </Text>
                  {row.modal_price ? (
                    <Text style={styles.price}>
                      {row.modal_price} {row.unit || 'Rs/quintal'}
                    </Text>
                  ) : null}
                  <Text style={styles.meta}>
                    {row.source}
                    {row.asOf ? ` · ${row.asOf}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </View>
  );
};

export default NearbyStores;

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.canvas},
  list: {padding: 20, paddingBottom: 40},
  meta: {...theme.type.meta, marginBottom: 12},
  storeCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow1,
  },
  storeBasicInfo: {flexDirection: 'row', alignItems: 'center'},
  storeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.paddySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  storeDetails: {flex: 1},
  storeName: {...theme.type.bodyStrong},
  storeType: {...theme.type.meta, marginTop: 2},
  metricText: {...theme.type.meta, marginTop: 2},
  price: {...theme.type.callout, marginTop: 4, fontVariant: ['tabular-nums']},
  expandedContent: {marginTop: 12},
  expandedText: {...theme.type.body, marginBottom: 8},
  actionButtons: {flexDirection: 'row', gap: 8},
  actionButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    backgroundColor: theme.paddy,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionButton: {backgroundColor: theme.monsoon},
  actionButtonText: {...theme.type.button},
  section: {...theme.type.callout, marginTop: 8, marginBottom: 8},
  mandiBlock: {marginTop: 8},
  mandiCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    marginBottom: 10,
  },
});
