import { Link, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        align="center"
        showTagline
        eyebrow="Investor MVP"
        title={scanToPayData.brand.headline}
        description={scanToPayData.brand.summary}>
        <View style={styles.heroStats}>
          {scanToPayData.investorStats.map((item) => (
            <View key={item.label} style={styles.heroStatCard}>
              <ThemedText type="chipLabel">{item.label}</ThemedText>
              <ThemedText type="chipValue">{item.value}</ThemedText>
            </View>
          ))}
        </View>
      </BrandHeroCard>

      <View style={styles.actionRow}>
        <AppButton label="Open live checkout demo" onPress={() => router.push('/checkout-flow')} />
        <AppButton label="Open investor dashboard" onPress={() => router.push('/(tabs)')} variant="secondary" />
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">How the model works best</ThemedText>
          <StatusChip label="Vendor-assisted first" tone="info" />
        </View>
        {scanToPayData.coreJourney.map((item, index) => (
          <InfoRow
            key={item.title}
            icon={item.icon}
            title={item.title}
            detail={item.detail}
            tone={index === 3 ? 'success' : index === 1 ? 'warning' : 'info'}
          />
        ))}
      </ThemedView>

      <View style={styles.modeGrid}>
        {scanToPayData.operatingModes.map((mode, index) => (
          <ThemedView
            key={mode.name}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.modeCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="cardTitle">{mode.name}</ThemedText>
              <StatusChip
                label={mode.status}
                tone={mode.status === 'Phase two' ? 'warning' : 'success'}
              />
            </View>
            <ThemedText style={styles.supportText}>{mode.summary}</ThemedText>
            <ThemedText type="chipLabel">Best for</ThemedText>
            <ThemedText style={styles.supportText}>{mode.bestFor}</ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#fffaf0" darkColor="#4b3b11" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Why it needs a separate platform</ThemedText>
          <StatusChip label="WhatsApp is not the bank" tone="warning" />
        </View>
        <View style={styles.boundaryGrid}>
          <BoundaryCard
            title="WhatsApp handles"
            items={scanToPayData.platformBoundaries.whatsapp}
          />
          <BoundaryCard
            title="Your platform handles"
            items={scanToPayData.platformBoundaries.platform}
          />
        </View>
        <Link href="/modal" style={styles.link}>
          <ThemedText type="link">Read the investor brief</ThemedText>
        </Link>
      </ThemedView>
    </ScrollView>
  );
}

function BoundaryCard({ title, items }: { title: string; items: string[] }) {
  return (
    <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.boundaryCard}>
      <ThemedText type="cardTitle">{title}</ThemedText>
      {items.map((item) => (
        <ThemedText key={item} style={styles.bullet}>
          - {item}
        </ThemedText>
      ))}
    </ThemedView>
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
  actionRow: {
    gap: 12,
  },
  panel: {
    borderRadius: 26,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  modeGrid: {
    gap: 12,
  },
  modeCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  boundaryGrid: {
    gap: 12,
  },
  boundaryCard: {
    borderRadius: 22,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
  bullet: {
    lineHeight: 22,
  },
  link: {
    marginTop: 4,
  },
});
