import { View, StyleSheet ,Dimensions} from 'react-native'
import React from 'react'
import { HeaderProps } from '@/types';
import Typo from './Typo';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const wp = (percentage: number) => (SCREEN_WIDTH * percentage) / 100;
const hp = (percentage: number) => (SCREEN_HEIGHT * percentage) / 100; // Or use your Dimensions logic

const Header = ({ title = '', leftIcon, rightIcon }: HeaderProps) => {
  return (
    <View style={styles.container}>
      {/* Left Icon Container */}
      <View style={styles.leftIcon}>
        {leftIcon && leftIcon}
      </View>

      {/* Title - Stays Centered via Absolute Position */}
      {title && (
        <Typo size={20} fontWeight={'600'} style={styles.title}>
          {title}
        </Typo>
      )}

      {/* Right Icon Container */}
      <View style={styles.rightIcon}>
        {rightIcon && rightIcon}
      </View>
    </View>
  )
}

export default Header;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: hp(6),           // Fixed height ensures vertical centering works
    alignItems: "center",    // Centers icons vertically
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: wp(4), // This aligns the icon with your "Inner Side"
  },

  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    zIndex: 1,               // Lower than icons so they remain clickable
  },

  leftIcon: {
    zIndex: 30,              // High zIndex to ensure it's on top of the title box
    justifyContent: 'center',
    alignItems: 'flex-start',
    minWidth: wp(10),        // Ensures a consistent hit area
  },

  rightIcon: {
    zIndex: 30,
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: wp(10),
  },
});