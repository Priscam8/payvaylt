export const scanToPayData = {
  brand: {
    name: 'PayVaylt POS',
    headline: 'WhatsApp scan-to-pay checkout for small and informal merchants.',
    summary:
      'Merchants build the order, generate one secure checkout QR, customers review inside WhatsApp, and the bank confirms payment without the platform holding funds.',
  },
  investorStats: [
    {
      label: 'Checkout model',
      value: '1 QR per order',
      detail: 'Faster than product-by-product customer scanning at the counter.',
    },
    {
      label: 'Trust model',
      value: 'Bank-authenticated',
      detail: 'The bank approves the payment while the POS handles the commerce flow.',
    },
    {
      label: 'Funds held',
      value: 'R 0',
      detail: 'Money moves from the customer bank account to the merchant settlement account.',
    },
  ],
  pilotTargets: [
    {
      label: 'Pilot merchants',
      value: '10-20',
      detail: 'Start with one market cluster or neighbourhood to tighten support loops.',
    },
    {
      label: 'Launch modes',
      value: '2',
      detail: 'Build vendor-assisted checkout and quick amount mode before self-scan.',
    },
    {
      label: 'Settlement path',
      value: 'Partner-led',
      detail: 'A bank or regulated PSP handles initiation, confirmation, and settlement.',
    },
  ],
  coreJourney: [
    {
      icon: 'point-of-sale',
      title: 'Merchant builds the basket',
      detail:
        'Select from a saved catalogue, scan packaged goods, or add a manual line for produce and services.',
    },
    {
      icon: 'qr-code-2',
      title: 'Generate one dynamic QR',
      detail:
        'The order is locked server-side and turned into a temporary checkout token with a short expiry.',
    },
    {
      icon: 'chat',
      title: 'Customer reviews in WhatsApp',
      detail:
        'The customer sees the merchant name, items, quantities, and total before choosing to proceed.',
    },
    {
      icon: 'account-balance',
      title: 'Bank approves the payment',
      detail:
        'Payment authentication happens inside the banking app or bank request flow, not inside WhatsApp.',
    },
    {
      icon: 'receipt-long',
      title: 'Both sides receive proof',
      detail:
        'The merchant only releases goods after a verified success response, and the customer gets a digital receipt.',
    },
  ],
  operatingModes: [
    {
      name: 'Vendor-assisted checkout',
      status: 'Build first',
      summary:
        'The merchant creates the order and the customer scans once to review and pay.',
      bestFor:
        'Spaza shops, fruit stalls, salons, taxis, market traders, and service merchants.',
    },
    {
      name: 'Quick amount mode',
      status: 'Build first',
      summary:
        'The merchant enters a short description and total amount without itemising a full basket.',
      bestFor: 'Haircuts, repairs, transport fares, and other variable-price services.',
    },
    {
      name: 'Customer self-scan',
      status: 'Phase two',
      summary:
        'Each product QR builds a customer-managed cart before payment is requested.',
      bestFor:
        'Fixed-price self-service settings once session control and fraud handling are mature.',
    },
  ],
  definitionFramework: [
    {
      area: 'User',
      answer: 'The vendor initiates the order and the customer authorises the payment.',
    },
    {
      area: 'Trigger',
      answer: 'Checkout starts when the merchant is ready to collect payment for a basket or service.',
    },
    {
      area: 'Product input',
      answer: 'Items can come from a catalogue, barcode scan, manual entry, or a quick amount field.',
    },
    {
      area: 'Order review',
      answer: 'The customer reviews an itemised order inside WhatsApp before payment begins.',
    },
    {
      area: 'Checkout',
      answer: 'The platform generates a unique QR that points to a locked server-side order reference.',
    },
    {
      area: 'Payment',
      answer: 'A bank or regulated PSP creates the payment request and authenticates the customer.',
    },
    {
      area: 'Confirmation',
      answer: 'Only a bank or PSP success callback moves the order into the paid state.',
    },
    {
      area: 'Receipt',
      answer: 'The customer receives a WhatsApp receipt and the merchant receives a release-safe confirmation.',
    },
    {
      area: 'Failure path',
      answer: 'Declined or expired requests return the order to the merchant for correction or regeneration.',
    },
  ],
  deliverables: [
    {
      title: 'Merchant workspace',
      detail:
        'Catalogue, manual entry, quick amount mode, cart totals, discounts, order locking, and dynamic QR generation.',
    },
    {
      title: 'Customer review flow',
      detail:
        'WhatsApp-friendly order review, incorrect-order path, proceed-to-payment action, and receipt delivery.',
    },
    {
      title: 'Payment orchestration',
      detail:
        'Payment request creation, idempotent transaction references, signed status callbacks, and decline handling.',
    },
    {
      title: 'Operations and reporting',
      detail:
        'Merchant onboarding, transaction history, reconciliation, refund procedure, and audit-ready event logs.',
    },
  ],
  platformBoundaries: {
    whatsapp: [
      'Launch the business conversation from the QR or payment link.',
      'Present the itemised order review and customer-facing prompts.',
      'Send receipts, payment status updates, and support messages.',
    ],
    platform: [
      'Create merchants, products, carts, dynamic QR tokens, and order states.',
      'Lock prices and quantities once the checkout QR is generated.',
      'Coordinate bank requests, webhooks, receipts, and transaction reporting.',
    ],
    bank: [
      'Authenticate the payer with the bank app, PIN, biometrics, or device approval.',
      'Move the money from the customer account to the merchant settlement account.',
      'Return the final proof that the order can be marked as paid.',
    ],
  },
  architecture: [
    {
      icon: 'storefront',
      title: 'Merchant app or merchant WhatsApp workspace',
      detail:
        'Create the basket, apply quantities, add manual lines, and generate a one-time checkout token.',
    },
    {
      icon: 'qr-code-2',
      title: 'Dynamic QR and order service',
      detail:
        'Create a short-lived order reference, freeze the basket, and expose a customer-safe checkout entry point.',
    },
    {
      icon: 'forum',
      title: 'WhatsApp Business layer',
      detail:
        'Display the order review, customer actions, receipts, and support flows without holding payment credentials.',
    },
    {
      icon: 'hub',
      title: 'Payment orchestration',
      detail:
        'Send the payment request to a bank or PSP, handle retries safely, and reconcile results.',
    },
    {
      icon: 'verified-user',
      title: 'Bank or regulated PSP',
      detail:
        'Authenticate the customer, process the payment, and send the final success or decline callback.',
    },
  ],
  phaseGates: [
    {
      phase: 'Discovery',
      focus: 'Validate demand and the trust model',
      outputs:
        'Product definition, merchant interviews, customer journey map, and partnership shortlist.',
    },
    {
      phase: 'Service design',
      focus: 'Define the operating method clearly',
      outputs:
        'Business requirements, exception flows, delivery methods, and MVP scope boundaries.',
    },
    {
      phase: 'Prototype',
      focus: 'Prove the end-to-end experience without real money',
      outputs:
        'Merchant cart demo, dynamic QR, WhatsApp review flow, mock bank approval, and digital receipt.',
    },
    {
      phase: 'Pilot',
      focus: 'Run a controlled launch with one payment partner',
      outputs:
        'Merchant onboarding pack, support runbook, reconciliation procedure, and pilot performance dashboard.',
    },
  ],
  readiness: [
    {
      title: 'No banking credentials stored',
      detail:
        'The investor story stays credible because the bank remains the system of record for authentication.',
    },
    {
      title: 'One order, one token, one status trail',
      detail:
        'The QR should expire quickly, reject duplicate payment attempts, and become unusable after success.',
    },
    {
      title: 'Merchant releases only on verified payment',
      detail:
        'A screenshot is never treated as proof; only the bank or PSP response authorises release.',
    },
  ],
  buildFirst: [
    'Vendor-assisted checkout with catalogue and manual items.',
    'Quick amount mode for service merchants and variable-price sales.',
    'Dynamic QR generation with order locking and short expiry.',
    'WhatsApp order review, bank approval simulation, and digital receipt.',
  ],
  partnerNext: [
    'WhatsApp Business Platform setup and approved message templates.',
    'Bank or PSP sandbox integration for payment requests and callbacks.',
    'Merchant onboarding, settlement setup, and reconciliation reports.',
    'Refund, decline, expiry, and support operations playbooks.',
  ],
  notYet: [
    'A native South African WhatsApp payment rail that moves money by itself.',
    'Stored card details, pooled wallets, or customer balance management.',
    'Broad self-scan inventory workflows before cart-session controls are proven.',
  ],
  sectors: [
    'Spaza shops',
    'Fruit and vegetable stalls',
    'Hair salons and barbers',
    'Taxi and transport operators',
    'Street food vendors',
    'Repair and service merchants',
  ],
  demoMerchant: {
    name: 'Thabo Fruit Stall',
    city: 'Johannesburg',
    settlement: 'Linked bank account or ShapID',
  },
  sampleProducts: [
    {
      id: 'apple',
      name: 'Apple',
      price: 5,
      note: 'Fixed-price produce line',
    },
    {
      id: 'banana',
      name: 'Banana',
      price: 4,
      note: 'Fast-moving low-ticket item',
    },
    {
      id: 'orange',
      name: 'Orange',
      price: 6,
      note: 'Fixed-price produce line',
    },
  ],
};
