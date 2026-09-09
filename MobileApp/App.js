import React, {useEffect, useState, useContext} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {
  StatusBar,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import {SafeAreaProvider, useSafeAreaInsets} from 'react-native-safe-area-context';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
import Signup from './pages/Signup';
import Toast from 'react-native-toast-message';
import Welcome from './pages/Welcome';
import CustomToast from './components/CustomToast';
import Login from './pages/Login';
import {UserProvider, UserContext} from './context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {theme} from './theme.config';
import changeNavigationBarColor from 'react-native-navigation-bar-color';
import NetInfo from '@react-native-community/netinfo';
import BottomTabNavigator from './components/BottomTabNavigator';
import Settings from './pages/Settings';
import UpdateProfile from './pages/UpdateProfile';
import PostHarvest from './pages/PostHarvest';
import Chatbot from './pages/Chatbot';
import Profile from './pages/Profile';
import LanguageChange from './pages/LanguageChange';
import './i18n'; // Important: Must come before anything else using translations
import {I18nextProvider, useTranslation} from 'react-i18next';
import i18n from './i18n';
import Notifications from './pages/Notifications';
import Fertilizers from './pages/Fertilizers';
import News from './pages/News';
import CropSuggestion from './pages/CropSuggestion';
import Documents from './pages/Documents';
import PasswordChange from './pages/PasswordChange';
import WaterManagement from './pages/WaterManagement';
import Logistics from './pages/Logistics';

const Stack = createNativeStackNavigator();

const toastConfig = {
  success: props => <CustomToast {...props} />,
  error: props => <CustomToast {...props} />,
  info: props => <CustomToast {...props} />,
};

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: theme.paddy,
    secondary: theme.turmeric,
    background: theme.canvas,
    surface: theme.surface,
    error: theme.alert,
    onPrimary: theme.inkInverse,
    onSurface: theme.ink,
  },
};

const OfflineBanner = () => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.offlineBanner, {paddingTop: insets.top + 8}]}>
      <Text style={styles.offlineText}>{t('offlineBanner.text')}</Text>
    </View>
  );
};

// Main Navigator that loads after user state is determined
const MainNavigator = ({isConnected}) => {
  const {user, setUser} = useContext(UserContext);
  const [loadingStorage, setLoadingStorage] = useState(true);

  useEffect(() => {
    const loadUserFromStorage = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch {
      } finally {
        setLoadingStorage(false);
      }
    };
    loadUserFromStorage();
  }, []);

  if (loadingStorage) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar
          translucent
          backgroundColor={'transparent'}
          barStyle="dark-content"
        />
        <ActivityIndicator size={45} color={theme.paddy} />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <StatusBar
          translucent
          backgroundColor={'transparent'}
          barStyle="dark-content"
        />
        <Stack.Navigator screenOptions={{headerShown: false}} initialRouteName={user ? 'MainApp' : 'Welcome'}>
          {user ? (
            <Stack.Screen name="MainApp" component={BottomTabNavigator} />
          ) : null}
          {user ? <Stack.Screen name="Settings" component={Settings} /> : null}
          {user ? <Stack.Screen name="UpdateProfile" component={UpdateProfile} /> : null}
          <Stack.Screen name="Welcome" component={Welcome} />
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Signup" component={Signup} />
          {user ? <Stack.Screen name="PostHarvest" component={PostHarvest} /> : null}
          {user ? <Stack.Screen name="Profile" component={Profile} /> : null}
          {user ? <Stack.Screen name="Chatbot" component={Chatbot} /> : null}
          {user ? <Stack.Screen name="LanguageChange" component={LanguageChange} /> : null}
          {user ? <Stack.Screen name="Notifications" component={Notifications} /> : null}
          {user ? <Stack.Screen name="Fertilizers" component={Fertilizers} /> : null}
          {user ? <Stack.Screen name="CropSuggestion" component={CropSuggestion} /> : null}
          {user ? <Stack.Screen name="Documents" component={Documents} /> : null}
          {user ? <Stack.Screen name="PasswordChange" component={PasswordChange} /> : null}
          {user ? <Stack.Screen name="WaterManagement" component={WaterManagement} /> : null}
          {user ? <Stack.Screen name="Logistics" component={Logistics} /> : null}
        </Stack.Navigator>
      </NavigationContainer>
      {!isConnected && <OfflineBanner />}
    </>
  );
};

const App = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const status = state.isConnected;
      setIsConnected(status);
      changeNavigationBarColor(status ? theme.surface : theme.monsoon, true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={paperTheme}>
        <I18nextProvider i18n={i18n}>
          <UserProvider>
            <MainNavigator isConnected={isConnected} />
            <Toast config={toastConfig} />
          </UserProvider>
        </I18nextProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    backgroundColor: theme.canvas,
  },
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.monsoon,
    zIndex: 40,
    alignItems: 'center',
    paddingBottom: 10,
  },
  offlineText: {
    color: theme.inkInverse,
    fontSize: 15,
    fontFamily: theme.font.semi,
  },
});

export default App;
