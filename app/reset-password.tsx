import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const {
    authMessage,
    clearAuthMessage,
    passwordResetSent,
    passwordResetTarget,
    completePasswordReset,
  } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  async function submitReset() {
    if (password.trim().length < 8) {
      setError('Choose a password with at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('The password confirmation does not match yet.');
      return;
    }

    if (await completePasswordReset(password)) {
      setSaved(true);
      setError('');
    } else if (authMessage) {
      setError(authMessage);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Reset password"
        title="Recover customer access without leaving the app."
        description="The production version will send an OTP or secure reset link. In the current prototype, this screen lets you complete the reset directly so the journey stays reviewable."
      />

      <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.statusCard}>
        <ThemedText type="cardLabel">Reset destination</ThemedText>
        <ThemedText type="cardTitle">{passwordResetTarget || 'No destination captured yet'}</ThemedText>
        <ThemedText style={styles.supportText}>
          {passwordResetSent
            ? 'A reset request has been prepared for this customer identity.'
            : 'There is no active reset request yet. Return to the access screen to start one.'}
        </ThemedText>
      </ThemedView>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.panel}>
        {saved ? (
          <>
            <ThemedView lightColor="#f8fbf5" darkColor="#15311b" style={styles.successCard}>
              <ThemedText type="cardTitle">Password updated</ThemedText>
              <ThemedText style={styles.supportText}>
                Your new credentials are saved in the prototype state. You can now return to sign
                in and continue with the customer flow.
              </ThemedText>
            </ThemedView>

            <AppButton label="Return to sign in" onPress={() => router.replace('/')} />
          </>
        ) : (
          <>
            {authMessage ? (
              <ThemedView lightColor="#fff1f0" darkColor="#3a1b23" style={styles.errorCard}>
                <ThemedText type="defaultSemiBold">{authMessage}</ThemedText>
              </ThemedView>
            ) : null}

            <View style={styles.fieldGroup}>
              <ThemedText type="cardLabel">New password</ThemedText>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Enter a new password"
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

            <View style={styles.fieldGroup}>
              <ThemedText type="cardLabel">Confirm password</ThemedText>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                placeholder="Re-enter the password"
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

            <AppButton label="Save new password" onPress={submitReset} disabled={!passwordResetSent} />
          </>
        )}

        <AppButton label="Back to PayVaylt access" onPress={() => router.replace('/')} variant="ghost" />
        {authMessage ? (
          <AppButton label="Dismiss message" onPress={clearAuthMessage} variant="ghost" />
        ) : null}
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
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  successCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
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
