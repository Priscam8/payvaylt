require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { z } = require('zod');

const {
  beginCustomerSignIn,
  completeCheckout,
  completeVerificationQuestions,
  confirmCheckoutPaymentSession,
  completeHomeAffairsCheck,
  createAppError,
  createCheckoutPaymentSession,
  createPlan,
  getCustomerDashboard,
  getCustomerDocumentDownload,
  getDatabaseInfo,
  getMerchantWorkspace,
  getPublicBootstrap,
  getSessionByToken,
  initializeRepository,
  markStripePaymentSessionPaid,
  purchaseVoucher,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  signInMerchant,
  signOut,
  uploadCustomerDocument,
  updateCustomerFicaDocuments,
  verifyCustomerOtp,
} = require('./repository');
const { cadenceValues } = require('./domain');
const {
  createDownloadDescriptor,
  getDocumentStorageInfo,
  storeUploadedDocument,
} = require('./providers/document-storage');
const { getOtpProviderInfo } = require('./providers/otp-provider');
const { getPaymentProviderInfo, verifyStripeWebhook } = require('./providers/payment-provider');

const port = Number(process.env.PAYVAYLT_PORT || process.env.PORT || 4000);

const app = express();

app.use(cors());
app.post(
  '/api/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  asyncRoute(async (req, res) => {
    const signatureHeader = req.headers['stripe-signature'];
    const event = verifyStripeWebhook(req.body, Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader);

    if (event.type === 'checkout.session.completed') {
      await markStripePaymentSessionPaid(event.data?.object?.id);
    }

    res.json({ received: true });
  })
);
app.use(express.json());

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

function parseBody(schema, req, res) {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    sendError(res, 400, 'Request body validation failed.', result.error.flatten());
    return null;
  }

  return result.data;
}

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      const status = error?.status ?? 500;
      const message = error?.message ?? 'Unexpected PayVaylt backend error.';
      sendError(res, status, message);
    });
  };
}

async function attachSession(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    req.payvayltSession = null;
    return next();
  }

  req.payvayltSession = await getSessionByToken(token);
  return next();
}

function requireSession(role) {
  return function sessionMiddleware(req, res, next) {
    const session = req.payvayltSession;
    if (!session) {
      return sendError(res, 401, 'A valid PayVaylt session token is required.');
    }

    if (role && session.role !== role) {
      return sendError(res, 403, `This endpoint requires a ${role} session.`);
    }

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
  code: z.string().length(6),
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
  documents: z.record(z.string(), z.unknown()),
});

const customerDocumentFlagsSchema = z.record(z.string(), z.boolean());

const documentUploadSchema = z.object({
  documentTitle: z.string().min(3),
  fileName: z.string().min(1),
  mimeType: z.string().min(3),
  contentBase64: z.string().min(10),
  sizeBytes: z.number().int().positive().optional(),
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

const customerMutationSchema = z.discriminatedUnion('__action', [
  z.object({
    __action: z.literal('complete-home-affairs'),
  }),
  z.object({
    __action: z.literal('complete-verification-questions'),
  }),
  documentUploadSchema.extend({
    __action: z.literal('upload-document'),
  }),
  voucherPurchaseSchema.extend({
    __action: z.literal('purchase-voucher'),
  }),
  planCreateSchema.extend({
    __action: z.literal('create-plan'),
  }),
]);

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
  paymentSessionId: z.string().min(4).optional(),
});

function parseCustomerMutation(documents, res) {
  const result = customerMutationSchema.safeParse(documents);
  if (!result.success) {
    sendError(res, 400, 'Customer action validation failed.', result.error.flatten());
    return null;
  }

  return result.data;
}

function parseCustomerDocumentFlags(documents, res) {
  const result = customerDocumentFlagsSchema.safeParse(documents);
  if (!result.success) {
    sendError(res, 400, 'Customer document update validation failed.', result.error.flatten());
    return null;
  }

  return result.data;
}

async function dispatchCustomerMutation(customerId, mutation) {
  switch (mutation.__action) {
    case 'complete-home-affairs':
      return {
        status: 200,
        body: await completeHomeAffairsCheck(customerId),
      };
    case 'complete-verification-questions':
      return {
        status: 200,
        body: await completeVerificationQuestions(customerId),
      };
    case 'upload-document': {
      const buffer = Buffer.from(mutation.contentBase64, 'base64');
      const storedFile = await storeUploadedDocument({
        customerId,
        title: mutation.documentTitle,
        file: {
          originalname: mutation.fileName,
          mimetype: mutation.mimeType,
          size: mutation.sizeBytes ?? buffer.byteLength,
          buffer,
        },
      });

      return {
        status: 201,
        body: await uploadCustomerDocument(customerId, mutation.documentTitle, storedFile),
      };
    }
    case 'purchase-voucher':
      return {
        status: 201,
        body: await purchaseVoucher(customerId, mutation),
      };
    case 'create-plan':
      return {
        status: 201,
        body: await createPlan(customerId, mutation),
      };
    default:
      throw createAppError(400, 'That customer action is not supported.');
  }
}

app.use(asyncRoute(attachSession));

app.get(
  '/api/health',
  asyncRoute(async (_req, res) => {
    const info = getDatabaseInfo();
    const otpInfo = getOtpProviderInfo();
    const paymentInfo = getPaymentProviderInfo();
    const documentStorageInfo = getDocumentStorageInfo();
    res.json({
      ok: true,
      service: 'payvaylt-backend',
      version: 2,
      databaseMode: info.mode,
      databaseTarget: info.target,
      documentStorage: documentStorageInfo.mode,
      documentStorageTarget: documentStorageInfo.target,
      otpProvider: otpInfo.mode,
      paymentProvider: paymentInfo.mode,
      timestamp: new Date().toISOString(),
    });
  })
);

app.get(
  '/api/catalog/bootstrap',
  asyncRoute(async (_req, res) => {
    res.json(await getPublicBootstrap());
  })
);

app.post(
  '/api/auth/customers/register',
  asyncRoute(async (req, res) => {
    const payload = parseBody(customerRegistrationSchema, req, res);
    if (!payload) return;
    res.status(201).json(await registerCustomer(payload));
  })
);

app.post(
  '/api/auth/customers/sign-in',
  asyncRoute(async (req, res) => {
    const payload = parseBody(customerCredentialsSchema, req, res);
    if (!payload) return;
    res.json(await beginCustomerSignIn(payload));
  })
);

app.post(
  '/api/auth/customers/verify-otp',
  asyncRoute(async (req, res) => {
    const payload = parseBody(otpVerificationSchema, req, res);
    if (!payload) return;
    res.json(await verifyCustomerOtp(payload.challengeId, payload.code));
  })
);

app.post(
  '/api/checkout/payment-session',
  asyncRoute(async (req, res) => {
    const payload = parseBody(checkoutSchema, req, res);
    if (!payload) return;
    res.status(201).json(await createCheckoutPaymentSession(payload));
  })
);

app.post(
  '/api/payment-sessions/:paymentSessionId/confirm',
  asyncRoute(async (req, res) => {
    res.json(await confirmCheckoutPaymentSession(req.params.paymentSessionId));
  })
);

app.post(
  '/api/auth/customers/request-password-reset',
  asyncRoute(async (req, res) => {
    const payload = parseBody(requestResetSchema, req, res);
    if (!payload) return;
    res.json(await requestPasswordReset(payload.identifier));
  })
);

app.post(
  '/api/auth/customers/reset-password',
  asyncRoute(async (req, res) => {
    const payload = parseBody(resetPasswordSchema, req, res);
    if (!payload) return;
    res.json(await resetPassword(payload.resetId, payload.password));
  })
);

app.post(
  '/api/auth/merchants/sign-in',
  asyncRoute(async (req, res) => {
    const payload = parseBody(merchantSignInSchema, req, res);
    if (!payload) return;
    res.json(await signInMerchant(payload));
  })
);

app.get(
  '/api/sessions/me',
  requireSession(),
  asyncRoute(async (req, res) => {
    res.json({
      session: req.payvayltSession,
    });
  })
);

app.post(
  '/api/auth/sign-out',
  asyncRoute(async (req, res) => {
    if (req.payvayltSession?.token) {
      await signOut(req.payvayltSession.token);
    }
    res.status(204).send();
  })
);

app.get(
  '/api/customers/:customerId/dashboard',
  requireSession('customer'),
  ensureCustomerOwnership,
  asyncRoute(async (req, res) => {
    const dashboard = await getCustomerDashboard(req.params.customerId);
    if (!dashboard) {
      throw createAppError(404, 'That customer profile could not be found.');
    }
    res.json(dashboard);
  })
);

app.patch(
  '/api/customers/:customerId/fica-documents',
  requireSession('customer'),
  ensureCustomerOwnership,
  asyncRoute(async (req, res) => {
    const payload = parseBody(ficaPatchSchema, req, res);
    if (!payload) return;
    if (typeof payload.documents.__action === 'string') {
      const mutation = parseCustomerMutation(payload.documents, res);
      if (!mutation) return;

      const result = await dispatchCustomerMutation(req.params.customerId, mutation);
      res.status(result.status).json(result.body);
      return;
    }

    const documents = parseCustomerDocumentFlags(payload.documents, res);
    if (!documents) return;

    res.json(await updateCustomerFicaDocuments(req.params.customerId, documents));
  })
);

app.get(
  '/api/customers/:customerId/document-uploads/:documentId/download',
  requireSession('customer'),
  ensureCustomerOwnership,
  asyncRoute(async (req, res) => {
    const documentUpload = await getCustomerDocumentDownload(
      req.params.customerId,
      req.params.documentId
    );
    const fileDescriptor = createDownloadDescriptor(documentUpload.storageKey);

    if (fileDescriptor.type === 'redirect') {
      res.redirect(302, fileDescriptor.url);
      return;
    }

    if (!fs.existsSync(fileDescriptor.absolutePath)) {
      throw createAppError(404, 'That uploaded document file could not be found on disk.');
    }

    res.setHeader('Content-Type', documentUpload.mimeType);
    res.download(fileDescriptor.absolutePath, documentUpload.originalName);
  })
);

app.post(
  '/api/checkout/complete',
  asyncRoute(async (req, res) => {
    const payload = parseBody(checkoutSchema, req, res);
    if (!payload) return;
    res.status(201).json(await completeCheckout(payload, payload.paymentSessionId));
  })
);

app.get(
  '/api/merchants/:merchantId/workspace',
  requireSession('merchant'),
  ensureMerchantOwnership,
  asyncRoute(async (req, res) => {
    const workspace = await getMerchantWorkspace(req.params.merchantId);
    if (!workspace) {
      throw createAppError(404, 'That merchant workspace could not be found.');
    }
    res.json(workspace);
  })
);

app.use((req, res) => {
  sendError(res, 404, `No PayVaylt backend route matches ${req.method} ${req.originalUrl}.`);
});

app.use((error, _req, res, next) => {
  if (error) {
    return sendError(res, error?.status ?? 500, error?.message ?? 'Unexpected PayVaylt backend error.');
  }

  return next();
});

async function start() {
  const info = await initializeRepository();
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`[payvaylt-backend] listening on http://localhost:${port}`);
      console.log(`[payvaylt-backend] database: ${info.mode} (${info.target})`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('[payvaylt-backend] failed to start');
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  app,
  start,
};
