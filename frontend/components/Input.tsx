import { View, Text, StyleSheet, TextInput } from 'react-native'
import React, { useState } from 'react'
import { InputProps } from '@/types'
import { radius, spacingX } from '@/constants/theme'
import { useTheme } from '@/context/themeContext'
import { verticalScale } from '@/utils/styling'

const Input = (props: InputProps) => {
    const [isFocused, setIsFocused] = useState(false)
    const { colors } = useTheme();

    return (
        <View style={[
            styles.container,
            {
                borderColor: isFocused ? colors.primary : colors.neutral200,
                backgroundColor: colors.neutral100,
            },
            props.containerStyle && props.containerStyle,
        ]}>
            {props.icon && props.icon}
            <TextInput
                style={[styles.input, { color: colors.text }, props.inputStyle]}
                placeholderTextColor={colors.neutral400}
                ref={props.inputRef && props.inputRef}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
            >



            </TextInput>
        </View>
    )
}

export default Input

const styles = StyleSheet.create({
    container: {
        flexDirection:"row",
        height:verticalScale(56),
        alignItems:"center",
        justifyContent:"center",
        borderWidth:1,
        borderRadius:radius.full,
        borderCurve:"continuous",
        paddingHorizontal:spacingX._15,
        gap:spacingX._10,


    },
    input:{
        flex:1,
        fontSize:verticalScale(14)

    }
})
