import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { colors, radius, spacingX, spacingY } from '@/constants/theme';
import ScreenWrapper from '@/components/ScreenWrapper';
import Header from '@/components/Header';
import BackButton from '@/components/BackButton';
import Avatar from '@/components/Avatar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/authContext';
import { UserProps } from '@/types';
import Input from '@/components/Input';
import { ScrollView } from 'react-native-gesture-handler';
import Typo from '@/components/Typo';
import { Alert } from 'react-native';
import Button from '@/components/Button';
import { verticalScale } from '@/utils/styling';
import { getContacts, newConversation } from '@/socket/socketEvents';
import { uploadFileToCloudinary } from '@/services/imageService';


const NewConversationModal = () => {
  const { isGroup } = useLocalSearchParams<{ isGroup?: string }>();
  const isGroupMode = isGroup === '1'

  const router = useRouter();

  const { user: currentUser } = useAuth();

  const [groupAvatar, setGroupAvatar] = useState<{ uri: string } | null>(null)
  const [groupName, setGroupName] = useState("")
  const [seletedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])

  //   const contacts = useMemo(
  //   () => [
  //     { id: "1", name: "Rohan", email: "rohan@gmail.com", avatar: "" },
  //     { id: "2", name: "Aman", email: "aman@gmail.com", avatar: "" },
  //     { id: "3", name: "Priya", email: "priya@gmail.com", avatar: "" },
  //     { id: "4", name: "Neha", email: "neha@gmail.com", avatar: "" },
  //     { id: "5", name: "Rahul", email: "rahul@gmail.com", avatar: "" },
  //   ],
  //   []
  // );

  const processGetContacts = (res: any) => {
    // console.log("CONTACTS RESPONSE => ", res);

    if (res?.success) {
      setContacts(res.data);
    } else {
      console.log("FAILED TO FETCH CONTACTS");
    }
  };
  const processNewConversation = (res: any) => {

    // console.log("NewConversation RESPONSE => ", res);

    setIsLoading(false)
    if (res.success) {
      router.back()
      router.push({
        pathname: "/(main)/conversation",
        params: {
          id: res.data._id,
          name: res.data.name,
          avatar: res.data.avatar,
          type: res.data.type,
          participants: JSON.stringify(res.data.participants)
        }
      })
    } else {
      console.log("Error feteching/creating conversation:", res.msg)
      Alert.alert("Error", res.msg)
    }


  };


  useEffect(() => {
    //  Listen once
    newConversation(processNewConversation);
    getContacts(processGetContacts);

    //  Emit request for contacts once
    getContacts({});

    return () => {
      //  Remove listeners
      newConversation(processNewConversation, true);
      getContacts(processGetContacts, true);
    };
  }, []);


  const createGroup = async () => {
    if (!groupName.trim() || !currentUser || seletedParticipants.length < 2) return;

    setIsLoading(true);

    try {
      let avatar = null;

      if (groupAvatar) {
        const uploadResult = await uploadFileToCloudinary(
          groupAvatar,
          "group-avatars"
        );

        if (uploadResult.success) avatar = uploadResult.data;
      }

      newConversation({
        type: "group",
        participants: [currentUser.id, ...seletedParticipants],
        name: groupName,
        avatar,
      });
    } catch (error: any) {
      console.log("Error creating group: ", error);
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }

  }

  const onPickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images',
        // 'videos'
      ],
      // allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    // console.log(result);

    if (!result.canceled) {
      setGroupAvatar(result.assets[0]);
    }
  };

  const toggleParticipant = (user: any) => {

    setSelectedParticipants((prev: any) => {
      if (!user.id) {
        Alert.alert("Inavalid Credentials", "please login again")
        return;
      }
      if (prev.includes(user.id)) {
        return prev.filter((id: string) => id !== user.id)

      }
      return [...prev, user.id]
    })

  }
  const onSelected = (user: any) => {
    if (!currentUser) {
      Alert.alert("Authentication", "please login to start a conversation")
      return;
    }

    if (isGroupMode) {
      toggleParticipant(user)
    } else {
      // 
      newConversation({
        type: "direct",
        participants: [currentUser.id, user.id]
      })
    }


  }


  // console.log("isGroup", isGroup)
  
  return (
    <ScreenWrapper isModal={true}>
      <View style={styles.container}>
        <Header
          title={isGroupMode ? "New Group" : "Selected User"}
          leftIcon={<BackButton color={colors.black} />}
        />
        {
          isGroupMode && (
            <View style={styles.groupInfoContainer}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity onPress={onPickImage}>
                  <Avatar uri={groupAvatar?.uri || null}
                    size={100} isGroup={true} />
                </TouchableOpacity>
              </View>

              <View style={styles.groupNameContainer}>
                <Input
                  placeholder='Group Name'
                  value={groupName}
                  onChangeText={setGroupName}
                />

              </View>

            </View>
          )}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contactList}
        >
          {
            contacts.map((user: any, index) => {
              const isSelected = seletedParticipants.includes(user.id);
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.contactRow, isSelected && styles.selectedContact]}
                  onPress={() => onSelected(user)}
                >
                  <Avatar size={45} uri={user.avatar} />
                  <Typo fontWeight={"500"}>{user.name}</Typo>
                  {
                    isGroupMode && (
                      <View style={styles.selectionIndicator}>
                        <View style={[styles.checkbox, isSelected && styles.checked]}>

                        </View>

                      </View>
                    )
                  }

                </TouchableOpacity>
              )
            })
          }

        </ScrollView>
        {isGroupMode && seletedParticipants.length > 2 && (
          <View style={styles.createGroupButton}>
            <Button
              onPress={createGroup}
              disabled={!groupName.trim()}
              loading={isLoading}
            >
              <Typo fontWeight={'bold'} size={17}>Create Group</Typo>
            </Button>
          </View>
        )}
      </View>
    </ScreenWrapper>
  )
}

export default NewConversationModal

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacingX._15,
    flex: 1,
  },

  groupInfoContainer: {
    alignItems: "center",
    marginTop: spacingY._10,
  },

  avatarContainer: {
    marginBottom: spacingY._10,
  },

  groupNameContainer: {
    width: "100%",
  },

  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._10,
    paddingVertical: spacingY._5,
  },

  selectedContact: {
    backgroundColor: colors.neutral100,
    borderRadius: radius._15,
  },

  contactList: {
    gap: spacingY._12,
    marginTop: spacingY._10,
    paddingTop: spacingY._10,
    paddingBottom: verticalScale(150),
  },

  selectionIndicator: {
    marginLeft: "auto",
    marginRight: spacingX._10,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  checked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  createGroupButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacingX._15,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
  },
});