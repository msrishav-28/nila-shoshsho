import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';

const StaggeredView = ({ 
  children, 
  style, 
  index = 0, 
  staggerDelay = 100,
  animationType = 'slideUp', // 'slideUp', 'slideLeft', 'scale', 'fade'
  duration = 600,
}) => {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(animationType === 'slideLeft' ? -50 : 0);
  const translateY = useSharedValue(animationType === 'slideUp' ? 50 : 0);
  const scale = useSharedValue(animationType === 'scale' ? 0.8 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  useEffect(() => {
    const delay = index * staggerDelay;
    
    const timer = setTimeout(() => {
      opacity.value = withTiming(1, { duration });
      
      if (animationType === 'slideLeft') {
        translateX.value = withSpring(0, {
          damping: 12,
          stiffness: 100,
        });
      }
      
      if (animationType === 'slideUp') {
        translateY.value = withSpring(0, {
          damping: 12,
          stiffness: 100,
        });
      }
      
      if (animationType === 'scale') {
        scale.value = withSpring(1, {
          damping: 12,
          stiffness: 100,
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [index, staggerDelay, animationType, duration]);

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default StaggeredView;
