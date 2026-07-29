import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';

export default function ModesScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Delivery methods"
        title="Define the service clearly before you overbuild the platform."
        description="These are the operating modes, service definitions, and MVP deliverables that keep the product understandable for merchants, partners, and investors.">
        <View style={styles.heroStats}>
          {scanToPayData.operatingModes.map((item) => (
            <View key={item.name} style={styles.heroStatCard}>
              <ThemedText type="chipLabel">{item.name}</ThemedText>
              <ThemedText type="chipValue">{item.status}</ThemedText>
            </View>
          ))}
        </View>
      </BrandHeroCard>

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Operating modes</ThemedText>
        <ThemedText style={styles.sectionHint}>What to launch and what to defer</ThemedText>
      </View>
      {scanToPayData.operatingModes.map((mode) => (
        <ThemedView
          key={mode.name}
          lightColor="#ffffff"
          darkColor="#10213a"
          style={styles.modeCard}>
          <View style={styles.topRow}>
            <View style={styles.titleColumn}>
              <ThemedText type="cardTitle">{mode.name}</ThemedText>
              <ThemedText style={styles.supportText}>{mode.summary}</ThemedText>
            </View>
            <StatusChip
              label={mode.status}
              tone={mode.status === 'Phase two' ? 'warning' : 'success'}
            />
          </View>

          <ThemedText type="chipLabel">Best for</ThemedText>
          <ThemedText style={styles.supportText}>{mode.bestFor}</ThemedText>
        </ThemedView>
      ))}

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Definition framework</ThemedText>
        <ThemedText style={styles.sectionHint}>Use this in your BRD or pitch deck</ThemedText>
      </View>
      <View style={styles.ruleGrid}>
        {scanToPayData.definitionFramework.map((item, index) => (
          <ThemedView
            key={item.area}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.ruleCard}>
            <ThemedText type="cardTitle">{item.area}</ThemedText>
            <ThemedText style={styles.supportText}>{item.answer}</ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.deliverablePanel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Required MVP deliverables</ThemedText>
          <ThemedText style={styles.sectionHint}>What investors should see</ThemedText>
        </View>
        {scanToPayData.deliverables.map((item) => (
          <View key={item.title} style={styles.deliverableRow}>
            <ThemedText type="cardTitle">{item.title}</ThemedText>
            <ThemedText style={styles.supportText}>{item.detail}</ThemedText>
          </View>
        ))}
        <AppButton label="Open live checkout demo" onPress={() => router.push('/checkout-flow')} variant="ghost" />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 126,
    gap: 18,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroStatCard: {
    minWidth: 116,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionHint: {
    opacity: 0.66,
    fontSize: 13,
    lineHeight: 18,
  },
  modeCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  titleColumn: {
    flex: 1,
    gap: 4,
  },
  ruleGrid: {
    gap: 12,
  },
  ruleCard: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  deliverablePanel: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.16)',
  },
  deliverableRow: {
    gap: 4,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
});
