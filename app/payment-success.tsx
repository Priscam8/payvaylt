import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { payVayltApi, PaymentSessionResponse } from '@/lib/payvaylt-api';

type PaymentResolution = 'checking' | 'paid' | 'pending' | 'error';

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    payvaylt_session_id?: string | string[];
    session_id?: string | string[];
  }>();
  const borderColor = useThemeColor({}, 'border');
  const subtleBackground = useThemeColor({ light: '#f6f9fc', dark: '#16315a' }, 'surfaceMuted');
  const [resolution, setResolution] = useState<PaymentResolution>('checking');
  const [message, setMessage] = useState('Checking the latest PayVaylt payment status now.');
  const [paymentSession, setPaymentSession] = useState<PaymentSessionResponse | null>(null);

  const payVayltSessionId = firstParam(params.payvaylt_session_id);
  const stripeSessionId = firstParam(params.session_id);

  useEffect(() => {
    let active = true;

    async function confirmPayment() {
      if (!payVayltSessionId) {
        if (!active) {
          return;
        }

        setResolution('pending');
        setMessage(
          'Stripe sent the customer back successfully, but PayVaylt did not receive a local payment-session reference in this URL.'
        );
        return;
      }

      try {
        const session = await payVayltApi.confirmPaymentSession(payVayltSessionId);
        if (!active) {
          return;
        }

        setPaymentSession(session);
        if (session.status === 'paid') {
          setResolution('paid');
          setMessage('Payment confirmed. PayVaylt can now continue the release flow.');
          return;
        }

        setResolution('pending');
        setMessage(
          'The payment session exists, but the final paid confirmation is still waiting on the Stripe webhook or a follow-up check.'
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setResolution('error');
        setMessage(error instanceof Error ? error.message : 'PayVaylt could not confirm the payment yet.');
      }
    }

    confirmPayment();

    return () => {
      active = false;
    };
  }, [payVayltSessionId]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        align="center"
        compact
        eyebrow="Stripe return"
        title="Payment returned to PayVaylt"
        description="This screen helps the customer land safely after hosted checkout and confirms whether the payment is fully recorded.">
        {resolution === 'checking' ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator />
            <ThemedText style={styles.loadingText}>Confirming payment status</ThemedText>
          </View>
        ) : null}
      </BrandHeroCard>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.card}>
        <ThemedText type="sectionTitle">
          {resolution === 'paid'
            ? 'Payment confirmed'
            : resolution === 'pending'
              ? 'Payment still syncing'
              : 'Payment needs attention'}
        </ThemedText>
        <ThemedText style={styles.supportText}>{message}</ThemedText>

        <View style={styles.detailList}>
          <DetailRow label="PayVaylt session" value={payVayltSessionId || 'Unavailable'} borderColor={borderColor} />
          <DetailRow label="Stripe session" value={stripeSessionId || 'Unavailable'} borderColor={borderColor} />
          <DetailRow
            label="Current status"
            value={paymentSession?.status || (resolution === 'checking' ? 'checking' : 'unknown')}
            borderColor={borderColor}
          />
        </View>

        {resolution === 'pending' || resolution === 'error' ? (
          <View style={[styles.noticeCard, { backgroundColor: subtleBackground, borderColor }]}>
            <ThemedText type="defaultSemiBold">Recommended next step</ThemedText>
            <ThemedText style={styles.noticeCopy}>
              Re-open the checkout journey and tap the payment action again after a short wait so PayVaylt can re-check
              the final status.
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <AppButton label="Open checkout flow" onPress={() => router.push('/checkout-flow')} />
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
  supportText: {
    lineHeight: 22,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'center',
  },
  loadingText: {
    lineHeight: 20,
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
