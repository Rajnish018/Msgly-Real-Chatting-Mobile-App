import { View,StyleSheet } from 'react-native'
import React from 'react'
import { AvatarProps } from '@/types';
import { verticalScale } from '@/utils/styling';
import { radius } from '@/constants/theme';
import {Image} from 'expo-image'
import { getAvatarPath } from '@/services/imageService';
import { useTheme } from '@/context/themeContext';

const Avatar=({uri,size=26,style,isGroup=false}:AvatarProps)=>{
  const { colors } = useTheme();
  return (
    <View style={[styles.avatar,{height:verticalScale(size),width:verticalScale(size), backgroundColor: colors.neutral200, borderColor: colors.neutral100} ,style]}> 
      <Image
      style={{flex:1}}
      source={getAvatarPath(uri,isGroup)}
      contentFit='cover'
      transition={100}/>

    </View>
  )
}

export default Avatar;

const styles=StyleSheet.create({
    avatar:{
        alignSelf:"center",
        height:verticalScale(47),
        width:verticalScale(47),
        borderRadius:radius.full,
        borderWidth:1,
        overflow:"hidden"

    }
})
