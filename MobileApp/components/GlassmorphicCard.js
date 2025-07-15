import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { theme } from '../theme.config';

const GlassmorphicCard = ({ children, style, blurType = 'light', blurAmount = 10 }) => {
  return (
    <View style={[styles.container, style]}>
      <BlurView
        style={styles.blurView}
        blurType={Platform.OS === 'ios' ? blurType : 'dark'}
        blurAmount={blurAmount}
        reducedTransparencyFallbackColor={theme.card}
      />
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.r2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // Shadow for depth
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: theme.width * 0.04,
    zIndex: 1,
  },
});

export default GlassmorphicCard;
