const { getDatabaseInfo, initializeRepository } = require('./repository');

async function main() {
  const info = await initializeRepository();
  console.log(
    `[payvaylt-backend] database ready in ${info.mode} mode (${info.target})`
  );
}

main().catch((error) => {
  console.error('[payvaylt-backend] migration/bootstrap failed');
  console.error(error);
  process.exit(1);
});
