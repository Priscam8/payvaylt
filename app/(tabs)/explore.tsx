import { ScrollView, StyleSheet, View } from 'react-native';

import { BrandHeroCard } from '@/components/brand-hero-card';
import { useAuth } from '@/components/auth-provider';
import { EmptyStateCard } from '@/components/empty-state-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';

export default function PlansScreen() {
  const { planSummaries } = useAuth();
  const { planBuilder, paymentOptions, exceptions } = payvayltData;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Plan builder"
        title="Lay-by plans that feel more like money control than pressure."
        description="The customer decides the deposit, the cadence, and the finish date. PayVaylt keeps the plan clean, visible, and easy to stay on top of.">
        <View style={styles.heroStats}>
          {planBuilder.customerChoice.slice(0, 3).map((item) => (
            <View key={item.label} style={styles.heroStatCard}>
              <ThemedText type="chipLabel">{item.label}</ThemedText>
              <ThemedText type="chipValue">{item.value}</ThemedText>
            </View>
          ))}
        </View>
      </BrandHeroCard>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.planBuilderCard}>
        <ThemedText type="cardLabel">{planBuilder.cart}</ThemedText>
        <ThemedText type="cardTitle">{planBuilder.itemSummary}</ThemedText>
        <ThemedText style={styles.supportText}>
          The current PayVaylt flow lets the customer shape a plan before checkout pressure turns
          into credit pressure.
        </ThemedText>
      </ThemedView>

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Active plans</ThemedText>
        <ThemedText style={styles.sectionHint}>Customer-selected terms</ThemedText>
      </View>
      {planSummaries.length > 0 ? (
        planSummaries.map((plan) => (
          <ThemedView
            key={plan.id}
            lightColor="#ffffff"
            darkColor="#10213a"
            style={styles.planCard}>
            <View style={styles.topRow}>
              <View style={styles.titleColumn}>
                <ThemedText type="cardTitle">{plan.item}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {plan.merchant} · {plan.cadence}
                </ThemedText>
              </View>
              <StatusChip
                label={plan.status}
                tone={plan.status === 'Payment due' ? 'warning' : plan.status === 'Merchant review' ? 'info' : 'success'}
              />
            </View>

            <View style={styles.metricsRow}>
              <Metric label="Deposit" value={plan.depositPaid} />
              <Metric label="Remaining" value={plan.remaining} />
              <Metric label="Term" value={plan.chosenTerm} />
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${plan.progress}%` }]} />
            </View>

            <View style={styles.bottomRow}>
              <ThemedText style={styles.supportText}>Next payment {plan.nextPayment}</ThemedText>
              <ThemedText style={styles.supportText}>Method {plan.payoutMethod}</ThemedText>
            </View>
          </ThemedView>
        ))
      ) : (
        <EmptyStateCard
          icon="lock-clock"
          title="No active lay-bys yet"
          description="When a customer secures a cart and chooses a payment pace, their plans will appear here."
        />
      )}

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Ways to pay</ThemedText>
        <ThemedText style={styles.sectionHint}>Flexible and voucher-ready</ThemedText>
      </View>
      <View style={styles.ruleGrid}>
        {paymentOptions.map((item, index) => (
          <ThemedView
            key={item.title}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.ruleCard}>
            <InfoRow
              icon={item.icon}
              title={item.title}
              detail={item.description}
              tone={index === 0 ? 'info' : 'neutral'}
            />
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.exceptionPanel}>
        <ThemedText type="sectionTitle">Exception handling</ThemedText>
        {exceptions.map((item) => (
          <InfoRow key={item.title} icon={item.icon} title={item.title} detail={item.description} tone="success" />
        ))}
      </ThemedView>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
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
  planBuilderCard: {
    borderRadius: 24,
    padding: 20,
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
  planCard: {
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
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metric: {
    flex: 1,
    minWidth: 96,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#f7fafc',
    gap: 3,
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#eff3f7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#69c63d',
  },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
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
  exceptionPanel: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.16)',
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
