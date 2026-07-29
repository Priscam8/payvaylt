CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  status TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS vendor_catalog_items (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  availability_status TEXT NOT NULL DEFAULT 'available',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_catalog_items_vendor_sku_unique
  ON vendor_catalog_items (vendor_id, sku);

CREATE TABLE IF NOT EXISTS vendor_reservations (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  external_reference TEXT,
  cart_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 1,
  total NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL,
  reserved_until TIMESTAMPTZ,
  release_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_reservations_vendor_cart_unique
  ON vendor_reservations (vendor_id, cart_id);

CREATE INDEX IF NOT EXISTS vendor_reservations_customer_created_idx
  ON vendor_reservations (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vendor_voucher_accounts (
  id TEXT PRIMARY KEY,
  vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS vendor_voucher_accounts_vendor_customer_unique
  ON vendor_voucher_accounts (vendor_id, customer_id);

CREATE TABLE IF NOT EXISTS integration_events (
  id TEXT PRIMARY KEY,
  vendor_id TEXT REFERENCES vendors(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS integration_events_vendor_occurred_idx
  ON integration_events (vendor_id, occurred_at DESC);
