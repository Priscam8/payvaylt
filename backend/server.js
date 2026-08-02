const express = require('express');
const cors = require('cors');
const { z } = require('zod');

const {
  cadenceValues,
  createCustomerSession,
  createDefaultFicaDocuments,
  createId,
  createMerchantSession,
  deriveDashboardStats,
  deriveMerchantWorkspace,
  findCustomerByIdentifier,
  formatCurrency,
  normalizeEmail,
  normalizeMobile,
  publicCatalog,
} = require('./domain');
const {
  applyOrderStatus,
  createBankReference,
  createPosOrder,
  getRecentPosOrders,
  sortOrdersByNewest,
} = require('./pos-domain');
const { dataFile, getDatabase, mutateDatabase } = require('./store');

const port = Number(process.env.PAYVAYLT_PORT || process.env.PORT || 4000);

const app = express();

app.use(cors());
app.use(express.json());

const posSourceValues = ['catalog', 'manual', 'service'];

function sendError(res, status, error, details) {
  res.status(status).json({
    error,
    ...(details ? { details } : {}),
  });
}

function extractToken(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length).trim();
  }

  const sessionHeader = req.headers['x-session-token'];
  return typeof sessionHeader === 'string' ? sessionHeader.trim() : '';
}

function getSessionFromRequest(req) {
  const token = extractToken(req);
  if (!token) return null;
  return getDatabase().sessions.find((session) => session.token === token) ?? null;
}

function requireSession(role) {
  return function sessionMiddleware(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
      return sendError(res, 401, 'A valid PayVaylt session token is required.');
    }

    if (role && session.role !== role) {
      return sendError(res, 403, `This endpoint requires a ${role} session.`);
    }

    req.payvayltSession = session;
    return next();
  };
}

function ensureCustomerOwnership(req, res, next) {
  if (req.payvayltSession.accountId !== req.params.customerId) {
    return sendError(res, 403, 'That customer session cannot access another customer profile.');
  }
  return next();
}

function ensureMerchantOwnership(req, res, next) {
  if (req.payvayltSession.accountId !== req.params.merchantId) {
    return sendError(res, 403, 'That merchant session cannot access another merchant workspace.');
  }
  return next();
}

const customerCredentialsSchema = z.object({
  identifier: z.string().min(5),
  password: z.string().min(8),
});

const customerRegistrationSchema = z.object({
  fullName: z.string().min(3),
  email: z.email(),
  mobile: z.string().min(10),
  password: z.string().min(8),
});

const otpVerificationSchema = z.object({
  challengeId: z.string().min(4),
  code: z.string().min(4),
});

const requestResetSchema = z.object({
  identifier: z.string().min(5),
});

const resetPasswordSchema = z.object({
  resetId: z.string().min(4),
  password: z.string().min(8),
});

const merchantSignInSchema = z.object({
  workEmail: z.email(),
  password: z.string().min(8),
});

const ficaPatchSchema = z.object({
  documents: z.record(z.string(), z.boolean()),
});

const voucherPurchaseSchema = z.object({
  merchant: z.string().min(2),
  amount: z.number().positive(),
  useCase: z.string().min(2),
});

const planCreateSchema = z.object({
  merchant: z.string().min(2),
  item: z.string().min(2),
  itemCount: z.number().int().min(1).default(1),
  depositPaid: z.number().min(0),
  total: z.number().positive(),
  cadence: z.enum(cadenceValues),
  termMonths: z.number().int().min(1).max(12),
  nextPayment: z.string().min(3),
  payoutMethod: z.string().min(2),
  cartId: z.string().min(3),
});

const checkoutSchema = z.object({
  registration: z.object({
    fullName: z.string().min(3),
    email: z.email(),
    mobile: z.string().min(10),
    password: z.string().min(8),
    idNumber: z.string().min(10),
  }),
  verification: z.object({
    accountCreated: z.boolean(),
    otpVerified: z.boolean(),
    questionsPassed: z.boolean(),
    ficaUploaded: z.boolean(),
    homeAffairsMatched: z.boolean(),
  }),
  plan: z.object({
    deposit: z.number().min(0),
    voucherAmount: z.number().min(0),
    cadence: z.enum(cadenceValues),
    termMonths: z.number().int().min(1).max(12),
  }),
  journey: z.object({
    merchant: z.string().min(2),
    store: z.string().min(2),
    cartId: z.string().min(3),
    cartTotal: z.number().positive(),
    itemCount: z.number().int().min(1),
    leadItem: z.string().min(2),
    reservedUntil: z.string().min(3),
    releaseLeadTime: z.string().min(3),
  }),
  releaseReference: z.string().min(5),
});

const posOrderItemSchema = z.object({
  key: z.string().min(2),
  name: z.string().min(2),
  price: z.number().positive(),
  quantity: z.number().int().min(1),
  source: z.enum(posSourceValues),
  note: z.string().min(2),
});

const posCreateOrderSchema = z.object({
  items: z.array(posOrderItemSchema).min(1),
});

const posOutcomeSchema = z.object({
  outcome: z.enum(['paid', 'declined']),
});

function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 400, 'Request body validation failed.', result.error.flatten());
    return null;
  }

  return result.data;
}

function serializeSession(session) {
  return {
    id: session.id,
    token: session.token,
    role: session.role,
    accountId: session.accountId,
    displayName: session.displayName,
    identifier: session.identifier,
    createdAt: session.createdAt,
  };
}

function buildCustomerDashboard(customerId) {
  const db = getDatabase();
  const customer = db.customers.find((candidate) => candidate.id === customerId);
  if (!customer) {
    return null;
  }

  const plans = db.plans
    .filter((plan) => plan.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const vouchers = db.vouchers
    .filter((voucher) => voucher.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const notices = db.notices
    .filter(
      (notice) => notice.audience === 'customer' && (!notice.customerId || notice.customerId === customerId)
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const payments = db.payments
    .filter((payment) => payment.customerId === customerId)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      mobile: customer.mobile,
      idNumber: customer.idNumber,
      createdAt: customer.createdAt,
    },
    verificationChecks: customer.verificationChecks,
    ficaDocuments: customer.ficaDocuments,
    stats: deriveDashboardStats(plans, vouchers, customer.verificationChecks),
    plans,
    vouchers,
    notices,
    payments,
  };
}

function createPosOrderId() {
  return `ORD-${createId('pos')
    .replace(/^pos-/, '')
    .replace(/-/g, '')
    .slice(0, 10)
    .toUpperCase()}`;
}

function buildPosBootstrap() {
  const pos = getDatabase().pos;

  return {
    merchant: pos.merchant,
    products: pos.products.filter((product) => product.active !== false),
    recentOrders: getRecentPosOrders(pos),
  };
}

function buildPosResponse(order) {
  return {
    order,
    recentOrders: getRecentPosOrders(getDatabase().pos),
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'payvaylt-backend',
    version: 1,
    dataFile,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/catalog/bootstrap', (_req, res) => {
  const db = getDatabase();
  res.json({
    brand: publicCatalog.brand,
    ficaDocuments: publicCatalog.ficaDocuments,
    vendors: publicCatalog.vendors,
    journeyDemo: publicCatalog.journeyDemo,
    demoAccounts: {
      customer: {
        email: db.customers[0]?.email,
        mobile: db.customers[0]?.mobile,
      },
      merchant: {
        workEmail: db.merchants[0]?.workEmail,
      },
    },
  });
});

app.get('/api/pos/bootstrap', (_req, res) => {
  res.json(buildPosBootstrap());
});

app.get('/api/pos/orders', (_req, res) => {
  res.json({
    orders: getRecentPosOrders(getDatabase().pos, 20),
  });
});

app.get('/api/pos/orders/:orderId', (req, res) => {
  const order = getDatabase().pos.orders.find((candidate) => candidate.id === req.params.orderId);
  if (!order) {
    return sendError(res, 404, 'That POS order could not be found.');
  }

  return res.json({ order });
});

app.post('/api/pos/orders', (req, res) => {
  const payload = parseBody(posCreateOrderSchema, req, res);
  if (!payload) return;

  const merchant = getDatabase().pos.merchant;
  const order = createPosOrder(createPosOrderId(), merchant, payload.items);

  mutateDatabase((database) => {
    database.pos.orders = sortOrdersByNewest([
      order,
      ...database.pos.orders.filter((candidate) => candidate.id !== order.id),
    ]);
  });

  return res.status(201).json(buildPosResponse(order));
});

app.post('/api/pos/orders/:orderId/send-to-bank', (req, res) => {
  const currentOrder = getDatabase().pos.orders.find((candidate) => candidate.id === req.params.orderId);
  if (!currentOrder) {
    return sendError(res, 404, 'That POS order could not be found.');
  }

  if (currentOrder.status !== 'awaiting_customer') {
    return sendError(
      res,
      409,
      'Only orders awaiting customer review can move into bank approval.'
    );
  }

  let updatedOrder = null;

  mutateDatabase((database) => {
    updatedOrder = applyOrderStatus(
      currentOrder,
      'awaiting_bank',
      'Customer approved the basket in WhatsApp and moved to bank approval.'
    );
    database.pos.orders = sortOrdersByNewest(
      database.pos.orders.map((candidate) =>
        candidate.id === req.params.orderId ? updatedOrder : candidate
      )
    );
  });

  return res.json(buildPosResponse(updatedOrder));
});

app.post('/api/pos/orders/:orderId/payment-outcome', (req, res) => {
  const payload = parseBody(posOutcomeSchema, req, res);
  if (!payload) return;

  const currentOrder = getDatabase().pos.orders.find((candidate) => candidate.id === req.params.orderId);
  if (!currentOrder) {
    return sendError(res, 404, 'That POS order could not be found.');
  }

  if (currentOrder.status !== 'awaiting_bank') {
    return sendError(
      res,
      409,
      'Only orders awaiting bank approval can receive a payment outcome.'
    );
  }

  let updatedOrder = null;

  mutateDatabase((database) => {
    updatedOrder =
      payload.outcome === 'paid'
        ? applyOrderStatus(currentOrder, 'paid', 'Bank confirmed the payment and released the receipt.', {
            bankReference: createBankReference(currentOrder.id),
            declineReason: undefined,
          })
        : applyOrderStatus(
            currentOrder,
            'declined',
            'Customer declined the request in the banking app.',
            {
              declineReason: 'Customer declined the request in the banking app.',
              bankReference: undefined,
            }
          );

    database.pos.orders = sortOrdersByNewest(
      database.pos.orders.map((candidate) =>
        candidate.id === req.params.orderId ? updatedOrder : candidate
      )
    );
  });

  return res.json(buildPosResponse(updatedOrder));
});

app.post('/api/pos/orders/:orderId/cancel', (req, res) => {
  const currentOrder = getDatabase().pos.orders.find((candidate) => candidate.id === req.params.orderId);
  if (!currentOrder) {
    return sendError(res, 404, 'That POS order could not be found.');
  }

  if (currentOrder.status === 'paid') {
    return sendError(res, 409, 'Paid orders cannot be cancelled from the checkout demo.');
  }

  if (currentOrder.status === 'cancelled') {
    return res.json(buildPosResponse(currentOrder));
  }

  let updatedOrder = null;

  mutateDatabase((database) => {
    updatedOrder = applyOrderStatus(
      currentOrder,
      'cancelled',
      'Merchant cancelled the checkout before settlement.'
    );
    database.pos.orders = sortOrdersByNewest(
      database.pos.orders.map((candidate) =>
        candidate.id === req.params.orderId ? updatedOrder : candidate
      )
    );
  });

  return res.json(buildPosResponse(updatedOrder));
});

app.post('/api/auth/customers/register', (req, res) => {
  const payload = parseBody(customerRegistrationSchema, req, res);
  if (!payload) return;

  const db = getDatabase();
  const emailTaken = db.customers.some(
    (customer) => normalizeEmail(customer.email) === normalizeEmail(payload.email)
  );
  const mobileTaken = db.customers.some(
    (customer) => normalizeMobile(customer.mobile) === normalizeMobile(payload.mobile)
  );

  if (emailTaken || mobileTaken) {
    return sendError(res, 409, 'A customer account with that email or mobile number already exists.');
  }

  const createdAt = new Date().toISOString();
  const customerId = createId('customer');
  const challengeId = createId('otp');

  mutateDatabase((database) => {
    database.customers.push({
      ...payload,
      id: customerId,
      createdAt,
      verificationChecks: {
        accountCreated: true,
        otpVerified: false,
        questionsPassed: false,
        ficaUploaded: false,
        homeAffairsMatched: false,
      },
      ficaDocuments: createDefaultFicaDocuments(false),
    });

    database.otpChallenges = database.otpChallenges.filter(
      (challenge) => challenge.customerId !== customerId
    );
    database.otpChallenges.push({
      id: challengeId,
      flow: 'create-account',
      customerId,
      destination: payload.email,
      createdAt,
    });
  });

  return res.status(201).json({
    challengeId,
    customerId,
    destination: payload.email,
    otpRequired: true,
    nextStep: 'verify-otp',
  });
});

app.post('/api/auth/customers/sign-in', (req, res) => {
  const payload = parseBody(customerCredentialsSchema, req, res);
  if (!payload) return;

  const customer = findCustomerByIdentifier(getDatabase().customers, payload.identifier);
  if (!customer || customer.password !== payload.password) {
    return sendError(res, 401, 'No customer account matches those credentials.');
  }

  const challengeId = createId('otp');
  mutateDatabase((database) => {
    database.otpChallenges = database.otpChallenges.filter(
      (challenge) => challenge.customerId !== customer.id
    );
    database.otpChallenges.push({
      id: challengeId,
      flow: 'sign-in',
      customerId: customer.id,
      destination: customer.email || customer.mobile,
      createdAt: new Date().toISOString(),
    });
  });

  return res.json({
    challengeId,
    customerId: customer.id,
    destination: customer.email || customer.mobile,
    otpRequired: true,
    nextStep: 'verify-otp',
  });
});

app.post('/api/auth/customers/verify-otp', (req, res) => {
  const payload = parseBody(otpVerificationSchema, req, res);
  if (!payload) return;

  const db = getDatabase();
  const challenge = db.otpChallenges.find((candidate) => candidate.id === payload.challengeId);
  if (!challenge) {
    return sendError(res, 404, 'That OTP challenge no longer exists. Start the flow again.');
  }

  if (payload.code.trim().length < 4) {
    return sendError(res, 400, 'Enter any 4-digit prototype code to continue.');
  }

  const customer = db.customers.find((candidate) => candidate.id === challenge.customerId);
  if (!customer) {
    return sendError(res, 404, 'The customer linked to that OTP challenge could not be found.');
  }

  const session = createCustomerSession(customer);
  mutateDatabase((database) => {
    const linkedCustomer = database.customers.find((candidate) => candidate.id === challenge.customerId);
    linkedCustomer.verificationChecks.accountCreated = true;
    linkedCustomer.verificationChecks.otpVerified = true;

    database.otpChallenges = database.otpChallenges.filter(
      (candidate) => candidate.id !== challenge.id
    );
    database.sessions = database.sessions.filter(
      (candidate) => !(candidate.role === 'customer' && candidate.accountId === linkedCustomer.id)
    );
    database.sessions.push(session);
  });

  return res.json({
    session: serializeSession(session),
    nextStep: challenge.flow === 'create-account' ? 'fica-upload' : 'dashboard',
  });
});

app.post('/api/auth/customers/request-password-reset', (req, res) => {
  const payload = parseBody(requestResetSchema, req, res);
  if (!payload) return;

  const customer = findCustomerByIdentifier(getDatabase().customers, payload.identifier);
  if (!customer) {
    return sendError(res, 404, 'No customer account matches that email address or mobile number.');
  }

  const resetId = createId('reset');
  mutateDatabase((database) => {
    database.passwordResetChallenges = database.passwordResetChallenges.filter(
      (challenge) => challenge.customerId !== customer.id
    );
    database.passwordResetChallenges.push({
      id: resetId,
      customerId: customer.id,
      destination: customer.email || customer.mobile,
      createdAt: new Date().toISOString(),
    });
  });

  return res.json({
    resetId,
    customerId: customer.id,
    destination: customer.email || customer.mobile,
    sent: true,
  });
});

app.post('/api/auth/customers/reset-password', (req, res) => {
  const payload = parseBody(resetPasswordSchema, req, res);
  if (!payload) return;

  const challenge = getDatabase().passwordResetChallenges.find(
    (candidate) => candidate.id === payload.resetId
  );
  if (!challenge) {
    return sendError(res, 404, 'That password reset request has expired or does not exist.');
  }

  mutateDatabase((database) => {
    const customer = database.customers.find((candidate) => candidate.id === challenge.customerId);
    customer.password = payload.password;
    database.passwordResetChallenges = database.passwordResetChallenges.filter(
      (candidate) => candidate.id !== challenge.id
    );
  });

  return res.json({
    ok: true,
    message: 'Password updated successfully.',
  });
});

app.post('/api/auth/merchants/sign-in', (req, res) => {
  const payload = parseBody(merchantSignInSchema, req, res);
  if (!payload) return;

  const merchant = getDatabase().merchants.find(
    (candidate) =>
      normalizeEmail(candidate.workEmail) === normalizeEmail(payload.workEmail) &&
      candidate.password === payload.password
  );

  if (!merchant) {
    return sendError(res, 401, 'Merchant credentials did not match a configured PayVaylt partner account.');
  }

  const session = createMerchantSession(merchant);
  mutateDatabase((database) => {
    database.sessions = database.sessions.filter(
      (candidate) => !(candidate.role === 'merchant' && candidate.accountId === merchant.id)
    );
    database.sessions.push(session);
  });

  return res.json({
    session: serializeSession(session),
    workspace: deriveMerchantWorkspace(merchant, getDatabase()),
  });
});

app.get('/api/sessions/me', (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return sendError(res, 401, 'No active session token was provided.');
  }

  return res.json({
    session: serializeSession(session),
  });
});

app.get('/api/customers/:customerId/dashboard', requireSession('customer'), ensureCustomerOwnership, (req, res) => {
  const dashboard = buildCustomerDashboard(req.params.customerId);
  if (!dashboard) {
    return sendError(res, 404, 'That customer profile could not be found.');
  }

  return res.json(dashboard);
});

app.patch(
  '/api/customers/:customerId/fica-documents',
  requireSession('customer'),
  ensureCustomerOwnership,
  (req, res) => {
    const payload = parseBody(ficaPatchSchema, req, res);
    if (!payload) return;

    const createdAt = new Date().toISOString();
    mutateDatabase((database) => {
      const customer = database.customers.find((candidate) => candidate.id === req.params.customerId);
      customer.ficaDocuments = {
        ...customer.ficaDocuments,
        ...payload.documents,
      };

      const docs = customer.ficaDocuments;
      customer.verificationChecks.accountCreated = true;
      customer.verificationChecks.otpVerified = true;
      customer.verificationChecks.questionsPassed = Boolean(docs['Verification questions']);
      customer.verificationChecks.ficaUploaded =
        Boolean(docs['South African ID or passport']) &&
        Boolean(docs['Proof of address']) &&
        Boolean(docs['Selfie verification']) &&
        Boolean(docs['Verification questions']);

      if (customer.verificationChecks.ficaUploaded) {
        database.notices.unshift({
          id: createId('notice'),
          title: 'FICA submitted',
          description: 'Your document pack is complete and ready for final identity matching.',
          icon: 'fact-check',
          audience: 'customer',
          customerId: customer.id,
          type: 'verification',
          createdAt,
        });
      }
    });

    return res.json(buildCustomerDashboard(req.params.customerId));
  }
);

app.post(
  '/api/customers/:customerId/home-affairs-check',
  requireSession('customer'),
  ensureCustomerOwnership,
  (_req, res) => {
    const createdAt = new Date().toISOString();

    mutateDatabase((database) => {
      const customer = database.customers.find((candidate) => candidate.id === _req.params.customerId);
      customer.verificationChecks.homeAffairsMatched = true;
      database.notices.unshift({
        id: createId('notice'),
        title: 'Verification complete',
        description: 'Home Affairs matching is complete. Your full PayVaylt customer workspace is unlocked.',
        icon: 'verified-user',
        audience: 'customer',
        customerId: customer.id,
        type: 'verification',
        createdAt,
      });
    });

    return res.json(buildCustomerDashboard(_req.params.customerId));
  }
);

app.post(
  '/api/customers/:customerId/vouchers/purchase',
  requireSession('customer'),
  ensureCustomerOwnership,
  (req, res) => {
    const payload = parseBody(voucherPurchaseSchema, req, res);
    if (!payload) return;

    const createdAt = new Date().toISOString();

    mutateDatabase((database) => {
      const existing = database.vouchers.find(
        (voucher) =>
          voucher.customerId === req.params.customerId && voucher.merchant === payload.merchant
      );

      if (existing) {
        existing.balance += payload.amount;
        existing.useCase = payload.useCase;
      } else {
        database.vouchers.unshift({
          id: createId('voucher'),
          customerId: req.params.customerId,
          merchant: payload.merchant,
          balance: payload.amount,
          expiry: 'No expiry',
          useCase: payload.useCase,
          createdAt,
        });
      }

      database.notices.unshift({
        id: createId('notice'),
        title: 'Voucher purchased',
        description: `${payload.merchant} voucher balance increased by ${formatCurrency(payload.amount)}.`,
        icon: 'redeem',
        audience: 'customer',
        customerId: req.params.customerId,
        type: 'voucher',
        createdAt,
      });
    });

    return res.status(201).json(buildCustomerDashboard(req.params.customerId));
  }
);

app.post(
  '/api/customers/:customerId/plans',
  requireSession('customer'),
  ensureCustomerOwnership,
  (req, res) => {
    const payload = parseBody(planCreateSchema, req, res);
    if (!payload) return;

    if (payload.depositPaid > payload.total) {
      return sendError(res, 400, 'Deposit cannot exceed the total cart value.');
    }

    const createdAt = new Date().toISOString();
    const planId = createId('plan');
    const remaining = Number((payload.total - payload.depositPaid).toFixed(2));
    const progress = payload.total > 0 ? Math.round((payload.depositPaid / payload.total) * 100) : 0;

    mutateDatabase((database) => {
      database.plans.unshift({
        id: planId,
        customerId: req.params.customerId,
        merchant: payload.merchant,
        item: payload.item,
        itemCount: payload.itemCount,
        depositPaid: payload.depositPaid,
        remaining,
        total: payload.total,
        cadence: payload.cadence,
        termMonths: payload.termMonths,
        nextPayment: payload.nextPayment,
        progress,
        status: remaining > 0 ? 'On track' : 'Completed',
        payoutMethod: payload.payoutMethod,
        cartId: payload.cartId,
        createdAt,
      });

      if (payload.depositPaid > 0) {
        database.payments.unshift({
          id: createId('payment'),
          customerId: req.params.customerId,
          planId,
          amount: payload.depositPaid,
          kind: 'deposit',
          method: 'Card / EFT',
          createdAt,
        });
      }
    });

    return res.status(201).json(buildCustomerDashboard(req.params.customerId));
  }
);

app.post('/api/checkout/complete', (req, res) => {
  const payload = parseBody(checkoutSchema, req, res);
  if (!payload) return;

  const finalPaymentAmount = Math.max(
    payload.journey.cartTotal - payload.plan.deposit - payload.plan.voucherAmount,
    0
  );
  const createdAt = new Date().toISOString();

  let responsePayload = null;

  mutateDatabase((database) => {
    const existingCustomer =
      findCustomerByIdentifier(database.customers, payload.registration.email) ??
      findCustomerByIdentifier(database.customers, payload.registration.mobile);

    const customerId = existingCustomer?.id ?? createId('customer');
    const customer =
      existingCustomer ??
      (() => {
        const nextCustomer = {
          id: customerId,
          createdAt,
          fullName: payload.registration.fullName,
          email: payload.registration.email,
          mobile: payload.registration.mobile,
          password: payload.registration.password,
          idNumber: payload.registration.idNumber,
          verificationChecks: payload.verification,
          ficaDocuments: createDefaultFicaDocuments(payload.verification.ficaUploaded),
        };
        database.customers.push(nextCustomer);
        return nextCustomer;
      })();

    customer.fullName = payload.registration.fullName;
    customer.email = payload.registration.email;
    customer.mobile = payload.registration.mobile;
    customer.password = payload.registration.password;
    customer.idNumber = payload.registration.idNumber;
    customer.verificationChecks = payload.verification;
    customer.ficaDocuments = createDefaultFicaDocuments(payload.verification.ficaUploaded);

    const existingPlan = database.plans.find((plan) => plan.cartId === payload.journey.cartId);
    const planId = existingPlan?.id ?? createId('plan');
    const plan = {
      id: planId,
      customerId: customer.id,
      merchant: payload.journey.store,
      item: payload.journey.leadItem,
      itemCount: payload.journey.itemCount,
      depositPaid: payload.plan.deposit,
      remaining: 0,
      total: payload.journey.cartTotal,
      cadence: payload.plan.cadence,
      termMonths: payload.plan.termMonths,
      nextPayment: 'Paid in full',
      progress: 100,
      status: 'Completed',
      payoutMethod:
        payload.plan.voucherAmount > 0 ? 'Voucher + card top-up' : 'Direct EFT',
      cartId: payload.journey.cartId,
      reservedUntil: payload.journey.reservedUntil,
      releaseLeadTime: payload.journey.releaseLeadTime,
      releaseReference: payload.releaseReference,
      createdAt: existingPlan?.createdAt ?? createdAt,
    };

    if (existingPlan) {
      Object.assign(existingPlan, plan);
    } else {
      database.plans.unshift(plan);
    }

    if (payload.plan.voucherAmount > 0) {
      const voucher = database.vouchers.find(
        (entry) => entry.customerId === customer.id && entry.merchant === payload.journey.store
      );

      if (voucher) {
        voucher.balance = Math.max(voucher.balance - payload.plan.voucherAmount, 0);
      }
    }

    database.payments = database.payments.filter((payment) => payment.planId !== planId);

    if (payload.plan.deposit > 0) {
      database.payments.unshift({
        id: createId('payment'),
        customerId: customer.id,
        planId,
        amount: payload.plan.deposit,
        kind: 'deposit',
        method: 'Card / EFT',
        createdAt,
      });
    }

    if (payload.plan.voucherAmount > 0) {
      database.payments.unshift({
        id: createId('payment'),
        customerId: customer.id,
        planId,
        amount: payload.plan.voucherAmount,
        kind: 'voucher',
        method: `${payload.journey.store} voucher`,
        createdAt,
      });
    }

    if (finalPaymentAmount > 0) {
      database.payments.unshift({
        id: createId('payment'),
        customerId: customer.id,
        planId,
        amount: finalPaymentAmount,
        kind: 'final',
        method: 'Card / EFT',
        createdAt,
      });
    }

    database.notices.unshift(
      {
        id: createId('notice'),
        title: 'Merchant release triggered',
        description: `${payload.journey.store} can now release ${payload.journey.leadItem} with reference ${payload.releaseReference}.`,
        icon: 'local-shipping',
        audience: 'customer',
        customerId: customer.id,
        type: 'release',
        createdAt,
      },
      {
        id: createId('notice'),
        title: 'Release-ready order',
        description: `${payload.registration.fullName} completed ${payload.journey.leadItem}. Release reference ${payload.releaseReference} is ready for merchant handoff.`,
        icon: 'assignment-turned-in',
        audience: 'merchant',
        merchantAccountId: database.merchants[0]?.id,
        type: 'release',
        createdAt,
      }
    );

    const session = createCustomerSession(customer);
    database.sessions = database.sessions.filter(
      (candidate) => !(candidate.role === 'customer' && candidate.accountId === customer.id)
    );
    database.sessions.push(session);

    responsePayload = {
      releaseReference: payload.releaseReference,
      session: serializeSession(session),
      dashboard: buildCustomerDashboard(customer.id),
    };
  });

  return res.status(201).json(responsePayload);
});

app.get(
  '/api/merchants/:merchantId/workspace',
  requireSession('merchant'),
  ensureMerchantOwnership,
  (req, res) => {
    const merchant = getDatabase().merchants.find((candidate) => candidate.id === req.params.merchantId);
    if (!merchant) {
      return sendError(res, 404, 'That merchant workspace could not be found.');
    }

    return res.json(deriveMerchantWorkspace(merchant, getDatabase()));
  }
);

app.use((req, res) => {
  sendError(res, 404, `No PayVaylt backend route matches ${req.method} ${req.originalUrl}.`);
});

app.listen(port, () => {
  console.log(`[payvaylt-backend] listening on http://localhost:${port}`);
  console.log(`[payvaylt-backend] data file: ${dataFile}`);
});
