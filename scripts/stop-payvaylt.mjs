import { stopPayVaylt } from './payvaylt-runtime.mjs';

stopPayVaylt().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
