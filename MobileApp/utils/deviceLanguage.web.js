/* eslint-env browser */

export function getDeviceLanguage() {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  const language = navigator.languages?.[0] || navigator.language;
  return language?.split('-')[0];
}
