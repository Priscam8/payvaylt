require('dotenv').config();

function hasValue(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function valueOf(name) {
  return String(process.env[name] || '').trim();
}

function trimTrailingSlash(value) {
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

function resolvePublicAppUrl() {
  return trimTrailingSlash(valueOf('PAYVAYLT_PUBLIC_APP_URL'));
}

function resolveStripeRedirectUrl(kind) {
  const key = kind === 'cancel' ? 'PAYVAYLT_STRIPE_CANCEL_URL' : 'PAYVAYLT_STRIPE_SUCCESS_URL';
  const explicit = trimTrailingSlash(valueOf(key));
  if (explicit) {
    return explicit;
  }

  const publicAppUrl = resolvePublicAppUrl();
  if (!publicAppUrl) {
    return '';
  }

  return `${publicAppUrl}/${kind === 'cancel' ? 'payment-cancelled' : 'payment-success'}`;
}

function createCheck(status, summary, details = {}) {
  return {
    status,
    summary,
    ...details,
  };
}

function getLaunchReadiness() {
  const failures = [];
  const warnings = [];

  const publicAppUrl = resolvePublicAppUrl();
  const successUrl = resolveStripeRedirectUrl('success');
  const cancelUrl = resolveStripeRedirectUrl('cancel');
  const databaseConfigured = hasValue('PAYVAYLT_DATABASE_URL') || hasValue('DATABASE_URL');
  const documentStorage =
    valueOf('PAYVAYLT_DOCUMENT_STORAGE') || (hasValue('PAYVAYLT_S3_BUCKET') ? 's3' : 'local');
  const otpProvider =
    valueOf('PAYVAYLT_OTP_PROVIDER') ||
    (hasValue('PAYVAYLT_TWILIO_ACCOUNT_SID') ? 'twilio' : 'console');
  const paymentProvider =
    valueOf('PAYVAYLT_PAYMENT_PROVIDER') ||
    (hasValue('PAYVAYLT_STRIPE_SECRET_KEY') ? 'stripe' : 'mock');
  const mobileApiUrl = valueOf('EXPO_PUBLIC_PAYVAYLT_API_URL');

  const checks = {};

  if (!databaseConfigured) {
    failures.push('Database: set PAYVAYLT_DATABASE_URL or DATABASE_URL for a real Postgres database.');
    checks.database = createCheck('fail', 'A hosted Postgres database is not configured.');
  } else {
    checks.database = createCheck('pass', 'A real Postgres database URL is configured.');
  }

  if (documentStorage !== 's3') {
    failures.push('Document storage: set PAYVAYLT_DOCUMENT_STORAGE=s3 for production document uploads.');
    checks.documentStorage = createCheck('fail', 'Document uploads are still using local storage.', {
      mode: documentStorage,
    });
  } else {
    const missing = [];
    if (!hasValue('PAYVAYLT_S3_BUCKET')) missing.push('PAYVAYLT_S3_BUCKET');
    if (!hasValue('PAYVAYLT_S3_ACCESS_KEY_ID')) missing.push('PAYVAYLT_S3_ACCESS_KEY_ID');
    if (!hasValue('PAYVAYLT_S3_SECRET_ACCESS_KEY')) missing.push('PAYVAYLT_S3_SECRET_ACCESS_KEY');

    if (missing.length > 0) {
      failures.push(`Document storage: missing ${missing.join(', ')}.`);
      checks.documentStorage = createCheck(
        'fail',
        'S3 storage is selected but required credentials are still missing.',
        { mode: documentStorage, missing }
      );
    } else {
      checks.documentStorage = createCheck('pass', 'S3-compatible document storage is configured.', {
        mode: documentStorage,
        bucket: valueOf('PAYVAYLT_S3_BUCKET'),
      });
    }
  }

  if (otpProvider !== 'twilio') {
    failures.push('OTP: set PAYVAYLT_OTP_PROVIDER=twilio for production SMS delivery.');
    checks.otp = createCheck('fail', 'OTP delivery is still using the development provider.', {
      mode: otpProvider,
    });
  } else {
    const missing = [];
    if (!hasValue('PAYVAYLT_TWILIO_ACCOUNT_SID')) missing.push('PAYVAYLT_TWILIO_ACCOUNT_SID');
    if (!hasValue('PAYVAYLT_TWILIO_AUTH_TOKEN')) missing.push('PAYVAYLT_TWILIO_AUTH_TOKEN');
    if (!hasValue('PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID') && !hasValue('PAYVAYLT_TWILIO_FROM_NUMBER')) {
      missing.push('PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID or PAYVAYLT_TWILIO_FROM_NUMBER');
    }

    if (missing.length > 0) {
      failures.push(`OTP: missing ${missing.join(', ')}.`);
      checks.otp = createCheck('fail', 'Twilio is selected but SMS credentials are incomplete.', {
        mode: otpProvider,
        missing,
      });
    } else {
      checks.otp = createCheck('pass', 'Twilio SMS delivery is configured.', {
        mode: otpProvider,
      });
    }
  }

  if (paymentProvider !== 'stripe') {
    failures.push('Payments: set PAYVAYLT_PAYMENT_PROVIDER=stripe for production checkout.');
    checks.payments = createCheck('fail', 'Payments are still using the development provider.', {
      mode: paymentProvider,
    });
  } else {
    const missing = [];
    if (!hasValue('PAYVAYLT_STRIPE_SECRET_KEY')) missing.push('PAYVAYLT_STRIPE_SECRET_KEY');
    if (!hasValue('PAYVAYLT_STRIPE_WEBHOOK_SECRET')) missing.push('PAYVAYLT_STRIPE_WEBHOOK_SECRET');
    if (!successUrl) missing.push('PAYVAYLT_PUBLIC_APP_URL or PAYVAYLT_STRIPE_SUCCESS_URL');
    if (!cancelUrl) missing.push('PAYVAYLT_PUBLIC_APP_URL or PAYVAYLT_STRIPE_CANCEL_URL');

    const invalidUrls = [];
    if (successUrl && (isExampleUrlValue(successUrl) || isLocalUrlValue(successUrl))) {
      invalidUrls.push('PAYVAYLT_STRIPE_SUCCESS_URL');
    }
    if (cancelUrl && (isExampleUrlValue(cancelUrl) || isLocalUrlValue(cancelUrl))) {
      invalidUrls.push('PAYVAYLT_STRIPE_CANCEL_URL');
    }

    if (missing.length > 0) {
      failures.push(`Payments: missing ${missing.join(', ')}.`);
    }
    if (invalidUrls.length > 0) {
      failures.push(`Payments: ${invalidUrls.join(' and ')} must point to live PayVaylt pages.`);
    }

    if (missing.length > 0 || invalidUrls.length > 0) {
      checks.payments = createCheck('fail', 'Stripe is selected but checkout return URLs or secrets are incomplete.', {
        mode: paymentProvider,
        missing,
        successUrl: successUrl || null,
        cancelUrl: cancelUrl || null,
      });
    } else {
      checks.payments = createCheck('pass', 'Stripe checkout is configured for live redirects.', {
        mode: paymentProvider,
        successUrl,
        cancelUrl,
      });
    }
  }

  if (valueOf('PAYVAYLT_ALLOW_DEV_CODES') === 'true') {
    failures.push('Security: set PAYVAYLT_ALLOW_DEV_CODES=false or remove it in production.');
    checks.security = createCheck('fail', 'Development OTP codes are still enabled.');
  } else {
    checks.security = createCheck('pass', 'Development OTP codes are disabled.');
  }

  if (!publicAppUrl) {
    warnings.push(
      'Launch UX: set PAYVAYLT_PUBLIC_APP_URL so Stripe can return customers to PayVaylt payment-success and payment-cancelled pages.'
    );
    checks.publicAppUrl = createCheck('warn', 'The public PayVaylt app URL is not configured.');
  } else if (isExampleUrlValue(publicAppUrl) || isLocalUrlValue(publicAppUrl)) {
    warnings.push('Launch UX: PAYVAYLT_PUBLIC_APP_URL still points to a placeholder or local address.');
    checks.publicAppUrl = createCheck('warn', 'The public PayVaylt app URL is still a placeholder.', {
      url: publicAppUrl,
    });
  } else {
    checks.publicAppUrl = createCheck('pass', 'The public PayVaylt app URL is configured.', {
      url: publicAppUrl,
    });
  }

  if (!mobileApiUrl) {
    warnings.push(
      'Mobile app: set EXPO_PUBLIC_PAYVAYLT_API_URL to the deployed backend /api URL before EAS production builds.'
    );
    checks.mobileApi = createCheck('warn', 'The mobile API base URL is not configured for release builds.');
  } else if (isExampleUrlValue(mobileApiUrl) || isLocalUrlValue(mobileApiUrl)) {
    warnings.push('Mobile app: EXPO_PUBLIC_PAYVAYLT_API_URL still points to localhost or an example domain.');
    checks.mobileApi = createCheck('warn', 'The mobile API base URL is still pointing at a placeholder.', {
      url: mobileApiUrl,
    });
  } else {
    checks.mobileApi = createCheck('pass', 'The mobile API base URL is configured for release builds.', {
      url: mobileApiUrl,
    });
  }

  return {
    ready: failures.length === 0,
    failures,
    warnings,
    checks,
    publicAppUrl: publicAppUrl || null,
    paymentUrls: {
      successUrl: successUrl || null,
      cancelUrl: cancelUrl || null,
    },
  };
}

module.exports = {
  getLaunchReadiness,
  hasValue,
  isExampleUrlValue,
  isLocalUrlValue,
  resolvePublicAppUrl,
  resolveStripeRedirectUrl,
  valueOf,
};
