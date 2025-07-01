import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Image } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dropdown } from 'react-native-element-dropdown';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme } from '../../theme.config';
import Groq from 'groq-sdk';
import { DATA_GOV_API_KEY, GROQ_API_KEY } from '../../backendConfig';
import { useTranslation } from 'react-i18next';

const API_KEY = DATA_GOV_API_KEY;
const BASE_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';

const groq = new Groq({
    apiKey: GROQ_API_KEY,
    dangerouslyAllowBrowser: true
});

const initialFilterOptions = { label: 'All', value: '' };

const stateDistrictMapping = {
    'Andhra Pradesh': [
        { label: 'All Districts', value: '' },
        { label: 'Chittoor', value: 'Chittoor' },
        { label: 'Kadapa', value: 'Kadapa' },
        { label: 'East Godavari', value: 'East Godavari' },
        { label: 'Krishna', value: 'Krishna' },
        { label: 'Kurnool', value: 'Kurnool' },
        { label: 'Visakhapatnam', value: 'Visakhapatnam' },
        { label: 'Anantapur', value: 'Anantapur' }
    ],
    'Karnataka': [
        { label: 'All Districts', value: '' },
        { label: 'Bengaluru', value: 'Bengaluru' },
        { label: 'Mysuru', value: 'Mysuru' },
        { label: 'Belagavi', value: 'Belagavi' },
        { label: 'Hubli', value: 'Hubli' },
        { label: 'Tumkur', value: 'Tumkur' },
        { label: 'Dharwad', value: 'Dharwad' }
    ],
    'Maharashtra': [
        { label: 'All Districts', value: '' },
        { label: 'Mumbai', value: 'Mumbai' },
        { label: 'Pune', value: 'Pune' },
        { label: 'Nagpur', value: 'Nagpur' },
        { label: 'Nashik', value: 'Nashik' },
        { label: 'Aurangabad', value: 'Aurangabad' },
        { label: 'Kolhapur', value: 'Kolhapur' }
    ],
    'Tamil Nadu': [
        { label: 'All Districts', value: '' },
        { label: 'Chennai', value: 'Chennai' },
        { label: 'Coimbatore', value: 'Coimbatore' },
        { label: 'Madurai', value: 'Madurai' },
        { label: 'Salem', value: 'Salem' },
        { label: 'Tiruchirappalli', value: 'Tiruchirappalli' },
        { label: 'Erode', value: 'Erode' }
    ],
    'Uttar Pradesh': [
        { label: 'All Districts', value: '' },
        { label: 'Lucknow', value: 'Lucknow' },
        { label: 'Kanpur', value: 'Kanpur' },
        { label: 'Varanasi', value: 'Varanasi' },
        { label: 'Agra', value: 'Agra' },
        { label: 'Meerut', value: 'Meerut' }
    ],
    'Gujarat': [
        { label: 'All Districts', value: '' },
        { label: 'Ahmedabad', value: 'Ahmedabad' },
        { label: 'Surat', value: 'Surat' },
        { label: 'Vadodara', value: 'Vadodara' },
        { label: 'Rajkot', value: 'Rajkot' },
        { label: 'Gandhinagar', value: 'Gandhinagar' }
    ],
    'West Bengal': [
        { label: 'All Districts', value: '' },
        { label: 'Kolkata', value: 'Kolkata' },
        { label: 'Howrah', value: 'Howrah' },
        { label: 'Durgapur', value: 'Durgapur' },
        { label: 'Siliguri', value: 'Siliguri' },
        { label: 'Asansol', value: 'Asansol' }
    ],
    'Rajasthan': [
        { label: 'All Districts', value: '' },
        { label: 'Jaipur', value: 'Jaipur' },
        { label: 'Jodhpur', value: 'Jodhpur' },
        { label: 'Udaipur', value: 'Udaipur' },
        { label: 'Kota', value: 'Kota' },
        { label: 'Ajmer', value: 'Ajmer' }
    ]
};

const MarketPrices = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [marketPrices, setMarketPrices] = useState([]);
    const [error, setError] = useState(null);

    const [selectedState, setSelectedState] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedCommodity, setSelectedCommodity] = useState('');

    const [stateOptions, setStateOptions] = useState([initialFilterOptions]);
    const [districtOptions, setDistrictOptions] = useState([initialFilterOptions]);
    const [commodityOptions, setCommodityOptions] = useState([initialFilterOptions]);

    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [{ data: [] }],
    });

    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isFocused, setIsFocused] = useState(false);
    const [offset, setOffset] = useState(0);
    const [limit, setLimit] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    const fetchFilterOptions = async () => {
        try {
            setStateOptions([
                { label: t('marketPrices.filters.allStates'), value: '' },
                { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
                { label: 'Karnataka', value: 'Karnataka' },
                { label: 'Maharashtra', value: 'Maharashtra' },
                { label: 'Tamil Nadu', value: 'Tamil Nadu' },
                { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
                { label: 'Gujarat', value: 'Gujarat' },
                { label: 'West Bengal', value: 'West Bengal' },
                { label: 'Rajasthan', value: 'Rajasthan' }
            ]);

            setCommodityOptions([
                { label: t('marketPrices.filters.allCommodities'), value: '' },
                { label: 'Cluster Beans', value: 'Cluster Beans' },
                { label: 'Groundnut', value: 'Groundnut' },
                { label: 'Banana', value: 'Banana' },
                { label: 'Paddy', value: 'Paddy(Dhan)(Common)' },
                { label: 'Dry Chillies', value: 'Dry Chillies' },
                { label: 'Maize', value: 'Maize' },
                { label: 'Wheat', value: 'Wheat' },
                { label: 'Rice', value: 'Rice' },
                { label: 'Tomato', value: 'Tomato' },
                { label: 'Onion', value: 'Onion' },
                { label: 'Potato', value: 'Potato' },
                { label: 'Green Peas', value: 'Green Peas' },
                { label: 'Mango', value: 'Mango' }
            ]);
        } catch (err) {
            console.error('Error fetching filter options:', err);
        }
    };

    const updateDistrictOptions = (state) => {
        if (state && stateDistrictMapping[state]) {
            setDistrictOptions(stateDistrictMapping[state].map(district => ({
                ...district,
                label: district.label === 'All Districts' ? t('marketPrices.filters.allDistricts') : district.label
            })));
        } else {
            setDistrictOptions([{ label: t('marketPrices.filters.allDistricts'), value: '' }]);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            const filters = {};
            if (selectedState) filters.state = selectedState;
            if (selectedDistrict) filters.district = selectedDistrict;
            if (selectedCommodity) filters.commodity = selectedCommodity;

            const filtersQueryString = Object.entries(filters)
                .map(([key, value]) => `filters[${key}]=${encodeURIComponent(value)}`)
                .join('&');

            const url = `${BASE_URL}?api-key=${API_KEY}&format=json&offset=${offset}&limit=${limit}${filtersQueryString ? '&' + filtersQueryString : ''}`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || t('marketPrices.errors.fetchFailed'));
            }

            if (data.total !== undefined) {
                setTotalRecords(data.total);
            }

            if (data.records && data.records.length > 0) {
                setMarketPrices(data.records);
                processDataForChart(data.records);
                fetchAIAnalysis(data.records);
            } else {
                setMarketPrices([]);
                setChartData({
                    labels: [],
                    datasets: [{ data: [] }],
                });
                setAiAnalysis(t('marketPrices.errors.noData'));
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.message || t('marketPrices.errors.fetchFailed'));
            Alert.alert(t('marketPrices.errors.title'), t('marketPrices.errors.message'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const processDataForChart = (records) => {
        const formattedRecords = records.map(record => ({
            ...record,
            parsedDate: parseDate(record.arrival_date)
        }));

        formattedRecords.sort((a, b) => a.parsedDate - b.parsedDate);

        const dateGroups = {};
        formattedRecords.forEach(record => {
            const date = record.arrival_date;
            if (!dateGroups[date]) {
                dateGroups[date] = [];
            }
            dateGroups[date].push(parseFloat(record.modal_price));
        });

        const labels = Object.keys(dateGroups).sort((a, b) => parseDate(a) - parseDate(b));

        const data = labels.map(date => {
            const prices = dateGroups[date];
            return prices.reduce((sum, price) => sum + price, 0) / prices.length;
        });

        setChartData({
            labels: labels.map(date => {
                const parts = date.split('/');
                const d = new Date(parts[2], parts[1] - 1, parts[0]);
                return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
            }),
            datasets: [{ data }],
        });
    };

    const parseDate = (dateString) => {
        const parts = dateString.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]);
    };

    const fetchAIAnalysis = async (records) => {
        if (!records || records.length === 0) return;

        setAiLoading(true);

        try {
            const commodity = records[0]?.commodity || 'commodity';
            const variety = records[0]?.variety || '';
            const marketName = records[0]?.market || 'market';
            const district = records[0]?.district || '';
            const state = records[0]?.state || '';

            const modalPrices = records.map(r => parseFloat(r.modal_price));
            const minPrice = Math.min(...modalPrices).toFixed(2);
            const maxPrice = Math.max(...modalPrices).toFixed(2);
            const avgPrice = (modalPrices.reduce((sum, price) => sum + price, 0) / modalPrices.length).toFixed(2);

            const arrivalDates = [...new Set(records.map(r => r.arrival_date))].sort();
            const dateRange = arrivalDates.length > 0 ?
                `${arrivalDates[0]} to ${arrivalDates[arrivalDates.length - 1]}` : 'unknown date range';

            const prompt = `
        You are an agricultural market analyst AI. Based on the following market data for ${commodity} in ${marketName}, provide:
        1. A concise analysis of current market trends (rising, falling, or stable)
        2. Potential factors affecting prices
        3. A short-term forecast (1-2 weeks)
        4. Actionable advice for farmers on whether to sell now or wait
  
        Market Data Summary:
        - Commodity: ${commodity} ${variety ? `(${variety})` : ''}
        - Market: ${marketName}, ${district}, ${state}
        - Price Range: ₹${minPrice} to ₹${maxPrice} per quintal
        - Average Price: ₹${avgPrice} per quintal
        - Date Range: ${dateRange}
        - Data Points: ${records.length} records
  
        Keep your response focused, practical, and under 150 words. Format your response in simple paragraphs.
      `;

            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: prompt }],
                    model: "llama3-70b-8192",
                    temperature: 0.5,
                    max_tokens: 300
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const chatCompletion = await response.json();
            const analysisText = chatCompletion.choices[0]?.message?.content;

            if (analysisText) {
                setAiAnalysis(analysisText);
            } else {
                setAiAnalysis(t('marketPrices.errors.aiNotAvailable'));
            }
        } catch (err) {
            console.error('Error fetching AI analysis:', err);
            setAiAnalysis(`${t('marketPrices.errors.aiFailed')}: ${err.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => {
        fetchFilterOptions();
    }, [t]);

    useEffect(() => {
        updateDistrictOptions(selectedState);
        fetchData();
    }, [selectedState, selectedDistrict, selectedCommodity, offset, limit, t]);

    const chartConfig = {
        backgroundGradientFrom: '#fff',
        backgroundGradientTo: '#fff',
        color: (opacity = 1) => theme.darkBrown,
        strokeWidth: 2,
        barPercentage: 0.5,
        decimalPlaces: 0,
        propsForLabels: { fontSize: 10, fontFamily: theme.font.regular },
    };

    const getCurrentPriceInfo = () => {
        if (marketPrices.length === 0) {
            return {
                currentPrice: t('marketPrices.status.notAvailable'),
                change: '0%',
                isUp: false,
                lastUpdated: t('marketPrices.status.noData'),
                commodity: t('marketPrices.status.commodity'),
            };
        }

        const latestRecord = marketPrices[0];
        const modalPrice = parseFloat(latestRecord.modal_price);

        let priceChange = '0%';
        let isUp = true;

        if (marketPrices.length > 1) {
            const previousRecord = marketPrices[1];
            const previousPrice = parseFloat(previousRecord.modal_price);
            const change = ((modalPrice - previousPrice) / previousPrice) * 100;
            priceChange = `${Math.abs(change).toFixed(1)}%`;
            isUp = change >= 0;
        }

        return {
            currentPrice: `₹${modalPrice.toFixed(2)}/quintal`,
            change: priceChange,
            isUp,
            lastUpdated: `${t('marketPrices.status.updatedOn')} ${latestRecord.arrival_date}`,
            commodity: latestRecord.commodity,
            variety: latestRecord.variety,
        };
    };

    const priceInfo = getCurrentPriceInfo();
    const maxPage = Math.ceil(totalRecords / limit);

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={{height : 20}}></View>
            <ScrollView
                contentContainerStyle={[styles.form, { paddingHorizontal: 24 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.darkBrown]} />
                }
            >
                <Text style={styles.description}>{t('marketPrices.description')}</Text>

                <View style={styles.input}>
                    <Text style={styles.label}>{t('marketPrices.filters.state')}</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.value}
                        inputSearchStyle={styles.inputSearchStyle}
                        iconStyle={styles.iconStyle}
                        data={stateOptions}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder={t('marketPrices.filters.selectState')}
                        searchPlaceholder={t('marketPrices.filters.search')}
                        value={selectedState}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChange={item => {
                            setSelectedState(item.value);
                            setSelectedDistrict(''); // Reset district when state changes
                            setIsFocused(false);
                        }}
                        renderLeftIcon={() => (
                            <Icon
                                name="map"
                                size={20}
                                color={theme.darkBrown}
                                style={{ marginRight: 10 }}
                            />
                        )}
                        renderItem={item => (
                            <View style={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                                <Text style={[styles.value, { fontFamily: theme.font.regular }]}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.input}>
                    <Text style={styles.label}>{t('marketPrices.filters.district')}</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.value}
                        inputSearchStyle={styles.inputSearchStyle}
                        iconStyle={styles.iconStyle}
                        data={districtOptions}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder={t('marketPrices.filters.selectDistrict')}
                        searchPlaceholder={t('marketPrices.filters.search')}
                        value={selectedDistrict}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChange={item => {
                            setSelectedDistrict(item.value);
                            setIsFocused(false);
                        }}
                        renderLeftIcon={() => (
                            <Icon
                                name="map-marker-outline"
                                size={20}
                                color={theme.darkBrown}
                                style={{ marginRight: 10 }}
                            />
                        )}
                        renderItem={item => (
                            <View style={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                                <Text style={[styles.value, { fontFamily: theme.font.regular }]}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.input}>
                    <Text style={styles.label}>{t('marketPrices.filters.commodity')}</Text>
                    <Dropdown
                        style={styles.dropdown}
                        placeholderStyle={styles.placeholderStyle}
                        selectedTextStyle={styles.value}
                        inputSearchStyle={styles.inputSearchStyle}
                        iconStyle={styles.iconStyle}
                        data={commodityOptions}
                        maxHeight={300}
                        labelField="label"
                        valueField="value"
                        placeholder={t('marketPrices.filters.selectCommodity')}
                        searchPlaceholder={t('marketPrices.filters.search')}
                        value={selectedCommodity}
                        onChange={item => setSelectedCommodity(item.value)}
                        renderLeftIcon={() => (
                            <Icon
                                name="grain"
                                size={20}
                                color={theme.darkBrown}
                                style={{ marginRight: 10 }}
                            />
                        )}
                        renderItem={item => (
                            <View style={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                                <Text style={[styles.value, { fontFamily: theme.font.regular }]}>
                                    {item.label}
                                </Text>
                            </View>
                        )}
                    />
                </View>

                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.darkBrown} />
                        <Text style={styles.value}>{t('marketPrices.status.loading')}</Text>
                    </View>
                )}

                {error && (
                    <View style={styles.input}>
                        <Icon name="alert-circle-outline" size={32} color="red" />
                        <Text style={styles.value}>{error}</Text>
                        <TouchableOpacity style={styles.backButton} onPress={fetchData}>
                            <Text style={[styles.value, { color: '#fff' }]}>{t('marketPrices.actions.retry')}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && !error && marketPrices.length > 0 && (
                    <View style={styles.input}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.commodity')}</Text>
                                <Text style={styles.value}>{priceInfo.commodity} {priceInfo.variety ? `(${priceInfo.variety})` : ''}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.lastUpdated')}</Text>
                                <Text style={styles.value}>{priceInfo.lastUpdated}</Text>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.currentPrice')}</Text>
                                <Text style={[styles.value, { fontSize: theme.fs2, fontFamily: theme.font.bold }]}>{priceInfo.currentPrice}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 4, flexDirection: 'row', alignItems: 'center' }}>
                                <Icon
                                    name={priceInfo.isUp ? 'arrow-up' : 'arrow-down'}
                                    size={20}
                                    color={priceInfo.isUp ? theme.accent : 'red'}
                                />
                                <Text style={[styles.value, { color: priceInfo.isUp ? theme.accent : 'red' }]}>{priceInfo.change}</Text>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.minPrice')}</Text>
                                <Text style={styles.value}>₹{parseFloat(marketPrices[0].min_price).toFixed(2)}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.modalPrice')}</Text>
                                <Text style={styles.value}>₹{parseFloat(marketPrices[0].modal_price).toFixed(2)}</Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 4 }}>
                                <Text style={styles.label}>{t('marketPrices.fields.maxPrice')}</Text>
                                <Text style={styles.value}>₹{parseFloat(marketPrices[0].max_price).toFixed(2)}</Text>
                            </View>
                        </View>
                        <View style={{ marginTop: 16, height: 150 }}>
                            <Text style={styles.label}>{t('marketPrices.fields.aiAnalysis')}</Text>
                            {aiLoading ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={theme.darkBrown} />
                                    <Text style={styles.value}>{t('marketPrices.status.aiLoading')}</Text>
                                </View>
                            ) : (
                                <Text style={styles.value}>{aiAnalysis || t('marketPrices.errors.aiNotAvailable')}</Text>
                            )}
                        </View>

                        <View style={{ marginTop: 30 }}>
                            <Text style={styles.label}>{t('marketPrices.fields.tips')}</Text>
                            <Text style={styles.value}>
                                • {t('marketPrices.tips.comparePrices')}{'\n'}
                                • {t('marketPrices.tips.transportCosts')}{'\n'}
                                • {t('marketPrices.tips.storageOptions')}{'\n'}
                                • {t('marketPrices.tips.weatherForecasts')}
                            </Text>
                        </View>
                    </View>
                )}

                {!loading && !error && marketPrices.length === 0 && (
                    <View style={styles.input}>
                        <Icon name="database-off-outline" size={64} color={theme.text3} />
                        <Text style={styles.value}>{t('marketPrices.errors.noData')}</Text>
                        <Text style={styles.value}>{t('marketPrices.errors.tryChangingFilters')}</Text>
                    </View>
                )}

                {!loading && !error && marketPrices.length > 0 && totalRecords > limit && (
                    <View style={styles.row}>
                        <TouchableOpacity
                            style={[styles.backButton, offset === 0 && styles.paginationButtonDisabled]}
                            onPress={() => setOffset(Math.max(0, offset - limit))}
                            disabled={offset === 0}
                        >
                            <Icon name="chevron-left" size={24} color={offset === 0 ? theme.text3 : '#fff'} />
                            <Text style={[styles.value, { color: offset === 0 ? theme.text3 : '#fff' }]}>{t('marketPrices.actions.previous')}</Text>
                        </TouchableOpacity>

                        <Text style={styles.value}>
                            {t('marketPrices.pagination.page')} {Math.floor(offset / limit) + 1} {t('marketPrices.pagination.of')} {maxPage}
                        </Text>

                        <TouchableOpacity
                            style={[styles.backButton, (offset + limit >= totalRecords) && styles.paginationButtonDisabled]}
                            onPress={() => setOffset(offset + limit)}
                            disabled={offset + limit >= totalRecords}
                        >
                            <Text style={[styles.value, { color: (offset + limit >= totalRecords) ? theme.text3 : '#fff' }]}>{t('marketPrices.actions.next')}</Text>
                            <Icon name="chevron-right" size={24} color={(offset + limit >= totalRecords) ? theme.text3 : '#fff'} />
                        </TouchableOpacity>
                    </View>
                )}
                <View style={{height : 100}}></View>
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
        borderRadius: 3,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.9,
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
    dropdown: {
        height: 50,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: 3,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
        fontFamily: theme.font.regular
    },
    placeholderStyle: {
        fontSize: theme.fs6,
        color: theme.text3,
        fontFamily: theme.font.regular,
    },
    inputSearchStyle: {
        height: 40,
        fontSize: theme.fs6,
        fontFamily: theme.font.regular,
    },
    iconStyle: {
        width: 20,
        height: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    paginationButtonDisabled: {
        backgroundColor: theme.disabledBackground,
    },
    chart: {
        borderRadius: 3,
        paddingRight: 16,
    },
});

export default MarketPrices;