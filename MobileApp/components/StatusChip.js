import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {theme} from '../theme.config';

const TONES = {
  OPEN: {bg: theme.paddySoft, fg: theme.paddy, label: 'Open'},
  ACCEPTED: {bg: theme.monsoonSoft, fg: theme.monsoon, label: 'Accepted'},
  DONE: {bg: theme.recessed, fg: theme.inkSoft, label: 'Done'},
  CANCELED: {bg: theme.alertSoft, fg: theme.alert, label: 'Canceled'},
};

const StatusChip = ({status}) => {
  const tone = TONES[status] || TONES.OPEN;
  return (
    <View style={[styles.chip, {backgroundColor: tone.bg}]}>
      <Text style={[styles.label, {color: tone.fg}]}>{tone.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    fontFamily: theme.font.semi,
    fontSize: 13,
  },
});

export default StatusChip;
