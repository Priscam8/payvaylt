const crypto = require('crypto');

const { resolveStripeRedirectUrl } = require('../production-readiness');

const paymentProviderMode =
  process.env.PAYVAYLT_PAYMENT_PROVIDER ||
  (process.env.PAYVAYLT_STRIPE_SECRET_KEY ? 'stripe' : 'mock');

function centsFromAmount(amount) {
  return Math.round(Number(amount) * 100);
}

function getPaymentProviderInfo() {
  return {
    mode: paymentProviderMode,
    successUrl: resolveStripeSuccessUrl(),
    cancelUrl: resolveStripeCancelUrl(),
  };
}

async function createMockPaymentSession(payload) {
  return {
    provider: 'mock',
    providerReference: `mock_${Date.now()}`,
    status: 'requires_confirmation',
    checkoutUrl: null,
    amount: payload.amount,
    currency: payload.currency,
  };
}

function withQueryParam(urlString, key, value) {
  if (!value) {
    return urlString;
  }

  try {
    const url = new URL(urlString);
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    const separator = urlString.includes('?') ? '&' : '?';
    return `${urlString}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }
}

function resolveStripeSuccessUrl(paymentSessionId) {
  const baseUrl = resolveStripeRedirectUrl('success') || 'https://example.com/payvaylt/payment-success';
  const withPayVayltSession = withQueryParam(baseUrl, 'payvaylt_session_id', paymentSessionId);
  return withQueryParam(withPayVayltSession, 'session_id', '{CHECKOUT_SESSION_ID}');
}

function resolveStripeCancelUrl(paymentSessionId) {
  const baseUrl =
    resolveStripeRedirectUrl('cancel') || 'https://example.com/payvaylt/payment-cancelled';
  const withPayVayltSession = withQueryParam(baseUrl, 'payvaylt_session_id', paymentSessionId);
  return withQueryParam(withPayVayltSession, 'cancelled', '1');
}

async function createStripeCheckoutSession(payload) {
  const secretKey = process.env.PAYVAYLT_STRIPE_SECRET_KEY;
  const successUrl = resolveStripeSuccessUrl(payload.paymentSessionId);
  const cancelUrl = resolveStripeCancelUrl(payload.paymentSessionId);

  const body = new URLSearchParams();
  body.set('mode', 'payment');
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('line_items[0][quantity]', '1');
  body.set('line_items[0][price_data][currency]', (payload.currency || 'ZAR').toLowerCase());
  body.set('line_items[0][price_data][unit_amount]', String(centsFromAmount(payload.amount)));
  body.set('line_items[0][price_data][product_data][name]', payload.itemName);
  body.set('line_items[0][price_data][product_data][description]', payload.description);
  if (payload.paymentSessionId) {
    body.set('client_reference_id', payload.paymentSessionId);
  }

  for (const [key, value] of Object.entries(payload.metadata ?? {})) {
    body.set(`metadata[${key}]`, String(value));
  }

  if (payload.paymentSessionId) {
    body.set('metadata[payvayltPaymentSessionId]', payload.paymentSessionId);
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const session = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      session && typeof session.error?.message === 'string'
        ? session.error.message
        : `Stripe checkout session creation failed with status ${response.status}.`;
    throw new Error(detail);
  }

  return {
    provider: 'stripe',
    providerReference: session.id,
    status: 'pending',
    checkoutUrl: session.url ?? null,
    amount: payload.amount,
    currency: payload.currency,
  };
}

async function createPaymentSession(payload) {
  if (paymentProviderMode === 'stripe') {
    return createStripeCheckoutSession(payload);
  }

  return createMockPaymentSession(payload);
}

async function confirmPaymentSession(session) {
  if (session.provider === 'mock') {
    return {
      status: 'paid',
      providerReference: session.providerReference,
    };
  }

  return {
    status: session.status,
    providerReference: session.providerReference,
  };
}

function parseStripeSignatureHeader(headerValue) {
  const pieces = String(headerValue || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  const parsed = {
    timestamp: '',
    signatures: [],
  };

  for (const piece of pieces) {
    const [key, value] = piece.split('=');
    if (key === 't') {
      parsed.timestamp = value;
    }
    if (key === 'v1') {
      parsed.signatures.push(value);
    }
  }

  return parsed;
}

function safeCompareHex(left, right) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyStripeWebhook(payloadBuffer, signatureHeader) {
  const secret = process.env.PAYVAYLT_STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('Stripe webhook secret is not configured.');
  }

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || signatures.length === 0) {
    throw new Error('Stripe signature header is missing a timestamp or v1 signature.');
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadBuffer.toString('utf8')}`)
    .digest('hex');

  const valid = signatures.some((signature) => safeCompareHex(signature, expected));
  if (!valid) {
    throw new Error('Stripe webhook signature could not be verified.');
  }

  return JSON.parse(payloadBuffer.toString('utf8'));
}

module.exports = {
  confirmPaymentSession,
  createPaymentSession,
  getPaymentProviderInfo,
  verifyStripeWebhook,
};
