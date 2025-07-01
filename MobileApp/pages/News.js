import { ScrollView, StyleSheet, Text, View, ActivityIndicator, TextInput, TouchableOpacity, Image, RefreshControl, FlatList, Linking } from 'react-native';
import React, { useState, useEffect } from 'react';
import { theme } from '../theme.config';
import Header from '../components/Header';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Feather';
import { Dropdown } from 'react-native-element-dropdown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERP_API_KEY } from '../backendConfig';
import { useTranslation } from 'react-i18next';

const safeString = (value) => {
    if (value === null || value === undefined) return '';
    return typeof value === 'string' ? value : String(value);
};

const NewsCard = ({ item }) => {
    const { t } = useTranslation();
    return (
        <TouchableOpacity
            style={styles.newsCard}
            onPress={() => item.link && Linking.openURL(item.link)}
        >
            {item.thumbnail && (
                <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
            )}
            <View style={styles.newsContent}>
                <Text style={styles.newsDate}>
                    {item.published_date ? new Date(item.published_date).toLocaleDateString() : new Date().toLocaleDateString()}
                </Text>
                <Text style={styles.newsTitle} numberOfLines={2}>
                    {safeString(item.title)}
                </Text>
                <Text style={styles.newsSnippet} numberOfLines={3}>
                    {safeString(item.snippet)}
                </Text>
                <View style={styles.sourceContainer}>
                    {item.source && item.source.icon && (
                        <Image
                            source={{ uri: item.source.icon }}
                            style={styles.sourceIcon}
                            resizeMode="contain"
                        />
                    )}
                    <Text style={styles.newsSource}>
                        {item.source && safeString(item.source.name)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const News = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [news, setNews] = useState([]);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [category, setCategory] = useState('all');
    const [state, setState] = useState('all');
    const [categoryFocus, setCategoryFocus] = useState(false);
    const [stateFocus, setStateFocus] = useState(false);
    const [lang, setLang] = useState('English');

    const NEWS_CATEGORIES = [
        { label: t('news.categories.all'), value: 'all' },
        { label: t('news.categories.crops'), value: 'crops' },
        { label: t('news.categories.weather'), value: 'weather' },
        { label: t('news.categories.market'), value: 'market' },
        { label: t('news.categories.technology'), value: 'technology' },
        { label: t('news.categories.government'), value: 'government' },
    ];

    const INDIAN_STATES = [
        { label: t('news.states.all'), value: 'all' },
        { label: t('news.states.andhraPradesh'), value: 'andhra pradesh' },
        { label: t('news.states.punjab'), value: 'punjab' },
        { label: t('news.states.haryana'), value: 'haryana' },
        { label: t('news.states.maharashtra'), value: 'maharashtra' },
        { label: t('news.states.karnataka'), value: 'karnataka' },
        { label: t('news.states.madhyaPradesh'), value: 'madhya pradesh' },
        { label: t('news.states.gujarat'), value: 'gujarat' },
        { label: t('news.states.rajasthan'), value: 'rajasthan' },
        { label: t('news.states.uttarPradesh'), value: 'uttar pradesh' },
        { label: t('news.states.tamilNadu'), value: 'tamil nadu' },
        { label: t('news.states.westBengal'), value: 'west bengal' },
        { label: t('news.states.bihar'), value: 'bihar' },
        { label: t('news.states.telangana'), value: 'telangana' },
    ];

    useEffect(() => {
        const loadLanguage = async () => {
            const storedLang = await AsyncStorage.getItem('appLanguage');
            setLang(storedLang || 'English');
            console.log('Stored language:', storedLang);
        };
        loadLanguage();
    }, []);

    const BASE_QUERY = 'latest agriculture news india farmers';

    const fetchNews = async (refresh = false) => {
        if (refresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError(null);

        try {
            let query = BASE_QUERY;

            if (category !== 'all') {
                query += ` ${category}`;
            }

            if (state !== 'all') {
                query += ` ${state}`;
            }

            if (searchQuery) {
                query += ` ${searchQuery}`;
            }

            const languageMap = {
                'English': 'en',
                'Hindi': 'hi',
                'Marathi': 'mr',
                'Tamil': 'ta',
            };

            const hl = languageMap[lang] || 'en';

            const response = await axios.get('https://serpapi.com/search', {
                params: {
                    api_key: SERP_API_KEY,
                    engine: 'google_news',
                    q: query,
                    tbm: 'nws',
                    num: 20,
                    gl: 'in',
                    hl: hl,
                },
            });

            if (response.data && response.data.news_results) {
                setNews(response.data.news_results);
            } else {
                setError(t('news.errors.noResults'));
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError(t('news.errors.fetchError'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNews();
    }, [lang, category, state]);

    const handleSearch = () => {
        fetchNews();
    };

    const handleRefresh = () => {
        fetchNews(true);
    };

    const handleCategoryChange = (item) => {
        setCategory(item.value);
        setCategoryFocus(false);
    };

    const handleStateChange = (item) => {
        setState(item.value);
        setStateFocus(false);
    };

    const renderFilterSection = () => {
        return (
            <View style={styles.filterContainer}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('news.search')}
                        placeholderTextColor="#000"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        returnKeyType="search"
                        onSubmitEditing={handleSearch}
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                        <Icon name="search" size={20} color={theme.white} />
                    </TouchableOpacity>
                </View>

                <View style={styles.dropdownsContainer}>
                    <View style={styles.dropdownWrapper}>
                        <Text style={styles.dropdownLabel}>{t('news.category')}</Text>
                        <Dropdown
                            style={[styles.dropdown, categoryFocus && { borderColor: theme.primary }]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            inputSearchStyle={styles.inputSearchStyle}
                            data={NEWS_CATEGORIES}
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={t('news.selectCategory')}
                            value={category}
                            onFocus={() => setCategoryFocus(true)}
                            onBlur={() => setCategoryFocus(false)}
                            onChange={handleCategoryChange}
                            renderLeftIcon={() => (
                                <Icon
                                    name="tag"
                                    size={20}
                                    color={categoryFocus ? theme.secondary : theme.text3}
                                    style={styles.iconStyle}
                                />
                            )}
                        />
                    </View>

                    <View style={styles.dropdownWrapper}>
                        <Text style={styles.dropdownLabel}>{t('news.state')}</Text>
                        <Dropdown
                            style={[styles.dropdown, stateFocus && { borderColor: theme.primary }]}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            inputSearchStyle={styles.inputSearchStyle}
                            data={INDIAN_STATES}
                            search
                            maxHeight={300}
                            labelField="label"
                            valueField="value"
                            placeholder={t('news.selectState')}
                            searchPlaceholder={t('news.searchState')}
                            value={state}
                            onFocus={() => setStateFocus(true)}
                            onBlur={() => setStateFocus(false)}
                            onChange={handleStateChange}
                            renderLeftIcon={() => (
                                <Icon
                                    name="map-pin"
                                    size={20}
                                    color={stateFocus ? theme.secondary : theme.text3}
                                    style={styles.iconStyle}
                                />
                            )}
                        />
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={[theme.container]}>
            <Header text={t('news.header')} />
            {renderFilterSection()}
            <FlatList
                data={news}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => <NewsCard item={item} />}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        colors={[theme.secondary]}
                        tintColor={theme.secondary}
                    />
                }
                keyboardShouldPersistTaps="handled"
            />
        </View>
    );
};

export default News;

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    filterContainer: {
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        marginVertical: 8,
    },
    searchInput: {
        flex: 1,
        height: 46,
        backgroundColor: theme.card,
        borderRadius: 5,
        paddingHorizontal: 12,
        fontFamily: theme.font.regular,
        fontSize: theme.fs6,
        color: theme.text,
        borderWidth: 1,
        borderColor: theme.border,
    },
    searchButton: {
        width: 45,
        height: 45,
        backgroundColor: theme.secondary,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    dropdownsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    dropdownWrapper: {
        flex: 1,
        marginHorizontal: 4,
    },
    dropdownLabel: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs7,
        color: theme.text2,
        marginBottom: 4,
    },
    dropdown: {
        height: 46,
        backgroundColor: theme.card,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 12,
    },
    iconStyle: {
        marginRight: 12,
    },
    placeholderStyle: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs6,
        color: theme.text3,
    },
    selectedTextStyle: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs6,
        color: theme.text,
    },
    inputSearchStyle: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs6,
        color: theme.text,
        height: 40,
    },
    newsContainer: {
        marginTop: 8,
    },
    newsCard: {
        backgroundColor: theme.card,
        borderRadius: 5,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.border,
        shadowColor: theme.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    thumbnail: {
        width: '100%',
        height: 160,
        backgroundColor: theme.overlay,
    },
    newsContent: {
        padding: 12,
    },
    newsDate: {
        fontFamily: theme.font.light,
        fontSize: theme.fs7,
        color: theme.text3,
        marginBottom: 4,
    },
    newsTitle: {
        fontFamily: theme.font.bold,
        fontSize: theme.fs5,
        color: theme.text,
        marginBottom: 6,
    },
    newsSnippet: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs6,
        color: theme.text2,
        marginBottom: 8,
        lineHeight: 20,
    },
    newsSource: {
        fontFamily: theme.font.bold,
        fontSize: theme.fs7,
        color: theme.secondary,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs5,
        color: theme.text,
        textAlign: 'center',
        marginTop: 12,
    },
    noResultsText: {
        fontFamily: theme.font.regular,
        fontSize: theme.fs5,
        color: theme.text,
        textAlign: 'center',
        marginTop: 12,
    },
    retryButton: {
        backgroundColor: theme.secondary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: theme.r3,
        marginTop: 16,
    },
    retryButtonText: {
        fontFamily: theme.font.bold,
        fontSize: theme.fs6,
        color: theme.white,
    },
    sourceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sourceIcon: {
        width: 16,
        height: 16,
        marginRight: 6,
    },
});