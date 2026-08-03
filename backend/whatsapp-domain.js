const crypto = require('crypto');

const defaultVerifyToken = 'vezaqr-pay-dev-token';
const defaultGraphApiVersion = 'v25.0';
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

function normalizeWhatsAppRecipient(value = '') {
  return String(value).replace(/\D+/g, '');
}

function resolveVerifyToken() {
  return valueOf('PAYVAYLT_WHATSAPP_VERIFY_TOKEN') || defaultVerifyToken;
}

function resolveGraphApiVersion() {
  return valueOf('PAYVAYLT_WHATSAPP_API_VERSION') || defaultGraphApiVersion;
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

function buildMessagingConfig() {
  const phoneNumberId = valueOf('PAYVAYLT_WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = valueOf('PAYVAYLT_WHATSAPP_ACCESS_TOKEN');
  const businessAccountId = valueOf('PAYVAYLT_WHATSAPP_BUSINESS_ACCOUNT_ID');
  const graphApiVersion = resolveGraphApiVersion();
  const missing = [];

  if (!phoneNumberId) missing.push('PAYVAYLT_WHATSAPP_PHONE_NUMBER_ID');
  if (!accessToken) missing.push('PAYVAYLT_WHATSAPP_ACCESS_TOKEN');

  return {
    enabled: missing.length === 0,
    graphApiVersion,
    phoneNumberId,
    businessAccountId,
    endpoint: phoneNumberId ? `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages` : null,
    hasAccessToken: Boolean(accessToken),
    missing,
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

function formatCurrency(amount) {
  const numericAmount = Number(amount || 0);
  const hasCents = numericAmount % 1 !== 0;

  return `R ${numericAmount.toLocaleString('en-ZA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
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

async function postWhatsAppMessage(body) {
  const config = buildMessagingConfig();
  if (!config.enabled || !config.endpoint) {
    const message = config.missing.length
      ? `WhatsApp messaging is not configured. Missing: ${config.missing.join(', ')}.`
      : 'WhatsApp messaging is not configured.';
    const error = new Error(message);
    error.status = 503;
    throw error;
  }

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${valueOf('PAYVAYLT_WHATSAPP_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...body,
    }),
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = result?.error?.message || `Meta returned HTTP ${response.status}.`;
    const error = new Error(`WhatsApp message send failed. ${detail}`);
    error.status = response.status;
    error.details = result;
    throw error;
  }

  const acceptedMessage = Array.isArray(result?.messages) ? result.messages[0] : null;

  return {
    accepted: true,
    messageId: acceptedMessage?.id || null,
    recipient: String(body.to || ''),
    provider: 'meta-whatsapp-cloud',
    response: result,
  };
}

async function sendWhatsAppTextMessage({ to, text, previewUrl = false, replyToMessageId = '' }) {
  const recipient = normalizeWhatsAppRecipient(to);
  if (!recipient) {
    const error = new Error('A valid WhatsApp recipient number is required.');
    error.status = 400;
    throw error;
  }

  const body = {
    to: recipient,
    type: 'text',
    text: {
      body: String(text || '').trim(),
      preview_url: Boolean(previewUrl),
    },
  };

  if (!body.text.body) {
    const error = new Error('A WhatsApp text message body is required.');
    error.status = 400;
    throw error;
  }

  if (replyToMessageId) {
    body.context = {
      message_id: String(replyToMessageId),
    };
  }

  return postWhatsAppMessage(body);
}

async function sendWhatsAppTemplateMessage({
  to,
  templateName,
  languageCode = 'en_US',
  templateParameters = [],
}) {
  const recipient = normalizeWhatsAppRecipient(to);
  if (!recipient) {
    const error = new Error('A valid WhatsApp recipient number is required.');
    error.status = 400;
    throw error;
  }

  const name = String(templateName || '').trim();
  if (!name) {
    const error = new Error('A WhatsApp template name is required.');
    error.status = 400;
    throw error;
  }

  const body = {
    to: recipient,
    type: 'template',
    template: {
      name,
      language: {
        code: String(languageCode || 'en_US').trim() || 'en_US',
      },
    },
  };

  if (templateParameters.length > 0) {
    body.template.components = [
      {
        type: 'body',
        parameters: templateParameters.map((value) => ({
          type: 'text',
          text: String(value),
        })),
      },
    ];
  }

  return postWhatsAppMessage(body);
}

function buildCheckoutReceiptMessage(payload) {
  const deposit = Number(payload?.plan?.deposit || 0);
  const voucherAmount = Number(payload?.plan?.voucherAmount || 0);
  const total = Number(payload?.journey?.cartTotal || 0);
  const finalPayment = Math.max(Number((total - deposit - voucherAmount).toFixed(2)), 0);
  const itemCount = Number(payload?.journey?.itemCount || 0);

  const lines = [
    'VezaQR Pay payment confirmed',
    '',
    `Store: ${String(payload?.journey?.store || '')}`,
    `Item: ${String(payload?.journey?.leadItem || '')}`,
    `Quantity: ${itemCount}`,
    `Cart ID: ${String(payload?.journey?.cartId || '')}`,
    `Reference: ${String(payload?.releaseReference || '')}`,
    `Total paid: ${formatCurrency(total)}`,
  ];

  if (deposit > 0) {
    lines.push(`Deposit: ${formatCurrency(deposit)}`);
  }

  if (voucherAmount > 0) {
    lines.push(`Voucher applied: ${formatCurrency(voucherAmount)}`);
  }

  if (finalPayment > 0) {
    lines.push(`Final payment: ${formatCurrency(finalPayment)}`);
  }

  lines.push(`Release: ${String(payload?.journey?.releaseLeadTime || '')}`);
  lines.push('');
  lines.push('Your order is now release-ready.');

  return lines.join('\n');
}

module.exports = {
  buildWebhookConfig,
  buildMessagingConfig,
  buildCheckoutReceiptMessage,
  getRecentEvents,
  recordWebhookEvent,
  recordWebhookVerification,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  summarizeWebhookPayload,
  verifyWebhookSignature,
};
