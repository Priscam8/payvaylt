import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';

export default function ReadinessScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Platform boundaries"
        title="WhatsApp is the experience layer, not the settlement layer."
        description="This screen is the investor answer to two key questions: why you still need a separate platform, and what has to be true before a real launch.">
        <View style={styles.heroStats}>
          <HeroStat label="WhatsApp" value="Commerce UI" />
          <HeroStat label="Platform" value="Order engine" />
          <HeroStat label="Bank" value="Payment proof" />
        </View>
      </BrandHeroCard>

      <View style={styles.boundaryGrid}>
        <PlatformCard
          title="WhatsApp handles"
          items={scanToPayData.platformBoundaries.whatsapp}
          tone="info"
        />
        <PlatformCard
          title="The platform handles"
          items={scanToPayData.platformBoundaries.platform}
          tone="neutral"
        />
        <PlatformCard
          title="The bank handles"
          items={scanToPayData.platformBoundaries.bank}
          tone="success"
        />
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Architecture stack</ThemedText>
          <StatusChip label="Modular by design" tone="info" />
        </View>
        {scanToPayData.architecture.map((item, index) => (
          <InfoRow
            key={item.title}
            icon={item.icon}
            title={item.title}
            detail={item.detail}
            tone={index === 4 ? 'success' : index === 1 ? 'warning' : 'info'}
          />
        ))}
      </ThemedView>

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Phase gates</ThemedText>
          <ThemedText style={styles.sectionHint}>A hybrid build approach works best</ThemedText>
        </View>
        {scanToPayData.phaseGates.map((item) => (
          <View key={item.phase} style={styles.phaseRow}>
            <ThemedText type="cardTitle">{item.phase}</ThemedText>
            <ThemedText style={styles.supportText}>{item.focus}</ThemedText>
            <ThemedText type="chipLabel">Outputs</ThemedText>
            <ThemedText style={styles.supportText}>{item.outputs}</ThemedText>
          </View>
        ))}
      </ThemedView>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Launch-readiness rules</ThemedText>
          <ThemedText style={styles.sectionHint}>Keep the risk model simple</ThemedText>
        </View>
        {scanToPayData.readiness.map((item) => (
          <View key={item.title} style={styles.phaseRow}>
            <ThemedText type="cardTitle">{item.title}</ThemedText>
            <ThemedText style={styles.supportText}>{item.detail}</ThemedText>
          </View>
        ))}
        <AppButton label="Open investor brief" onPress={() => router.push('/modal')} variant="ghost" />
      </ThemedView>
    </ScrollView>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCard}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
  );
}

function PlatformCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'neutral' | 'success' | 'info';
}) {
  return (
    <ThemedView
      lightColor={tone === 'success' ? '#f8fbf5' : tone === 'info' ? '#f8fbfe' : '#ffffff'}
      darkColor={tone === 'success' ? '#15321d' : tone === 'info' ? '#16315a' : '#10213a'}
      style={styles.platformCard}>
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
    minWidth: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    gap: 2,
  },
  boundaryGrid: {
    gap: 12,
  },
  platformCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  panel: {
    borderRadius: 24,
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
    gap: 12,
    alignItems: 'center',
  },
  sectionHint: {
    opacity: 0.66,
    fontSize: 13,
    lineHeight: 18,
  },
  phaseRow: {
    gap: 4,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
  bullet: {
    lineHeight: 22,
  },
});
