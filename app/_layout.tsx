import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/components/auth-provider';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationTheme =
    colorScheme === 'dark'
      ? {
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: Colors.dark.background,
            card: Colors.dark.surface,
            text: Colors.dark.text,
            border: Colors.dark.border,
            primary: Colors.dark.tint,
            notification: Colors.dark.accent,
          },
        }
      : {
          ...DefaultTheme,
          colors: {
            ...DefaultTheme.colors,
            background: Colors.light.background,
            card: Colors.light.surface,
            text: Colors.light.text,
            border: Colors.light.border,
            primary: Colors.light.tint,
            notification: Colors.light.accent,
          },
        };

  return (
    <AuthProvider>
      <ThemeProvider value={navigationTheme}>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="otp-verify" options={{ title: 'OTP Verification' }} />
          <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="fica-upload" options={{ title: 'FICA Upload' }} />
          <Stack.Screen name="checkout-flow" options={{ title: 'Checkout Demo' }} />
          <Stack.Screen name="payment-success" options={{ title: 'Payment Success' }} />
          <Stack.Screen name="payment-cancelled" options={{ title: 'Payment Cancelled' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Blueprint' }} />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </AuthProvider>
  );
}
