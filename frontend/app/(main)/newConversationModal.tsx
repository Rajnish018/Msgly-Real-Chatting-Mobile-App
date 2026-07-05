import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, Platform } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radius } from '@/constants/theme';
import ScreenWrapper from '@/components/ScreenWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Avatar from '@/components/Avatar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/authContext';
import Input from '@/components/Input';
import Typo from '@/components/Typo';
import Button from '@/components/Button';
import { useTheme } from '@/context/themeContext';
import { useAppSettings } from '@/context/appSettingsContext';
import { getContacts, newConversation } from '@/socket/socketEvents';
import { connectSocket } from '@/socket/socket';
import { uploadFileToCloudinary } from '@/services/imageService';
import { Ionicons } from '@expo/vector-icons';

// --- RESPONSIVE HELPERS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const wp = (percentage: number) => (SCREEN_WIDTH * percentage) / 100;
const hp = (percentage: number) => (SCREEN_HEIGHT * percentage) / 100;

// Helper to scale fonts based on screen size
const fontSize = (size: number) => size * (SCREEN_WIDTH / 375); 

const NewConversationModal = () => {
  const { isGroup } = useLocalSearchParams<{ isGroup?: string }>();
  const isGroupMode = isGroup === '1';
  const router = useRouter();
  const { user: currentUser, token } = useAuth();
  const { colors } = useTheme();
  const { t } = useAppSettings();

  const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchContacts = async () => {
      try {
        await connectSocket(token);
        if (!isMounted) return;

        newConversation(processNewConversation);
        getContacts(processGetContacts);
        getContacts({});
      } catch (error) {
        console.warn("Contacts fetch skipped: socket connection failed");
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
      newConversation(processNewConversation, true);
      getContacts(processGetContacts, true);
    };
  }, [token]);

  const processGetContacts = (res: any) => {
    if (res?.success) setContacts(res.data);
  };

  const processNewConversation = (res: any) => {
    setIsLoading(false);
    if (res.success) {
      router.back();
      router.push({
        pathname: "/(main)/conversation",
        params: {
          id: res.data._id,
          name: res.data.name,
          avatar: res.data.avatar,
          type: res.data.type,
          participants: JSON.stringify(res.data.participants)
        }
      });
    } else {
      Alert.alert("Error", res.msg);
    }
  };

  const filteredContacts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return contacts;
    return contacts.filter((u) => 
        u.email?.toLowerCase().includes(query) || 
        u.phoneNumber?.includes(query) || 
        u.name?.toLowerCase().includes(query)
    );
  }, [searchQuery, contacts]);

  const onPickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [1, 1],
      allowsEditing: true,
      quality: 0.6,
    });
    if (!result.canceled) setGroupAvatar(result.assets[0]);
  };

  const toggleParticipant = (user: any) => {
    setSelectedParticipants((prev) =>
      prev.includes(user.id) ? prev.filter((id) => id !== user.id) : [...prev, user.id]
    );
  };

  const onSelected = (user: any) => {
    if (!currentUser) return;
    if (isGroupMode) {
      toggleParticipant(user);
    } else {
      setIsLoading(true);
      newConversation({ type: "direct", participants: [currentUser.id, user.id] });
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length < 2) {
      return Alert.alert("Error", t("groupValidationError"));
    }
    setIsLoading(true);
    try {
      let avatar = null;
      if (groupAvatar) {
        const uploadResult = await uploadFileToCloudinary(groupAvatar, "group-avatars");
        if (uploadResult.success) avatar = uploadResult.data;
      }
      newConversation({
        type: "group",
        participants: [currentUser?.id, ...selectedParticipants],
        name: groupName,
        avatar,
      });
    } catch (e:any) {
      console.log("Group creation error:", e);  
      setIsLoading(false);
    }
  };

  return (
    <ScreenWrapper isModal={true} style={{ backgroundColor: colors.white }}>
      <Header
        title={isGroupMode ? t("newGroup") : t("selectContact")}
        leftIcon={<BackButton color={colors.black} />}
      />

      <View style={styles.container}>
        {/* Search Bar Wrapper */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.neutral100 }]}>
            <Ionicons name="search" size={hp(2.2)} color={colors.neutral500} />
            <Input
              placeholder={t("searchByEmailOrPhone")}
              value={searchQuery}
              onChangeText={setSearchQuery}
              containerStyle={styles.searchInputField}
            />
            {searchQuery !== "" && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={hp(2.2)} color={colors.neutral400} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isGroupMode && (
          <View style={[styles.groupMetaCard, { backgroundColor: colors.neutral100 }]}>
            <TouchableOpacity onPress={onPickImage} style={styles.avatarWrapper}>
              <Avatar uri={groupAvatar?.uri || null} size={hp(8.5)} isGroup={true} />
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={hp(1.8)} color={colors.white} />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Input
                placeholder={t("groupName")}
                value={groupName}
                onChangeText={setGroupName}
                containerStyle={styles.nameInput}
              />
              <Typo size={fontSize(12)} color={colors.neutral500} style={{ marginLeft: wp(1) }}>
                {selectedParticipants.length} {t("membersSelected")}
              </Typo>
            </View>
          </View>
        )}

        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        >
              <Typo size={fontSize(13)} fontWeight="700" color={colors.neutral500} style={styles.listHeader}>
            {searchQuery ? t("searchResults") : t("allContacts")}
          </Typo>

          {filteredContacts.length > 0 ? (
            filteredContacts.map((user) => {
              const isSelected = selectedParticipants.includes(user.id);
              return (
                <TouchableOpacity
                  key={user.id}
                  style={[styles.contactRow, { borderBottomColor: colors.neutral200 }]}
                  onPress={() => onSelected(user)}
                  activeOpacity={0.7}
                >
                  <Avatar size={hp(6)} uri={user.avatar} />
                  <View style={styles.contactDetails}>
                    <Typo fontWeight="600" size={fontSize(16)}>{user.name}</Typo>
                    <Typo size={fontSize(13)} color={colors.neutral500} numberOfLines={1}>
                      {user.email} {user.phoneNumber ? ` • ${user.phoneNumber}` : ''}
                    </Typo>
                  </View>

                  {isGroupMode && (
                    <View style={[styles.checkbox, isSelected && styles.checked]}>
                      {isSelected && <Ionicons name="checkmark" size={hp(1.8)} color={colors.white} />}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={hp(5)} color={colors.neutral300} />
              <Typo color={colors.neutral500} size={fontSize(15)}>{t("noUsersFound")}</Typo>
            </View>
          )}
        </ScrollView>

        {isGroupMode && selectedParticipants.length >= 2 && (
          <View style={styles.footer}>
            <Button
              onPress={createGroup}
              disabled={!groupName.trim() || isLoading}
              loading={isLoading}
              style={styles.createBtn}
            >
              <Typo color={colors.white} fontWeight="bold" size={fontSize(16)}>{t("createGroup")}</Typo>
            </Button>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

export default NewConversationModal;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
    paddingHorizontal: wp(3),
    height: hp(6),
  },
  searchInputField: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    height: '100%',
    fontSize: fontSize(14),
  },
  groupMetaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral100,
    marginHorizontal: wp(4),
    padding: wp(4),
    borderRadius: radius._20,
    gap: wp(4),
    marginBottom: hp(1),
  },
  avatarWrapper: {
    position: 'relative',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: wp(1.2),
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.white,
  },
  nameInput: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: colors.neutral300,
    height: hp(5),
    marginBottom: hp(0.5),
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: hp(18), // Large padding to avoid FAB overlap
  },
  listHeader: {
    marginTop: hp(2),
    marginBottom: hp(1),
    letterSpacing: 0.5,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral200,
  },
  contactDetails: {
    flex: 1,
    marginLeft: wp(4),
  },
  checkbox: {
    width: hp(3),
    height: hp(3),
    borderRadius: hp(1.5),
    borderWidth: 2,
    borderColor: colors.neutral300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: hp(10),
    gap: hp(1),
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? hp(4) : hp(2),
    left: wp(5),
    right: wp(5),
  },
  createBtn: {
    height: hp(7),
    borderRadius: radius._17,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
});
