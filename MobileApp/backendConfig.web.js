const withoutTrailingSlash = url => url.trim().replace(/\/+$/, '');

export const BACKEND_URL = withoutTrailingSlash(
  process.env.EXPO_PUBLIC_ACCOUNT_API_URL || '/api',
);
export const AIBACKEND_URL = withoutTrailingSlash(
  process.env.EXPO_PUBLIC_ADVICE_API_URL || '/advice',
);
