import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';
import { useThemeColor } from '@/hooks/use-theme-color';

type DemoSource = 'catalog' | 'manual' | 'service';
type DemoOrderStatus = 'awaiting_customer' | 'awaiting_bank' | 'paid' | 'declined';

type DemoCartItem = {
  key: string;
  name: string;
  price: number;
  quantity: number;
  source: DemoSource;
  note: string;
};

type LockedOrder = {
  id: string;
  token: string;
  merchant: string;
  items: DemoCartItem[];
  total: number;
  createdAt: string;
  expiresAt: string;
  status: DemoOrderStatus;
  bankReference?: string;
};

const stepLabels = ['Basket', 'QR', 'WhatsApp', 'Bank', 'Receipt'];

function formatCurrency(amount: number) {
  return `R ${amount.toFixed(2)}`;
}

function formatMoment(date: Date) {
  const dateValue = date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const timeValue = date.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateValue} ${timeValue}`;
}

function createDefaultCart() {
  return scanToPayData.sampleProducts.map((product, index) => ({
    key: product.id,
    name: product.name,
    price: product.price,
    quantity: index === 0 ? 2 : index === 1 ? 3 : 1,
    source: 'catalog' as const,
    note: product.note,
  }));
}

function createOrderId() {
  return `ORD-${Date.now().toString(36).slice(-6).toUpperCase()}`;
}

function createCheckoutToken(orderId: string) {
  return `CHK-${orderId.replace('ORD-', '')}`;
}

function createBankReference(orderId: string) {
  return `PSH-${orderId.replace('ORD-', '')}`;
}

function getStatusTone(status: DemoOrderStatus) {
  if (status === 'paid') return 'success';
  if (status === 'declined') return 'warning';
  return 'info';
}

function buildQrCells(seed: string) {
  const cells: boolean[] = [];

  for (let index = 0; index < 81; index += 1) {
    const code = seed.charCodeAt(index % seed.length);
    const filled = (code + index * 11) % 5 !== 0;
    cells.push(filled);
  }

  const markers = [
    0, 1, 2, 9, 11, 18, 19, 20, 6, 7, 8, 15, 17, 24, 25, 26, 54, 55, 56, 63,
    65, 72, 73, 74,
  ];

  markers.forEach((marker) => {
    cells[marker] = true;
  });

  return cells;
}

export function ScanToPayDemo() {
  const surface = useThemeColor({ light: '#ffffff', dark: '#10213a' }, 'surface');
  const mutedSurface = useThemeColor(
    { light: '#f6f9fc', dark: '#183255' },
    'surfaceMuted'
  );
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const { demoMerchant } = scanToPayData;
  const [cart, setCart] = useState<DemoCartItem[]>(createDefaultCart);
  const [manualName, setManualName] = useState('Tomatoes');
  const [manualPrice, setManualPrice] = useState('8');
  const [manualQuantity, setManualQuantity] = useState('2');
  const [serviceName, setServiceName] = useState('Haircut');
  const [serviceAmount, setServiceAmount] = useState('150');
  const [lockedOrder, setLockedOrder] = useState<LockedOrder | null>(null);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const currentStep =
    lockedOrder == null
      ? 0
      : lockedOrder.status === 'awaiting_customer'
        ? 2
        : lockedOrder.status === 'awaiting_bank'
          ? 3
          : 4;
  const manualReady =
    manualName.trim().length > 1 &&
    Number(manualPrice) > 0 &&
    Number(manualQuantity) > 0;
  const serviceReady = serviceName.trim().length > 1 && Number(serviceAmount) > 0;
  const orderLocked = lockedOrder != null;

  function resetDemoCart() {
    setLockedOrder(null);
    setCart(createDefaultCart());
  }

  function updateQuantity(key: string, delta: number) {
    if (orderLocked) return;

    setCart((current) =>
      current
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function addCatalogItem(productId: string) {
    if (orderLocked) return;

    const product = scanToPayData.sampleProducts.find((entry) => entry.id === productId);
    if (!product) return;

    setCart((current) => {
      const existing = current.find((item) => item.key === product.id);
      if (existing) {
        return current.map((item) =>
          item.key === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...current,
        {
          key: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          source: 'catalog',
          note: product.note,
        },
      ];
    });
  }

  function addManualItem() {
    if (!manualReady || orderLocked) return;

    setCart((current) => [
      ...current,
      {
        key: `manual-${Date.now().toString(36)}`,
        name: manualName.trim(),
        price: Number(manualPrice),
        quantity: Number(manualQuantity),
        source: 'manual',
        note: 'Vendor-entered produce or loose goods',
      },
    ]);
    setManualName('Tomatoes');
    setManualPrice('8');
    setManualQuantity('2');
  }

  function addServiceLine() {
    if (!serviceReady || orderLocked) return;

    setCart((current) => [
      ...current,
      {
        key: `service-${Date.now().toString(36)}`,
        name: serviceName.trim(),
        price: Number(serviceAmount),
        quantity: 1,
        source: 'service',
        note: 'Quick amount mode',
      },
    ]);
    setServiceName('Haircut');
    setServiceAmount('150');
  }

  function generateCheckoutQr() {
    if (cart.length === 0 || orderLocked) return;

    const now = new Date();
    const orderId = createOrderId();

    setLockedOrder({
      id: orderId,
      token: createCheckoutToken(orderId),
      merchant: demoMerchant.name,
      items: cart.map((item) => ({ ...item })),
      total,
      createdAt: formatMoment(now),
      expiresAt: formatMoment(new Date(now.getTime() + 5 * 60 * 1000)),
      status: 'awaiting_customer',
    });
  }

  function sendToBankApproval() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_customer') return;
    setLockedOrder({ ...lockedOrder, status: 'awaiting_bank' });
  }

  function approvePayment() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_bank') return;

    setLockedOrder({
      ...lockedOrder,
      status: 'paid',
      bankReference: createBankReference(lockedOrder.id),
    });
  }

  function declinePayment() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_bank') return;
    setLockedOrder({ ...lockedOrder, status: 'declined' });
  }

  function unlockOrder() {
    setLockedOrder(null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Live investor walkthrough"
        title="Merchant to WhatsApp to bank approval."
        description="This demo shows the strongest MVP path: the vendor builds the basket, generates one checkout QR, the customer reviews in WhatsApp, and the bank confirms the payment.">
        <View style={styles.heroStats}>
          <HeroStatCard label="Merchant" value={demoMerchant.name} />
          <HeroStatCard label="Demo basket" value={formatCurrency(total)} />
          <HeroStatCard label="Settlement" value="Bank-led" />
        </View>
      </BrandHeroCard>

      <View style={styles.stepRail}>
        {stepLabels.map((label, index) => (
          <View
            key={label}
            style={[
              styles.stepPill,
              {
                backgroundColor: index <= currentStep ? mutedSurface : surface,
                borderColor,
              },
            ]}>
            <View
              style={[
                styles.stepBadge,
                { backgroundColor: index <= currentStep ? accentColor : borderColor },
              ]}>
              <ThemedText
                type="chipLabel"
                lightColor={index <= currentStep ? '#ffffff' : undefined}
                darkColor={index <= currentStep ? '#091427' : undefined}>
                {index + 1}
              </ThemedText>
            </View>
            <ThemedText type="chipValue">{label}</ThemedText>
          </View>
        ))}
      </View>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <ThemedText type="sectionTitle">1. Build the merchant basket</ThemedText>
            <ThemedText style={styles.supportText}>
              The default fruit stall order mirrors the original investor story:
              Apple x2, Banana x3, Orange x1.
            </ThemedText>
          </View>
          {lockedOrder ? (
            <StatusChip
              label={lockedOrder.status.replace('_', ' ')}
              tone={getStatusTone(lockedOrder.status)}
            />
          ) : (
            <StatusChip label="draft order" />
          )}
        </View>

        <View style={styles.sectionBlock}>
          <ThemedText type="cardLabel">Saved fruit catalogue</ThemedText>
          <View style={styles.catalogGrid}>
            {scanToPayData.sampleProducts.map((product) => (
              <Pressable
                key={product.id}
                disabled={orderLocked}
                onPress={() => addCatalogItem(product.id)}
                style={({ pressed }) => [
                  styles.catalogCard,
                  {
                    backgroundColor: mutedSurface,
                    borderColor,
                    opacity: orderLocked ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}>
                <ThemedText type="cardTitle">{product.name}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {formatCurrency(product.price)}
                </ThemedText>
                <ThemedText type="chipLabel">Tap to add one</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.formGrid}>
          <View style={styles.formCard}>
            <ThemedText type="cardLabel">Manual item</ThemedText>
            <TextInput
              value={manualName}
              onChangeText={setManualName}
              editable={!orderLocked}
              placeholder="Description"
              placeholderTextColor="#8c9bb0"
              style={[
                styles.input,
                {
                  backgroundColor: surface,
                  borderColor,
                  color: textColor,
                },
              ]}
            />
            <View style={styles.inlineInputs}>
              <TextInput
                value={manualPrice}
                onChangeText={setManualPrice}
                editable={!orderLocked}
                placeholder="Price"
                keyboardType="decimal-pad"
                placeholderTextColor="#8c9bb0"
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor: surface,
                    borderColor,
                    color: textColor,
                  },
                ]}
              />
              <TextInput
                value={manualQuantity}
                onChangeText={setManualQuantity}
                editable={!orderLocked}
                placeholder="Qty"
                keyboardType="number-pad"
                placeholderTextColor="#8c9bb0"
                style={[
                  styles.input,
                  styles.halfInput,
                  {
                    backgroundColor: surface,
                    borderColor,
                    color: textColor,
                  },
                ]}
              />
            </View>
            <AppButton
              label="Add manual item"
              onPress={addManualItem}
              disabled={!manualReady || orderLocked}
              variant="secondary"
            />
          </View>

          <View style={styles.formCard}>
            <ThemedText type="cardLabel">Quick amount mode</ThemedText>
            <TextInput
              value={serviceName}
              onChangeText={setServiceName}
              editable={!orderLocked}
              placeholder="Service description"
              placeholderTextColor="#8c9bb0"
              style={[
                styles.input,
                {
                  backgroundColor: surface,
                  borderColor,
                  color: textColor,
                },
              ]}
            />
            <TextInput
              value={serviceAmount}
              onChangeText={setServiceAmount}
              editable={!orderLocked}
              placeholder="Amount"
              keyboardType="decimal-pad"
              placeholderTextColor="#8c9bb0"
              style={[
                styles.input,
                {
                  backgroundColor: surface,
                  borderColor,
                  color: textColor,
                },
              ]}
            />
            <AppButton
              label="Add quick amount"
              onPress={addServiceLine}
              disabled={!serviceReady || orderLocked}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <ThemedText type="cardLabel">Current basket</ThemedText>
              <ThemedText type="cardAmount">{formatCurrency(total)}</ThemedText>
            </View>
            <View style={styles.actionChips}>
              <AppButton label="Reload fruit demo" onPress={resetDemoCart} variant="ghost" />
            </View>
          </View>

          {cart.map((item) => (
            <View key={item.key} style={[styles.lineItem, { borderColor }]}>
              <View style={styles.lineCopy}>
                <ThemedText type="cardTitle">{item.name}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {item.note} · {formatCurrency(item.price)} each
                </ThemedText>
              </View>
              <View style={styles.lineControls}>
                <SourcePill source={item.source} />
                <QuantityButton
                  label="-"
                  onPress={() => updateQuantity(item.key, -1)}
                  disabled={orderLocked}
                />
                <ThemedText type="chipValue">{item.quantity}</ThemedText>
                <QuantityButton
                  label="+"
                  onPress={() => updateQuantity(item.key, 1)}
                  disabled={orderLocked}
                />
              </View>
            </View>
          ))}

          <View style={styles.orderActionRow}>
            <AppButton
              label="Generate checkout QR"
              onPress={generateCheckoutQr}
              disabled={cart.length === 0 || orderLocked}
            />
            {lockedOrder ? (
              <AppButton label="Unlock and edit" onPress={unlockOrder} variant="ghost" />
            ) : null}
          </View>
        </View>
      </ThemedView>

      {lockedOrder ? (
        <>
          <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="sectionTitle">2. Dynamic checkout QR</ThemedText>
                <ThemedText style={styles.supportText}>
                  One-time token linked to a locked server-side order. The QR expires in
                  five minutes.
                </ThemedText>
              </View>
              <StatusChip
                label={lockedOrder.status.replace('_', ' ')}
                tone={getStatusTone(lockedOrder.status)}
              />
            </View>

            <View style={styles.qrShell}>
              <TokenQr token={lockedOrder.token} />
              <View style={styles.qrCopy}>
                <ThemedText type="cardLabel">Order</ThemedText>
                <ThemedText type="balance">{lockedOrder.id}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {demoMerchant.name} · {demoMerchant.city}
                </ThemedText>
                <ThemedText style={styles.supportText}>
                  Created {lockedOrder.createdAt}
                </ThemedText>
                <ThemedText style={styles.supportText}>
                  Expires {lockedOrder.expiresAt}
                </ThemedText>
                <ThemedText type="chipLabel">
                  Checkout token {lockedOrder.token}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="sectionTitle">3. Customer reviews in WhatsApp</ThemedText>
                <ThemedText style={styles.supportText}>
                  The customer sees the merchant name, every line item, and the total before
                  proceeding.
                </ThemedText>
              </View>
              <StatusChip label="WhatsApp review" tone="info" />
            </View>

            <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.whatsappCard}>
              <ThemedText type="cardLabel">WhatsApp message</ThemedText>
              <ThemedText type="cardTitle">{lockedOrder.merchant}</ThemedText>
              <ThemedText style={styles.supportText}>
                Please review your purchase.
              </ThemedText>

              {lockedOrder.items.map((item) => (
                <View key={item.key} style={styles.reviewRow}>
                  <ThemedText>
                    {item.name} x {item.quantity}
                  </ThemedText>
                  <ThemedText type="defaultSemiBold">
                    {formatCurrency(item.price * item.quantity)}
                  </ThemedText>
                </View>
              ))}

              <View style={styles.reviewDivider} />
              <View style={styles.reviewRow}>
                <ThemedText type="defaultSemiBold">Total</ThemedText>
                <ThemedText type="defaultSemiBold">
                  {formatCurrency(lockedOrder.total)}
                </ThemedText>
              </View>

              {lockedOrder.status === 'awaiting_customer' ? (
                <View style={styles.orderActionRow}>
                  <AppButton
                    label="Order is incorrect"
                    onPress={unlockOrder}
                    variant="ghost"
                  />
                  <AppButton
                    label="Proceed to payment"
                    onPress={sendToBankApproval}
                  />
                </View>
              ) : null}
            </ThemedView>
          </ThemedView>

          <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="sectionTitle">4. Bank approval</ThemedText>
                <ThemedText style={styles.supportText}>
                  WhatsApp does not authenticate the payment. The bank or PSP does.
                </ThemedText>
              </View>
              <StatusChip
                label={
                  lockedOrder.status === 'awaiting_bank'
                    ? 'awaiting bank approval'
                    : 'bank response'
                }
                tone={getStatusTone(lockedOrder.status)}
              />
            </View>

            <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.bankCard}>
              <ThemedText type="cardLabel">Bank request</ThemedText>
              <ThemedText type="cardTitle">Pay {demoMerchant.name}</ThemedText>
              <ThemedText style={styles.supportText}>
                Amount {formatCurrency(lockedOrder.total)} · Reference {lockedOrder.id}
              </ThemedText>

              {lockedOrder.status === 'awaiting_bank' ? (
                <View style={styles.orderActionRow}>
                  <AppButton label="Approve" onPress={approvePayment} />
                  <AppButton
                    label="Decline"
                    onPress={declinePayment}
                    variant="ghost"
                  />
                </View>
              ) : null}

              {lockedOrder.status === 'declined' ? (
                <ThemedText style={styles.supportText}>
                  The merchant can unlock the order, correct it, or generate a fresh QR.
                </ThemedText>
              ) : null}
            </ThemedView>
          </ThemedView>

          {lockedOrder.status === 'paid' ? (
            <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <ThemedText type="sectionTitle">
                    5. Verified release and receipt
                  </ThemedText>
                  <ThemedText style={styles.supportText}>
                    Only the verified bank response moves the order into the paid state.
                  </ThemedText>
                </View>
                <StatusChip label="paid" tone="success" />
              </View>

              <View style={styles.receiptGrid}>
                <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.receiptCard}>
                  <ThemedText type="cardLabel">Merchant confirmation</ThemedText>
                  <ThemedText type="cardTitle">Payment received</ThemedText>
                  <ThemedText style={styles.supportText}>
                    Order {lockedOrder.id} is verified. You may release the goods.
                  </ThemedText>
                  <ThemedText type="chipLabel">
                    Bank reference {lockedOrder.bankReference}
                  </ThemedText>
                </ThemedView>

                <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.receiptCard}>
                  <ThemedText type="cardLabel">Customer receipt</ThemedText>
                  <ThemedText type="cardTitle">{demoMerchant.name}</ThemedText>
                  {lockedOrder.items.map((item) => (
                    <View key={item.key} style={styles.reviewRow}>
                      <ThemedText>
                        {item.name} x {item.quantity}
                      </ThemedText>
                      <ThemedText type="defaultSemiBold">
                        {formatCurrency(item.price * item.quantity)}
                      </ThemedText>
                    </View>
                  ))}
                  <View style={styles.reviewDivider} />
                  <View style={styles.reviewRow}>
                    <ThemedText type="defaultSemiBold">Total paid</ThemedText>
                    <ThemedText type="defaultSemiBold">
                      {formatCurrency(lockedOrder.total)}
                    </ThemedText>
                  </View>
                  <ThemedText type="chipLabel">
                    Status successful · {lockedOrder.bankReference}
                  </ThemedText>
                </ThemedView>
              </View>

              <AppButton label="Start next customer" onPress={resetDemoCart} />
            </ThemedView>
          ) : null}
        </>
      ) : (
        <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.placeholderCard}>
          <ThemedText type="sectionTitle">Next step</ThemedText>
          <ThemedText style={styles.supportText}>
            Generate the checkout QR to move the order into the customer review and bank
            approval stages.
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView lightColor="#fffaf0" darkColor="#4b3b11" style={styles.trustCard}>
        <ThemedText type="sectionTitle">Trust boundary</ThemedText>
        <ThemedText style={styles.supportText}>
          This MVP deliberately keeps the payment promise narrow and credible.
        </ThemedText>
        {scanToPayData.readiness.map((item) => (
          <View key={item.title} style={styles.trustRow}>
            <ThemedText type="cardTitle">{item.title}</ThemedText>
            <ThemedText style={styles.supportText}>{item.detail}</ThemedText>
          </View>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

function HeroStatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCard}>
      <ThemedText type="chipLabel">{label}</ThemedText>
      <ThemedText type="chipValue">{value}</ThemedText>
    </View>
  );
}

function SourcePill({ source }: { source: DemoSource }) {
  const tone = source === 'catalog' ? 'saved' : source === 'manual' ? 'manual' : 'service';

  return (
    <View style={styles.sourcePill}>
      <ThemedText type="chipLabel">{tone}</ThemedText>
    </View>
  );
}

function QuantityButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.quantityButton,
        pressed && !disabled ? styles.quantityPressed : undefined,
        disabled ? styles.quantityDisabled : undefined,
      ]}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
    </Pressable>
  );
}

function TokenQr({ token }: { token: string }) {
  const cells = useMemo(() => buildQrCells(token), [token]);

  return (
    <View style={styles.qrGrid}>
      {cells.map((filled, index) => (
        <View
          key={`${token}-${index}`}
          style={[styles.qrCell, filled ? styles.qrFilled : undefined]}
        />
      ))}
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
    minWidth: 118,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    gap: 2,
  },
  stepRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    borderRadius: 26,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
    shadowColor: '#0f2d5c',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  placeholderCard: {
    borderRadius: 26,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  trustCard: {
    borderRadius: 26,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 206, 92, 0.2)',
  },
  trustRow: {
    gap: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  sectionCopy: {
    flex: 1,
    gap: 4,
  },
  sectionBlock: {
    gap: 12,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catalogCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 20,
    padding: 16,
    gap: 6,
    borderWidth: 1,
  },
  formGrid: {
    gap: 12,
  },
  formCard: {
    gap: 10,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    fontSize: 15,
  },
  inlineInputs: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
  },
  actionChips: {
    minWidth: 150,
  },
  lineItem: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  lineCopy: {
    flex: 1,
    gap: 4,
  },
  lineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sourcePill: {
    borderRadius: 999,
    backgroundColor: '#edf4fb',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#edf4fb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityPressed: {
    opacity: 0.88,
  },
  quantityDisabled: {
    opacity: 0.42,
  },
  orderActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  qrShell: {
    gap: 18,
  },
  qrCopy: {
    gap: 4,
  },
  qrGrid: {
    width: 198,
    height: 198,
    padding: 12,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  qrCell: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: '#eef3f7',
  },
  qrFilled: {
    backgroundColor: '#15233d',
  },
  whatsappCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: 'rgba(21, 35, 61, 0.08)',
    marginVertical: 4,
  },
  bankCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(105, 198, 61, 0.16)',
  },
  receiptGrid: {
    gap: 12,
  },
  receiptCard: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
});
