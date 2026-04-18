import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity, FlatList, Image, Alert } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '@/components/ScreenWrapper'
import Typo from '@/components/Typo'
import { colors, radius, spacingX, spacingY } from '@/constants/theme'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '@/context/authContext'
import { StyleSheet } from 'react-native'
import { scale, verticalScale } from '@/utils/styling'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import Avatar from '@/components/Avatar'
import * as Icons from "phosphor-react-native";
import MessageItem from '@/components/MessageItem'
import Input from '@/components/Input'
import * as ImagePicker from 'expo-image-picker';
import Loading from '@/components/Loading'
import { uploadFileToCloudinary } from '@/services/imageService'
import { getMessages, newMessage } from '@/socket/socketEvents'
import { MessageProps, ResponseProps } from '@/types'



const Conversation = () => {

    const { user: currentUser } = useAuth()
    const {
        id: conversationId,
        name,
        participants: stringifiedParticipants,
        avatar,
        type
    } = useLocalSearchParams();
    const [message, setMessage] = useState('')
    const [selectedFile, setSelectedFile] = useState<{ uri: string } | null>(null)
    const [loading, setLoading] = useState(false)

    const [messages, setMessages] = useState<MessageProps[]>([])

    const participants = JSON.parse(stringifiedParticipants as string)

    let conversationAvatar = avatar
    const isDirect = type === "direct";
    const otherParticipant = isDirect ? participants.find((p: any) => p._id !== currentUser?.id) : null

    if (isDirect && otherParticipant)
        conversationAvatar = otherParticipant.avatar

    let conversationName = isDirect ? otherParticipant.name : name


    useEffect(() => {
        newMessage(newMessageHandler)
        getMessages(getMessageHandler)


        getMessages({ conversationId })

        return () => {
            newMessage(newMessageHandler, true)
            getMessages(getMessageHandler, true)
        }

    }, [])

    const newMessageHandler = (res: ResponseProps) => {
        // console.log("got new message response", res)
        setLoading(false)
        if(res.success){

            // console.log(res.data.conversationId)

            if(String(res.data.conversationId)===String(conversationId)){
                setMessages((prev)=>[res.data as MessageProps ,...prev])

            }
        }else{
            Alert.alert("Error",res.msg)
        }
    }

    const getMessageHandler = (res: ResponseProps) => {

        // console.log("get message",res.data)

        if (res.success) {
            setMessages(res.data)
        }

    }



    const onSend = async () => {
        if (!message.trim() && !selectedFile) return

        if (!currentUser) return

        setLoading(true)

        try {
            let attachment = null
            if (selectedFile) {
                const uploadResult = await uploadFileToCloudinary(selectedFile, "message-attachmennts")

                if (uploadResult.success) {
                    attachment = uploadResult.data
                } else {
                    setLoading(false)
                    Alert.alert("Error", "Could not send the image!")

                }
            }


            newMessage({
                conversationId,
                sender: {
                    id: currentUser.id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                },
                content: message.trim(),
                attachment
            })
            setMessage("");
            setSelectedFile(null);

        } catch (error: any) {
            console.log("Error sending message:", error)
            Alert.alert("Error", "failed to send message")

        } finally {
            setLoading(false)
        }

    }


    // console.log(data);

    // const dummyMessages = [
    //     {
    //         id: "msg_10",
    //         sender: {
    //             id: "user_2",
    //             name: "Jane Smith",
    //             avatar: null,
    //         },
    //         content: "That would be really useful!",
    //         createdAt: "10:42 AM",
    //         isMe: false,
    //     },
    //     {
    //         id: "msg_9",
    //         sender: {
    //             id: "me",
    //             name: "Me",
    //             avatar: null,
    //         },
    //         content: "Yes, I'm thinking about adding message reactions and file sharing.",
    //         createdAt: "10:41 AM",
    //         isMe: true,
    //     },
    //     {
    //         id: "msg_8",
    //         sender: {
    //             id: "user_2",
    //             name: "Jane Smith",
    //             avatar: null,
    //         },
    //         content: "Are you planning to add more features like reactions or file support?",
    //         createdAt: "10:40 AM",
    //         isMe: false,
    //     },
    //     {
    //         id: "msg_7",
    //         sender: {
    //             id: "me",
    //             name: "Me",
    //             avatar: null,
    //         },
    //         content:
    //             "Definitely! I'm also working on improving the UI and making the chat smoother.",
    //         createdAt: "10:39 AM",
    //         isMe: true,
    //     },
    //     {
    //         id: "msg_6",
    //         sender: {
    //             id: "user_2",
    //             name: "Jane Smith",
    //             avatar: null,
    //         },
    //         content: "Nice! The app is already looking clean and modern.",
    //         createdAt: "10:38 AM",
    //         isMe: false,
    //     },
    //     {
    //         id: "msg_5",
    //         sender: {
    //             id: "me",
    //             name: "Me",
    //             avatar: null,
    //         },
    //         content: "Thanks! I'm trying to keep it minimal and fast.",
    //         createdAt: "10:37 AM",
    //         isMe: true,
    //     },
    //     {
    //         id: "msg_4",
    //         sender: {
    //             id: "user_2",
    //             name: "Jane Smith",
    //             avatar: null,
    //         },
    //         content: "Cool! Can you also add group chats?",
    //         createdAt: "10:36 AM",
    //         isMe: false,
    //     },
    //     {
    //         id: "msg_3",
    //         sender: {
    //             id: "me",
    //             name: "Me",
    //             avatar: null,
    //         },
    //         content: "Yes ✅ group creation is almost done!",
    //         createdAt: "10:35 AM",
    //         isMe: true,
    //     },
    //     {
    //         id: "msg_2",
    //         sender: {
    //             id: "user_2",
    //             name: "Jane Smith",
    //             avatar: null,
    //         },
    //         content: "Great 🔥 this chat UI feels super smooth.",
    //         createdAt: "10:34 AM",
    //         isMe: false,
    //     },
    //     {
    //         id: "msg_1",
    //         sender: {
    //             id: "me",
    //             name: "Me",
    //             avatar: null,
    //         },
    //         content: "Thanks 😄 I'm testing messages right now.",
    //         createdAt: "10:33 AM",
    //         isMe: true,
    //     },
    // ];

    const onPickFile = async () => {
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
            setSelectedFile(result.assets[0])
        }
    };



    return (
        <ScreenWrapper showPattern={true} bgOpacity={0.5}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                style={styles.container}>
                {/* header */}

                <Header
                    style={styles.header}
                    leftIcon={
                        <View style={styles.headerLeft}>
                            <BackButton />
                            <Avatar
                                size={42}
                                uri={conversationAvatar as string}
                                isGroup={type === "group"} />
                            <Typo color={colors.white} fontWeight={"500"} size={22}>
                                {conversationName}
                            </Typo>

                        </View>

                    }
                    rightIcon={
                        <TouchableOpacity style={{ marginBottom: verticalScale(7) }}>
                            <Icons.DotsThreeOutlineVerticalIcon weight='fill' color={colors.white} />
                        </TouchableOpacity>
                    }

                />
                {/* message */}
                <View style={styles.content}>
                    <FlatList
                        data={messages}
                        inverted={true}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.messagesContent}
                        renderItem={({ item }) => (
                            <MessageItem
                                item={item} isDirect={isDirect}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                    />
                </View>
                {/* footer */}
                <View style={styles.footer}>
                    <View style={styles.footerInner}>
                        <Input
                            value={message}
                            onChangeText={setMessage}
                            containerStyle={styles.inputContainer}
                            placeholder="Type message"
                            icon={
                                <TouchableOpacity style={styles.inputIcon} onPress={onPickFile}>
                                    <Icons.PlusIcon
                                        color={colors.black}
                                        weight="bold"
                                        size={verticalScale(22)}
                                    />
                                    {
                                        selectedFile && selectedFile.uri && (
                                            <Image
                                                source={{ uri: selectedFile?.uri }}
                                                style={styles.selectedFile}
                                            />
                                        )
                                    }
                                </TouchableOpacity>
                            }
                        />
                        <View style={styles.inputRightIcon}>
                            <TouchableOpacity style={styles.inputIcon} onPress={onSend}>
                                {
                                    loading ? (
                                        <Loading size="small" color={colors.black} />
                                    ) : (
                                        <Icons.PaperPlaneTiltIcon
                                            color={colors.black}
                                            weight='fill'
                                            size={verticalScale(22)}
                                        />

                                    )
                                }

                            </TouchableOpacity>


                        </View>
                    </View>
                </View>

            </KeyboardAvoidingView>

        </ScreenWrapper>
    )
}

export default Conversation


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    header: {
        paddingHorizontal: spacingX._15,
        paddingTop: spacingY._10,
        paddingBottom: spacingY._15,
    },

    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: spacingX._12,
    },

    inputRightIcon: {
        position: "absolute",
        right: scale(10),
        top: "50%",
        transform: [{ translateY: -verticalScale(18) }],
        paddingLeft: spacingX._12,
        borderLeftWidth: 1.5,
        borderLeftColor: colors.neutral300,
    },


    selectedFile: {
        position: "absolute",
        height: verticalScale(38),
        width: verticalScale(38),
        borderRadius: radius.full,
        alignSelf: "center",
    },

    content: {
        flex: 1,
        backgroundColor: colors.white,
        borderTopLeftRadius: radius._50,
        borderTopRightRadius: radius._50,
        borderCurve: "continuous",
        overflow: "hidden",
        paddingHorizontal: spacingX._15,
        marginTop: spacingY._5
    },

    footer: {
        backgroundColor: colors.white,
        paddingTop: spacingY._10,
        paddingBottom: verticalScale(14),
        paddingHorizontal: spacingX._15,

        borderTopWidth: 1,
        borderTopColor: colors.neutral200,

        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },

    footerInner: {
        width: "100%",
        justifyContent: "center",
    },

    inputContainer: {
        backgroundColor: colors.neutral100,
        borderRadius: radius._30,
        paddingLeft: spacingX._12,
        paddingRight: scale(65),
        borderWidth: 1,
        borderColor: colors.neutral200,
    },

    inputIcon: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        width: verticalScale(40),
        height: verticalScale(40),
        alignItems: "center",
        justifyContent: "center",
    },



    messagesContainer: {
        flex: 1,
    },

    messagesContent: {
        // padding: spacingX._15,
        paddingTop: spacingY._20,
        paddingBottom: spacingY._10,
        gap: spacingY._12,
    },

    plusIcon: {
        backgroundColor: colors.primary,
        borderRadius: radius.full,
        padding: 8,
    },

    // inputIcon: {
    //     backgroundColor: colors.primary,
    //     borderRadius: radius.full,
    //     padding: 8,
    // },
});
