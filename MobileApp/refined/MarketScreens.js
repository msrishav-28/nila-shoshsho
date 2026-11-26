import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {adviceLang} from '../utils/lang';
import {hasMapPoint} from '../utils/place';
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
  Tabs,
  Text,
} from './ui';
import {request, useAction} from './data';
import {getLocation} from './device';
import {News, Schemes} from './CatalogueScreens';
import {FarmContext, openLink, Pair, Progress, Validation} from './marketUi';
import {
  asQuery,
  commodityValue,
  dataRows,
  farmLocation,
  firstText,
  INDIA_STATES,
  MARKET_COMMODITIES,
  MARKET_DISTRICTS,
  normalized,
} from './marketData';

const MARKET_VIEWS = ['Prices', 'Compare', 'Outlook', 'Stores'];
const PAGE_SIZE = 10;
const CUSTOM = '__custom__';

function CommoditySelect({value, onChange}) {
  const {t} = useTranslation();
  const crop = commodityValue(value);
  const matches = MARKET_COMMODITIES.some(
    item => (typeof item === 'string' ? item : item.value) === crop,
  );
  const [custom, setCustom] = useState(Boolean(value) && !matches);
  return (
    <Stack gap={8}>
      <Select
        label={t('marketPrices.filters.commodity')}
        placeholder={t('refined.market.chooseCrop', {
          defaultValue: 'Choose a crop',
        })}
        value={custom ? CUSTOM : crop}
        onChange={item => {
          setCustom(item === CUSTOM);
          onChange(item === CUSTOM ? '' : item);
        }}
        options={[
          ...MARKET_COMMODITIES,
          {
            label: t('refined.market.otherCrop', {defaultValue: 'Other crop'}),
            value: CUSTOM,
          },
        ]}
      />
      {custom && (
        <Field
          label={t('marketCompare.crop')}
          value={value}
          onChangeText={onChange}
          maxLength={80}
        />
      )}
    </Stack>
  );
}

function PriceRows({rows, source}) {
  const {t} = useTranslation();
  return rows.map((row, index) => (
    <Card
      key={`${row.market || row.name}-${row.arrival_date || row.asOf}-${
        row.variety
      }-${index}`}>
      <Stack gap={4}>
        <Text variant="label">
          {firstText(
            row.market,
            row.name,
            t('refined.market.mandi', {defaultValue: 'Mandi'}),
          )}
        </Text>
        <Text variant="small">
          {[row.commodity, row.variety, row.district, row.state]
            .filter(value => firstText(value))
            .join(' · ')}
        </Text>
        <Text variant="heading">
          {((typeof row.modal_price === 'number' &&
            Number.isFinite(row.modal_price)) ||
            firstText(row.modal_price)) &&
          firstText(row.unit)
            ? `${row.modal_price} ${row.unit}`
            : t('marketPrices.status.notAvailable')}
        </Text>
        <Text variant="caption">
          {[
            firstText(
              row.source,
              source,
              t('refined.market.sourceUnavailable', {
                defaultValue: 'Source unavailable',
              }),
            ),
            firstText(
              row.arrival_date,
              row.asOf,
              t('refined.market.dateUnavailable', {
                defaultValue: 'Arrival date unavailable',
              }),
            ),
          ].join(' · ')}
        </Text>
      </Stack>
    </Card>
  ));
}

function MarketPrices({farm, location}) {
  const {t} = useTranslation();
  const action = useAction();
  const analysis = useAction();
  const [state, setState] = useState(location.state || '');
  const [district, setDistrict] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');
  const [crop, setCrop] = useState(commodityValue(farm?.crop));
  const [submitted, setSubmitted] = useState(null);
  const [offset, setOffset] = useState(0);
  const [validation, setValidation] = useState('');
  const selectedDistrict =
    district === CUSTOM ? customDistrict.trim() : district;
  const rows = dataRows(action.data?.records);
  const canContinue =
    offset + PAGE_SIZE < Math.min(Number(action.data?.total) || 0, 10000);

  function load(filters, nextOffset) {
    analysis.reset();
    setOffset(nextOffset);
    action.run(() =>
      request(
        'advice',
        `/api/market-prices?${asQuery({
          ...filters,
          offset: nextOffset,
          limit: PAGE_SIZE,
        })}`,
      ),
    );
  }

  function analyzePage() {
    return analysis.run(async () => {
      const records = rows.filter(
        row => row.modal_price != null && row.modal_price !== '',
      );
      const result = await request('advice', '/api/market-analysis', {
        method: 'POST',
        body: {records},
      });
      if (typeof result?.analysis !== 'string' || !result.analysis.trim()) {
        throw new Error('The server did not return a market analysis.');
      }
      return result;
    });
  }

  function submit() {
    if (!crop.trim()) {
      setValidation(
        t('refined.market.chooseCrop', {defaultValue: 'Choose a crop'}),
      );
      return;
    }
    if (district === CUSTOM && !customDistrict.trim()) {
      setValidation(
        t('refined.market.otherDistrict', {defaultValue: 'Enter a district'}),
      );
      return;
    }
    setValidation('');
    const filters = {state, district: selectedDistrict, commodity: crop.trim()};
    setSubmitted(filters);
    load(filters, 0);
  }

  return (
    <Columns>
      <Stack gap={16}>
        <Pair>
          <Select
            label={t('marketPrices.filters.state')}
            placeholder={t('refined.market.allStates', {
              defaultValue: 'All states',
            })}
            value={state}
            onChange={value => {
              setState(value);
              setDistrict('');
              setCustomDistrict('');
            }}
            options={[
              {
                value: '',
                label: t('refined.market.allStates', {
                  defaultValue: 'All states',
                }),
              },
              ...INDIA_STATES,
            ]}
          />
          <Select
            label={t('marketPrices.filters.district')}
            placeholder={t('refined.market.allDistricts', {
              defaultValue: 'All districts',
            })}
            value={district}
            onChange={setDistrict}
            options={[
              {
                value: '',
                label: t('refined.market.allDistricts', {
                  defaultValue: 'All districts',
                }),
              },
              ...(MARKET_DISTRICTS[state] || []),
              {
                value: CUSTOM,
                label: t('refined.market.otherDistrict', {
                  defaultValue: 'Enter a district',
                }),
              },
            ]}
          />
        </Pair>
        {district === CUSTOM && (
          <Field
            label={t('marketPrices.filters.district')}
            value={customDistrict}
            onChangeText={setCustomDistrict}
            maxLength={80}
          />
        )}
        <CommoditySelect value={crop} onChange={setCrop} />
        <Button
          label={t('refined.market.showPrices', {defaultValue: 'Show prices'})}
          onPress={submit}
          disabled={action.pending}
        />
        <Validation text={validation} />
      </Stack>
      <Stack gap={12}>
        {!submitted && (
          <Notice
            tone="default"
            title={t('refined.market.chooseMarket', {
              defaultValue: 'Choose your market',
            })}>
            {t('refined.market.priceIntro', {
              defaultValue:
                'Select a crop and location to see available mandi prices.\n\nEach result shows its source, arrival date and price unit.',
            })}
          </Notice>
        )}
        <Progress action={action} label={t('marketPrices.status.loading')} />
        {action.data && !action.pending && (
          <>
            {rows.length ? (
              <PriceRows rows={rows} source={action.data.source} />
            ) : (
              <Notice
                title={t('refined.market.noPrices', {
                  defaultValue: 'No reported prices',
                })}>
                {t('marketPrices.errors.noData')}
              </Notice>
            )}
            {rows.some(
              row => row.modal_price != null && row.modal_price !== '',
            ) ? (
              <Stack>
                <Button
                  label="Analyze prices on this page"
                  variant="secondary"
                  onPress={analyzePage}
                  disabled={analysis.pending}
                />
                <Progress action={analysis} />
                {analysis.data ? (
                  <Card>
                    <Text variant="label">
                      {analysis.data.source || 'Submitted market records'}
                    </Text>
                    {analysis.data.asOf ? (
                      <Text variant="caption">{analysis.data.asOf}</Text>
                    ) : null}
                    <Text>{analysis.data.analysis}</Text>
                  </Card>
                ) : null}
              </Stack>
            ) : null}
            {(offset > 0 || canContinue) && (
              <Pair>
                <Button
                  label={t('marketPrices.actions.previous')}
                  variant="secondary"
                  disabled={!offset}
                  onPress={() =>
                    load(submitted, Math.max(0, offset - PAGE_SIZE))
                  }
                />
                <Button
                  label={t('marketPrices.actions.next')}
                  variant="secondary"
                  disabled={!canContinue}
                  onPress={() => load(submitted, offset + PAGE_SIZE)}
                />
              </Pair>
            )}
          </>
        )}
      </Stack>
    </Columns>
  );
}

function PriceComparison({farm, location}) {
  const {t} = useTranslation();
  const action = useAction();
  const [crop, setCrop] = useState(commodityValue(farm?.crop));
  const [first, setFirst] = useState(location.state || '');
  const [second, setSecond] = useState('');
  const [validation, setValidation] = useState('');
  function submit() {
    if (!crop.trim() || !first || !second) {
      setValidation(t('marketCompare.needFields'));
      return;
    }
    if (first === second) {
      setValidation(
        t('refined.market.distinctStates', {
          defaultValue: 'Choose two different states.',
        }),
      );
      return;
    }
    setValidation('');
    action.run(() =>
      request(
        'advice',
        `/api/market-compare?${asQuery({
          commodity: crop.trim(),
          state_a: first,
          state_b: second,
        })}`,
      ),
    );
  }
  return (
    <Columns>
      <Stack gap={16}>
        <CommoditySelect value={crop} onChange={setCrop} />
        <Select
          label={t('marketCompare.stateA')}
          placeholder={t('refined.market.chooseState', {
            defaultValue: 'Choose a state',
          })}
          value={first}
          onChange={setFirst}
          options={INDIA_STATES}
        />
        <Select
          label={t('marketCompare.stateB')}
          placeholder={t('refined.market.otherState', {
            defaultValue: 'Choose another state',
          })}
          value={second}
          onChange={setSecond}
          options={INDIA_STATES}
        />
        <Button
          label={t('refined.market.comparePrices', {
            defaultValue: 'Compare prices',
          })}
          onPress={submit}
          disabled={action.pending}
        />
        <Validation text={validation} />
      </Stack>
      <Stack gap={12}>
        {!action.data && !action.pending && !action.error && (
          <Text variant="small">
            {t('refined.market.compareIntro', {
              defaultValue:
                'Compare reported prices for the same crop. Missing arrivals are shown as unavailable.',
            })}
          </Text>
        )}
        <Progress action={action} />
        {action.data &&
          !action.pending &&
          [action.data.state_a, action.data.state_b]
            .filter(Boolean)
            .map(side => (
              <Stack key={side.state} gap={8}>
                <Text variant="heading">{side.state}</Text>
                {dataRows(side.records).length ? (
                  <PriceRows
                    rows={dataRows(side.records).map(row => ({
                      ...row,
                      unit: row.unit || action.data.unit,
                    }))}
                    source={action.data.source}
                  />
                ) : (
                  <Notice
                    title={t('refined.market.noArrivals', {
                      defaultValue: 'No reported arrivals',
                    })}
                  />
                )}
              </Stack>
            ))}
      </Stack>
    </Columns>
  );
}

function MarketOutlook({farm, location, switchToPrices}) {
  const {t, i18n} = useTranslation();
  const action = useAction();
  const [crop, setCrop] = useState(commodityValue(farm?.crop));
  const [market, setMarket] = useState('');
  const [period, setPeriod] = useState('7');
  const [attempted, setAttempted] = useState(false);
  const [validation, setValidation] = useState('');

  const showOutlook = () => {
    if (!crop.trim() || !market.trim()) {
      setValidation(
        t('refined.market.needMandi', {
          defaultValue: 'Choose a crop and enter the mandi name.',
        }),
      );
      return;
    }
    setValidation('');
    setAttempted(true);
    if (location.state) {
      action.run(async () => {
        const result = await request('advice', '/market/insights', {
          method: 'POST',
          body: {
            crop: crop.trim(),
            state: location.state,
            lang: adviceLang(i18n.language),
          },
        });
        return {result, market: market.trim(), state: location.state};
      });
    }
  };

  const actualRows = dataRows(action.data?.result?.records).filter(
    row => normalized(row.market) === normalized(action.data?.market),
  );
  const insight = firstText(action.data?.result?.insight);
  return (
    <Columns>
      <Stack gap={16}>
        <CommoditySelect value={crop} onChange={setCrop} />
        <Field
          label={t('refined.market.market', {defaultValue: 'Market'})}
          placeholder={t('refined.market.chooseMandi', {
            defaultValue: 'Choose a mandi',
          })}
          value={market}
          onChangeText={setMarket}
          maxLength={80}
        />
        <Tabs
          items={[
            {
              label: t('refined.market.week', {defaultValue: '7 days'}),
              value: '7',
            },
            {
              label: t('refined.market.fortnight', {defaultValue: '14 days'}),
              value: '14',
            },
          ]}
          value={period}
          onChange={setPeriod}
        />
        <Button
          label={t('refined.market.viewOutlook', {
            defaultValue: 'View outlook',
          })}
          onPress={showOutlook}
          disabled={action.pending}
        />
        <Validation text={validation} />
      </Stack>
      <Stack gap={16}>
        <Notice
          title={t('refined.market.noHistory', {
            defaultValue: 'Not enough history yet',
          })}
          tone="info">
          {t('refined.market.outlookIntro', {
            defaultValue:
              'A forecast appears only when there is sufficient recent market data. You can still check reported prices.',
          })}
        </Notice>
        {attempted && !location.state && (
          <Text variant="small">
            {t('refined.market.outlookNeedState', {
              defaultValue:
                'A saved state is needed to load current arrival commentary. You can search reported prices by state.',
            })}
          </Text>
        )}
        <Progress action={action} />
        {action.data && !action.pending && (
          <>
            {insight ? (
              <Card>
                <Stack gap={8}>
                  <Text variant="label">
                    {t('refined.market.stateCommentary', {
                      defaultValue: 'Current arrivals across {{state}}',
                      state: action.data.state,
                    })}
                  </Text>
                  <Text variant="small">{insight}</Text>
                  <Text variant="caption">
                    {[action.data.result?.source, action.data.result?.asOf]
                      .filter(value => firstText(value))
                      .join(' · ')}
                  </Text>
                </Stack>
              </Card>
            ) : null}
            {actualRows.length ? (
              <PriceRows
                rows={actualRows}
                source={action.data.result?.source}
              />
            ) : (
              <Text variant="small">
                {t('refined.market.mandiMissing', {
                  defaultValue:
                    'The current state results did not include {{market}}.',
                  market: action.data.market,
                })}
              </Text>
            )}
          </>
        )}
        <Row
          title={t('refined.market.viewCurrent', {
            defaultValue: 'View current prices',
          })}
          description={t('refined.market.reportedArrivals', {
            defaultValue: 'Reported arrivals, with dates',
          })}
          onPress={switchToPrices}
        />
      </Stack>
    </Columns>
  );
}

function NearbyStores({farm, location}) {
  const {t} = useTranslation();
  const [place, setPlace] = useState('');
  const action = useAction();
  const [validation, setValidation] = useState('');

  function findStores(source) {
    if (source === 'place' && !place.trim()) {
      setValidation(
        t('refined.market.enterPlace', {
          defaultValue: 'Enter your saved village or town.',
        }),
      );
      return;
    }
    setValidation('');
    action.run(async () => {
      let coordinates;
      let state;
      if (source === 'device') {
        const point = await getLocation();
        coordinates = {lat: point.latitude, lon: point.longitude};
      } else if (source === 'plot' && hasMapPoint({location})) {
        coordinates = {lat: location.lat, lon: location.lon};
      } else if (
        hasMapPoint({location}) &&
        [location.village, location.city, farm?.place].some(
          name => normalized(name) === normalized(place),
        )
      ) {
        coordinates = {lat: location.lat, lon: location.lon};
        state = location.state;
      } else {
        throw new Error(
          t('refined.market.namedPlaceUnavailable', {
            defaultValue:
              'Search by a new place is unavailable right now. Enter your saved town or use current location.',
          }),
        );
      }
      return request(
        'advice',
        `/stores/nearby?${asQuery({...coordinates, state})}`,
      );
    });
  }

  const stores = dataRows(action.data?.stores);
  const mandis = dataRows(action.data?.mandis);
  return (
    <Columns>
      <Stack gap={16}>
        <Stack gap={4}>
          <Text variant="title">
            {t('refined.market.nearFarm', {
              defaultValue: 'Find stores near your farm',
            })}
          </Text>
          <Text>
            {t('refined.market.storeIntro', {
              defaultValue:
                'Choose a location to find nearby agricultural stores.',
            })}
          </Text>
        </Stack>
        <Field
          label={t('refined.market.location', {defaultValue: 'Location'})}
          placeholder={t('refined.market.villageOrTown', {
            defaultValue: 'Village or town',
          })}
          value={place}
          onChangeText={setPlace}
        />
        <Button
          label={t('refined.market.findStores', {defaultValue: 'Find stores'})}
          onPress={() => findStores('place')}
          disabled={action.pending}
        />
        <Validation text={validation} />
        {farm?.plotId && hasMapPoint({location}) ? (
          <Row
            title="Use active plot"
            description={farm.crop}
            icon="map-pin"
            onPress={action.pending ? undefined : () => findStores('plot')}
          />
        ) : null}
        <Row
          title={t('refined.market.useLocation', {
            defaultValue: 'Use current location',
          })}
          description={t('refined.market.locationPrivacy', {
            defaultValue: 'Location is requested only when you choose this',
          })}
          icon="crosshair"
          onPress={action.pending ? undefined : () => findStores('device')}
        />
      </Stack>
      <Stack gap={12}>
        {!action.pending && !action.data && !action.error && (
          <Notice
            tone="default"
            title={t('refined.market.noLocation', {
              defaultValue: 'No location selected',
            })}>
            {t('refined.market.searchSavedPlace', {
              defaultValue:
                'Enter your saved place if you prefer not to share device location.',
            })}
          </Notice>
        )}
        <Progress action={action} />
        {action.data && !action.pending && (
          <>
            {stores.length ? (
              stores.map((store, index) => (
                <Card key={`${store.id}-${index}`}>
                  <Stack gap={8}>
                    <Text variant="label">
                      {firstText(
                        store.name,
                        t('refined.market.farmStore', {
                          defaultValue: 'Farm supply store',
                        }),
                      )}
                    </Text>
                    <Text variant="small">
                      {[store.type, store.address].filter(Boolean).join(' · ')}
                    </Text>
                    <Text variant="caption">{action.data.storeSource}</Text>
                    {store.phone && (
                      <Text variant="caption">{store.phone}</Text>
                    )}
                    <Pair>
                      {store.mapsUrl && (
                        <Button
                          label={t('refined.market.directions', {
                            defaultValue: 'Directions',
                          })}
                          variant="secondary"
                          onPress={() => openLink(store.mapsUrl)}
                        />
                      )}
                      {store.telUrl && (
                        <Button
                          label={t('refined.market.call', {
                            defaultValue: 'Call',
                          })}
                          variant="secondary"
                          onPress={() => openLink(store.telUrl)}
                        />
                      )}
                    </Pair>
                  </Stack>
                </Card>
              ))
            ) : (
              <Notice
                title={t('refined.market.noStores', {
                  defaultValue: 'No farm shops mapped here',
                })}
              />
            )}
            {mandis.length > 0 && (
              <>
                <Text variant="heading">
                  {t('refined.market.mandis', {defaultValue: 'Mandis'})}
                </Text>
                <PriceRows rows={mandis} source={action.data.mandiSource} />
              </>
            )}
          </>
        )}
      </Stack>
    </Columns>
  );
}

function marketView(params) {
  const incoming = normalized(params?.tab || params?.screen || params?.view);
  const aliases = {
    insights: 'Outlook',
    comparison: 'Compare',
    'nearby stores': 'Stores',
  };
  return (
    MARKET_VIEWS.find(item => normalized(item) === incoming) ||
    aliases[incoming] ||
    'Prices'
  );
}

function MarketWorkspace({params, back, go, farm, user}) {
  const {t} = useTranslation();
  const [current, setCurrent] = useState(() => marketView(params));
  const location = farmLocation(farm, user);
  const requestedView = marketView(params);
  useEffect(() => setCurrent(requestedView), [requestedView]);
  return (
    <Screen title={t('navigation.market')} primary="Market" back={back} go={go}>
      <Stack gap={16}>
        <FarmContext farm={farm} go={go} />
        <Tabs
          items={MARKET_VIEWS.map(value => ({
            label: t(`refined.market.${value.toLowerCase()}`, {
              defaultValue: value,
            }),
            value,
          }))}
          value={current}
          onChange={setCurrent}
        />
        <View style={current !== 'Prices' && styles.hidden}>
          <MarketPrices farm={farm} location={location} />
        </View>
        <View style={current !== 'Compare' && styles.hidden}>
          <PriceComparison farm={farm} location={location} />
        </View>
        <View style={current !== 'Outlook' && styles.hidden}>
          <MarketOutlook
            farm={farm}
            location={location}
            switchToPrices={() => setCurrent('Prices')}
          />
        </View>
        <View style={current !== 'Stores' && styles.hidden}>
          <NearbyStores farm={farm} location={location} />
        </View>
      </Stack>
    </Screen>
  );
}

export function MarketScreen({screen, ...props}) {
  switch (screen) {
    case 'Schemes':
      return <Schemes {...props} />;
    case 'News':
      return <News {...props} />;
    default:
      return <MarketWorkspace {...props} />;
  }
}

const styles = StyleSheet.create({hidden: {display: 'none'}});
