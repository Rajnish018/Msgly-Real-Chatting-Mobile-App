import { useTheme } from "@/context/themeContext";
import { ScreenWrapperProps } from "@/types";
import { ImageBackground, Platform, StatusBar, View } from "react-native";
// ✅ 1. Import the hook for safe area measurements
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ScreenWrapper = ({
    style,
    children,
    showPattern = false,
    isModal = false,
    bgOpacity = 1
}: ScreenWrapperProps) => {
    const { colors, isDark } = useTheme();
    
    // ✅ 2. Get the actual notch and home indicator sizes
    const insets = useSafeAreaInsets();

    // ✅ 3. Calculate padding based on real device data
    // If it's a modal, we might want less top padding, but never less than the notch height
    let paddingTop = isModal ? insets.top : insets.top > 0 ? insets.top : 20;
    
    // On many Androids, insets.top might be 0 if the status bar is translucent, 
    // so we add a small default (like 10-15) if needed.
    if (Platform.OS === 'android') paddingTop += 5;

    return (
        <ImageBackground 
            style={{
                flex: 1,
                backgroundColor: isModal ? colors.white : colors.neutral900
            }}
            imageStyle={{
                opacity: showPattern ? bgOpacity : 0
            }}
            source={require('../assets/images/bgPattern.png')}
        >
            <View
                style={[
                    {
                        flex: 1,
                        paddingTop: paddingTop,
                        // ✅ 4. Add bottom padding for the home indicator bar
                        paddingBottom: isModal ? insets.bottom : 0, 
                    }, 
                    style
                ]}
            >
                <StatusBar 
                    barStyle={isDark ? 'light-content' : 'dark-content'} 
                    translucent // Makes sure the background pattern goes under the status bar
                    backgroundColor={'transparent'} 
                />
                {children}
            </View>
        </ImageBackground>
    );
};

export default ScreenWrapper;