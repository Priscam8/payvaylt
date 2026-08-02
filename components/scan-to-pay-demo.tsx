import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BrandHeroCard } from '@/components/brand-hero-card';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { scanToPayData } from '@/constants/scan-to-pay-data';
import { useThemeColor } from '@/hooks/use-theme-color';
import {
  payVayltPosApi,
  type PosMerchant,
  type PosOrder,
  type PosOrderItem,
  type PosProduct,
  type PosSource,
  type PosStatus,
} from '@/lib/payvaylt-pos-api';

type BackendMode = 'loading' | 'live' | 'fallback';
type BusyAction = 'generate' | 'cancel' | 'send' | 'approve' | 'decline' | null;

const stepLabels = ['Basket', 'QR', 'WhatsApp', 'Bank', 'Receipt'];

function formatCurrency(amount: number) {
  return `R ${amount.toFixed(2)}`;
}

function formatMoment(value: string | Date) {
  const dateValue = value instanceof Date ? value : new Date(value);

  return `${dateValue.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${dateValue.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function createFallbackMerchant(): PosMerchant {
  return {
    id: 'pos-merchant-thabo',
    name: scanToPayData.demoMerchant.name,
    city: scanToPayData.demoMerchant.city,
    settlement: scanToPayData.demoMerchant.settlement,
    whatsappNumber: '+27 82 555 0142',
    supportLabel: 'WhatsApp order review',
  };
}

function createFallbackProducts(): PosProduct[] {
  return scanToPayData.sampleProducts.map((product, index) => ({
    id: product.id,
    sku: `SKU${String(index + 1).padStart(3, '0')}`,
    name: product.name,
    price: product.price,
    note: product.note,
    active: true,
  }));
}

function sortOrdersByNewest(orders: PosOrder[]) {
  return [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function upsertOrder(orders: PosOrder[], order: PosOrder) {
  return sortOrdersByNewest([order, ...orders.filter((candidate) => candidate.id !== order.id)]).slice(
    0,
    6
  );
}

function createDefaultCart(products: PosProduct[]): PosOrderItem[] {
  const desiredQuantities: Record<string, number> = {
    apple: 2,
    banana: 3,
    orange: 1,
  };
  const seeded = ['apple', 'banana', 'orange']
    .map((productId) => products.find((product) => product.id === productId))
    .filter(Boolean) as PosProduct[];

  const selectedProducts = seeded.length > 0 ? seeded : products.slice(0, 3);

  return selectedProducts.map((product, index) => ({
    key: product.id,
    name: product.name,
    price: product.price,
    quantity: desiredQuantities[product.id] ?? (index === 0 ? 2 : 1),
    source: 'catalog',
    note: product.note,
  }));
}

function calculateTotal(items: PosOrderItem[]) {
  return Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
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

function createLocalOrder(merchant: PosMerchant, items: PosOrderItem[]): PosOrder {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const orderId = createOrderId();

  return {
    id: orderId,
    token: createCheckoutToken(orderId),
    merchantId: merchant.id,
    merchantName: merchant.name,
    items: items.map((item) => ({ ...item })),
    total: calculateTotal(items),
    createdAt,
    expiresAt,
    status: 'awaiting_customer',
    receiptChannel: 'WhatsApp',
    history: [
      {
        status: 'awaiting_customer',
        at: createdAt,
        note: 'Merchant generated a checkout QR.',
      },
    ],
  };
}

function updateLocalOrder(
  order: PosOrder,
  status: PosStatus,
  note: string,
  extras: Partial<PosOrder> = {}
): PosOrder {
  return {
    ...order,
    ...extras,
    status,
    history: [
      ...order.history,
      {
        status,
        at: new Date().toISOString(),
        note,
      },
    ],
  };
}

function buildFallbackRecentOrders(merchant: PosMerchant): PosOrder[] {
  const paidOrderId = 'ORD-FRUIT01';
  const declinedOrderId = 'ORD-SERVICE1';

  return sortOrdersByNewest([
    {
      id: paidOrderId,
      token: createCheckoutToken(paidOrderId),
      merchantId: merchant.id,
      merchantName: merchant.name,
      items: [
        {
          key: 'seed-apple',
          name: 'Apple',
          price: 5,
          quantity: 2,
          source: 'catalog',
          note: 'Fixed-price produce line',
        },
        {
          key: 'seed-banana',
          name: 'Banana',
          price: 4,
          quantity: 3,
          source: 'catalog',
          note: 'Fast-moving low-ticket item',
        },
      ],
      total: 22,
      createdAt: '2026-08-01T08:42:00.000Z',
      expiresAt: '2026-08-01T08:47:00.000Z',
      status: 'paid',
      bankReference: createBankReference(paidOrderId),
      receiptChannel: 'WhatsApp',
      history: [
        {
          status: 'awaiting_customer',
          at: '2026-08-01T08:42:00.000Z',
          note: 'Merchant generated a checkout QR.',
        },
        {
          status: 'awaiting_bank',
          at: '2026-08-01T08:43:00.000Z',
          note: 'Customer approved the basket in WhatsApp and moved to bank approval.',
        },
        {
          status: 'paid',
          at: '2026-08-01T08:44:00.000Z',
          note: 'Bank confirmed the payment and released the receipt.',
        },
      ],
    },
    {
      id: declinedOrderId,
      token: createCheckoutToken(declinedOrderId),
      merchantId: merchant.id,
      merchantName: merchant.name,
      items: [
        {
          key: 'seed-service',
          name: 'Haircut',
          price: 150,
          quantity: 1,
          source: 'service',
          note: 'Quick amount mode',
        },
      ],
      total: 150,
      createdAt: '2026-08-01T10:18:00.000Z',
      expiresAt: '2026-08-01T10:23:00.000Z',
      status: 'declined',
      declineReason: 'Customer declined the request in the banking app.',
      receiptChannel: 'WhatsApp',
      history: [
        {
          status: 'awaiting_customer',
          at: '2026-08-01T10:18:00.000Z',
          note: 'Merchant generated a checkout QR.',
        },
        {
          status: 'awaiting_bank',
          at: '2026-08-01T10:19:00.000Z',
          note: 'Customer approved the basket in WhatsApp and moved to bank approval.',
        },
        {
          status: 'declined',
          at: '2026-08-01T10:20:00.000Z',
          note: 'Customer declined the request in the banking app.',
        },
      ],
    },
  ]);
}

function getStatusTone(status: PosStatus) {
  if (status === 'paid') return 'success';
  if (status === 'declined' || status === 'cancelled') return 'warning';
  return 'info';
}

function formatStatus(status: PosStatus) {
  return status.replace(/_/g, ' ');
}

function buildQrCells(seed: string) {
  const cells: boolean[] = [];

  for (let index = 0; index < 81; index += 1) {
    const code = seed.charCodeAt(index % seed.length);
    cells.push((code + index * 11) % 5 !== 0);
  }

  const markers = [
    0, 1, 2, 9, 11, 18, 19, 20, 6, 7, 8, 15, 17, 24, 25, 26, 54, 55, 56, 63, 65,
    72, 73, 74,
  ];

  markers.forEach((marker) => {
    cells[marker] = true;
  });

  return cells;
}

const fallbackMerchant = createFallbackMerchant();
const fallbackProducts = createFallbackProducts();

export function ScanToPayDemo() {
  const surface = useThemeColor({ light: '#ffffff', dark: '#10213a' }, 'surface');
  const mutedSurface = useThemeColor({ light: '#f6f9fc', dark: '#183255' }, 'surfaceMuted');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');

  const [backendMode, setBackendMode] = useState<BackendMode>('loading');
  const [serviceNote, setServiceNote] = useState('Connecting to the POS service...');
  const [merchant, setMerchant] = useState<PosMerchant>(fallbackMerchant);
  const [products, setProducts] = useState<PosProduct[]>(fallbackProducts);
  const [recentOrders, setRecentOrders] = useState<PosOrder[]>(buildFallbackRecentOrders(fallbackMerchant));
  const [cart, setCart] = useState<PosOrderItem[]>(() => createDefaultCart(fallbackProducts));
  const [manualName, setManualName] = useState('Tomatoes');
  const [manualPrice, setManualPrice] = useState('8');
  const [manualQuantity, setManualQuantity] = useState('2');
  const [serviceName, setServiceName] = useState('Haircut');
  const [serviceAmount, setServiceAmount] = useState('150');
  const [lockedOrder, setLockedOrder] = useState<PosOrder | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapPos() {
      try {
        const payload = await payVayltPosApi.bootstrap();
        if (cancelled) return;

        setMerchant(payload.merchant);
        setProducts(payload.products);
        setRecentOrders(payload.recentOrders);
        setCart(createDefaultCart(payload.products));
        setBackendMode('live');
        setServiceNote('Persisted POS mode is connected. Orders and payment states now survive reloads.');
      } catch {
        if (cancelled) return;

        setMerchant(fallbackMerchant);
        setProducts(fallbackProducts);
        setRecentOrders(buildFallbackRecentOrders(fallbackMerchant));
        setCart(createDefaultCart(fallbackProducts));
        setBackendMode('fallback');
        setServiceNote(
          'The backend is not available, so this screen is showing the built-in investor demo. Start the POS service to save order history.'
        );
      }
    }

    void bootstrapPos();

    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => calculateTotal(cart), [cart]);
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
  const interactionLocked = backendMode === 'loading' || busyAction !== null;

  function resetDraftCart(nextProducts = products) {
    setLockedOrder(null);
    setCart(createDefaultCart(nextProducts));
    setManualName('Tomatoes');
    setManualPrice('8');
    setManualQuantity('2');
    setServiceName('Haircut');
    setServiceAmount('150');
  }

  function updateQuantity(key: string, delta: number) {
    if (orderLocked || interactionLocked) return;

    setCart((current) =>
      current
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function addCatalogItem(productId: string) {
    if (orderLocked || interactionLocked) return;

    const product = products.find((entry) => entry.id === productId);
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
    if (!manualReady || orderLocked || interactionLocked) return;

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
    if (!serviceReady || orderLocked || interactionLocked) return;

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

  async function generateCheckoutQr() {
    if (cart.length === 0 || orderLocked || interactionLocked) return;

    setBusyAction('generate');

    try {
      if (backendMode === 'live') {
        const result = await payVayltPosApi.createOrder(cart);
        setLockedOrder(result.order);
        setRecentOrders(result.recentOrders);
        setServiceNote('The checkout QR is live and the order is locked for customer review.');
      } else {
        const nextOrder = createLocalOrder(merchant, cart);
        setLockedOrder(nextOrder);
        setRecentOrders((current) => upsertOrder(current, nextOrder));
        setServiceNote('Investor demo mode generated a temporary checkout token.');
      }
    } catch (error) {
      setServiceNote(error instanceof Error ? error.message : 'Could not generate the checkout QR.');
    } finally {
      setBusyAction(null);
    }
  }

  async function cancelLockedOrder() {
    if (!lockedOrder || interactionLocked) return;

    if (lockedOrder.status === 'paid') {
      resetDraftCart();
      setServiceNote('The paid receipt has been archived and the next customer basket is ready.');
      return;
    }

    setBusyAction('cancel');

    try {
      if (backendMode === 'live') {
        const result = await payVayltPosApi.cancelOrder(lockedOrder.id);
        setRecentOrders(result.recentOrders);
        setServiceNote('The previous checkout was cancelled and the merchant can edit the basket again.');
      } else {
        const cancelledOrder = updateLocalOrder(
          lockedOrder,
          'cancelled',
          'Merchant cancelled the checkout before settlement.'
        );
        setRecentOrders((current) => upsertOrder(current, cancelledOrder));
        setServiceNote('The investor demo cancelled the checkout and reopened the basket.');
      }

      resetDraftCart();
    } catch (error) {
      setServiceNote(error instanceof Error ? error.message : 'Could not cancel that checkout.');
    } finally {
      setBusyAction(null);
    }
  }

  async function sendToBankApproval() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_customer' || interactionLocked) return;

    setBusyAction('send');

    try {
      if (backendMode === 'live') {
        const result = await payVayltPosApi.sendToBank(lockedOrder.id);
        setLockedOrder(result.order);
        setRecentOrders(result.recentOrders);
      } else {
        const nextOrder = updateLocalOrder(
          lockedOrder,
          'awaiting_bank',
          'Customer approved the basket in WhatsApp and moved to bank approval.'
        );
        setLockedOrder(nextOrder);
        setRecentOrders((current) => upsertOrder(current, nextOrder));
      }

      setServiceNote('The customer has accepted the basket and the bank approval request is now pending.');
    } catch (error) {
      setServiceNote(
        error instanceof Error ? error.message : 'Could not move the order into bank approval.'
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function approvePayment() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_bank' || interactionLocked) return;

    setBusyAction('approve');

    try {
      if (backendMode === 'live') {
        const result = await payVayltPosApi.resolvePayment(lockedOrder.id, 'paid');
        setLockedOrder(result.order);
        setRecentOrders(result.recentOrders);
      } else {
        const nextOrder = updateLocalOrder(
          lockedOrder,
          'paid',
          'Bank confirmed the payment and released the receipt.',
          {
            bankReference: createBankReference(lockedOrder.id),
            declineReason: undefined,
          }
        );
        setLockedOrder(nextOrder);
        setRecentOrders((current) => upsertOrder(current, nextOrder));
      }

      setServiceNote('The payment is now verified and the merchant can release the goods.');
    } catch (error) {
      setServiceNote(error instanceof Error ? error.message : 'Could not confirm the payment.');
    } finally {
      setBusyAction(null);
    }
  }

  async function declinePayment() {
    if (!lockedOrder || lockedOrder.status !== 'awaiting_bank' || interactionLocked) return;

    setBusyAction('decline');

    try {
      if (backendMode === 'live') {
        const result = await payVayltPosApi.resolvePayment(lockedOrder.id, 'declined');
        setLockedOrder(result.order);
        setRecentOrders(result.recentOrders);
      } else {
        const nextOrder = updateLocalOrder(
          lockedOrder,
          'declined',
          'Customer declined the request in the banking app.',
          {
            bankReference: undefined,
            declineReason: 'Customer declined the request in the banking app.',
          }
        );
        setLockedOrder(nextOrder);
        setRecentOrders((current) => upsertOrder(current, nextOrder));
      }

      setServiceNote('The bank request was declined. The merchant can now correct the basket or regenerate a new QR.');
    } catch (error) {
      setServiceNote(error instanceof Error ? error.message : 'Could not mark the payment as declined.');
    } finally {
      setBusyAction(null);
    }
  }

  const statusTone =
    backendMode === 'live' ? 'success' : backendMode === 'fallback' ? 'warning' : 'info';
  const statusLabel =
    backendMode === 'live'
      ? 'persisted POS service'
      : backendMode === 'fallback'
        ? 'offline investor demo'
        : 'connecting service';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BrandHeroCard
        eyebrow="Live investor walkthrough"
        title="Merchant to WhatsApp to bank approval."
        description="This demo shows the strongest MVP path: the vendor builds the basket, generates one checkout QR, the customer reviews in WhatsApp, and the bank confirms payment.">
        <View style={styles.heroStats}>
          <HeroStatCard label="Merchant" value={merchant.name} />
          <HeroStatCard label="Demo basket" value={formatCurrency(total)} />
          <HeroStatCard label="Settlement" value="Bank-led" />
        </View>
      </BrandHeroCard>

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.stateCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <ThemedText type="sectionTitle">POS service state</ThemedText>
            <ThemedText style={styles.supportText}>{serviceNote}</ThemedText>
          </View>
          <StatusChip label={statusLabel} tone={statusTone} />
        </View>
        {backendMode === 'loading' ? <ActivityIndicator color={accentColor} /> : null}
      </ThemedView>

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
            <StatusChip label={formatStatus(lockedOrder.status)} tone={getStatusTone(lockedOrder.status)} />
          ) : (
            <StatusChip label="draft order" />
          )}
        </View>

        <View style={styles.sectionBlock}>
          <ThemedText type="cardLabel">Saved fruit catalogue</ThemedText>
          <View style={styles.catalogGrid}>
            {products
              .filter((product) => product.active !== false)
              .map((product) => (
                <Pressable
                  key={product.id}
                  disabled={orderLocked || interactionLocked}
                  onPress={() => addCatalogItem(product.id)}
                  style={({ pressed }) => [
                    styles.catalogCard,
                    {
                      backgroundColor: mutedSurface,
                      borderColor,
                      opacity: orderLocked || interactionLocked ? 0.5 : pressed ? 0.9 : 1,
                    },
                  ]}>
                  <ThemedText type="cardTitle">{product.name}</ThemedText>
                  <ThemedText style={styles.supportText}>{formatCurrency(product.price)}</ThemedText>
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
              editable={!orderLocked && !interactionLocked}
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
                editable={!orderLocked && !interactionLocked}
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
                editable={!orderLocked && !interactionLocked}
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
              disabled={!manualReady || orderLocked || interactionLocked}
              variant="secondary"
            />
          </View>

          <View style={styles.formCard}>
            <ThemedText type="cardLabel">Quick amount mode</ThemedText>
            <TextInput
              value={serviceName}
              onChangeText={setServiceName}
              editable={!orderLocked && !interactionLocked}
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
              editable={!orderLocked && !interactionLocked}
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
              disabled={!serviceReady || orderLocked || interactionLocked}
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
              <AppButton
                label={busyAction === 'cancel' ? 'Cancelling...' : 'Reload fruit demo'}
                onPress={cancelLockedOrder}
                disabled={interactionLocked}
                variant="ghost"
              />
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
                  disabled={orderLocked || interactionLocked}
                />
                <ThemedText type="chipValue">{item.quantity}</ThemedText>
                <QuantityButton
                  label="+"
                  onPress={() => updateQuantity(item.key, 1)}
                  disabled={orderLocked || interactionLocked}
                />
              </View>
            </View>
          ))}

          <View style={styles.orderActionRow}>
            <AppButton
              label={busyAction === 'generate' ? 'Generating...' : 'Generate checkout QR'}
              onPress={generateCheckoutQr}
              disabled={cart.length === 0 || orderLocked || interactionLocked}
            />
            {lockedOrder ? (
              <AppButton
                label={busyAction === 'cancel' ? 'Cancelling...' : 'Unlock and edit'}
                onPress={cancelLockedOrder}
                disabled={interactionLocked}
                variant="ghost"
              />
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
                  One-time token linked to a locked server-side order. The QR expires in five minutes.
                </ThemedText>
              </View>
              <StatusChip label={formatStatus(lockedOrder.status)} tone={getStatusTone(lockedOrder.status)} />
            </View>

            <View style={styles.qrShell}>
              <TokenQr token={lockedOrder.token} />
              <View style={styles.qrCopy}>
                <ThemedText type="cardLabel">Order</ThemedText>
                <ThemedText type="balance">{lockedOrder.id}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {merchant.name} · {merchant.city}
                </ThemedText>
                <ThemedText style={styles.supportText}>
                  Created {formatMoment(lockedOrder.createdAt)}
                </ThemedText>
                <ThemedText style={styles.supportText}>
                  Expires {formatMoment(lockedOrder.expiresAt)}
                </ThemedText>
                <ThemedText type="chipLabel">Checkout token {lockedOrder.token}</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.panel}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="sectionTitle">3. Customer reviews in WhatsApp</ThemedText>
                <ThemedText style={styles.supportText}>
                  The customer sees the merchant name, every line item, and the total before proceeding.
                </ThemedText>
              </View>
              <StatusChip label="WhatsApp review" tone="info" />
            </View>

            <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.whatsappCard}>
              <ThemedText type="cardLabel">WhatsApp message</ThemedText>
              <ThemedText type="cardTitle">{lockedOrder.merchantName}</ThemedText>
              <ThemedText style={styles.supportText}>Please review your purchase.</ThemedText>

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
                <ThemedText type="defaultSemiBold">{formatCurrency(lockedOrder.total)}</ThemedText>
              </View>

              {lockedOrder.status === 'awaiting_customer' ? (
                <View style={styles.orderActionRow}>
                  <AppButton
                    label={busyAction === 'cancel' ? 'Cancelling...' : 'Order is incorrect'}
                    onPress={cancelLockedOrder}
                    disabled={interactionLocked}
                    variant="ghost"
                  />
                  <AppButton
                    label={busyAction === 'send' ? 'Sending...' : 'Proceed to payment'}
                    onPress={sendToBankApproval}
                    disabled={interactionLocked}
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
                  lockedOrder.status === 'awaiting_bank' ? 'awaiting bank approval' : 'bank response'
                }
                tone={getStatusTone(lockedOrder.status)}
              />
            </View>

            <ThemedView lightColor="#f8fbf5" darkColor="#15321d" style={styles.bankCard}>
              <ThemedText type="cardLabel">Bank request</ThemedText>
              <ThemedText type="cardTitle">Pay {merchant.name}</ThemedText>
              <ThemedText style={styles.supportText}>
                Amount {formatCurrency(lockedOrder.total)} · Reference {lockedOrder.id}
              </ThemedText>

              {lockedOrder.status === 'awaiting_bank' ? (
                <View style={styles.orderActionRow}>
                  <AppButton
                    label={busyAction === 'approve' ? 'Approving...' : 'Approve'}
                    onPress={approvePayment}
                    disabled={interactionLocked}
                  />
                  <AppButton
                    label={busyAction === 'decline' ? 'Declining...' : 'Decline'}
                    onPress={declinePayment}
                    disabled={interactionLocked}
                    variant="ghost"
                  />
                </View>
              ) : null}

              {lockedOrder.status === 'declined' ? (
                <ThemedText style={styles.supportText}>
                  {lockedOrder.declineReason ?? 'The merchant can unlock the order, correct it, or generate a fresh QR.'}
                </ThemedText>
              ) : null}
            </ThemedView>
          </ThemedView>

          {lockedOrder.status === 'paid' ? (
            <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionCopy}>
                  <ThemedText type="sectionTitle">5. Verified release and receipt</ThemedText>
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
                  <ThemedText type="chipLabel">Bank reference {lockedOrder.bankReference}</ThemedText>
                </ThemedView>

                <ThemedView lightColor="#f8fbfe" darkColor="#16315a" style={styles.receiptCard}>
                  <ThemedText type="cardLabel">Customer receipt</ThemedText>
                  <ThemedText type="cardTitle">{merchant.name}</ThemedText>
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
                    <ThemedText type="defaultSemiBold">{formatCurrency(lockedOrder.total)}</ThemedText>
                  </View>
                  <ThemedText type="chipLabel">
                    Status successful · {lockedOrder.bankReference}
                  </ThemedText>
                </ThemedView>
              </View>

              <AppButton label="Start next customer" onPress={cancelLockedOrder} />
            </ThemedView>
          ) : null}
        </>
      ) : (
        <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.placeholderCard}>
          <ThemedText type="sectionTitle">Next step</ThemedText>
          <ThemedText style={styles.supportText}>
            Generate the checkout QR to move the order into the customer review and bank approval stages.
          </ThemedText>
        </ThemedView>
      )}

      <ThemedView lightColor="#ffffff" darkColor="#10213a" style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <ThemedText type="sectionTitle">Recent transaction history</ThemedText>
            <ThemedText style={styles.supportText}>
              This is the merchant-facing history that investors can use to see locked orders, bank outcomes, and proof of payment.
            </ThemedText>
          </View>
          <StatusChip label={`${recentOrders.length} recent`} tone="info" />
        </View>

        {recentOrders.map((order) => (
          <View key={order.id} style={[styles.historyCard, { borderColor }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionCopy}>
                <ThemedText type="cardTitle">{order.id}</ThemedText>
                <ThemedText style={styles.supportText}>
                  {order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                </ThemedText>
              </View>
              <StatusChip label={formatStatus(order.status)} tone={getStatusTone(order.status)} />
            </View>

            <View style={styles.historyMetaRow}>
              <HeroStatCard label="Total" value={formatCurrency(order.total)} />
              <HeroStatCard label="Created" value={formatMoment(order.createdAt)} />
            </View>

            <ThemedText type="chipLabel">Token {order.token}</ThemedText>
            <ThemedText style={styles.supportText}>
              {order.history[order.history.length - 1]?.note ?? 'No history note available.'}
            </ThemedText>
            {order.bankReference ? (
              <ThemedText type="chipLabel">Bank reference {order.bankReference}</ThemedText>
            ) : null}
            {order.declineReason ? (
              <ThemedText style={styles.supportText}>{order.declineReason}</ThemedText>
            ) : null}
          </View>
        ))}
      </ThemedView>

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

function SourcePill({ source }: { source: PosSource }) {
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
  stateCard: {
    borderRadius: 26,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(21, 35, 61, 0.06)',
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
  historyCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  historyMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  supportText: {
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.76,
  },
});
