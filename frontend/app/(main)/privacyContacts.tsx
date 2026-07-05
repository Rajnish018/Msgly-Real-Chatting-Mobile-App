import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Avatar from "@/components/Avatar";
import Input from "@/components/Input";
import Typo from "@/components/Typo";
import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAppSettings } from "@/context/appSettingsContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { connectSocket } from "@/socket/socket";
import { getContacts } from "@/socket/socketEvents";
import { scale, verticalScale } from "@/utils/styling";

const PrivacyContacts = () => {
  const router = useRouter();
  const { colors: themeColors } = useTheme();
  const { token } = useAuth();
  const { settings, updateSettings } = useAppSettings();
  const blockedUserIds = settings.privacy.blockedUserIds;
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let isMounted = true;

    const handleContacts = (response: any) => {
      if (response?.success) {
        setContacts(response.data || []);
      }
    };

    const fetchContacts = async () => {
      try {
        await connectSocket(token);
        if (!isMounted) return;

        getContacts(handleContacts);
        getContacts({});
      } catch (error) {
        console.warn("Contacts fetch skipped: socket connection failed");
      }
    };

    fetchContacts();

    return () => {
      isMounted = false;
      getContacts(handleContacts, true);
    };
  }, [token]);

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return contacts;

    return contacts.filter((contact) =>
      [contact?.name, contact?.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [contacts, searchQuery]);

  const toggleBlocked = async (contactId: string) => {
    const nextBlockedIds = blockedUserIds.includes(contactId)
      ? blockedUserIds.filter((id) => id !== contactId)
      : [...blockedUserIds, contactId];

    await updateSettings({
      privacy: {
        blockedUserIds: nextBlockedIds,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">
          Contacts
        </Typo>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={styles.content}>
        <Input
          placeholder="Search contacts"
          value={searchQuery}
          onChangeText={setSearchQuery}
          icon={<Icons.MagnifyingGlass size={20} color={themeColors.neutral400} />}
        />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {filteredContacts.map((contact) => {
            const isBlocked = blockedUserIds.includes(contact.id);
            return (
              <TouchableOpacity
                key={contact.id}
                style={[styles.row, { borderBottomColor: themeColors.neutral200 }]}
                onPress={() => toggleBlocked(contact.id)}
              >
                <Avatar size={44} uri={contact.avatar || null} />
                <View style={styles.rowText}>
                  <Typo size={16} fontWeight="600">
                    {contact.name}
                  </Typo>
                  <Typo size={13} color={themeColors.neutral500}>
                    {contact.email || "Hidden"}
                  </Typo>
                </View>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: isBlocked ? themeColors.rose : themeColors.primary },
                  ]}
                >
                  <Typo size={12} color={themeColors.white} fontWeight="700">
                    {isBlocked ? "Blocked" : "Allow"}
                  </Typo>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default PrivacyContacts;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacingX._20,
    paddingVertical: spacingY._15,
  },
  backButton: {
    backgroundColor: colors.neutral100,
    padding: scale(8),
    borderRadius: radius._10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacingX._20,
    gap: spacingY._14,
  },
  list: {
    paddingBottom: verticalScale(40),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacingX._12,
    paddingVertical: spacingY._14,
    borderBottomWidth: 1,
  },
  rowText: {
    flex: 1,
    gap: spacingY._2,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacingX._12,
    paddingVertical: spacingY._5,
  },
});
