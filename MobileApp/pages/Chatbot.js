import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme.config';
import Header from '../components/Header';

const Chatbot = () => {
  const navigation = useNavigation();
  const scrollViewRef = useRef(null);
  const { t } = useTranslation();

  const predefinedOptions = [
    { label: t('chatbot.options.governmentSchemes'), screen: 'Scheme' },
    { label: t('chatbot.options.cropCare'), screen: 'Crop Care' },
    { label: t('chatbot.options.accessMarket'), screen: 'Market' },
    { label: t('chatbot.options.settings'), screen: 'Settings' },
    { label: t('chatbot.options.viewProfile'), screen: 'Profile' },
    { label: t('chatbot.options.updateProfile'), screen: 'UpdateProfile' },
  ];

  const [chatHistory, setChatHistory] = useState([
    { type: 'bot', text: t('chatbot.initialMessage'), showOptions: true },
  ]);

  const handleUserSelection = (option) => {
    const userMessage = { type: 'user', text: option.label };
    const botMessage1 = { type: 'bot', text: t('chatbot.loadingMessage') };
    const botMessage2 = { type: 'bot', text: t('chatbot.initialMessage'), showOptions: true };

    setChatHistory((prev) => [...prev, userMessage, botMessage1]);

    setTimeout(() => {
      if (option.screen === 'Settings' || option.screen === 'UpdateProfile' || option.screen === 'Profile') {
        navigation.navigate(option.screen);
      } else {
        navigation.navigate('MainApp', { screen: option.screen });
      }

      // Show next menu again after a short pause
      setTimeout(() => {
        setChatHistory((prev) => [...prev, botMessage2]);
      }, 1000);
    }, 2000);
  };

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [chatHistory]);

  const renderOption = ({ item }) => (
    <TouchableOpacity
      onPress={() => handleUserSelection(item)}
      style={styles.optionButton}
      activeOpacity={0.8}
    >
      <Text style={styles.optionText}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={theme.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Header text={t('chatbot.headerTitle')} />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.chatContainer}
        showsVerticalScrollIndicator={false}
      >
        {chatHistory.map((msg, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              msg.type === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text style={styles.messageText}>{msg.text}</Text>

            {/* If this bot message includes options */}
            {msg.showOptions && (
              <FlatList
                data={predefinedOptions}
                renderItem={renderOption}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionsContainer}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default Chatbot;

const styles = StyleSheet.create({
  chatContainer: {
    paddingBottom: 20,
    paddingTop: 20,
    paddingHorizontal: 10,
  },
  messageBubble: {
    width: '100%',
    padding: 12,
    borderRadius: 3,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: theme.primaryLight, 
    borderBottomRightRadius: 4,
    alignItems : 'flex-end',
  },
  botBubble: {
    backgroundColor: '#F5F5F5',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    lineHeight: 20,
  },
  optionsContainer: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 5,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: theme.border,
  },
  optionText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.primary,
    textAlign: 'center',
  },
});