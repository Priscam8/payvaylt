const crypto = require('crypto');

const defaultVerifyToken = 'vezaqr-pay-dev-token';
const webhookPath = '/api/whatsapp/webhook';
const maxEventHistory = 25;

function trimTrailingSlash(value = '') {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function normalizePhoneNumber(value = '') {
  const digits = String(value).replace(/\D+/g, '');
  return digits.length > 0 ? `+${digits}` : '';
}

function resolveVerifyToken(existingToken = '') {
  const envToken = process.env.PAYVAYLT_WHATSAPP_VERIFY_TOKEN;
  if (typeof envToken === 'string' && envToken.trim().length > 0) {
    return envToken.trim();
  }

  if (typeof existingToken === 'string' && existingToken.trim().length > 0) {
    return existingToken.trim();
  }

  return defaultVerifyToken;
}

function getPublicBaseUrl() {
  const configured =
    process.env.PAYVAYLT_PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || process.env.URL || '';
  const trimmed = String(configured).trim();
  return trimmed.length > 0 ? trimTrailingSlash(trimmed) : '';
}

function buildWebhookUrl() {
  const baseUrl = getPublicBaseUrl();
  return baseUrl ? `${baseUrl}${webhookPath}` : null;
}

function createWebhookEventId() {
  return `waevt-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

function extractOrderReferences(text = '') {
  return Array.from(new Set(String(text).match(/\b(?:ORD|CHK)-[A-Z0-9-]+\b/gi) ?? [])).map((value) =>
    value.toUpperCase()
  );
}

function normalizeRecentEvents(events = []) {
  if (!Array.isArray(events)) {
    return [];
  }

  return events
    .filter(Boolean)
    .slice(0, maxEventHistory)
    .map((event) => ({
      id: event.id || createWebhookEventId(),
      object: event.object || 'unknown',
      entryCount: Number(event.entryCount || 0),
      changeFields: Array.isArray(event.changeFields) ? event.changeFields : [],
      messages: Array.isArray(event.messages) ? event.messages : [],
      statuses: Array.isArray(event.statuses) ? event.statuses : [],
      contactNumbers: Array.isArray(event.contactNumbers) ? event.contactNumbers : [],
      orderReferences: Array.isArray(event.orderReferences) ? event.orderReferences : [],
      receivedAt: event.receivedAt || new Date().toISOString(),
    }));
}

function normalizeWhatsAppDatabaseState(input) {
  const existingConfig = input?.config ?? {};

  return {
    config: {
      webhookPath,
      verifyToken: resolveVerifyToken(existingConfig.verifyToken),
      lastVerifiedAt:
        typeof existingConfig.lastVerifiedAt === 'string' ? existingConfig.lastVerifiedAt : null,
      lastEventAt: typeof existingConfig.lastEventAt === 'string' ? existingConfig.lastEventAt : null,
    },
    events: normalizeRecentEvents(input?.events),
  };
}

function buildWebhookConfig(state) {
  const normalized = normalizeWhatsAppDatabaseState(state);
  const webhookUrl = buildWebhookUrl();

  return {
    webhookPath,
    webhookUrl,
    verifyToken: normalized.config.verifyToken,
    hasPublicBaseUrl: Boolean(webhookUrl),
    hasAppSecret:
      typeof process.env.PAYVAYLT_WHATSAPP_APP_SECRET === 'string' &&
      process.env.PAYVAYLT_WHATSAPP_APP_SECRET.trim().length > 0,
    hasAccessToken:
      typeof process.env.PAYVAYLT_WHATSAPP_ACCESS_TOKEN === 'string' &&
      process.env.PAYVAYLT_WHATSAPP_ACCESS_TOKEN.trim().length > 0,
    appId: process.env.PAYVAYLT_WHATSAPP_APP_ID || '',
    businessAccountId: process.env.PAYVAYLT_WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    phoneNumberId: process.env.PAYVAYLT_WHATSAPP_PHONE_NUMBER_ID || '',
    lastVerifiedAt: normalized.config.lastVerifiedAt,
    lastEventAt: normalized.config.lastEventAt,
    recentEventCount: normalized.events.length,
  };
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const appSecret = process.env.PAYVAYLT_WHATSAPP_APP_SECRET;
  if (typeof appSecret !== 'string' || appSecret.trim().length === 0) {
    return {
      enabled: false,
      valid: true,
      reason: null,
    };
  }

  if (!rawBody || rawBody.length === 0) {
    return {
      enabled: true,
      valid: false,
      reason: 'The webhook request body could not be read for signature validation.',
    };
  }

  if (typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return {
      enabled: true,
      valid: false,
      reason: 'Missing or invalid X-Hub-Signature-256 header.',
    };
  }

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret.trim())
    .update(rawBody)
    .digest('hex')}`;
  const provided = signatureHeader.trim();

  if (Buffer.byteLength(expected) !== Buffer.byteLength(provided)) {
    return {
      enabled: true,
      valid: false,
      reason: 'Webhook signature length did not match the expected digest.',
    };
  }

  const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));

  return {
    enabled: true,
    valid,
    reason: valid ? null : 'The X-Hub-Signature-256 header did not match the app secret.',
  };
}

function summarizeWebhookPayload(payload) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const changeFields = new Set();
  const contactNumbers = new Set();
  const orderReferences = new Set();
  const messages = [];
  const statuses = [];

  entries.forEach((entry) => {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    changes.forEach((change) => {
      if (change?.field) {
        changeFields.add(String(change.field));
      }

      const value = change?.value ?? {};

      const incomingMessages = Array.isArray(value.messages) ? value.messages : [];
      incomingMessages.forEach((message) => {
        const text =
          message?.text?.body ||
          message?.button?.text ||
          message?.interactive?.button_reply?.title ||
          message?.interactive?.list_reply?.title ||
          '';
        const from = normalizePhoneNumber(message?.from || '');
        if (from) {
          contactNumbers.add(from);
        }
        extractOrderReferences(text).forEach((reference) => orderReferences.add(reference));

        messages.push({
          from,
          type: message?.type || 'unknown',
          text,
          timestamp: message?.timestamp || null,
          profileName: value?.contacts?.[0]?.profile?.name || null,
        });
      });

      const deliveryStatuses = Array.isArray(value.statuses) ? value.statuses : [];
      deliveryStatuses.forEach((status) => {
        const recipient = normalizePhoneNumber(status?.recipient_id || '');
        if (recipient) {
          contactNumbers.add(recipient);
        }

        statuses.push({
          id: status?.id || '',
          status: status?.status || 'unknown',
          recipient,
          timestamp: status?.timestamp || null,
          conversationId: status?.conversation?.id || null,
        });
      });
    });
  });

  return {
    id: createWebhookEventId(),
    object: typeof payload?.object === 'string' ? payload.object : 'unknown',
    entryCount: entries.length,
    changeFields: Array.from(changeFields),
    messages,
    statuses,
    contactNumbers: Array.from(contactNumbers),
    orderReferences: Array.from(orderReferences),
    receivedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildWebhookConfig,
  buildWebhookUrl,
  normalizePhoneNumber,
  normalizeWhatsAppDatabaseState,
  summarizeWebhookPayload,
  verifyWebhookSignature,
  webhookPath,
};
