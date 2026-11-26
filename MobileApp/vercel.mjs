export const config = {
  framework: null,
  installCommand: 'npm ci',
  buildCommand:
    'EXPO_PUBLIC_ACCOUNT_API_URL=/api EXPO_PUBLIC_ADVICE_API_URL=/advice npm run build:web',
  outputDirectory: 'dist',
  headers: [
    {source: '/', headers: [{key: 'Cache-Control', value: 'no-cache'}]},
    {source: '/index.html', headers: [{key: 'Cache-Control', value: 'no-cache'}]},
    {
      source: '/manifest.webmanifest',
      headers: [{key: 'Cache-Control', value: 'no-cache'}],
    },
    {
      source: '/offline-startup.js',
      headers: [{key: 'Cache-Control', value: 'no-cache'}],
    },
    {source: '/sw.js', headers: [{key: 'Cache-Control', value: 'no-cache'}]},
    {source: '/api/:path*', headers: [{key: 'Cache-Control', value: 'private, no-store'}]},
    {source: '/advice/:path*', headers: [{key: 'Cache-Control', value: 'private, no-store'}]},
  ],
  rewrites: [
    {source: '/api/:path*', destination: 'https://nila-shoshsho-account-production.onrender.com/api/:path*'},
    {source: '/advice/:path*', destination: 'https://nila-shoshsho-advice-production.onrender.com/:path*'},
  ],
};
