import React, { useEffect, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, PermissionsAndroid, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme.config';

const SearchBar = ({ value, onChangeText, placeholder, toEdit }) => {
  const [isListening, setIsListening] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);


  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Microphone Permission",
            message: "This app needs access to your microphone for voice search.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        setHasPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
      } catch (err) {
        console.error('Permission error:', err);
      }
    } else {
      setHasPermission(true); // iOS handles permissions differently
    }
  };


  return (
    <View style={styles.container}>
      <Ionicons name="search" size={24} color="#888" style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || 'Search...'}
        placeholderTextColor="#888"
        editable={toEdit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    height: 50,
    marginVertical: 7,
    width: '100%',
    borderWidth: 1.2,
    borderColor: '#f0f0f0',
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
});

export default SearchBar;