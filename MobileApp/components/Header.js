import {Image, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {theme} from '../theme.config';
import Icon from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';

const Header = ({text}) => {
  const navigation = useNavigation();
  return (
    <View style={styles.topNav}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}>
        <Image
          source={require('../assets/icons/back.png')}
          style={{width: 25, height: 25}}
        />
      </TouchableOpacity>
      <Text style={styles.appName}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  topNav: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    gap: 7,
    marginBottom: -10,
  },
  backButton: {
    padding: 10,
    backgroundColor: theme.darkBrown,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.7,
    width: 50,
  },
  appName: {
    fontSize: theme.fs00,
    fontFamily: theme.font.dark,
    color: theme.text2,
  },
});

export default Header;
