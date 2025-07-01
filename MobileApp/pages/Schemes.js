import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import Header from '../components/Header';
import {theme} from '../theme.config';
import {AIBACKEND_URL} from '../backendConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import VoicePlayer from '../components/VoicePlayer';

const API_URL = `${AIBACKEND_URL}/govscheme`;

const Schemes = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState(null);
  const scrollViewRef = useRef();
  const {t, i18n} = useTranslation();

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      console.log('Schemes page', storedLang);
      if (storedLang) {
        setLang(storedLang);
        const storedLangVal = await AsyncStorage.getItem('appLanguageValue');
        i18n.changeLanguage(storedLangVal);
      }
    };

    loadLanguage();
  }, []);

  useEffect(() => {
    setMessages([{from: 'bot', text: t('schemes.botGreeting')}]);
  }, [t, i18n.language]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = {from: 'user', text: input};
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);
    try {
      const currentLang = i18n.language || lang;
      const query = `${userMsg.text} + please answer in ${currentLang}`;
      const res = await axios.post(API_URL, {query});
      let botText = res.data?.response || t('schemes.error.noData');
      setMessages(prev => [
        ...prev,
        {from: 'bot', text: botText, fromBackend: true},
      ]); // Add fromBackend flag
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {from: 'bot', text: t('schemes.error.network'), fromBackend: true},
      ]);
    }
    setLoading(false);
  };

  return (
    <View style={[theme.container, {flex: 1}]}>
      <Header text={t('schemes.header')} />
      <ScrollView
        ref={scrollViewRef}
        style={styles.chat}
        contentContainerStyle={{padding: 16, paddingBottom: 50}}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({animated: true})
        }>
        {messages.map((msg, idx) => (
          <View
            key={idx}
            style={msg.from === 'user' ? styles.userBubble : styles.botBubble}>
            {msg.from === 'bot' && msg.fromBackend && (
              <VoicePlayer text={msg.text} lang={lang}/>
            )}
            <Markdown style={msg.from === 'user' ? markdownUser : markdownBot}>
              {msg.text}
            </Markdown>
          </View>
        ))}
        {loading && (
          <View style={styles.botBubble}>
            <ActivityIndicator size="small" color="#333" />
          </View>
        )}
      </ScrollView>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('schemes.inputPlaceholder')}
          placeholderTextColor={'gray'}
          onSubmitEditing={sendMessage}
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={sendMessage}
          disabled={loading}>
          <Text style={styles.sendText}>{t('schemes.send')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f7f7f7'},
  chat: {flex: 1},
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#d1f5d3',
    borderRadius: 12,
    marginBottom: 8,
    padding: 10,
    maxWidth: '85%',
    fontFamily: theme.font.regular,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    padding: 10,
    maxWidth: '100%',
    borderColor: '#e0e0e0',
    borderWidth: 1,
    fontFamily: theme.font.regular,
  },
  inputRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 13,
    color: 'black',
    fontFamily: theme.font.regular,
    backgroundColor: '#f0f0f0',
    paddingTop: 9,
  },
  sendBtn: {
    backgroundColor: theme.secondary,
    borderRadius: 3,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontFamily: theme.font.bold,
    color: 'white',
  },
});

const markdownBot = {
  body: {color: 'gray', fontSize: 13, fontFamily: theme.font.regular},
  strong: {fontWeight: 'bold'},
  table: {borderWidth: 1, borderColor: '#ccc'},
  th: {backgroundColor: '#e0e0e0', fontWeight: 'bold'},
  tr: {borderBottomWidth: 1, borderColor: '#eee'},
  td: {padding: 4},
};

const markdownUser = {
  body: {color: '#222', fontSize: 12, fontFamily: theme.font.bold},
};

export default Schemes;
