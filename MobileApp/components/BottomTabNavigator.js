import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import Entypo from 'react-native-vector-icons/Entypo';
import Home from '../pages/Home';
import {theme} from '../theme.config';
import Schemes from '../pages/Schemes';
import Cropcare from '../pages/Cropcare';
import Market from '../pages/Market/Market';
import { useTranslation } from 'react-i18next';
import News from '../pages/News';

const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const {t} = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.secondary,
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          height: 60,
        },
        tabBarIcon: ({color, size}) => {
          switch (route.name) {
            case 'Home':
              return <Entypo name="home" size={23} color={color} />;
            case 'Scheme':
              return <Entypo name="archive" size={23} color={color} />;
            case 'Market':
              return <Entypo name="shop" size={23} color={color} />;
            case 'Crop Care':
              return <Entypo name="leaf" size={23} color={color} />;
            case 'News':
              return <Entypo name="news" size={23} color={color} />;
            default:
              return <Icon name="ellipse-outline" size={24} color={color} />;
          }
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 5,
          fontFamily: theme.font.bold,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{tabBarLabel: t('navigation.home')}}
      />
      <Tab.Screen
        name="Scheme"
        component={Schemes}
        options={{ tabBarLabel: t('navigation.scheme') }}
      />
      <Tab.Screen
        name="Crop Care"
        component={Cropcare}
        options={{ tabBarLabel: t('navigation.cropCare') }}
      />
      <Tab.Screen
        name="Market"
        component={Market}
        options={{ tabBarLabel: t('navigation.market') }}
      />
      <Tab.Screen
        name="News"
        component={News}
        options={{tabBarLabel: t('navigation.news')}}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
