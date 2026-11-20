import React, {useRef, useState} from 'react';
import {getLocation} from './device';
import {useAction} from './data';
import {submissionKey} from './plots';
import {
  Button,
  Card,
  Field,
  Notice,
  Result,
  Row,
  Screen,
  Stack,
  Text,
} from './ui';

function showPoint(plot) {
  return `${Number(plot.lat).toFixed(4)}, ${Number(plot.lon).toFixed(4)}`;
}

function initial(plot, legacy) {
  const coordinates = plot || legacy?.location;
  return {
    crop: plot?.crop || legacy?.crop || '',
    area: String(plot?.areaAcres || legacy?.acres || ''),
    date: plot?.sowingDate || legacy?.sowingDate || '',
    lat: String(coordinates?.lat ?? ''),
    lon: String(coordinates?.lon ?? ''),
  };
}

function plotInput({crop, area, date, lat, lon}) {
  const areaAcres = Number(area);
  const latitude = Number(lat);
  const longitude = Number(lon);
  const sowingDate = date.trim();
  const parsed = new Date(`${sowingDate}T00:00:00Z`);
  if (!crop.trim() || crop.includes('\u0000')) {
    throw new Error('Enter a crop name.');
  }
  if (!Number.isFinite(areaAcres) || areaAcres <= 0 || areaAcres > 100000) {
    throw new Error('Enter an area greater than zero and up to 100,000 acres.');
  }
  if (
    !lat.trim() ||
    !lon.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new Error(
      'Enter a valid latitude and longitude for the plot center.',
    );
  }
  if (
    !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(sowingDate) ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== sowingDate
  ) {
    throw new Error('Enter a valid sowing date in YYYY-MM-DD format.');
  }
  return {
    crop: crop.trim(),
    areaAcres,
    lat: latitude,
    lon: longitude,
    sowingDate,
  };
}

function PlotEditor({back, plot, legacy, plotState, offline}) {
  const [form, setForm] = useState(() => initial(plot, legacy));
  const [confirm, setConfirm] = useState(false);
  const attempt = useRef(null);
  const submitting = useRef(false);
  const action = useAction();
  const location = useAction();
  const change = name => value =>
    setForm(previous => ({...previous, [name]: value}));

  const locate = async () => {
    const point = await location.run(getLocation);
    if (point) {
      setForm(previous => ({
        ...previous,
        lat: String(point.latitude),
        lon: String(point.longitude),
      }));
    }
  };

  const save = async () => {
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    try {
      const saved = await action.run(async () => {
        const body = plotInput(form);
        if (plot) {
          return plotState.write(plot.plotId, {method: 'PATCH', body});
        }
        const payload = JSON.stringify(body);
        if (attempt.current?.payload !== payload) {
          attempt.current = {payload, key: submissionKey()};
        }
        return plotState.write(null, {
          method: 'POST',
          headers: {'Idempotency-Key': attempt.current.key},
          body,
        });
      });
      if (saved) {
        back();
      }
    } finally {
      submitting.current = false;
    }
  };

  const remove = async () => {
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    try {
      const removed = await action.run(() =>
        plotState.write(plot.plotId, {method: 'DELETE'}),
      );
      if (removed) {
        back();
      }
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Screen title={plot ? 'Edit plot' : 'Add a plot'} back={back}>
      <Stack>
        <Field
          label="Crop"
          value={form.crop}
          onChangeText={change('crop')}
          maxLength={120}
        />
        <Field
          label="Area in acres"
          value={form.area}
          onChangeText={change('area')}
          keyboardType="decimal-pad"
        />
        <Field
          label="Sowing date"
          placeholder="YYYY-MM-DD"
          value={form.date}
          onChangeText={change('date')}
          maxLength={10}
        />
        <Card>
          <Stack>
            <Text variant="heading">Approximate plot center</Text>
            <Text>
              These coordinates are saved to your account with this plot.
            </Text>
            <Field
              label="Latitude"
              value={form.lat}
              onChangeText={change('lat')}
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label="Longitude"
              value={form.lon}
              onChangeText={change('lon')}
              keyboardType="numbers-and-punctuation"
            />
            <Button
              label="Use my current location"
              variant="secondary"
              onPress={locate}
              disabled={location.pending || action.pending}
            />
            <Result error={location.error} pending={location.pending} />
          </Stack>
        </Card>
        {offline ? <Notice title="Connect to save plot changes" /> : null}
        <Button
          label="Save plot to account"
          onPress={save}
          disabled={offline || action.pending || location.pending || confirm}
        />
        {plot &&
          (confirm ? (
            <Card>
              <Stack>
                <Text>Delete this plot from your account?</Text>
                <Button
                  label="Confirm deletion"
                  onPress={remove}
                  disabled={offline || action.pending}
                />
                <Button
                  label="Keep plot"
                  variant="secondary"
                  onPress={() => setConfirm(false)}
                  disabled={action.pending}
                />
              </Stack>
            </Card>
          ) : (
            <Button
              label="Delete plot"
              variant="ghost"
              onPress={() => setConfirm(true)}
              disabled={offline || action.pending}
            />
          ))}
        <Result error={action.error} pending={action.pending} />
      </Stack>
    </Screen>
  );
}

export function FarmScreen({
  screen,
  params,
  user,
  legacyFarm,
  plotState,
  offline,
  back,
  go,
}) {
  if (user?.role !== 'Farmer') {
    return (
      <Screen title="Your farm" back={back}>
        <Notice title="Farmer account required">
          Plot management is available for farmer accounts.
        </Notice>
      </Screen>
    );
  }

  const {plots, active, error, pending} = plotState;
  if (screen === 'FarmSetup') {
    const id = params?.plotId;
    const plot = id ? plots.find(item => item.plotId === id) : null;
    if (id && !plot) {
      return (
        <Screen title="Edit plot" back={back}>
          <Notice title="Plot unavailable">
            Go back and refresh your plots.
          </Notice>
        </Screen>
      );
    }
    return (
      <PlotEditor
        key={id || 'new'}
        {...{plot, plotState, back, offline}}
        legacy={params?.useLegacy ? legacyFarm : null}
      />
    );
  }

  return (
    <Screen title="Your farm" back={back}>
      <Stack>
        <Text variant="heading">Saved plots</Text>
        <Result error={error} pending={pending} />
        {offline ? (
          <Notice title="You are offline">
            Connect to load and edit your account's plots.
          </Notice>
        ) : null}
        {plots.map(plot => (
          <Card key={plot.plotId}>
            <Stack gap={8}>
              <Text variant="label">{plot.crop}</Text>
              <Text variant="small">
                {plot.areaAcres} acres · Sown {plot.sowingDate}
              </Text>
              <Text variant="caption">{showPoint(plot)}</Text>
              {active?.plotId === plot.plotId ? (
                <Text variant="small">Used in farm tools</Text>
              ) : (
                <Button
                  label="Use in farm tools"
                  variant="secondary"
                  onPress={() => plotState.select(plot.plotId)}
                />
              )}
              <Button
                label="Edit plot"
                variant="ghost"
                onPress={() => go('FarmSetup', {plotId: plot.plotId})}
              />
            </Stack>
          </Card>
        ))}
        {!offline && !pending && !error && !plots.length ? (
          <Notice title="No plots saved to your account yet" />
        ) : null}
        <Button
          label="Add a plot"
          icon="plus"
          onPress={() => go('FarmSetup')}
          disabled={offline || plots.length >= 100}
        />
        <Button
          label="Refresh plots"
          variant="secondary"
          onPress={() => plotState.refresh()}
          disabled={offline || pending}
        />
        {legacyFarm ? (
          <Card>
            <Row
              title={legacyFarm.name || legacyFarm.crop}
              description="Farm details saved on this device"
            />
            <Button
              label="Use these details for a new plot"
              variant="secondary"
              onPress={() => go('FarmSetup', {useLegacy: true})}
              disabled={offline || plots.length >= 100}
            />
          </Card>
        ) : null}
        <Notice title="Satellite monitoring is unavailable">
          Plot details come from you. You can check a crop photo for a separate
          assessment.
        </Notice>
        <Button
          label="Check a crop photo"
          variant="secondary"
          onPress={() => go('CropCare')}
        />
      </Stack>
    </Screen>
  );
}
