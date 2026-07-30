function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function isExampleUrl(value) {
  return !value || value.includes('example.com') || value.includes('api.payvaylt.example');
}

function isLocalUrl(value) {
  try {
    const url = new URL(value);
    return ['127.0.0.1', '0.0.0.0', 'localhost'].includes(url.hostname);
  } catch {
    return false;
  }
}

const args = process.argv.slice(2);
const profileFlagIndex = args.findIndex((entry) => entry === '--profile');
const profile =
  profileFlagIndex >= 0 && args[profileFlagIndex + 1] ? args[profileFlagIndex + 1] : 'production';

const apiUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_PAYVAYLT_API_URL);
const publicAppUrl = trimTrailingSlash(process.env.PAYVAYLT_PUBLIC_APP_URL);
const failures = [];
const warnings = [];

if (!apiUrl) {
  failures.push('Set EXPO_PUBLIC_PAYVAYLT_API_URL to the deployed backend /api URL before release builds.');
} else if (isExampleUrl(apiUrl) || isLocalUrl(apiUrl)) {
  failures.push('EXPO_PUBLIC_PAYVAYLT_API_URL must not point to localhost or an example domain.');
}

if (!publicAppUrl) {
  warnings.push(
    'PAYVAYLT_PUBLIC_APP_URL is not set, so Stripe return URLs must be configured explicitly on the backend.'
  );
} else if (isExampleUrl(publicAppUrl) || isLocalUrl(publicAppUrl)) {
  failures.push('PAYVAYLT_PUBLIC_APP_URL must not point to localhost or an example domain.');
}

if (failures.length > 0) {
  console.error(`[payvaylt-release-check] ${profile} release build is not ready:`);
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

console.log(`[payvaylt-release-check] ${profile} release build configuration looks ready.`);
if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
