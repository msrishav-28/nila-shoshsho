/* eslint-env browser */

if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker
    .register('/sw.js', {updateViaCache: 'none'})
    .catch(error => {
      console.warn('Offline startup could not be enabled.', error);
    });
}
