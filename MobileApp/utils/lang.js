const CODE_BY_ALIAS = {
  en: 'en',
  english: 'en',
  hi: 'hi',
  hindi: 'hi',
  हिन्दी: 'hi',
  हिंदी: 'hi',
  mr: 'mr',
  marathi: 'mr',
  मराठी: 'mr',
  ta: 'ta',
  tamil: 'ta',
  தமிழ்: 'ta',
  bn: 'bn',
  bengali: 'bn',
  bangla: 'bn',
  বাংলা: 'bn',
  kn: 'kn',
  kannada: 'kn',
  ಕನ್ನಡ: 'kn',
  te: 'te',
  telugu: 'te',
  తెలుగు: 'te',
  ml: 'ml',
  malayalam: 'ml',
  മലയാളം: 'ml',
};

const NAME_BY_CODE = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  bn: 'Bengali',
  kn: 'Kannada',
  te: 'Telugu',
  ml: 'Malayalam',
};

export function adviceLang(...candidates) {
  for (const raw of candidates) {
    if (raw == null) {
      continue;
    }
    const text = String(raw).trim();
    if (!text) {
      continue;
    }
    const lower = text.toLowerCase();
    if (CODE_BY_ALIAS[lower]) {
      return CODE_BY_ALIAS[lower];
    }
    if (CODE_BY_ALIAS[text]) {
      return CODE_BY_ALIAS[text];
    }
    const short = lower.split(/[-_]/)[0];
    if (CODE_BY_ALIAS[short]) {
      return CODE_BY_ALIAS[short];
    }
  }
  return 'en';
}

export function adviceLangName(code) {
  return NAME_BY_CODE[code] || 'English';
}
