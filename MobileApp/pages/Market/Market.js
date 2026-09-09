import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StyleSheet, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import MarketPrices from './MarketPrices';
import NearbyStores from './NearbyStores';
import PriceComparison from './PriceComparison';
import MarketInsights from './MarketInsights';
import { theme } from '../../theme.config';
import { useTranslation } from 'react-i18next';

const Tab = createMaterialTopTabNavigator();

const Market = () => {
  const { t } = useTranslation();
  const route = useRoute();
  const initial = route.params?.screen || 'Prices';
  return (
    <View style={Styles.container}>
      <Tab.Navigator
        initialRouteName={initial}
        screenOptions={{
          tabBarActiveTintColor: theme.paddy,
          tabBarInactiveTintColor: theme.inkFaint,
          tabBarStyle: {
            backgroundColor: theme.surface,
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: theme.hairline,
          },
          tabBarIndicatorStyle: {
            backgroundColor: theme.turmeric,
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
          options={{ tabBarLabel: t('marketTabs.prices') }}
        />
        <Tab.Screen
          name="Stores"
          component={NearbyStores}
          options={{ tabBarLabel: t('marketTabs.stores') }}
        />
        <Tab.Screen
          name="Compare"
          component={PriceComparison}
          options={{ tabBarLabel: t('marketTabs.compare') }}
        />
        <Tab.Screen
          name="Insights"
          component={MarketInsights}
          options={{ tabBarLabel: t('marketTabs.insights') }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default Market;

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.canvas,
  },
})