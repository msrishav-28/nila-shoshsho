import React, {useContext, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useIsFocused} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {UserContext} from '../context/UserContext';
import {theme} from '../theme.config';
import {adviceLang} from '../utils/lang';
import {message, request, useAction} from './data';
import {choosePhoto, getLocation} from './device';
import {
  readAccountPreference,
  readVoicePreference,
  writeAccountPreference,
} from './accountPreferences';
import {
  Button,
  Card,
  Field,
  Icon,
  Illustration,
  Notice,
  Row,
  Screen,
  Select,
  Stack,
  Tabs,
  Text,
} from './ui';

const languages = [
  {label: 'English', value: 'en'},
  {label: 'हिन्दी', value: 'hi'},
  {label: 'मराठी', value: 'mr'},
  {label: 'தமிழ்', value: 'ta'},
  {label: 'বাংলা', value: 'bn'},
  {label: 'ಕನ್ನಡ', value: 'kn'},
  {label: 'తెలుగు', value: 'te'},
  {label: 'മലയാളം', value: 'ml'},
];

const spokenLanguages = [
  'English',
  'Hindi',
  'Marathi',
  'Tamil',
  'Bengali',
  'Kannada',
  'Telugu',
  'Malayalam',
  'Gujarati',
  'Punjabi',
  'Assamese',
];

const portraitOptions = [
  {label: 'Harvest', value: 'harvest', ready: true},
  {label: 'Paddy', value: 'paddy'},
  {label: 'Field', value: 'field', ready: true},
  {label: 'Grower', value: 'grower'},
  {label: 'Planter', value: 'planter'},
  {label: 'Carrier', value: 'carrier'},
];

const notificationTabs = [
  {label: 'Updates', value: 'Notifications'},
  {label: 'Preferences', value: 'NotificationPreferences'},
];

const notificationChoices = [
  {id: 'weather', title: 'Weather guidance', detail: 'rain and wind updates'},
  {id: 'crop', title: 'Crop monitoring', detail: 'new plot observations'},
  {id: 'market', title: 'Market updates', detail: 'followed crops and markets'},
];

const emptyNotifications = {weather: false, crop: false, market: false};
const emailInput = {
  keyboardType: 'email-address',
  autoCapitalize: 'none',
  autoComplete: 'email',
  autoCorrect: false,
};

function userError(result, fallback) {
  if (!result?.success) {
    const detail = result?.message;
    throw new Error(typeof detail === 'string' && detail ? detail : fallback);
  }
  return result;
}

function InlineError({error}) {
  return error ? (
    <Notice tone="error">
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite">
        {message(error)}
      </Text>
    </Notice>
  ) : null;
}

function authOptions(t) {
  return {
    roles: [
      {value: 'Farmer', label: t('signup.roleFarmer')},
      {value: 'Logistics', label: t('signup.roleLogistics')},
    ],
    genders: [
      {value: 'Male', label: t('signup.genderMale')},
      {value: 'Female', label: t('signup.genderFemale')},
      {value: 'Other', label: t('signup.genderOther')},
    ],
  };
}

function AccountWelcome({go}) {
  const {t} = useTranslation();
  return (
    <Screen title="Nila Shoshsho" eyebrow="NILA SHOSSHO" kind="auth">
      <Stack gap={16}>
        <Illustration name="welcome" style={styles.welcomeArt} />
        <Text variant="title">A little guidance. A better farming day.</Text>
        <Text>
          Crop care, market information and practical help, in one place.
        </Text>
        <Stack gap={12}>
          <View style={styles.inline}>
            <Icon name="mic" size={20} color={theme.paddy} />
            <Text style={styles.flex}>Ask in the language you use</Text>
          </View>
          <View style={styles.inline}>
            <Icon name="feather" size={20} color={theme.paddy} />
            <Text style={styles.flex}>Find your next step in the field</Text>
          </View>
        </Stack>
        <Button
          label={t('welcome.createAccount')}
          onPress={() => go('Signup')}
        />
        <Button
          variant="secondary"
          label={t('login.submit')}
          onPress={() => go('Login')}
        />
        <Text variant="small">Built for farmers across India</Text>
      </Stack>
    </Screen>
  );
}

function SignIn({go, back, create}) {
  const {t} = useTranslation();
  const {loginWithEmailPassword, signup} = useContext(UserContext);
  const {roles, genders} = authOptions(t);
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: '',
    gender: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const action = useAction();
  const change = name => value =>
    setForm(previous => ({...previous, [name]: value}));
  const submit = () =>
    action.run(async () => {
      const values = {
        ...form,
        username: form.username.trim(),
        email: form.email.trim(),
      };
      if (
        !values.email ||
        (create && (!values.username || !values.role || !values.gender))
      ) {
        throw new Error(
          t(create ? 'signup.requiredMsg' : 'login.emailRequiredMsg'),
        );
      }
      if (values.password.length < 8) {
        throw new Error(t('login.passwordMsg'));
      }

      const result = create
        ? await signup(values)
        : await loginWithEmailPassword({
            email: values.email,
            password: values.password,
          });
      userError(result, t(create ? 'signup.failedMsg' : 'login.failedMsg'));
    });

  return (
    <Screen
      title={create ? 'Create your account' : 'Welcome back'}
      back={back}
      kind="auth">
      <Stack gap={16}>
        <Text>
          {create
            ? 'Keep your farm details and guidance together.'
            : 'Log in to continue with your farm.'}
        </Text>
        {create && (
          <Field
            label="Name"
            placeholder="Your name"
            value={form.username}
            onChangeText={change('username')}
            autoComplete="name"
          />
        )}
        <Field
          {...emailInput}
          label={t('login.emailPlaceholder')}
          placeholder="Enter your email"
          value={form.email}
          onChangeText={change('email')}
        />
        <Field
          label={t('login.passwordPlaceholder')}
          placeholder={create ? 'Create a password' : 'Enter your password'}
          value={form.password}
          onChangeText={change('password')}
          autoComplete={create ? 'new-password' : 'current-password'}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!showPassword}
          onSubmitEditing={create ? undefined : submit}
        />
        {create && (
          <View style={styles.pair}>
            <View style={styles.flex}>
              <Select
                label="Role"
                placeholder={t('signup.rolePlaceholder')}
                options={roles}
                value={form.role}
                onChange={change('role')}
              />
            </View>
            <View style={styles.flex}>
              <Select
                label="Gender"
                placeholder={t('signup.genderPlaceholder')}
                options={genders}
                value={form.gender}
                onChange={change('gender')}
              />
            </View>
          </View>
        )}
        <Toggle
          title={t('login.showPassword')}
          value={showPassword}
          onChange={setShowPassword}
        />
        <InlineError error={action.error} />
        <Button
          label={
            action.pending
              ? create
                ? 'Creating account…'
                : 'Logging in…'
              : t(create ? 'welcome.createAccount' : 'login.submit')
          }
          onPress={submit}
          disabled={action.pending}
        />
        {create ? (
          <Button
            label="Already have an account? Log in"
            variant="ghost"
            onPress={() => go('Login')}
          />
        ) : (
          <Row
            title="Create an account"
            description="New to Nila Shoshsho?"
            onPress={() => go('Signup')}
          />
        )}
      </Stack>
    </Screen>
  );
}

function Toggle({title, description, value, onChange, disabled}) {
  return (
    <Row
      title={title}
      description={description}
      end={
        <Switch
          accessibilityLabel={title}
          disabled={disabled}
          value={value}
          onValueChange={onChange}
          trackColor={{true: theme.paddy, false: theme.hairline}}
          thumbColor={theme.surface}
        />
      }
    />
  );
}

function Settings({go, back, user}) {
  const {t} = useTranslation();
  const {logout} = useContext(UserContext);
  const action = useAction();
  return (
    <Screen title={t('settings')} back={back}>
      <Stack gap={16}>
        <Row
          title="Your profile"
          description="Photo, personal details and languages"
          onPress={() => go('Profile')}
        />
        {user?.role === 'Logistics' && user.carrierApproved === false ? (
          <Notice title="Carrier approval required">
            A staff review is needed before you can view or accept pickups.
          </Notice>
        ) : null}
        <Stack gap={0}>
          <Text variant="heading">Your farm and work</Text>
          <Row
            title="My farms"
            description="Crops, locations and sowing dates"
            onPress={() => go('FarmMonitoring')}
          />
          <Row
            title="Documents"
            description="Upload, view and translate"
            onPress={() => go('Documents')}
          />
          <Row
            title="Transport jobs"
            description="Post or accept a pickup"
            onPress={() => go('TransportJobs')}
          />
        </Stack>
        <Row
          title="Staff review"
          description="For authorized reviewers"
          onPress={() => go('StaffReview')}
        />
        <Stack gap={0}>
          <Text variant="heading">Preferences</Text>
          <Row
            title="Language"
            description="App language and voice"
            onPress={() => go('LanguageChange')}
          />
          <Row
            title="Password"
            description="Change your account password"
            onPress={() => go('PasswordChange')}
          />
          <Row
            title={t('notifications.header')}
            description="Choose which updates you receive"
            onPress={() => go('Notifications')}
          />
        </Stack>
        <InlineError error={action.error} />
        <Button
          label={action.pending ? 'Logging out…' : 'Log out'}
          icon="log-out"
          variant="secondary"
          disabled={action.pending}
          onPress={() =>
            action.run(async () =>
              userError(await logout(), t('settingsToasts.logoutErrorTitle')),
            )
          }
        />
      </Stack>
    </Screen>
  );
}

function usePortrait(user) {
  const [mode, setMode] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const identity = user?._id;
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) {
      return;
    }
    let active = true;
    readAccountPreference({_id: identity}, 'portrait')
      .then(saved => {
        if (active) {
          setMode(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [identity, focused]);
  return {
    mode: mode || (loaded && user?.profilePic ? 'photo' : 'initials'),
    loaded,
    setMode,
  };
}

function Avatar({user, mode, preview, round = false}) {
  const photo = preview || user?.profilePic;
  const initial = Array.from(
    user?.username?.trim() || 'U',
  )[0].toLocaleUpperCase();
  const artwork = portraitOptions.some(
    item => item.ready && item.value === mode,
  );
  const [failedPhoto, setFailedPhoto] = useState('');
  return (
    <View style={[styles.avatar, round && styles.round]}>
      {mode === 'photo' && photo && failedPhoto !== photo ? (
        <Image
          accessible={false}
          source={{uri: photo}}
          style={styles.avatarImage}
          onError={() => setFailedPhoto(photo)}
        />
      ) : artwork ? (
        <Illustration name={mode} style={styles.avatarImage} />
      ) : (
        <Text variant="title">{initial}</Text>
      )}
    </View>
  );
}

const profileSections = [
  {
    key: 'personal',
    title: 'Personal details',
    description: 'Name, role, gender and date of birth',
  },
  {
    key: 'languages',
    title: 'Languages',
    description: 'Choose the languages you speak',
  },
  {
    key: 'address',
    title: 'Address',
    description: 'Village, city, state and pincode',
  },
  {
    key: 'about',
    title: 'More about you',
    description: 'Bio and optional social links',
  },
  {
    key: 'verification',
    title: 'Verification',
    description: 'Identity details and account status',
  },
];

function Profile({go, back, user, portrait}) {
  const focused = useIsFocused();
  const {refreshProfile} = useContext(UserContext);
  const profile = useAction();
  const completion = useAction();
  const loadProfile = profile.run;
  const loadCompletion = completion.run;
  useEffect(() => {
    if (focused) {
      loadProfile(refreshProfile);
      loadCompletion(() => request('account', '/auth/profile-completion'));
    }
  }, [focused, loadCompletion, loadProfile, refreshProfile]);
  return (
    <Screen title="Your profile" back={back}>
      <Stack gap={16}>
        <View style={styles.inline}>
          <Avatar user={user} mode={portrait.mode} />
          <Stack gap={4} style={styles.flex}>
            <Text variant="heading">{user?.username || 'Your profile'}</Text>
            <Text variant="small">Photo or illustration is optional</Text>
          </Stack>
        </View>
        {Number.isFinite(completion.data?.percentage) ? (
          <Text variant="small">
            Profile {completion.data.percentage}% complete
          </Text>
        ) : null}
        <InlineError error={profile.error || completion.error} />
        <Button
          variant="secondary"
          label="Edit profile"
          icon="edit-3"
          onPress={() => go('UpdateProfile')}
        />
        <Stack gap={0}>
          {profileSections.map(({key, title, description}) => (
            <Row
              key={key}
              title={title}
              description={description}
              onPress={() => go('UpdateProfile', {section: key})}
            />
          ))}
        </Stack>
        <Card>
          <Stack gap={8}>
            <Text variant="label">Your picture, your choice</Text>
            <Text>
              Use initials, choose an illustration or upload a photo. Your
              language never chooses your appearance.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

function displayDate(date) {
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || '');
  return parts ? [parts[3], parts[2], parts[1]].join(' / ') : '';
}

function validBirthday(value) {
  if (!value.trim()) {
    return undefined;
  }
  const parts = /^(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{4})$/.exec(value.trim());
  if (!parts) {
    throw new Error('Enter your date of birth in day / month / year format.');
  }
  const iso = [parts[3], parts[2], parts[1]].join('-');
  const parsed = new Date(iso + 'T00:00:00Z');
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== iso ||
    parsed > new Date()
  ) {
    throw new Error('Enter a valid date of birth.');
  }
  return iso;
}

function initialProfile(user) {
  return {
    username: user?.username || '',
    gender: user?.gender || '',
    birthday: displayDate(user?.dob),
    bio: user?.bio || '',
    languageSpoken: user?.languageSpoken || [],
    location: {
      address: user?.location?.address || '',
      city: user?.location?.city || '',
      state: user?.location?.state || '',
      country: user?.location?.country || '',
      pincode: user?.location?.pincode || '',
    },
    socialLinks: {
      facebook: user?.socialLinks?.facebook || '',
      instagram: user?.socialLinks?.instagram || '',
    },
    governmentId: {
      idName: user?.governmentId?.idName || '',
      idValue: '',
    },
  };
}

function ProfileEdit({go, back, user, portrait, params}) {
  const {t} = useTranslation();
  const {refreshProfile, updateUser} = useContext(UserContext);
  const {genders} = authOptions(t);
  const [values, setValues] = useState(() => initialProfile(user));
  const [profileVersion, setProfileVersion] = useState(user?.profileVersion);
  const [conflict, setConflict] = useState(false);
  const [opened, setOpened] = useState(params?.section || 'personal');
  const [locationFix, setLocationFix] = useState(null);
  const [removeId, setRemoveId] = useState(false);
  const action = useAction();
  const locate = useAction();
  const reload = useAction();
  const change = name => next =>
    setValues(previous => ({...previous, [name]: next}));
  const changeGroup = (group, name) => next =>
    setValues(previous => ({
      ...previous,
      [group]: {...previous[group], [name]: next},
    }));
  const toggleSection = section =>
    setOpened(previous => {
      const aliases = {address: 'languages', verification: 'about'};
      return (aliases[previous] || previous) === section ? '' : section;
    });
  const locateHere = async () => {
    const fix = await locate.run(getLocation);
    if (fix) {
      setLocationFix({lat: fix.latitude, lon: fix.longitude});
    }
  };
  const save = async () => {
    const success = await action.run(async () => {
      const username = values.username.trim();
      const changedName = username !== (user?.username || '').trim();
      if (changedName && username.length < 3) {
        throw new Error('Name must be at least 3 characters.');
      }
      if (
        values.location.pincode.trim() &&
        !/^\d{5,10}$/.test(values.location.pincode.trim())
      ) {
        throw new Error('Enter a valid pincode.');
      }
      const {birthday, governmentId, location, ...form} = values;
      const changedLocation =
        locationFix ||
        Object.entries(location).some(
          ([field, value]) =>
            value.trim() !== (user?.location?.[field] || '').trim(),
        );
      const savedId = user?.governmentId?.idValue || '';
      const enteredId = governmentId.idValue.trim();
      const changedIdName =
        governmentId.idName.trim() !== (user?.governmentId?.idName || '');
      if (
        !removeId &&
        ((enteredId &&
          (!governmentId.idName.trim() || enteredId.startsWith('*'))) ||
          (savedId && changedIdName && !enteredId))
      ) {
        throw new Error(
          'Enter the ID type and full number to update verification.',
        );
      }
      const changedId = removeId || Boolean(enteredId) || changedIdName;
      const nextId = removeId
        ? {idName: '', idValue: ''}
        : {idName: governmentId.idName.trim(), idValue: enteredId};
      try {
        return await updateUser({
          ...form,
          profileVersion,
          username: changedName ? username : undefined,
          location: changedLocation ? {...location, ...locationFix} : undefined,
          dob: validBirthday(birthday),
          ...(changedId && {governmentId: nextId}),
        });
      } catch (error) {
        if (error?.status === 409) {
          setConflict(true);
        }
        throw error;
      }
    });
    if (success) {
      back();
    }
  };

  const reloadForm = async () => {
    const fresh = await reload.run(refreshProfile);
    if (fresh) {
      setValues(initialProfile(fresh));
      setProfileVersion(fresh.profileVersion);
      setLocationFix(null);
      setRemoveId(false);
      setConflict(false);
      action.reset();
    }
  };

  return (
    <Screen title="Edit profile" back={back}>
      <Stack gap={16}>
        <View style={styles.inline}>
          <Avatar user={user} mode={portrait.mode} />
          <View style={styles.flex}>
            <Row
              title="Change picture"
              description="Initials, illustration or photo"
              onPress={() => go('ChooseProfilePicture')}
            />
          </View>
        </View>
        {opened !== 'personal' && (
          <Row
            title="Personal details"
            description={profileSections[0].description}
            onPress={() => toggleSection('personal')}
          />
        )}
        {opened === 'personal' && (
          <>
            <Field
              label="Name"
              placeholder="Your name"
              value={values.username}
              onChangeText={change('username')}
            />
            <View style={styles.pair}>
              <View style={styles.flex}>
                <Text variant="label">Account role</Text>
                <Text>{user?.role}</Text>
              </View>
              <View style={styles.flex}>
                <Select
                  label="Gender"
                  options={genders}
                  value={values.gender}
                  onChange={change('gender')}
                  placeholder="Select"
                />
              </View>
            </View>
            <Field
              label="Date of birth"
              placeholder="DD / MM / YYYY"
              value={values.birthday}
              onChangeText={change('birthday')}
            />
            <Field
              label="Bio"
              placeholder="A little about your farm"
              value={values.bio}
              onChangeText={change('bio')}
              maxLength={500}
              multiline
            />
          </>
        )}
        <Stack gap={0}>
          <Row
            title="Languages and address"
            description="Edit spoken languages and location"
            onPress={() => toggleSection('languages')}
          />
          {(opened === 'languages' || opened === 'address') && (
            <Card>
              <Stack gap={12}>
                <Text variant="label">Languages you speak</Text>
                {spokenLanguages.map(language => (
                  <Toggle
                    key={language}
                    title={language}
                    value={values.languageSpoken.includes(language)}
                    onChange={checked =>
                      setValues(previous => ({
                        ...previous,
                        languageSpoken: checked
                          ? [...previous.languageSpoken, language]
                          : previous.languageSpoken.filter(
                              item => item !== language,
                            ),
                      }))
                    }
                  />
                ))}
                <Text variant="label">Address</Text>
                {[
                  ['address', 'Village or street address'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['country', 'Country'],
                  ['pincode', 'Pincode'],
                ].map(([key, label]) => (
                  <Field
                    key={key}
                    label={label}
                    value={values.location[key]}
                    onChangeText={changeGroup('location', key)}
                    keyboardType={key === 'pincode' ? 'numeric' : 'default'}
                  />
                ))}
                <Button
                  label={
                    locate.pending
                      ? 'Finding location…'
                      : 'Use current location'
                  }
                  icon="map-pin"
                  variant="secondary"
                  onPress={locateHere}
                  disabled={locate.pending || action.pending}
                />
                {locationFix && (
                  <Text variant="small" tone="green">
                    Location captured. Save changes to use it for farm guidance.
                  </Text>
                )}
                <InlineError error={locate.error} />
              </Stack>
            </Card>
          )}
          <Row
            title="Optional details"
            description="Social links and verification details"
            onPress={() => toggleSection('about')}
          />
          {(opened === 'about' || opened === 'verification') && (
            <Card>
              <Stack gap={12}>
                <Text variant="label">Social links</Text>
                <Field
                  label="Facebook URL"
                  value={values.socialLinks.facebook}
                  onChangeText={changeGroup('socialLinks', 'facebook')}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Field
                  label="Instagram URL"
                  value={values.socialLinks.instagram}
                  onChangeText={changeGroup('socialLinks', 'instagram')}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <Text variant="label">
                  {user?.isVerified
                    ? 'Verified account'
                    : 'Verification details'}
                </Text>
                <Field
                  label="Government ID type"
                  value={values.governmentId.idName}
                  onChangeText={changeGroup('governmentId', 'idName')}
                  editable={!removeId}
                />
                <Field
                  label="Government ID number"
                  value={values.governmentId.idValue}
                  onChangeText={changeGroup('governmentId', 'idValue')}
                  autoComplete="off"
                  placeholder={
                    user?.governmentId?.idValue ||
                    'Enter only to update your ID'
                  }
                  editable={!removeId}
                  secureTextEntry
                />
                {user?.governmentId?.idValue ? (
                  <Toggle
                    title="Remove saved ID when you save"
                    value={removeId}
                    onChange={setRemoveId}
                  />
                ) : null}
              </Stack>
            </Card>
          )}
        </Stack>
        <InlineError error={action.error} />
        {conflict ? (
          <Stack gap={8}>
            <Text>
              Reloading replaces the changes you have entered on this screen.
            </Text>
            <Button
              label="Reload saved profile"
              variant="secondary"
              onPress={reloadForm}
              disabled={reload.pending}
            />
            <InlineError error={reload.error} />
          </Stack>
        ) : null}
        <Button
          label={action.pending ? 'Saving…' : 'Save changes'}
          onPress={save}
          disabled={action.pending || conflict}
        />
      </Stack>
    </Screen>
  );
}

function ChangeLanguage({go, back, user}) {
  const {i18n, t} = useTranslation();
  const [appLanguage, setAppLanguage] = useState(null);
  const [voiceLanguage, setVoiceLanguage] = useState('');
  const [loaded, setLoaded] = useState(false);
  const action = useAction();
  useEffect(() => {
    let active = true;
    readVoicePreference(user)
      .then(value => {
        if (active) {
          setVoiceLanguage(value);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) {
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const selectedLanguage =
    appLanguage || adviceLang(i18n.resolvedLanguage, i18n.language);
  const save = async () => {
    const saved = await action.run(async () => {
      const label = languages.find(
        item => item.value === selectedLanguage,
      )?.label;
      await writeAccountPreference(user, 'voiceLanguage', voiceLanguage);
      await AsyncStorage.multiSet([
        ['appLanguage', label],
        ['appLanguageValue', selectedLanguage],
      ]);
      await i18n.changeLanguage(selectedLanguage);
      return true;
    });
    if (saved) {
      back();
    }
  };
  return (
    <Screen title="Language" back={back}>
      <Stack gap={16}>
        <Text variant="title">Use Nila your way</Text>
        <Text>Choose the language you want to read and speak.</Text>
        <Select
          label="App language"
          placeholder={t('langPage.select')}
          value={selectedLanguage}
          onChange={setAppLanguage}
          options={languages}
        />
        <Select
          label="Voice language"
          value={voiceLanguage}
          onChange={setVoiceLanguage}
          options={[{label: 'Use app language', value: ''}, ...languages]}
          disabled={!loaded}
        />
        <InlineError error={action.error} />
        <Button
          label={action.pending ? 'Saving…' : 'Save language'}
          onPress={save}
          disabled={action.pending || !loaded}
        />
        <Card>
          <Stack gap={8}>
            <Text variant="label">Your profile stays yours</Text>
            <Text>
              Changing language does not change your picture or personal
              details.
            </Text>
          </Stack>
        </Card>
        <Row
          title="Languages you speak"
          description="Add or remove languages in your profile"
          onPress={() => go('UpdateProfile', {section: 'languages'})}
        />
      </Stack>
    </Screen>
  );
}

function ChangePassword({back}) {
  const {t} = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const action = useAction();
  const submit = async () => {
    const success = await action.run(async () => {
      if (!current || !next) {
        throw new Error(t('password.needBoth'));
      }
      if (next.length < 8) {
        throw new Error(t('password.tooShort'));
      }
      if (next !== confirmation) {
        throw new Error(t('password.mismatch'));
      }
      await request('account', '/auth/update-password', {
        method: 'PUT',
        body: {currentPassword: current, newPassword: next},
      });
      return true;
    });
    if (success) {
      setCurrent('');
      setNext('');
      setConfirmation('');
    }
  };
  return (
    <Screen title={t('password.title')} back={back}>
      <Stack gap={16}>
        <Text>{t('password.copy')}</Text>
        <Field
          label={t('password.current')}
          placeholder="Enter current password"
          value={current}
          onChangeText={setCurrent}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!show}
        />
        <Field
          label={t('password.next')}
          placeholder="Enter new password"
          value={next}
          onChangeText={setNext}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!show}
        />
        <Field
          label="Confirm password"
          placeholder="Enter it again"
          value={confirmation}
          onChangeText={setConfirmation}
          autoComplete="new-password"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={!show}
          onSubmitEditing={submit}
        />
        <Toggle title="Show passwords" value={show} onChange={setShow} />
        <InlineError error={action.error} />
        {action.data && <Notice tone="green">{t('password.success')}</Notice>}
        <Button
          label={action.pending ? 'Updating…' : t('password.submit')}
          onPress={submit}
          disabled={action.pending}
        />
      </Stack>
    </Screen>
  );
}

function ChoosePicture({back, user, portrait}) {
  const {updateProfilePic} = useContext(UserContext);
  const [choice, setChoice] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [selectError, setSelectError] = useState('');
  const action = useAction();
  const {width, fontScale} = useWindowDimensions();
  const twoColumns = width < 350 || fontScale >= 1.35;
  const mode = choice || portrait.mode;
  useEffect(() => () => photo?.cleanup?.(), [photo]);
  const pickPhoto = async () => {
    setSelectError('');
    let selected;
    try {
      selected = await choosePhoto({base64: true});
      if (selected) {
        if (!selected.base64) {
          throw new Error(
            'This image could not be read. Choose another photo.',
          );
        }
        const formats = ['image/jpeg', 'image/png', 'image/webp'];
        if (selected.type && !formats.includes(selected.type.toLowerCase())) {
          throw new Error('Choose a JPEG, PNG, or WebP photo.');
        }
        if (selected.base64.length > 2_500_000) {
          throw new Error('Choose a smaller photo.');
        }
        setPhoto(selected);
        setChoice('photo');
      }
    } catch (error) {
      selected?.cleanup?.();
      setSelectError(error.message || 'Could not select a photo.');
    }
  };
  const save = async () => {
    const result = await action.run(async () => {
      if (mode === 'photo' && photo) {
        const prefix = 'data:' + (photo.type || 'image/jpeg') + ';base64,';
        const data = photo.base64.startsWith('data:')
          ? photo.base64
          : prefix + photo.base64;
        userError(await updateProfilePic(data), 'Could not upload the photo.');
      }
      await writeAccountPreference(user, 'portrait', mode);
      portrait.setMode(mode);
      return true;
    });
    if (result) {
      back();
    }
  };
  const optionsByRow = twoColumns
    ? [
        portraitOptions.slice(0, 2),
        portraitOptions.slice(2, 4),
        portraitOptions.slice(4),
      ]
    : [portraitOptions.slice(0, 3), portraitOptions.slice(3)];
  return (
    <Screen title="Your picture" back={back}>
      <Stack gap={16}>
        <Text variant="title">Make it yours</Text>
        <Text>Keep your initials, choose an illustration or use a photo.</Text>
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{checked: mode === 'initials'}}
          onPress={() => setChoice('initials')}>
          <Card tone={mode === 'initials' ? 'green' : 'default'}>
            <View style={styles.inline}>
              <Avatar user={user} mode="initials" round />
              <Stack gap={4} style={styles.flex}>
                <Text variant="label">Use initials</Text>
                {mode === 'initials' && <Text variant="small">Selected</Text>}
              </Stack>
              {mode === 'initials' && <Icon name="check" />}
            </View>
          </Card>
        </Pressable>
        <Stack gap={12}>
          {optionsByRow.map((items, index) => (
            <View key={index} style={styles.pair}>
              {items.map(item => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: mode === item.value,
                    disabled: !item.ready,
                  }}
                  accessibilityLabel={
                    item.label +
                    (item.ready ? '' : ', illustration unavailable')
                  }
                  key={item.value}
                  style={styles.flex}
                  disabled={!item.ready}
                  onPress={() => setChoice(item.value)}>
                  <Card
                    tone={mode === item.value ? 'green' : 'default'}
                    style={styles.portraitCard}>
                    {item.ready ? (
                      <Illustration
                        name={item.value}
                        style={styles.portraitArt}
                      />
                    ) : (
                      <View
                        style={[
                          styles.portraitArt,
                          styles.portraitUnavailable,
                        ]}>
                        <Text
                          variant="caption"
                          tone="muted"
                          style={styles.center}>
                          Artwork unavailable
                        </Text>
                      </View>
                    )}
                    <Text variant="small" style={styles.center}>
                      {item.label}
                    </Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ))}
        </Stack>
        {mode === 'photo' && (
          <View style={styles.inline}>
            <Avatar user={user} mode="photo" preview={photo?.uri} round />
            <Text variant="label">Use photo</Text>
          </View>
        )}
        {user?.profilePic && mode !== 'photo' && (
          <Button
            label="Use saved photo"
            variant="ghost"
            onPress={() => {
              setChoice('photo');
              setPhoto(null);
            }}
            disabled={action.pending}
          />
        )}
        <Button
          label="Upload a photo"
          icon="image"
          variant="secondary"
          onPress={pickPhoto}
          disabled={action.pending}
        />
        <Text variant="small">
          You can change your picture at any time. Initials and illustrations
          are saved on this device.
        </Text>
        <InlineError error={selectError || action.error} />
        <Button
          label={action.pending ? 'Saving…' : 'Save picture'}
          onPress={save}
          disabled={action.pending || !portrait.loaded}
        />
      </Stack>
    </Screen>
  );
}

async function readNotificationPreferences(user) {
  const value = await readAccountPreference(user, 'notifications');
  if (!value) {
    return emptyNotifications;
  }
  const saved = JSON.parse(value);
  return {
    weather: saved?.weather === true,
    crop: saved?.crop === true,
    market: saved?.market === true,
  };
}

function NotificationPreferences({back, user}) {
  const {t} = useTranslation();
  const [choices, setChoices] = useState(emptyNotifications);
  const [completed, setCompleted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const action = useAction();
  useEffect(() => {
    let active = true;
    readNotificationPreferences(user)
      .then(saved => {
        if (active) {
          setChoices(saved);
        }
      })
      .catch(() => {
        if (active) {
          setLoadError('Saved preferences could not be read.');
        }
      })
      .finally(() => {
        if (active) {
          setCompleted(true);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);
  const save = async () => {
    const saved = await action.run(async () => {
      await writeAccountPreference(
        user,
        'notifications',
        JSON.stringify(choices),
      );
      return true;
    });
    if (saved) {
      back();
    }
  };
  return (
    <Screen title={t('notifications.header')} back={back}>
      <Stack gap={16}>
        <Tabs
          items={notificationTabs}
          value="NotificationPreferences"
          onChange={screen => {
            if (screen === 'Notifications') {
              back();
            }
          }}
        />
        <Text variant="title">Choose your updates</Text>
        <Text>Turn on only the information you want.</Text>
        <Stack gap={0}>
          {notificationChoices.map(({id, title, detail}) => (
            <Toggle
              key={id}
              title={title}
              description={(choices[id] ? 'On' : 'Off') + ' · ' + detail}
              value={choices[id]}
              disabled={!completed || action.pending}
              onChange={value =>
                setChoices(previous => ({...previous, [id]: value}))
              }
            />
          ))}
        </Stack>
        <Card>
          <Stack gap={8}>
            <Text variant="label">Your choice</Text>
            <Text>
              You can change these preferences at any time. They are saved on
              this device. Crop and market delivery will require service
              support.
            </Text>
          </Stack>
        </Card>
        {loadError && !action.data && <InlineError error={loadError} />}
        <InlineError error={action.error} />
        <Button
          label={action.pending ? 'Saving…' : 'Save preferences'}
          onPress={save}
          disabled={!completed || action.pending}
        />
      </Stack>
    </Screen>
  );
}

function NotificationUpdates({go, back, user}) {
  const {t} = useTranslation();
  const [items, setItems] = useState(null);
  const {run, error, pending} = useAction();
  const mark = useAction();
  const focused = useIsFocused();
  const identity = user?._id;
  const hasPlace =
    Number(user?.location?.lat) !== 0 &&
    Number(user?.location?.lon) !== 0 &&
    Number.isFinite(Number(user?.location?.lat)) &&
    Number.isFinite(Number(user?.location?.lon));
  const load = React.useCallback(async () => {
    const notifications = await run(async () => {
      if (hasPlace) {
        try {
          const choices = await readNotificationPreferences({_id: identity});
          if (choices.weather) {
            await request('account', '/notifications/weather-check', {
              method: 'POST',
            });
          }
        } catch {
          // The inbox can still show saved alerts when the weather refresh fails.
        }
      }
      const response = await request('account', '/notifications');
      return Array.isArray(response?.notifications)
        ? response.notifications
        : [];
    });
    if (notifications) {
      setItems(notifications);
    }
  }, [hasPlace, identity, run]);
  useEffect(() => {
    if (focused) {
      load();
    }
  }, [focused, load]);
  const markRead = async notification => {
    const id = notification.notification_id;
    const marked = await mark.run(async () => {
      await request(
        'account',
        '/notifications/' + encodeURIComponent(id) + '/read',
        {method: 'PUT'},
      );
      return true;
    });
    if (marked) {
      setItems(previous =>
        previous.map(item =>
          item.notification_id === id ? {...item, is_read: true} : item,
        ),
      );
    }
  };
  return (
    <Screen title={t('notifications.header')} back={back}>
      <Stack gap={16}>
        <Tabs
          items={notificationTabs}
          value="Notifications"
          onChange={screen => {
            if (screen === 'NotificationPreferences') {
              go(screen);
            }
          }}
        />
        <Text variant="title">Your farm updates</Text>
        {pending && (
          <ActivityIndicator
            color={theme.paddy}
            accessibilityLabel="Loading updates"
          />
        )}
        <InlineError error={error || mark.error} />
        {error && (
          <Button label="Try again" variant="secondary" onPress={load} />
        )}
        {items?.length === 0 && !pending && !error && (
          <>
            <Card>
              <Stack gap={8}>
                <Text variant="label">No updates yet</Text>
                <Text>
                  Add your farm to receive relevant weather and crop
                  information.
                </Text>
              </Stack>
            </Card>
            <Button
              label="Add your farm"
              variant="secondary"
              onPress={() => go('FarmSetup')}
            />
          </>
        )}
        {items?.map(item => (
          <Card
            key={item.notification_id}
            tone={item.is_read ? 'default' : 'green'}
            onPress={
              item.is_read || mark.pending ? undefined : () => markRead(item)
            }>
            <Stack gap={8}>
              <Text variant="label">{item.title}</Text>
              <Text>{item.body}</Text>
              {!item.is_read && <Text variant="small">Unread</Text>}
            </Stack>
          </Card>
        ))}
        <Stack gap={0}>
          <Row title="Weather" description="Rain and wind guidance" />
          <Row
            title="Crop monitoring"
            description="Updates when a usable observation is available"
          />
          <Row
            title="Markets"
            description="Updates for the markets you follow"
          />
        </Stack>
        <Text variant="small">
          You choose which updates to receive in Preferences.
        </Text>
      </Stack>
    </Screen>
  );
}

const screens = {
  Welcome: AccountWelcome,
  Login: SignIn,
  Signup: SignIn,
  Settings,
  Profile,
  UpdateProfile: ProfileEdit,
  LanguageChange: ChangeLanguage,
  PasswordChange: ChangePassword,
  Notifications: NotificationUpdates,
  NotificationPreferences,
  ChooseProfilePicture: ChoosePicture,
};

export function AccountScreen({screen, ...props}) {
  const portrait = usePortrait(props.user);
  const Component = screens[screen];
  return Component ? (
    <Component {...props} portrait={portrait} create={screen === 'Signup'} />
  ) : null;
}

const styles = StyleSheet.create({
  welcomeArt: {height: 230, width: '100%'},
  inline: {flexDirection: 'row', alignItems: 'center', gap: 12},
  pair: {alignItems: 'stretch', flexDirection: 'row', gap: 12},
  flex: {flex: 1, minWidth: 0},
  center: {textAlign: 'center'},
  avatar: {
    alignItems: 'center',
    backgroundColor: theme.paddySoft,
    borderRadius: theme.radius.lg,
    height: 80,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 80,
  },
  round: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.surface,
  },
  avatarImage: {height: '100%', width: '100%'},
  portraitCard: {padding: 8, gap: 8, alignItems: 'stretch'},
  portraitArt: {width: '100%', height: 100},
  portraitUnavailable: {justifyContent: 'center', alignItems: 'center'},
});
