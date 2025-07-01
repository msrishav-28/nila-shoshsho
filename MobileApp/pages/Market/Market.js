import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar, StyleSheet, View, Dimensions } from 'react-native';
import MarketPrices from './MarketPrices';
import NearbyStores from './NearbyStores';
import PriceComparison from './PriceComparison';
import MarketInsights from './MarketInsights';
import { theme } from '../../theme.config';
import Header from '../../components/Header';

const Tab = createMaterialTopTabNavigator();
const {width, height} = Dimensions.get('window');

const Market = () => {
  return (
    <View style={Styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: theme.white,
          tabBarInactiveTintColor: theme.card,
          tabBarStyle: {
            backgroundColor: theme.secondary,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarIndicatorStyle: {
            backgroundColor: theme.accent,
            height: 3,
          },
          tabBarLabelStyle: {
            fontFamily: theme.font.bold,
            fontSize: theme.fs7,
            textTransform: 'none',
          },
        }}
      >
        <Tab.Screen
          name="Prices"
          component={MarketPrices}
          options={{ tabBarLabel: 'Current Prices' }}
        />
        <Tab.Screen
          name="Stores"
          component={NearbyStores}
          options={{ tabBarLabel: 'Nearby Stores' }}
        />
        {/* <Tab.Screen
          name="Compare"
          component={PriceComparison}
          options={{ tabBarLabel: 'Compare' }}
        />
        <Tab.Screen
          name="Insights"
          component={MarketInsights}
          options={{ tabBarLabel: 'AI Insights' }}
        /> */}
      </Tab.Navigator>
    </View>
  );
};

export default Market;

const Styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    // width: width,
    height: height + StatusBar.currentHeight,
    // padding: width * 0.02,
    // paddingTop: StatusBar.currentHeight + width * 0.06,
    flexDirection: 'column',
    paddingTop: StatusBar.currentHeight,
    // padding: 0,
  },
})