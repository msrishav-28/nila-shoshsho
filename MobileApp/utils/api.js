import AsyncStorage from '@react-native-async-storage/async-storage';
import {AIBACKEND_URL, BACKEND_URL} from '../backendConfig';

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

export async function getAccessToken() {
  const stored = await AsyncStorage.getItem('accessToken');
  if (stored) {
    return stored;
  }
  const userJson = await AsyncStorage.getItem('user');
  if (!userJson) {
    return null;
  }
  try {
    const user = JSON.parse(userJson);
    return user.accessToken || null;
  } catch {
    return null;
  }
}

export async function authHeaders(extra = {}, multipart = false) {
  const token = await getAccessToken();
  return {
    ...(multipart || extra['Content-Type'] ? {} : {'Content-Type': 'application/json'}),
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...extra,
  };
}

async function withAuth(url, options = {}) {
  const multipart = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = await authHeaders(options.headers || {}, multipart);
  if (multipart && headers['Content-Type']) {
    delete headers['Content-Type'];
  }
  const response = await fetch(url, {...options, headers});
  if (response.status === 401 && onUnauthorized) {
    onUnauthorized();
  }
  return response;
}

export async function accountFetch(path, options = {}) {
  return withAuth(`${BACKEND_URL}${path}`, options);
}

export async function adviceFetch(path, options = {}) {
  return withAuth(`${AIBACKEND_URL}${path}`, options);
}
