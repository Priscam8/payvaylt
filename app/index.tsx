import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { type Href, useRouter } from 'expo-router';
import { type ComponentProps, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { InfoRow } from '@/components/info-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';
import { useThemeColor } from '@/hooks/use-theme-color';

type Audience = 'customer' | 'merchant';
type CustomerMode = 'sign-in' | 'create-account' | 'forgot-password';

const otpVerifyRoute = '/otp-verify' as Href;
const resetPasswordRoute = '/reset-password' as Href;
const ficaUploadRoute = '/fica-upload' as Href;

export default function WelcomeScreen() {
  const router = useRouter();
  const { brand, authExperience, ficaDocuments } = payvayltData;
  const {
    isHydrated,
    authMessage,
    session,
    customerProfile,
    merchantProfile,
    beginCustomerSignIn,
    beginCustomerCreateAccount,
    signInMerchant,
    requestPasswordReset,
    clearAuthMessage,
  } = useAuth();

  const [audience, setAudience] = useState<Audience>('customer');
  const [customerMode, setCustomerMode] = useState<CustomerMode>('sign-in');
  const [customerFields, setCustomerFields] = useState(customerProfile);
  const [merchantFields, setMerchantFields] = useState(merchantProfile);

  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const subtleBackground = useThemeColor({ light: '#f6f9fc', dark: '#16315a' }, 'surfaceMuted');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const primarySoft = useThemeColor({}, 'primarySoft');

  useEffect(() => {
    setCustomerFields(customerProfile);
  }, [customerProfile]);

  useEffect(() => {
    setMerchantFields(merchantProfile);
  }, [merchantProfile]);

  const forgotPasswordReady =
    customerFields.email.includes('@') || customerFields.mobile.trim().length >= 10;
  const customerReady =
    customerMode === 'forgot-password'
      ? forgotPasswordReady
      : customerFields.email.includes('@') &&
        customerFields.mobile.trim().length >= 10 &&
        (customerMode !== 'create-account' || customerFields.fullName.trim().length > 2) &&
        customerFields.password.trim().length >= 8;
  const merchantReady =
    merchantFields.companyName.trim().length > 2 &&
    merchantFields.workEmail.includes('@') &&
    merchantFields.password.trim().length >= 8;

  const customerModeCopy = {
    'sign-in': authExperience.customerModes[0],
    'create-account': authExperience.customerModes[1],
    'forgot-password': authExperience.customerModes[2],
  } satisfies Record<CustomerMode, string>;

  function updateCustomerField(field: keyof typeof customerFields, value: string) {
    setCustomerFields((current) => ({ ...current, [field]: value }));
  }

  function updateMerchantField(field: keyof typeof merchantFields, value: string) {
    setMerchantFields((current) => ({ ...current, [field]: value }));
  }

  async function submitCustomer() {
    if (!customerReady) return;

    if (customerMode === 'sign-in') {
      if (await beginCustomerSignIn(customerFields)) {
        router.push(otpVerifyRoute);
      }
      return;
    }

    if (customerMode === 'create-account') {
      if (await beginCustomerCreateAccount(customerFields)) {
        router.push(otpVerifyRoute);
      }
      return;
    }

    if (await requestPasswordReset(customerFields.email || customerFields.mobile)) {
      router.push(resetPasswordRoute);
    }
  }

  async function submitMerchant() {
    if (!merchantReady) return;
    if (await signInMerchant(merchantFields)) {
      router.push('/(tabs)/pay');
    }
  }

  if (!isHydrated) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <BrandHeroCard
          align="center"
          compact
          showTagline
          eyebrow="Local-first setup"
          title="Preparing your PayVaylt workspace."
          description="Restoring local plans, vouchers, verification progress, and partner data on this device."
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        align="center"
        showTagline
        eyebrow="Digital lay-by platform"
        title={brand.headline}
        description={brand.summary}>
        <View style={styles.featureRow}>
          <HeroStatChip label="Flexible terms" value="1-12 months" />
          <HeroStatChip label="Voucher ready" value="No expiry" />
          <HeroStatChip label="Merchant backed" value="Reserved carts" />
        </View>
      </BrandHeroCard>

      {session ? (
        <ThemedView lightColor="#f8fbf5" darkColor="#15311b" style={styles.sessionCard}>
          <ThemedText type="cardLabel">Active session</ThemedText>
          <ThemedText type="cardTitle">
            Signed in as {session.displayName} ({session.role})
          </ThemedText>
          <ThemedText style={styles.supportText}>{session.identifier}</ThemedText>
          <AppButton label="Open current dashboard" onPress={() => router.push('/(tabs)')} variant="secondary" />
        </ThemedView>
      ) : null}

      <View style={styles.capabilityGrid}>
        <AccessPanel
          icon="person"
          title="Customer access"
          detail="Open a lay-by dashboard, review progress, and keep payments moving at your own pace."
          lightColor="#ffffff"
          darkColor="#10203b"
          tone="neutral"
        />
        <AccessPanel
          icon="storefront"
          title="Merchant workspace"
          detail="Track reserved carts, release-ready orders, and replacement notices from one view."
          lightColor="#ffffff"
          darkColor="#10203b"
          tone="neutral"
        />
        <AccessPanel
          icon="fact-check"
          title="Verification flow"
          detail="Move from OTP to FICA and Home Affairs checks in a clear guided journey."
          lightColor="#f8fbfe"
          darkColor="#16315a"
          tone="info"
        />
        <AccessPanel
          icon="redeem"
          title="Voucher support"
          detail="Use store vouchers, keep value available, and convert discontinued items safely."
          lightColor="#f8fbf5"
          darkColor="#15311b"
          tone="success"
        />
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryCopy}>
            <ThemedText type="sectionTitle">Choose how you want to enter</ThemedText>
            <ThemedText style={styles.supportText}>
              A simpler access flow for customers and merchants, inspired by mobile banking clarity
              and LayUp&apos;s lay-by language.
            </ThemedText>
          </View>
          <View
            style={[
              styles.entryPill,
              { backgroundColor: primarySoft, borderColor },
            ]}>
            <ThemedText type="chipLabel">Live preview</ThemedText>
            <ThemedText type="chipValue">Auth + FICA</ThemedText>
          </View>
        </View>

        {authMessage ? (
          <ThemedView lightColor="#fff1f0" darkColor="#3a1b23" style={styles.feedbackCard}>
            <ThemedText type="defaultSemiBold">{authMessage}</ThemedText>
            <Pressable onPress={clearAuthMessage}>
              <ThemedText type="link">Dismiss message</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        <View style={styles.switchRow}>
          <ToggleChip
            label="Customer"
            active={audience === 'customer'}
            onPress={() => {
              clearAuthMessage();
              setAudience('customer');
            }}
            activeBackground={subtleBackground}
            inactiveBackground={inputBackground}
            borderColor={borderColor}
          />
          <ToggleChip
            label="Merchant"
            active={audience === 'merchant'}
            onPress={() => {
              clearAuthMessage();
              setAudience('merchant');
            }}
            activeBackground={subtleBackground}
            inactiveBackground={inputBackground}
            borderColor={borderColor}
          />
        </View>

        {audience === 'customer' ? (
          <View style={styles.modeBlock}>
            <View style={styles.switchRow}>
              <ToggleChip
                label="Sign in"
                active={customerMode === 'sign-in'}
                onPress={() => {
                  clearAuthMessage();
                  setCustomerMode('sign-in');
                }}
                activeBackground={subtleBackground}
                inactiveBackground={inputBackground}
                borderColor={borderColor}
              />
              <ToggleChip
                label="Create account"
                active={customerMode === 'create-account'}
                onPress={() => {
                  clearAuthMessage();
                  setCustomerMode('create-account');
                }}
                activeBackground={subtleBackground}
                inactiveBackground={inputBackground}
                borderColor={borderColor}
              />
            </View>
            <ToggleChip
              label="Forgot password"
              active={customerMode === 'forgot-password'}
              onPress={() => {
                clearAuthMessage();
                setCustomerMode('forgot-password');
              }}
              activeBackground={subtleBackground}
              inactiveBackground={inputBackground}
              borderColor={borderColor}
              fullWidth
            />

            <ThemedText style={styles.supportText}>{customerModeCopy[customerMode]}</ThemedText>

            {customerMode === 'create-account' ? (
              <FormField
                label="Full name"
                value={customerFields.fullName}
                onChangeText={(value) => updateCustomerField('fullName', value)}
                inputBackground={inputBackground}
                borderColor={borderColor}
                textColor={textColor}
              />
            ) : null}

            <FormField
              label="Email address"
              value={customerFields.email}
              onChangeText={(value) => updateCustomerField('email', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="email-address"
            />

            <FormField
              label="Mobile number"
              value={customerFields.mobile}
              onChangeText={(value) => updateCustomerField('mobile', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="phone-pad"
            />

            {customerMode !== 'forgot-password' ? (
              <FormField
                label="Password"
                value={customerFields.password}
                onChangeText={(value) => updateCustomerField('password', value)}
                inputBackground={inputBackground}
                borderColor={borderColor}
                textColor={textColor}
                secureTextEntry
              />
            ) : null}

            <View style={styles.actionRow}>
              <AppButton
                label={
                  customerMode === 'sign-in'
                    ? 'Continue to secure sign in'
                    : customerMode === 'create-account'
                      ? 'Create account and continue'
                      : 'Open password reset'
                }
                onPress={submitCustomer}
                disabled={!customerReady}
              />
              <AppButton label="Preview checkout demo" onPress={() => router.push('/checkout-flow')} variant="secondary" />
            </View>
          </View>
        ) : (
          <View style={styles.modeBlock}>
            <ThemedText style={styles.supportText}>{authExperience.merchantMode}</ThemedText>
            <FormField
              label="Merchant name"
              value={merchantFields.companyName}
              onChangeText={(value) => updateMerchantField('companyName', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
            />
            <FormField
              label="Work email"
              value={merchantFields.workEmail}
              onChangeText={(value) => updateMerchantField('workEmail', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="email-address"
            />
            <FormField
              label="Password"
              value={merchantFields.password}
              onChangeText={(value) => updateMerchantField('password', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              secureTextEntry
            />
            <View style={styles.actionRow}>
              <AppButton label="Open merchant dashboard" onPress={submitMerchant} disabled={!merchantReady} />
              <AppButton label="View platform blueprint" onPress={() => router.push('/modal')} variant="secondary" />
            </View>
          </View>
        )}
      </ThemedView>

      <ThemedView lightColor="#f8fbf5" darkColor="#15311b" style={styles.ficaPreviewCard}>
        <ThemedText type="sectionTitle">FICA upload entry</ThemedText>
        <ThemedText style={styles.supportText}>
          New customers continue into a dedicated document-upload entry before full dashboard access
          is unlocked.
        </ThemedText>
        {ficaDocuments.slice(0, 3).map((item, index) => (
          <InfoRow
            key={item.title}
            icon={index === 0 ? 'badge' : index === 1 ? 'home-work' : 'photo-camera-front'}
            title={item.title}
            detail={item.detail}
            tone={index === 0 ? 'info' : 'success'}
          />
        ))}
        <AppButton label="Open FICA upload screen" onPress={() => router.push(ficaUploadRoute)} variant="secondary" />
      </ThemedView>
    </ScrollView>
  );
}

function AccessPanel({
  icon,
  title,
  detail,
  lightColor,
  darkColor,
  tone,
}: {
  icon: ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  detail: string;
  lightColor: string;
  darkColor: string;
  tone: 'neutral' | 'success' | 'warning' | 'info';
}) {
  return (
    <ThemedView lightColor={lightColor} darkColor={darkColor} style={styles.accessPanel}>
      <InfoRow icon={icon} title={title} detail={detail} tone={tone} />
    </ThemedView>
  );
}

function HeroStatChip({ label, value }: { label: string; value: string }) {
  const backgroundColor = useThemeColor({ light: 'rgba(255,255,255,0.82)', dark: '#183255' }, 'surfaceMuted');

  return (
    <View style={[styles.heroStatChip, { backgroundColor }]}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
  );
}

function ToggleChip({
  label,
  active,
  onPress,
  activeBackground,
  inactiveBackground,
  borderColor,
  fullWidth,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeBackground: string;
  inactiveBackground: string;
  borderColor: string;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.switchChip,
        fullWidth ? styles.fullWidthChip : undefined,
        {
          backgroundColor: active ? activeBackground : inactiveBackground,
          borderColor,
        },
      ]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
    </Pressable>
  );
}

function FormField({
  label,
  value,
  onChangeText,
  inputBackground,
  borderColor,
  textColor,
  keyboardType,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  inputBackground: string;
  borderColor: string;
  textColor: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad' | 'phone-pad';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <ThemedText type="cardLabel">{label}</ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            backgroundColor: inputBackground,
            borderColor,
            color: textColor,
          },
        ]}
        placeholderTextColor={`${textColor}88`}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
      />
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
    paddingBottom: 120,
    gap: 18,
  },
  sessionCard: {
    borderRadius: 26,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.24)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  capabilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accessPanel: {
    width: '48%',
    minWidth: 150,
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
  entryCard: {
    borderRadius: 26,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  ficaPreviewCard: {
    borderRadius: 26,
    padding: 22,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.16)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  feedbackCard: {
    borderRadius: 18,
    padding: 14,
    gap: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  entryCopy: {
    flex: 1,
    gap: 4,
  },
  entryPill: {
    minWidth: 108,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    gap: 2,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  heroStatChip: {
    minWidth: 112,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    alignItems: 'center',
    gap: 2,
  },
  switchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  switchChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fullWidthChip: {
    width: '100%',
  },
  modeBlock: {
    gap: 12,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  documentItem: {
    gap: 4,
  },
  actionRow: {
    gap: 10,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
