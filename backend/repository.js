const {
  createCustomerSession,
  createDefaultFicaDocuments,
  createId,
  createMerchantSession,
  createOtpChallenge,
  createPasswordResetChallenge,
  createSeedDatabase,
  deriveDashboardStats,
  deriveMerchantWorkspace,
  formatCurrency,
  hashSecret,
  isExpired,
  normalizeEmail,
  normalizeIdentifier,
  normalizeMobile,
  publicCatalog,
  verifySecret,
} = require('./domain');
const { getDatabaseInfo, initializeDatabase, query, withTransaction } = require('./database');
const { createPaymentSession: createProviderPaymentSession, confirmPaymentSession: confirmProviderPaymentSession } = require('./providers/payment-provider');
const { sendOtpCode } = require('./providers/otp-provider');
const {
  getVendorAdapter,
  listVendorDefinitions,
  slugifyVendor,
} = require('../packages/vendor-integrations');

const uploadBackedDocumentTitles = publicCatalog.ficaDocuments
  .map((item) => item.title)
  .filter((title) => title !== 'Verification questions');

function createAppError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function numericToNumber(value) {
  return value == null ? 0 : Number(value);
}

function mapCustomer(row) {
  return row
    ? {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        mobile: row.mobile,
        passwordHash: row.password_hash,
        idNumber: row.id_number ?? undefined,
        verificationChecks: row.verification_checks ?? {},
        ficaDocuments: row.fica_documents ?? {},
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}

function mapMerchant(row) {
  return row
    ? {
        id: row.id,
        companyName: row.company_name,
        workEmail: row.work_email,
        passwordHash: row.password_hash,
        vendorNames: row.vendor_names ?? [],
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}

function mapPlan(row) {
  return row
    ? {
        id: row.id,
        customerId: row.customer_id,
        merchant: row.merchant,
        item: row.item,
        itemCount: row.item_count,
        depositPaid: numericToNumber(row.deposit_paid),
        remaining: numericToNumber(row.remaining),
        total: numericToNumber(row.total),
        cadence: row.cadence,
        termMonths: row.term_months,
        nextPayment: row.next_payment,
        progress: row.progress,
        status: row.status,
        payoutMethod: row.payout_method,
        cartId: row.cart_id,
        reservedUntil: row.reserved_until ?? undefined,
        releaseLeadTime: row.release_lead_time ?? undefined,
        releaseReference: row.release_reference ?? undefined,
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}

function mapVoucher(row) {
  return row
    ? {
        id: row.id,
        customerId: row.customer_id,
        merchant: row.merchant,
        balance: numericToNumber(row.balance),
        expiry: row.expiry,
        useCase: row.use_case,
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}

function mapNotice(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    audience: row.audience,
    customerId: row.customer_id ?? undefined,
    merchantAccountId: row.merchant_account_id ?? undefined,
    type: row.type,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapPayment(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    planId: row.plan_id,
    amount: numericToNumber(row.amount),
    kind: row.kind,
    method: row.method,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapSession(row) {
  return row
    ? {
        id: row.id,
        token: row.token,
        role: row.role,
        accountId: row.account_id,
        displayName: row.display_name,
        identifier: row.identifier,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
      }
    : null;
}

function mapOtpChallenge(row) {
  return row
    ? {
        id: row.id,
        flow: row.flow,
        customerId: row.customer_id,
        destination: row.destination,
        codeHash: row.code_hash,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
        attemptsRemaining: row.attempts_remaining,
        channel: row.channel,
        provider: row.provider,
        deliveryReference: row.delivery_reference ?? undefined,
        devCode: row.dev_code ?? undefined,
      }
    : null;
}

function mapPasswordResetChallenge(row) {
  return row
    ? {
        id: row.id,
        customerId: row.customer_id,
        destination: row.destination,
        createdAt: new Date(row.created_at).toISOString(),
        expiresAt: new Date(row.expires_at).toISOString(),
      }
    : null;
}

function mapDocumentUpload(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    title: row.title,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageKey: row.storage_key,
    status: row.status,
    reviewNotes: row.review_notes ?? undefined,
    uploadedAt: new Date(row.uploaded_at).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
  };
}

function mapPaymentSession(row) {
  return row
    ? {
        id: row.id,
        customerId: row.customer_id ?? undefined,
        provider: row.provider,
        providerReference: row.provider_reference ?? undefined,
        amount: numericToNumber(row.amount),
        currency: row.currency,
        kind: row.kind,
        status: row.status,
        checkoutUrl: row.checkout_url ?? undefined,
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}

function mapVendor(row) {
  return row
    ? {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        integration: row.integration_type,
        status: row.status,
        capabilities: row.capabilities ?? {},
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}

function mapVendorCatalogItem(row) {
  return row
    ? {
        id: row.id,
        vendorId: row.vendor_id,
        sku: row.sku,
        name: row.name,
        description: row.description ?? '',
        price: numericToNumber(row.price),
        currency: row.currency,
        availabilityStatus: row.availability_status,
        stockQuantity: row.stock_quantity,
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}

function mapVendorReservation(row) {
  return row
    ? {
        id: row.id,
        vendorId: row.vendor_id,
        customerId: row.customer_id ?? undefined,
        externalReference: row.external_reference ?? undefined,
        cartId: row.cart_id,
        itemName: row.item_name,
        itemCount: row.item_count,
        total: numericToNumber(row.total),
        currency: row.currency,
        status: row.status,
        reservedUntil: row.reserved_until ? new Date(row.reserved_until).toISOString() : undefined,
        releaseReference: row.release_reference ?? undefined,
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}

function mapVendorVoucherAccount(row) {
  return row
    ? {
        id: row.id,
        vendorId: row.vendor_id,
        customerId: row.customer_id,
        balance: numericToNumber(row.balance),
        currency: row.currency,
        status: row.status,
        expiresAt: row.expires_at ?? undefined,
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      }
    : null;
}

async function fetchOne(sql, params = [], client) {
  const result = await query(sql, params, client);
  return result.rows[0] ?? null;
}

async function fetchMany(sql, params = [], mapper, client) {
  const result = await query(sql, params, client);
  return result.rows.map(mapper);
}

async function purgeExpiredRecords(client) {
  await query('DELETE FROM sessions WHERE expires_at <= NOW()', [], client);
  await query('DELETE FROM otp_challenges WHERE expires_at <= NOW()', [], client);
  await query('DELETE FROM password_reset_challenges WHERE expires_at <= NOW()', [], client);
}

async function insertCustomer(customer, client) {
  await query(
    `INSERT INTO customers
      (id, full_name, email, mobile, password_hash, id_number, verification_checks, fica_documents, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)`,
    [
      customer.id,
      customer.fullName,
      normalizeEmail(customer.email),
      normalizeMobile(customer.mobile),
      customer.passwordHash,
      customer.idNumber ?? null,
      JSON.stringify(customer.verificationChecks),
      JSON.stringify(customer.ficaDocuments),
      customer.createdAt,
    ],
    client
  );
}

async function insertMerchant(merchant, client) {
  await query(
    `INSERT INTO merchants
      (id, company_name, work_email, password_hash, vendor_names, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      merchant.id,
      merchant.companyName,
      normalizeEmail(merchant.workEmail),
      merchant.passwordHash,
      merchant.vendorNames,
      merchant.createdAt,
    ],
    client
  );
}

async function insertPlan(plan, client) {
  await query(
    `INSERT INTO plans
      (id, customer_id, merchant, item, item_count, deposit_paid, remaining, total, cadence, term_months, next_payment, progress, status, payout_method, cart_id, reserved_until, release_lead_time, release_reference, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
    [
      plan.id,
      plan.customerId,
      plan.merchant,
      plan.item,
      plan.itemCount,
      plan.depositPaid,
      plan.remaining,
      plan.total,
      plan.cadence,
      plan.termMonths,
      plan.nextPayment,
      plan.progress,
      plan.status,
      plan.payoutMethod,
      plan.cartId,
      plan.reservedUntil ?? null,
      plan.releaseLeadTime ?? null,
      plan.releaseReference ?? null,
      plan.createdAt,
    ],
    client
  );
}

async function insertVoucher(voucher, client) {
  await query(
    `INSERT INTO vouchers
      (id, customer_id, merchant, balance, expiry, use_case, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      voucher.id,
      voucher.customerId,
      voucher.merchant,
      voucher.balance,
      voucher.expiry,
      voucher.useCase,
      voucher.createdAt,
    ],
    client
  );
}

async function insertNotice(notice, client) {
  await query(
    `INSERT INTO notices
      (id, title, description, icon, audience, customer_id, merchant_account_id, type, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      notice.id,
      notice.title,
      notice.description,
      notice.icon,
      notice.audience,
      notice.customerId ?? null,
      notice.merchantAccountId ?? null,
      notice.type,
      notice.createdAt,
    ],
    client
  );
}

async function insertPayment(payment, client) {
  await query(
    `INSERT INTO payments
      (id, customer_id, plan_id, amount, kind, method, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      payment.id,
      payment.customerId,
      payment.planId,
      payment.amount,
      payment.kind,
      payment.method,
      payment.createdAt,
    ],
    client
  );
}

async function insertSession(session, client) {
  await query(
    `INSERT INTO sessions
      (id, token, role, account_id, display_name, identifier, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      session.id,
      session.token,
      session.role,
      session.accountId,
      session.displayName,
      session.identifier,
      session.createdAt,
      session.expiresAt,
    ],
    client
  );
}

async function insertOtpChallenge(challenge, client) {
  await query(
    `INSERT INTO otp_challenges
      (id, flow, customer_id, destination, code_hash, created_at, expires_at, attempts_remaining, channel, provider, delivery_reference, dev_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      challenge.id,
      challenge.flow,
      challenge.customerId,
      challenge.destination,
      challenge.codeHash,
      challenge.createdAt,
      challenge.expiresAt,
      challenge.attemptsRemaining,
      challenge.channel ?? 'sms',
      challenge.provider ?? 'console',
      challenge.deliveryReference ?? null,
      challenge.devCode ?? null,
    ],
    client
  );
}

async function insertPasswordResetChallenge(challenge, client) {
  await query(
    `INSERT INTO password_reset_challenges
      (id, customer_id, destination, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      challenge.id,
      challenge.customerId,
      challenge.destination,
      challenge.createdAt,
      challenge.expiresAt,
    ],
    client
  );
}

async function insertDocumentUpload(documentUpload, client) {
  await query(
    `INSERT INTO document_uploads
      (id, customer_id, title, original_name, mime_type, size_bytes, storage_key, status, review_notes, uploaded_at, reviewed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      documentUpload.id,
      documentUpload.customerId,
      documentUpload.title,
      documentUpload.originalName,
      documentUpload.mimeType,
      documentUpload.sizeBytes,
      documentUpload.storageKey,
      documentUpload.status,
      documentUpload.reviewNotes ?? null,
      documentUpload.uploadedAt,
      documentUpload.reviewedAt ?? null,
    ],
    client
  );
}

async function insertPaymentSession(paymentSession, client) {
  await query(
    `INSERT INTO payment_sessions
      (id, customer_id, provider, provider_reference, amount, currency, kind, status, checkout_url, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)`,
    [
      paymentSession.id,
      paymentSession.customerId ?? null,
      paymentSession.provider,
      paymentSession.providerReference ?? null,
      paymentSession.amount,
      paymentSession.currency,
      paymentSession.kind,
      paymentSession.status,
      paymentSession.checkoutUrl ?? null,
      JSON.stringify(paymentSession.metadata ?? {}),
      paymentSession.createdAt,
      paymentSession.updatedAt,
    ],
    client
  );
}

async function insertVendor(vendor, client) {
  await query(
    `INSERT INTO vendors
      (id, slug, name, category, integration_type, status, capabilities, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)`,
    [
      vendor.id,
      vendor.slug,
      vendor.name,
      vendor.category,
      vendor.integration,
      vendor.status,
      JSON.stringify(vendor.capabilities ?? {}),
      JSON.stringify(vendor.metadata ?? {}),
      vendor.createdAt,
      vendor.updatedAt,
    ],
    client
  );
}

async function insertVendorCatalogItem(item, client) {
  await query(
    `INSERT INTO vendor_catalog_items
      (id, vendor_id, sku, name, description, price, currency, availability_status, stock_quantity, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12)`,
    [
      item.id,
      item.vendorId,
      item.sku,
      item.name,
      item.description ?? null,
      item.price,
      item.currency,
      item.availabilityStatus,
      item.stockQuantity,
      JSON.stringify(item.metadata ?? {}),
      item.createdAt,
      item.updatedAt,
    ],
    client
  );
}

async function insertVendorReservation(reservation, client) {
  await query(
    `INSERT INTO vendor_reservations
      (id, vendor_id, customer_id, external_reference, cart_id, item_name, item_count, total, currency, status, reserved_until, release_reference, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)`,
    [
      reservation.id,
      reservation.vendorId,
      reservation.customerId ?? null,
      reservation.externalReference ?? null,
      reservation.cartId,
      reservation.itemName,
      reservation.itemCount,
      reservation.total,
      reservation.currency,
      reservation.status,
      reservation.reservedUntil ?? null,
      reservation.releaseReference ?? null,
      JSON.stringify(reservation.metadata ?? {}),
      reservation.createdAt,
      reservation.updatedAt,
    ],
    client
  );
}

async function insertVendorVoucherAccount(voucherAccount, client) {
  await query(
    `INSERT INTO vendor_voucher_accounts
      (id, vendor_id, customer_id, balance, currency, status, expires_at, metadata, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
    [
      voucherAccount.id,
      voucherAccount.vendorId,
      voucherAccount.customerId,
      voucherAccount.balance,
      voucherAccount.currency,
      voucherAccount.status,
      voucherAccount.expiresAt ?? null,
      JSON.stringify(voucherAccount.metadata ?? {}),
      voucherAccount.createdAt,
      voucherAccount.updatedAt,
    ],
    client
  );
}

async function insertIntegrationEvent(event, client) {
  await query(
    `INSERT INTO integration_events
      (id, vendor_id, entity_type, entity_id, event_type, status, request_payload, response_payload, occurred_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10)`,
    [
      event.id,
      event.vendorId ?? null,
      event.entityType,
      event.entityId ?? null,
      event.eventType,
      event.status,
      JSON.stringify(event.requestPayload ?? {}),
      JSON.stringify(event.responsePayload ?? {}),
      event.occurredAt,
      event.createdAt,
    ],
    client
  );
}

async function ensureBaseSeedData() {
  const existing = await fetchOne('SELECT COUNT(*)::int AS count FROM customers');
  if (existing?.count > 0) {
    return false;
  }

  const seed = createSeedDatabase();

  await withTransaction(async (client) => {
    for (const customer of seed.customers) {
      await insertCustomer(customer, client);
    }

    for (const merchant of seed.merchants) {
      await insertMerchant(merchant, client);
    }

    for (const plan of seed.plans) {
      await insertPlan(plan, client);
    }

    for (const voucher of seed.vouchers) {
      await insertVoucher(voucher, client);
    }

    for (const notice of seed.notices) {
      await insertNotice(notice, client);
    }
  });

  return true;
}

async function ensureVendorSeedData() {
  const existing = await fetchOne('SELECT COUNT(*)::int AS count FROM vendors');
  if (existing?.count > 0) {
    return false;
  }

  const createdAt = new Date().toISOString();
  const definitions = listVendorDefinitions();

  await withTransaction(async (client) => {
    for (const definition of definitions) {
      const vendorId = createId('vendor');
      const adapter = getVendorAdapter(definition.slug);

      await insertVendor(
        {
          id: vendorId,
          slug: definition.slug,
          name: definition.name,
          category: definition.category,
          integration: definition.integration,
          status: definition.status,
          capabilities: definition.capabilities,
          metadata: definition.metadata,
          createdAt,
          updatedAt: createdAt,
        },
        client
      );

      for (const item of adapter.createCatalogRecords()) {
        await insertVendorCatalogItem(
          {
            id: createId('vendor-item'),
            vendorId,
            sku: item.sku,
            name: item.name,
            description: item.description,
            price: item.price,
            currency: item.currency || 'ZAR',
            availabilityStatus: item.availabilityStatus || 'available',
            stockQuantity: item.stockQuantity ?? 0,
            metadata: item.metadata,
            createdAt,
            updatedAt: createdAt,
          },
          client
        );
      }
    }
  });

  return true;
}

async function initializeRepository() {
  const database = await initializeDatabase();
  await ensureBaseSeedData();
  await ensureVendorSeedData();
  await purgeExpiredRecords();
  return database;
}

async function getPublicBootstrap() {
  const vendors = await getVendors();
  const customer = await fetchOne(
    'SELECT email, mobile FROM customers ORDER BY created_at ASC LIMIT 1'
  );
  const merchant = await fetchOne(
    'SELECT work_email FROM merchants ORDER BY created_at ASC LIMIT 1'
  );

  return {
    brand: publicCatalog.brand,
    ficaDocuments: publicCatalog.ficaDocuments,
    vendors:
      vendors.length > 0
        ? vendors.map((vendor) => ({
            slug: vendor.slug,
            name: vendor.name,
            category: vendor.category,
            integration: vendor.integration,
            status: vendor.status,
            capabilities: vendor.capabilities,
          }))
        : publicCatalog.vendors,
    journeyDemo: {
      ...publicCatalog.journeyDemo,
      vendorSlug: 'exact',
    },
    demoAccounts: {
      customer: {
        email: customer?.email,
        mobile: customer?.mobile,
      },
      merchant: {
        workEmail: merchant?.work_email,
      },
    },
  };
}

async function getSessionByToken(token) {
  await purgeExpiredRecords();
  const row = await fetchOne(
    'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW() LIMIT 1',
    [token]
  );
  return mapSession(row);
}

async function getCustomerByIdentifier(identifier, client) {
  const normalized = normalizeIdentifier(identifier);
  const row = await fetchOne(
    'SELECT * FROM customers WHERE email = $1 OR mobile = $1 LIMIT 1',
    [normalized],
    client
  );
  return mapCustomer(row);
}

async function getCustomerById(customerId, client) {
  return mapCustomer(
    await fetchOne('SELECT * FROM customers WHERE id = $1 LIMIT 1', [customerId], client)
  );
}

async function getCustomerDocumentUploads(customerId, client) {
  return fetchMany(
    'SELECT * FROM document_uploads WHERE customer_id = $1 ORDER BY uploaded_at DESC',
    [customerId],
    mapDocumentUpload,
    client
  );
}

async function getCustomerDocumentUploadById(customerId, documentId, client) {
  return mapDocumentUpload(
    await fetchOne(
      'SELECT * FROM document_uploads WHERE customer_id = $1 AND id = $2 LIMIT 1',
      [customerId, documentId],
      client
    )
  );
}

async function getPaymentSessionById(sessionId, client) {
  return mapPaymentSession(
    await fetchOne('SELECT * FROM payment_sessions WHERE id = $1 LIMIT 1', [sessionId], client)
  );
}

async function getMerchantById(merchantId, client) {
  return mapMerchant(
    await fetchOne('SELECT * FROM merchants WHERE id = $1 LIMIT 1', [merchantId], client)
  );
}

async function getMerchantByEmail(workEmail, client) {
  return mapMerchant(
    await fetchOne(
      'SELECT * FROM merchants WHERE work_email = $1 LIMIT 1',
      [normalizeEmail(workEmail)],
      client
    )
  );
}

async function getVendors(client) {
  return fetchMany('SELECT * FROM vendors ORDER BY name ASC', [], mapVendor, client);
}

async function getVendorBySlug(vendorSlug, client) {
  return mapVendor(
    await fetchOne('SELECT * FROM vendors WHERE slug = $1 LIMIT 1', [slugifyVendor(vendorSlug)], client)
  );
}

async function getVendorBySlugOrName(vendorSlugOrName, client) {
  const adapter = getVendorAdapter(vendorSlugOrName);
  const slug = adapter?.definition.slug || slugifyVendor(vendorSlugOrName);
  return getVendorBySlug(slug, client);
}

async function getVendorCatalogItems(vendorId, client) {
  return fetchMany(
    'SELECT * FROM vendor_catalog_items WHERE vendor_id = $1 ORDER BY name ASC',
    [vendorId],
    mapVendorCatalogItem,
    client
  );
}

async function getVendorReservationById(reservationId, client) {
  return mapVendorReservation(
    await fetchOne('SELECT * FROM vendor_reservations WHERE id = $1 LIMIT 1', [reservationId], client)
  );
}

async function getVendorReservationByVendorAndCart(vendorId, cartId, client) {
  return mapVendorReservation(
    await fetchOne(
      'SELECT * FROM vendor_reservations WHERE vendor_id = $1 AND cart_id = $2 LIMIT 1',
      [vendorId, cartId],
      client
    )
  );
}

async function getVendorVoucherAccount(vendorId, customerId, client) {
  return mapVendorVoucherAccount(
    await fetchOne(
      'SELECT * FROM vendor_voucher_accounts WHERE vendor_id = $1 AND customer_id = $2 LIMIT 1',
      [vendorId, customerId],
      client
    )
  );
}

function ensureFicaDocumentTitle(title) {
  if (!publicCatalog.ficaDocuments.some((item) => item.title === title)) {
    throw createAppError(400, 'That FICA document type is not supported.');
  }
}

function computeVerificationChecks(customer, mergedDocuments) {
  const questionsPassed = Boolean(mergedDocuments['Verification questions']);
  const uploadDocumentsComplete = uploadBackedDocumentTitles.every((title) =>
    Boolean(mergedDocuments[title])
  );

  return {
    ...customer.verificationChecks,
    accountCreated: true,
    otpVerified: true,
    questionsPassed,
    ficaUploaded: uploadDocumentsComplete && questionsPassed,
  };
}

async function getCustomerDashboard(customerId) {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    return null;
  }

  const [plans, vouchers, notices, payments, documentUploads] = await Promise.all([
    fetchMany(
      'SELECT * FROM plans WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId],
      mapPlan
    ),
    fetchMany(
      'SELECT * FROM vouchers WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId],
      mapVoucher
    ),
    fetchMany(
      `SELECT * FROM notices
       WHERE audience = 'customer' AND (customer_id IS NULL OR customer_id = $1)
       ORDER BY created_at DESC`,
      [customerId],
      mapNotice
    ),
    fetchMany(
      'SELECT * FROM payments WHERE customer_id = $1 ORDER BY created_at DESC',
      [customerId],
      mapPayment
    ),
    getCustomerDocumentUploads(customerId),
  ]);

  return {
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      mobile: customer.mobile,
      idNumber: customer.idNumber,
      createdAt: customer.createdAt,
    },
    verificationChecks: customer.verificationChecks,
    ficaDocuments: customer.ficaDocuments,
    stats: deriveDashboardStats(plans, vouchers, customer.verificationChecks),
    plans,
    vouchers,
    notices,
    payments,
    documentUploads,
  };
}

async function getMerchantWorkspace(merchantId) {
  const merchant = await getMerchantById(merchantId);
  if (!merchant) {
    return null;
  }

  const [plans, notices] = await Promise.all([
    fetchMany(
      'SELECT * FROM plans WHERE merchant = ANY($1::text[]) ORDER BY created_at DESC',
      [merchant.vendorNames],
      mapPlan
    ),
    fetchMany(
      `SELECT * FROM notices
       WHERE audience = 'merchant' AND (merchant_account_id IS NULL OR merchant_account_id = $1)
       ORDER BY created_at DESC`,
      [merchant.id],
      mapNotice
    ),
  ]);

  return deriveMerchantWorkspace(merchant, {
    plans,
    notices,
  });
}

async function registerCustomer(payload) {
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedMobile = normalizeMobile(payload.mobile);
  const existing = await fetchOne(
    'SELECT id FROM customers WHERE email = $1 OR mobile = $2 LIMIT 1',
    [normalizedEmail, normalizedMobile]
  );

  if (existing) {
    throw createAppError(409, 'A customer account with that email or mobile number already exists.');
  }

  const createdAt = new Date().toISOString();
  const customerId = createId('customer');
  const challenge = createOtpChallenge('create-account', customerId, normalizedMobile || normalizedEmail);
  const delivery = await sendOtpCode({
    destination: challenge.destination,
    code: challenge.plainCode,
  });
  challenge.provider = delivery.provider;
  challenge.channel = delivery.channel;
  challenge.deliveryReference = delivery.deliveryReference;

  await withTransaction(async (client) => {
    await insertCustomer(
      {
        id: customerId,
        fullName: payload.fullName,
        email: normalizedEmail,
        mobile: normalizedMobile,
        passwordHash: hashSecret(payload.password),
        verificationChecks: {
          accountCreated: true,
          otpVerified: false,
          questionsPassed: false,
          ficaUploaded: false,
          homeAffairsMatched: false,
        },
        ficaDocuments: createDefaultFicaDocuments(false),
        createdAt,
      },
      client
    );

    await query('DELETE FROM otp_challenges WHERE customer_id = $1', [customerId], client);
    await insertOtpChallenge(challenge, client);
  });

  return {
    challengeId: challenge.id,
    customerId,
    destination: challenge.destination,
    channel: challenge.channel,
    provider: challenge.provider,
    otpRequired: true,
    nextStep: 'verify-otp',
    ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
  };
}

async function beginCustomerSignIn(payload) {
  const customer = await getCustomerByIdentifier(payload.identifier);
  if (!customer || !verifySecret(payload.password, customer.passwordHash)) {
    throw createAppError(401, 'No customer account matches those credentials.');
  }

  const challenge = createOtpChallenge('sign-in', customer.id, customer.mobile || customer.email);
  const delivery = await sendOtpCode({
    destination: challenge.destination,
    code: challenge.plainCode,
  });
  challenge.provider = delivery.provider;
  challenge.channel = delivery.channel;
  challenge.deliveryReference = delivery.deliveryReference;

  await withTransaction(async (client) => {
    await query('DELETE FROM otp_challenges WHERE customer_id = $1', [customer.id], client);
    await insertOtpChallenge(challenge, client);
  });

  return {
    challengeId: challenge.id,
    customerId: customer.id,
    destination: challenge.destination,
    channel: challenge.channel,
    provider: challenge.provider,
    otpRequired: true,
    nextStep: 'verify-otp',
    ...(challenge.devCode ? { devCode: challenge.devCode } : {}),
  };
}

async function verifyCustomerOtp(challengeId, code) {
  return withTransaction(async (client) => {
    await purgeExpiredRecords(client);

    const challenge = mapOtpChallenge(
      await fetchOne('SELECT * FROM otp_challenges WHERE id = $1 LIMIT 1', [challengeId], client)
    );

    if (!challenge) {
      throw createAppError(404, 'That OTP challenge no longer exists. Start the flow again.');
    }

    if (isExpired(challenge.expiresAt)) {
      await query('DELETE FROM otp_challenges WHERE id = $1', [challenge.id], client);
      throw createAppError(410, 'That OTP code has expired. Start the flow again for a fresh code.');
    }

    if (!verifySecret(code.trim(), challenge.codeHash)) {
      const nextAttempts = Math.max((challenge.attemptsRemaining ?? 1) - 1, 0);
      if (nextAttempts === 0) {
        await query('DELETE FROM otp_challenges WHERE id = $1', [challenge.id], client);
      } else {
        await query(
          'UPDATE otp_challenges SET attempts_remaining = $2 WHERE id = $1',
          [challenge.id, nextAttempts],
          client
        );
      }
      throw createAppError(401, 'That OTP code is incorrect.');
    }

    const customer = await getCustomerById(challenge.customerId, client);
    if (!customer) {
      throw createAppError(404, 'The customer linked to that OTP challenge could not be found.');
    }

    const verificationChecks = {
      ...customer.verificationChecks,
      accountCreated: true,
      otpVerified: true,
    };

    await query(
      'UPDATE customers SET verification_checks = $2::jsonb WHERE id = $1',
      [customer.id, JSON.stringify(verificationChecks)],
      client
    );
    await query('DELETE FROM otp_challenges WHERE id = $1', [challenge.id], client);
    await query(
      "DELETE FROM sessions WHERE role = 'customer' AND account_id = $1",
      [customer.id],
      client
    );

    const session = createCustomerSession({
      ...customer,
      verificationChecks,
    });
    await insertSession(session, client);

    return {
      session,
      nextStep: challenge.flow === 'create-account' ? 'fica-upload' : 'dashboard',
    };
  });
}

async function requestPasswordReset(identifier) {
  const customer = await getCustomerByIdentifier(identifier);
  if (!customer) {
    throw createAppError(404, 'No customer account matches that email address or mobile number.');
  }

  const challenge = createPasswordResetChallenge(customer.id, customer.email || customer.mobile);

  await withTransaction(async (client) => {
    await query(
      'DELETE FROM password_reset_challenges WHERE customer_id = $1',
      [customer.id],
      client
    );
    await insertPasswordResetChallenge(challenge, client);
  });

  return {
    resetId: challenge.id,
    customerId: customer.id,
    destination: challenge.destination,
    sent: true,
  };
}

async function resetPassword(resetId, password) {
  return withTransaction(async (client) => {
    await purgeExpiredRecords(client);

    const challenge = mapPasswordResetChallenge(
      await fetchOne(
        'SELECT * FROM password_reset_challenges WHERE id = $1 LIMIT 1',
        [resetId],
        client
      )
    );

    if (!challenge) {
      throw createAppError(404, 'That password reset request has expired or does not exist.');
    }

    if (isExpired(challenge.expiresAt)) {
      await query('DELETE FROM password_reset_challenges WHERE id = $1', [challenge.id], client);
      throw createAppError(410, 'That password reset request has expired. Start again from the access screen.');
    }

    await query(
      'UPDATE customers SET password_hash = $2 WHERE id = $1',
      [challenge.customerId, hashSecret(password)],
      client
    );
    await query('DELETE FROM password_reset_challenges WHERE id = $1', [challenge.id], client);

    return {
      ok: true,
      message: 'Password updated successfully.',
    };
  });
}

async function signInMerchant(payload) {
  const merchant = await getMerchantByEmail(payload.workEmail);
  if (!merchant || !verifySecret(payload.password, merchant.passwordHash)) {
    throw createAppError(401, 'Merchant credentials did not match a configured PayVaylt partner account.');
  }

  const session = createMerchantSession(merchant);

  await withTransaction(async (client) => {
    await query(
      "DELETE FROM sessions WHERE role = 'merchant' AND account_id = $1",
      [merchant.id],
      client
    );
    await insertSession(session, client);
  });

  const workspace = await getMerchantWorkspace(merchant.id);

  return {
    session,
    workspace,
  };
}

async function signOut(token) {
  await query('DELETE FROM sessions WHERE token = $1', [token]);
}

async function updateCustomerFicaDocuments(customerId, documents) {
  await withTransaction(async (client) => {
    const customer = await getCustomerById(customerId, client);
    if (!customer) {
      throw createAppError(404, 'That customer profile could not be found.');
    }

    const mergedDocuments = {
      ...customer.ficaDocuments,
      ...documents,
    };
    const verificationChecks = computeVerificationChecks(customer, mergedDocuments);

    await query(
      'UPDATE customers SET fica_documents = $2::jsonb, verification_checks = $3::jsonb WHERE id = $1',
      [customerId, JSON.stringify(mergedDocuments), JSON.stringify(verificationChecks)],
      client
    );

    if (verificationChecks.ficaUploaded && !customer.verificationChecks.ficaUploaded) {
      await insertNotice(
        {
          id: createId('notice'),
          title: 'FICA submitted',
          description: 'Your document pack is complete and ready for final identity matching.',
          icon: 'fact-check',
          audience: 'customer',
          customerId,
          type: 'verification',
          createdAt: new Date().toISOString(),
        },
        client
      );
    }
  });

  return getCustomerDashboard(customerId);
}

async function uploadCustomerDocument(customerId, title, storedFile) {
  ensureFicaDocumentTitle(title);

  return withTransaction(async (client) => {
    const customer = await getCustomerById(customerId, client);
    if (!customer) {
      throw createAppError(404, 'That customer profile could not be found.');
    }

    if (!uploadBackedDocumentTitles.includes(title)) {
      throw createAppError(400, 'That verification step is completed in-app and does not accept file uploads.');
    }

    const uploadedAt = new Date().toISOString();
    await insertDocumentUpload(
      {
        id: createId('document'),
        customerId,
        title,
        originalName: storedFile.originalName,
        mimeType: storedFile.mimeType,
        sizeBytes: storedFile.sizeBytes,
        storageKey: storedFile.storageKey,
        status: 'uploaded',
        uploadedAt,
      },
      client
    );

    const mergedDocuments = {
      ...customer.ficaDocuments,
      [title]: true,
    };
    const verificationChecks = computeVerificationChecks(customer, mergedDocuments);

    await query(
      'UPDATE customers SET fica_documents = $2::jsonb, verification_checks = $3::jsonb WHERE id = $1',
      [customerId, JSON.stringify(mergedDocuments), JSON.stringify(verificationChecks)],
      client
    );

    await insertNotice(
      {
        id: createId('notice'),
        title: `${title} uploaded`,
        description: `${storedFile.originalName} was received and linked to your PayVaylt profile.`,
        icon: 'upload-file',
        audience: 'customer',
        customerId,
        type: 'verification',
        createdAt: uploadedAt,
      },
      client
    );
  }).then(() => getCustomerDashboard(customerId));
}

async function completeVerificationQuestions(customerId) {
  return withTransaction(async (client) => {
    const customer = await getCustomerById(customerId, client);
    if (!customer) {
      throw createAppError(404, 'That customer profile could not be found.');
    }

    const mergedDocuments = {
      ...customer.ficaDocuments,
      'Verification questions': true,
    };
    const verificationChecks = computeVerificationChecks(customer, mergedDocuments);

    await query(
      'UPDATE customers SET fica_documents = $2::jsonb, verification_checks = $3::jsonb WHERE id = $1',
      [customerId, JSON.stringify(mergedDocuments), JSON.stringify(verificationChecks)],
      client
    );

    await insertNotice(
      {
        id: createId('notice'),
        title: 'Verification questions completed',
        description: 'Your account questions were saved and counted toward your FICA review pack.',
        icon: 'quiz',
        audience: 'customer',
        customerId,
        type: 'verification',
        createdAt: new Date().toISOString(),
      },
      client
    );
  }).then(() => getCustomerDashboard(customerId));
}

async function getCustomerDocumentDownload(customerId, documentId) {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw createAppError(404, 'That customer profile could not be found.');
  }

  const documentUpload = await getCustomerDocumentUploadById(customerId, documentId);
  if (!documentUpload) {
    throw createAppError(404, 'That document could not be found for this customer.');
  }

  return documentUpload;
}

async function completeHomeAffairsCheck(customerId) {
  return withTransaction(async (client) => {
    const customer = await getCustomerById(customerId, client);
    if (!customer) {
      throw createAppError(404, 'That customer profile could not be found.');
    }

    const verificationChecks = {
      ...customer.verificationChecks,
      homeAffairsMatched: true,
    };

    await query(
      'UPDATE customers SET verification_checks = $2::jsonb WHERE id = $1',
      [customerId, JSON.stringify(verificationChecks)],
      client
    );

    if (!customer.verificationChecks.homeAffairsMatched) {
      await insertNotice(
        {
          id: createId('notice'),
          title: 'Verification complete',
          description: 'Home Affairs matching is complete. Your full PayVaylt customer workspace is unlocked.',
          icon: 'verified-user',
          audience: 'customer',
          customerId,
          type: 'verification',
          createdAt: new Date().toISOString(),
        },
        client
      );
    }
  }).then(() => getCustomerDashboard(customerId));
}

async function purchaseVoucher(customerId, payload) {
  const result = await syncVendorVoucherAccount(payload.merchant, customerId, payload);
  return result.dashboard;
}

async function createPlan(customerId, payload) {
  if (payload.depositPaid > payload.total) {
    throw createAppError(400, 'Deposit cannot exceed the total cart value.');
  }

  const createdAt = new Date().toISOString();
  const planId = createId('plan');
  const remaining = Number((payload.total - payload.depositPaid).toFixed(2));
  const progress = payload.total > 0 ? Math.round((payload.depositPaid / payload.total) * 100) : 0;

  await withTransaction(async (client) => {
    await insertPlan(
      {
        id: planId,
        customerId,
        merchant: payload.merchant,
        item: payload.item,
        itemCount: payload.itemCount,
        depositPaid: payload.depositPaid,
        remaining,
        total: payload.total,
        cadence: payload.cadence,
        termMonths: payload.termMonths,
        nextPayment: payload.nextPayment,
        progress,
        status: remaining > 0 ? 'On track' : 'Completed',
        payoutMethod: payload.payoutMethod,
        cartId: payload.cartId,
        createdAt,
      },
      client
    );

    if (payload.depositPaid > 0) {
      await insertPayment(
        {
          id: createId('payment'),
          customerId,
          planId,
          amount: payload.depositPaid,
          kind: 'deposit',
          method: 'Card / EFT',
          createdAt,
        },
        client
      );
    }
  });

  return getCustomerDashboard(customerId);
}

async function createCheckoutPaymentSession(payload) {
  const amount = Math.max(
    Number((payload.journey.cartTotal - payload.plan.deposit - payload.plan.voucherAmount).toFixed(2)),
    0
  );

  const createdAt = new Date().toISOString();
  if (amount === 0) {
    const immediateSession = {
      id: createId('payment-session'),
      customerId: null,
      provider: 'payvaylt',
      providerReference: null,
      amount,
      currency: 'ZAR',
      kind: 'checkout-finalization',
      status: 'paid',
      checkoutUrl: null,
      metadata: {
        cartId: payload.journey.cartId,
        customerEmail: normalizeEmail(payload.registration.email),
        customerMobile: normalizeMobile(payload.registration.mobile),
        releaseReference: payload.releaseReference,
      },
      createdAt,
      updatedAt: createdAt,
    };

    await insertPaymentSession(immediateSession);
    return immediateSession;
  }

  const providerSession = await createProviderPaymentSession({
    amount,
    currency: 'ZAR',
    itemName: `${payload.journey.store} lay-by payment`,
    description: `${payload.journey.leadItem} (${payload.journey.cartId})`,
    metadata: {
      cartId: payload.journey.cartId,
      customerEmail: payload.registration.email,
      customerMobile: payload.registration.mobile,
      merchant: payload.journey.store,
    },
  });

  const paymentSession = {
    id: createId('payment-session'),
    customerId: null,
    provider: providerSession.provider,
    providerReference: providerSession.providerReference,
    amount,
    currency: providerSession.currency || 'ZAR',
    kind: 'checkout-finalization',
    status: providerSession.status,
    checkoutUrl: providerSession.checkoutUrl ?? null,
    metadata: {
      cartId: payload.journey.cartId,
      customerEmail: normalizeEmail(payload.registration.email),
      customerMobile: normalizeMobile(payload.registration.mobile),
      releaseReference: payload.releaseReference,
    },
    createdAt,
    updatedAt: createdAt,
  };

  await insertPaymentSession(paymentSession);

  return paymentSession;
}

async function confirmCheckoutPaymentSession(paymentSessionId) {
  return withTransaction(async (client) => {
    const paymentSession = await getPaymentSessionById(paymentSessionId, client);
    if (!paymentSession) {
      throw createAppError(404, 'That payment session could not be found.');
    }

    const confirmation = await confirmProviderPaymentSession(paymentSession);
    const updatedAt = new Date().toISOString();

    await query(
      `UPDATE payment_sessions
       SET status = $2,
           provider_reference = COALESCE($3, provider_reference),
           updated_at = $4
       WHERE id = $1`,
      [
        paymentSession.id,
        confirmation.status,
        confirmation.providerReference ?? null,
        updatedAt,
      ],
      client
    );

    return getPaymentSessionById(paymentSession.id, client);
  });
}

async function markStripePaymentSessionPaid(providerReference) {
  if (!providerReference) {
    return null;
  }

  const updatedAt = new Date().toISOString();
  await query(
    `UPDATE payment_sessions
     SET status = 'paid',
         updated_at = $2
     WHERE provider = 'stripe' AND provider_reference = $1`,
    [providerReference, updatedAt]
  );

  return mapPaymentSession(
    await fetchOne(
      `SELECT * FROM payment_sessions
       WHERE provider = 'stripe' AND provider_reference = $1
       LIMIT 1`,
      [providerReference]
    )
  );
}

async function completeCheckout(payload, paymentSessionId) {
  const finalPaymentAmount = Math.max(
    payload.journey.cartTotal - payload.plan.deposit - payload.plan.voucherAmount,
    0
  );
  const createdAt = new Date().toISOString();

  const { customerId, session } = await withTransaction(async (client) => {
    if (paymentSessionId) {
      const paymentSession = await getPaymentSessionById(paymentSessionId, client);
      if (!paymentSession) {
        throw createAppError(404, 'That payment session could not be found.');
      }

      if (paymentSession.status !== 'paid') {
        throw createAppError(409, 'The payment session is not marked as paid yet.');
      }

      const sessionCartId = String(paymentSession.metadata?.cartId || '');
      if (sessionCartId && sessionCartId !== payload.journey.cartId) {
        throw createAppError(409, 'The payment session does not match this cart.');
      }
    }

    let customer = await getCustomerByIdentifier(payload.registration.email, client);
    if (!customer) {
      customer = await getCustomerByIdentifier(payload.registration.mobile, client);
    }

    const customerId = customer?.id ?? createId('customer');
    const customerPayload = {
      fullName: payload.registration.fullName,
      email: normalizeEmail(payload.registration.email),
      mobile: normalizeMobile(payload.registration.mobile),
      passwordHash: hashSecret(payload.registration.password),
      idNumber: payload.registration.idNumber,
      verificationChecks: payload.verification,
      ficaDocuments: createDefaultFicaDocuments(payload.verification.ficaUploaded),
      createdAt: customer?.createdAt ?? createdAt,
    };

    if (!customer) {
      await insertCustomer(
        {
          id: customerId,
          ...customerPayload,
        },
        client
      );
    } else {
      await query(
        `UPDATE customers
         SET full_name = $2,
             email = $3,
             mobile = $4,
             password_hash = $5,
             id_number = $6,
             verification_checks = $7::jsonb,
             fica_documents = $8::jsonb
         WHERE id = $1`,
        [
          customerId,
          customerPayload.fullName,
          customerPayload.email,
          customerPayload.mobile,
          customerPayload.passwordHash,
          customerPayload.idNumber,
          JSON.stringify(customerPayload.verificationChecks),
          JSON.stringify(customerPayload.ficaDocuments),
        ],
        client
      );
    }

    const existingPlan = mapPlan(
      await fetchOne('SELECT * FROM plans WHERE cart_id = $1 LIMIT 1', [payload.journey.cartId], client)
    );
    const planId = existingPlan?.id ?? createId('plan');
    const plan = {
      id: planId,
      customerId,
      merchant: payload.journey.store,
      item: payload.journey.leadItem,
      itemCount: payload.journey.itemCount,
      depositPaid: payload.plan.deposit,
      remaining: 0,
      total: payload.journey.cartTotal,
      cadence: payload.plan.cadence,
      termMonths: payload.plan.termMonths,
      nextPayment: 'Paid in full',
      progress: 100,
      status: 'Completed',
      payoutMethod: payload.plan.voucherAmount > 0 ? 'Voucher + card top-up' : 'Direct EFT',
      cartId: payload.journey.cartId,
      reservedUntil: payload.journey.reservedUntil,
      releaseLeadTime: payload.journey.releaseLeadTime,
      releaseReference: payload.releaseReference,
      createdAt: existingPlan?.createdAt ?? createdAt,
    };

    if (existingPlan) {
      await query(
        `UPDATE plans
         SET customer_id = $2,
             merchant = $3,
             item = $4,
             item_count = $5,
             deposit_paid = $6,
             remaining = $7,
             total = $8,
             cadence = $9,
             term_months = $10,
             next_payment = $11,
             progress = $12,
             status = $13,
             payout_method = $14,
             reserved_until = $15,
             release_lead_time = $16,
             release_reference = $17
         WHERE id = $1`,
        [
          plan.id,
          plan.customerId,
          plan.merchant,
          plan.item,
          plan.itemCount,
          plan.depositPaid,
          plan.remaining,
          plan.total,
          plan.cadence,
          plan.termMonths,
          plan.nextPayment,
          plan.progress,
          plan.status,
          plan.payoutMethod,
          plan.reservedUntil ?? null,
          plan.releaseLeadTime ?? null,
          plan.releaseReference ?? null,
        ],
        client
      );
    } else {
      await insertPlan(plan, client);
    }

    if (payload.plan.voucherAmount > 0) {
      await query(
        `UPDATE vouchers
         SET balance = GREATEST(balance - $3, 0)
         WHERE customer_id = $1 AND merchant = $2`,
        [customerId, payload.journey.store, payload.plan.voucherAmount],
        client
      );
    }

    await query('DELETE FROM payments WHERE plan_id = $1', [planId], client);

    if (payload.plan.deposit > 0) {
      await insertPayment(
        {
          id: createId('payment'),
          customerId,
          planId,
          amount: payload.plan.deposit,
          kind: 'deposit',
          method: 'Card / EFT',
          createdAt,
        },
        client
      );
    }

    if (payload.plan.voucherAmount > 0) {
      await insertPayment(
        {
          id: createId('payment'),
          customerId,
          planId,
          amount: payload.plan.voucherAmount,
          kind: 'voucher',
          method: `${payload.journey.store} voucher`,
          createdAt,
        },
        client
      );
    }

    if (finalPaymentAmount > 0) {
      await insertPayment(
        {
          id: createId('payment'),
          customerId,
          planId,
          amount: finalPaymentAmount,
          kind: 'final',
          method: 'Card / EFT',
          createdAt,
        },
        client
      );
    }

    if (paymentSessionId) {
      await query(
        'UPDATE payment_sessions SET customer_id = $2, updated_at = $3 WHERE id = $1',
        [paymentSessionId, customerId, createdAt],
        client
      );
    }

    if (payload.vendorReservationId) {
      const reservation = await getVendorReservationById(payload.vendorReservationId, client);
      if (!reservation) {
        throw createAppError(404, 'That vendor reservation could not be found.');
      }

      if (reservation.cartId !== payload.journey.cartId) {
        throw createAppError(409, 'The vendor reservation does not match this cart.');
      }

      await query(
        `UPDATE vendor_reservations
         SET customer_id = COALESCE($2, customer_id),
             status = 'release-ready',
             release_reference = $3,
             updated_at = $4
         WHERE id = $1`,
        [reservation.id, customerId, payload.releaseReference, createdAt],
        client
      );

      await insertIntegrationEvent(
        {
          id: createId('integration-event'),
          vendorId: reservation.vendorId,
          entityType: 'vendor-reservation',
          entityId: reservation.id,
          eventType: 'release-ready',
          status: 'processed',
          requestPayload: {
            cartId: payload.journey.cartId,
            releaseReference: payload.releaseReference,
          },
          responsePayload: {
            reservationId: reservation.id,
            status: 'release-ready',
          },
          occurredAt: createdAt,
          createdAt,
        },
        client
      );
    }

    await insertNotice(
      {
        id: createId('notice'),
        title: 'Merchant release triggered',
        description: `${payload.journey.store} can now release ${payload.journey.leadItem} with reference ${payload.releaseReference}.`,
        icon: 'local-shipping',
        audience: 'customer',
        customerId,
        type: 'release',
        createdAt,
      },
      client
    );

    const merchantRow = await fetchOne('SELECT id FROM merchants ORDER BY created_at ASC LIMIT 1', [], client);
    await insertNotice(
      {
        id: createId('notice'),
        title: 'Release-ready order',
        description: `${payload.registration.fullName} completed ${payload.journey.leadItem}. Release reference ${payload.releaseReference} is ready for merchant handoff.`,
        icon: 'assignment-turned-in',
        audience: 'merchant',
        merchantAccountId: merchantRow?.id ?? null,
        type: 'release',
        createdAt,
      },
      client
    );

    await query(
      "DELETE FROM sessions WHERE role = 'customer' AND account_id = $1",
      [customerId],
      client
    );
    const session = createCustomerSession({
      id: customerId,
      fullName: payload.registration.fullName,
      email: payload.registration.email,
      mobile: payload.registration.mobile,
    });
    await insertSession(session, client);

    return { customerId, session };
  });

  return {
    releaseReference: payload.releaseReference,
    session,
    dashboard: await getCustomerDashboard(customerId),
  };
}

async function listVendorIntegrations() {
  return getVendors();
}

async function getVendorCatalog(vendorSlug) {
  const vendor = await getVendorBySlug(vendorSlug);
  if (!vendor) {
    throw createAppError(404, 'That vendor integration could not be found.');
  }

  const items = await getVendorCatalogItems(vendor.id);
  return {
    vendor,
    items,
  };
}

async function createVendorReservation(vendorSlug, payload) {
  return withTransaction(async (client) => {
    const vendor = await getVendorBySlugOrName(vendorSlug, client);
    if (!vendor) {
      throw createAppError(404, 'That vendor integration could not be found.');
    }

    const adapter = getVendorAdapter(vendor.slug);
    if (!adapter) {
      throw createAppError(501, 'That vendor integration is not configured yet.');
    }

    const existing = await getVendorReservationByVendorAndCart(vendor.id, payload.cartId, client);
    if (existing) {
      return {
        vendor,
        reservation: existing,
      };
    }

    const providerReservation = await adapter.createReservation(payload);
    const createdAt = new Date().toISOString();
    const reservation = {
      id: createId('vendor-reservation'),
      vendorId: vendor.id,
      customerId: payload.customerId ?? null,
      externalReference: providerReservation.externalReference ?? null,
      cartId: payload.cartId,
      itemName: payload.itemName,
      itemCount: payload.itemCount ?? 1,
      total: payload.total,
      currency: payload.currency || 'ZAR',
      status: providerReservation.status || 'reserved',
      reservedUntil: providerReservation.reservedUntil ?? null,
      releaseReference: payload.releaseReference ?? null,
      metadata: {
        ...(payload.metadata || {}),
        ...(providerReservation.metadata || {}),
      },
      createdAt,
      updatedAt: createdAt,
    };

    await insertVendorReservation(reservation, client);
    await insertIntegrationEvent(
      {
        id: createId('integration-event'),
        vendorId: vendor.id,
        entityType: 'vendor-reservation',
        entityId: reservation.id,
        eventType: 'reserve-cart',
        status: 'processed',
        requestPayload: payload,
        responsePayload: {
          externalReference: reservation.externalReference,
          status: reservation.status,
          reservedUntil: reservation.reservedUntil,
        },
        occurredAt: createdAt,
        createdAt,
      },
      client
    );

    return {
      vendor,
      reservation: await getVendorReservationById(reservation.id, client),
    };
  });
}

async function syncVendorVoucherAccount(vendorSlugOrName, customerId, payload) {
  await withTransaction(async (client) => {
    const customer = await getCustomerById(customerId, client);
    if (!customer) {
      throw createAppError(404, 'That customer profile could not be found.');
    }

    const vendor = await getVendorBySlugOrName(vendorSlugOrName, client);
    if (!vendor) {
      throw createAppError(404, 'That vendor integration could not be found.');
    }

    const adapter = getVendorAdapter(vendor.slug);
    if (!adapter) {
      throw createAppError(501, 'That vendor integration is not configured yet.');
    }

    const existingAccount = await getVendorVoucherAccount(vendor.id, customerId, client);
    const synced = await adapter.syncVoucherAccount({
      amount: payload.amount,
      currentBalance: existingAccount?.balance ?? 0,
      useCase: payload.useCase,
      customerId,
    });
    const updatedAt = new Date().toISOString();

    if (existingAccount) {
      await query(
        `UPDATE vendor_voucher_accounts
         SET balance = $3,
             currency = $4,
             status = $5,
             expires_at = $6,
             metadata = $7::jsonb,
             updated_at = $8
         WHERE id = $1 AND vendor_id = $2`,
        [
          existingAccount.id,
          vendor.id,
          synced.balance,
          synced.currency || 'ZAR',
          synced.status || 'active',
          synced.expiresAt ?? null,
          JSON.stringify(synced.metadata ?? {}),
          updatedAt,
        ],
        client
      );
    } else {
      await insertVendorVoucherAccount(
        {
          id: createId('vendor-voucher'),
          vendorId: vendor.id,
          customerId,
          balance: synced.balance,
          currency: synced.currency || 'ZAR',
          status: synced.status || 'active',
          expiresAt: synced.expiresAt ?? null,
          metadata: synced.metadata,
          createdAt: updatedAt,
          updatedAt,
        },
        client
      );
    }

    const existingVoucher = mapVoucher(
      await fetchOne(
        'SELECT * FROM vouchers WHERE customer_id = $1 AND merchant = $2 LIMIT 1',
        [customerId, vendor.name],
        client
      )
    );

    if (existingVoucher) {
      await query(
        `UPDATE vouchers
         SET balance = $3,
             expiry = $4,
             use_case = $5
         WHERE customer_id = $1 AND merchant = $2`,
        [customerId, vendor.name, synced.balance, synced.expiresAt ?? 'No expiry', payload.useCase],
        client
      );
    } else {
      await insertVoucher(
        {
          id: createId('voucher'),
          customerId,
          merchant: vendor.name,
          balance: synced.balance,
          expiry: synced.expiresAt ?? 'No expiry',
          useCase: payload.useCase,
          createdAt: updatedAt,
        },
        client
      );
    }

    await insertNotice(
      {
        id: createId('notice'),
        title: 'Voucher synced with vendor',
        description: `${vendor.name} voucher balance is now ${formatCurrency(synced.balance)}.`,
        icon: 'redeem',
        audience: 'customer',
        customerId,
        type: 'voucher',
        createdAt: updatedAt,
      },
      client
    );

    await insertIntegrationEvent(
      {
        id: createId('integration-event'),
        vendorId: vendor.id,
        entityType: 'vendor-voucher-account',
        entityId: existingAccount?.id ?? null,
        eventType: 'sync-voucher-balance',
        status: 'processed',
        requestPayload: payload,
        responsePayload: {
          balance: synced.balance,
          currency: synced.currency || 'ZAR',
          expiresAt: synced.expiresAt ?? 'No expiry',
        },
        occurredAt: updatedAt,
        createdAt: updatedAt,
      },
      client
    );
  });

  const vendor = await getVendorBySlugOrName(vendorSlugOrName);
  return {
    vendor,
    dashboard: await getCustomerDashboard(customerId),
  };
}

module.exports = {
  beginCustomerSignIn,
  completeVerificationQuestions,
  confirmCheckoutPaymentSession,
  createAppError,
  createCheckoutPaymentSession,
  completeCheckout,
  completeHomeAffairsCheck,
  createVendorReservation,
  createPlan,
  getCustomerDashboard,
  getCustomerDocumentDownload,
  getVendorCatalog,
  listVendorIntegrations,
  getMerchantWorkspace,
  getPublicBootstrap,
  getSessionByToken,
  initializeRepository,
  markStripePaymentSessionPaid,
  purchaseVoucher,
  registerCustomer,
  requestPasswordReset,
  resetPassword,
  signInMerchant,
  signOut,
  syncVendorVoucherAccount,
  uploadCustomerDocument,
  updateCustomerFicaDocuments,
  verifyCustomerOtp,
  getDatabaseInfo,
};
