const posStatusValues = [
  'awaiting_customer',
  'awaiting_bank',
  'paid',
  'declined',
  'cancelled',
];

const posMerchant = {
  id: 'pos-merchant-thabo',
  name: 'Thabo Fruit Stall',
  city: 'Johannesburg',
  settlement: 'Linked bank account or ShapID',
  whatsappNumber: '+27 82 555 0142',
  supportLabel: 'WhatsApp order review',
};

const posProducts = [
  {
    id: 'apple',
    sku: 'APP001',
    name: 'Apple',
    price: 5,
    note: 'Fixed-price produce line',
    active: true,
  },
  {
    id: 'banana',
    sku: 'BAN001',
    name: 'Banana',
    price: 4,
    note: 'Fast-moving low-ticket item',
    active: true,
  },
  {
    id: 'orange',
    sku: 'ORG001',
    name: 'Orange',
    price: 6,
    note: 'Fixed-price produce line',
    active: true,
  },
];

function createPosToken(orderId) {
  return `CHK-${orderId.replace('ORD-', '')}`;
}

function createBankReference(orderId) {
  return `PSH-${orderId.replace('ORD-', '')}`;
}

function calculateOrderTotal(items = []) {
  return Number(
    items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0).toFixed(2)
  );
}

function sortOrdersByNewest(orders = []) {
  return [...orders].sort((left, right) => {
    const leftValue = left.createdAt ?? '';
    const rightValue = right.createdAt ?? '';
    return rightValue.localeCompare(leftValue);
  });
}

function createSeedPosState() {
  const paidOrderId = 'ORD-FRUIT01';
  const declinedOrderId = 'ORD-SERVICE1';

  return {
    merchant: { ...posMerchant },
    products: posProducts.map((product) => ({ ...product })),
    orders: sortOrdersByNewest([
      {
        id: paidOrderId,
        token: createPosToken(paidOrderId),
        merchantId: posMerchant.id,
        merchantName: posMerchant.name,
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
        createdAt: '2026-07-31T08:42:00.000Z',
        expiresAt: '2026-07-31T08:47:00.000Z',
        status: 'paid',
        bankReference: createBankReference(paidOrderId),
        receiptChannel: 'WhatsApp',
        history: [
          {
            status: 'awaiting_customer',
            at: '2026-07-31T08:42:00.000Z',
            note: 'Merchant generated a checkout QR.',
          },
          {
            status: 'awaiting_bank',
            at: '2026-07-31T08:43:00.000Z',
            note: 'Customer approved the basket in WhatsApp and moved to bank approval.',
          },
          {
            status: 'paid',
            at: '2026-07-31T08:44:00.000Z',
            note: 'Bank confirmed the payment and released the receipt.',
          },
        ],
      },
      {
        id: declinedOrderId,
        token: createPosToken(declinedOrderId),
        merchantId: posMerchant.id,
        merchantName: posMerchant.name,
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
        createdAt: '2026-07-31T10:18:00.000Z',
        expiresAt: '2026-07-31T10:23:00.000Z',
        status: 'declined',
        declineReason: 'Customer declined the request in the banking app.',
        receiptChannel: 'WhatsApp',
        history: [
          {
            status: 'awaiting_customer',
            at: '2026-07-31T10:18:00.000Z',
            note: 'Merchant generated a checkout QR.',
          },
          {
            status: 'awaiting_bank',
            at: '2026-07-31T10:19:00.000Z',
            note: 'Customer approved the basket in WhatsApp and moved to bank approval.',
          },
          {
            status: 'declined',
            at: '2026-07-31T10:20:00.000Z',
            note: 'Customer declined the request in the banking app.',
          },
        ],
      },
    ]),
  };
}

function normalizePosDatabaseState(input) {
  const seeded = createSeedPosState();

  return {
    merchant: {
      ...seeded.merchant,
      ...(input?.merchant ?? {}),
    },
    products: Array.isArray(input?.products)
      ? input.products.map((product, index) => ({
          ...seeded.products[index % seeded.products.length],
          ...product,
        }))
      : seeded.products.map((product) => ({ ...product })),
    orders: sortOrdersByNewest(
      Array.isArray(input?.orders)
        ? input.orders.map((order) => ({
            receiptChannel: 'WhatsApp',
            history: Array.isArray(order.history) ? order.history : [],
            ...order,
          }))
        : seeded.orders.map((order) => ({
            ...order,
            items: order.items.map((item) => ({ ...item })),
            history: order.history.map((entry) => ({ ...entry })),
          }))
    ),
  };
}

function createPosOrder(orderId, merchant, items) {
  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  return {
    id: orderId,
    token: createPosToken(orderId),
    merchantId: merchant.id,
    merchantName: merchant.name,
    items: items.map((item) => ({
      key: item.key,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      source: item.source,
      note: item.note,
    })),
    total: calculateOrderTotal(items),
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

function applyOrderStatus(order, status, note, extras = {}) {
  return {
    ...order,
    ...extras,
    status,
    history: [
      ...(Array.isArray(order.history) ? order.history : []),
      {
        status,
        at: new Date().toISOString(),
        note,
      },
    ],
  };
}

function getRecentPosOrders(posState, limit = 6) {
  return sortOrdersByNewest(posState?.orders ?? []).slice(0, limit);
}

module.exports = {
  applyOrderStatus,
  createBankReference,
  createPosOrder,
  createSeedPosState,
  getRecentPosOrders,
  normalizePosDatabaseState,
  posMerchant,
  posProducts,
  posStatusValues,
  sortOrdersByNewest,
};
