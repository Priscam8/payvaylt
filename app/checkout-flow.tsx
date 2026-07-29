import * as WebBrowser from 'expo-web-browser';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useAuth } from '@/components/auth-provider';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { payvayltData } from '@/constants/payvaylt-data';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  BootstrapResponse,
  payVayltApi,
  PaymentSessionResponse,
  VendorReservationResponse,
} from '@/lib/payvaylt-api';

type Cadence = 'Weekly' | 'Fortnightly' | 'Monthly';

const cadenceOptions: Cadence[] = ['Weekly', 'Fortnightly', 'Monthly'];
const steps = ['Merchant cart', 'Register', 'Verify', 'Build plan', 'Pay', 'Release'];

function formatCurrency(amount: number) {
  return `R ${amount.toFixed(2)}`;
}

export default function CheckoutFlowScreen() {
  const { completeCheckoutDemo } = useAuth();
  const inputBackground = useThemeColor({ light: '#ffffff', dark: '#10203b' }, 'surface');
  const subtleBackground = useThemeColor({ light: '#f6f9fc', dark: '#16315a' }, 'surfaceMuted');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [stepIndex, setStepIndex] = useState(0);
  const [registration, setRegistration] = useState({
    fullName: 'Nandi Mokoena',
    email: 'nandi@example.com',
    phone: '0825550192',
    idNumber: '9801010123088',
    password: 'goal2026!',
  });
  const [verification, setVerification] = useState({
    accountCreated: true,
    questionsPassed: true,
    ficaUploaded: false,
    homeAffairsMatched: false,
  });
  const [plan, setPlan] = useState({
    deposit: String(journeyDemo.recommendedDeposit),
    voucherAmount: String(journeyDemo.suggestedVoucherUse),
    cadence: 'Monthly' as Cadence,
    term: '6',
  });
  const [planCreated, setPlanCreated] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [releaseTriggered, setReleaseTriggered] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSessionResponse | null>(null);
  const [bootstrapData, setBootstrapData] = useState<BootstrapResponse | null>(null);
  const [vendorReservation, setVendorReservation] = useState<VendorReservationResponse | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [reservationBusy, setReservationBusy] = useState(false);
  const [reservationMessage, setReservationMessage] = useState('');

  const journeyDemo = bootstrapData?.journeyDemo ?? payvayltData.journeyDemo;

  useEffect(() => {
    let active = true;

    payVayltApi
      .bootstrap()
      .then((payload) => {
        if (!active) {
          return;
        }

        setBootstrapData(payload);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  const deposit = Number(plan.deposit) || 0;
  const voucherAmount = Number(plan.voucherAmount) || 0;
  const termMonths = Math.min(Math.max(Number(plan.term) || 1, 1), journeyDemo.maxTermMonths);
  const securedBalance = Math.max(journeyDemo.cartTotal - deposit - voucherAmount, 0);
  const remainingMilestones = Math.max(termMonths - 1, 1);
  const finalInstalment = Number((securedBalance / remainingMilestones).toFixed(2));
  const paidBeforeFinal = Number((journeyDemo.cartTotal - finalInstalment).toFixed(2));
  const verificationReady = Object.values(verification).every(Boolean);
  const registrationReady =
    registration.fullName.trim().length > 2 &&
    registration.email.includes('@') &&
    registration.phone.trim().length >= 10 &&
    registration.idNumber.trim().length >= 10 &&
    registration.password.trim().length >= 8;
  const planReady =
    deposit >= 0 &&
    voucherAmount >= 0 &&
    deposit + voucherAmount <= journeyDemo.cartTotal &&
    termMonths >= 1 &&
    termMonths <= journeyDemo.maxTermMonths;

  const releaseReference = useMemo(() => {
    const idSuffix = registration.idNumber.slice(-4) || '0000';
    return `PVLT-${journeyDemo.store.toUpperCase().replace(/\s+/g, '').slice(0, 5)}-${idSuffix}`;
  }, [journeyDemo.store, registration.idNumber]);
  const checkoutPayload = useMemo(
    () => ({
      registration: {
        fullName: registration.fullName,
        email: registration.email,
        mobile: registration.phone,
        password: registration.password,
        idNumber: registration.idNumber,
      },
      verification: {
        accountCreated: true,
        otpVerified: true,
        questionsPassed: verification.questionsPassed,
        ficaUploaded: verification.ficaUploaded,
        homeAffairsMatched: verification.homeAffairsMatched,
      },
      plan: {
        deposit,
        voucherAmount,
        cadence: plan.cadence,
        termMonths,
      },
      journey: {
        merchant: journeyDemo.merchant,
        store: journeyDemo.store,
        cartId: journeyDemo.cartId,
        cartTotal: journeyDemo.cartTotal,
        itemCount: journeyDemo.itemCount,
        leadItem: journeyDemo.leadItem,
        reservedUntil: journeyDemo.reservedUntil,
        releaseLeadTime: journeyDemo.releaseLeadTime,
      },
      releaseReference,
      vendorReservationId: vendorReservation?.id,
    }),
    [
      deposit,
      journeyDemo,
      plan.cadence,
      registration,
      releaseReference,
      termMonths,
      verification,
      vendorReservation?.id,
      voucherAmount,
    ]
  );

  function updateRegistration(field: keyof typeof registration, value: string) {
    setRegistration((current) => ({ ...current, [field]: value }));
  }

  function toggleVerification(field: keyof typeof verification) {
    setVerification((current) => ({ ...current, [field]: !current[field] }));
  }

  async function continueToRegister() {
    if (vendorReservation?.id) {
      setStepIndex(1);
      return;
    }

    setReservationBusy(true);
    setReservationMessage('');

    try {
      const reservationResult = await payVayltApi.createVendorReservation(
        journeyDemo.vendorSlug || 'exact',
        {
          cartId: journeyDemo.cartId,
          itemName: journeyDemo.leadItem,
          itemCount: journeyDemo.itemCount,
          total: journeyDemo.cartTotal,
          currency: 'ZAR',
          customerIdentifier: registration.email || registration.phone,
          releaseReference,
          metadata: {
            merchant: journeyDemo.merchant,
            store: journeyDemo.store,
          },
        }
      );

      setVendorReservation(reservationResult.reservation);
      setReservationMessage(
        `${reservationResult.vendor.name} reserved the cart with reference ${
          reservationResult.reservation.externalReference || reservationResult.reservation.id
        }.`
      );
      setStepIndex(1);
    } catch (error) {
      setReservationMessage(
        error instanceof Error ? error.message : 'PayVaylt could not reserve the cart with the vendor.'
      );
    } finally {
      setReservationBusy(false);
    }
  }

  function submitRegistration() {
    if (!registrationReady) return;
    setStepIndex(2);
  }

  function submitVerification() {
    if (!verificationReady) return;
    setStepIndex(3);
  }

  function submitPlan() {
    if (!planReady) return;
    setPlanCreated(true);
    setPaymentSession(null);
    setPaymentMessage('');
    setStepIndex(4);
  }

  async function payInstalment() {
    if (!planCreated) return;
    setPaymentBusy(true);
    setPaymentMessage('');
    try {
      let nextSession = paymentSession;

      if (!nextSession) {
        nextSession = await payVayltApi.createCheckoutPaymentSession(checkoutPayload);
        setPaymentSession(nextSession);
      }

      if (nextSession.provider === 'stripe' && nextSession.checkoutUrl && nextSession.status !== 'paid') {
        setPaymentMessage('Stripe checkout opened. Complete payment there, then return once the webhook marks the session as paid.');
        await WebBrowser.openBrowserAsync(nextSession.checkoutUrl);
        return;
      }

      if (nextSession.status !== 'paid') {
        nextSession = await payVayltApi.confirmPaymentSession(nextSession.id);
        setPaymentSession(nextSession);
      }

      if (nextSession.status !== 'paid') {
        setPaymentMessage('Payment session is not marked as paid yet.');
        return;
      }

      await completeCheckoutDemo({
        ...checkoutPayload,
        paymentSessionId: nextSession.id,
      });
      setPaymentComplete(true);
      setReleaseTriggered(true);
      setStepIndex(5);
    } finally {
      setPaymentBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Interactive flow"
        title="Merchant checkout to item release."
        description="This prototype walks through the real PayVaylt path: redirected cart, account creation, verification, flexible lay-by setup, instalment payment, and merchant release."
      />

      <View style={styles.stepRail}>
        {steps.map((step, index) => (
          <View
            key={step}
            style={[
              styles.stepPill,
              { backgroundColor: index === stepIndex ? subtleBackground : inputBackground, borderColor },
            ]}>
            <View
              style={[
                styles.stepBadge,
                {
                  backgroundColor:
                    index <= stepIndex ? accentColor : borderColor,
                },
              ]}>
              <ThemedText lightColor="#ffffff" darkColor="#0d1b18" type="defaultSemiBold">
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText style={styles.stepLabel}>{step}</ThemedText>
          </View>
        ))}
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10203b" style={styles.stageCard}>
        {stepIndex === 0 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">1. Merchant cart redirect</ThemedText>
            <ThemedText style={styles.supportText}>
              Customer selected PayVaylt from merchant checkout and landed in a reserved-cart flow.
            </ThemedText>
            <View style={styles.summaryGrid}>
              <SummaryItem label="Merchant" value={journeyDemo.merchant} />
              <SummaryItem label="Store" value={journeyDemo.store} />
              <SummaryItem label="Cart ID" value={journeyDemo.cartId} />
              <SummaryItem label="Reserved until" value={journeyDemo.reservedUntil} />
            </View>
            <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
              <ThemedText type="cardTitle">{journeyDemo.leadItem}</ThemedText>
              <ThemedText style={styles.supportText}>
                {journeyDemo.itemCount} items reserved · Total cart value{' '}
                {formatCurrency(journeyDemo.cartTotal)}
              </ThemedText>
            </ThemedView>
            <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
              <ThemedText type="cardTitle">Vendor reservation</ThemedText>
              <ThemedText style={styles.supportText}>
                {vendorReservation
                  ? `${journeyDemo.store} marked this cart as ${vendorReservation.status}.`
                  : 'PayVaylt will create a vendor reservation before the customer registration continues.'}
              </ThemedText>
              {reservationMessage ? <ThemedText style={styles.supportText}>{reservationMessage}</ThemedText> : null}
            </ThemedView>
            <ActionButton
              label={reservationBusy ? 'Reserving cart...' : 'Continue to registration'}
              onPress={continueToRegister}
              disabled={reservationBusy}
            />
          </View>
        )}

        {stepIndex === 1 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">2. Register customer account</ThemedText>
            <ThemedText style={styles.supportText}>
              New customers create an account before they can configure a lay-by plan.
            </ThemedText>
            <FormField
              label="Full name"
              value={registration.fullName}
              onChangeText={(value) => updateRegistration('fullName', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
            />
            <FormField
              label="Email address"
              value={registration.email}
              onChangeText={(value) => updateRegistration('email', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="email-address"
            />
            <FormField
              label="Mobile number"
              value={registration.phone}
              onChangeText={(value) => updateRegistration('phone', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="phone-pad"
            />
            <FormField
              label="ID number"
              value={registration.idNumber}
              onChangeText={(value) => updateRegistration('idNumber', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="number-pad"
            />
            <FormField
              label="Password"
              value={registration.password}
              onChangeText={(value) => updateRegistration('password', value)}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              secureTextEntry
            />
            <ActionButton
              label="Save account and continue"
              onPress={submitRegistration}
              disabled={!registrationReady}
            />
          </View>
        )}

        {stepIndex === 2 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">3. Complete verification</ThemedText>
            <ThemedText style={styles.supportText}>
              PayVaylt verifies the customer before unlocking full dashboard access and lay-by
              controls.
            </ThemedText>
            {[
              ['accountCreated', 'Account registered and OTP confirmed'],
              ['questionsPassed', 'Identity verification questions passed'],
              ['ficaUploaded', 'FICA documents uploaded and approved'],
              ['homeAffairsMatched', 'Home Affairs identity match confirmed'],
            ].map(([field, label]) => {
              const key = field as keyof typeof verification;
              const active = verification[key];

              return (
                <Pressable
                  key={field}
                  onPress={() => toggleVerification(key)}
                  style={[
                    styles.toggleRow,
                    { backgroundColor: active ? subtleBackground : inputBackground, borderColor },
                  ]}>
                  <View style={styles.toggleCopy}>
                    <ThemedText type="cardTitle">{label}</ThemedText>
                    <ThemedText style={styles.supportText}>
                      Tap to simulate verification results for this prototype.
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.toggleBadge,
                      { backgroundColor: active ? accentColor : borderColor },
                    ]}>
                    <ThemedText lightColor="#ffffff" darkColor="#0d1b18" type="defaultSemiBold">
                      {active ? 'Done' : 'Tap'}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
            <ActionButton
              label="Continue to lay-by builder"
              onPress={submitVerification}
              disabled={!verificationReady}
            />
          </View>
        )}

        {stepIndex === 3 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">4. Build a flexible lay-by plan</ThemedText>
            <ThemedText style={styles.supportText}>
              Customers choose how much to pay today, how much voucher value to use, and how long
              the plan should run.
            </ThemedText>
            <FormField
              label="Cash deposit today"
              value={plan.deposit}
              onChangeText={(value) => setPlan((current) => ({ ...current, deposit: value }))}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="numeric"
            />
            <FormField
              label="Store voucher amount"
              value={plan.voucherAmount}
              onChangeText={(value) => setPlan((current) => ({ ...current, voucherAmount: value }))}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="numeric"
            />
            <FormField
              label="Completion term in months"
              value={plan.term}
              onChangeText={(value) => setPlan((current) => ({ ...current, term: value }))}
              inputBackground={inputBackground}
              borderColor={borderColor}
              textColor={textColor}
              keyboardType="numeric"
            />
            <View style={styles.optionGroup}>
              <ThemedText type="cardLabel">Payment cadence</ThemedText>
              <View style={styles.optionRow}>
                {cadenceOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setPlan((current) => ({ ...current, cadence: option }))}
                    style={[
                      styles.optionChip,
                      {
                        backgroundColor: plan.cadence === option ? subtleBackground : inputBackground,
                        borderColor,
                      },
                    ]}>
                    <ThemedText type="defaultSemiBold">{option}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
              <ThemedText type="cardTitle">Plan summary</ThemedText>
              <ThemedText style={styles.supportText}>
                Deposit {formatCurrency(deposit)} + voucher {formatCurrency(voucherAmount)} secures
                the cart today. Remaining balance is {formatCurrency(securedBalance)} over{' '}
                {termMonths} months with a {plan.cadence.toLowerCase()} schedule.
              </ThemedText>
            </ThemedView>
            <ActionButton
              label="Create lay-by plan"
              onPress={submitPlan}
              disabled={!planReady}
            />
          </View>
        )}

        {stepIndex === 4 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">5. Pay the due instalment</ThemedText>
            <ThemedText style={styles.supportText}>
              To show the full release path in one demo, this prototype fast-forwards to the final
              scheduled instalment on the plan.
            </ThemedText>
            <View style={styles.summaryGrid}>
              <SummaryItem label="Plan created for" value={registration.fullName} />
              <SummaryItem label="Deposit + voucher" value={formatCurrency(deposit + voucherAmount)} />
              <SummaryItem label="Paid before final due" value={formatCurrency(paidBeforeFinal)} />
              <SummaryItem label="Final instalment due" value={formatCurrency(finalInstalment)} />
            </View>
            <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
              <ThemedText type="cardTitle">Release trigger preview</ThemedText>
              <ThemedText style={styles.supportText}>
                Once the final instalment is confirmed, PayVaylt marks the cart as fully paid and
                notifies {journeyDemo.store} to release the reserved order.
              </ThemedText>
            </ThemedView>
            <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
              <ThemedText type="cardTitle">Payment provider</ThemedText>
              <ThemedText style={styles.supportText}>
                {paymentSession
                  ? `${paymentSession.provider.toUpperCase()} session ${paymentSession.status}.`
                  : 'PayVaylt will create a real payment session before the order is released. In local development this falls back to a mock provider.'}
              </ThemedText>
              {paymentMessage ? <ThemedText style={styles.supportText}>{paymentMessage}</ThemedText> : null}
            </ThemedView>
            {vendorReservation ? (
              <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
                <ThemedText type="cardTitle">Vendor reservation status</ThemedText>
                <ThemedText style={styles.supportText}>
                  Reservation {vendorReservation.externalReference || vendorReservation.id} is currently{' '}
                  {vendorReservation.status}.
                </ThemedText>
              </ThemedView>
            ) : null}
            <ActionButton
              label={
                paymentBusy
                  ? 'Processing payment...'
                  : paymentSession?.provider === 'stripe' && paymentSession.status !== 'paid'
                    ? 'Open Stripe checkout'
                    : 'Pay final instalment'
              }
              onPress={payInstalment}
              disabled={paymentBusy}
            />
          </View>
        )}

        {stepIndex === 5 && (
          <View style={styles.stageContent}>
            <ThemedText type="sectionTitle">6. Merchant release confirmation</ThemedText>
            <ThemedText style={styles.supportText}>
              The cart is fully paid and ready for release back to the merchant order system.
            </ThemedText>
            <ThemedView lightColor="#f8fbf5" darkColor="#15311b" style={styles.releaseCard}>
              <ThemedText type="cardLabel">Release reference</ThemedText>
              <ThemedText type="balance">{releaseReference}</ThemedText>
              <ThemedText style={styles.supportText}>
                Final payment {paymentComplete ? 'confirmed' : 'pending'} · Merchant release{' '}
                {releaseTriggered ? 'triggered' : 'not triggered'}
              </ThemedText>
            </ThemedView>
            {vendorReservation ? (
              <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.innerCard}>
                <ThemedText type="cardTitle">Vendor handoff</ThemedText>
                <ThemedText style={styles.supportText}>
                  Reservation {vendorReservation.externalReference || vendorReservation.id} is linked to the
                  release flow for {journeyDemo.store}.
                </ThemedText>
              </ThemedView>
            ) : null}
            <View style={styles.summaryGrid}>
              <SummaryItem label="Customer" value={registration.fullName} />
              <SummaryItem label="Store" value={journeyDemo.store} />
              <SummaryItem label="Cart total" value={formatCurrency(journeyDemo.cartTotal)} />
              <SummaryItem label="Release SLA" value={journeyDemo.releaseLeadTime} />
            </View>
            <Link href="/" style={styles.backLink}>
              <ThemedText type="link">Return to dashboard</ThemedText>
            </Link>
          </View>
        )}
      </ThemedView>
    </ScrollView>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryItem}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
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
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholderTextColor={`${textColor}88`}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        disabled ? styles.actionButtonDisabled : undefined,
        pressed && !disabled ? styles.actionButtonPressed : undefined,
      ]}>
      <ThemedText lightColor="#ffffff" darkColor="#0d1b18" type="defaultSemiBold">
        {label}
      </ThemedText>
    </Pressable>
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
  stepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  stageCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  stageContent: {
    gap: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '48%',
    minWidth: 140,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#f7fafc',
    gap: 4,
  },
  innerCard: {
    borderRadius: 22,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  releaseCard: {
    borderRadius: 24,
    padding: 18,
    gap: 8,
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
  optionGroup: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleRow: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
  },
  toggleBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionButton: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#0b66da',
    shadowColor: '#0b66da',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    opacity: 0.86,
  },
  backLink: {
    marginTop: 4,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.74,
  },
});
