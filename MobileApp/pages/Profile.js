import React, { useContext } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme.config';
import { UserContext } from '../context/UserContext';

const Profile = () => {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Function to render profile picture or initial
  const renderProfilePic = () => {
    if (user?.profilePic) {
      return <Image source={{ uri: user.profilePic }} style={styles.profilePic} />;
    }
    return (
      <View style={[styles.profilePic, styles.profileInitial]}>
        <Text style={styles.profileInitialText}>
          {user?.username ? user.username[0].toUpperCase() : 'U'}
        </Text>
      </View>
    );
  };

  // Helper function to display field value or N/A
  const displayValue = (value) => {
    return value || t('profile.status.notAvailable');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../assets/icons/back.png')}
            style={{ width: 25, height: 25 }}
          />
        </TouchableOpacity>
        <Text style={styles.appName}>{t('profile.title')}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingHorizontal: 24 }]}
      >
        {/* Profile Picture */}
        <View style={styles.profilePicContainer}>
          {renderProfilePic()}
        </View>

        <Text style={styles.description}>
          {t('profile.description')}
        </Text>

        {/* Username */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.username')}</Text>
          <Text style={styles.value}>{displayValue(user?.username)}</Text>
        </View>

        {/* Role and Gender */}
        <View style={styles.row}>
          <View style={[styles.input, { flex: 1, marginRight: 4 }]}>
            <Text style={styles.label}>{t('profile.fields.role')}</Text>
            <Text style={styles.value}>{displayValue(user?.role)}</Text>
          </View>
          <View style={[styles.input, { flex: 1, marginLeft: 4 }]}>
            <Text style={styles.label}>{t('profile.fields.gender')}</Text>
            <Text style={styles.value}>{displayValue(user?.gender)}</Text>
          </View>
        </View>

        {/* Bio */}
        <View style={[styles.input, { height: 100 }]}>
          <Text style={styles.label}>{t('profile.fields.bio')}</Text>
          <Text style={styles.value}>{displayValue(user?.bio)}</Text>
        </View>

        {/* Address */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.address')}</Text>
          <Text style={styles.value}>{displayValue(user?.location?.address)}</Text>
        </View>

        {/* City */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.city')}</Text>
          <Text style={styles.value}>{displayValue(user?.location?.city)}</Text>
        </View>

        {/* State */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.state')}</Text>
          <Text style={styles.value}>{displayValue(user?.location?.state)}</Text>
        </View>

        {/* Country */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.country')}</Text>
          <Text style={styles.value}>{displayValue(user?.location?.country)}</Text>
        </View>

        {/* Pincode */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.pincode')}</Text>
          <Text style={styles.value}>{displayValue(user?.location?.pincode)}</Text>
        </View>

        {/* Facebook URL */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.facebookUrl')}</Text>
          <Text style={styles.value}>{displayValue(user?.socialLinks?.facebook)}</Text>
        </View>

        {/* Instagram URL */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.instagramUrl')}</Text>
          <Text style={styles.value}>{displayValue(user?.socialLinks?.instagram)}</Text>
        </View>

        {/* Government ID Name */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.governmentIdName')}</Text>
          <Text style={styles.value}>{displayValue(user?.governmentId?.idName)}</Text>
        </View>

        {/* Government ID Value */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.governmentIdValue')}</Text>
          <Text style={styles.value}>{displayValue(user?.governmentId?.idValue)}</Text>
        </View>

        {/* Additional Fields from User Object */}
        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.email')}</Text>
          <Text style={styles.value}>{displayValue(user?.email)}</Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.phoneNumber')}</Text>
          <Text style={styles.value}>{displayValue(user?.phoneNo)}</Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.verificationStatus')}</Text>
          <Text style={styles.value}>
            {user?.isVerified ? t('profile.status.verified') : t('profile.status.notVerified')}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.languagesSpoken')}</Text>
          <Text style={styles.value}>
            {user?.languageSpoken?.length > 0 ? user.languageSpoken.join(', ') : t('profile.status.notAvailable')}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.createdAt')}</Text>
          <Text style={styles.value}>
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('profile.status.notAvailable')}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.label}>{t('profile.fields.updatedAt')}</Text>
          <Text style={styles.value}>
            {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : t('profile.status.notAvailable')}
          </Text>
        </View>
      </ScrollView>
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
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 8,
  },
  label: {
    fontSize: theme.fs7,
    fontFamily: theme.font.bold,
    color: theme.text3,
    marginBottom: 4,
  },
  value: {
    fontSize: theme.fs6,
    fontFamily: theme.font.regular,
    color: theme.text,
  },
  profilePicContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  profilePic: {
    width: 150,
    height: 150,
    borderRadius: 50,
    backgroundColor: theme.border,
    objectFit: 'contain'
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
});

export default Profile;