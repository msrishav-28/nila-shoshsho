import React, {useContext, useEffect, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import {theme} from '../theme.config';
import Header from '../components/Header';
import axios from 'axios';
import {pick} from '@react-native-documents/picker';
import Toast from 'react-native-toast-message';
import {UserContext} from '../context/UserContext';
import {BACKEND_URL, AIBACKEND_URL} from '../backendConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTranslation} from 'react-i18next';

const Documents = () => {
  const {t} = useTranslation();
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [translateFile, setTranslateFile] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [activeTab, setActiveTab] = useState('MyDocs'); // State to toggle between tabs
  const {user, setUser} = useContext(UserContext);
  const [lang, setLang] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      const storedLang = await AsyncStorage.getItem('appLanguage');
      setLang(storedLang);
    };
    loadLanguage();
  }, []);

  const handleDocumentPick = async () => {
    try {
      const [pickResult] = await pick({
        mode: 'import',
        type: 'application/pdf',
      });

      const isPDF =
        pickResult.mimeType === 'application/pdf' ||
        pickResult.name?.toLowerCase().endsWith('.pdf');

      if (!isPDF) {
        Alert.alert(
          t('documents.alerts.invalidFile.title'),
          t('documents.alerts.invalidFile.message'),
        );
        return;
      }

      setSelectedFile({
        uri: pickResult.uri,
        type: pickResult.mimeType || 'application/pdf',
        name: pickResult.name || 'unnamed_file.pdf',
      });
    } catch (err) {
      if (err?.code === 'CANCELLED') {
        console.log('User cancelled the picker');
      } else {
        console.log('Error picking document:', err);
      }
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    if (!selectedFile) {
      Toast.show({
        type: 'error',
        text1: t('documents.alerts.docNotSelected.title'),
        text2: t('documents.alerts.docNotSelected.message'),
      });
      return;
    }

    const formData = new FormData();
    formData.append('document', {
      uri: selectedFile.uri,
      type: selectedFile.type,
      name: selectedFile.name,
    });

    try {
      const response = await axios.post(
        `${BACKEND_URL}/upload/upload-doc`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      const data = await response.data;
      console.log(data);
      if (data.success) {
        setUser(data.user);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        Toast.show({
          type: 'success',
          text1: t('documents.alerts.uploadSuccess.title'),
          text2: t('documents.alerts.uploadSuccess.message'),
        });
        setSelectedFile(null);
      } else {
        Toast.show({
          type: 'error',
          text1: t('documents.alerts.uploadFailed.title'),
          text2: t('documents.alerts.uploadFailed.message'),
        });
      }
      setLoading(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('documents.alerts.uploadFailed.title'),
        text2: `${error}`,
      });
      console.log('Upload error:', error);
      setLoading(false);
    }
  };

  const extractFileName = url => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split('/');
      const filePart = parts[parts.length - 1];
      const fileName = filePart.split('-')[0] || 'Unnamed Document';
      return fileName.replace(/%20/g, ' ').replace(/%2520/g, ' ');
    } catch (e) {
      return 'Unnamed Document';
    }
  };

  const handleOpenPDF = async url => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('documents.alerts.viewFailed.title'),
        text2: t('documents.alerts.viewFailed.message'),
      });
      console.log('View error:', error);
    }
  };

  const handleTranslatePick = async () => {
    try {
      const [pickResult] = await pick({
        mode: 'import',
        type: 'application/pdf',
      });

      const isPDF =
        pickResult.mimeType === 'application/pdf' ||
        pickResult.name?.toLowerCase().endsWith('.pdf');

      if (!isPDF) {
        Toast.show({
          type: 'error',
          text1: t('documents.alerts.fileFormatFailed.title'),
          text2: t('documents.alerts.fileFormatFailed.message'),
        });
        return;
      }

      setTranslateFile({
        uri: pickResult.uri,
        type: pickResult.mimeType || 'application/pdf',
        name: pickResult.name || 'unnamed_file.pdf',
      });
    } catch (err) {
      if (err?.code === 'CANCELLED') {
        console.log('User cancelled the picker');
      } else {
        console.log('Error picking document for translation:', err);
      }
    }
  };

  const handleTranslate = async () => {
    console.log('translate');
    setTranslating(true);
    if (!translateFile) {
      Toast.show({
        type: 'error',
        text1: t('documents.alerts.translateNotSelected.title'),
        text2: t('documents.alerts.translateNotSelected.message'),
      });
      setTranslating(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', {
      uri: translateFile.uri,
      type: translateFile.type,
      name: translateFile.name,
    });
    formData.append('target_language', lang ? lang : 'English');

    try {
      console.log('reached here');
      const response = await axios.post(
        `${AIBACKEND_URL}/translate`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      console.log(response);
      const data = await response.data;
      if (data.translated_document) {
        setTranslatedText(data.translated_document);
        Toast.show({
          type: 'success',
          text1: t('documents.alerts.translateSuccess.title'),
          text2: t('documents.alerts.translateSuccess.message'),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('documents.alerts.translateFailed.title'),
          text2: t('documents.alerts.translateFailed.message'),
        });
      }
      setTranslating(false);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('documents.alerts.translateFailed.title'),
        text2: `${error}`,
      });
      console.log('Translation error:', error);
      setTranslating(false);
    }
  };

  const renderTranslatedText = text => {
    if (!text) return null;

    const sections = text.split('\n\n');
    return sections.map((section, index) => {
      if (section.startsWith('**') && section.endsWith('**')) {
        return (
          <View key={index} style={styles.translatedSection}>
            <View style={styles.sectionHeader}>
              <Icon
                name="book-open-page-variant"
                size={20}
                color={theme.darkBrown}
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>
                {section.replace(/\*\*/g, '')}
              </Text>
            </View>
          </View>
        );
      } else if (section.includes('\n*')) {
        const lines = section.split('\n');
        const title = lines[0];
        const items = lines
          .slice(1)
          .filter(line => line.trim().startsWith('*'));
        return (
          <View key={index} style={styles.translatedSection}>
            {title && (
              <View style={styles.sectionHeader}>
                <Icon
                  name="format-list-bulleted"
                  size={20}
                  color={theme.darkBrown}
                  style={styles.icon}
                />
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            {items.map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Icon
                  name="circle-medium"
                  size={16}
                  color="gray"
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{item.replace('* ', '')}</Text>
              </View>
            ))}
          </View>
        );
      } else if (section.includes('\n1.')) {
        const lines = section.split('\n');
        const title = lines[0];
        const items = lines
          .slice(1)
          .filter(line => line.trim().match(/^\d+\./));
        return (
          <View key={index} style={styles.translatedSection}>
            {title && (
              <View style={styles.sectionHeader}>
                <Icon
                  name="format-list-numbered"
                  size={20}
                  color={theme.darkBrown}
                  style={styles.icon}
                />
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            {items.map((item, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.numberText}>{item.match(/^\d+\./)[0]}</Text>
                <Text style={styles.bulletText}>
                  {item.replace(/^\d+\.\s*/, '')}
                </Text>
              </View>
            ))}
          </View>
        );
      } else {
        return (
          <View key={index} style={styles.translatedSection}>
            <Text style={styles.paragraphText}>{section}</Text>
          </View>
        );
      }
    });
  };

  return (
    <View style={theme.container}>
      <Header text={t('documents.header')} />
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'MyDocs' && styles.activeTab]}
          onPress={() => setActiveTab('MyDocs')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'MyDocs' && styles.activeTabText,
            ]}>
            {t('documents.tabs.myDocs')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'Translate' && styles.activeTab,
          ]}
          onPress={() => setActiveTab('Translate')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'Translate' && styles.activeTabText,
            ]}>
            {t('documents.tabs.translate')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, {paddingHorizontal: 14}]}>
        {activeTab === 'MyDocs' ? (
          <>
            <Text style={styles.description}>
              {t('documents.upload.description')}
            </Text>

            <TouchableOpacity style={styles.input} onPress={handleDocumentPick}>
              <Text style={styles.value}>
                {selectedFile
                  ? selectedFile.name
                  : t('documents.upload.noFileSelected')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleUpload}>
              <Text style={styles.uploadButtonText}>
                {loading
                  ? t('documents.upload.loading')
                  : t('documents.upload.uploadButton')}
              </Text>
            </TouchableOpacity>

            {/* Previous Documents Section */}
            {user?.documents?.length > 0 && (
              <View style={styles.documentsSection}>
                <Text style={styles.sectionTitle}>
                  {user.username + t('documents.previousDocs.title')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.documentsScroll}>
                  {user.documents.map((docUrl, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.documentCard}
                      onPress={() => handleOpenPDF(docUrl)}>
                      <Text
                        style={{
                          color: 'gray',
                          fontFamily: theme.font.bold,
                          fontSize: 15,
                        }}>
                        PDF
                      </Text>
                      <View
                        style={{
                          backgroundColor: '#f0f0f0',
                          width: '50%',
                          height: 10,
                          borderRadius: 3,
                          marginVertical: 4,
                        }}></View>
                      <View
                        style={{
                          backgroundColor: '#f0f0f0',
                          width: '70%',
                          height: 10,
                          borderRadius: 3,
                          marginVertical: 4,
                        }}></View>
                      <View
                        style={{
                          backgroundColor: '#f0f0f0',
                          width: '60%',
                          height: 10,
                          borderRadius: 3,
                          marginVertical: 4,
                        }}></View>
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: theme.font.regular,
                          color: 'gray',
                          marginTop: 12,
                        }}
                        numberOfLines={2}
                        ellipsizeMode="tail">
                        {extractFileName(docUrl)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <View style={styles.translateSection}>
            <View style={styles.sectionHeader}>
              <Icon
                name="translate"
                size={20}
                color={theme.darkBrown}
                style={styles.icon}
              />
              <Text style={styles.sectionTitle}>
                {t('documents.translate.title')}
              </Text>
            </View>
            <Text style={styles.description}>
              {t('documents.translate.description')}
            </Text>

            <TouchableOpacity
              style={styles.input}
              onPress={handleTranslatePick}>
              <Text style={styles.value}>
                {translateFile
                  ? translateFile.name
                  : t('documents.translate.noFileSelected')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handleTranslate}>
              <Text style={styles.uploadButtonText}>
                {translating
                  ? t('documents.translate.translating')
                  : t('documents.translate.button')}
              </Text>
            </TouchableOpacity>

            {translatedText && (
              <View style={styles.translatedContainer}>
                <View style={styles.sectionHeader}>
                  <Icon
                    name="file-document"
                    size={25}
                    color={theme.darkBrown}
                    style={styles.icon}
                  />
                  <Text style={styles.sectionTitle}>
                    {t('documents.translate.translatedDocument')}
                  </Text>
                </View>
                {renderTranslatedText(translatedText)}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  form: {
    paddingBottom: 20,
    width: '100%',
  },
  description: {
    fontSize: theme.fs7,
    fontFamily: theme.font.light,
    color: theme.text2,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
    padding: 12,
    marginVertical: 8,
    backgroundColor: '#fff',
    width: '100%',
  },
  value: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text,
    marginTop: 8,
  },
  uploadButton: {
    backgroundColor: theme.darkBrown,
    padding: 12,
    borderRadius: 3,
    alignItems: 'center',
    marginVertical: 8,
    opacity: 0.9,
    paddingTop: 15,
  },
  uploadButtonText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: '#fff',
  },
  documentsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text,
    marginLeft: 8,
    width: '80%',
  },
  documentsScroll: {
    flexDirection: 'row',
    paddingBottom: 10,
    paddingTop: 5,
  },
  documentCard: {
    width: 150,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 3,
    padding: 12,
    marginRight: 7,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 5,
  },
  translateSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  icon: {},
  bulletIcon: {
    marginTop: 4,
  },
  translatedContainer: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  translatedSection: {
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bulletText: {
    fontSize: 12,
    fontFamily: theme.font.regular,
    color: theme.text,
    flex: 1,
  },
  numberText: {
    fontSize: 12,
    fontFamily: theme.font.regular,
    color: theme.text,
    marginRight: 8,
  },
  paragraphText: {
    fontSize: 12,
    fontFamily: theme.font.regular,
    color: theme.text,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 10,
    marginHorizontal: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: theme.darkBrown,
  },
  tabText: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text,
  },
  activeTabText: {
    color: '#fff',
  },
});

export default Documents;
