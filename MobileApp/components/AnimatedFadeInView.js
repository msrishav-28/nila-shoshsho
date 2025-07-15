import React, { useEffect } from 'react';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate 
} from 'react-native-reanimated';

const AnimatedFadeInView = ({ 
  children, 
  style, 
  duration = 600, 
  delay = 0,
  animationType = 'fade' // 'fade', 'slideUp', 'slideDown', 'scale'
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(animationType.includes('slide') ? 50 : 0);
  const scale = useSharedValue(animationType === 'scale' ? 0.8 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { 
          translateY: animationType === 'slideDown' 
            ? -translateY.value 
            : translateY.value 
        },
        { scale: scale.value }
      ],
    };
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (animationType === 'scale') {
        opacity.value = withTiming(1, { duration });
        scale.value = withSpring(1, {
          damping: 12,
          stiffness: 100,
        });
      } else {
        opacity.value = withTiming(1, { duration });
        translateY.value = withTiming(0, { duration });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [duration, delay, animationType]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default AnimatedFadeInView;
