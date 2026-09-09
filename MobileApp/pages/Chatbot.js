import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import Header from '../components/Header';
import VoicePlayer from '../components/VoicePlayer';
import {adviceFetch} from '../utils/api';
import {adviceLang} from '../utils/lang';

const Chatbot = () => {
  const scrollRef = useRef(null);
  const {t, i18n} = useTranslation();
  const route = useRoute();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {from: 'bot', text: t('chatbot.initialMessage'), suggestions: true},
  ]);

  const suggestions = [
    {label: t('chatbot.options.governmentSchemes'), prompt: t('chatbot.prompts.schemes')},
    {label: t('chatbot.options.cropCare'), prompt: t('chatbot.prompts.cropCare')},
    {label: t('chatbot.options.accessMarket'), prompt: t('chatbot.prompts.market')},
  ];

  const ask = async question => {
    const q = (question || '').trim();
    if (!q || loading) {
      return;
    }
    setInput('');
    setMessages(prev => [...prev, {from: 'user', text: q}]);
    setLoading(true);
    try {
      const res = await adviceFetch('/chatbot/ask', {
        method: 'POST',
        body: JSON.stringify({question: q, lang: adviceLang(i18n.language), has_image: false}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages(prev => [...prev, {from: 'bot', text: data.error || t('schemes.error.network'), error: true}]);
      } else {
        setMessages(prev => [
          ...prev,
          {from: 'bot', text: data.answer, sources: data.sources, speak: true},
        ]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {from: 'bot', text: t('schemes.error.network'), error: true}]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route.params?.transcript) {
      ask(route.params.transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.transcript]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({animated: true});
  }, [messages, loading]);

  return (
    <KeyboardAvoidingView style={theme.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header text={t('chatbot.headerTitle')} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
        {messages.map((msg, idx) => (
          <View key={idx} style={[styles.bubble, msg.from === 'user' ? styles.user : msg.error ? styles.error : styles.bot]}>
            <Text style={[styles.body, msg.from === 'user' && {color: theme.inkInverse}]}>
              {msg.text}
            </Text>
            {msg.sources?.length
              ? msg.sources.map((src, i) => (
                  <Text key={i} style={styles.source}>
                    {src.source}
                    {src.asOf ? ` · ${src.asOf}` : ''}
                  </Text>
                ))
              : null}
            {msg.speak ? <VoicePlayer text={msg.text} lang={i18n.language} /> : null}
            {msg.suggestions ? (
              <View style={styles.chips}>
                {suggestions.map(item => (
                  <TouchableOpacity key={item.label} style={styles.chip} onPress={() => ask(item.prompt)}>
                    <Text style={styles.chipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        ))}
        {loading ? (
          <View style={[styles.bubble, styles.bot]}>
            <ActivityIndicator color={theme.paddy} />
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('schemes.inputPlaceholder')}
          placeholderTextColor={theme.inkFaint}
          onSubmitEditing={() => ask(input)}
          editable={!loading}
        />
        <TouchableOpacity style={styles.send} onPress={() => ask(input)} disabled={loading}>
          <Text style={styles.sendText}>{t('schemes.send')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  thread: {paddingVertical: 16, paddingBottom: 24, gap: 10},
  bubble: {
    maxWidth: '86%',
    padding: 14,
    borderRadius: 18,
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: theme.paddy,
    borderBottomRightRadius: 6,
  },
  bot: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderBottomLeftRadius: 6,
    ...theme.shadow1,
  },
  error: {
    alignSelf: 'flex-start',
    backgroundColor: theme.alertSoft,
    maxWidth: '100%',
  },
  body: {...theme.type.body, color: theme.ink},
  source: {...theme.type.meta, marginTop: 8},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  chip: {
    backgroundColor: theme.recessed,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: {...theme.type.callout, color: theme.paddy},
  composer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: theme.canvas,
  },
  input: {
    flex: 1,
    minHeight: 44,
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.hairline,
    paddingHorizontal: 12,
    color: theme.ink,
    fontFamily: theme.font.regular,
    fontSize: 16,
  },
  send: {
    minWidth: 72,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: theme.paddy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  sendText: {...theme.type.button},
});

export default Chatbot;
