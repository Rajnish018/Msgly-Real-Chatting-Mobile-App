import { View, StyleSheet, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import { colors, spacingX, spacingY } from '@/constants/theme';
import { scale, verticalScale } from '@/utils/styling';
import ScreenWrapper from '@/components/ScreenWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Avatar from '@/components/Avatar';
import * as Icons from 'phosphor-react-native'
import Typo from '@/components/Typo';
import Input from '@/components/Input';
import { UserProps } from '@/types';
import { useAuth } from '@/context/authContext';
import Button from '@/components/Button';
import { useRouter } from 'expo-router';
import { updateProfile } from '@/socket/socketEvents';
import * as ImagePicker from 'expo-image-picker';
import { uploadFileToCloudinary } from '@/services/imageService';



const ProfileModal=()=> {
  const{user,signOut,updateToken}=useAuth()
  const[loading,setLoading]=useState(false)
  const router =useRouter();

  const[userData,setUserData]=useState<UserProps>({
    name:"",
    email:"",
    avatar:null as string |null
  })
useEffect(() => {
  updateProfile(processUpdateProfile);
  return()=>{
    updateProfile(processUpdateProfile,true)
  }
}, []);

const processUpdateProfile=(res:any)=>{
  console.log('got res :',res)
  setLoading(false)
  if(res.success){
    updateToken(res.data.token)
    router.back()

  }else{
    Alert.alert("User",res.msg)
  }
}

 useEffect(() => {
  setUserData({
    name: user?.name || "",
    email: user?.email || "",
    avatar: user?.avatar || null,
  });
}, [user]);

const handleLogout=async()=>{
  router.back()
  await signOut()

}

const onSumbit=async ()=>{
  let{name,avatar}=userData;
  if(!name.trim()){
    Alert.alert("User","please update your name")
    return;
  }

  let data={
    name,
    avatar,
  }


  if(avatar&& typeof avatar?.uri){
    setLoading(true)
    const res=await uploadFileToCloudinary(avatar,"profiles")
    if(res.success){
      data.avatar=res.data
    }else{
      Alert.alert("User",res.msg)
      setLoading(false)
      return;
    }
  }
  
  updateProfile(data)
 
}
const showLogoutAlert=()=>{
  Alert.alert("Confirm","Are you sure you want to logout?",[
    {
      text:"Cancel",
      onPress:()=>console.log("Cancel Logout"),
      style:'cancel'
    },
    {
      text:"Logout",
      onPress:()=>handleLogout(),
      style:"destructive"
    }
  ])

}
const onPickImage=async()=>{
  let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 
        // 'videos'
      ],
      // allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
      setUserData({...userData, avatar:result.assets[0]});
    }
  };


  return (

    <ScreenWrapper isModal={true} >
      <View style={styles.container}>
        <Header title={"Update Profile"} leftIcon={Platform.OS==='android' &&
          <BackButton color={colors.black}/>
          
        }
        style={{marginVertical:spacingY._15}}
        />
        {/* form */}
        <ScrollView contentContainerStyle={styles.form}>
          <View style={styles.avatarContainer}>
          <Avatar uri ={userData.avatar} size={170}/>
          <TouchableOpacity style={styles.editIcon} onPress={onPickImage}>
            <Icons.PencilIcon size={verticalScale(20)}
            color={colors.neutral800}/>
          </TouchableOpacity>
          </View>
          <View style={{gap:spacingY._20}}>
            <View style={styles.inputContainer}>
              <Typo style={{paddingLeft:spacingX._10}}>Email</Typo>

              <Input value={userData.email}
              containerStyle={{
                borderColor:colors.neutral350,
                paddingLeft:spacingX._20,
                backgroundColor:colors.neutral300
              }}
            onChangeText={value=>setUserData({...userData,email:value})}
               editable={false}/>

            </View>

          </View>
          <View style={{gap:spacingY._20}}>
            <View style={styles.inputContainer}>
              <Typo style={{paddingLeft:spacingX._10}}>Name</Typo>

              <Input value={userData.name}
              containerStyle={{
                borderColor:colors.neutral350,
                paddingLeft:spacingX._20,
                // backgroundColor:colors.neutral300
              }}
            onChangeText={value=>setUserData({...userData,name:value})}
              //  editable={false}
              />

            </View>

          </View>
        </ScrollView>
      </View>
      <View style={styles.footer}>
            {!loading&&(
               <Button
    style={{
      backgroundColor: colors.rose,
      height: verticalScale(56),
      width: verticalScale(56),
    }}
    onPress={showLogoutAlert}
  >
    <Icons.SignOut
      size={verticalScale(30)}
      color={colors.white}
      weight="bold"
    />
  </Button>
            )}

  <Button style={{ flex: 1 }} onPress= {onSumbit } loading={loading}>
    <Typo color={colors.black} fontWeight={"700"}>
      Update
    </Typo>
  </Button>
</View>

    </ScreenWrapper>
  )
}

export default ProfileModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacingY._20,
    // paddingVertical: spacingY._30,
  },

  footer: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacingX._20,

    gap: scale(12),
    paddingTop: spacingY._15,
    borderTopColor: colors.neutral200,
    marginBottom: spacingY._10,
    borderTopWidth: 1,
  },

  form: {
    gap: spacingY._30,
    marginTop: spacingY._15,
  },

  avatarContainer: {
    position: "relative",
    alignSelf: "center",
  },

  avatar: {
    alignSelf: "center",
    backgroundColor: colors.neutral300,
    height: verticalScale(135),
    width: verticalScale(135),
    borderRadius: 200,
    borderWidth: 1,
    borderColor: colors.neutral500,
    // overflow: "hidden",
    // position: "relative",
  },
  inputContainer:{

  },

  editIcon: {
    position: "absolute",
    bottom: spacingY._5,
    right: spacingY._7,
    borderRadius: 100,
    backgroundColor: colors.neutral100,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    padding: spacingY._7,
  },
});