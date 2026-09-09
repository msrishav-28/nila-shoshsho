import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {theme} from '../theme.config';

const EmptyState = ({icon = 'leaf-outline', title, body, actionLabel, onAction}) => {
  return (
    <View style={styles.wrap}>
      <View style={styles.glyph}>
        <Icon name={icon} size={36} color={theme.paddy} />
      </View>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 48,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  glyph: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.paddySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...theme.type.titleSm,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    ...theme.type.body,
    color: theme.inkSoft,
    textAlign: 'center',
    maxWidth: 320,
  },
  button: {
    marginTop: 20,
    minHeight: 52,
    minWidth: 160,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: theme.paddy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...theme.type.button,
  },
});

export default EmptyState;
