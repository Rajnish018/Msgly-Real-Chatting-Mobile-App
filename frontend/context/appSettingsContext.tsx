import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";

import { createDefaultUserSettings } from "@/constants/userSettings";
import { useAuth } from "@/context/authContext";
import { isSupportedLanguage } from "@/constants/languages";
import { getUserSettings, updateUserSettings as saveUserSettings } from "@/services/authService";
import { registerForPushNotificationsAsync } from "@/utils/registerForPush";
import { AppLanguage, AppSettingsContextProps, AppUserSettings } from "@/types";
import { getSocket } from "@/socket/socket";

const LANGUAGE_KEY = "appLanguage";
const NOTIFICATIONS_KEY = "notificationsEnabled";
const MUTED_KEY = "mutedConversationIds";
const USER_SETTINGS_KEY = "userSettings";
const EMAIL_KEY = "userSettingsEmail";

const translations: Record<AppLanguage, Record<string, string>> = {
  en: {
    settings: "Settings",
    welcomeBack: "Welcome back,",
    searchConversations: "Search conversations...",
    messages: "Messages",
    groups: "Groups",
    noMessagesFound: "No messages found",
    account: "Account",
    preferences: "PREFERENCES",
    personalInformation: "Personal Information",
    privacy: "Privacy",
    notifications: "Notifications",
    darkMode: "Dark Mode",
    Applanguage: "App Language",
    logout: "Logout",
    version: "Version",
    english: "English",
    hindi: "Hindi",
    spanish: "Spanish",
    selectLanguage: "Select Language",
    conversation: "Conversation",
    messageActions: "Message Actions",
    chooseMessageAction: "Choose what you want to do with this message.",
    typeMessage: "Type a message...",
    reply: "Reply",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    cancel: "Cancel",
    editingMessage: "Editing message",
    replyingTo: "Replying to",
    messageDeleted: "Message deleted",
    edited: "Edited",
    viewProfile: "View Profile",
    muteNotifications: "Mute Notifications",
    unmuteNotifications: "Unmute Notifications",
    clearChat: "Clear Chat",
    areYouSure: "Are you sure?",
    online: "Online",
    tapForInfo: "Tap for info",
    muted: "Muted",
    permissionRequired: "Notification permission is required",
    failedToUpdateNotification: "Failed to update notification settings",
    failedToSendMessage: "Failed to send message",
    failedToEditMessage: "Failed to edit message",
    failedToDeleteMessage: "Failed to delete message",
    deleteMessageConfirm: "This message will be removed for everyone in this chat.",
    editWindowExpired: "You can only edit a message within 3 minutes of sending it.",
    clearChatForMe: "Clear for me",
    clearChatForEveryone: "Clear for everyone",
    logoutConfirm: "Are you sure you want to logout?",
    stayConnected: "Stay Connected",
    withCloseFriends: "with your close friends",
    andFamily: "and family",
    getStarted: "Get Started",
    forgotPassword: "Forgot your password?",
    welcomeBackShort: "Welcome back",
    happyToSeeYou: "We happy to see you!",
    enterEmail: "Enter your email",
    enterPassword: "Enter your password",
    dontHaveAccount: "Don't have an account ?",
    signUp: "Sign Up",
    needHelp: "Need Some Help?",
    gettingStarted: "Getting Started",
    createAccountContinue: "Create an account to continue",
    enterName: "Enter your name",
    alreadyHaveAccount: "Already have account ?",
    login: "Login",
    fillAllFields: "Please fill all the fields",
    loginError: "Login error",
    registrationError: "Registration error",
    myProfile: "My Profile",
    posts: "Posts",
    followers: "Followers",
    following: "Following",
    editProfile: "Edit Profile",
    shareProfile: "Share Profile",
    follow: "Follow",
    myPosts: "My Posts",
    saved: "Saved",
    couldNotStartConversation: "Could not start conversation",
    personalInfo: "Personal Info",
    personalInfoDescription: "This is where users edit their name, email, etc.",
    visibility: "VISIBILITY",
    security: "SECURITY",
    dataManagement: "DATA MANAGEMENT",
    privateProfile: "Private Profile",
    privateProfileDesc: "Only friends can see your activity",
    showOnlineStatus: "Show Online Status",
    showOnlineStatusDesc: "Let others see when you're active",
    biometricLock: "Biometric Lock",
    biometricLockDesc: "Require FaceID/TouchID to open",
    changePassword: "Change Password",
    changePasswordDesc: "Last changed 3 months ago",
    downloadMyData: "Download My Data",
    deleteAccount: "Delete Account",
    newGroup: "New Group",
    selectContact: "Select Contact",
    searchByEmailOrPhone: "Search by email or phone...",
    groupName: "Group Name",
    membersSelected: "members selected",
    searchResults: "SEARCH RESULTS",
    allContacts: "ALL CONTACTS",
    noUsersFound: "No users found",
    createGroup: "Create Group",
    groupValidationError: "Please provide a group name and select at least 2 members.",
    updateFailed: "Update Failed",
    somethingWentWrong: "Something went wrong",
    required: "Required",
    provideName: "Please provide a name.",
    uploadFailed: "Upload Failed",
    uploadProfilePictureFailed: "Could not upload profile picture.",
    changeProfilePhoto: "Change Profile Photo",
    fullName: "Full Name",
    emailAddress: "Email Address",
    bio: "BIO",
    tellUsAboutYourself: "Tell us about yourself...",
    updateProfile: "Update Profile",
    splashSubtitle: "Real Time Chatting App",
    defaultBio: "Hey there! I'm using this app.",
    currentPassword: "Current Password",
    newPassword: "New Password",
    confirmNewPassword: "Confirm New Password",
    passwordUpdated: "Password updated successfully",
    passwordMismatch: "New passwords do not match",
    passwordTooShort: "New password must be at least 6 characters",
    exportSuccess: "Your data export request was emailed successfully.",
    deleteAccountConfirm: "This will deactivate your account now. If you do not recover it within the recovery window, it will be permanently deleted.",
    deleteAccountSuccess: "Account deactivated successfully.",
    deactivateAccount: "Deactivate",
    accountDeletionScheduled: "Permanent deletion is scheduled for",
    secureYourAccount: "Secure your account",
    changePasswordHelp: "Update your password to keep your chats and account safe.",
    ok: "OK",
    featureUnavailable: "Feature unavailable",
    biometricUnavailable: "True biometric auth needs a biometric package in this build. Your preference will still be saved locally.",
    saveChanges: "Save Changes",
    processing: "Processing...",
    privateProfileEnabled: "Profile is now private",
    privateProfileDisabled: "Profile is now public",
    onlineStatusHidden: "Online status hidden",
    onlineStatusVisible: "Online status visible",
    forgotPasswordShort: "Forgot?",
    forgotPasswordDescription: "Enter your email address to receive a password reset link.",
    sendResetLink: "Send Reset Link",
    joinUs: "Join Us",
    startYourJourney: "Start your journey with us",
    password: "Password",
    // Biometric Shield Keys
    appLockedTitle: "Msgly is Locked",
    authRequiredDesc: "Secure authentication required to continue",
    unlockButton: "Unlock App",
    unlockApp: "Unlock Msgly",
    confirmBiometrics: "Verify identity to enable lock",
    chats: "Chats",
    helpfeedback: "Help & feedback",
    accountSubtitle: "Security notifications, account info",
    privacySubtitle: "Blocked contacts, disappearing messages",
    chatSubtitle: "Theme, wallpaper, chat settings",
    notificationsSubtitle: "Messages, groups, sounds",
    helpfeedbackSubtitle: "Help center, contact us, privacy policy",
    securityAndContact: "Security & Contact",
    securityNotifications: "Security notifications",
    twoStepVerification: "Two-step verification",
    dangerZone: "Danger Zone",
    accountSettings: "Account Settings",
    privacyCheckupTitle: "Privacy Checkup",
    privacyCheckupDesc: "Control your privacy and choose settings right for you.",
    whoCanSeeInfo: "Who can see my personal info?",
    lastSeenOnline: "Last seen & online",
    profilePicture: "Profile picture",
    about: "About",
    links: "Links",
    status: "Status",
    readReceipts: "Read receipts",
    readReceiptsDesc: "If disabled, others won't see when you've read their messages, and you won't see when they've read yours.",
    disappearingMessages: "Disappearing messages",
    defaultMessageTimer: "Default message timer",
    defaultTimerDesc: "Set a default timer for new chats. This won't affect existing conversations.",
    avatarStickers: "Avatar stickers",
    avatarStickersDesc: "Allow search inside avatar interactions",
    liveLocation: "Live location",
    calls: "Calls",
    silenceUnknown: "Silence unknown callers",
    contacts: "Contacts",
    securityLocks: "Security locks",
    appLock: "App lock",
    chatLock: "Chat lock",
    chatLockDesc: "Keep hidden chats locked and secured",
    advanced: "Advanced",
    advancedPrivacy: "Advanced privacy",
    advancedDesc: "Protect IP address in calls, disable link previews",
    downloadMyDataDesc: "Request a copy of your data, including messages, media, and account information. We'll email you a link to download everything.",
    display: "Display",
    theme: "Theme",
    chatWallpaper: "Chat wallpaper",
    defaultChatTheme: "Default chat theme",
    chatSettings: "Chat settings",
    enterIsSend: "Enter is send",
    enterIsSendSubtitle: "Pressing Enter will send your message. Use Shift + Enter for a new line.",
    mediaVisibility: "Media visibility",
    mediaVisibilitySubtitle: "Show newly downloaded media in your gallery",
    fontSize: "Font size",
    archivedChats: "Archived chats",
    keepChatsArchived: "Keep chats archived",
    keepChatsArchivedSubtitle: "Archived chats will stay archived when new messages arrive",
    chatBackup: "Chat backup",
    transferChats: "Transfer chats",
    chatHistory: "Chat history",
    support: "Support",
    helpCenter: "Help Center",
    helpCenterSubtitle: "Get help, contact us",
    sendFeedback: "Send Feedback",
    sendFeedbackSubtitle: "Report technical issues",
    legal: "Legal & info",
    termsPrivacyPolicy: "Terms and Privacy Policy",
    appInfo: "App info",
    conversationTones: "Conversation tones",
    conversationTonesDesc: "Play sounds for incoming and outgoing messages",
    reminders: "Reminders",
    remindersDesc: "Receive occasional alerts for unread notifications",
    notificationTone: "Notification tone",
    vibrate: "Vibrate",
    light: "Light",
    useHighPriority: "Use high priority notifications",
    highPriorityDesc: "Show notifications at the top of the screen",
    reactionNotifications: "Reaction notifications",
    reactionNotificationsDesc: "Get notified when someone reacts to your messages",
    groupNotificationTone: "Notification tone",
    groupVibrate: "Vibrate",
    groupLight: "Light",
    groupHighPriority: "Use high priority notifications",
    groupHighPriorityDesc: "Show group notifications at the top of the screen",
    groupReactionNotifications: "Reaction notifications",
    groupReactionDesc: "Get notified when someone reacts to messages in groups",
    ringtone: "Ringtone",
    callVibrate: "Vibrate",
    mediaLinksDocs: "Media links and docs",
    privacySettings: "Privacy Settings",
    destructiveActions: "Destructive Actions",
    block: "Block",
    report: "Report",
    blocked: "Blocked",
    encryption: "Encryption",
    viewAllMedia: "View All Media",
    thisContactHasAnEncryptionIdentityOnThisAccount: "This contact has an encryption identity on this account.",
    yourAccountIsEncryptionReadyThisContactHasNotPublishedAnEncryptionIdentityYet: "Your account is encryption-ready. This contact has not published an encryption identity yet.",
    couldNotPrepareEncryptionIdentityRightNow: "Could not prepare encryption identity right now.",


  },
  hi: {
    settings: "सेटिंग्स",
    welcomeBack: "वापसी पर स्वागत है,",
    searchConversations: "बातचीत खोजें...",
    messages: "मैसेज",
    groups: "ग्रुप",
    noMessagesFound: "कोई मैसेज नहीं मिला",
    account: "अकाउंट",
    preferences: "पसंद",
    personalInformation: "व्यक्तिगत जानकारी",
    privacy: "प्राइवेसी",
    notifications: "नोटिफिकेशन",
    darkMode: "डार्क मोड",
    Applanguage: "एप्लिकेशन भाषा",
    logout: "लॉगआउट",
    version: "वर्जन",
    english: "अंग्रेज़ी",
    hindi: "हिंदी",
    spanish: "स्पैनिश",
    selectLanguage: "भाषा चुनें",
    conversation: "बातचीत",
    messageActions: "मैसेज एक्शन",
    chooseMessageAction: "इस मैसेज के साथ क्या करना है, चुनें।",
    typeMessage: "मैसेज लिखें...",
    reply: "जवाब दें",
    edit: "एडिट",
    delete: "डिलीट",
    save: "सेव",
    chats: "चैट",
    cancel: "रद्द करें",
    editingMessage: "मैसेज एडिट हो रहा है",
    replyingTo: "जवाब दे रहे हैं",
    messageDeleted: "मैसेज डिलीट किया गया",
    edited: "एडिट किया गया",
    viewProfile: "प्रोफाइल देखें",
    muteNotifications: "नोटिफिकेशन म्यूट करें",
    unmuteNotifications: "नोटिफिकेशन अनम्यूट करें",
    clearChat: "चैट साफ करें",
    areYouSure: "क्या आप सुनिश्चित हैं?",
    online: "ऑनलाइन",
    tapForInfo: "जानकारी के लिए टैप करें",
    muted: "म्यूट",
    permissionRequired: "नोटिफिकेशन अनुमति आवश्यक है",
    failedToUpdateNotification: "नोटिफिकेशन सेटिंग अपडेट नहीं हुई",
    failedToSendMessage: "मैसेज भेजा नहीं जा सका",
    failedToEditMessage: "मैसेज एडिट नहीं हुआ",
    failedToDeleteMessage: "मैसेज डिलीट नहीं हुआ",
    deleteMessageConfirm: "यह मैसेज इस चैट में सभी के लिए हटा दिया जाएगा।",
    editWindowExpired: "मैसेज भेजने के 3 मिनट के भीतर ही एडिट किया जा सकता है।",
    clearChatForMe: "मेरे लिए साफ करें",
    clearChatForEveryone: "सभी के लिए साफ करें",
    logoutConfirm: "क्या आप लॉगआउट करना चाहते हैं?",
    stayConnected: "जुड़े रहें",
    withCloseFriends: "अपने करीबी दोस्तों के साथ",
    andFamily: "और परिवार",
    getStarted: "शुरू करें",
    forgotPassword: "पासवर्ड भूल गए?",
    welcomeBackShort: "वापसी पर स्वागत है",
    happyToSeeYou: "आपको देखकर खुशी हुई!",
    enterEmail: "अपना ईमेल दर्ज करें",
    enterPassword: "अपना पासवर्ड दर्ज करें",
    dontHaveAccount: "क्या आपका अकाउंट नहीं है ?",
    signUp: "साइन अप",
    needHelp: "कुछ मदद चाहिए?",
    gettingStarted: "शुरुआत करें",
    createAccountContinue: "आगे बढ़ने के लिए अकाउंट बनाएं",
    enterName: "अपना नाम दर्ज करें",
    alreadyHaveAccount: "क्या पहले से अकाउंट है ?",
    login: "लॉगिन",
    fillAllFields: "कृपया सभी फ़ील्ड भरें",
    loginError: "लॉगिन त्रुटि",
    registrationError: "रजिस्ट्रेशन त्रुटि",
    myProfile: "मेरी प्रोफाइल",
    posts: "पोस्ट",
    followers: "फॉलोअर्स",
    following: "फॉलोइंग",
    editProfile: "प्रोफाइल एडिट करें",
    shareProfile: "प्रोफाइल शेयर करें",
    follow: "फॉलो",
    myPosts: "मेरी पोस्ट",
    saved: "सेव्ड",
    couldNotStartConversation: "बातचीत शुरू नहीं हो सकी",
    personalInfo: "व्यक्तिगत जानकारी",
    personalInfoDescription: "यहां यूज़र अपना नाम, ईमेल आदि एडिट करेंगे।",
    visibility: "दृश्यता",
    security: "सुरक्षा",
    dataManagement: "डेटा प्रबंधन",
    privateProfile: "प्राइवेट प्रोफाइल",
    privateProfileDesc: "केवल दोस्त आपकी गतिविधि देख सकते हैं",
    showOnlineStatus: "ऑनलाइन स्टेटस दिखाएं",
    showOnlineStatusDesc: "दूसरों को दिखाएं कि आप कब सक्रिय हैं",
    biometricLock: "बायोमेट्रिक लॉक",
    biometricLockDesc: "खोलने के लिए FaceID/TouchID आवश्यक",
    changePassword: "पासवर्ड बदलें",
    changePasswordDesc: "आखिरी बार 3 महीने पहले बदला गया",
    downloadMyData: "मेरा डेटा डाउनलोड करें",
    deleteAccount: "अकाउंट डिलीट करें",
    newGroup: "नया ग्रुप",
    selectContact: "कॉन्टैक्ट चुनें",
    searchByEmailOrPhone: "ईमेल या फोन से खोजें...",
    groupName: "ग्रुप नाम",
    membersSelected: "सदस्य चुने गए",
    searchResults: "खोज परिणाम",
    allContacts: "सभी कॉन्टैक्ट",
    noUsersFound: "कोई यूज़र नहीं मिला",
    createGroup: "ग्रुप बनाएं",
    groupValidationError: "कृपया ग्रुप नाम दें और कम से कम 2 सदस्य चुनें।",
    updateFailed: "अपडेट विफल",
    somethingWentWrong: "कुछ गलत हो गया",
    required: "आवश्यक",
    provideName: "कृपया नाम दें।",
    uploadFailed: "अपलोड विफल",
    uploadProfilePictureFailed: "प्रोफाइल फोटो अपलोड नहीं हो सकी।",
    changeProfilePhoto: "प्रोफाइल फोटो बदलें",
    fullName: "पूरा नाम",
    emailAddress: "ईमेल पता",
    bio: "बायो",
    tellUsAboutYourself: "अपने बारे में बताएं...",
    updateProfile: "प्रोफाइल अपडेट करें",
    splashSubtitle: "रियल टाइम चैटिंग ऐप",
    defaultBio: "नमस्ते! मैं इस ऐप का उपयोग कर रहा हूं।",
    currentPassword: "वर्तमान पासवर्ड",
    newPassword: "नया पासवर्ड",
    confirmNewPassword: "नया पासवर्ड पुष्टि करें",
    passwordUpdated: "पासवर्ड सफलतापूर्वक अपडेट हुआ",
    passwordMismatch: "नए पासवर्ड मेल नहीं खाते",
    passwordTooShort: "नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए",
    exportSuccess: "आपके डेटा एक्सपोर्ट का ईमेल सफलतापूर्वक भेज दिया गया है।",
    deleteAccountConfirm: "यह अभी आपके अकाउंट को डीएक्टिवेट करेगा। अगर आप रिकवर नहीं करते हैं, तो रिकवरी विंडो के बाद यह हमेशा के लिए डिलीट हो जाएगा।",
    deleteAccountSuccess: "अकाउंट सफलतापूर्वक डीएक्टिवेट हुआ।",
    deactivateAccount: "डीएक्टिवेट करें",
    accountDeletionScheduled: "स्थायी डिलीशन की तारीख है",
    secureYourAccount: "अपने अकाउंट को सुरक्षित रखें",
    changePasswordHelp: "अपने चैट्स और अकाउंट की सुरक्षा के लिए पासवर्ड अपडेट करें।",
    ok: "ठीक है",
    featureUnavailable: "फीचर उपलब्ध नहीं है",
    biometricUnavailable: "सच्ची बायोमेट्रिक ऑथ के लिए इस बिल्ड में अतिरिक्त पैकेज चाहिए। आपकी पसंद लोकली सेव होगी।",
    saveChanges: "परिवर्तन सेव करें",
    processing: "प्रोसेस हो रहा है...",
    privateProfileEnabled: "प्रोफाइल अब प्राइवेट है",
    privateProfileDisabled: "प्रोफाइल अब पब्लिक है",
    onlineStatusHidden: "ऑनलाइन स्टेटस छिपा दिया गया",
    onlineStatusVisible: "ऑनलाइन स्टेटस दिख रहा है",
    forgotPasswordShort: "भूल गए?",
    forgotPasswordDescription: "पासवर्ड रीसेट लिंक प्राप्त करने के लिए अपना ईमेल दर्ज करें।",
    sendResetLink: "रीसेट लिंक भेजें",
    joinUs: "हमारे साथ जुड़ें",
    startYourJourney: "हमारे साथ अपनी यात्रा शुरू करें",
    password: "पासवर्ड",
    // Biometric Shield Keys (Hindi)
    appLockedTitle: "Msgly लॉक है",
    authRequiredDesc: "जारी रखने के लिए सुरक्षित प्रमाणीकरण आवश्यक है",
    unlockButton: "ऐप अनलॉक करें",
    unlockApp: "Msgly अनलॉक करें",
    confirmBiometrics: "लॉक सक्षम करने के लिए पहचान सत्यापित करें",
    helpfeedback: "मदद और फीडबैक",
    accountSubtitle: "सुरक्षा सूचनाएं, खाता जानकारी",
    privacySubtitle: "ब्लॉक किए गए संपर्क, गायब हो रहे संदेश",
    chatSubtitle: "थीम, वॉलपेपर, चैट सेटिंग्स",
    notificationsSubtitle: "संदेश, समूह, ध्वनियाँ",
    helpfeedbackSubtitle: "सहायता केंद्र, हमसे संपर्क करें, गोपनीयता नीति",
    securityAndContact: "सुरक्षा और संपर्क",
    securityNotifications: "सुरक्षा सूचनाएं",
    twoStepVerification: "दो-चरण सत्यापन",
    dangerZone: "खतरे का क्षेत्र",
    accountSettings: "खाता सेटिंग्स",
    privacyCheckupTitle: "गोपनीयता जांच",
    privacyCheckupDesc: "अपनी गोपनीयता नियंत्रित करें और अपने लिए सही सेटिंग चुनें।",
    whoCanSeeInfo: "मेरी व्यक्तिगत जानकारी कौन देख सकता है?",
    lastSeenOnline: "अंतिम बार देखा गया & ऑनलाइन",
    profilePicture: "प्रोफाइल तस्वीर",
    about: "के बारे में",
    links: "लिंक",
    status: "स्थिति",
    readReceipts: "रीड रसीदें",
    readReceiptsDesc: "यदि अक्षम है, तो अन्य लोग नहीं देख पाएंगे कि आपने उनके संदेश कब पढ़े हैं, और आप नहीं देख पाएंगे कि उन्होंने आपके कब पढ़े हैं।",
    disappearingMessages: "गायब हो रहे संदेश",
    defaultMessageTimer: "डिफ़ॉल्ट संदेश टाइमर",
    defaultTimerDesc: "नई चैट के लिए एक डिफ़ॉल्ट टाइमर सेट करें। यह मौजूदा वार्तालापों को प्रभावित नहीं करेगा।",
    avatarStickers: "अवतार स्टिकर",
    avatarStickersDesc: "अवतार इंटरैक्शन के अंदर खोज की अनुमति दें",
    liveLocation: "लाइव लोकेशन",
    calls: "कॉल",
    silenceUnknown: "अज्ञात कॉलर्स को चुप करें",
    contacts: "संपर्क",
    securityLocks: "सुरक्षा ताले",
    appLock: "ऐप लॉक",
    chatLock: "चैट लॉक",
    chatLockDesc: "छिपी हुई चैट्स को लॉक और सुरक्षित रखें",
    advanced: "उन्नत",
    advancedPrivacy: "उन्नत गोपनीयता",
    advancedDesc: "कॉल में आईपी पता सुरक्षित करें, लिंक पूर्वावलोकन अक्षम करें",
    downloadMyDataDesc: "अपना डेटा, जिसमें संदेश, मीडिया और खाता जानकारी शामिल है, की एक प्रति का अनुरोध करें। हम आपको सब कुछ डाउनलोड करने के लिए एक लिंक ईमेल करेंगे।",
    display: "डिस्प्ले",
    theme: "थीम",
    chatWallpaper: "चैट वॉलपेपर",
    defaultChatTheme: "डिफ़ॉल्ट चैट थीम",
    chatSettings: "चैट सेटिंग्स",
    enterIsSend: "एंटर है सेंड",
    enterIsSendSubtitle: "एंटर दबाने से आपका संदेश भेज दिया जाएगा। नई लाइन के लिए Shift + Enter का उपयोग करें।",
    mediaVisibility: "मीडिया दृश्यता",
    mediaVisibilitySubtitle: "नई डाउनलोड की गई मीडिया को अपनी गैलरी में दिखाएं",
    fontSize: "फ़ॉन्ट आकार",
    archivedChats: "आर्काइव्ड चैट्स",
    keepChatsArchived: "चैट्स को आर्काइव्ड रखें",
    keepChatsArchivedSubtitle: "जब नए संदेश आते हैं तो आर्काइव्ड चैट्स आर्काइव्ड रहेंगी",
    chatBackup: "चैट बैकअप",
    transferChats: "चैट ट्रांसफर",
    chatHistory: "चैट इतिहास",
    sendFeedback: "फीडबैक भेजें",
    sendFeedbackSubtitle: "तकनीकी मुद्दों की रिपोर्ट करें",
    support: "सहायता",
    helpCenter: "सहायता केंद्र",
    helpCenterSubtitle: "मदद प्राप्त करें, हमसे संपर्क करें",
    legal: "कानूनी और जानकारी",
    termsPrivacyPolicy: "नियम और गोपनीयता नीति",
    appInfo: "ऐप जानकारी",
    conversationTones: "बातचीत टोन",
    conversationTonesDesc: "आने और जाने वाले संदेशों के लिए ध्वनियाँ चलाएं",
    reminders: "रिमाइंडर",
    remindersDesc: "अनपढ़ नोटिफिकेशन के लिए कभी-कभी अलर्ट प्राप्त करें",
    notificationTone: "नोटिफिकेशन टोन",
    vibrate: "वाइब्रेट",
    light: "लाइट",
    useHighPriority: "उच्च प्राथमिकता नोटिफिकेशन का उपयोग करें",
    highPriorityDesc: "स्क्रीन के शीर्ष पर नोटिफिकेशन दिखाएं",
    reactionNotifications: "रिएक्शन नोटिफिकेशन",
    reactionNotificationsDesc: "जब कोई आपके संदेशों पर प्रतिक्रिया करता है तो सूचित हो जाएं",
    groupNotificationTone: "नोटिफिकेशन टोन",
    groupVibrate: "वाइब्रेट",
    groupLight: "लाइट",
    groupHighPriority: "उच्च प्राथमिकता नोटिफिकेशन का उपयोग करें",
    groupHighPriorityDesc: "समूह नोटिफिकेशन को स्क्रीन के शीर्ष पर दिखाएं",
    groupReactionNotifications: "रिएक्शन नोटिफिकेशन",
    groupReactionDesc: "जब कोई समूह में संदेशों पर प्रतिक्रिया करता है तो सूचित हो जाएं",
    ringtone: "रिंगटोन",
    callVibrate: "वाइब्रेट",
    mediaLinksDocs: "मीडिया लिंक और डॉक्स",
    privacySettings: "प्राइवेसी सेटिंग्स",
    destructiveActions: "डेस्ट्रक्टिव एक्शन",
    block: "ब्लॉक",
    report: "रिपोर्ट",
    blocked: "ब्लॉक किया गया",
    viewAllMedia: "सभी मीडिया देखें",
    encryption: "एन्क्रिप्शन",
    thisContactHasAnEncryptionIdentityOnThisAccount: "इस संपर्क ने इस खाते पर एक एन्क्रिप्शन पहचान प्रकाशित की है।",
    yourAccountIsEncryptionReadyThisContactHasNotPublishedAnEncryptionIdentityYet: "आपका खाता एन्क्रिप्शन-तैयार है। इस संपर्क ने अभी तक कोई एन्क्रिप्शन पहचान प्रकाशित नहीं की है।",
    couldNotPrepareEncryptionIdentityRightNow: "अभी एन्क्रिप्शन पहचान तैयार नहीं हो सकी।",





  },
  es: {
    settings: "Configuracion",
    welcomeBack: "Bienvenido de nuevo,",
    searchConversations: "Buscar conversaciones...",
    messages: "Mensajes",
    groups: "Grupos",
    noMessagesFound: "No se encontraron mensajes",
    account: "CUENTA",
    preferences: "PREFERENCIAS",
    personalInformation: "Informacion personal",
    privacy: "Privacidad",
    helpfeedback: "Ayuda y comentarios",
    notifications: "Notificaciones",
    darkMode: "Modo oscuro",
    Applanguage: "Idioma de la aplicación",
    logout: "Cerrar sesion",
    version: "Version",
    english: "Ingles",
    hindi: "Hindi",
    spanish: "Espanol",
    selectLanguage: "Seleccionar idioma",
    conversation: "Conversacion",
    messageActions: "Acciones del mensaje",
    chooseMessageAction: "Elige lo que quieres hacer con este mensaje.",
    typeMessage: "Escribe un mensaje...",
    reply: "Responder",
    edit: "Editar",
    delete: "Eliminar",
    save: "Guardar",
    cancel: "Cancelar",
    chats: "Chats",
    editingMessage: "Editando mensaje",
    replyingTo: "Respondiendo a",
    messageDeleted: "Mensaje eliminado",
    edited: "Editado",
    viewProfile: "Ver perfil",
    muteNotifications: "Silenciar notificaciones",
    unmuteNotifications: "Activar notificaciones",
    clearChat: "Borrar chat",
    areYouSure: "Estas seguro?",
    online: "En linea",
    tapForInfo: "Toca para ver info",
    muted: "Silenciado",
    permissionRequired: "Se necesita permiso para notificaciones",
    failedToUpdateNotification: "No se pudieron actualizar las notificaciones",
    failedToSendMessage: "No se pudo enviar el mensaje",
    failedToEditMessage: "No se pudo editar el mensaje",
    failedToDeleteMessage: "No se pudo eliminar el mensaje",
    deleteMessageConfirm: "Este mensaje se eliminara para todos en este chat.",
    editWindowExpired: "Solo puedes editar un mensaje dentro de los 3 minutos posteriores al envio.",
    clearChatForMe: "Borrar para mi",
    clearChatForEveryone: "Borrar para todos",
    logoutConfirm: "Seguro que quieres cerrar sesion?",
    stayConnected: "Mantente conectado",
    withCloseFriends: "con tus amigos cercanos",
    andFamily: "y familia",
    getStarted: "Comenzar",
    forgotPassword: "Olvidaste tu contrasena?",
    welcomeBackShort: "Bienvenido de nuevo",
    happyToSeeYou: "Nos alegra verte!",
    enterEmail: "Ingresa tu correo",
    enterPassword: "Ingresa tu contrasena",
    dontHaveAccount: "No tienes una cuenta ?",
    signUp: "Registrarse",
    needHelp: "Necesitas ayuda?",
    gettingStarted: "Empezando",
    createAccountContinue: "Crea una cuenta para continuar",
    enterName: "Ingresa tu nombre",
    alreadyHaveAccount: "Ya tienes cuenta ?",
    login: "Iniciar sesion",
    fillAllFields: "Completa todos los campos",
    loginError: "Error de inicio de sesion",
    registrationError: "Error de registro",
    myProfile: "Mi perfil",
    posts: "Publicaciones",
    followers: "Seguidores",
    following: "Siguiendo",
    editProfile: "Editar perfil",
    shareProfile: "Compartir perfil",
    follow: "Seguir",
    myPosts: "Mis publicaciones",
    saved: "Guardado",
    couldNotStartConversation: "No se pudo iniciar la conversacion",
    personalInfo: "Informacion personal",
    personalInfoDescription: "Aqui los usuarios editan su nombre, correo, etc.",
    visibility: "VISIBILIDAD",
    security: "SEGURIDAD",
    dataManagement: "GESTION DE DATOS",
    privateProfile: "Perfil privado",
    privateProfileDesc: "Solo amigos pueden ver tu actividad",
    showOnlineStatus: "Mostrar estado en linea",
    showOnlineStatusDesc: "Permite que otros vean cuando estas activo",
    biometricLock: "Bloqueo biometrico",
    biometricLockDesc: "Requiere FaceID/TouchID para abrir",
    changePassword: "Cambiar contrasena",
    changePasswordDesc: "Cambiada hace 3 meses",
    downloadMyData: "Descargar mis datos",
    deleteAccount: "Eliminar cuenta",
    newGroup: "Nuevo grupo",
    selectContact: "Seleccionar contacto",
    searchByEmailOrPhone: "Buscar por correo o telefono...",
    groupName: "Nombre del grupo",
    membersSelected: "miembros seleccionados",
    searchResults: "RESULTADOS DE BUSQUEDA",
    allContacts: "TODOS LOS CONTACTOS",
    noUsersFound: "No se encontraron usuarios",
    createGroup: "Crear grupo",
    groupValidationError: "Ingresa un nombre de grupo y selecciona al menos 2 miembros.",
    updateFailed: "Actualizacion fallida",
    somethingWentWrong: "Algo salio mal",
    required: "Requerido",
    provideName: "Por favor ingresa un nombre.",
    uploadFailed: "Carga fallida",
    uploadProfilePictureFailed: "No se pudo subir la foto de perfil.",
    changeProfilePhoto: "Cambiar foto de perfil",
    fullName: "NOMBRE COMPLETO",
    emailAddress: "CORREO ELECTRONICO",
    bio: "BIO",
    tellUsAboutYourself: "Cuéntanos sobre ti...",
    updateProfile: "Actualizar perfil",
    splashSubtitle: "Aplicacion de chat en tiempo real",
    defaultBio: "Hola! Estoy usando esta app.",
    currentPassword: "Contrasena actual",
    newPassword: "Nueva contrasena",
    confirmNewPassword: "Confirmar nueva contrasena",
    passwordUpdated: "Contrasena actualizada correctamente",
    passwordMismatch: "Las nuevas contrasenas no coinciden",
    passwordTooShort: "La nueva contrasena debe tener al menos 6 caracteres",
    exportSuccess: "La solicitud de exportacion de datos se envio por correo correctamente.",
    deleteAccountConfirm: "Esto desactivara tu cuenta ahora. Si no la recuperas dentro del periodo de recuperacion, se eliminara permanentemente.",
    deleteAccountSuccess: "Cuenta desactivada correctamente.",
    deactivateAccount: "Desactivar",
    accountDeletionScheduled: "La eliminacion permanente esta programada para",
    secureYourAccount: "Protege tu cuenta",
    changePasswordHelp: "Actualiza tu contrasena para mantener seguros tus chats y tu cuenta.",
    ok: "OK",
    featureUnavailable: "Funcion no disponible",
    biometricUnavailable: "La autenticacion biometrica real necesita un paquete biometrico en esta build. Tu preferencia aun se guardara localmente.",
    saveChanges: "Guardar cambios",
    processing: "Procesando...",
    privateProfileEnabled: "El perfil ahora es privado",
    privateProfileDisabled: "El perfil ahora es publico",
    onlineStatusHidden: "Estado en linea oculto",
    onlineStatusVisible: "Estado en linea visible",
    password: "CONTRASEÑA",
    forgotPasswordShort: "¿Olvidaste?",
    forgotPasswordDescription: "Ingresa tu correo para recibir un enlace de restablecimiento.",
    sendResetLink: "Enviar enlace",
    joinUs: "Únete a nosotros",
    startYourJourney: "Comienza tu viaje con nosotros",
    // Biometric Shield Keys (Spanish)
    appLockedTitle: "Msgly está Bloqueado",
    authRequiredDesc: "Se requiere autenticación segura para continuar",
    unlockButton: "Desbloquear App",
    unlockApp: "Desbloquear Msgly",
    confirmBiometrics: "Verifica tu identidad para activar el bloqueo",
    accountSubtitle: "Notificaciones de seguridad, información de la cuenta",
    privacySubtitle: "Contactos bloqueados, mensajes que desaparecen",
    chatSubtitle: "Tema, fondo de pantalla, configuración de chat",
    notificationsSubtitle: "Mensajes, grupos, sonidos",
    helpfeedbackSubtitle: "Centro de ayuda, contáctanos, política de privacidad",
    securityAndContact: "Seguridad y contacto",
    securityNotifications: "Notificaciones de seguridad",
    twoStepVerification: "Verificación en dos pasos",
    dangerZone: "Zona de peligro",
    accountSettings: "Configuración de la cuenta",
    privacyCheckupTitle: "Revisión de privacidad",
    privacyCheckupDesc: "Controla tu privacidad y elige la configuración adecuada para ti.",
    whoCanSeeInfo: "¿Quién puede ver mi información personal?",
    lastSeenOnline: "Última vez visto & en línea",
    profilePicture: "Foto de perfil",
    about: "Acerca de",
    links: "Enlaces",
    status: "Estado",
    readReceipts: "Confirmaciones de lectura",
    readReceiptsDesc: "Si se desactiva, otros no podrán ver cuándo has leído sus mensajes, y tú no podrás ver cuándo han leído los tuyos.",
    disappearingMessages: "Mensajes que desaparecen",
    defaultMessageTimer: "Temporizador de mensajes predeterminado",
    defaultTimerDesc: "Establece un temporizador predeterminado para los nuevos chats. Esto no afectará las conversaciones existentes.",
    avatarStickers: "Stickers de avatar",
    avatarStickersDesc: "Permitir búsqueda dentro de las interacciones de avatar",
    liveLocation: "Ubicación en vivo",
    calls: "Llamadas",
    silenceUnknown: "Silenciar llamadas desconocidas",
    contacts: "Contactos",
    securityLocks: "Bloqueos de seguridad",
    appLock: "Bloqueo de la aplicación",
    chatLock: "Bloqueo de chat",
    chatLockDesc: "Mantén los chats ocultos bloqueados y seguros",
    advanced: "Avanzado",
    advancedPrivacy: "Privacidad avanzada",
    advancedDesc: "Protege la dirección IP en las llamadas, desactiva las vistas previas de enlaces",
    downloadMyDataDesc: "Solicita una copia de tus datos, incluidos mensajes, medios e información de la cuenta. Te enviaremos un enlace por correo electrónico para descargar todo.",
    display: "Pantalla",
    theme: "Tema",
    chatWallpaper: "Fondo de chat",
    defaultChatTheme: "Tema de chat predeterminado",
    chatSettings: "Configuración de chat",
    enterIsSend: "Enter es enviar",
    enterIsSendSubtitle: "Presionar Enter enviará tu mensaje. Usa Shift + Enter para una nueva línea.",
    mediaVisibility: "Visibilidad de medios",
    mediaVisibilitySubtitle: "Mostrar los medios recién descargados en tu galería",
    fontSize: "Tamaño de fuente",
    archivedChats: "Chats archivados",
    keepChatsArchived: "Mantener los chats archivados",
    keepChatsArchivedSubtitle: "Los chats archivados permanecerán archivados cuando lleguen nuevos mensajes",
    chatBackup: "Copia de seguridad del chat",
    transferChats: "Transferir chats",
    chatHistory: "Historial de chat",
    support: "Soporte",
    helpCenter: "Centro de ayuda",
    helpCenterSubtitle: "Obtén ayuda, contáctanos",
    sendFeedback: "Enviar comentarios",
    sendFeedbackSubtitle: "Reportar problemas técnicos",
    legal: "Legal e información",
    termsPrivacyPolicy: "Términos y política de privacidad",
    appInfo: "Información de la aplicación",
    conversationTones: "Tonos de conversación",
    conversationTonesDesc: "Reproducir sonidos para mensajes entrantes y salientes",
    reminders: "Recordatorio",
    remindersDesc: "Recibe alertas ocasionales para notificaciones no leídas",
    notificationTone: "Tono de notificación",
    vibrate: "Vibrar",
    light: "Luz",
    useHighPriority: "Usar notificaciones de alta prioridad",
    highPriorityDesc: "Mostrar notificaciones en la parte superior de la pantalla",
    reactionNotifications: "Notificaciones de reacciones",
    reactionNotificationsDesc: "Recibe una notificación cuando alguien reacciona a tus mensajes",
    groupNotificationTone: "Tonos de notificación",
    groupVibrate: "Vibrar",
    groupLight: "Luz",
    groupHighPriority: "Usar notificaciones de alta prioridad",
    groupHighPriorityDesc: "Mostrar las notificaciones del grupo en la parte superior de la pantalla",
    groupReactionNotifications: "Notificaciones de reacciones",
    groupReactionDesc: "Recibe una notificación cuando alguien reacciona a los mensajes en los grupos",
    ringtone: "Tono de llamada",
    callVibrate: "Vibrar",
    mediaLinksDocs: "Media links and docs",
    privacySettings: "Privacy Settings",
    destructiveActions: "Destructive Actions",
    block: "Block",
    report: "Report",
    blocked: "Blocked",
    encryption: "Encryption",
    viewAllMedia: "View All Media",
    thisContactHasAnEncryptionIdentityOnThisAccount: "This contact has an encryption identity on this account.",
    yourAccountIsEncryptionReadyThisContactHasNotPublishedAnEncryptionIdentityYet: "Your account is encryption-ready. This contact has not published an encryption identity yet.",
    couldNotPrepareEncryptionIdentityRightNow: "Could not prepare encryption identity right now.",


  },
};
const AppSettingsContext = createContext<AppSettingsContextProps>({
  language: "en",
  setLanguage: async () => { },
  notificationsEnabled: true,
  setNotificationsEnabled: async () => { },
  mutedConversationIds: [],
  toggleConversationMute: async () => { },
  isConversationMuted: () => false,
  emailAddress: "",
  settings: createDefaultUserSettings(),
  updateSettings: async () => { },
  refreshSettings: async () => { },
  t: (key: string) => key,
  isReady: false,
  resetSettings: async () => { },
});

const mergeSettings = (
  currentSettings: AppUserSettings,
  nextPatch: Partial<AppUserSettings>
): AppUserSettings => ({
  ...currentSettings,
  ...nextPatch,
  account: {
    ...currentSettings.account,
    ...(nextPatch.account || {}),
    securityNotifications: {
      ...currentSettings.account.securityNotifications,
      ...(nextPatch.account?.securityNotifications || {}),
    },
    twoStepVerification: {
      ...currentSettings.account.twoStepVerification,
      ...(nextPatch.account?.twoStepVerification || {}),
    },
  },
  privacy: {
    ...currentSettings.privacy,
    ...(nextPatch.privacy || {}),
  },
  chats: {
    ...currentSettings.chats,
    ...(nextPatch.chats || {}),
  },
  notifications: {
    ...currentSettings.notifications,
    ...(nextPatch.notifications || {}),
    messages: {
      ...currentSettings.notifications.messages,
      ...(nextPatch.notifications?.messages || {}),
    },
    groups: {
      ...currentSettings.notifications.groups,
      ...(nextPatch.notifications?.groups || {}),
    },
    calls: {
      ...currentSettings.notifications.calls,
      ...(nextPatch.notifications?.calls || {}),
    },
  },
});

const isNotFoundError = (error: any) => error?.response?.status === 404;
const isNetworkError = (error: any) =>
  !error?.response &&
  (error?.message === "Network Error" ||
    error?.code === "ERR_NETWORK" ||
    error?.code === "ECONNABORTED");

export const AppSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>("en");
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [mutedConversationIds, setMutedConversationIds] = useState<string[]>([]);
  const [emailAddress, setEmailAddress] = useState("");
  const [settings, setSettings] = useState<AppUserSettings>(createDefaultUserSettings());
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLocalSettings = async () => {
      try {
        const [storedLanguage, storedNotifications, storedMuted, storedSettings, storedEmail] =
          await Promise.all([
            AsyncStorage.getItem(LANGUAGE_KEY),
            AsyncStorage.getItem(NOTIFICATIONS_KEY),
            AsyncStorage.getItem(MUTED_KEY),
            AsyncStorage.getItem(USER_SETTINGS_KEY),
            AsyncStorage.getItem(EMAIL_KEY),
          ]);

        if (isSupportedLanguage(storedLanguage)) {
          setLanguageState(storedLanguage);
        }

        if (storedNotifications !== null) {
          setNotificationsEnabledState(storedNotifications === "true");
        }

        if (storedMuted) {
          try {
            setMutedConversationIds(JSON.parse(storedMuted));
          } catch (error) {
            setMutedConversationIds([]);
          }
        }

        if (storedSettings) {
          try {
            setSettings(mergeSettings(createDefaultUserSettings(), JSON.parse(storedSettings)));
          } catch (error) {
            setSettings(createDefaultUserSettings());
          }
        }

        if (storedEmail) {
          setEmailAddress(storedEmail);
        }
      } catch (e) {
        console.error("Error loading settings", e);
      } finally {
        setIsReady(true);
      }
    };

    loadLocalSettings();
  }, []);

  const syncPreferences = async (next: {
    language?: AppLanguage;
    notificationsEnabled?: boolean;
    mutedConversationIds?: string[];
    settings?: Partial<AppUserSettings>;
  }) => {
    if (!token) return;

    let response: any;
    try {
      response = await saveUserSettings(token, next);
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      throw error;
    }

    const nextLanguage = isSupportedLanguage(response?.data?.language)
      ? response.data.language
      : language;
    const nextNotifications = response?.data?.notificationsEnabled ?? notificationsEnabled;
    const nextMuted = response?.data?.mutedConversationIds || mutedConversationIds;
    const nextEmail = response?.data?.email || emailAddress;
    const nextSettings = mergeSettings(
      createDefaultUserSettings(),
      response?.data?.settings || settings
    );

    setLanguageState(nextLanguage);
    setNotificationsEnabledState(nextNotifications);
    setMutedConversationIds(nextMuted);
    setEmailAddress(nextEmail);
    setSettings(nextSettings);

    await Promise.all([
      AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage),
      AsyncStorage.setItem(NOTIFICATIONS_KEY, String(nextNotifications)),
      AsyncStorage.setItem(MUTED_KEY, JSON.stringify(nextMuted)),
      AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(nextSettings)),
      AsyncStorage.setItem(EMAIL_KEY, nextEmail),
    ]);
  };

  const resetSettings = async () => {
    setLanguageState("en");
    setNotificationsEnabledState(true);
    setMutedConversationIds([]);
    setEmailAddress("");
    setSettings(createDefaultUserSettings());
    setIsReady(true);

    await AsyncStorage.multiRemove([
      LANGUAGE_KEY,
      NOTIFICATIONS_KEY,
      MUTED_KEY,
      USER_SETTINGS_KEY,
      EMAIL_KEY,
    ]);
  };

  const refreshSettings = async () => {
    if (!token) return;

    const useLocalSettingsFallback = async () => {
      const userLanguage = user?.language || null;
      const nextLanguage = isSupportedLanguage(userLanguage) ? userLanguage : language;
      const nextNotifications = user?.notificationsEnabled ?? notificationsEnabled;
      const nextEmail = user?.email || emailAddress;
      const nextSettings = mergeSettings(
        createDefaultUserSettings(),
        user?.settings || settings
      );

      setLanguageState(nextLanguage);
      setNotificationsEnabledState(nextNotifications);
      setEmailAddress(nextEmail);
      setSettings(nextSettings);

      await Promise.all([
        AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage),
        AsyncStorage.setItem(NOTIFICATIONS_KEY, String(nextNotifications)),
        AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(nextSettings)),
        AsyncStorage.setItem(EMAIL_KEY, nextEmail),
      ]);
    };

    let response: any;
    try {
      response = await getUserSettings(token);
    } catch (error) {
      if (isNotFoundError(error) || isNetworkError(error)) {
        await useLocalSettingsFallback();
        return;
      }

      throw error;
    }

    if (!response?.success || !response?.data) return;

    const nextLanguage = isSupportedLanguage(response.data.language)
      ? response.data.language
      : "en";
    const nextNotifications = response.data.notificationsEnabled ?? true;
    const nextMuted = response.data.mutedConversationIds || [];
    const nextEmail = response.data.email || "";
    const nextSettings = mergeSettings(
      createDefaultUserSettings(),
      response.data.settings || {}
    );

    setLanguageState(nextLanguage);
    setNotificationsEnabledState(nextNotifications);
    setMutedConversationIds(nextMuted);
    setEmailAddress(nextEmail);
    setSettings(nextSettings);

    await Promise.all([
      AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage),
      AsyncStorage.setItem(NOTIFICATIONS_KEY, String(nextNotifications)),
      AsyncStorage.setItem(MUTED_KEY, JSON.stringify(nextMuted)),
      AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(nextSettings)),
      AsyncStorage.setItem(EMAIL_KEY, nextEmail),
    ]);
  };

  useEffect(() => {
    if (!token || !user?.id) return;
    refreshSettings().catch((error) => {
      if (isNotFoundError(error) || isNetworkError(error)) return;
      console.log("settings refresh failed:", error?.message || error);
    });
  }, [token, user?.id]);

  const setLanguage = async (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    await syncPreferences({ language: nextLanguage });
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(enabled));
    await syncPreferences({ notificationsEnabled: enabled });

    try {
      if (enabled) {
        const fcmToken = await registerForPushNotificationsAsync();
        if (!fcmToken) {
          setNotificationsEnabledState(false);
          await AsyncStorage.setItem(NOTIFICATIONS_KEY, "false");
          await syncPreferences({ notificationsEnabled: false });
          Alert.alert(translations[language].notifications, translations[language].permissionRequired);
          return;
        }
        const socket = getSocket();
        socket?.emit("updatePushToken", { fcmToken: fcmToken });
      } else {
        const socket = getSocket();
        socket?.emit("updatePushToken", { fcmToken: null });
      }
    } catch (error) {
      Alert.alert(translations[language].notifications, translations[language].failedToUpdateNotification);
    }
  };

  const toggleConversationMute = async (conversationId: string) => {
    const exists = mutedConversationIds.includes(conversationId);
    const nextMuted = exists
      ? mutedConversationIds.filter((id) => id !== conversationId)
      : [...mutedConversationIds, conversationId];

    setMutedConversationIds(nextMuted);
    await AsyncStorage.setItem(MUTED_KEY, JSON.stringify(nextMuted));
    await syncPreferences({ mutedConversationIds: nextMuted });
  };

  const updateSettings = async (patch: Partial<AppUserSettings>) => {
    const previousSettings = settings;
    const nextSettings = mergeSettings(settings, patch);
    setSettings(nextSettings);
    await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(nextSettings));

    try {
      await syncPreferences({ settings: patch });
    } catch (error) {
      setSettings(previousSettings);
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(previousSettings));
      throw error;
    }
  };

  const value = useMemo<AppSettingsContextProps>(
    () => ({
      language,
      setLanguage,
      resetSettings,
      notificationsEnabled,
      setNotificationsEnabled,
      mutedConversationIds,
      toggleConversationMute,
      isConversationMuted: (conversationId?: string | null) =>
        !!conversationId && mutedConversationIds.includes(conversationId),
      emailAddress,
      settings,
      updateSettings,
      refreshSettings,
      t: (key: string) => translations[language][key] || translations.en[key] || key,
      isReady,
    }),
    [
      emailAddress,
      language,
      notificationsEnabled,
      mutedConversationIds,
      settings,
      isReady,
    ]
  );

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
};

export const useAppSettings = () => useContext(AppSettingsContext);
