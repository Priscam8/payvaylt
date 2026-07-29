import { type Href, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { EmptyStateCard } from '@/components/empty-state-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

const accessRoute = '/' as Href;
const ficaUploadRoute = '/fica-upload' as Href;
const dashboardRoute = '/(tabs)' as Href;

export default function OtpVerifyScreen() {
  const router = useRouter();
  const { pendingOtp, verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  async function submitCode() {
    const result = await verifyOtp(code);

    if (result === 'invalid') {
      setError('Enter the OTP shown for this local demo session.');
      return;
    }

    setError('');

    if (result === 'dashboard') {
      router.replace(dashboardRoute);
      return;
    }

    router.replace(ficaUploadRoute);
  }

  if (!pendingOtp) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BrandHeroCard
          eyebrow="OTP verification"
          title="Start from the welcome screen to request a fresh code."
          description="There is no pending sign-in or account creation request right now, so the prototype does not have an OTP destination to verify."
        />

        <EmptyStateCard
          icon="phonelink-lock"
          title="No active OTP challenge"
          description="Begin from PayVaylt access to trigger a new secure sign-in or account-creation code."
        />

        <AppButton label="Return to PayVaylt access" onPress={() => router.replace(accessRoute)} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="OTP verification"
        title="Confirm your PayVaylt access code."
        description={
          pendingOtp.flow === 'create-account'
            ? 'One final code check keeps new customer onboarding moving into FICA and identity verification.'
            : 'Returning customers confirm a short code before their dashboard and active lay-bys are unlocked.'
        }
      />

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.statusCard}>
        <ThemedText type="cardLabel">Pending delivery</ThemedText>
        <ThemedText type="cardTitle">{pendingOtp.destination}</ThemedText>
        <ThemedText style={styles.supportText}>
          {pendingOtp.devCode
            ? `Local demo OTP: ${pendingOtp.devCode}. In production this would be sent by SMS or email.`
            : 'Enter the OTP sent to this destination to continue.'}
        </ThemedText>
      </ThemedView>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.panel}>
        <View style={styles.fieldGroup}>
          <ThemedText type="cardLabel">One-time PIN</ThemedText>
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter 6 digits"
            placeholderTextColor={`${textColor}88`}
            style={[
              styles.input,
              {
                backgroundColor: inputBackground,
                borderColor,
                color: textColor,
              },
            ]}
          />
        </View>

        {error ? (
          <ThemedView lightColor="#fff1f0" darkColor="#3a1b23" style={styles.errorCard}>
            <ThemedText type="defaultSemiBold">{error}</ThemedText>
          </ThemedView>
        ) : null}

        <AppButton label="Verify code and continue" onPress={submitCode} />
        <AppButton label="Back to access options" onPress={() => router.replace(accessRoute)} variant="ghost" />
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
    paddingTop: 28,
    paddingBottom: 120,
    gap: 18,
  },
  statusCard: {
    borderRadius: 28,
    padding: 20,
    gap: 10,
  },
  panel: {
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
  errorCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.76,
  },
});
