import React, {useEffect, useRef, useState} from 'react';
import {Image, Linking, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {adviceLang, adviceLangName} from '../utils/lang';
import {theme} from '../theme.config';
import {appendFile, choosePhoto} from './device';
import {message, request, useAction} from './data';
import {
  Button,
  Card,
  Columns,
  Illustration,
  Notice,
  Result,
  Row,
  Screen,
  Stack,
  Text,
} from './ui';

const maxImageSize = 6 * 1024 * 1024;

export function CropCareScreen({go, back}) {
  const {t, i18n} = useTranslation();
  const [photo, setPhoto] = useState(null);
  const selectedPhoto = useRef(null);
  const active = useRef(true);
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);
  const action = useAction();
  const uncertain = action.error?.status === 422;

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      selectedPhoto.current?.cleanup?.();
    };
  }, []);

  async function selectPhoto(camera) {
    if (picking || action.pending) {
      return;
    }
    setPicking(true);
    setError('');
    try {
      const next = await choosePhoto({camera});
      if (!next) {
        return;
      }
      if (!active.current) {
        next.cleanup?.();
        return;
      }
      if ((next.size || next.blob?.size || 0) > maxImageSize) {
        next.cleanup?.();
        throw new Error('Choose a photo under 6 MB.');
      }
      selectedPhoto.current?.cleanup?.();
      selectedPhoto.current = next;
      setPhoto(next);
      action.reset();
    } catch (failure) {
      if (active.current) {
        setError(message(failure));
      }
    } finally {
      if (active.current) {
        setPicking(false);
      }
    }
  }

  function checkPhoto() {
    if (!photo || action.pending) {
      return;
    }
    const body = new FormData();
    appendFile(body, 'image', photo);
    body.append('lang', adviceLangName(adviceLang(i18n.language)));
    action.run(() =>
      request('advice', '/plant-disease', {method: 'POST', body}),
    );
  }

  function clearPhoto() {
    selectedPhoto.current?.cleanup?.();
    selectedPhoto.current = null;
    setPhoto(null);
    setError('');
    action.reset();
  }

  const photoActions = (retry = false) => (
    <Stack>
      <Button
        label={retry ? 'Take another photo' : 'Take a photo'}
        icon="camera"
        disabled={picking}
        onPress={() => selectPhoto(true)}
      />
      <Button
        label={retry ? 'Choose another photo' : 'Choose a photo'}
        icon="image"
        variant="secondary"
        disabled={picking}
        onPress={() => selectPhoto(false)}
      />
    </Stack>
  );

  if (uncertain) {
    return (
      <Screen
        title={t('navigation.cropCare', {defaultValue: 'Crop Care'})}
        back={clearPhoto}>
        <Notice title="We cannot identify this reliably" tone="info">
          This photo did not give a clear enough result. No diagnosis has been
          made.
        </Notice>
        <Columns>
          <Stack>
            <Text variant="heading">Try a clearer photo</Text>
            <Text tone="muted">
              Photograph the affected leaf in daylight. Keep it in focus and
              fill the frame.
            </Text>
            {photoActions(true)}
            {error ? (
              <Notice title="Could not open a photo" tone="error">
                {error}
              </Notice>
            ) : null}
          </Stack>
          <Card>
            <Text variant="section">Get local help</Text>
            <Row
              title="Ask your local agricultural extension centre"
              icon="help-circle"
              onPress={() =>
                Linking.openURL('https://kvk.icar.gov.in/').catch(() =>
                  setError('Could not open the extension centre directory.'),
                )
              }
            />
            <Text tone="muted">Keep the original photo to show an expert.</Text>
          </Card>
        </Columns>
      </Screen>
    );
  }

  const result = action.data;
  return (
    <Screen
      title={t('navigation.cropCare', {defaultValue: 'Crop Care'})}
      back={photo ? clearPhoto : back}
      primary="CropCare"
      go={go}>
      {photo ? (
        <Columns>
          <Stack>
            <Text variant="title">Review your photo</Text>
            <Image
              accessibilityLabel="Selected crop photo"
              source={{uri: photo.uri}}
              resizeMode="contain"
              style={styles.photo}
            />
            <Button
              label={action.pending ? 'Checking photo…' : 'Check this photo'}
              icon="search"
              disabled={action.pending || picking}
              onPress={checkPhoto}
            />
            <Button
              label="Choose another photo"
              icon="image"
              disabled={action.pending || picking}
              variant="secondary"
              onPress={() => selectPhoto(false)}
            />
            {error ? (
              <Notice title="Could not open a photo" tone="error">
                {error}
              </Notice>
            ) : null}
          </Stack>
          <Stack>
            <Result pending={action.pending} error={action.error} />
            {result ? (
              <Card>
                <Text variant="heading">Crop photo check</Text>
                {result.plant ? (
                  <Row title="Plant" description={result.plant} />
                ) : null}
                {result.disease ? (
                  <Row title="Possible issue" description={result.disease} />
                ) : null}
                {result.leaf_health ? (
                  <Row
                    title="Leaf condition"
                    description={result.leaf_health}
                  />
                ) : null}
                {result.treatment_procedure ? (
                  <Text>{result.treatment_procedure}</Text>
                ) : null}
                {result.source ? (
                  <Text variant="caption" tone="muted">
                    Source: {result.source}
                  </Text>
                ) : null}
              </Card>
            ) : (
              <Notice title="Before you send">
                Choose a clear picture of the affected leaf. Send it only when
                you are ready to run the check.
              </Notice>
            )}
          </Stack>
        </Columns>
      ) : (
        <Columns>
          <Stack>
            <Text variant="title">A closer look at your crop</Text>
            <Illustration name="crop" style={styles.art} />
            <Text tone="muted">
              Start with a clear photo of the affected leaf. Keep it in focus
              and use daylight.
            </Text>
            {photoActions()}
            {error ? (
              <Notice title="Could not open a photo" tone="error">
                {error}
              </Notice>
            ) : null}
          </Stack>
          <Stack>
            <Notice title="What happens next" tone="default">
              Review your photo, then see what can be identified and the next
              steps. Uncertain results will say so.
            </Notice>
            <Notice title="Previous crop checks" tone="default">
              Your saved checks will appear here when crop history is available.
            </Notice>
          </Stack>
        </Columns>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: {height: 158, width: '100%', maxWidth: 360, alignSelf: 'center'},
  photo: {
    height: 220,
    width: '100%',
    backgroundColor: theme.recessed,
    borderRadius: theme.r1,
  },
});
