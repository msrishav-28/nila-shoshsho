import {useCallback, useEffect, useRef, useState} from 'react';
import {accountFetch, adviceFetch} from '../utils/api';

const clients = {account: accountFetch, advice: adviceFetch};

export class ApiError extends Error {
  constructor(status, body) {
    const detail = [body?.error, body?.message].find(
      value => typeof value === 'string',
    );
    super(
      detail ||
        (status === 401
          ? 'Please sign in again.'
          : 'This information is unavailable right now.'),
    );
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export async function request(client, path, options = {}) {
  const {body, ...rest} = options;
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await clients[client](path, {
    ...rest,
    body:
      body === undefined || multipart || typeof body === 'string'
        ? body
        : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new ApiError(response.status, result);
  }
  if (result === null && response.status !== 204) {
    throw new ApiError(response.status, {
      message: 'The server returned an unreadable response.',
    });
  }
  return result;
}

export function message(error) {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof TypeError) {
    return 'Could not reach the service. Check your connection and try again.';
  }
  return error?.message || 'Something went wrong. Please try again.';
}

const initial = {data: null, error: null, pending: false};

export function useAction() {
  const [state, setState] = useState(initial);
  const version = useRef(0);
  useEffect(
    () => () => {
      version.current += 1;
    },
    [],
  );
  const reset = useCallback(() => {
    version.current += 1;
    setState(initial);
  }, []);
  const run = useCallback(async callback => {
    const current = ++version.current;
    setState({data: null, error: null, pending: true});
    try {
      const data = await callback();
      if (version.current === current) {
        setState({data, error: null, pending: false});
        return data;
      }
    } catch (error) {
      if (version.current === current) {
        setState({data: null, error, pending: false});
      }
    }
  }, []);
  return {...state, run, reset};
}
