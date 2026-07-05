import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Icons from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';

import { radius, spacingX, spacingY } from '@/constants/theme';
import { scale, verticalScale } from '@/utils/styling';
import ScreenWrapper from '@/components/ScreenWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Avatar from '@/components/Avatar';
import Typo from '@/components/Typo';
import Input from '@/components/Input';
import Button from '@/components/Button';

import { useAuth } from '@/context/authContext';
import { useAppSettings } from '@/context/appSettingsContext';
import { useTheme } from '@/context/themeContext';
import { updateProfile, updateProfileResponse } from '@/socket/socketEvents';
import { uploadFileToCloudinary } from '@/services/imageService';
import { UserProps } from '@/types';

interface ThemeColors {
  background?: string;
  white: string;
  black: string;
  text: string;
  primary: string;
  neutral100: string;
  neutral400: string;
  neutral500: string;
  [key: string]: string | undefined; 
}

const ProfileModal = () => {
  const { user, updateToken } = useAuth();
  const { colors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserProps>({
    name: "",
    email: "",
    avatar: null,
    bio: "" 
  });

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (user) {
      setUserData({
        name: user.name || "",
        email: user.email || "",
        avatar: user.avatar || null,
        bio: user.bio || ""
      });
    }
  }, [user]);

  useEffect(() => {
    const handleResponse = (res: any) => {
      setLoading(false);
      if (res.success) {
        if (res.data?.token) updateToken(res.data.token);
        if (res.changed) {
          router.back();
        }
      } else {
        Alert.alert(t("updateFailed"), res.msg || t("somethingWentWrong"));
      }
    };

    updateProfileResponse(handleResponse);
    
    return () => {
      setLoading(false);
      updateProfileResponse(handleResponse, true);
    };
  }, [t, updateToken, router]);

  const onPickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setUserData(prev => ({ ...prev, avatar: result.assets[0] as any }));
    }
  };

  const onSave = async () => {
    const { name, avatar, bio } = userData;
    const currentName = user?.name || "";
    const currentAvatar = user?.avatar || "";
    const currentBio = user?.bio || "";

    if (!name.trim()) {
      Alert.alert(t("required"), t("provideName"));
      return;
    }

    setLoading(true);
    const updateData: any = { name, bio };

    try {
      if (avatar && typeof avatar === 'object' && (avatar as any).uri) {
        const res = await uploadFileToCloudinary(avatar, "profiles");
        if (res.success) {
          updateData.avatar = res.data;
        } else {
          Alert.alert(t("uploadFailed"), t("uploadProfilePictureFailed"));
          setLoading(false);
          return;
        }
      } else {
        updateData.avatar = avatar; 
      }

      const normalizedName = (updateData.name || "").trim();
      const normalizedAvatar = (updateData.avatar || "").trim();
      const normalizedBio = (updateData.bio || "").trim();

      if (
        normalizedName === currentName.trim() &&
        normalizedAvatar === currentAvatar.trim() &&
        normalizedBio === currentBio.trim()
      ) {
        Alert.alert(t("info"), t("noChanges") || "No changes made");
        setLoading(false);
        return;
      }

      updateProfile(updateData);
    } catch (error: any) {
      Alert.alert(t("error"), error.message || t("somethingWentWrong"));
      setLoading(false);
    }
  };

  const avatarUri = useMemo(() => {
    return typeof userData.avatar === 'string' 
      ? userData.avatar 
      : (userData.avatar as any)?.uri;
  }, [userData.avatar]);

  return (
    <ScreenWrapper isModal={true}>
      <View style={styles.container}>
        <Header
          title={t("editProfile")}
          leftIcon={<BackButton color={colors.text || colors.black} />}
          style={styles.header}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* AVATAR PICKER */}
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarOuterRing}>
              <View style={styles.avatarContainer}>
                <Avatar
                  uri={avatarUri}
                  size={scale(110)}
                  rounded={radius._30}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.editIcon}
                  onPress={onPickImage}
                >
                  <Icons.Camera size={scale(18)} weight="bold" color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
            <Typo size={14} fontWeight="500" color={colors.primary} style={styles.avatarText}>
              {t("changeProfilePhoto")}
            </Typo>
          </View>

          {/* FORM CARD */}
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Typo size={13} fontWeight="600" color={colors.neutral500}>{t("fullName")}</Typo>
              <Input
                placeholder="John Doe"
                value={userData.name}
                onChangeText={value => setUserData(prev => ({ ...prev, name: value }))}
                icon={<Icons.User size={20} color={colors.neutral400} weight="regular" />}
              />
            </View>

            <View style={styles.inputGroup}>
              <Typo size={13} fontWeight="600" color={colors.neutral500}>{t("emailAddress")}</Typo>
              <Input
                value={userData.email}
                editable={false}
                containerStyle={styles.disabledInput}
                inputStyle={styles.disabledInputText}
                icon={<Icons.EnvelopeSimple size={20} color={colors.neutral400} weight="regular" />}
              />
            </View>

            <View style={styles.inputGroup}>
              <Typo size={13} fontWeight="600" color={colors.neutral500}>{t("bio")}</Typo>
              <Input
                placeholder={t("tellUsAboutYourself")}
                value={userData.bio}
                multiline={true}
                numberOfLines={4}
                containerStyle={styles.bioInput} 
                inputStyle={styles.bioTextInput}
                onChangeText={value => setUserData(prev => ({ ...prev, bio: value }))}
              />
            </View>
          </View>
        </ScrollView>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Button
            onPress={onSave}
            loading={loading}
            style={styles.saveButton}
          >
            <Typo color="#FFFFFF" fontWeight="600" size={16}>
              {t("updateProfile")}
            </Typo>
          </Button>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default ProfileModal;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { 
      flex: 1, 
      backgroundColor: colors.background || colors.white,
    },
    header: {
      paddingHorizontal: spacingX._20,
      marginBottom: spacingY._10,
    },
    scrollContent: { 
      paddingHorizontal: spacingX._20,
      paddingBottom: spacingY._30, 
    },
    avatarWrapper: { 
      alignItems: 'center', 
      marginTop: spacingY._10,
      marginBottom: spacingY._25,
    },
    avatarOuterRing: {
      padding: scale(4),
      borderRadius: radius._30 + 4,
      borderWidth: 1,
      borderColor: colors.neutral100,
      borderStyle: 'dashed',
    },
    avatarContainer: { 
      position: "relative",
    },
    editIcon: {
      position: "absolute",
      bottom: -scale(2),
      right: -scale(2),
      backgroundColor: colors.primary,
      padding: scale(8),
      borderRadius: radius._90 || 999,
      borderWidth: 3,
      borderColor: colors.background || colors.white,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    avatarText: {
      marginTop: spacingY._12,
      letterSpacing: 0.2,
    },
    formCard: { 
      gap: spacingY._20,
      backgroundColor: colors.white === colors.background ? '#FSF5F7' : 'transparent', // Light background tint if flat white layout
    },
    inputGroup: { 
      gap: spacingY._7,
    },
    disabledInput: { 
      backgroundColor: colors.neutral100, 
      opacity: 0.8,
      borderRadius: radius._12,
      borderWidth: 1,
      borderColor: colors.neutral100,
    },
    disabledInputText: {
      color: colors.neutral500,
    },
    bioInput: {
      minHeight: verticalScale(110),
      borderRadius: radius._12,
      alignItems: 'flex-start', 
      paddingVertical: spacingY._12,
      paddingHorizontal: spacingX._12,
    },
    bioTextInput: {
      textAlignVertical: 'top', 
      height: '100%',
      paddingTop: Platform.OS === 'ios' ? 0 : 2, 
    },
    footer: {
      paddingHorizontal: spacingX._20,
      paddingTop: spacingY._17,
      paddingBottom: Platform.OS === 'ios' ? spacingY._30 : spacingY._20,
      borderTopWidth: 1,
      borderTopColor: colors.neutral100,
      backgroundColor: colors.background || colors.white,
    },
    saveButton: {
      borderRadius: radius._12,
      height: verticalScale(48),
    }
  });