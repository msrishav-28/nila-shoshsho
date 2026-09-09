import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {theme} from '../theme.config';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';

const Header = ({text, right}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const {t} = useTranslation();
  return (
    <View style={[styles.topNav, {paddingTop: Math.max(insets.top, 12)}]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('header.back')}
          hitSlop={8}>
          <Icon name="chevron-back" size={22} color={theme.ink} />
        </TouchableOpacity>
        <Text style={styles.appName} numberOfLines={1}>
          {text}
        </Text>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    backgroundColor: theme.canvas,
    paddingBottom: 8,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.recessed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    ...theme.type.titleSm,
    flex: 1,
  },
  right: {
    minWidth: 44,
    alignItems: 'flex-end',
  },
});

export default Header;
