import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";
import moment from "moment";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { getSharedContent } from "@/services/authService";
import { scale, verticalScale } from "@/utils/styling";

const tabs = ["media", "links", "docs"] as const;

const SharedMedia = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selectedTab, setSelectedTab] = useState<(typeof tabs)[number]>("media");
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>({ media: [], links: [], docs: [] });

  const conversationId = Array.isArray(params.conversationId)
    ? params.conversationId[0]
    : params.conversationId;
  const name = Array.isArray(params.name) ? params.name[0] : params.name;

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      if (!token || !conversationId) return;

      try {
        setLoading(true);
        const response = await getSharedContent(token, String(conversationId));
        if (isMounted && response?.success) {
          setContent(response.data || { media: [], links: [], docs: [] });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadContent();

    return () => {
      isMounted = false;
    };
  }, [conversationId, token]);

  const items = content[selectedTab] || [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icons.CaretLeft size={scale(24)} color={colors.text} weight="bold" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Typo size={19} fontWeight="700" color={colors.text}>
            Media, links, docs
          </Typo>
          {!!name && (
            <Typo size={12} color={colors.neutral500} textProps={{ numberOfLines: 1 }}>
              {name}
            </Typo>
          )}
        </View>
        <View style={{ width: scale(40) }} />
      </View>

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setSelectedTab(tab)}
          >
            <Typo
              fontWeight="700"
              color={selectedTab === tab ? colors.primary : colors.neutral500}
            >
              {tab === "media" ? "Media" : tab === "links" ? "Links" : "Docs"}
            </Typo>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {selectedTab === "media" && items.length > 0 && (
            <View style={styles.mediaGrid}>
              {items.map((item: any) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={styles.mediaTile}
                  onPress={() => Linking.openURL(item.url)}
                >
                  <Image source={{ uri: item.url }} contentFit="cover" style={StyleSheet.absoluteFillObject} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {selectedTab !== "media" && items.length > 0 && (
            <View style={styles.list}>
              {items.map((item: any, index: number) => (
                <TouchableOpacity
                  key={`${item.id}-${item.url}-${index}`}
                  activeOpacity={0.8}
                  style={[styles.listItem, { borderBottomColor: colors.neutral200 }]}
                  onPress={() => Linking.openURL(item.url)}
                >
                  {selectedTab === "links" ? (
                    <Icons.LinkSimple size={scale(22)} color={colors.primary} />
                  ) : (
                    <Icons.FileText size={scale(22)} color={colors.primary} />
                  )}
                  <View style={styles.listText}>
                    <Typo size={15} fontWeight="700" color={colors.text} textProps={{ numberOfLines: 1 }}>
                      {item.title || item.name || item.url}
                    </Typo>
                    <Typo size={12} color={colors.neutral500}>
                      {item.createdAt ? moment(item.createdAt).format("MMM D, YYYY") : ""}
                    </Typo>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!items.length && (
            <View style={styles.emptyState}>
              <Icons.Files size={scale(60)} color={colors.neutral300} weight="thin" />
              <Typo color={colors.neutral500} style={{ marginTop: spacingY._10 }}>
                Nothing here yet
              </Typo>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default SharedMedia;

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.white,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacingX._20,
      paddingVertical: spacingY._15,
    },
    backButton: {
      padding: scale(8),
      borderRadius: radius._10,
      backgroundColor: colors.neutral100,
    },
    headerTitle: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: spacingX._10,
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.neutral100,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacingY._12,
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      padding: spacingX._20,
      paddingBottom: verticalScale(80),
    },
    mediaGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacingX._7,
    },
    mediaTile: {
      width: "31.8%",
      aspectRatio: 1,
      borderRadius: radius._10,
      overflow: "hidden",
      backgroundColor: colors.neutral100,
    },
    list: {
      borderRadius: radius._15,
      overflow: "hidden",
      backgroundColor: colors.neutral100,
      paddingHorizontal: spacingX._12,
    },
    listItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacingX._12,
      paddingVertical: spacingY._15,
      borderBottomWidth: 1,
    },
    listText: {
      flex: 1,
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: verticalScale(120),
    },
  });
