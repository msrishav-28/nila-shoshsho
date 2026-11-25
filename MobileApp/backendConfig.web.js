const withoutTrailingSlash = url => url.trim().replace(/\/+$/, '');
const localDevelopment = process.env.NODE_ENV === 'development';

export const BACKEND_URL = withoutTrailingSlash(
  process.env.EXPO_PUBLIC_ACCOUNT_API_URL ||
    (localDevelopment ? 'http://127.0.0.1:5001/api' : '/api'),
);
export const AIBACKEND_URL = withoutTrailingSlash(
  process.env.EXPO_PUBLIC_ADVICE_API_URL ||
    (localDevelopment ? 'http://127.0.0.1:5002' : '/advice'),
);
