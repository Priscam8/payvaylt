export const payvayltData = {
  brand: {
    headline: 'Work towards the goal.',
    tagline: 'Build value. Unlock ownership.',
    summary:
      'PayVaylt is a digital lay-by platform that lets customers secure items today and finish paying at their own pace, within a term they choose up to 12 months.',
  },
  authExperience: {
    customerModes: [
      'Sign in to review active lay-bys, voucher balances, due payments, and account notices.',
      'Create your account in minutes, then move straight into OTP, FICA, and identity verification.',
      'Reset your password securely so you can return to your plans without restarting the journey.',
    ],
    merchantMode:
      'Merchants sign in to monitor reserved carts, release-ready orders, and customer-facing notices from one workspace.',
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
  journeyDemo: {
    vendorSlug: 'exact',
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
  dashboardStats: [
    { label: 'Active lay-bys', value: '12', detail: '8 on track, 2 awaiting payment, 2 under review' },
    { label: 'Secured cart value', value: 'R 84,950', detail: 'Reserved with partner merchants' },
    { label: 'Voucher balance', value: 'R 4,300', detail: 'Store-specific vouchers with no expiry' },
    { label: 'Verification status', value: '82%', detail: 'Home Affairs and FICA checks in progress' },
  ],
  quickActions: [
    {
      icon: 'lock-open',
      title: 'Create lay-by plan',
      description: 'Choose deposit, frequency, and term from 1 to 12 months for a secured cart.',
    },
    {
      icon: 'fact-check',
      title: 'Upload FICA docs',
      description: 'Submit ID, proof of address, and verification answers to unlock full access.',
    },
    {
      icon: 'redeem',
      title: 'Buy store voucher',
      description: 'Purchase non-expiring vendor vouchers for future lay-bys or replacement items.',
    },
    {
      icon: 'campaign',
      title: 'Review merchant notice',
      description: 'See discontinued-item alerts and choose an alternative, voucher, or refund path.',
    },
  ],
  howItWorks: [
    {
      icon: 'shopping-cart',
      step: 'Merchant checkout redirect',
      detail:
        'The customer selects PayVaylt from a vendor checkout and is redirected into a secure PayVaylt session.',
    },
    {
      icon: 'badge',
      step: 'Register and verify',
      detail:
        'New customers sign up, answer verification questions, submit FICA details, and complete identity checks.',
    },
    {
      icon: 'event-repeat',
      step: 'Choose a payment pace',
      detail:
        'The customer sets a deposit, payment frequency, and completion term that suits their cash flow, up to 12 months.',
    },
    {
      icon: 'inventory-2',
      step: 'Track and complete',
      detail:
        'PayVaylt tracks instalments, reminders, vouchers, and merchant notices until the item is released.',
    },
  ],
  activePlans: [
    {
      id: 'plan-1',
      merchant: 'Russells',
      item: 'Defy 8kg Front Loader Washing Machine',
      depositPaid: 'R 1,500',
      remaining: 'R 4,200',
      total: 'R 5,700',
      cadence: 'R 700 monthly',
      chosenTerm: '6 months',
      nextPayment: '25 Apr 2026',
      progress: 26,
      status: 'On track',
      payoutMethod: 'Voucher + card top-up',
    },
    {
      id: 'plan-2',
      merchant: 'Pep Home',
      item: 'Queen Bed Base Set',
      depositPaid: 'R 900',
      remaining: 'R 2,100',
      total: 'R 3,000',
      cadence: 'R 350 every 2 weeks',
      chosenTerm: '3 months',
      nextPayment: '18 Apr 2026',
      progress: 30,
      status: 'Payment due',
      payoutMethod: 'Direct EFT',
    },
    {
      id: 'plan-3',
      merchant: 'Exact',
      item: 'School uniform bundle',
      depositPaid: 'R 480',
      remaining: 'R 720',
      total: 'R 1,200',
      cadence: 'R 180 monthly',
      chosenTerm: '4 months',
      nextPayment: '02 May 2026',
      progress: 40,
      status: 'Merchant review',
      payoutMethod: 'Store voucher',
    },
  ],
  planBuilder: {
    cart: 'Cart from Bash partner checkout',
    itemSummary: '2 items secured, total cart value R 2,850',
    customerChoice: [
      { label: 'Deposit chosen by customer', value: 'R 450 today' },
      { label: 'Flexible cadence', value: 'Weekly, fortnightly, or monthly' },
      { label: 'Completion term', value: 'Any term from 1 to 12 months' },
      { label: 'Release rule', value: 'Goods released only after full payment' },
    ],
  },
  paymentOptions: [
    {
      icon: 'redeem',
      title: 'Store voucher first',
      description: 'Use a vendor-specific voucher as part of the deposit or as an instalment.',
    },
    {
      icon: 'payments',
      title: 'Card or EFT top-up',
      description: 'Mix voucher value with cash payments to keep the plan flexible.',
    },
    {
      icon: 'schedule',
      title: 'Custom reminder schedule',
      description: 'Customers choose due dates that match salary or household cash flow.',
    },
  ],
  exceptions: [
    {
      icon: 'swap-horiz',
      title: 'Item discontinued',
      description:
        'If a merchant stops producing an item, the customer sees alternatives from the same store, a voucher conversion path, and an admin-reviewed refund option.',
    },
    {
      icon: 'update',
      title: 'Late payment recovery',
      description:
        'The system proposes a new pace instead of forcing cancellation immediately, keeping control with the customer.',
    },
    {
      icon: 'notifications-active',
      title: 'Store notification flow',
      description:
        'Partner merchants notify PayVaylt when stock, pricing, or product lines change so customers can act early.',
    },
  ],
  vendors: [
    {
      slug: 'bash-commerce',
      name: 'Bash Commerce',
      category: 'Fashion and lifestyle',
      integration: 'Checkout redirect API',
      status: 'Connected',
    },
    {
      slug: 'russells',
      name: 'Russells',
      category: 'Furniture and appliances',
      integration: 'Reserved-cart feed',
      status: 'Connected',
    },
    {
      slug: 'pep-home',
      name: 'Pep Home',
      category: 'Home essentials',
      integration: 'Voucher and lay-by sync',
      status: 'Connected',
    },
    {
      slug: 'exact',
      name: 'Exact',
      category: 'Schoolwear and family essentials',
      integration: 'Voucher + release workflow',
      status: 'Connected',
    },
  ],
  merchantFlow: [
    {
      icon: 'storefront',
      title: 'Add PayVaylt button',
      detail: 'Merchants place a PayVaylt button at checkout to redirect the user into the lay-by flow.',
    },
    {
      icon: 'inventory-2',
      title: 'Reserve stock',
      detail: 'The merchant reserves the item or SKU while the customer works through the payment plan.',
    },
    {
      icon: 'published-with-changes',
      title: 'Sync notices',
      detail: 'The merchant can flag discontinued items, voucher conversions, and release-ready orders.',
    },
  ],
  merchantDashboard: {
    headline: 'A merchant workspace built for visibility, speed, and trust.',
    summary:
      'Monitor reserved carts, track release timing, and keep customers updated without overloading the team with admin.',
    metrics: [
      { label: 'Reserved carts', value: '128', detail: 'Across active partner checkouts', icon: 'shopping-bag' },
      { label: 'Release-ready', value: '23', detail: 'Waiting for final merchant confirmation', icon: 'verified' },
      { label: 'At risk', value: '7', detail: 'Need replacement, refund, or customer contact', icon: 'warning-amber' },
    ],
    queue: [
      {
        title: 'Release School Uniform Bundle',
        detail: 'Exact order PV-BASH-20481 is fully paid and ready to be released today.',
        icon: 'local-shipping',
      },
      {
        title: 'Approve replacement item',
        detail: 'Russells appliance line has changed. Offer the mapped replacement or voucher value.',
        icon: 'swap-horiz',
      },
      {
        title: 'Send payment reminder',
        detail: 'Three plans need a merchant-approved message before the next instalment cycle.',
        icon: 'mark-email-read',
      },
    ],
    emptyState: {
      title: 'No merchant alerts right now',
      description: 'When carts need release, replacement review, or customer outreach, they will appear here.',
    },
  },
  vouchers: [
    {
      merchant: 'Exact',
      balance: 'R 1,200',
      expiry: 'No expiry',
      useCase: 'Can fund a future school uniform purchase from the same merchant.',
    },
    {
      merchant: 'Russells',
      balance: 'R 2,100',
      expiry: 'No expiry',
      useCase: 'Fallback value if a reserved line is discontinued and the customer chooses another appliance.',
    },
  ],
  verification: {
    status: '3 of 5 checks completed',
    checks: [
      { title: 'Account registration', state: 'Complete', detail: 'Email, mobile number, and password created.' },
      { title: 'Identity verification questions', state: 'Complete', detail: 'Customer profile questions successfully answered.' },
      { title: 'FICA documents', state: 'In review', detail: 'Proof of address uploaded and waiting for approval.' },
      { title: 'Home Affairs match', state: 'Pending', detail: 'Identity number and selfie match still to be confirmed.' },
      { title: 'Fraud and risk screening', state: 'Queued', detail: 'Device trust and merchant risk checks will run after full onboarding.' },
    ],
  },
  controls: [
    {
      icon: 'tune',
      title: 'Customer-led terms',
      description: 'Customers choose how much they pay and how long they need, within platform limits.',
    },
    {
      icon: 'verified-user',
      title: 'Merchant-safe release',
      description: 'Goods stay secured until the lay-by is fully paid and released through the merchant workflow.',
    },
    {
      icon: 'history',
      title: 'Audit trail',
      description: 'Every verification step, plan update, voucher conversion, and merchant notice is logged.',
    },
  ],
  supportFeed: [
    {
      icon: 'description',
      title: 'Verification reminder',
      description: 'Upload a clearer proof-of-address document to unlock full dashboard access.',
    },
    {
      icon: 'inventory',
      title: 'Merchant notice',
      description: 'Your Exact school uniform bundle has a replacement option available in the same store.',
    },
    {
      icon: 'account-balance-wallet',
      title: 'Voucher ready',
      description: 'Your Russells store voucher is available to be applied to a new lay-by immediately.',
    },
  ],
  mvpScope: [
    'Customer registration, login, verification, and dashboard access.',
    'Lay-by plan creation with customer-chosen deposit, cadence, and term up to 12 months.',
    'Store voucher wallet with no-expiry balances for participating merchants.',
    'Merchant integration flow for checkout redirect, item reservation, and discontinued-item notices.',
    'Customer controls for alternative product selection, voucher conversion, and refund review.',
  ],
  nextSteps: [
    'Connect authentication, document upload, and Home Affairs verification services.',
    'Build merchant APIs or plugins for Shopify, WooCommerce, and custom checkout flows.',
    'Add persistent ledgering for lay-by balances, voucher balances, and reconciliation.',
    'Implement notifications, support tooling, and dispute workflows for discontinued items.',
  ],
};
