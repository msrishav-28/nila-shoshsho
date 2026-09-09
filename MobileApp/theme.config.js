import {Dimensions, StatusBar} from 'react-native';

const {width, height} = Dimensions.get('window');

const paddy = '#1F6B3A';
const paddyPressed = '#17532D';
const paddyTint = '#1F6B3A1A';
const paddySoft = '#E5F0E8';
const turmeric = '#D4A017';
const turmericPressed = '#B38710';
const turmericTint = '#D4A01722';
const monsoon = '#3E6D7A';
const monsoonSoft = '#E4EEF0';
const canvas = '#F4EFE4';
const surface = '#FFFBF3';
const recessed = '#EBE4D6';
const hairline = '#D7CFBF';
const ink = '#1C1915';
const inkSoft = '#5C564C';
const inkFaint = '#8A8376';
const inkInverse = '#FFFBF3';
const alert = '#C4472A';
const alertSoft = '#F8E6E1';

const statusPad = StatusBar.currentHeight || 24;

export const theme = {
  paddy,
  paddyPressed,
  paddyTint,
  paddySoft,
  turmeric,
  turmericPressed,
  turmericTint,
  monsoon,
  monsoonSoft,
  canvas,
  surface,
  recessed,
  hairline,
  ink,
  inkSoft,
  inkFaint,
  inkInverse,
  alert,
  alertSoft,

  primary: paddy,
  primaryDark: paddyPressed,
  primaryLight: paddySoft,
  secondary: paddy,
  secondaryDark: paddyPressed,
  accent: turmeric,
  accentLight: turmericTint,
  danger: alert,
  warning: turmeric,
  success: paddy,
  info: monsoon,
  bg: canvas,
  bgSecondary: recessed,
  card: surface,
  cardSecondary: recessed,
  border: hairline,
  borderDark: '#C4BBA8',
  shadow: '#1C1915',
  overlay: '#1C191566',
  gradient: [paddy, '#3E9A58'],
  gradientSecondary: [monsoon, '#7FA4AE'],
  blue: monsoon,
  text: ink,
  text2: inkSoft,
  text3: inkFaint,
  textInverse: inkInverse,
  link: monsoon,
  white: inkInverse,
  darkBrown: ink,
  skin: '#E8D7B8',

  fs0: 40,
  fs00: 28,
  fs1: 28,
  fs2: 22,
  fs3: 17,
  fs4: 16,
  fs5: 15,
  fs6: 15,
  fs7: 13,

  r1: 16,
  r2: 14,
  r3: 12,

  space: {4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 48: 48, 64: 64},
  radius: {sm: 12, md: 14, lg: 16, pill: 999},
  type: {
    display: {fontSize: 40, fontFamily: 'Poppins-Black', lineHeight: 44, color: ink},
    title: {fontSize: 28, fontFamily: 'Poppins-Bold', lineHeight: 34, color: ink},
    titleSm: {fontSize: 22, fontFamily: 'Poppins-Bold', lineHeight: 28, color: ink},
    price: {fontSize: 34, fontFamily: 'Poppins-Bold', lineHeight: 38, color: ink, fontVariant: ['tabular-nums']},
    temp: {fontSize: 44, fontFamily: 'Poppins-Bold', lineHeight: 44, color: ink, fontVariant: ['tabular-nums']},
    body: {fontSize: 17, fontFamily: 'Poppins-Regular', lineHeight: 25, color: ink},
    bodyStrong: {fontSize: 17, fontFamily: 'Poppins-SemiBold', lineHeight: 25, color: ink},
    callout: {fontSize: 15, fontFamily: 'Poppins-SemiBold', lineHeight: 20, color: ink},
    meta: {fontSize: 13, fontFamily: 'Poppins-Regular', lineHeight: 18, color: inkSoft},
    tab: {fontSize: 11, fontFamily: 'Poppins-SemiBold', lineHeight: 13, color: inkFaint},
    button: {fontSize: 16, fontFamily: 'Poppins-Bold', lineHeight: 16, color: inkInverse},
  },
  shadow1: {
    shadowColor: '#1C1915',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  shadow2: {
    shadowColor: '#1C1915',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },

  font: {
    regular: 'Poppins-Regular',
    bold: 'Poppins-Bold',
    light: 'Poppins-Light',
    thin: 'Poppins-Thin',
    dark: 'Poppins-Black',
    medium: 'Poppins-Medium',
    semi: 'Poppins-SemiBold',
  },

  width,
  height,
  tabBarHeight: 64,
  seedSize: 64,
  hit: 48,
  screenPad: 20,

  container: {
    flex: 1,
    backgroundColor: canvas,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: statusPad + 12,
  },
  containerPrimary: {
    flex: 1,
    backgroundColor: paddy,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: statusPad + 12,
  },
  containerSecondary: {
    flex: 1,
    backgroundColor: canvas,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: statusPad + 12,
  },
  test: {borderWidth: 1, borderColor: hairline},
  button: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: paddy,
  },
  buttonSecondary: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: surface,
    borderWidth: 1.5,
    borderColor: paddy,
  },
  buttonOutline: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: paddy,
  },
};
