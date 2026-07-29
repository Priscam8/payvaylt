const { normalizeMobile } = require('../domain');

const otpProviderMode =
  process.env.PAYVAYLT_OTP_PROVIDER ||
  (process.env.PAYVAYLT_TWILIO_ACCOUNT_SID &&
  process.env.PAYVAYLT_TWILIO_AUTH_TOKEN &&
  (process.env.PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID || process.env.PAYVAYLT_TWILIO_FROM_NUMBER)
    ? 'twilio'
    : 'console');

function getOtpProviderInfo() {
  return {
    mode: otpProviderMode,
    hasSmsDelivery: otpProviderMode === 'twilio',
  };
}

function createOtpMessage(code) {
  return `PayVaylt verification code: ${code}. It expires in 10 minutes.`;
}

async function sendViaTwilio(destination, code) {
  const sid = process.env.PAYVAYLT_TWILIO_ACCOUNT_SID;
  const authToken = process.env.PAYVAYLT_TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber = process.env.PAYVAYLT_TWILIO_FROM_NUMBER;

  const body = new URLSearchParams();
  body.set('To', destination);
  body.set('Body', createOtpMessage(code));

  if (messagingServiceSid) {
    body.set('MessagingServiceSid', messagingServiceSid);
  } else if (fromNumber) {
    body.set('From', fromNumber);
  } else {
    throw new Error('Twilio OTP delivery requires a Messaging Service SID or From number.');
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload.message === 'string'
        ? payload.message
        : `Twilio OTP request failed with status ${response.status}.`;
    throw new Error(detail);
  }

  return {
    provider: 'twilio',
    channel: 'sms',
    deliveryReference: payload?.sid ?? null,
  };
}

async function sendOtpCode({ destination, code }) {
  const normalizedMobile = normalizeMobile(destination);
  const smsTarget =
    normalizedMobile.length >= 10
      ? normalizedMobile.startsWith('27')
        ? `+${normalizedMobile}`
        : `+27${normalizedMobile.replace(/^0/, '')}`
      : '';

  if (otpProviderMode === 'twilio') {
    if (!smsTarget) {
      throw new Error('Twilio OTP delivery requires a mobile number.');
    }

    return sendViaTwilio(smsTarget, code);
  }

  console.log(`[payvaylt-otp] ${destination}: ${code}`);

  return {
    provider: 'console',
    channel: smsTarget ? 'sms' : 'dev',
    deliveryReference: null,
  };
}

module.exports = {
  getOtpProviderInfo,
  sendOtpCode,
};
