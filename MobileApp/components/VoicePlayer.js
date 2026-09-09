import React, {useEffect, useRef, useState} from 'react';
import {View, StyleSheet, Text, TouchableOpacity} from 'react-native';
import {Audio} from 'expo-av';
import Icon from 'react-native-vector-icons/Ionicons';
import {theme} from '../theme.config';
import {useTranslation} from 'react-i18next';
import {adviceFetch} from '../utils/api';
import Toast from 'react-native-toast-message';

const VoicePlayer = ({text, lang}) => {
  const {t, i18n} = useTranslation();
  const [playing, setPlaying] = useState(false);
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync?.();
    };
  }, []);

  const stop = async () => {
    setPlaying(false);
    await soundRef.current?.stopAsync?.();
    await soundRef.current?.unloadAsync?.();
    soundRef.current = null;
  };

  const speak = async () => {
    if (!text) {
      return;
    }
    try {
      setPlaying(true);
      const res = await adviceFetch('/voice/tts', {
        method: 'POST',
        body: JSON.stringify({text: String(text).slice(0, 2400), lang: lang || i18n.language}),
      });
      const data = await res.json();
      if (!res.ok || !data.audio_base64) {
        Toast.show({type: 'error', text1: data.error || t('searchMic.unavailable')});
        setPlaying(false);
        return;
      }
      const sound = new Audio.Sound();
      await sound.loadAsync({uri: `data:audio/wav;base64,${data.audio_base64}`});
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setPlaying(false);
        }
      });
      await sound.playAsync();
    } catch (err) {
      setPlaying(false);
      Toast.show({type: 'error', text1: t('searchMic.unavailable')});
    }
  };

  return (
    <View style={styles.container}>
      <Icon name="volume-high-outline" size={28} color={theme.paddy} />
      <View style={{flex: 1}}>
        <Text style={styles.label}>{t('voice') === 'voice' ? 'Listen' : t('voice')}</Text>
        <TouchableOpacity onPress={playing ? stop : speak} accessibilityRole="button" hitSlop={8}>
          <Icon name={playing ? 'pause' : 'play'} size={26} color={theme.ink} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    borderWidth: 1,
    borderColor: theme.hairline,
    backgroundColor: theme.surface,
  },
  label: {
    fontFamily: theme.font.regular,
    fontSize: 13,
    color: theme.ink,
    marginBottom: 4,
  },
});

export default VoicePlayer;
