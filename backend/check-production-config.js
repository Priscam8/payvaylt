require('dotenv').config();

const { getLaunchReadiness } = require('./production-readiness');

function main() {
  const readiness = getLaunchReadiness();
  const asJson = process.argv.includes('--json');

  if (asJson) {
    console.log(JSON.stringify(readiness, null, 2));
    process.exit(readiness.ready ? 0 : 1);
  }

  if (!readiness.ready) {
    console.error('[payvaylt-production-check] Not ready for production:');
    for (const failure of readiness.failures) {
      console.error(`- ${failure}`);
    }
    if (readiness.warnings.length > 0) {
      console.error('\nWarnings:');
      for (const warning of readiness.warnings) {
        console.error(`- ${warning}`);
      }
    }
    process.exit(1);
  }

  console.log('[payvaylt-production-check] Production configuration looks ready.');
  if (readiness.warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of readiness.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main();
