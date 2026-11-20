import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {theme} from '../theme.config';
import {adviceLang} from '../utils/lang';
import {readVoicePreference} from './accountPreferences';
import {appendFile, playVoice, recordVoice} from './device';
import {message, request} from './data';
import {
  Button,
  Card,
  Columns,
  Field,
  Icon,
  Notice,
  Row,
  Screen,
  Select,
  Stack,
  Text,
} from './ui';

const languages = [
  {label: 'Use app language', value: ''},
  {label: 'English', value: 'en'},
  {label: 'हिन्दी', value: 'hi'},
  {label: 'मराठी', value: 'mr'},
  {label: 'தமிழ்', value: 'ta'},
  {label: 'বাংলা', value: 'bn'},
  {label: 'ಕನ್ನಡ', value: 'kn'},
  {label: 'తెలుగు', value: 'te'},
  {label: 'മലയാളം', value: 'ml'},
];
const prompts = [
  [
    'How do I care for this crop?',
    'Start with your crop and what you see',
    'feather',
  ],
  ['What is the mandi price?', 'Choose a crop and market', 'trending-up'],
  [
    'Which schemes can I apply for?',
    'Use your state and farm details',
    'layers',
  ],
];
const liveFeedLabels = {market_prices: 'mandi prices', weather: 'weather'};

function Answer({entry, lang}) {
  const stopPlayback = useRef(null);
  const mounted = useRef(true);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopPlayback.current?.();
    };
  }, []);
  async function toggle() {
    if (playing) {
      stopPlayback.current?.();
      stopPlayback.current = null;
      setPlaying(false);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = await request('advice', '/voice/tts', {
        method: 'POST',
        body: {text: entry.answer.slice(0, 2400), lang},
      });
      if (!data?.audio_base64) {
        throw new Error('Read-aloud is unavailable for this answer.');
      }
      if (!mounted.current) {
        return;
      }
      const stop = await playVoice(data.audio_base64, () => {
        if (mounted.current) {
          setPlaying(false);
          stopPlayback.current = null;
        }
      });
      if (mounted.current) {
        stopPlayback.current = stop;
        setPlaying(true);
      } else {
        stop();
      }
    } catch (failure) {
      if (mounted.current) {
        setError(message(failure));
      }
    } finally {
      if (mounted.current) {
        setBusy(false);
      }
    }
  }
  return (
    <Card>
      <Text variant="section">Your question</Text>
      <Text>{entry.question}</Text>
      <Text variant="section">Nila’s answer</Text>
      <Text selectable>{entry.answer}</Text>
      {entry.sources.map((source, index) => {
        const title =
          typeof source === 'string' ? source : source?.source || source?.title;
        const link =
          typeof source?.url === 'string' && /^https?:\/\//i.test(source.url)
            ? source.url
            : null;
        return title ? (
          <Row
            key={`${title}-${index}`}
            title={title}
            description={source?.asOf}
            icon="external-link"
            onPress={
              link
                ? () =>
                    Linking.openURL(link).catch(() =>
                      setError('Could not open the source.'),
                    )
                : undefined
            }
          />
        ) : null;
      })}
      <Button
        label={
          playing ? 'Stop reading' : busy ? 'Preparing audio…' : 'Read aloud'
        }
        icon={playing ? 'square' : 'volume-2'}
        variant="ghost"
        disabled={busy}
        onPress={toggle}
      />
      {error ? <Text tone="error">{error}</Text> : null}
    </Card>
  );
}

export function AskNilaScreen({
  params,
  back,
  user,
  voiceDraft = '',
  setVoiceDraft,
  offline,
}) {
  const {i18n} = useTranslation();
  const [stage, setStage] = useState(
    voiceDraft || params?.question ? 'compose' : 'start',
  );
  const [lang, setLang] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [history, setHistory] = useState([]);
  const recorder = useRef(null);
  const work = useRef(0);
  const sending = useRef(null);
  const retryAt = useRef(0);
  const [seed, setSeed] = useState(params?.question || '');
  const draft = voiceDraft || seed;
  function editDraft(value) {
    setSeed('');
    setVoiceDraft(value);
  }
  const speechLanguage = adviceLang(lang, i18n.language);

  useEffect(() => {
    let active = true;
    readVoicePreference(user)
      .then(value => {
        if (active) {
          setLang(value);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const handle = AppState.addEventListener('change', state => {
      if (state === 'background' && recorder.current) {
        const current = recorder.current;
        recorder.current = null;
        work.current += 1;
        current.cancel().catch(() => {});
        setStage('compose');
        setBusy('');
        setError(
          'Recording stopped while the app was in the background. You can try again or type.',
        );
      }
    });
    return () => {
      handle.remove();
      work.current += 1;
      recorder.current?.cancel().catch(() => {});
      recorder.current = null;
      sending.current?.abort();
    };
  }, []);

  async function startRecording() {
    if (busy || recorder.current) {
      return;
    }
    if (offline) {
      setError(
        'Voice needs a connection. You can type your question now and send it later.',
      );
      setStage('compose');
      return;
    }
    const attempt = ++work.current;
    setError('');
    setBusy('Starting microphone…');
    try {
      const current = await recordVoice();
      if (attempt !== work.current) {
        await current.cancel().catch(() => {});
        return;
      }
      recorder.current = current;
      setStage('listening');
    } catch (failure) {
      if (attempt === work.current) {
        setError(message(failure));
        setStage('compose');
      }
    } finally {
      if (attempt === work.current) {
        setBusy('');
      }
    }
  }

  async function stopRecording() {
    const current = recorder.current;
    if (!current || busy) {
      return;
    }
    recorder.current = null;
    const attempt = work.current;
    setBusy('Transcribing…');
    let file;
    try {
      file = await current.stop();
      if (!file || attempt !== work.current) {
        return;
      }
      const body = new FormData();
      appendFile(body, 'audio', file);
      body.append('lang', speechLanguage);
      const data = await request('advice', '/voice/stt', {
        method: 'POST',
        body,
      });
      if (attempt !== work.current) {
        return;
      }
      if (!data?.transcript?.trim()) {
        throw new Error(
          'Could not hear speech. Try again or type your question.',
        );
      }
      editDraft(data.transcript);
      setStage('review');
    } catch (failure) {
      if (attempt === work.current) {
        setError(message(failure));
        setStage('compose');
      }
    } finally {
      try {
        await file?.cleanup?.();
      } catch {
        /* Temporary files can expire from the OS cache. */
      }
      if (attempt === work.current) {
        setBusy('');
      }
    }
  }

  function cancelRecording(next = 'start') {
    work.current += 1;
    recorder.current?.cancel().catch(() => {});
    recorder.current = null;
    setStage(next);
    setBusy('');
  }

  async function send() {
    const question = draft.trim();
    if (!question || busy || sending.current) {
      return;
    }
    if (retryAt.current > Date.now()) {
      const seconds = Math.ceil((retryAt.current - Date.now()) / 1000);
      setError(`Try again in ${seconds} seconds.`);
      return;
    }
    editDraft(question);
    if (offline) {
      setStage('connection');
      return;
    }
    const controller = new AbortController();
    sending.current = controller;
    setBusy('Sending question…');
    setError('');
    try {
      const data = await request('advice', '/chatbot/ask', {
        method: 'POST',
        signal: controller.signal,
        body: {question, lang: speechLanguage, has_image: false},
      });
      if (controller.signal.aborted) {
        return;
      }
      if (!data?.answer) {
        throw new Error('Nila did not receive an answer. You can try again.');
      }
      setHistory(values => [
        ...values,
        {
          question,
          answer: data.answer,
          sources: Array.isArray(data.sources) ? data.sources : [],
        },
      ]);
      editDraft('');
      setStage('compose');
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure?.status === 429 && Number.isFinite(failure.retryAt)) {
          retryAt.current = failure.retryAt;
        }
        if (failure?.code === 'live_data_unavailable') {
          const unavailable = failure.body?.unavailable;
          const labels = Array.isArray(unavailable)
            ? Object.keys(liveFeedLabels)
                .filter(feed => unavailable.includes(feed))
                .map(feed => liveFeedLabels[feed])
            : [];
          setError(
            labels.length
              ? `Unavailable feeds: ${labels.join(', ')}. ${message(failure)}`
              : message(failure),
          );
          setStage('unavailable');
          return;
        }
        setError(message(failure));
        setStage('connection');
      }
    } finally {
      if (!controller.signal.aborted) {
        sending.current = null;
        setBusy('');
      }
    }
  }

  const language = (
    <Select
      label="Speaking language"
      value={lang}
      options={languages}
      onChange={setLang}
    />
  );
  const loading = busy ? (
    <Stack gap={5} style={styles.loading}>
      <ActivityIndicator color={theme.paddy} />
      <Text variant="small" accessibilityLiveRegion="polite">
        {busy}
      </Text>
    </Stack>
  ) : null;

  if (stage === 'listening') {
    return (
      <Screen
        title="Ask Nila"
        back={() => cancelRecording(draft ? 'compose' : 'start')}>
        <Stack style={styles.center} gap={12}>
          <View style={styles.mic}>
            <Icon name="mic" size={34} />
          </View>
          <Text variant="title">Listening to you</Text>
          <Text tone="muted">
            Speak naturally. Stop when you are ready to review.
          </Text>
        </Stack>
        {language}
        <Notice title="Microphone is on" tone="green">
          Your question is not sent yet
        </Notice>
        <Button
          label="Stop recording"
          icon="square"
          onPress={stopRecording}
          disabled={Boolean(busy)}
        />
        <Button
          label="Cancel recording"
          variant="secondary"
          onPress={() => cancelRecording(draft ? 'compose' : 'start')}
        />
        <Row
          title="Prefer typing?"
          description="Switch to a written question"
          icon="edit-3"
          onPress={() => cancelRecording('compose')}
        />
        {loading}
      </Screen>
    );
  }

  if (['review', 'connection', 'unavailable'].includes(stage)) {
    const connection = stage === 'connection';
    const unavailable = stage === 'unavailable';
    const retry = connection || unavailable;
    return (
      <Screen
        title={retry ? 'Ask Nila' : 'Review your question'}
        back={() => setStage('compose')}>
        <Text variant="title">
          {unavailable
            ? 'Live data is unavailable'
            : connection
            ? 'Your question is safe here'
            : 'Is this what you meant?'}
        </Text>
        <Text tone="muted">
          {unavailable
            ? 'Your question is saved here. You can try again later or edit it.'
            : connection
            ? 'We could not get an answer. You can try again or edit your question.'
            : 'Correct any words before you send.'}
        </Text>
        <Notice title={retry ? 'Your question' : 'Your words'} tone="default">
          {draft}
        </Notice>
        {error ? (
          <Text tone="error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={retry ? 'Try again' : 'Send question'}
          icon={retry ? 'refresh-cw' : 'send'}
          onPress={send}
          disabled={Boolean(busy)}
        />
        <Button
          label={retry ? 'Edit question' : 'Edit words'}
          icon="edit-3"
          variant="secondary"
          onPress={() => setStage('compose')}
          disabled={Boolean(busy)}
        />
        {!retry ? (
          <Row
            title="Record again"
            description="Replace this recording"
            icon="mic"
            onPress={startRecording}
          />
        ) : null}
        {!retry ? (
          <Text variant="caption" tone="muted">
            You can change the crop or market in your question.
          </Text>
        ) : null}
        {loading}
      </Screen>
    );
  }

  return (
    <Screen title="Ask Nila" back={back} kind="wide">
      <Columns>
        <Stack>
          <Text variant="title">What would help today?</Text>
          <Text tone="muted">
            Ask about your crop, the weather, market prices or government
            support.
          </Text>
          <View style={styles.actions}>
            <Button
              label="Speak"
              icon="mic"
              style={styles.grow}
              onPress={startRecording}
              disabled={Boolean(busy)}
            />
            <Button
              label="Type"
              icon="edit-3"
              style={styles.grow}
              onPress={() => setStage('compose')}
              variant="secondary"
              disabled={Boolean(busy)}
            />
          </View>
          {language}
          {stage === 'compose' ? (
            <Stack>
              <Field
                label="Your question"
                placeholder="Type your question"
                value={draft}
                onChangeText={editDraft}
                autoFocus={!busy && !history.length}
                multiline
                editable={!busy}
              />
              <Button
                label="Send question"
                icon="send"
                onPress={send}
                disabled={!draft.trim() || Boolean(busy)}
              />
            </Stack>
          ) : null}
          {error ? (
            <Notice title="Ask Nila needs your attention" tone="info">
              {error}
            </Notice>
          ) : null}
          {loading}
        </Stack>
        <Stack>
          {history.length ? (
            history.map((entry, index) => (
              <Answer key={index} entry={entry} lang={speechLanguage} />
            ))
          ) : (
            <Card>
              <Text variant="section">Try a question</Text>
              {prompts.map(([question, subtitle, icon]) => (
                <Row
                  key={question}
                  title={question}
                  description={subtitle}
                  icon={icon}
                  onPress={() => {
                    if (!busy) {
                      editDraft(question);
                      setStage('compose');
                    }
                  }}
                />
              ))}
            </Card>
          )}
          <Notice title="You stay in control">
            Review spoken words before sending. Answers show sources when
            available.
          </Notice>
        </Stack>
      </Columns>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {flexDirection: 'row', gap: 10},
  grow: {flex: 1},
  center: {alignItems: 'center', paddingVertical: 16},
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.paddySoft,
  },
  loading: {alignItems: 'center'},
});
