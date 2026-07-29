import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { EmptyStateCard } from '@/components/empty-state-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function DashboardScreen() {
  const router = useRouter();
  const { session, verificationChecks, dashboardStats, planSummaries, supportFeed } = useAuth();
  const { brand, quickActions, howItWorks } = payvayltData;
  const leadPlan = planSummaries[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow={session ? 'PayVaylt dashboard' : brand.tagline}
        title={
          session
            ? session.role === 'merchant'
              ? 'A cleaner workspace for merchant releases and reserved carts.'
              : 'Build value with a banking-style dashboard for every lay-by goal.'
            : brand.headline
        }
        description={
          session
            ? session.role === 'merchant'
              ? 'Track cart reservations, replacement notices, and release-ready orders in one place.'
              : verificationChecks.homeAffairsMatched
                ? 'Your verification is complete, so the full customer dashboard is now open and ready.'
                : 'Your lay-by dashboard is available, with verification progress and next actions clearly surfaced.'
            : brand.summary
        }>
        <View style={styles.heroStats}>
          {dashboardStats.slice(0, 3).map((item) => (
            <HeroStatCard key={item.label} label={item.label} value={item.value} />
          ))}
        </View>
      </BrandHeroCard>

      <View style={styles.actionRow}>
        <AppButton label="Run checkout demo" onPress={() => router.push('/checkout-flow')} />
        <AppButton
          label={session ? 'Open account controls' : 'Open access screen'}
          onPress={() => router.push(session ? (session.role === 'merchant' ? '/(tabs)/pay' : '/(tabs)/activity') : '/')}
          variant="ghost"
        />
      </View>

      <View style={styles.statsGrid}>
        {dashboardStats.map((item) => (
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
        <ThemedText type="sectionTitle">Quick actions</ThemedText>
        <ThemedText style={styles.sectionHint}>Built for customers and merchants</ThemedText>
      </View>
      <View style={styles.quickActionGrid}>
        {quickActions.map((action, index) => (
          <ThemedView
            key={action.title}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.quickActionCard}>
            <InfoRow
              icon={action.icon}
              title={action.title}
              detail={action.description}
              tone={index === 0 ? 'info' : 'neutral'}
            />
          </ThemedView>
        ))}
      </View>

      {leadPlan ? (
        <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.featuredPlanCard}>
          <View style={styles.featuredPlanHeader}>
            <View style={styles.featuredPlanCopy}>
              <ThemedText type="cardLabel">Featured plan</ThemedText>
              <ThemedText type="cardTitle">{leadPlan.item}</ThemedText>
              <ThemedText style={styles.supportText}>
                {leadPlan.merchant} · {leadPlan.chosenTerm} · {leadPlan.cadence}
              </ThemedText>
            </View>
            <StatusChip
              label={leadPlan.status}
              tone={leadPlan.status === 'Payment due' ? 'warning' : leadPlan.status === 'Merchant review' ? 'info' : 'success'}
            />
          </View>

          <View style={styles.planMetricRow}>
            <PlanMetric label="Deposit paid" value={leadPlan.depositPaid} />
            <PlanMetric label="Remaining" value={leadPlan.remaining} />
            <PlanMetric label="Next payment" value={leadPlan.nextPayment} />
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${leadPlan.progress}%` }]} />
          </View>
        </ThemedView>
      ) : (
        <EmptyStateCard
          icon="inventory-2"
          title="No featured plan yet"
          description="As soon as a customer secures a cart and chooses a payment pace, the lead plan will appear here."
        />
      )}

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">How PayVaylt works</ThemedText>
        <ThemedText style={styles.sectionHint}>LayUp clarity, banking polish</ThemedText>
      </View>
      <View style={styles.journeyGrid}>
        {howItWorks.map((item, index) => (
          <ThemedView
            key={item.step}
            lightColor={index === 1 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 1 ? '#16315a' : '#10213a'}
            style={styles.journeyCard}>
            <InfoRow
              icon={item.icon}
              title={item.step}
              detail={item.detail}
              tone={index === 1 ? 'info' : 'neutral'}
            />
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.supportPanel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Support feed</ThemedText>
          <ThemedText style={styles.sectionHint}>Live workspace notices</ThemedText>
        </View>
        {supportFeed.length > 0 ? (
          supportFeed.map((item) => (
            <InfoRow
              key={`${item.title}-${item.description}`}
              icon={item.icon}
              title={item.title}
              detail={item.description}
              tone="success"
            />
          ))
        ) : (
          <EmptyStateCard
            icon="notifications-none"
            title="No new support notices"
            description="When verification reminders or merchant messages arrive, they will show up here."
            lightColor="#ffffff"
            darkColor="#10213a"
          />
        )}
      </ThemedView>
    </ScrollView>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  const backgroundColor = useThemeColor({ light: '#edf4fb', dark: '#183255' }, 'surfaceMuted');

  return (
    <View style={[styles.planMetricCard, { backgroundColor }]}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
  );
}

function HeroStatCard({ label, value }: { label: string; value: string }) {
  const backgroundColor = useThemeColor({ light: 'rgba(255,255,255,0.82)', dark: '#183255' }, 'surfaceMuted');

  return (
    <View style={[styles.heroStatCard, { backgroundColor }]}>
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
  featuredPlanCard: {
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  featuredPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  featuredPlanCopy: {
    flex: 1,
    gap: 4,
  },
  planMetricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planMetricCard: {
    flex: 1,
    minWidth: 96,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  journeyGrid: {
    gap: 12,
  },
  journeyCard: {
    borderRadius: 24,
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
    opacity: 0.74,
  },
});
