import {Dimensions, StatusBar} from 'react-native';
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';

const {width, height} = Dimensions.get('window');

export const theme = {
  // Modern Primary Colors
  primary: '#2563EB', // Modern blue - professional and trustworthy
  primaryDark: '#1D4ED8', // Darker shade for pressed states
  secondary: '#10B981', // Fresh emerald green - success and growth
  secondaryDark: '#059669', // Darker green variant
  
  // Accent Colors
  accent: '#F59E0B', // Warm amber - calls attention without being harsh
  accentLight: '#FCD34D', // Light amber for backgrounds
  danger: '#EF4444', // Modern red for errors/warnings
  warning: '#F97316', // Orange for caution
  success: '#10B981', // Same as secondary for consistency
  info: '#3B82F6', // Information blue
  
  // Background Colors
  bg: '#FAFBFC', // Very light gray-blue background
  bgSecondary: '#F8FAFC', // Slightly darker for contrast
  card: '#FFFFFF', // Pure white for cards
  cardSecondary: '#F1F5F9', // Light gray for secondary cards
  
  // Border and UI Elements
  border: '#E2E8F0', // Light gray border
  borderDark: '#CBD5E1', // Darker border for emphasis
  shadow: '#64748B', // Modern gray for shadows
  overlay: 'rgba(15, 23, 42, 0.1)', // Dark overlay with transparency
  
  // Special Colors
  gradient: ['#2563EB', '#3B82F6'], // Blue gradient
  gradientSecondary: ['#10B981', '#34D399'], // Green gradient
  blue: '#3B82F6', // Standard blue
  
  // Text Colors
  text: '#0F172A', // Very dark slate for primary text
  text2: '#475569', // Medium gray for secondary text
  text3: '#94A3B8', // Light gray for muted text
  textInverse: '#FFFFFF', // White text for dark backgrounds
  link: '#2563EB', // Primary blue for links
  white: '#FFFFFF',
  
  // Legacy color compatibility (gradually migrate away from these)
  darkBrown: '#334155', // Updated to modern dark slate
  skin: '#FED7AA', // Updated to modern peach tone

  fs0 : width * 0.099,
  fs00 : width * 0.08,
  fs1: width * 0.07,
  fs2: width * 0.055,
  fs3: width * 0.05,
  fs4: width * 0.045,
  fs5: width * 0.04,
  fs6: width * 0.035,
  fs7: width * 0.03,

  r1: 20,
  r2: 12,
  r3: 6,

  font: {
    regular: 'Poppins-Regular',
    bold: 'Poppins-Bold',
    light: 'Poppins-Light',
    thin: 'Poppins-Thin',
    dark: 'Poppins-Black',
  },

  width,
  height,

  container: {
    backgroundColor: 'white',
    width: width,
    height: height + StatusBar.currentHeight,
    padding: width * 0.02,
    paddingTop: StatusBar.currentHeight + width * 0.06,
    flexDirection: 'column',
    paddingTop: StatusBar.currentHeight + 20,
    padding: 20,
  },
  
  // Additional modern container variants
  containerPrimary: {
    backgroundColor: '#2563EB',
    width: width,
    height: height + StatusBar.currentHeight,
    padding: width * 0.02,
    paddingTop: StatusBar.currentHeight + width * 0.06,
    flexDirection: 'column',
    paddingTop: StatusBar.currentHeight + 20,
    padding: 20,
  },
  
  containerSecondary: {
    backgroundColor: '#FAFBFC',
    width: width,
    height: height + StatusBar.currentHeight,
    padding: width * 0.02,
    paddingTop: StatusBar.currentHeight + width * 0.06,
    flexDirection: 'column',
    paddingTop: StatusBar.currentHeight + 20,
    padding: 20,
  },
  
  test: {borderWidth: 1, borderColor: '#E2E8F0'}, // Updated to use new border color
  
  button: {
    width: '100%',
    paddingVertical: width * 0.04,
    borderRadius: 12, // Increased border radius for modern look
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.05,
    backgroundColor: '#2563EB', // Primary button color
  },
  
  // Additional button variants
  buttonSecondary: {
    width: '100%',
    paddingVertical: width * 0.04,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.05,
    backgroundColor: '#10B981',
  },
  
  buttonOutline: {
    width: '100%',
    paddingVertical: width * 0.04,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.05,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
};
