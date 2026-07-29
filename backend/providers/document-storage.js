const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const uploadsRoot = process.env.PAYVAYLT_UPLOADS_DIR
  ? path.resolve(process.env.PAYVAYLT_UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');

const storageMode =
  process.env.PAYVAYLT_DOCUMENT_STORAGE ||
  (process.env.PAYVAYLT_S3_BUCKET ? 's3' : 'local');
const maxUploadBytes = Number(process.env.PAYVAYLT_MAX_UPLOAD_BYTES || 10 * 1024 * 1024);

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

function createStorageError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDocumentStorageInfo() {
  return {
    mode: storageMode,
    target: storageMode === 's3' ? process.env.PAYVAYLT_S3_BUCKET || 'unconfigured bucket' : uploadsRoot,
    maxUploadBytes,
  };
}

function sanitizeSegment(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function ensureUploadsRoot() {
  fs.mkdirSync(uploadsRoot, { recursive: true });
}

function resolveStoragePath(storageKey) {
  return path.join(uploadsRoot, storageKey);
}

function createStorageKey(customerId, title, originalName) {
  const extension = path.extname(originalName || '') || '.bin';
  const customerSegment = sanitizeSegment(customerId || 'customer');
  const titleSegment = sanitizeSegment(title || 'document');
  const randomPart = crypto.randomBytes(8).toString('hex');

  return path.posix.join(customerSegment, `${titleSegment}-${Date.now()}-${randomPart}${extension}`);
}

function validateUploadedFile(file) {
  if (!file) {
    throw createStorageError(400, 'No file upload was received.');
  }

  if (!allowedMimeTypes.has(file.mimetype)) {
    throw createStorageError(400, 'Only PDF, JPG, PNG, HEIC, HEIF, or WEBP files are supported.');
  }

  if (file.size > maxUploadBytes) {
    throw createStorageError(
      413,
      `Document uploads cannot exceed ${Math.round(maxUploadBytes / 1024 / 1024)} MB.`
    );
  }
}

function getS3Config() {
  return {
    bucket: process.env.PAYVAYLT_S3_BUCKET || '',
    region: process.env.PAYVAYLT_S3_REGION || 'us-east-1',
    endpoint: process.env.PAYVAYLT_S3_ENDPOINT || '',
    accessKeyId: process.env.PAYVAYLT_S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.PAYVAYLT_S3_SECRET_ACCESS_KEY || '',
    forcePathStyle:
      process.env.PAYVAYLT_S3_FORCE_PATH_STYLE === 'true' ||
      Boolean(process.env.PAYVAYLT_S3_ENDPOINT),
  };
}

function assertS3Config(config = getS3Config()) {
  const missing = [];
  if (!config.bucket) missing.push('PAYVAYLT_S3_BUCKET');
  if (!config.accessKeyId) missing.push('PAYVAYLT_S3_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('PAYVAYLT_S3_SECRET_ACCESS_KEY');

  if (missing.length > 0) {
    throw createStorageError(
      500,
      `S3 document storage is missing required environment variables: ${missing.join(', ')}.`
    );
  }
}

function encodePathSegment(segment) {
  return encodeURIComponent(segment).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function encodeS3Key(storageKey) {
  return storageKey.split('/').map(encodePathSegment).join('/');
}

function createS3ObjectUrl(storageKey, config = getS3Config()) {
  const encodedKey = encodeS3Key(storageKey);

  if (config.endpoint) {
    const endpoint = new URL(config.endpoint);
    const basePath = endpoint.pathname.replace(/\/+$/, '');
    const url = new URL(endpoint.toString());

    if (config.forcePathStyle) {
      url.pathname = `${basePath}/${encodePathSegment(config.bucket)}/${encodedKey}`;
    } else {
      url.hostname = `${config.bucket}.${endpoint.hostname}`;
      url.pathname = `${basePath}/${encodedKey}`;
    }

    return url;
  }

  if (config.forcePathStyle) {
    return new URL(`https://s3.${config.region}.amazonaws.com/${encodePathSegment(config.bucket)}/${encodedKey}`);
  }

  return new URL(`https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodedKey}`);
}

function hashHex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hmac(key, value, encoding) {
  return crypto.createHmac('sha256', key).update(value).digest(encoding);
}

function getSigningKey(secretAccessKey, dateStamp, region) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
}

function formatAmzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function canonicalQueryString(searchParams) {
  return [...searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey ? leftValue.localeCompare(rightValue) : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${encodePathSegment(key)}=${encodePathSegment(value)}`)
    .join('&');
}

function buildStringToSign({ method, url, headers, signedHeaders, payloadHash, config, amzDate, dateStamp }) {
  const canonicalHeaders = signedHeaders
    .split(';')
    .map((headerName) => `${headerName}:${headers[headerName]}`)
    .join('\n');
  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQueryString(url.searchParams),
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    hashHex(canonicalRequest),
  ].join('\n');

  return {
    credentialScope,
    stringToSign,
  };
}

function createS3Authorization({ method, url, body, contentType, config }) {
  const { amzDate, dateStamp } = formatAmzDate();
  const payloadHash = hashHex(body);
  const headers = {
    'content-type': contentType,
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(';');
  const { credentialScope, stringToSign } = buildStringToSign({
    method,
    url,
    headers,
    signedHeaders,
    payloadHash,
    config,
    amzDate,
    dateStamp,
  });
  const signature = hmac(getSigningKey(config.secretAccessKey, dateStamp, config.region), stringToSign, 'hex');

  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'Content-Type': contentType,
    'X-Amz-Content-Sha256': payloadHash,
    'X-Amz-Date': amzDate,
  };
}

function createPresignedS3Url(storageKey, expiresInSeconds = 300) {
  const config = getS3Config();
  assertS3Config(config);

  const url = createS3ObjectUrl(storageKey, config);
  const { amzDate, dateStamp } = formatAmzDate();
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;

  url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
  url.searchParams.set('X-Amz-Credential', `${config.accessKeyId}/${credentialScope}`);
  url.searchParams.set('X-Amz-Date', amzDate);
  url.searchParams.set('X-Amz-Expires', String(expiresInSeconds));
  url.searchParams.set('X-Amz-SignedHeaders', 'host');

  const headers = {
    host: url.host,
  };
  const { stringToSign } = buildStringToSign({
    method: 'GET',
    url,
    headers,
    signedHeaders: 'host',
    payloadHash: 'UNSIGNED-PAYLOAD',
    config,
    amzDate,
    dateStamp,
  });
  const signature = hmac(getSigningKey(config.secretAccessKey, dateStamp, config.region), stringToSign, 'hex');
  url.searchParams.set('X-Amz-Signature', signature);

  return url.toString();
}

async function storeUploadedDocumentLocally({ customerId, title, file }) {
  ensureUploadsRoot();

  const storageKey = createStorageKey(customerId, title, file.originalname);
  const destination = resolveStoragePath(storageKey);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, file.buffer);

  return {
    storageKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}

async function storeUploadedDocumentInS3({ customerId, title, file }) {
  const config = getS3Config();
  assertS3Config(config);

  const storageKey = createStorageKey(customerId, title, file.originalname);
  const url = createS3ObjectUrl(storageKey, config);
  const response = await fetch(url, {
    method: 'PUT',
    headers: createS3Authorization({
      method: 'PUT',
      url,
      body: file.buffer,
      contentType: file.mimetype,
      config,
    }),
    body: file.buffer,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw createStorageError(
      502,
      `S3 document upload failed with status ${response.status}${body ? `: ${body}` : ''}.`
    );
  }

  return {
    storageKey,
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}

async function storeUploadedDocument(payload) {
  validateUploadedFile(payload.file);

  if (storageMode === 's3') {
    return storeUploadedDocumentInS3(payload);
  }

  return storeUploadedDocumentLocally(payload);
}

function createDownloadDescriptor(storageKey) {
  if (storageMode === 's3') {
    return {
      type: 'redirect',
      url: createPresignedS3Url(storageKey),
    };
  }

  return {
    type: 'local',
    absolutePath: resolveStoragePath(storageKey),
  };
}

module.exports = {
  createDownloadDescriptor,
  getDocumentStorageInfo,
  resolveStoragePath,
  storeUploadedDocument,
  uploadsRoot,
};
