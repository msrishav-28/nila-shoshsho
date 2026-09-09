import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StyleSheet, View} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Home from '../pages/Home';
import {theme} from '../theme.config';
import Schemes from '../pages/Schemes';
import Cropcare from '../pages/Cropcare';
import Market from '../pages/Market/Market';
import {useTranslation} from 'react-i18next';
import News from '../pages/News';
import VoiceSeed from './VoiceSeed';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.wrap}>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarActiveTintColor: theme.paddy,
          tabBarInactiveTintColor: theme.inkFaint,
          tabBarStyle: {
            backgroundColor: theme.surface,
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
            borderTopColor: theme.hairline,
            borderTopWidth: 1,
            elevation: 0,
          },
          tabBarIcon: ({color, focused}) => {
            const names = {
              Home: focused ? 'home' : 'home-outline',
              Scheme: focused ? 'albums' : 'albums-outline',
              Market: focused ? 'storefront' : 'storefront-outline',
              'Crop Care': focused ? 'leaf' : 'leaf-outline',
              News: focused ? 'newspaper' : 'newspaper-outline',
            };
            return (
              <Icon
                name={names[route.name] || 'ellipse-outline'}
                size={24}
                color={color}
              />
            );
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontFamily: theme.font.semi,
          },
        })}>
        <Tab.Screen
          name="Home"
          component={Home}
          options={{tabBarLabel: t('navigation.home')}}
        />
        <Tab.Screen
          name="Scheme"
          component={Schemes}
          options={{tabBarLabel: t('navigation.scheme')}}
        />
        <Tab.Screen
          name="Crop Care"
          component={Cropcare}
          options={{tabBarLabel: t('navigation.cropCare')}}
        />
        <Tab.Screen
          name="Market"
          component={Market}
          options={{tabBarLabel: t('navigation.market')}}
        />
        <Tab.Screen
          name="News"
          component={News}
          options={{tabBarLabel: t('navigation.news')}}
        />
      </Tab.Navigator>
      <VoiceSeed />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {flex: 1, backgroundColor: theme.canvas},
});

export default BottomTabNavigator;
