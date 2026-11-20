import {AIBACKEND_URL, BACKEND_URL} from '../backendConfig';
import {readSessionToken, writeSessionToken} from './sessionToken';

let onUnauthorized = null;
let accessToken = null;
let storageWrite = Promise.resolve();

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export const getAccessToken = () => accessToken;

export async function restoreAccessToken() {
  accessToken = await readSessionToken();
  return accessToken;
}

export function setAccessToken(value) {
  accessToken = value;
  storageWrite = storageWrite
    .catch(() => {})
    .then(() => writeSessionToken(value));
  return storageWrite;
}

async function withAuth(url, options = {}) {
  const {publicRequest, ...fetchOptions} = options;
  const token = publicRequest ? null : accessToken;
  const multipart =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(!multipart && options.body != null
      ? {'Content-Type': 'application/json'}
      : {}),
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...options.headers,
  };
  const response = await fetch(url, {...fetchOptions, headers});
  if (response.status === 401 && token && token === accessToken) {
    await onUnauthorized?.(token);
  }
  return response;
}

export function accountFetch(path, options) {
  return withAuth(`${BACKEND_URL}${path}`, options);
}

export function adviceFetch(path, options) {
  return withAuth(`${AIBACKEND_URL}${path}`, options);
}
