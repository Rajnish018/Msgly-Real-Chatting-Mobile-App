import { colors } from '@/constants/theme';
import { TypoProps } from '@/types';
import { verticalScale } from '@/utils/styling';
import React, { Component } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// create a component
const Typo = ({ 
    size=16,
    color=colors.text,
    fontWeight='400',
    children,
    style,
    textProps={}

}:TypoProps) => {
    const textStyle={
        fontSize:verticalScale(size),
        color:color,
        fontWeight:fontWeight,
    }
    return (
        <Text style={[textStyle,style]} {...textProps}>
            {children}
        </Text>
    );
};


export default Typo;
