import React from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {message} from './data';
import {httpUrl} from './marketData';
import {Icon, Notice, Text} from './ui';

export function openLink(value) {
  const url =
    httpUrl(value) || (/^tel:\+?[\d(). -]+$/.test(value || '') ? value : '');
  if (url) {
    Linking.openURL(url).catch(() => {});
  }
}

export function Pair({children}) {
  const {width, fontScale} = useWindowDimensions();
  const inline = width >= 360 && fontScale < 1.4;
  return (
    <View style={[styles.pair, inline && styles.inline]}>
      {React.Children.toArray(children).map(child => (
        <View key={child.key} style={inline && styles.flex}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function FarmContext({farm, go}) {
  const {t} = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => go(farm ? 'FarmMonitoring' : 'FarmSetup')}
      style={({pressed}) => [styles.farmContext, pressed && styles.pressed]}>
      <Icon name="map-pin" size={20} color={theme.paddy} />
      <View style={styles.flex}>
        <Text variant="label">
          {farm?.name || t('refined.farm.add', {defaultValue: 'Add your farm'})}
        </Text>
        <Text variant="caption">
          {[farm?.crop, farm?.place].filter(Boolean).join(' · ') ||
            t('refined.farm.reuse', {
              defaultValue: 'Reuse crop and location in every task',
            })}
        </Text>
      </View>
      <Icon name="chevron-right" size={20} color={theme.paddy} />
    </Pressable>
  );
}

export function Progress({action, label}) {
  const {t} = useTranslation();
  if (action.pending) {
    return (
      <Notice
        title={label || t('refined.loading', {defaultValue: 'Loading…'})}
      />
    );
  }
  return action.error ? (
    <Notice
      title={t('refined.requestUnavailable', {
        defaultValue: 'Could not complete the request',
      })}
      tone="error">
      {message(action.error)}
    </Notice>
  ) : null;
}

export function Validation({text}) {
  return text ? (
    <Text variant="small" tone="error" accessibilityLiveRegion="polite">
      {text}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  pair: {gap: 12},
  inline: {flexDirection: 'row', alignItems: 'flex-start'},
  flex: {flex: 1, minWidth: 0},
  farmContext: {
    backgroundColor: theme.recessed,
    borderRadius: theme.r3,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  pressed: {opacity: 0.75},
});
