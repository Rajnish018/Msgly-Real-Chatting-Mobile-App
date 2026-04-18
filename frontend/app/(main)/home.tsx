import React, { useEffect, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView } from "react-native";

import ScreenWrapper from "@/components/ScreenWrapper";
import Typo from "@/components/Typo";

import { colors, radius, spacingX, spacingY } from "@/constants/theme";
import { useAuth } from "@/context/authContext";
import { verticalScale } from "@/utils/styling";
import * as Icons from "phosphor-react-native";
import { useRouter } from "expo-router";
import ConversationItem from "@/components/ConversationItem";
import Loading from "@/components/Loading";
import Button from "@/components/Button";

import {
  getConversations,
  newConversation,
  conversationUpdated,
  joinConversation,
} from "@/socket/socketEvents";

import { ConversationProps, ResponseProps } from "@/types";

const Home = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [selectTab, setSelectedTab] = useState(0);
  const [loading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationProps[]>([]);

  useEffect(() => {
    setIsLoading(true);

    // attach listeners
    getConversations(processConversations);
    newConversation(newConversationHandler);
    conversationUpdated(conversationUpdatedHandler);

    // request conversations
    getConversations(null);

    return () => {
      // remove listeners
      getConversations(processConversations, true);
      newConversation(newConversationHandler, true);
      conversationUpdated(conversationUpdatedHandler, true);
    };
  }, []);

  const processConversations = (res: ResponseProps) => {
    setIsLoading(false);

    if (res.success) {
      setConversations(res.data || []);

      // join all rooms so inbox gets realtime updates
      (res.data || []).forEach((conv: any) => {
        joinConversation(conv._id);
      });
    }
  };

  const newConversationHandler = (res: ResponseProps) => {
    if (res.success && res.data?.isNew) {
      setConversations((prev) => [res.data, ...prev]);

      // join new conversation room instantly
      joinConversation(res.data._id);
    }
  };

  //  MAIN: realtime lastMessage update
  const conversationUpdatedHandler = (res: ResponseProps) => {
    if (!res.success) return;

    setConversations((prev) => {
      //  replace updated conversation
      const updated = prev.map((c: any) =>
        String(c._id) === String(res.data._id) ? res.data : c
      );

      //  sort latest on top
      updated.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      return updated;
    });
  };

  let directConversations = conversations
    .filter((item: ConversationProps) => item.type === "direct")
    .sort((a: ConversationProps, b: ConversationProps) => {
      const aDate = a?.lastMessage?.createdAt || a.createdAt;
      const bDate = b?.lastMessage?.createdAt || b.createdAt;

      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  let groupConversations = conversations
    .filter((item: ConversationProps) => item.type === "group")
    .sort((a: ConversationProps, b: ConversationProps) => {
      const aDate = a?.lastMessage?.createdAt || a.createdAt;
      const bDate = b?.lastMessage?.createdAt || b.createdAt;

      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  return (
    <ScreenWrapper showPattern={true} bgOpacity={0.4}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Typo
              color={colors.neutral200}
              size={19}
              textProps={{ numberOfLines: 1 }}
            >
              Welcome back,{" "}
              <Typo size={20} color={colors.white} fontWeight={"800"}>
                {user?.name}
              </Typo>{" "}
              👍
            </Typo>
          </View>

          <TouchableOpacity
            style={styles.settingIcon}
            onPress={() => router.push("/(main)/profileModal")}
          >
            <Icons.GearSixIcon
              color={colors.white}
              weight="fill"
              size={verticalScale(22)}
            />
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <View style={styles.content}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: spacingY._20 }}
          >
            <View style={styles.navBar}>
              <View style={styles.tabs}>
                <TouchableOpacity
                  onPress={() => setSelectedTab(0)}
                  style={[
                    styles.tabStyle,
                    selectTab === 0 && styles.activeTabStyle,
                  ]}
                >
                  <Typo>Direct Messages</Typo>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedTab(1)}
                  style={[
                    styles.tabStyle,
                    selectTab === 1 && styles.activeTabStyle,
                  ]}
                >
                  <Typo>Groups</Typo>
                </TouchableOpacity>
              </View>
            </View>

            {/* LIST */}
            <View style={styles.conversationList}>
              {selectTab === 0 &&
                directConversations.map((item: ConversationProps, index) => {
                  return (
                    <ConversationItem
                      item={item}
                      key={item._id || index}
                      router={router}
                      showDivider={directConversations.length !== index + 1}
                    />
                  );
                })}

              {selectTab === 1 &&
                groupConversations.map((item: ConversationProps, index) => {
                  return (
                    <ConversationItem
                      item={item}
                      key={item._id || index}
                      router={router}
                      showDivider={groupConversations.length !== index + 1} // ✅ FIXED
                    />
                  );
                })}

              {!loading &&
                selectTab === 0 &&
                directConversations.length === 0 && (
                  <Typo style={{ textAlign: "center" }}>
                    You don&apos;t have any message
                  </Typo>
                )}

              {!loading &&
                selectTab === 1 &&
                groupConversations.length === 0 && (
                  <Typo style={{ textAlign: "center" }}>
                    You haven&apos;t joined any groups yet
                  </Typo>
                )}

              {loading && <Loading />}
            </View>
          </ScrollView>
        </View>
      </View>

      {/* FLOATING BUTTON */}
      <Button
        style={styles.floatingButton}
        onPress={() =>
          router.push({
            pathname: "/(main)/newConversationModal",
            params: { isGroup: selectTab },
          })
        }
      >
        <Icons.PlusIcon
          color={colors.black}
          weight="bold"
          size={verticalScale(24)}
        />
      </Button>
    </ScreenWrapper>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacingX._20,
    gap: spacingY._15,
    paddingTop: spacingY._15,
    paddingBottom: spacingY._20,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  content: {
    flex: 1,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius._50,
    borderTopRightRadius: radius._50,
    borderCurve: "continuous",
    overflow: "hidden",
    paddingHorizontal: spacingX._20,
  },

  navBar: {
    flexDirection: "row",
    gap: spacingX._15,
    alignItems: "center",
    paddingHorizontal: spacingX._10,
  },

  tabs: {
    flexDirection: "row",
    gap: spacingX._10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  tabStyle: {
    paddingVertical: spacingY._10,
    paddingHorizontal: spacingX._20,
    borderRadius: radius.full,
    backgroundColor: colors.neutral100,
  },

  activeTabStyle: {
    backgroundColor: colors.primaryLight,
  },

  conversationList: {
    paddingVertical: spacingY._20,
  },

  settingIcon: {
    padding: spacingY._10,
    backgroundColor: colors.neutral700,
    borderRadius: radius.full,
  },

  floatingButton: {
    height: verticalScale(50),
    width: verticalScale(50),
    borderRadius: 100,
    position: "absolute",
    bottom: verticalScale(30),
    right: verticalScale(30),
  },
});
