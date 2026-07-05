import React from 'react';
import { 
    View, 
    StyleSheet, 
    Modal, 
    Pressable, 
    TouchableOpacity, 
    Alert 
} from 'react-native';
import * as Icons from "phosphor-react-native";
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import Typo from './Typo';
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import { scale } from '@/utils/styling';
import { useTheme } from '@/context/themeContext';
import { useAppSettings } from '@/context/appSettingsContext';

interface ChatMenuProps {
    visible: boolean;
    onClose: () => void;
    top: number;
    onViewProfile: () => void;
}

const ChatMenu = ({ visible, onClose, top, onViewProfile }: ChatMenuProps) => {
    const { colors: themeColors } = useTheme();
    const { t } = useAppSettings();
    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none" 
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Animated.View 
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={[styles.menuDropdown, { top, backgroundColor: themeColors.white, borderColor: themeColors.neutral100 }]}
                >
                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => {
                            onClose();
                            onViewProfile();
                        }}
                    >
                        <Icons.User size={scale(20)} color={themeColors.neutral700} />
                        <Typo size={15} color={themeColors.neutral700}>{t("viewProfile")}</Typo>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={onClose}>
                        <Icons.BellSlash size={scale(20)} color={themeColors.neutral700} />
                        <Typo size={15} color={themeColors.neutral700}>{t("muteNotifications")}</Typo>
                    </TouchableOpacity>

                    <View style={[styles.menuDivider, { backgroundColor: themeColors.neutral100 }]} />

                    <TouchableOpacity 
                        style={styles.menuItem} 
                        onPress={() => {
                            onClose();
                            Alert.alert(t("clearChat"), t("areYouSure"));
                        }}
                    >
                        <Icons.Trash size={scale(20)} color={themeColors.rose} />
                        <Typo size={15} color={themeColors.rose}>{t("clearChat")}</Typo>
                    </TouchableOpacity>
                </Animated.View>
            </Pressable>
        </Modal>
    );
};

export default ChatMenu;

const styles = StyleSheet.create({
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.02)' 
    },
    menuDropdown: {
        position: 'absolute',
        right: spacingX._15,
        backgroundColor: colors.white,
        borderRadius: radius._15,
        width: scale(190),
        paddingVertical: spacingY._5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1,
        borderColor: colors.neutral100,
        zIndex: 100,
    },
    menuItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingVertical: spacingY._12, 
        paddingHorizontal: spacingX._15, 
        gap: spacingX._12 
    },
    menuDivider: { 
        height: 1, 
        backgroundColor: colors.neutral100, 
        marginHorizontal: spacingX._10, 
        marginVertical: spacingY._5 
    },
});
