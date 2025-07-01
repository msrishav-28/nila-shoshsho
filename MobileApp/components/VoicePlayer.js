import React, {useEffect, useState} from 'react';
import {View, StyleSheet, Image, Text, TouchableOpacity} from 'react-native';
import Tts from 'react-native-tts';
import Entypo from 'react-native-vector-icons/Entypo';
import Icon from 'react-native-vector-icons/Ionicons';
import {theme} from '../theme.config';
import {useTranslation} from 'react-i18next';

const stripMarkdown = text => {
  return text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/(\n\s*[-*+]\s)/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/>\s/g, '')
    .trim();
};

const VoicePlayer = ({text, lang}) => {
  const {t} = useTranslation();
  const [playing, setPlaying] = useState(false);
  
  useEffect(() => {
    setPlaying(false);
    const setTtsLanguage = async () => {
      let ttsLang = 'en-US';
      switch (lang) {
        case 'en':
          ttsLang = 'en-US';
          break;
        case 'hi':
          ttsLang = 'hi-IN';
          break;
        case 'mr':
          ttsLang = 'mr-IN';
          break;
        case 'ta':
          ttsLang = 'ta-IN';
          break;
        default:
          ttsLang = 'en-US';
      }
      try {
        await Tts.setDefaultLanguage(ttsLang);
        await Tts.setDefaultVoice(ttsLang);
      } catch (err) {
        console.log('TTS Language Error:', err);
      }
    };
    setTtsLanguage();
  }, [text, lang]);

  const speak = () => {
    setPlaying(true);
    Tts.stop();
    const cleanText = stripMarkdown(text);
    Tts.speak(cleanText);
  };

  const stop = () => {
    Tts.stop();
    setPlaying(false);
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/voice.png')}
        style={{width: 50, height: 50}}
      />
      <View
        style={{
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 7,
          width: '70%',
        }}>
        <Text
          style={{
            fontFamily: theme.font.regular,
            fontSize: 13,
            color: 'black',
          }}>
          {t('voice')}
        </Text>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
          {playing ? (
            <TouchableOpacity onPress={stop}>
              <Icon name="pause" size={25} color={'black'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={speak}>
              <Entypo name="controller-play" size={25} color={'black'} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '96%',
    marginVertical: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginLeft: '2%',
  },
});

export default VoicePlayer;