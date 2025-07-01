import React, {useContext, useState, useEffect} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import {theme} from '../theme.config';
import {UserContext} from '../context/UserContext';
import {ActivityIndicator} from 'react-native-paper';
import {launchImageLibrary} from 'react-native-image-picker';
import {useTranslation} from 'react-i18next';
import Geolocation from 'react-native-geolocation-service';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {format, parseISO} from 'date-fns';

const UpdateProfile = () => {
  const {user, updateUser, updateProfilePic, loading} = useContext(UserContext);
  const navigation = useNavigation();
  const {t} = useTranslation();

  // State for form fields
  const [username, setUsername] = useState(user?.username || '');
  const [dob, setDob] = useState(
    user?.dob ? format(parseISO(user.dob), 'yyyy-MM-dd') : '',
  );
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [role, setRole] = useState(user?.role || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [address, setAddress] = useState(user?.location?.address || '');
  const [city, setCity] = useState(user?.location?.city || '');
  const [state, setState] = useState(user?.location?.state || '');
  const [country, setCountry] = useState(user?.location?.country || '');
  const [pincode, setPincode] = useState(user?.location?.pincode || '');
  const [facebook, setFacebook] = useState(user?.socialLinks?.facebook || '');
  const [instagram, setInstagram] = useState(
    user?.socialLinks?.instagram || '',
  );
  const [idName, setIdName] = useState(user?.governmentId?.idName || '');
  const [idValue, setIdValue] = useState(user?.governmentId?.idValue || '');
  const [profilePic, setProfilePic] = useState(user?.profilePic || null);
  const [languagesSpoken, setLanguagesSpoken] = useState(
    user?.languageSpoken || [],
  );
  const [selectedLanguage, setSelectedLanguage] = useState(null);
  const [openLanguage, setOpenLanguage] = useState(false);

  // Dropdown states
  const [openRole, setOpenRole] = useState(false);
  const [openGender, setOpenGender] = useState(false);
  const [roleItems, setRoleItems] = useState([
    {label: 'Farmer', value: 'Farmer'},
    {label: 'Logistics', value: 'Logistics'},
  ]);
  const [genderItems, setGenderItems] = useState([
    {label: 'Male', value: 'Male'},
    {label: 'Female', value: 'Female'},
    {label: 'Other', value: 'Other'},
  ]);
  const [languageItems, setLanguageItems] = useState([
    {label: 'English', value: 'English'},
    {label: 'Hindi', value: 'Hindi'},
    {label: 'Marathi', value: 'Marathi'},
    {label: 'Tamil', value: 'Tamil'},
    {label: 'Telugu', value: 'Telugu'},
    {label: 'Bengali', value: 'Bengali'},
    {label: 'Gujarati', value: 'Gujarati'},
    {label: 'Malayalam', value: 'Malayalam'},
    {label: 'Kannada', value: 'Kannada'},
    {label: 'Punjabi', value: 'Punjabi'},
    {label: 'Assamese', value: 'Assamese'},
  ]);

  const [location, setLocation] = useState({lat: 0, lon: 0});
  useEffect(() => {
    const requestLocationPermission = async () => {
      try {
        const permission =
          Platform.OS === 'ios'
            ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
            : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

        const result = await check(permission);
        if (result === RESULTS.GRANTED) {
          fetchLocation();
        } else {
          const requestResult = await request(permission);
          if (requestResult === RESULTS.GRANTED) {
            fetchLocation();
          } else {
            Toast.show({
              type: 'error',
              text1: 'Location Permission Denied',
              text2:
                'Please enable location permissions to update your location.',
            });
          }
        }
      } catch (err) {
        console.log('Permission Error:', err);
        Toast.show({
          type: 'error',
          text1: 'Permission Error',
          text2: 'Failed to request location permission.',
        });
      }
    };

    const fetchLocation = () => {
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          setLocation({lat: latitude, lon: longitude});
        },
        error => {
          console.log('Geolocation Error:', error);
          Toast.show({
            type: 'error',
            text1: 'Location Error',
            text2: 'Unable to fetch current location.',
          });
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    };

    requestLocationPermission();
  }, []);

  const addLanguage = () => {
    if (selectedLanguage && !languagesSpoken.includes(selectedLanguage)) {
      setLanguagesSpoken([...languagesSpoken, selectedLanguage]);
      setSelectedLanguage(null);
      Toast.show({
        type: 'success',
        text1: t('UpPage.language_added_msg'),
      });
    }
  };

  const removeLanguage = language => {
    setLanguagesSpoken(languagesSpoken.filter(lang => lang !== language));
  };

  //dob
  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleDateConfirm = date => {
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
    setDob(formattedDate);
    hideDatePicker();
  };

  const updateProfilePicture = async () => {
    try {
      launchImageLibrary(
        {
          mediaType: 'photo',
          quality: 0.8,
          includeBase64: true,
        },
        async response => {
          if (response.didCancel) {
            console.log('User cancelled image picker');
          } else if (response.errorCode) {
            console.log('ImagePicker Error: ', response.errorCode);
            Toast.show({
              type: 'error',
              text1: t('UpPage.edit_profile_pic_error'),
              text2: t('UpPage.image_picker_error_msg'),
            });
          } else {
            const {uri, base64} = response.assets[0];
            console.log('Image URI:', uri);

            const dataURI = `data:image/jpeg;base64,${base64}`;
            const updateResult = await updateProfilePic(dataURI);

            if (updateResult.success) {
              Toast.show({
                type: 'success',
                text1: t('UpPage.profile_pic_updated'),
              });
            } else {
              Toast.show({
                type: 'error',
                text1: t('UpPage.edit_profile_pic_error'),
                text2: updateResult.message,
              });
            }
            if (updateResult.success) {
              navigation.goBack();
            }
          }
        },
      );
    } catch (err) {
      console.log(err);
      Toast.show({
        type: 'error',
        text1: t('UpPage.edit_profile_pic_error'),
        text2: t('UpPage.image_picker_error_msg'),
      });
    }
  };

  const updateProfileData = async () => {
    const updatedData = {
      username,
      role,
      gender,
      bio,
      dob,
      location: {
        lat: location?.lat,
        lon: location?.lon,
        address,
        city,
        state,
        country,
        pincode,
      },
      governmentId: {
        idName,
        idValue,
      },
      socialLinks: {
        facebook,
        instagram,
      },
      languageSpoken: languagesSpoken,
    };

    try {
      const result = await updateUser(updatedData);
      Toast.show({
        type: result.success ? 'success' : 'error',
        text1: result.message,
        text2: result.success
          ? t('UpPage.profile_updated_success_msg')
          : t('UpPage.profile_updated_error_msg'),
      });
      if (result.success) {
        navigation.goBack();
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('UpPage.update_failed'),
        text2: err.message || t('UpPage.profile_updated_error_msg'),
      });
    }
  };

  const renderProfilePic = () => {
    if (profilePic) {
      return <Image source={{uri: profilePic}} style={styles.profilePic} />;
    }
    return (
      <View style={[styles.profilePic, styles.profileInitial]}>
        <Text style={styles.profileInitialText}>
          {username ? username[0].toUpperCase() : 'U'}
        </Text>
      </View>
    );
  };

  const renderLanguageItem = ({item}) => (
    <View style={styles.languageItem}>
      <Text style={styles.languageText}>{item}</Text>
      <TouchableOpacity onPress={() => removeLanguage(item)}>
        <Text style={styles.removeLanguage}>
          {t('UpPage.language_remove_msg')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: '#fff'}}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Image
            source={require('../assets/icons/back.png')}
            style={{width: 25, height: 25}}
          />
        </TouchableOpacity>
        <Text style={styles.appName}>{t('UpPage.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, {paddingHorizontal: 24}]}>
        {/* Profile Picture */}
        <View style={styles.profilePicContainer}>
          {renderProfilePic()}
          <TouchableOpacity
            style={styles.editPicButton}
            onPress={updateProfilePicture}>
            <Text style={styles.editPicText}>
              {t('UpPage.change_picture_text')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>{t('UpPage.desc')}</Text>

        <TextInput
          placeholder={t('UpPage.username_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
        />

        <View
          style={[
            styles.rowDropdowns,
            {
              zIndex: openRole
                ? 999
                : openGender
                ? 998
                : openLanguage
                ? 997
                : 1,
            },
          ]}>
          <View style={{flex: 1}}>
            <DropDownPicker
              open={openRole}
              value={role}
              items={roleItems}
              setOpen={setOpenRole}
              setValue={setRole}
              setItems={setRoleItems}
              placeholder="Select Role*"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>
          <View style={{flex: 1}}>
            <DropDownPicker
              open={openGender}
              value={gender}
              items={genderItems}
              setOpen={setOpenGender}
              setValue={setGender}
              setItems={setGenderItems}
              placeholder="Select Gender*"
              style={styles.dropdown}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
          </View>
        </View>
        <TouchableOpacity
          style={styles.input}
          onPress={showDatePicker}
          disabled={loading}>
          <View style={styles.dateInputRow}>
            <Text style={[styles.dateText, !dob && styles.placeholderText]}>
              {dob || t('postHarvest.fields.dob')}
            </Text>
          </View>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={hideDatePicker}
          textColor={theme.text}
          headerTextIOS="Pick a date"
          confirmTextIOS="Confirm"
          cancelTextIOS="Cancel"
          confirmTextStyle={{
            color: theme.primary,
            fontSize: theme.fs6,
            fontFamily: theme.font.bold,
          }}
          cancelTextStyle={{
            color: theme.text2,
            fontSize: theme.fs6,
            fontFamily: theme.font.regular,
          }}
          accentColor={theme.primary}
          buttonTextColorIOS={theme.primary}
          maximumDate={
            new Date(new Date().setFullYear(new Date().getFullYear() - 18))
          }
        />
        <TextInput
          placeholder={t('UpPage.bio_placeholder')}
          placeholderTextColor={theme.text3}
          style={[styles.input, {height: 100}]}
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <View style={styles.languageContainer}>
          <Text style={styles.languageLabel}>
            {t('UpPage.languages_spoken_label')}
          </Text>
          <View style={styles.languagePickerContainer}>
            <DropDownPicker
              open={openLanguage}
              value={selectedLanguage}
              items={languageItems}
              setOpen={setOpenLanguage}
              setValue={setSelectedLanguage}
              setItems={setLanguageItems}
              placeholder={t('UpPage.language_picker_placeholder')}
              style={styles.dropdown2}
              textStyle={styles.dropdownText}
              dropDownContainerStyle={styles.dropdownContainer}
            />
            <TouchableOpacity
              style={styles.addLanguageButton}
              onPress={addLanguage}
              disabled={!selectedLanguage}>
              <Text style={styles.addLanguageText}>Add</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={languagesSpoken}
            renderItem={renderLanguageItem}
            keyExtractor={item => item}
            style={styles.languageList}
            ListEmptyComponent={
              <Text style={styles.noLanguages}>
                {t('UpPage.no_languages_added')}
              </Text>
            }
          />
        </View>

        <TextInput
          placeholder={t('UpPage.address_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={address}
          onChangeText={setAddress}
        />

        <TextInput
          placeholder={t('UpPage.city_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={city}
          onChangeText={setCity}
        />

        <TextInput
          placeholder={t('UpPage.state_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={state}
          onChangeText={setState}
        />

        <TextInput
          placeholder={t('UpPage.country_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={country}
          onChangeText={setCountry}
        />

        <TextInput
          placeholder={t('UpPage.pincode_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={pincode}
          onChangeText={setPincode}
          keyboardType="numeric"
        />

        <TextInput
          placeholder={t('UpPage.facebook_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={facebook}
          onChangeText={setFacebook}
        />

        <TextInput
          placeholder={t('UpPage.instagram_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={instagram}
          onChangeText={setInstagram}
        />

        <TextInput
          placeholder={t('UpPage.gov_id_name_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={idName}
          onChangeText={setIdName}
        />

        <TextInput
          placeholder={t('UpPage.gov_id_value_placeholder')}
          placeholderTextColor={theme.text3}
          style={styles.input}
          value={idValue}
          onChangeText={setIdValue}
        />
      </ScrollView>

      <View style={{padding: 20}}>
        <TouchableOpacity
          style={styles.signupButton}
          onPress={updateProfileData}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signupText}>
              {t('UpPage.update_profile_button')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'column',
    backgroundColor: '#fff',
    gap: 7,
    marginBottom: -10,
  },
  backButton: {
    padding: 10,
    backgroundColor: theme.darkBrown,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.9,
    width: 50,
  },
  appName: {
    fontSize: theme.fs0,
    fontFamily: theme.font.dark,
    color: theme.text2,
  },
  form: {
    paddingBottom: 20,
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
    fontSize: theme.fs6,
    backgroundColor: '#fff',
    color: theme.text,
    fontFamily: theme.font.regular,
    paddingTop: 14,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIcon: {
    marginRight: 8,
  },
  dateText: {
    fontSize: theme.fs6,
    color: theme.text,
    fontFamily: theme.font.regular,
  },
  placeholderText: {
    color: theme.text3,
    marginTop: 2,
  },
  rowDropdowns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  dropdown: {
    borderColor: theme.border,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  dropdown2: {
    borderColor: theme.border,
    borderRadius: 3,
    backgroundColor: '#fff',
    width: '70%',
  },
  dropdownText: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs6,
    color: theme.text,
  },
  dropdownContainer: {
    borderColor: theme.border,
  },
  signupButton: {
    backgroundColor: theme.secondary,
    padding: 14,
    borderRadius: 5,
    marginTop: 10,
    alignItems: 'center',
  },
  signupText: {
    color: '#fff',
    fontSize: theme.fs5,
    fontFamily: theme.font.bold,
  },
  profilePicContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.border,
  },
  profileInitial: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialText: {
    fontSize: 40,
    color: theme.text2,
    fontFamily: theme.font.bold,
    marginTop: 9,
  },
  editPicButton: {
    marginTop: 10,
  },
  editPicText: {
    color: theme.darkBrown,
    fontFamily: theme.font.bold,
    fontSize: theme.fs6,
  },
  languageContainer: {
    marginVertical: 8,
  },
  languageLabel: {
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
    color: theme.text2,
    marginBottom: 8,
  },
  languagePickerContainer: {
    flexDirection: 'row',
  },
  addLanguageButton: {
    backgroundColor: theme.primary,
    padding: 10,
    borderRadius: 3,
    justifyContent: 'center',
    alignItems: 'center',
    width: '30%',
    marginLeft: -90,
  },
  addLanguageText: {
    color: '#fff',
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
  },
  languageList: {
    marginTop: 8,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  languageText: {
    fontSize: theme.fs6,
    color: theme.text,
    fontFamily: theme.font.regular,
  },
  removeLanguage: {
    color: theme.darkBrown,
    fontSize: theme.fs6,
    fontFamily: theme.font.bold,
  },
  noLanguages: {
    fontSize: theme.fs6,
    color: theme.text3,
    fontFamily: theme.font.regular,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default UpdateProfile;
