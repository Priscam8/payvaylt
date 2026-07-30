import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

export default function PaymentCancelledScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    payvaylt_session_id?: string | string[];
    cancelled?: string | string[];
  }>();
  const borderColor = useThemeColor({}, 'border');
  const subtleBackground = useThemeColor({ light: '#fff6ef', dark: '#3a2617' }, 'surfaceMuted');

  const payVayltSessionId = firstParam(params.payvaylt_session_id);
  const cancelled = firstParam(params.cancelled) === '1';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        align="center"
        compact
        eyebrow="Stripe return"
        title="Payment was not completed"
        description="The customer returned from hosted checkout without a final payment confirmation, so the reserved PayVaylt journey is still open.">
        <ThemedText type="defaultSemiBold">{cancelled ? 'Checkout cancelled by customer' : 'Hosted checkout returned early'}</ThemedText>
      </BrandHeroCard>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.card}>
        <View style={[styles.noticeCard, { backgroundColor: subtleBackground, borderColor }]}>
          <ThemedText type="defaultSemiBold">What PayVaylt should do next</ThemedText>
          <ThemedText style={styles.noticeCopy}>
            Keep the vendor reservation and the customer journey intact, then let the customer restart payment when
            they are ready.
          </ThemedText>
        </View>

        <View style={styles.detailList}>
          <DetailRow label="PayVaylt session" value={payVayltSessionId || 'Unavailable'} borderColor={borderColor} />
          <DetailRow label="Journey status" value="Awaiting payment retry" borderColor={borderColor} />
        </View>

        <View style={styles.actions}>
          <AppButton label="Return to checkout flow" onPress={() => router.push('/checkout-flow')} />
          <AppButton label="Open dashboard" onPress={() => router.push('/(tabs)')} variant="secondary" />
        </View>
      </ThemedView>
    </ScrollView>
  );
}

function DetailRow({
  label,
  value,
  borderColor,
}: {
  label: string;
  value: string;
  borderColor: string;
}) {
  return (
    <View style={[styles.detailRow, { borderColor }]}>
      <ThemedText type="cardLabel">{label}</ThemedText>
      <ThemedText type="defaultSemiBold">{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 18,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  detailList: {
    gap: 10,
  },
  detailRow: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  noticeCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 8,
  },
  noticeCopy: {
    lineHeight: 21,
  },
  actions: {
    gap: 12,
  },
});
