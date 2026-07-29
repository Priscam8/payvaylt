import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { payVayltApi, VendorIntegrationSummary } from '@/lib/payvaylt-api';

export default function StoresScreen() {
  const router = useRouter();
  const { session, supportFeed, voucherSummaries } = useAuth();
  const { vendors, merchantFlow, merchantDashboard } = payvayltData;
  const merchantSession = session?.role === 'merchant';
  const [liveVendors, setLiveVendors] = useState<VendorIntegrationSummary[]>(vendors);

  useEffect(() => {
    let active = true;

    payVayltApi
      .bootstrap()
      .then((payload) => {
        if (!active || payload.vendors.length === 0) {
          return;
        }

        setLiveVendors(payload.vendors);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const vendorList = liveVendors.length > 0 ? liveVendors : vendors;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow={merchantSession ? 'Merchant workspace' : 'Store network'}
        title={
          merchantSession
            ? merchantDashboard.headline
            : 'Partner stores stay close to the customer journey from checkout to release.'
        }
        description={
          merchantSession
            ? merchantDashboard.summary
            : 'PayVaylt connects shoppers and partner merchants through checkout redirects, reserved carts, and transparent lay-by tracking.'
        }
      >
        {merchantSession ? (
          <View style={styles.heroStats}>
            {merchantDashboard.metrics.map((item) => (
              <View key={item.label} style={styles.heroStatCard}>
                <ThemedText type="chipLabel">{item.label}</ThemedText>
                <ThemedText type="chipValue">{item.value}</ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </BrandHeroCard>

      {merchantSession ? (
        <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.sessionCard}>
          <ThemedText type="cardLabel">Merchant session</ThemedText>
          <ThemedText type="cardTitle">{session?.displayName}</ThemedText>
          <ThemedText style={styles.supportText}>{session?.identifier}</ThemedText>
        </ThemedView>
      ) : null}

      <View style={styles.sectionHeader}>
        <ThemedText type="sectionTitle">Partner vendors</ThemedText>
        <ThemedText style={styles.sectionHint}>Pilot-ready merchants</ThemedText>
      </View>
      <View style={styles.vendorGrid}>
        {vendorList.map((vendor, index) => (
          <ThemedView
            key={vendor.name}
            lightColor={index === 0 ? '#f8fbfe' : '#ffffff'}
            darkColor={index === 0 ? '#16315a' : '#10213a'}
            style={styles.vendorCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorCopy}>
                <ThemedText type="cardTitle">{vendor.name}</ThemedText>
                <ThemedText style={styles.supportText}>{vendor.category}</ThemedText>
              </View>
              <StatusChip
                label={vendor.status}
                tone={vendor.status.toLowerCase().includes('connected') ? 'success' : index === 0 ? 'info' : 'warning'}
              />
            </View>
            <ThemedText style={styles.supportText}>Integration: {vendor.integration}</ThemedText>
          </ThemedView>
        ))}
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">Merchant workflow</ThemedText>
          <ThemedText style={styles.sectionHint}>Checkout to release</ThemedText>
        </View>
        {merchantFlow.map((item) => (
          <InfoRow key={item.title} icon={item.icon} title={item.title} detail={item.detail} tone="info" />
        ))}
        <AppButton label="Open merchant-to-release demo" onPress={() => router.push('/checkout-flow')} variant="ghost" />
      </ThemedView>

      <ThemedView
        lightColor={merchantSession ? '#f8fbf5' : '#fffaf0'}
        darkColor={merchantSession ? '#15321d' : '#4b3b11'}
        style={styles.panel}>
        <View style={styles.sectionHeader}>
          <ThemedText type="sectionTitle">
            {merchantSession ? 'Release queue' : 'Voucher wallet'}
          </ThemedText>
          <ThemedText style={styles.sectionHint}>
            {merchantSession ? 'Customer notices' : 'No-expiry support'}
          </ThemedText>
        </View>
        {merchantSession
          ? supportFeed.length > 0
            ? merchantDashboard.queue.map((item, index) => (
                <InfoRow
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  detail={item.detail}
                  tone={index === 1 ? 'warning' : 'success'}
                />
              ))
            : (
                <EmptyStateCard
                  icon="assignment-turned-in"
                  title={merchantDashboard.emptyState.title}
                  description={merchantDashboard.emptyState.description}
                  lightColor="#ffffff"
                  darkColor="#10213a"
                />
              )
          : voucherSummaries.map((voucher) => (
              <View key={voucher.merchant} style={styles.voucherCard}>
                <View style={styles.vendorCopy}>
                  <ThemedText type="cardTitle">{voucher.merchant}</ThemedText>
                  <ThemedText style={styles.supportText}>{voucher.useCase}</ThemedText>
                </View>
                <View style={styles.voucherValue}>
                  <ThemedText type="cardAmount">{voucher.balance}</ThemedText>
                  <ThemedText style={styles.supportText}>{voucher.expiry}</ThemedText>
                </View>
              </View>
            ))}
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    gap: 2,
  },
  sessionCard: {
    borderRadius: 24,
    padding: 18,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
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
  vendorGrid: {
    gap: 12,
  },
  vendorCard: {
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
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  vendorCopy: {
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
  voucherCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  voucherValue: {
    alignItems: 'flex-end',
    gap: 4,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
