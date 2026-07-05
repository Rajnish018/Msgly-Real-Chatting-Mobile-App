import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Icons from "phosphor-react-native";

import Typo from "@/components/Typo";
import { radius, spacingX, spacingY } from "@/constants/theme";
import { useTheme } from "@/context/themeContext";
import { useAppSettings } from "@/context/appSettingsContext";
import { scale, verticalScale } from "@/utils/styling";


const PaymentsBilling = () => {
  const { colors: themeColors } = useTheme();
  const { t } = useAppSettings();
  const router = useRouter();
  
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const paymentArticles = [
    {
      title: t("paymentMethodsTitle") || "What payment methods are supported?",
      content: t("paymentMethodsContent") || "We support all major global credit/debit cards (Visa, Mastercard, American Express), Apple Pay, and Google Pay. All processing is handled through fully encrypted, PCI-compliant native gateways.",
    },
    {
      title: t("upgradePremiumTitle") || "How do I upgrade to Premium?",
      content: t("upgradePremiumContent") || "To upgrade, tap the 'View Premium Plans' shortcut below or head to your profile settings. Premium plans include large file transfers, dedicated workspaces, custom themes, and permanent transcription tools.",
    },
    {
      title: t("cancelSubscriptionTitle") || "How do I cancel my subscription?",
      content: t("cancelSubscriptionContent") || "You can cancel your subscription at any time. If you upgraded via App Store or Google Play, manage it directly through your device's subscription platform settings. If paid via card, handle it right in the app's billing hub.",
    }
  ];

  const toggleAccordion = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.white }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: themeColors.neutral100 }]}
        >
          <Icons.CaretLeft size={scale(24)} color={themeColors.black} weight="bold" />
        </TouchableOpacity>
        <Typo size={20} fontWeight="700">{t("payments") || "Payments & Billing"}</Typo>
        <View style={{ width: scale(40) }} /> 
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* HERO HEADER */}
        <View style={styles.heroSection}>
          <View style={[styles.walletBadge, { backgroundColor: themeColors.neutral100 }]}>
            <Icons.CreditCard size={scale(44)} color={themeColors.primary} weight="duotone" />
          </View>
          <Typo size={22} fontWeight="800" style={styles.heroTitle}>
            {t("billingCenter") || "Billing Support Center"}
          </Typo>
          <Typo size={14} color={themeColors.neutral500} style={styles.heroSubtitle}>
            {t("paymentsSubtitle") || "Manage your workspace premium plans, track invoices, or troubleshoot transaction queries."}
          </Typo>
        </View>

        {/* SECTION: FAQS */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("billingFaqs") || "PAYMENT & BILLING FREQUENTLY ASKED QUESTIONS"}
          </Typo>

          {paymentArticles.map((article, index) => {
            const isExpanded = expandedIndex === index;
            return (
              <View key={index} style={[styles.accordionCard, { backgroundColor: themeColors.neutral100 }]}>
                <TouchableOpacity 
                  style={styles.accordionHeader} 
                  onPress={() => toggleAccordion(index)}
                  activeOpacity={0.7}
                >
                  <Typo size={15} fontWeight="700" style={{ flex: 1, paddingRight: scale(8) }}>
                    {article.title}
                  </Typo>
                  <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
                    <Icons.CaretDown size={scale(18)} color={themeColors.neutral500} weight="bold" />
                  </View>
                </TouchableOpacity>
                
                {isExpanded && (
                  <View style={styles.accordionBody}>
                    <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />
                    <Typo size={13} color={themeColors.neutral500} style={styles.articleText}>
                      {article.content}
                    </Typo>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* SECTION: ACTION LINK SHORTCUTS */}
        <View style={styles.section}>
          <Typo size={13} color={themeColors.neutral400} fontWeight="600" style={styles.sectionLabel}>
            {t("billingActions") || "QUICK BILLING ACTIONS"}
          </Typo>

          <View style={[styles.actionWrapper, { backgroundColor: themeColors.neutral100 }]}>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")}
            >
              <Icons.Sparkle size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("viewPlans") || "View Premium Plans"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: themeColors.neutral200 }]} />

            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => router.push("/(main)/home")}
            >
              <Icons.Receipt size={scale(20)} color={themeColors.neutral600} style={{ marginRight: scale(12) }} />
              <Typo size={14} fontWeight="600" style={{ flex: 1 }}>{t("transactionHistory") || "Transaction Invoice History"}</Typo>
              <Icons.ArrowRight size={scale(16)} color={themeColors.neutral400} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentsBilling;

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  },
  scrollContent: { 
    paddingHorizontal: spacingX._20, 
    paddingBottom: verticalScale(40) 
  },
  heroSection: {
    marginTop: spacingY._10,
    marginBottom: spacingY._30,
    alignItems: 'center',
  },
  walletBadge: {
    width: scale(80),
    height: scale(80),
    borderRadius: radius._20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingY._15,
  },
  heroTitle: {
    marginBottom: spacingY._7,
    textAlign: 'center',
  },
  heroSubtitle: {
    textAlign: 'center',
    lineHeight: scale(20),
    paddingHorizontal: spacingX._10,
  },
  section: { 
    marginBottom: spacingY._25 
  },
  sectionLabel: { 
    marginBottom: spacingY._12, 
    marginLeft: spacingX._5, 
    letterSpacing: 0.8 
  },
  accordionCard: {
    borderRadius: radius._15,
    marginBottom: spacingY._12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
  },
  accordionBody: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
  },
  divider: {
    height: 1,
    width: '100%',
  },
  articleText: {
    marginTop: scale(12),
    lineHeight: scale(18),
  },
  actionWrapper: {
    borderRadius: radius._15,
    paddingHorizontal: scale(16),
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingY._15,
  }
});