import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {theme} from '../theme.config';
import Header from '../components/Header';
import {UserContext} from '../context/UserContext';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';

const LanguageChange = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const {user} = useContext(UserContext);
  const {i18n} = useTranslation(); // i18n instance
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [openLanguage, setOpenLanguage] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(null);

  const languageItems = [
    {label: "English", value: 'en'},
    {label: "Hindi", value: 'hi'},
    {label: "Marathi", value: 'mr'},
    {label: "Tamil", value: 'ta'},
  ];

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem('appLanguage');
        if (storedLanguage) {
          setCurrentLanguage(storedLanguage);
        }
      } catch (err) {
        console.error(t("langPage.err_lang"), err);
      }
    };
    loadLanguage();
  }, []);

  const changeLanguage = async () => {
    if (!selectedLanguage) {
      Toast.show({
        type: 'error',
        text1: t("langPage.no_select_title"),
        text2: t("langPage.no_select_msg"),
      });
      return;
    }
  
    const selectedItem = languageItems.find(item => item.value === selectedLanguage);
  
    if (!selectedItem) return;
  
    try {
      await AsyncStorage.setItem('appLanguage', selectedItem.label); // save label
      await AsyncStorage.setItem('appLanguageValue', selectedLanguage);   // save value for reloads
  
      setCurrentLanguage(selectedItem.label); // display label
      i18n.changeLanguage(selectedLanguage);
  
      Toast.show({
        type: 'success',
        text1: t("langPage.success_title"),
        text2: t("langPage.success_msg", { lang: selectedItem.label }),
      });
  
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (err) {
      console.error('Error saving language:', err);
      Toast.show({
        type: 'error',
        text1: t("langPage.err_title"),
        text2: t("langPage.err_msg"),
      });
    }
  };
  

  // Render each spoken language
  const renderSpokenLanguage = ({item}) => (
    <View style={styles.languageItem}>
      <Text style={styles.languageText}>{item}</Text>
    </View>
  );

  return (
    <View style={theme.container}>
      <Header text={t("langPage.title")} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          {t("langPage.desc")}
        </Text>

        <View style={styles.languagePickerContainer}>
          <DropDownPicker
            open={openLanguage}
            value={selectedLanguage}
            items={languageItems}
            setOpen={setOpenLanguage}
            setValue={setSelectedLanguage}
            placeholder="Select Language"
            style={styles.dropdown}
            textStyle={styles.dropdownText}
            dropDownContainerStyle={styles.dropdownContainer}
            zIndex={1000}
          />
        </View>

        <Text style={styles.currentLanguage}>
          Current Language: {currentLanguage || 'Not set'}
        </Text>

        <TouchableOpacity
          style={styles.changeButton}
          onPress={changeLanguage}
          disabled={!selectedLanguage}>
          <Text style={styles.changeButtonText}>{t("langPage.btn")}</Text>
        </TouchableOpacity>

        <View style={styles.spokenLanguagesContainer}>
          <Text style={styles.spokenLanguagesTitle}>{t("langPage.spoken_title")}</Text>
          {user?.languageSpoken?.length > 0 ? (
            <FlatList
              data={user.languageSpoken}
              renderItem={renderSpokenLanguage}
              keyExtractor={item => item}
              style={styles.spokenLanguagesList}
            />
          ) : (
            <Text style={styles.noLanguages}>
              {t("langPage.no_spoken")}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  description: {
    fontSize: theme.fs6,
    fontFamily: theme.font.light,
    color: theme.text2,
    marginVertical: 16,
    textAlign: 'center',
  },
  languagePickerContainer: {
    marginVertical: 12,
    zIndex: 1000,
  },
  dropdown: {
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownText: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs6,
    color: theme.text,
  },
  dropdownContainer: {
    borderColor: theme.border,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  currentLanguage: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text2,
    textAlign: 'center',
    marginVertical: 12,
  },
  changeButton: {
    backgroundColor: theme.secondary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  changeButtonText: {
    color: '#fff',
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
  },
  spokenLanguagesContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  spokenLanguagesTitle: {
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
    color: theme.text2,
    marginBottom: 12,
  },
  spokenLanguagesList: {
    maxHeight: 200,
  },
  languageItem: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  languageText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text,
  },
  noLanguages: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text3,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default LanguageChange;
