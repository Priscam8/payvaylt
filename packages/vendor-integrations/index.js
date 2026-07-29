function slugifyVendor(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createAdapter(definition) {
  return {
    definition,
    async createReservation(payload) {
      return {
        externalReference: `${definition.slug.toUpperCase().slice(0, 5)}-${Date.now()}`,
        status: 'reserved',
        reservedUntil: addDays(definition.defaultReservationDays || 14),
        metadata: {
          adapter: definition.slug,
          flow: definition.integration,
          cartId: payload.cartId,
          leadItem: payload.itemName,
          customerIdentifier: payload.customerIdentifier || null,
        },
      };
    },
    async syncVoucherAccount(payload) {
      const nextBalance = Number(
        (Number(payload.currentBalance || 0) + Number(payload.amount || 0)).toFixed(2)
      );

      return {
        balance: nextBalance,
        currency: 'ZAR',
        status: 'active',
        expiresAt: definition.voucherExpiry || 'No expiry',
        metadata: {
          adapter: definition.slug,
          lastRequestedAmount: Number(payload.amount || 0),
          useCase: payload.useCase || '',
        },
      };
    },
    createCatalogRecords() {
      return definition.catalog.map((item) => ({
        ...item,
        metadata: {
          vendorSlug: definition.slug,
          ...(item.metadata || {}),
        },
      }));
    },
  };
}

const adapters = [
  createAdapter({
    slug: 'bash-commerce',
    name: 'Bash Commerce',
    category: 'Fashion and lifestyle',
    integration: 'Checkout redirect API',
    status: 'Connected',
    defaultReservationDays: 10,
    voucherExpiry: 'No expiry',
    capabilities: {
      checkoutRedirect: true,
      stockReservation: true,
      voucherSync: false,
      releaseWebhook: true,
    },
    metadata: {
      channel: 'commerce-suite',
      supportLevel: 'pilot-ready',
    },
    catalog: [
      {
        sku: 'BASH-SCH-001',
        name: 'School uniform bundle',
        description: 'Full uniform starter bundle reserved through Bash partner checkout.',
        price: 2850,
        stockQuantity: 18,
        availabilityStatus: 'available',
      },
      {
        sku: 'BASH-HME-002',
        name: 'Family cookware bundle',
        description: 'Kitchen starter bundle for household lay-by plans.',
        price: 1899,
        stockQuantity: 12,
        availabilityStatus: 'available',
      },
    ],
  }),
  createAdapter({
    slug: 'exact',
    name: 'Exact',
    category: 'Schoolwear and family essentials',
    integration: 'Voucher + release workflow',
    status: 'Connected',
    defaultReservationDays: 14,
    voucherExpiry: 'No expiry',
    capabilities: {
      checkoutRedirect: true,
      stockReservation: true,
      voucherSync: true,
      releaseWebhook: true,
    },
    metadata: {
      channel: 'retail-store',
      supportLevel: 'live-demo',
    },
    catalog: [
      {
        sku: 'EXACT-SCH-101',
        name: 'Exact school uniform bundle',
        description: 'Blazer, shirts, trousers, and shoes matched to school essentials.',
        price: 1200,
        stockQuantity: 24,
        availabilityStatus: 'available',
      },
      {
        sku: 'EXACT-KDS-205',
        name: 'Kids seasonal essentials pack',
        description: 'Family clothing pack aligned to voucher-backed lay-by flows.',
        price: 950,
        stockQuantity: 16,
        availabilityStatus: 'available',
      },
    ],
  }),
  createAdapter({
    slug: 'russells',
    name: 'Russells',
    category: 'Furniture and appliances',
    integration: 'Reserved-cart feed',
    status: 'Connected',
    defaultReservationDays: 21,
    voucherExpiry: '12 months',
    capabilities: {
      checkoutRedirect: false,
      stockReservation: true,
      voucherSync: true,
      releaseWebhook: false,
    },
    metadata: {
      channel: 'appliance-retail',
      supportLevel: 'pilot-ready',
    },
    catalog: [
      {
        sku: 'RUSS-APP-301',
        name: 'Defy 8kg Front Loader Washing Machine',
        description: 'Appliance reservation feed for managed release after final payment.',
        price: 5700,
        stockQuantity: 7,
        availabilityStatus: 'available',
      },
      {
        sku: 'RUSS-FUR-302',
        name: 'Lounge suite starter set',
        description: 'Voucher-assisted furniture lay-by package.',
        price: 8200,
        stockQuantity: 5,
        availabilityStatus: 'limited',
      },
    ],
  }),
  createAdapter({
    slug: 'pep-home',
    name: 'Pep Home',
    category: 'Home essentials',
    integration: 'Voucher and lay-by sync',
    status: 'Connected',
    defaultReservationDays: 14,
    voucherExpiry: 'No expiry',
    capabilities: {
      checkoutRedirect: false,
      stockReservation: true,
      voucherSync: true,
      releaseWebhook: false,
    },
    metadata: {
      channel: 'home-retail',
      supportLevel: 'community-pilot',
    },
    catalog: [
      {
        sku: 'PEP-BED-401',
        name: 'Queen Bed Base Set',
        description: 'Household essentials bundle with voucher sync support.',
        price: 3000,
        stockQuantity: 11,
        availabilityStatus: 'available',
      },
      {
        sku: 'PEP-HME-402',
        name: 'Starter home linen pack',
        description: 'Low-ticket voucher-backed linen essentials.',
        price: 650,
        stockQuantity: 21,
        availabilityStatus: 'available',
      },
    ],
  }),
];

const adapterMap = new Map(adapters.map((adapter) => [adapter.definition.slug, adapter]));

function listVendorDefinitions() {
  return adapters.map((adapter) => adapter.definition);
}

function getVendorAdapter(slugOrName) {
  const directMatch = adapterMap.get(slugifyVendor(slugOrName));
  if (directMatch) {
    return directMatch;
  }

  return (
    adapters.find((adapter) => slugifyVendor(adapter.definition.name) === slugifyVendor(slugOrName)) ||
    null
  );
}

module.exports = {
  getVendorAdapter,
  listVendorDefinitions,
  slugifyVendor,
};
