import {View, Text, StyleSheet} from 'react-native';
import React from 'react';
import {theme} from '../theme.config';

const TINT = {
  success: theme.paddySoft,
  error: theme.alertSoft,
  info: theme.monsoonSoft,
};

const CustomToast = ({text1, text2, type}) => (
  <View style={[styles.container, {backgroundColor: TINT[type] || theme.paddySoft}]}>
    <Text style={styles.text1}>{text1}</Text>
    {text2 ? <Text style={styles.text2}>{text2}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '92%',
    padding: 16,
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  text1: {
    fontFamily: theme.font.bold,
    fontSize: 15,
    color: theme.ink,
  },
  text2: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.inkSoft,
    marginTop: 4,
  },
});

export default CustomToast;
