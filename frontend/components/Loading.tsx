import { View, Text, ActivityIndicatorProps, ActivityIndicator } from 'react-native'
import React from 'react'
import { useTheme } from '@/context/themeContext'

const  Loading=({
    size='large',
    color
}:ActivityIndicatorProps) =>{
  const { colors } = useTheme();
  return (
    <View style={
        {
            flex:1,
            justifyContent:"center",
            alignItems:'center'
        }
    }>
      <ActivityIndicator size={size} color={color || colors.primaryDark}/>
    </View>
  )
}

export default Loading;
