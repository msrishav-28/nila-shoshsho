import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, StyleSheet, TouchableOpacity, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Audio} from 'expo-av';
import Toast from 'react-native-toast-message';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {adviceFetch} from '../utils/api';

const VoiceSeed = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {i18n} = useTranslation();
  const recordingRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const pulse = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (listening && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1.12, {duration: 1200}), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [listening, reduceMotion, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{scale: pulse.value}],
    opacity: listening ? 1 : 0.35,
  }));

  const stopAndSend = async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setListening(false);
    if (!rec) {
      return;
    }
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        return;
      }
      const form = new FormData();
      form.append('audio', {uri, name: 'speech.wav', type: 'audio/wav'});
      form.append('lang', i18n.language || 'en');
      const res = await adviceFetch('/voice/stt', {method: 'POST', body: form});
      const data = await res.json();
      if (!res.ok) {
        Toast.show({type: 'error', text1: data.error || 'Could not hear that'});
        return;
      }
      const parent = navigation.getParent();
      (parent || navigation).navigate('Chatbot', {transcript: data.transcript});
    } catch (err) {
      Toast.show({type: 'error', text1: 'Voice listen is unavailable'});
    }
  };

  const toggle = async () => {
    if (listening) {
      await stopAndSend();
      return;
    }
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setListening(true);
    } catch (err) {
      Toast.show({type: 'error', text1: 'Microphone is not available'});
    }
  };

  return (
    <TouchableOpacity
      style={[styles.seed, {bottom: 64 + Math.max(insets.bottom, 8) + 12}]}
      onPress={toggle}
      accessibilityRole="button"
      accessibilityLabel={listening ? 'Stop listening' : 'Ask Nila'}
      activeOpacity={0.9}>
      <Animated.View
        style={[
          styles.ring,
          {borderColor: listening ? theme.turmeric : theme.paddyTint},
          ringStyle,
        ]}
      />
      <View style={styles.seedFill}>
        <Icon
          name={listening ? 'mic' : 'mic-outline'}
          size={26}
          color={theme.inkInverse}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  seed: {
    position: 'absolute',
    alignSelf: 'center',
    width: 64,
    height: 64,
    zIndex: 20,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    borderWidth: 3,
  },
  seedFill: {
    flex: 1,
    margin: 4,
    borderRadius: 28,
    backgroundColor: theme.paddy,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow2,
  },
});

export default VoiceSeed;
