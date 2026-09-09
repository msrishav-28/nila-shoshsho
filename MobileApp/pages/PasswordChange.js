import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Header from '../components/Header';
import {theme} from '../theme.config';
import Toast from 'react-native-toast-message';
import {accountFetch} from '../utils/api';
import {useTranslation} from 'react-i18next';

const PasswordChange = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword || !newPassword) {
      Toast.show({type: 'error', text1: t('password.needBoth')});
      return;
    }
    if (newPassword.length < 8) {
      Toast.show({type: 'error', text1: t('password.tooShort')});
      return;
    }
    if (newPassword !== confirmPassword) {
      Toast.show({type: 'error', text1: t('password.mismatch')});
      return;
    }
    setLoading(true);
    try {
      const response = await accountFetch('/auth/update-password', {
        method: 'PUT',
        body: JSON.stringify({currentPassword, newPassword}),
      });
      const data = await response.json();
      if (data.success) {
        Toast.show({type: 'success', text1: t('password.success')});
        navigation.navigate('Settings');
      } else {
        Toast.show({type: 'error', text1: data.message || t('password.failed')});
      }
    } catch (err) {
      Toast.show({type: 'error', text1: t('password.failed')});
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={theme.container}>
      <Header text={t('password.title')} />
      <View style={styles.body}>
        <Text style={styles.copy}>{t('password.copy')}</Text>
        <TextInput style={styles.input} secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} placeholder={t('password.current')} placeholderTextColor={theme.text3} />
        <TextInput style={styles.input} secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder={t('password.next')} placeholderTextColor={theme.text3} />
        <TextInput style={styles.input} secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('password.confirm')} placeholderTextColor={theme.text3} />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('password.submit')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PasswordChange;

const styles = StyleSheet.create({
  body: {padding: 24},
  copy: {fontFamily: theme.font.regular, color: theme.text2, marginBottom: 16},
  input: {borderWidth: 1, borderColor: theme.border, borderRadius: 6, padding: 12, marginBottom: 12, color: theme.text},
  button: {backgroundColor: theme.paddy, padding: 14, borderRadius: 14, minHeight: 52, alignItems: 'center', justifyContent: 'center'},
  buttonText: {color: '#fff', fontFamily: theme.font.bold},
});