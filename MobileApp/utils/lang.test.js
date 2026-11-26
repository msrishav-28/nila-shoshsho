import {adviceLang} from './lang';

test('maps short codes, English names, and Hindi script to hi', () => {
  expect(adviceLang('hi')).toBe('hi');
  expect(adviceLang('Hindi')).toBe('hi');
  expect(adviceLang('हिन्दी')).toBe('hi');
  expect(adviceLang('en-IN')).toBe('en');
  expect(adviceLang(null, 'English')).toBe('en');
});
