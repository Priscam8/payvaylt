require('dotenv').config();

function hasValue(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function valueOf(name) {
  return String(process.env[name] || '').trim();
}

function isExampleUrl(name) {
  const value = valueOf(name);
  return !value || value.includes('example.com') || value.includes('api.payvaylt.example');
}

function pushMissing(failures, label, names) {
  for (const name of names) {
    if (!hasValue(name)) {
      failures.push(`${label}: missing ${name}`);
    }
  }
}

function main() {
  const failures = [];
  const warnings = [];

  if (!hasValue('PAYVAYLT_DATABASE_URL') && !hasValue('DATABASE_URL')) {
    failures.push('Database: set PAYVAYLT_DATABASE_URL or DATABASE_URL for a real Postgres database.');
  }

  const documentStorage =
    valueOf('PAYVAYLT_DOCUMENT_STORAGE') || (hasValue('PAYVAYLT_S3_BUCKET') ? 's3' : 'local');
  if (documentStorage !== 's3') {
    failures.push('Document storage: set PAYVAYLT_DOCUMENT_STORAGE=s3 for production document uploads.');
  } else {
    pushMissing(failures, 'Document storage', [
      'PAYVAYLT_S3_BUCKET',
      'PAYVAYLT_S3_ACCESS_KEY_ID',
      'PAYVAYLT_S3_SECRET_ACCESS_KEY',
    ]);
  }

  const otpProvider = valueOf('PAYVAYLT_OTP_PROVIDER') || (hasValue('PAYVAYLT_TWILIO_ACCOUNT_SID') ? 'twilio' : 'console');
  if (otpProvider !== 'twilio') {
    failures.push('OTP: set PAYVAYLT_OTP_PROVIDER=twilio for production SMS delivery.');
  } else {
    pushMissing(failures, 'OTP', [
      'PAYVAYLT_TWILIO_ACCOUNT_SID',
      'PAYVAYLT_TWILIO_AUTH_TOKEN',
    ]);
    if (!hasValue('PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID') && !hasValue('PAYVAYLT_TWILIO_FROM_NUMBER')) {
      failures.push('OTP: set PAYVAYLT_TWILIO_MESSAGING_SERVICE_SID or PAYVAYLT_TWILIO_FROM_NUMBER.');
    }
  }

  const paymentProvider = valueOf('PAYVAYLT_PAYMENT_PROVIDER') || (hasValue('PAYVAYLT_STRIPE_SECRET_KEY') ? 'stripe' : 'mock');
  if (paymentProvider !== 'stripe') {
    failures.push('Payments: set PAYVAYLT_PAYMENT_PROVIDER=stripe for production checkout.');
  } else {
    pushMissing(failures, 'Payments', [
      'PAYVAYLT_STRIPE_SECRET_KEY',
      'PAYVAYLT_STRIPE_WEBHOOK_SECRET',
    ]);
    if (isExampleUrl('PAYVAYLT_STRIPE_SUCCESS_URL')) {
      failures.push('Payments: set PAYVAYLT_STRIPE_SUCCESS_URL to your real success URL.');
    }
    if (isExampleUrl('PAYVAYLT_STRIPE_CANCEL_URL')) {
      failures.push('Payments: set PAYVAYLT_STRIPE_CANCEL_URL to your real cancellation URL.');
    }
  }

  if (valueOf('PAYVAYLT_ALLOW_DEV_CODES') === 'true') {
    failures.push('Security: set PAYVAYLT_ALLOW_DEV_CODES=false or remove it in production.');
  }

  if (isExampleUrl('EXPO_PUBLIC_PAYVAYLT_API_URL')) {
    warnings.push('Mobile app: set EXPO_PUBLIC_PAYVAYLT_API_URL to the deployed backend /api URL before EAS builds.');
  }

  if (failures.length > 0) {
    console.error('[payvaylt-production-check] Not ready for production:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    if (warnings.length > 0) {
      console.error('\nWarnings:');
      for (const warning of warnings) {
        console.error(`- ${warning}`);
      }
    }
    process.exit(1);
  }

  console.log('[payvaylt-production-check] Production configuration looks ready.');
  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
