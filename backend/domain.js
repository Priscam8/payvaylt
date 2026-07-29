const path = require('path');

const cadenceValues = ['Weekly', 'Fortnightly', 'Monthly'];

const publicCatalog = {
  brand: {
    headline: 'Work towards the goal.',
    tagline: 'Build value. Unlock ownership.',
    summary:
      'PayVaylt is a digital lay-by platform that lets customers secure items today and finish paying at their own pace, within a term they choose up to 12 months.',
  },
  ficaDocuments: [
    {
      title: 'South African ID or passport',
      detail: 'Front and back of ID card or passport identity page.',
    },
    {
      title: 'Proof of address',
      detail: 'Recent utility bill, bank statement, or municipal letter.',
    },
    {
      title: 'Selfie verification',
      detail: 'Face match image used for identity confirmation and fraud checks.',
    },
    {
      title: 'Verification questions',
      detail: 'Customer profile questions confirmed before full dashboard access.',
    },
  ],
  vendors: [
    {
      name: 'Bash Commerce',
      category: 'Fashion and lifestyle',
      integration: 'Checkout redirect API',
      status: 'Ready for plugin integration',
    },
    {
      name: 'Russells',
      category: 'Furniture and appliances',
      integration: 'Reserved-cart feed',
      status: 'Suitable for pilot vendor agreement',
    },
    {
      name: 'Pep Home',
      category: 'Home essentials',
      integration: 'Voucher and lay-by sync',
      status: 'Suitable for low-income household pilot',
    },
    {
      name: 'Exact',
      category: 'Schoolwear and family essentials',
      integration: 'Voucher + release workflow',
      status: 'Live in the interactive demo flow',
    },
  ],
  journeyDemo: {
    merchant: 'Bash Commerce',
    store: 'Exact',
    cartId: 'PV-BASH-20481',
    cartTotal: 2850,
    itemCount: 2,
    leadItem: 'School uniform bundle',
    recommendedDeposit: 450,
    suggestedVoucherUse: 300,
    maxTermMonths: 12,
    reservedUntil: '14 May 2026',
    releaseLeadTime: 'Same day after final payment confirmation',
  },
};

const defaultCustomer = {
  fullName: 'Nandi Mokoena',
  email: 'nandi@example.com',
  mobile: '0825550192',
  password: 'goal2026!',
  idNumber: '9801010123088',
};

const defaultMerchant = {
  companyName: 'Exact Retail',
  workEmail: 'merchant@exact.co.za',
  password: 'merchant2026!',
  vendorNames: publicCatalog.vendors.map((vendor) => vendor.name),
};

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeMobile(value = '') {
  return String(value).replace(/\D+/g, '');
}

function normalizeIdentifier(value = '') {
  const trimmed = String(value).trim();
  return trimmed.includes('@') ? normalizeEmail(trimmed) : normalizeMobile(trimmed);
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function createToken(prefix = 'token') {
  return `${prefix}_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

function createDefaultFicaDocuments(completed = false) {
  return Object.fromEntries(publicCatalog.ficaDocuments.map((item) => [item.title, completed]));
}

function emptyVerificationChecks() {
  return {
    accountCreated: false,
    otpVerified: false,
    questionsPassed: false,
    ficaUploaded: false,
    homeAffairsMatched: false,
  };
}

function completeVerificationChecks() {
  return {
    accountCreated: true,
    otpVerified: true,
    questionsPassed: true,
    ficaUploaded: true,
    homeAffairsMatched: true,
  };
}

function formatCurrency(amount) {
  const hasCents = amount % 1 !== 0;
  return `R ${Number(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

function findCustomerByIdentifier(customers, identifier) {
  const normalized = normalizeIdentifier(identifier);
  return customers.find(
    (customer) =>
      normalizeEmail(customer.email) === normalized || normalizeMobile(customer.mobile) === normalized
  );
}

function createCustomerSession(customer) {
  return {
    id: createId('session'),
    token: createToken('customer'),
    role: 'customer',
    accountId: customer.id,
    displayName: customer.fullName || 'PayVaylt customer',
    identifier: customer.email || customer.mobile,
    createdAt: new Date().toISOString(),
  };
}

function createMerchantSession(merchant) {
  return {
    id: createId('session'),
    token: createToken('merchant'),
    role: 'merchant',
    accountId: merchant.id,
    displayName: merchant.companyName,
    identifier: merchant.workEmail,
    createdAt: new Date().toISOString(),
  };
}

function deriveDashboardStats(plans, vouchers, verificationChecks) {
  const activePlans = plans.filter((plan) => plan.status !== 'Completed');
  const overduePlans = activePlans.filter((plan) => plan.status === 'Payment due').length;
  const reviewPlans = activePlans.filter((plan) => plan.status === 'Merchant review').length;
  const onTrackPlans = activePlans.filter((plan) => plan.status === 'On track').length;
  const securedValue = activePlans.reduce((total, plan) => total + plan.total, 0);
  const voucherBalance = vouchers.reduce((total, voucher) => total + voucher.balance, 0);
  const verificationTotal = Object.keys(verificationChecks).length;
  const verificationCompleted = Object.values(verificationChecks).filter(Boolean).length;
  const verificationPercentage = Math.round((verificationCompleted / verificationTotal) * 100);

  return [
    {
      label: 'Active lay-bys',
      value: String(activePlans.length),
      detail: `${onTrackPlans} on track, ${overduePlans} awaiting payment, ${reviewPlans} under review`,
    },
    {
      label: 'Secured cart value',
      value: formatCurrency(securedValue),
      detail: 'Reserved with partner merchants',
    },
    {
      label: 'Voucher balance',
      value: formatCurrency(voucherBalance),
      detail: 'Store-specific vouchers with no expiry',
    },
    {
      label: 'Verification status',
      value: `${verificationPercentage}%`,
      detail: `${verificationCompleted} of ${verificationTotal} onboarding checks completed`,
    },
  ];
}

function deriveMerchantWorkspace(merchant, database) {
  const merchantNotices = database.notices
    .filter(
      (notice) =>
        notice.audience === 'merchant' &&
        (!notice.merchantAccountId || notice.merchantAccountId === merchant.id)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const merchantPlans = database.plans
    .filter((plan) => merchant.vendorNames.includes(plan.merchant))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  const releaseReady = merchantPlans.filter((plan) => plan.status === 'Completed').length;
  const atRisk = merchantPlans.filter(
    (plan) => plan.status === 'Merchant review' || plan.status === 'Payment due'
  ).length;

  return {
    merchant: {
      id: merchant.id,
      companyName: merchant.companyName,
      workEmail: merchant.workEmail,
      vendorNames: merchant.vendorNames,
    },
    metrics: [
      {
        label: 'Reserved carts',
        value: String(merchantPlans.length),
        detail: 'Across active partner checkouts',
      },
      {
        label: 'Release-ready',
        value: String(releaseReady),
        detail: 'Waiting for final merchant confirmation',
      },
      {
        label: 'At risk',
        value: String(atRisk),
        detail: 'Need replacement, refund, or customer contact',
      },
    ],
    plans: merchantPlans,
    notices: merchantNotices,
    releaseQueue: merchantPlans.filter((plan) => plan.status === 'Completed'),
  };
}

function createSeedDatabase() {
  const seededCustomerId = 'customer-nandi';
  const seededMerchantId = 'merchant-exact';
  const createdAt = '2026-04-17T08:00:00.000Z';

  const customer = {
    ...defaultCustomer,
    id: seededCustomerId,
    createdAt,
    verificationChecks: completeVerificationChecks(),
    ficaDocuments: createDefaultFicaDocuments(true),
  };

  const merchant = {
    ...defaultMerchant,
    id: seededMerchantId,
    createdAt,
  };

  const plans = [
    {
      id: 'plan-1',
      customerId: seededCustomerId,
      merchant: 'Russells',
      item: 'Defy 8kg Front Loader Washing Machine',
      itemCount: 1,
      depositPaid: 1500,
      remaining: 4200,
      total: 5700,
      cadence: 'Monthly',
      termMonths: 6,
      nextPayment: '25 Apr 2026',
      progress: 26,
      status: 'On track',
      payoutMethod: 'Voucher + card top-up',
      cartId: 'CART-PLAN-1',
      createdAt,
    },
    {
      id: 'plan-2',
      customerId: seededCustomerId,
      merchant: 'Pep Home',
      item: 'Queen Bed Base Set',
      itemCount: 1,
      depositPaid: 900,
      remaining: 2100,
      total: 3000,
      cadence: 'Fortnightly',
      termMonths: 3,
      nextPayment: '18 Apr 2026',
      progress: 30,
      status: 'Payment due',
      payoutMethod: 'Direct EFT',
      cartId: 'CART-PLAN-2',
      createdAt,
    },
    {
      id: 'plan-3',
      customerId: seededCustomerId,
      merchant: 'Exact',
      item: 'School uniform bundle',
      itemCount: 1,
      depositPaid: 480,
      remaining: 720,
      total: 1200,
      cadence: 'Monthly',
      termMonths: 4,
      nextPayment: '02 May 2026',
      progress: 40,
      status: 'Merchant review',
      payoutMethod: 'Store voucher',
      cartId: 'CART-PLAN-3',
      createdAt,
    },
  ];

  const vouchers = [
    {
      id: createId('voucher'),
      customerId: seededCustomerId,
      merchant: 'Exact',
      balance: 850,
      expiry: 'No expiry',
      useCase: 'Schoolwear top-up or replacement item',
      createdAt,
    },
    {
      id: createId('voucher'),
      customerId: seededCustomerId,
      merchant: 'Pep Home',
      balance: 450,
      expiry: 'No expiry',
      useCase: 'Home essentials lay-by support',
      createdAt,
    },
  ];

  const notices = [
    {
      id: createId('notice'),
      title: 'Verification complete',
      description: 'Home Affairs matching is complete. Your full PayVaylt customer workspace is unlocked.',
      icon: 'verified-user',
      audience: 'customer',
      customerId: seededCustomerId,
      type: 'verification',
      createdAt,
    },
    {
      id: createId('notice'),
      title: 'Voucher ready for future use',
      description: 'Your Exact voucher balance remains available with no expiry date.',
      icon: 'redeem',
      audience: 'customer',
      customerId: seededCustomerId,
      type: 'voucher',
      createdAt,
    },
    {
      id: createId('notice'),
      title: 'Release-ready queue',
      description: 'Two Exact orders are ready for handoff once the final merchant release is confirmed.',
      icon: 'local-shipping',
      audience: 'merchant',
      merchantAccountId: seededMerchantId,
      type: 'release',
      createdAt,
    },
  ];

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    publicCatalog,
    customers: [customer],
    merchants: [merchant],
    plans,
    vouchers,
    notices,
    payments: [],
    sessions: [],
    otpChallenges: [],
    passwordResetChallenges: [],
  };
}

function resolveDataFile(configuredPath = '') {
  if (!configuredPath) {
    return path.join(__dirname, 'data', 'payvaylt-db.json');
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

module.exports = {
  cadenceValues,
  createCustomerSession,
  createDefaultFicaDocuments,
  createId,
  createMerchantSession,
  createSeedDatabase,
  createToken,
  defaultCustomer,
  defaultMerchant,
  deriveDashboardStats,
  deriveMerchantWorkspace,
  emptyVerificationChecks,
  findCustomerByIdentifier,
  formatCurrency,
  normalizeEmail,
  normalizeIdentifier,
  normalizeMobile,
  publicCatalog,
  resolveDataFile,
};
