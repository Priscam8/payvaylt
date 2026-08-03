const crypto = require('crypto');

const defaultVerifyToken = 'vezaqr-pay-dev-token';
const webhookPath = '/api/whatsapp/webhook';
const maxEventHistory = 25;

const webhookState = {
  lastVerifiedAt: null,
  lastEventAt: null,
  events: [],
};

function valueOf(name) {
  return String(process.env[name] || '').trim();
}

function trimTrailingSlash(value = '') {
  return String(value || '').replace(/\/+$/, '');
}

function isExampleUrlValue(value) {
  return !value || value.includes('example.com') || value.includes('api.payvaylt.example');
}

function isLocalUrlValue(value) {
  try {
    const url = new URL(value);
    return ['127.0.0.1', '0.0.0.0', 'localhost'].includes(url.hostname);
  } catch {
    return false;
  }
}

function normalizePhoneNumber(value = '') {
  const digits = String(value).replace(/\D+/g, '');
  return digits.length > 0 ? `+${digits}` : '';
}

function resolveVerifyToken() {
  return valueOf('PAYVAYLT_WHATSAPP_VERIFY_TOKEN') || defaultVerifyToken;
}

function resolvePublicApiUrl() {
  const explicit = trimTrailingSlash(valueOf('PAYVAYLT_PUBLIC_API_URL'));
  if (explicit && !isExampleUrlValue(explicit) && !isLocalUrlValue(explicit)) {
    return explicit;
  }

  const mobileFacing = trimTrailingSlash(valueOf('EXPO_PUBLIC_PAYVAYLT_API_URL'));
  if (mobileFacing && !isExampleUrlValue(mobileFacing) && !isLocalUrlValue(mobileFacing)) {
    return mobileFacing;
  }

  return '';
}

function buildWebhookConfig() {
  const publicApiUrl = resolvePublicApiUrl();
  const webhookUrl = publicApiUrl ? `${publicApiUrl}/whatsapp/webhook` : null;

  return {
    webhookPath,
    publicApiUrl: publicApiUrl || null,
    webhookUrl,
    verifyToken: resolveVerifyToken(),
    hasPublicApiUrl: Boolean(publicApiUrl),
    hasAppSecret: valueOf('PAYVAYLT_WHATSAPP_APP_SECRET').length > 0,
    hasAccessToken: valueOf('PAYVAYLT_WHATSAPP_ACCESS_TOKEN').length > 0,
    appId: valueOf('PAYVAYLT_WHATSAPP_APP_ID'),
    businessAccountId: valueOf('PAYVAYLT_WHATSAPP_BUSINESS_ACCOUNT_ID'),
    phoneNumberId: valueOf('PAYVAYLT_WHATSAPP_PHONE_NUMBER_ID'),
    lastVerifiedAt: webhookState.lastVerifiedAt,
    lastEventAt: webhookState.lastEventAt,
    recentEventCount: webhookState.events.length,
  };
}

function getRecentEvents(limit = 20) {
  return webhookState.events.slice(0, limit);
}

function recordWebhookVerification() {
  webhookState.lastVerifiedAt = new Date().toISOString();
  return webhookState.lastVerifiedAt;
}

function recordWebhookEvent(event) {
  webhookState.lastEventAt = event.receivedAt;
  webhookState.events = [event, ...webhookState.events].slice(0, maxEventHistory);
  return event;
}

function createWebhookEventId() {
  return `waevt-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
}

function extractOrderReferences(text = '') {
  return Array.from(new Set(String(text).match(/\b(?:ORD|CHK)-[A-Z0-9-]+\b/gi) ?? [])).map((value) =>
    value.toUpperCase()
  );
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const appSecret = valueOf('PAYVAYLT_WHATSAPP_APP_SECRET');
  if (!appSecret) {
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

  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
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
  getRecentEvents,
  recordWebhookEvent,
  recordWebhookVerification,
  summarizeWebhookPayload,
  verifyWebhookSignature,
};
