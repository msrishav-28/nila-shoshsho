import { useContext, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme.config';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import { accountFetch } from '../utils/api';
import { UserContext } from '../context/UserContext';

const Notifications = () => {
  const { t } = useTranslation();
  const { user } = useContext(UserContext);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const lat = user?.location?.lat;
  const lon = user?.location?.lon;
  const hasPlace = lat && lon && Number(lat) !== 0 && Number(lon) !== 0;

  const load = async () => {
    setError('');
    try {
      const res = await accountFetch('/notifications');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Could not load alerts');
      }
      setItems(data.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      setLoading(true);
      if (hasPlace) {
        try {
          await accountFetch('/notifications/weather-check', { method: 'POST' });
        } catch (err) {
          // List still loads; missing weather is shown as empty or older rows.
        }
      }
      await load();
    };
    boot();
  }, [hasPlace]);

  const markRead = async id => {
    await accountFetch(`/notifications/${id}/read`, { method: 'PUT' });
    setItems(prev => prev.map(item => item.notification_id === id ? { ...item, is_read: true } : item));
  };

  return (
    <View style={theme.container}>
      <Header text={t('notifications.header')} />
      {loading ? <ActivityIndicator color={theme.primary} /> : null}
      {error ? <Text style={styles.copy}>{error}</Text> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title={t('notifications.emptyTitle')}
          body={t('notifications.emptyBody')}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.notification_id)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => markRead(item.notification_id)}>
              <View style={styles.row}>
                {!item.is_read ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
                <View style={{flex: 1}}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.copy}>{item.body}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs5,
    color: theme.text,
    marginBottom: 8,
  },
  copy: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs6,
    color: theme.text2,
    lineHeight: 22,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: 16,
    marginBottom: 10,
  },
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 10},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.paddy,
    marginTop: 6,
  },
  dotSpacer: {width: 8, height: 8, marginTop: 6},
});
