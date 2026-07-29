import { openPayVaylt } from './payvaylt-runtime.mjs';

openPayVaylt().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
