import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';

export default function OverviewScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Investor dashboard"
        title="A merchant-friendly POS that starts in WhatsApp and ends in the bank app."
        description="The strongest MVP is a vendor-assisted dynamic QR flow, with quick amount mode for services and self-scan saved for a later release.">
        <View style={styles.heroStats}>
          {scanToPayData.investorStats.map((item) => (
            <HeroStatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
      </BrandHeroCard>

      <View style={styles.actionRow}>
        <AppButton label="Run live checkout demo" onPress={() => router.push('/checkout-flow')} />
        <AppButton label="Open investor brief" onPress={() => router.push('/modal')} variant="ghost" />
      </View>

      <View style={styles.statsGrid}>
        {scanToPayData.pilotTargets.map((item) => (
          <ThemedView
            key={item.label}
            lightColor="#ffffff"
            darkColor="#10213a"
            style={styles.statCard}>
            <ThemedText type="cardLabel">{item.label}</ThemedText>
            <ThemedText type="cardAmount">{item.value}</ThemedText>
            <ThemedText style={styles.supportText}>{item.detail}</ThemedText>
          </ThemedView>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Core journey</ThemedText>
        <ThemedText style={styles.sectionHint}>How the product works best</ThemedText>
      </View>
      <View style={styles.quickActionGrid}>
        {scanToPayData.coreJourney.map((item, index) => (
          <ThemedView
            key={item.title}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.quickActionCard}>
            <InfoRow
              icon={item.icon}
              title={item.title}
              detail={item.detail}
              tone={index === 3 ? 'success' : index === 1 ? 'warning' : 'info'}
            />
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.featuredCard}>
        <View style={styles.featuredHeader}>
          <View style={styles.featuredCopy}>
            <ThemedText type="cardLabel">Primary operating mode</ThemedText>
            <ThemedText type="cardTitle">Vendor-assisted dynamic QR checkout</ThemedText>
            <ThemedText style={styles.supportText}>
              The merchant creates the order, the customer scans once, and the bank authenticates the payment.
            </ThemedText>
          </View>
          <StatusChip label="Build first" tone="success" />
        </View>

        <View style={styles.metricRow}>
          <MetricCard label="Customer scans" value="1 time" />
          <MetricCard label="WhatsApp role" value="Review + receipt" />
          <MetricCard label="Bank role" value="Auth + confirm" />
        </View>
      </ThemedView>

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Priority sectors</ThemedText>
        <ThemedText style={styles.sectionHint}>Where the MVP fits quickly</ThemedText>
      </View>
      <View style={styles.sectorGrid}>
        {scanToPayData.sectors.map((sector, index) => (
          <ThemedView
            key={sector}
            lightColor={index % 2 === 0 ? '#ffffff' : '#f8fbfe'}
            darkColor={index % 2 === 0 ? '#10213a' : '#16315a'}
            style={styles.sectorCard}>
            <ThemedText type="cardTitle">{sector}</ThemedText>
            <ThemedText style={styles.supportText}>
              Strong fit for low-ticket, fast-moving, or variable-price transactions.
            </ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.supportPanel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Investor talking points</ThemedText>
          <ThemedText style={styles.sectionHint}>Keep the promise narrow and credible</ThemedText>
        </View>
        {scanToPayData.readiness.map((item) => (
          <InfoRow
            key={item.title}
            icon="verified-user"
            title={item.title}
            detail={item.detail}
            tone="success"
          />
        ))}
      </ThemedView>
    </ScrollView>
  );
}

function HeroStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCard}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    minWidth: 150,
    padding: 18,
    borderRadius: 22,
    gap: 8,
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
    alignItems: 'center',
    gap: 12,
  },
  sectionHint: {
    opacity: 0.66,
    fontSize: 13,
    lineHeight: 18,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    minWidth: 150,
    padding: 18,
    borderRadius: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featuredCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  featuredCopy: {
    flex: 1,
    gap: 4,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: 112,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#edf4fb',
    gap: 3,
  },
  sectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sectorCard: {
    width: '48%',
    minWidth: 150,
    padding: 18,
    borderRadius: 22,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  supportPanel: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.16)',
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
});
