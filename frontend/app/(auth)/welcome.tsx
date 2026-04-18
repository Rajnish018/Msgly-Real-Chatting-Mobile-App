import Button from "@/components/Button";
import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";
import { colors, spacingX, spacingY } from "@/constants/theme";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import {StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";




const Welcome=()=>{
    const router=useRouter();

    return(
        <ScreenWrapper showPattern={true} bgOpacity={0.5} >
            <View style={styles.container}>
                <View style={{alignItems:'center'}}>
                    <Typo color={colors.white} fontWeight={'900'} size={43}>
                        Msgly

                    </Typo>

                </View>
                <Animated.Image
                entering={FadeIn.duration(700).springify()}
                source={require('../../assets/images/welcome.png')}
                style={styles.welcomeImage}
                resizeMode={'contain'}
                />

                <View>
                    <Typo color={colors.white} size={33} fontWeight={'800'}>
                        Stay Connected
                    </Typo>
                    <Typo color={colors.white} size={33} fontWeight={'800'}>
                        with your close friends
                    </Typo>
                    <Typo color={colors.white} size={33} fontWeight={'800'}>
                        and family
                    </Typo>
                </View>

                <Button 
                style={{backgroundColor:colors.white}} 
                onPress={()=>{
                    // console.log("Get Started clicked");
                    router.push('/(auth)/login')}}
                >
                    <Typo size={23} fontWeight={'bold'}>Get Started</Typo>
                </Button>

            </View>
        </ScreenWrapper>
    )
}

export default Welcome;

const styles= StyleSheet.create({
    container:{
        flex:1,
        justifyContent:'space-around',
        paddingHorizontal:spacingX._20,
        marginVertical:spacingY._40,
    },
    background:{
        flex:1,
        backgroundColor:colors.neutral900,

    },
    welcomeImage:{
        height:verticalScale(300),
        aspectRatio:1,
        alignSelf:'center',
    },
})