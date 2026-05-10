import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, List, Divider, Icon, Card } from 'react-native-paper';
import { useAppTheme } from '../context/ThemeContext';
import { useStore } from '../store/useStore';
import { haptics } from '../utils/haptics';

const PRO_FEATURES = [
  { icon: 'chart-bar', title: 'Spending Analytics', desc: 'Bar charts, pie charts, trends' },
  { icon: 'file-export-outline', title: 'Data Export', desc: 'Export all data to CSV' },
  { icon: 'camera-outline', title: 'Receipt OCR', desc: 'Scan receipts to auto-fill amounts' },
  { icon: 'currency-usd', title: 'Live Currency Conversion', desc: 'Real-time rates for any currency' },
  { icon: 'format-list-checks', title: 'Split Templates', desc: 'Save default splits per group' },
  { icon: 'infinity', title: 'Unlimited Expenses', desc: 'No daily caps on expense logging' },
];

export default function UpgradeScreen({ navigation }: any) {
  const { theme } = useAppTheme();
  const isPro = useStore(state => state.isPro);
  const setIsPro = useStore(state => state.setIsPro);

  const handleUpgrade = () => {
    haptics.success();
    // TODO: wire RevenueCat purchase flow here
    setIsPro(true);
    navigation.goBack();
  };

  return (
    <ScrollView
      style={[styles.scrollRoot, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.container}
    >
      <View style={[styles.hero, { backgroundColor: theme.primary }]}>
        <Icon source="crown" size={48} color="#FFD700" />
        <Text variant="headlineMedium" style={styles.heroTitle}>
          FinCoord Pro
        </Text>
        <Text variant="bodyMedium" style={styles.heroSub}>
          Unlock the full financial coordination experience
        </Text>
      </View>

      {isPro ? (
        <View style={styles.activeContainer}>
          <Icon source="check-circle" size={32} color={theme.primary} />
          <Text variant="titleMedium" style={[styles.activeText, { color: theme.primary }]}>
            You're already on Pro!
          </Text>
        </View>
      ) : null}

      <Text variant="labelSmall" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
        WHAT'S INCLUDED
      </Text>

      <Card mode="outlined" style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {PRO_FEATURES.map((feature, idx) => (
          <React.Fragment key={feature.title}>
            <List.Item
              title={feature.title}
              description={feature.desc}
              left={props => <List.Icon {...props} icon={feature.icon} color={theme.primary} />}
              right={() => <Icon source="check" size={20} color={theme.primary} />}
              titleStyle={{ color: theme.text, fontWeight: '600' }}
              descriptionStyle={{ color: theme.textSecondary }}
            />
            {idx < PRO_FEATURES.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>

      {!isPro && (
        <>
          <View style={[styles.pricingCard, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}>
            <Text variant="displaySmall" style={[styles.price, { color: theme.primary }]}>
              $4.99
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.textSecondary }}>
              per month · cancel anytime
            </Text>
          </View>

          <Button
            mode="contained"
            icon="crown"
            onPress={handleUpgrade}
            style={[styles.upgradeBtn, { backgroundColor: theme.primary }]}
            contentStyle={styles.upgradeBtnContent}
            labelStyle={{ fontSize: 16 }}
          >
            Upgrade to Pro
          </Button>

          <Text variant="bodySmall" style={[styles.disclaimer, { color: theme.textSecondary }]}>
            Payment will be handled through the App Store / Google Play.
            {'\n'}Development mode: tap above to activate Pro immediately.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  container: { paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  heroTitle: { color: '#FFF', fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  activeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20 },
  activeText: { fontWeight: '600' },
  sectionLabel: { marginHorizontal: 16, marginTop: 24, marginBottom: 8, letterSpacing: 1 },
  card: { marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  pricingCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 4,
  },
  price: { fontWeight: '700' },
  upgradeBtn: { margin: 16, borderRadius: 12 },
  upgradeBtnContent: { paddingVertical: 8 },
  disclaimer: { textAlign: 'center', fontSize: 12, paddingHorizontal: 24, paddingBottom: 32 },
});
