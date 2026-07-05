import { useTheme } from '@/context/themeContext';
import { TypoProps } from '@/types';
import { verticalScale } from '@/utils/styling';
import React from 'react';
import { Text } from 'react-native';

// create a component
const Typo = ({ 
    size=16,
    color,
    fontWeight='400',
    children,
    style,
    textProps={}

}:TypoProps) => {
    const { colors } = useTheme();
    const textStyle={
        fontSize:verticalScale(size),
        color:color || colors.text,
        fontWeight:fontWeight,
    }
    return (
        <Text style={[textStyle,style]} {...textProps}>
            {children}
        </Text>
    );
};


export default Typo;
