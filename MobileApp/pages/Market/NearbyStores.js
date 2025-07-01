import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { theme } from '../../theme.config';

const storesData = [
  {
    id: '1',
    name: 'Green Harvest Co-op',
    distance: '2.5 km',
    rating: 4.7,
    type: 'wholesale',
    address: '123 Farm Road, Green Valley',
    contact: '+91 98765 43210',
    buyingCommodities: ['Wheat', 'Rice', 'Corn'],
    specializedIn: 'Grains',
    paymentTerms: 'Immediate cash payment',
    image: 'store',
  },
  {
    id: '2',
    name: 'Fresh Produce Market',
    distance: '4.8 km',
    rating: 4.5,
    type: 'retail',
    address: '456 Market Street, Riverside',
    contact: '+91 87654 32109',
    buyingCommodities: ['Tomatoes', 'Potatoes', 'Onions'],
    specializedIn: 'Vegetables',
    paymentTerms: '3-day payment cycle',
    image: 'basket',
  },
  {
    id: '3',
    name: 'AgriTech Supply Hub',
    distance: '3.2 km',
    rating: 4.8,
    type: 'wholesale',
    address: '789 Tech Road, Innovation Park',
    contact: '+91 76543 21098',
    buyingCommodities: ['Soybeans', 'Corn', 'Wheat'],
    specializedIn: 'Export quality grains',
    paymentTerms: 'Contract-based payment',
    image: 'tractor',
  },
  {
    id: '4',
    name: 'Village Farmers Market',
    distance: '1.9 km',
    rating: 4.2,
    type: 'retail',
    address: '101 Village Circle, Old Town',
    contact: '+91 65432 10987',
    buyingCommodities: ['Onions', 'Potatoes', 'Tomatoes'],
    specializedIn: 'Local produce',
    paymentTerms: 'Immediate cash payment',
    image: 'store-marker',
  },
  {
    id: '5',
    name: 'AgroCorp Exports',
    distance: '6.5 km',
    rating: 4.9,
    type: 'export',
    address: '202 Export Zone, Industrial Area',
    contact: '+91 54321 09876',
    buyingCommodities: ['Rice', 'Wheat', 'Soybeans'],
    specializedIn: 'International export',
    paymentTerms: 'Premium rates with 7-day payment',
    image: 'shopping',
  },
];

const filterOptions = [
  { label: 'All Stores', value: 'all' },
  { label: 'Wholesale', value: 'wholesale' },
  { label: 'Retail', value: 'retail' },
  { label: 'Export', value: 'export' },
];

const sortOptions = [
  { label: 'Distance: Nearest', value: 'distance' },
  { label: 'Rating: Highest', value: 'rating' },
];

const NearbyStores = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('distance');
  const [expandedStoreId, setExpandedStoreId] = useState(null);

  const filteredStores = storesData.filter(store => 
    selectedFilter === 'all' || store.type === selectedFilter
  );

  const sortedStores = [...filteredStores].sort((a, b) => {
    if (selectedSort === 'distance') {
      return parseFloat(a.distance) - parseFloat(b.distance);
    } else {
      return b.rating - a.rating;
    }
  });

  const toggleStoreExpansion = (id) => {
    setExpandedStoreId(expandedStoreId === id ? null : id);
  };

  const renderStoreItem = ({ item }) => {
    const isExpanded = expandedStoreId === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.storeCard}
        onPress={() => toggleStoreExpansion(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.storeBasicInfo}>
          <View style={styles.storeIconContainer}>
            <Icon name={item.image} size={36} color={theme.secondary} style={styles.storeIcon} />
          </View>
          <View style={styles.storeDetails}>
            <Text style={styles.storeName}>{item.name}</Text>
            <View style={styles.storeTypeContainer}>
              <Text style={styles.storeType}>
                {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
              </Text>
            </View>
            <View style={styles.storeMetrics}>
              <View style={styles.metric}>
                <Icon name="map-marker" size={14} color={theme.secondary} />
                <Text style={styles.metricText}>{item.distance}</Text>
              </View>
              <View style={styles.metric}>
                <Icon name="star" size={14} color={theme.accent} />
                <Text style={styles.metricText}>{item.rating}</Text>
              </View>
            </View>
          </View>
          <View style={styles.expandIconContainer}>
            <Icon 
              name={isExpanded ? 'chevron-up' : 'chevron-down'} 
              size={24} 
              color={theme.secondary}
            />
          </View>
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.expandedSection}>
              <Icon name="map-marker" size={18} color={theme.secondary} style={styles.expandedIcon} />
              <Text style={styles.expandedText}>{item.address}</Text>
            </View>
            <View style={styles.expandedSection}>
              <Icon name="phone" size={18} color={theme.secondary} style={styles.expandedIcon} />
              <Text style={styles.expandedText}>{item.contact}</Text>
            </View>
            <View style={styles.expandedSection}>
              <Icon name="cart" size={18} color={theme.secondary} style={styles.expandedIcon} />
              <Text style={styles.expandedText}>Buying: {item.buyingCommodities.join(', ')}</Text>
            </View>
            <View style={styles.expandedSection}>
              <Icon name="tag-multiple" size={18} color={theme.secondary} style={styles.expandedIcon} />
              <Text style={styles.expandedText}>Specialized in: {item.specializedIn}</Text>
            </View>
            <View style={styles.expandedSection}>
              <Icon name="cash" size={18} color={theme.secondary} style={styles.expandedIcon} />
              <Text style={styles.expandedText}>{item.paymentTerms}</Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="phone" size={16} color={theme.white} />
                <Text style={styles.actionButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.directionButton]}>
                <Icon name="directions" size={16} color={theme.white} />
                <Text style={styles.actionButtonText}>Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Filter by</Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={filterOptions}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Filter stores"
            value={selectedFilter}
            onChange={item => {
              setSelectedFilter(item.value);
            }}
            renderLeftIcon={() => (
              <Icon
                name="filter-variant"
                size={18}
                color={theme.secondary}
                style={styles.dropdownIcon}
              />
            )}
          />
        </View>
        
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Sort by</Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            data={sortOptions}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Sort stores"
            value={selectedSort}
            onChange={item => {
              setSelectedSort(item.value);
            }}
            renderLeftIcon={() => (
              <Icon
                name="sort"
                size={18}
                color={theme.secondary}
                style={styles.dropdownIcon}
              />
            )}
          />
        </View>
      </View>
      
      {sortedStores.length === 0 ? (
        <View style={styles.noStoresContainer}>
          <Icon name="store-off" size={60} color={theme.text3} />
          <Text style={styles.noStoresText}>No stores found matching your criteria</Text>
        </View>
      ) : (
        <FlatList
          data={sortedStores}
          renderItem={renderStoreItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.storesList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    padding: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dropdownWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  dropdownLabel: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs7,
    color: theme.text,
    marginBottom: 4,
  },
  dropdown: {
    height: 40,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: theme.r3,
    paddingHorizontal: 8,
    backgroundColor: theme.white,
  },
  dropdownIcon: {
    marginRight: 8,
  },
  placeholderStyle: {
    fontSize: theme.fs7,
    color: theme.text3,
    fontFamily: theme.font.regular,
  },
  selectedTextStyle: {
    fontSize: theme.fs7,
    color: theme.text,
    fontFamily: theme.font.regular,
  },
  storesList: {
    paddingBottom: 16,
  },
  storeCard: {
    backgroundColor: theme.white,
    borderRadius: theme.r2,
    marginBottom: 12,
    padding: 12,
    elevation: 2,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  storeBasicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIconContainer: {
    backgroundColor: `${theme.secondary}15`,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeDetails: {
    flex: 1,
    marginLeft: 12,
  },
  storeName: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs5,
    color: theme.text,
    marginBottom: 4,
  },
  storeTypeContainer: {
    backgroundColor: `${theme.secondary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.r3,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  storeType: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs7,
    color: theme.secondary,
  },
  storeMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  metricText: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs7,
    color: theme.text2,
    marginLeft: 4,
  },
  expandIconContainer: {
    padding: 8,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  expandedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandedIcon: {
    marginRight: 8,
    width: 22,
  },
  expandedText: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs6,
    color: theme.text,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  // Continuing the styles from NearbyStores.js
  actionButton: {
    backgroundColor: theme.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.r3,
    flex: 1,
    marginHorizontal: 4,
  },
  directionButton: {
    backgroundColor: theme.accent,
  },
  actionButtonText: {
    fontFamily: theme.font.bold,
    fontSize: theme.fs7,
    color: theme.white,
    marginLeft: 6,
  },
  noStoresContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noStoresText: {
    fontFamily: theme.font.regular,
    fontSize: theme.fs5,
    color: theme.text3,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default NearbyStores;