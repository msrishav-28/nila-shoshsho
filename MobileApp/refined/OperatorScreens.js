import React, {useEffect, useRef, useState} from 'react';
import {
  readAccountPreference,
  writeAccountPreference,
} from './accountPreferences';
import {request, useAction} from './data';
import {submissionKey} from './plots';
import {Button, Field, Notice, Result, Screen, Select, Stack, Text} from './ui';

export const callbackPilot =
  process.env.EXPO_PUBLIC_VOICE_CALLBACK_PILOT === 'true';

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function StaffReviewScreen({back, user}) {
  const [account, setAccount] = useState('');
  const [kind, setKind] = useState('carrier');
  const [decision, setDecision] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const action = useAction();

  async function review() {
    const result = await action.run(async () => {
      const target = account.trim();
      if (!uuidPattern.test(target)) {
        throw new Error(
          'Enter the account UUID supplied by your review process.',
        );
      }
      if (target.toLowerCase() === user._id.toLowerCase()) {
        throw new Error('A different staff member must review your account.');
      }
      if (!decision || !reason.trim()) {
        throw new Error('Choose a decision and enter a reason.');
      }
      setConfirmed({
        target,
        kind,
        approved: decision === 'approve',
        reason: reason.trim(),
      });
      return true;
    });
    return result;
  }

  const submit = () =>
    action.run(async () => {
      const {target, kind: reviewKind, approved, reason: note} = confirmed;
      const result = await request(
        'account',
        `/reviews/${encodeURIComponent(target)}/${reviewKind}`,
        {
          method: 'PUT',
          body: {approved, reason: note},
        },
      );
      if (result?.success !== true) {
        throw new Error('The server did not confirm the review.');
      }
      setConfirmed(null);
      setReason('');
      setDecision('');
      return result;
    });

  return (
    <Screen title="Staff review" back={back}>
      <Stack>
        <Text>
          Use the account UUID from your staff review process. The server checks
          reviewer access and records the decision.
        </Text>
        <Field
          label="Account UUID"
          value={account}
          onChangeText={setAccount}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={36}
          editable={!confirmed}
        />
        <Select
          label="Review type"
          value={kind}
          onChange={setKind}
          options={[
            {label: 'Carrier approval', value: 'carrier'},
            {label: 'Identity verification', value: 'identity'},
          ]}
          disabled={Boolean(confirmed)}
        />
        <Select
          label="Decision"
          value={decision}
          onChange={setDecision}
          options={[
            {label: 'Approve', value: 'approve'},
            {label: 'Deny or revoke approval', value: 'deny'},
          ]}
          disabled={Boolean(confirmed)}
        />
        <Field
          label="Reason"
          value={reason}
          onChangeText={setReason}
          maxLength={500}
          multiline
          editable={!confirmed}
        />
        {confirmed ? (
          <Stack>
            <Notice title="Confirm this review">
              {confirmed.approved ? 'Approve' : 'Deny or revoke approval for'}{' '}
              {confirmed.target}.
            </Notice>
            <Button
              label="Record decision"
              onPress={submit}
              disabled={action.pending}
            />
            <Button
              label="Edit decision"
              variant="secondary"
              onPress={() => setConfirmed(null)}
              disabled={action.pending}
            />
          </Stack>
        ) : (
          <Button
            label="Review decision"
            onPress={review}
            disabled={action.pending}
          />
        )}
        <Result error={action.error} pending={action.pending} />
        {action.data?.success === true ? (
          <Notice title="Decision recorded" />
        ) : null}
      </Stack>
    </Screen>
  );
}

const callbackPreference = 'voiceCallback';
const callStatus = {
  submitting: 'Submitting your request',
  queued: 'The provider accepted your request',
  in_progress: 'The call is in progress',
  completed: 'The call completed',
  failed: 'The provider reported a failed call',
  unknown: 'The call may already have been requested',
};
const finalStates = ['completed', 'failed', 'unknown'];

function readCallback(data, key) {
  if (
    !uuidPattern.test(data?.callbackId || '') ||
    !Object.prototype.hasOwnProperty.call(callStatus, data.status)
  ) {
    throw new Error(
      'The server did not confirm the call request. Retry this request to check.',
    );
  }
  return {key, callbackId: data.callbackId, status: data.status};
}

export function VoiceCallbackScreen({back, user, offline}) {
  const [record, setRecord] = useState(null);
  const [consent, setConsent] = useState(false);
  const [pollError, setPollError] = useState(null);
  const load = useAction();
  const submit = useAction();
  const sending = useRef(false);
  const {callbackId, key, status} = record || {};
  const loadSaved = load.run;
  const identity = user._id;

  useEffect(() => {
    if (!callbackPilot) {
      return;
    }
    loadSaved(async () => {
      const cached = await readAccountPreference(
        {_id: identity},
        callbackPreference,
      );
      const saved = cached ? JSON.parse(cached) : null;
      if (saved && typeof saved.key !== 'string') {
        throw new Error(
          'The previous callback could not be restored. Ask your pilot operator for help.',
        );
      }
      setRecord(saved);
      return true;
    });
  }, [identity, loadSaved]);

  useEffect(() => {
    if (
      !callbackPilot ||
      offline ||
      !callbackId ||
      finalStates.includes(status)
    ) {
      return;
    }
    const controller = new AbortController();
    let timer;
    const poll = async () => {
      let delay = 10000;
      try {
        const data = await request(
          'account',
          `/voice-callbacks/${encodeURIComponent(callbackId)}`,
          {signal: controller.signal},
        );
        const next = readCallback(data, key);
        if (!controller.signal.aborted) {
          setPollError(null);
          if (status !== next.status) {
            await writeAccountPreference(
              {_id: identity},
              callbackPreference,
              JSON.stringify(next),
            );
            if (!controller.signal.aborted) {
              setRecord(next);
            }
            return;
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPollError(error);
          if (error.status === 404) {
            return;
          }
          delay = Math.max(delay, (error.retryAt || 0) - Date.now());
        }
      }
      if (!controller.signal.aborted) {
        timer = setTimeout(poll, delay);
      }
    };
    timer = setTimeout(poll, 10000);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [callbackId, identity, key, offline, status]);

  const send = async () => {
    if (
      !callbackPilot ||
      offline ||
      sending.current ||
      callbackId ||
      !(key || consent) ||
      submit.error?.retryAt > Date.now()
    ) {
      return;
    }
    sending.current = true;
    try {
      await submit.run(async () => {
        const requestKey = key || submissionKey();
        const started = {key: requestKey};
        await writeAccountPreference(
          user,
          callbackPreference,
          JSON.stringify(started),
        );
        setRecord(started);
        const data = await request('account', '/voice-callbacks', {
          method: 'POST',
          headers: {'Idempotency-Key': requestKey},
          body: {consent: true},
        });
        const next = readCallback(data, requestKey);
        setRecord(next);
        await writeAccountPreference(
          user,
          callbackPreference,
          JSON.stringify(next),
        );
        return next;
      });
    } finally {
      sending.current = false;
    }
  };

  const reset = () =>
    submit.run(async () => {
      await writeAccountPreference(user, callbackPreference, '');
      setRecord(null);
      setPollError(null);
      setConsent(false);
    });

  return (
    <Screen title="Telephone callback pilot" back={back}>
      <Stack>
        <Notice
          title={callbackPilot ? 'One automated call' : 'Pilot unavailable'}>
          This pilot uses the number enrolled by your operator. A new request
          authorizes one automated call to that number.
        </Notice>
        <Result
          error={load.error || submit.error || pollError}
          pending={load.pending || submit.pending}
        />
        {!offline && status ? <Notice title={callStatus[status]} /> : null}
        {offline ? (
          <Notice title="Connect to check or request a callback" />
        ) : null}
        {status === 'unknown' ? (
          <Text>
            Check with your pilot operator before requesting another call.
          </Text>
        ) : null}
        {callbackPilot && load.data && !record ? (
          <Button
            label={consent ? 'Consent given' : 'I agree to receive one call'}
            variant="secondary"
            onPress={() => setConsent(!consent)}
          />
        ) : null}
        {callbackPilot && load.data && !callbackId ? (
          <Button
            label={key ? 'Retry same callback request' : 'Request one call'}
            onPress={send}
            disabled={offline || submit.pending || !(key || consent)}
          />
        ) : null}
        {status === 'completed' || status === 'failed' ? (
          <Button
            label="Start a new request"
            variant="secondary"
            onPress={reset}
            disabled={submit.pending}
          />
        ) : null}
      </Stack>
    </Screen>
  );
}
