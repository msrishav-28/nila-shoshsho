/* eslint-env browser */

const key = 'nila.accessToken';

export async function readSessionToken() {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function writeSessionToken(token) {
  try {
    if (token) {
      window.sessionStorage.setItem(key, token);
    } else {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // A browser that blocks session storage can still hold a token in memory.
  }
}
