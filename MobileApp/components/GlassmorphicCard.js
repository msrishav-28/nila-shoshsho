import React from 'react';
import {View, StyleSheet} from 'react-native';
import {theme} from '../theme.config';

const GlassmorphicCard = ({children, style}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.hairline,
    backgroundColor: theme.surface,
    ...theme.shadow1,
  },
  content: {
    padding: 16,
  },
});

export default GlassmorphicCard;
