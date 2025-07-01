import { View } from "react-native"
import { theme } from "../theme.config";
import Header from "../components/Header";

const Notifications = () => {
    return(
        <View style={theme.container}>
            <Header text={'Notifications'} />
        </View>
    )
}
export default Notifications;