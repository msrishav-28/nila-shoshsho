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
  Linking,
} from 'react-native';
import Header from '../components/Header';
import {theme} from '../theme.config';
import {adviceFetch} from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import VoicePlayer from '../components/VoicePlayer';

const API_PATH = '/govscheme';
const MYSCHEME_HOME = 'https://www.myscheme.gov.in';

const asList = value => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && Array.isArray(value.items)) {
    return value.items;
  }
  if (value && Array.isArray(value.item)) {
    return value.item;
  }
  if (value && Array.isArray(value.hits)) {
    return value.hits;
  }
  return [];
};

const schemeTitle = row => {
  if (!row || typeof row !== 'object') {
    return '';
  }
  const fields = row.fields && typeof row.fields === 'object' ? row.fields : row;
  const en = fields.en && typeof fields.en === 'object' ? fields.en : {};
  return (
    fields.schemeName ||
    fields.schemeShortTitle ||
    fields.name ||
    fields.title ||
    en.schemeName ||
    en.name ||
    en.title ||
    row.schemeName ||
    row.title ||
    ''
  );
};

const schemeLink = row => {
  if (!row || typeof row !== 'object') {
    return '';
  }
  const fields = row.fields && typeof row.fields === 'object' ? row.fields : row;
  const url = fields.url || fields.link || row.url || row.link;
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return url;
  }
  const slug = fields.slug || row.slug;
  if (typeof slug === 'string' && slug.trim()) {
    return `${MYSCHEME_HOME}/schemes/${slug.trim()}`;
  }
  return '';
};

export const extractSchemeCards = payload => {
  const root =
    payload && Object.prototype.hasOwnProperty.call(payload, 'schemes')
      ? payload.schemes
      : payload;
  const buckets = [];
  if (Array.isArray(root)) {
    buckets.push(root);
  } else if (root && typeof root === 'object') {
    buckets.push(asList(root));
    buckets.push(asList(root.data));
    buckets.push(asList(root.hits));
    buckets.push(asList(root.data && root.data.hits));
    buckets.push(asList(root.data && root.data.hits && root.data.hits.hits));
  }
  const seen = new Set();
  const cards = [];
  buckets.forEach(list => {
    list.forEach(row => {
      const title = String(schemeTitle(row) || '').trim();
      if (!title) {
        return;
      }
      const link = schemeLink(row) || MYSCHEME_HOME;
      const key = `${title}|${link}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      cards.push({title, link});
    });
  });
  return cards;
};

const openUrl = url => {
  if (!url) {
    return;
  }
  Linking.openURL(url);
};

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
    const userMsg = {from: 'user', text: input.trim()};
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    Keyboard.dismiss();
    setLoading(true);
    try {
      const res = await adviceFetch(API_PATH, {
        method: 'POST',
        body: JSON.stringify({query: userMsg.text}),
      });
      const payload = await res.json();
      const link = payload?.link || MYSCHEME_HOME;
      const source = payload?.source || 'myScheme.gov.in';
      if (!res.ok) {
        setMessages(prev => [
          ...prev,
          {
            from: 'bot',
            fromBackend: true,
            text: payload?.error || t('schemes.error.noData'),
            error: payload?.error || t('schemes.error.noData'),
            link,
            source,
            openCatalogue: true,
          },
        ]);
        return;
      }
      const schemes = extractSchemeCards(payload);
      const spoken = schemes.length
        ? schemes.map(item => item.title).join('. ')
        : payload?.error || t('schemes.noSchemes');
      setMessages(prev => [
        ...prev,
        {
          from: 'bot',
          fromBackend: true,
          text: spoken,
          schemes,
          source,
          link,
          openCatalogue: schemes.length === 0,
        },
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {from: 'bot', text: t('schemes.error.network'), fromBackend: true},
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderBotBody = msg => {
    if (msg.from !== 'bot') {
      return <Text style={styles.userText}>{msg.text}</Text>;
    }
    return (
      <>
        {msg.fromBackend ? <VoicePlayer text={msg.text} lang={lang} /> : null}
        {msg.error ? <Text style={styles.errorText}>{msg.error}</Text> : null}
        {(msg.schemes || []).map(item => (
          <TouchableOpacity
            key={`${item.title}-${item.link}`}
            style={styles.schemeCard}
            onPress={() => openUrl(item.link)}
            accessibilityRole="link">
            <Text style={styles.schemeTitle}>{item.title}</Text>
            <Text style={styles.schemeLink}>{item.link}</Text>
          </TouchableOpacity>
        ))}
        {!msg.error && (!msg.schemes || msg.schemes.length === 0) && msg.text ? (
          <Text style={styles.botText}>{msg.text}</Text>
        ) : null}
        {msg.source ? (
          <Text style={styles.meta}>
            {t('schemes.sourceLabel')}: {msg.source}
          </Text>
        ) : null}
        {msg.openCatalogue ? (
          <TouchableOpacity
            style={styles.myschemeBtn}
            onPress={() => openUrl(msg.link || MYSCHEME_HOME)}
            accessibilityRole="link">
            <Text style={styles.myschemeText}>{t('schemes.openMyscheme')}</Text>
          </TouchableOpacity>
        ) : null}
      </>
    );
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
            {renderBotBody(msg)}
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
  chat: {flex: 1},
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.paddySoft,
    borderRadius: 18,
    marginBottom: 8,
    padding: 10,
    maxWidth: '85%',
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
  },
  userText: {
    color: '#222',
    fontSize: 12,
    fontFamily: theme.font.bold,
  },
  botText: {
    color: 'gray',
    fontSize: 13,
    fontFamily: theme.font.regular,
  },
  errorText: {
    color: theme.alert,
    fontSize: 13,
    fontFamily: theme.font.regular,
    marginBottom: 8,
  },
  schemeCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  schemeTitle: {
    fontFamily: theme.font.bold,
    color: theme.ink,
    fontSize: 15,
  },
  schemeLink: {
    fontFamily: theme.font.regular,
    color: theme.monsoon,
    fontSize: 13,
    marginTop: 4,
  },
  meta: {
    fontFamily: theme.font.regular,
    color: theme.inkSoft,
    fontSize: 12,
    marginTop: 8,
  },
  myschemeBtn: {
    marginTop: 10,
    backgroundColor: theme.paddy,
    borderRadius: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  myschemeText: {
    fontFamily: theme.font.bold,
    color: theme.inkInverse,
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
    backgroundColor: theme.paddy,
    borderRadius: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    fontFamily: theme.font.bold,
    color: 'white',
  },
});

export default Schemes;
