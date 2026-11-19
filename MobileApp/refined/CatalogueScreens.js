import React, {useEffect, useState} from 'react';
import {Image, StyleSheet} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {adviceLang} from '../utils/lang';
import {
  Button,
  Card,
  Columns,
  Field,
  Notice,
  Row,
  Screen,
  Select,
  Stack,
  Text,
} from './ui';
import {request, useAction} from './data';
import {FarmContext, openLink, Pair, Progress} from './marketUi';
import {
  asQuery,
  dataRows,
  extractSchemeCards,
  farmLocation,
  firstText,
  httpUrl,
  INDIA_STATES,
  MYSCHEME_HOME,
} from './marketData';

const NEWS_FILTERS = {query: '', state: 'all', category: 'all'};
const NEWS_CATEGORIES = [
  'all',
  'crops',
  'weather',
  'market',
  'technology',
  'government',
];

export function Schemes({back, go, farm, user}) {
  const {t} = useTranslation();
  const action = useAction();
  const [panel, setPanel] = useState('');
  const [crop, setCrop] = useState(farm?.crop || '');
  const [state, setState] = useState(farmLocation(farm, user).state || '');
  const [saved, setSaved] = useState([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const userId = user?._id || user?.id;
  const storageKey = userId ? `refined.schemeLinks.${userId}` : '';

  useEffect(() => {
    let active = true;
    setSaved([]);
    if (storageKey) {
      AsyncStorage.getItem(storageKey)
        .then(value => {
          if (active) {
            setSaved(
              dataRows(JSON.parse(value || '[]')).filter(
                item => typeof item.title === 'string' && httpUrl(item.link),
              ),
            );
          }
        })
        .catch(() => {
          if (active) {
            setSaveError('Could not load saved schemes on this device.');
          }
        });
    }
    return () => {
      active = false;
    };
  }, [storageKey]);

  const choosePanel = value => {
    setPanel(value);
    action.reset();
  };
  const lookup = () =>
    action.run(() =>
      request('advice', '/govscheme', {
        method: 'POST',
        body: {
          query: [
            panel === 'insurance' ? 'crop insurance' : 'agriculture schemes',
            crop.trim(),
            state,
          ]
            .filter(Boolean)
            .join(' ')
            .slice(0, 120),
        },
      }),
    );

  async function toggleSave(card) {
    if (!storageKey) {
      return;
    }
    setSaving(true);
    setSaveError('');
    const exists = saved.some(
      item => item.link === card.link && item.title === card.title,
    );
    const next = exists
      ? saved.filter(
          item => item.link !== card.link || item.title !== card.title,
        )
      : [...saved, card];
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
      setSaved(next);
    } catch {
      setSaveError(
        t('refined.schemes.saveFailed', {
          defaultValue: 'Could not update saved schemes on this device.',
        }),
      );
    } finally {
      setSaving(false);
    }
  }

  const schemeCards =
    panel === 'saved' ? saved : extractSchemeCards(action.data);
  const displaySearch = panel === 'relevant' || panel === 'insurance';
  return (
    <Screen title={t('schemes.header')} primary="Schemes" back={back} go={go}>
      <Stack gap={16}>
        <Stack gap={12}>
          <Text variant="title">
            {t('refined.schemes.findSupport', {
              defaultValue: 'Find support for your farm',
            })}
          </Text>
          <Text>
            {t('refined.schemes.intro', {
              defaultValue:
                'Explore government support, then ask Nila to help you understand it.',
            })}
          </Text>
        </Stack>
        <FarmContext farm={farm} go={go} />
        <Columns>
          <Stack gap={8}>
            <Row
              title={t('refined.schemes.relevant', {
                defaultValue: 'Find relevant schemes',
              })}
              description={t('refined.schemes.chooseFarm', {
                defaultValue: 'Choose your state and crop',
              })}
              onPress={() => choosePanel('relevant')}
            />
            <Row
              title={t('refined.schemes.insurance', {
                defaultValue: 'Crop insurance',
              })}
              description={t('refined.schemes.insuranceHelp', {
                defaultValue: 'Eligibility, premiums and claim support',
              })}
              onPress={() => choosePanel('insurance')}
            />
            <Row
              title={t('refined.schemes.saved', {
                defaultValue: 'Saved scheme information',
              })}
              description={t('refined.schemes.savedHelp', {
                defaultValue: 'Keep useful details together',
              })}
              onPress={() => choosePanel('saved')}
            />
          </Stack>
          <Stack gap={16}>
            <Notice
              title={t('refined.schemes.official', {
                defaultValue: 'Official information matters',
              })}
              tone="info">
              {t('refined.schemes.verify', {
                defaultValue:
                  'Availability and eligibility must be checked against the scheme’s official source.',
              })}
            </Notice>
            <Button
              label={t('refined.schemes.ask', {
                defaultValue: 'Ask about a scheme',
              })}
              icon="message-circle"
              variant="secondary"
              onPress={() => go('AskNila')}
            />
          </Stack>
        </Columns>
        {displaySearch && (
          <Card>
            <Stack gap={12}>
              <Text variant="heading">
                {panel === 'insurance'
                  ? t('refined.schemes.insurance', {
                      defaultValue: 'Crop insurance',
                    })
                  : t('refined.schemes.relevant', {
                      defaultValue: 'Find relevant schemes',
                    })}
              </Text>
              <Select
                label={t('marketPrices.filters.state')}
                placeholder={t('refined.market.chooseState', {
                  defaultValue: 'Choose a state',
                })}
                value={state}
                onChange={setState}
                options={INDIA_STATES}
              />
              <Field
                label={t('marketCompare.crop')}
                value={crop}
                onChangeText={setCrop}
                maxLength={80}
              />
              <Button
                label={t('refined.schemes.search', {
                  defaultValue: 'Find schemes',
                })}
                onPress={lookup}
                disabled={
                  action.pending ||
                  (panel === 'relevant' && (!crop.trim() || !state))
                }
              />
            </Stack>
          </Card>
        )}
        <Progress action={action} />
        {saveError ? <Notice tone="error" title={saveError} /> : null}
        {panel === 'saved' && !schemeCards.length && (
          <Notice
            title={t('refined.schemes.noSaved', {
              defaultValue: 'No saved schemes yet',
            })}
          />
        )}
        {displaySearch && (action.data || action.error) && !action.pending && (
          <>
            {action.data?.source && (
              <Text variant="small">
                {t('schemes.sourceLabel')} · {action.data.source}
              </Text>
            )}
            {action.data && !schemeCards.length && (
              <Notice title={t('schemes.noSchemes')} />
            )}
            <Button
              label={t('schemes.openMyscheme')}
              variant="secondary"
              onPress={() => openLink(MYSCHEME_HOME)}
            />
          </>
        )}
        {schemeCards.map(card => (
          <Card key={`${card.title}|${card.link}`}>
            <Row title={card.title} onPress={() => openLink(card.link)} />
            {storageKey && (
              <Button
                label={
                  saved.some(
                    item =>
                      item.title === card.title && item.link === card.link,
                  )
                    ? t('refined.schemes.remove', {
                        defaultValue: 'Remove from saved',
                      })
                    : t('refined.schemes.save', {defaultValue: 'Save scheme'})
                }
                onPress={() => toggleSave(card)}
                disabled={saving}
                variant="secondary"
              />
            )}
          </Card>
        ))}
      </Stack>
    </Screen>
  );
}

function newsStateOption(state, t) {
  const key = state
    .split(' ')
    .map((word, index) => (index && word !== 'and' ? word : word.toLowerCase()))
    .join('');
  return {
    value: state.toLowerCase(),
    label: t(`news.states.${key}`, {defaultValue: state}),
  };
}

export function News({back, go}) {
  const {t, i18n} = useTranslation();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(NEWS_FILTERS);
  const [response, setResponse] = useState({pending: true});
  const language = adviceLang(i18n.language);

  useEffect(() => {
    const controller = new AbortController();
    const params = asQuery({
      category: filters.category,
      state: filters.state,
      search: filters.query,
      lang: language,
    });
    setResponse({pending: true});
    request('advice', `/news?${params}`, {signal: controller.signal})
      .then(data => {
        if (!controller.signal.aborted) {
          setResponse({data});
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setResponse({error});
        }
      });
    return () => controller.abort();
  }, [filters, language]);

  const search = () =>
    setFilters(previous => ({...previous, query: query.trim()}));
  const update = (key, value) =>
    setFilters(previous => ({...previous, [key]: value, query: query.trim()}));
  const reset = () => {
    setQuery('');
    setFilters({...NEWS_FILTERS});
  };
  const stories = dataRows(response.data?.news_results);
  return (
    <Screen
      title={t('refined.news.title', {defaultValue: 'Agriculture news'})}
      primary="News"
      back={back}
      go={go}>
      <Stack gap={16}>
        <Columns>
          <Stack gap={12}>
            <Field
              icon="search"
              label={t('refined.news.search', {defaultValue: 'Search'})}
              value={query}
              onChangeText={setQuery}
              placeholder={t('refined.news.searchNews', {
                defaultValue: 'Search agriculture news',
              })}
              onSubmitEditing={search}
              returnKeyType="search"
              maxLength={120}
            />
            {query.trim() !== filters.query && (
              <Button
                label={t('refined.news.search', {defaultValue: 'Search'})}
                variant="secondary"
                onPress={search}
                icon="search"
              />
            )}
            <Pair>
              <Select
                label={t('news.category')}
                value={filters.category}
                onChange={value => update('category', value)}
                options={NEWS_CATEGORIES.map(value => ({
                  value,
                  label:
                    value === 'all'
                      ? t('refined.news.allTopics', {
                          defaultValue: 'All topics',
                        })
                      : t(`news.categories.${value}`),
                }))}
              />
              <Select
                label={t('news.state')}
                value={filters.state}
                onChange={value => update('state', value)}
                options={[
                  {
                    value: 'all',
                    label: t('refined.market.allStates', {
                      defaultValue: 'All states',
                    }),
                  },
                  ...INDIA_STATES.map(state => newsStateOption(state, t)),
                ]}
              />
            </Pair>
          </Stack>
          <Stack gap={16}>
            <Progress action={response} />
            {response.error && (
              <Button
                label={t('news.retry')}
                variant="secondary"
                onPress={search}
              />
            )}
            {!response.pending && !response.error && !stories.length && (
              <Notice
                tone="default"
                title={t('refined.news.noStories', {
                  defaultValue: 'No stories for this search',
                })}>
                {t('refined.news.tryDifferent', {
                  defaultValue: 'Try a different topic or remove a filter.',
                })}
              </Notice>
            )}
            {(!stories.length ||
              filters.query ||
              filters.state !== 'all' ||
              filters.category !== 'all') && (
              <Button
                label={t('refined.news.clear', {defaultValue: 'Clear filters'})}
                icon="x"
                variant="secondary"
                onPress={reset}
              />
            )}
            {stories.map((story, index) => {
              const thumbnail = httpUrl(story.thumbnail);
              const link = httpUrl(story.link);
              const source =
                typeof story.source === 'string'
                  ? story.source
                  : story.source?.name;
              return (
                <Card key={`${story.link}-${index}`}>
                  <Stack gap={8}>
                    {thumbnail ? (
                      <Image
                        source={{uri: thumbnail}}
                        style={styles.thumbnail}
                        resizeMode="cover"
                        accessible={false}
                      />
                    ) : null}
                    <Row
                      title={firstText(
                        story.title,
                        t('refined.news.story', {defaultValue: 'News story'}),
                      )}
                      onPress={link ? () => openLink(link) : undefined}
                    />
                    {typeof story.snippet === 'string' && (
                      <Text variant="small">{story.snippet}</Text>
                    )}
                    <Text variant="caption">
                      {[source, story.published_date || story.date]
                        .filter(value => typeof value === 'string' && value)
                        .join(' · ')}
                    </Text>
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Columns>
        <Stack gap={4}>
          <Row
            title={t('navigation.cropCare')}
            description={t('refined.news.cropHelp', {
              defaultValue: 'Growing and protecting your crop',
            })}
            onPress={() => update('category', 'crops')}
          />
          <Row
            title={t('refined.news.markets', {defaultValue: 'Markets'})}
            description={t('refined.news.marketHelp', {
              defaultValue: 'Prices and agricultural trade',
            })}
            onPress={() => update('category', 'market')}
          />
          <Row
            title={t('schemes.header')}
            description={t('refined.news.schemeHelp', {
              defaultValue: 'Support and official announcements',
            })}
            onPress={() => update('category', 'government')}
          />
        </Stack>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumbnail: {width: '100%', aspectRatio: 1.8, borderRadius: theme.r3},
});
