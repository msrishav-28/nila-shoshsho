import React, {useCallback, useContext, useEffect, useState} from 'react';
import {StatusBar} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import './i18n';
import {UserContext, UserProvider} from './context/UserContext';
import {theme} from './theme.config';
import {AccountScreen} from './refined/AccountScreens';
import {MarketScreen} from './refined/MarketScreens';
import {TaskScreen} from './refined/TaskScreens';
import {HomeScreen, StartupScreen} from './refined/HomeScreen';
import {AskNilaScreen} from './refined/AskNilaScreen';
import {CropCareScreen} from './refined/CropCareScreen';

const Navigator = createNativeStackNavigator();
const SessionContext = React.createContext(null);
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: theme.paddy,
    background: theme.canvas,
    text: theme.ink,
    card: theme.surface,
  },
};
const primaryRoutes = ['Home', 'Schemes', 'CropCare', 'Market', 'News'];
const routes = {
  Home: HomeScreen,
  Schemes: MarketScreen,
  CropCare: CropCareScreen,
  Market: MarketScreen,
  News: MarketScreen,
  AskNila: AskNilaScreen,
  Settings: AccountScreen,
  Profile: AccountScreen,
  UpdateProfile: AccountScreen,
  LanguageChange: AccountScreen,
  PasswordChange: AccountScreen,
  Notifications: AccountScreen,
  NotificationPreferences: AccountScreen,
  ChooseProfilePicture: AccountScreen,
  CropPlanning: TaskScreen,
  WaterSoil: TaskScreen,
  AfterHarvest: TaskScreen,
  Documents: TaskScreen,
  DocumentTranslate: TaskScreen,
  TransportJobs: TaskScreen,
  FarmSetup: TaskScreen,
  FarmMonitoring: TaskScreen,
};
const authRoutes = ['Welcome', 'Login', 'Signup'];
const screenOptions = {
  headerShown: false,
  contentStyle: {backgroundColor: theme.canvas},
};

function RoutedScreen() {
  const {name: screen, params} = useRoute();
  const navigation = useNavigation();
  const {user, setUser} = useContext(UserContext);
  const session = useContext(SessionContext);
  const go = useCallback(
    (target, values) => {
      if (target === screen && !values) {
        return;
      }
      if (target === 'Home' && !values) {
        navigation.popToTop();
      } else if (
        primaryRoutes.includes(target) &&
        primaryRoutes.includes(screen)
      ) {
        if (screen === 'Home') {
          navigation.navigate(target, values);
        } else {
          navigation.replace(target, values);
        }
      } else if (target === 'Welcome' && !values) {
        navigation.popToTop();
      } else {
        navigation.navigate(target, values);
      }
    },
    [navigation, screen],
  );
  const back = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (user && screen !== 'Home') {
      navigation.replace('Home');
    } else if (!user && screen !== 'Welcome') {
      navigation.replace('Welcome');
    }
  }, [navigation, screen, user]);
  const Component = routes[screen] || AccountScreen;
  return (
    <Component {...session} {...{screen, params, go, back, user, setUser}} />
  );
}

function SessionApp() {
  const {user, setUser} = useContext(UserContext);
  const [booting, setBooting] = useState(true);
  const [offline, setOffline] = useState(false);
  const [savedFarm, setSavedFarm] = useState(null);
  const [draft, setDraft] = useState(null);
  const id = user?.id || user?._id || user?.email;
  const farmKey = id ? `refined.farm.${id}` : null;
  const farm = farmKey && savedFarm?.key === farmKey ? savedFarm.value : null;
  const voiceDraft = id && draft?.id === id ? draft.text : '';
  const setVoiceDraft = useCallback(
    text => setDraft(text ? {id, text} : null),
    [id],
  );

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const value = await AsyncStorage.getItem('user');
        const session = value ? JSON.parse(value) : null;
        if (active && session && typeof session === 'object') {
          setUser(session);
        }
      } catch {
        await AsyncStorage.multiRemove(['user', 'accessToken']).catch(() => {});
      } finally {
        if (active) {
          setBooting(false);
        }
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, [setUser]);

  useEffect(
    () =>
      NetInfo.addEventListener(state => {
        setOffline(
          state.isConnected === false || state.isInternetReachable === false,
        );
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    if (farmKey) {
      AsyncStorage.getItem(farmKey)
        .then(value => {
          if (active) {
            setSavedFarm(previous =>
              previous?.key === farmKey
                ? previous
                : {key: farmKey, value: value ? JSON.parse(value) : null},
            );
          }
        })
        .catch(() => {});
    } else {
      setSavedFarm(null);
      setDraft(null);
    }
    return () => {
      active = false;
    };
  }, [farmKey]);

  const setFarm = useCallback(
    async value => {
      if (!farmKey) {
        throw new Error('Sign in to save your farm.');
      }
      if (value) {
        await AsyncStorage.setItem(farmKey, JSON.stringify(value));
      } else {
        await AsyncStorage.removeItem(farmKey);
      }
      setSavedFarm({key: farmKey, value});
    },
    [farmKey],
  );

  if (booting) {
    return <StartupScreen />;
  }
  const names = user ? Object.keys(routes) : authRoutes;
  return (
    <SessionContext.Provider
      value={{offline, farm, setFarm, voiceDraft, setVoiceDraft}}>
      <NavigationContainer theme={navigationTheme}>
        <Navigator.Navigator
          key={user ? `signed-in:${id}` : 'signed-out'}
          screenOptions={screenOptions}>
          {names.map(name => (
            <Navigator.Screen key={name} name={name} component={RoutedScreen} />
          ))}
        </Navigator.Navigator>
      </NavigationContainer>
    </SessionContext.Provider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <UserProvider>
        <SessionApp />
      </UserProvider>
    </SafeAreaProvider>
  );
}
