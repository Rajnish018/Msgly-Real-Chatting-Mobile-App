import React, { useState, useRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as Icons from 'phosphor-react-native'

import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import Typo from "@/components/Typo";
import BackButton from "@/components/BackButton";
import Input from "@/components/Input";
import { verticalScale } from "@/utils/styling";
import { useRouter } from "expo-router";
import Button from "@/components/Button";
import { useAuth } from "@/context/authContext";

const Login = () => {
  const emailRef=useRef('')
  const passwordRef=useRef('')
  const [isLoading,setIsLoading]=useState(false)
  const router=useRouter()
  const {signIn}=useAuth()

  const handleSubmit=async()=>{
    if(!emailRef.current||!passwordRef.current){
      Alert.alert("Login","Please fill all the fields")
      return;
    }
    // api request 
    try{
      setIsLoading(true)
      await signIn(emailRef.current,passwordRef.current)

    }catch(error:any){
      Alert.alert("Login error",error.message)
    }finally{
      setIsLoading(false)
    }

  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScreenWrapper showPattern={true}>
        <View style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <BackButton iconSize={28} />
            <Typo size={17} color={colors.white}>
              Forgot your password?
            </Typo>
          </View>

          {/* WHITE CONTENT AREA */}
          <View style={styles.content}>
            <ScrollView
              contentContainerStyle={styles.form}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ gap: spacingY._10, marginBottom: spacingY._15 }}>
                <Typo size={28} fontWeight={"600"}>
                  Welcome back
                </Typo>

                <Typo color={colors.neutral900}>
                  We happy to see you!
                </Typo>
              </View>

              
              <Input 
              placeholder="Enter your email"
              onChangeText={(value:string)=>emailRef.current=value}
              icon={<Icons.AtIcon size={verticalScale(26)} color={colors.neutral600}/>}/>
              <Input 
              placeholder="Enter your password"
              secureTextEntry
              onChangeText={(value:string)=>passwordRef.current=value}
              icon={<Icons.LockIcon size={verticalScale(26)} color={colors.neutral600}/>}/>

              <View style={{marginTop:spacingY._25, gap:spacingY._15}}>
                <Button loading={isLoading} onPress={handleSubmit}>
                  <Typo fontWeight={'bold'} color={colors.black} size={20}>
                    Login
                  </Typo>

                </Button>
                <View style={styles.footer}>
                  <Typo >
                    Don&apos;t have an account ?
                  </Typo>
                    <Pressable onPress={()=>router.push('/(auth)/register')}>
                      <Typo fontWeight={'bold'} color={colors.primaryDark}>
                        Sign Up
                      </Typo>
                    </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
  },

  header: {
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._15,
    paddingBottom: spacingY._25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  content: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    paddingHorizontal: spacingX._20,
    paddingTop: spacingY._20,
    overflow: "hidden", // ✅ keeps rounded corners clean
  },

  form: {
    gap: spacingY._15,
    paddingBottom: spacingY._20, // ✅ prevents bottom cut
  },
  footer: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  gap: spacingX._5,
  marginTop: spacingY._10
},

});
