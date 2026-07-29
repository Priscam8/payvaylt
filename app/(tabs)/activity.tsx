import { type Href, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { useAuth } from '@/components/auth-provider';
import { EmptyStateCard } from '@/components/empty-state-card';
import { InfoRow } from '@/components/info-row';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';

const accessRoute = '/' as Href;
const ficaUploadRoute = '/fica-upload' as Href;
const dashboardRoute = '/(tabs)' as Href;
const storesRoute = '/(tabs)/pay' as Href;

export default function AccountScreen() {
  const router = useRouter();
  const { controls, merchantFlow } = payvayltData;
  const {
    session,
    customerProfile,
    merchantProfile,
    verificationChecks,
    ficaDocuments,
    supportFeed,
    completeHomeAffairsCheck,
    signOut,
  } = useAuth();

  const uploadedCount = Object.values(ficaDocuments).filter(Boolean).length;
  const completedCount = [
    verificationChecks.accountCreated,
    verificationChecks.otpVerified,
    verificationChecks.questionsPassed,
    verificationChecks.ficaUploaded,
    verificationChecks.homeAffairsMatched,
  ].filter(Boolean).length;
  const customerName =
    session?.displayName ||
    (verificationChecks.accountCreated ? customerProfile.fullName || 'PayVaylt customer' : 'No active customer session');
  const customerIdentifier =
    session?.identifier ||
    (verificationChecks.accountCreated
      ? customerProfile.email || customerProfile.mobile
      : 'Use the access screen to sign in or create a new customer profile.');

  const verificationItems = [
    {
      title: 'Account registration',
      state: verificationChecks.accountCreated ? 'Complete' : 'Pending',
      detail: 'Email, mobile number, and password captured for customer access.',
    },
    {
      title: 'OTP verification',
      state: verificationChecks.otpVerified ? 'Complete' : 'Pending',
      detail: 'A one-time code confirms sign-in or new-account activation.',
    },
    {
      title: 'Verification questions',
      state: verificationChecks.questionsPassed ? 'Complete' : 'Pending',
      detail: 'Profile questions reduce fraud before full access is unlocked.',
    },
    {
      title: 'FICA documents',
      state: verificationChecks.ficaUploaded ? 'Complete' : uploadedCount > 0 ? 'In progress' : 'Pending',
      detail: `${uploadedCount} of 4 verification items are currently prepared in the prototype.`,
    },
    {
      title: 'Home Affairs match',
      state: verificationChecks.homeAffairsMatched ? 'Complete' : verificationChecks.ficaUploaded ? 'Ready' : 'Pending',
      detail: verificationChecks.homeAffairsMatched
        ? 'Identity and selfie match are marked as successful for full customer access.'
        : 'Identity number and selfie match still need to be confirmed before the full customer flow is complete.',
    },
  ];

  function handleSignOut() {
    signOut();
    router.replace(accessRoute);
  }

  async function handleHomeAffairsMatch() {
    await completeHomeAffairsCheck();
  }

  if (session?.role === 'merchant') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BrandHeroCard
          eyebrow="Merchant account"
          title="A simplified merchant control room for PayVaylt operations."
          description="Reserved carts, merchant notices, and release-ready orders all stay visible without the dashboard feeling crowded."
        />

        <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.statusCard}>
          <ThemedText type="cardLabel">Merchant profile</ThemedText>
          <ThemedText type="balance">{merchantProfile.companyName}</ThemedText>
          <ThemedText style={styles.supportText}>{session.identifier}</ThemedText>
        </ThemedView>

        <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
          <ThemedText type="sectionTitle">Merchant workflow</ThemedText>
          {merchantFlow.map((item) => (
            <InfoRow key={item.title} icon={item.icon} title={item.title} detail={item.detail} tone="info" />
          ))}
          <AppButton label="Open stores workspace" onPress={() => router.push(storesRoute)} />
        </ThemedView>

        <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.panel}>
          <ThemedText type="sectionTitle">Controls and support</ThemedText>
          {controls.map((item) => (
            <InfoRow key={item.title} icon={item.icon} title={item.title} detail={item.description} tone="success" />
          ))}
        </ThemedView>

        <AppButton label="Sign out" onPress={handleSignOut} variant="secondary" />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Customer verification"
        title="Verification progress that feels guided, not intimidating."
        description="Customer access moves through sign-in, OTP verification, FICA review, and Home Affairs matching before the full lay-by experience is complete.">
        <View style={styles.heroStats}>
          <HeroStat label="Checks complete" value={`${completedCount}/5`} />
          <HeroStat label="Documents ready" value={`${uploadedCount}/4`} />
          <HeroStat
            label="Access level"
            value={verificationChecks.homeAffairsMatched ? 'Full' : 'Limited'}
          />
        </View>
      </BrandHeroCard>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.statusCard}>
        <ThemedText type="cardLabel">Customer profile</ThemedText>
        <ThemedText type="balance">{customerName}</ThemedText>
        <ThemedText style={styles.supportText}>{customerIdentifier}</ThemedText>
      </ThemedView>

      {verificationItems.map((check) => (
        <ThemedView
          key={check.title}
          lightColor="#ffffff"
          darkColor="#10213a"
          style={styles.checkCard}>
          <View style={styles.checkTopRow}>
            <View style={styles.checkCopy}>
              <ThemedText type="cardTitle">{check.title}</ThemedText>
              <ThemedText style={styles.supportText}>{check.detail}</ThemedText>
            </View>
            <StatusChip
              label={check.state}
              tone={check.state === 'Complete' ? 'success' : check.state === 'Ready' || check.state === 'In progress' ? 'info' : 'neutral'}
            />
          </View>
        </ThemedView>
      ))}

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.panel}>
        <ThemedText type="sectionTitle">Next actions</ThemedText>
        {!verificationChecks.ficaUploaded ? (
          <AppButton label="Continue FICA upload" onPress={() => router.push(ficaUploadRoute)} />
        ) : null}
        {verificationChecks.ficaUploaded && !verificationChecks.homeAffairsMatched ? (
          <AppButton label="Run Home Affairs match" onPress={handleHomeAffairsMatch} />
        ) : null}
        {verificationChecks.homeAffairsMatched ? (
          <AppButton label="Open full dashboard" onPress={() => router.push(dashboardRoute)} />
        ) : null}
        {session ? (
          <AppButton label="Sign out" onPress={handleSignOut} variant="secondary" />
        ) : (
          <AppButton label="Return to access screen" onPress={() => router.replace(accessRoute)} variant="secondary" />
        )}
      </ThemedView>

      <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.panel}>
        <ThemedText type="sectionTitle">Controls and support</ThemedText>
        {controls.map((item) => (
          <InfoRow key={item.title} icon={item.icon} title={item.title} detail={item.description} tone="success" />
        ))}
      </ThemedView>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <ThemedText type="sectionTitle">Inbox and support</ThemedText>
        {supportFeed.length > 0 ? (
          supportFeed.map((item) => (
            <InfoRow key={`${item.title}-${item.description}`} icon={item.icon} title={item.title} detail={item.description} tone="neutral" />
          ))
        ) : (
          <EmptyStateCard
            icon="inbox"
            title="No support items right now"
            description="Verification notices and merchant updates will appear here as soon as they are available."
          />
        )}
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
  statusCard: {
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
  checkCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  checkTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  checkCopy: {
    flex: 1,
    gap: 4,
  },
  panel: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
