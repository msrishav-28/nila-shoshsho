function apiBase(name) {
  const value = process.env[name]?.trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Set ${name} to the HTTPS base URL for this deployment.`);
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  ) {
    throw new Error(
      `${name} must be an HTTPS base URL without credentials, a query, or a fragment.`,
    );
  }
  return url.href.replace(/\/+$/, '');
}

const account = apiBase('ACCOUNT_API_BASE_URL');
const advice = apiBase('ADVICE_API_BASE_URL');
const revalidate = [{key: 'Cache-Control', value: 'no-cache'}];
const privateResponse = [{key: 'Cache-Control', value: 'private, no-store'}];

export const config = {
  framework: null,
  installCommand: 'npm ci',
  buildCommand:
    'EXPO_PUBLIC_ACCOUNT_API_URL=/api EXPO_PUBLIC_ADVICE_API_URL=/advice npm run build:web',
  outputDirectory: 'dist',
  headers: [
    {source: '/', headers: revalidate},
    {source: '/index.html', headers: revalidate},
    {source: '/manifest.webmanifest', headers: revalidate},
    {source: '/offline-startup.js', headers: revalidate},
    {source: '/sw.js', headers: revalidate},
    {source: '/api/:path*', headers: privateResponse},
    {source: '/advice/:path*', headers: privateResponse},
  ],
  rewrites: [
    {source: '/api/:path*', destination: `${account}/:path*`},
    {source: '/advice/:path*', destination: `${advice}/:path*`},
  ],
};
