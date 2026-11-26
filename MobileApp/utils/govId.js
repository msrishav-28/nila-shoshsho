export function isMaskedGovId(value) {
  return /^\*+\d{0,4}$/.test(String(value || '').trim());
}
