import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '../theme.config';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const AnimatedButton = ({ 
  children, 
  onPress, 
  style, 
  textStyle,
  variant = 'primary', // 'primary', 'secondary', 'outline'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  ...props 
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const getButtonStyle = () => {
    const baseStyle = {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.r2,
      marginVertical: theme.width * 0.01,
    };

    // Size variations
    const sizeStyles = {
      small: {
        paddingVertical: theme.width * 0.025,
        paddingHorizontal: theme.width * 0.06,
      },
      medium: {
        paddingVertical: theme.width * 0.035,
        paddingHorizontal: theme.width * 0.08,
      },
      large: {
        paddingVertical: theme.width * 0.045,
        paddingHorizontal: theme.width * 0.1,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: disabled ? theme.text3 : theme.primary,
      },
      secondary: {
        backgroundColor: disabled ? theme.text3 : theme.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: disabled ? theme.text3 : theme.primary,
      },
    };

    return [baseStyle, sizeStyles[size], variantStyles[variant]];
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontFamily: theme.font.regular,
      textAlign: 'center',
    };

    const sizeTextStyles = {
      small: { fontSize: theme.fs6 },
      medium: { fontSize: theme.fs4 },
      large: { fontSize: theme.fs3 },
    };

    const variantTextStyles = {
      primary: {
        color: disabled ? theme.card : theme.textInverse,
        fontFamily: theme.font.bold,
      },
      secondary: {
        color: disabled ? theme.card : theme.textInverse,
        fontFamily: theme.font.bold,
      },
      outline: {
        color: disabled ? theme.text3 : theme.primary,
        fontFamily: theme.font.regular,
      },
    };

    return [baseTextStyle, sizeTextStyles[size], variantTextStyles[variant]];
  };

  return (
    <AnimatedTouchableOpacity
      style={[getButtonStyle(), animatedStyle, style]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text style={[getTextStyle(), textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </AnimatedTouchableOpacity>
  );
};

export default AnimatedButton;
