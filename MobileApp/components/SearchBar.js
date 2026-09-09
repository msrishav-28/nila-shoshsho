import React, {useState} from 'react';
import {View, TextInput, StyleSheet, TouchableOpacity, Text} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {adviceFetch} from '../utils/api';
import {isSarvamRecording, startSarvamRecording, stopSarvamTranscription} from '../utils/sarvamStt';

const SearchBar = ({placeholder, toEdit, caption}) => {
  const navigation = useNavigation();
  const {t, i18n} = useTranslation();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [listening, setListening] = useState(false);

  const search = async text => {
    const q = (text ?? query).trim();
    const res = await adviceFetch(`/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setHits(data.results || []);
  };

  const listen = async () => {
    if (isSarvamRecording() || listening) {
      try {
        const transcript = await stopSarvamTranscription(i18n.language);
        setListening(false);
        if (transcript) {
          setQuery(transcript);
          await search(transcript);
        }
      } catch (err) {
        setListening(false);
        Toast.show({
          type: 'error',
          text1: err.message || t('searchMic.unavailable'),
        });
      }
      return;
    }
    try {
      await startSarvamRecording();
      setListening(true);
      Toast.show({type: 'info', text1: t('searchMic.listening')});
    } catch (err) {
      setListening(false);
      Toast.show({
        type: 'error',
        text1: err.message || t('searchMic.unavailable'),
      });
    }
  };

  return (
    <View>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      <View style={styles.container}>
        <Ionicons name="search" size={22} color={theme.inkSoft} style={styles.icon} />
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search()}
          placeholder={placeholder || 'Ask Nila or search...'}
          placeholderTextColor={theme.inkFaint}
          editable={toEdit !== false}
        />
        <TouchableOpacity onPress={listen}>
          <Ionicons name={listening ? 'mic' : 'mic-outline'} size={22} color={theme.paddy} />
        </TouchableOpacity>
      </View>
      {hits.map(hit => (
        <TouchableOpacity
          key={hit.id}
          onPress={() => {
            const nested = {Stores: 'Stores', Compare: 'Compare', Insights: 'Insights'};
            if (nested[hit.route]) {
              navigation.navigate('Market', {screen: nested[hit.route]});
              return;
            }
            navigation.navigate(hit.route);
          }}
          style={styles.hit}>
          <Text style={styles.hitText}>{hit.title}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 52,
    marginVertical: 7,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: theme.text2,
    fontFamily: theme.font.regular,
    marginTop: 3,
  },
  caption: {
    ...theme.type.meta,
    marginBottom: 4,
  },
  hit: {paddingHorizontal: 12, paddingVertical: 8},
  hitText: {color: theme.text, fontFamily: theme.font.regular},
});

export default SearchBar;