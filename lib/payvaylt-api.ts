import * as FileSystem from 'expo-file-system/legacy';
import type {
  Cadence,
  DocumentUpload,
  LaybyPlan,
  PaymentRecord,
  SupportNotice,
  VerificationChecks,
  Voucher,
} from '@/lib/payvaylt-mvp';

export type ApiSession = {
  id: string;
  token: string;
  role: 'customer' | 'merchant';
  accountId: string;
  displayName: string;
  identifier: string;
  createdAt: string;
  expiresAt?: string;
};

export type ApiOtpChallenge = {
  challengeId: string;
  customerId: string;
  destination: string;
  channel?: string;
  provider?: string;
  otpRequired: boolean;
  nextStep: 'verify-otp';
  devCode?: string;
};

export type ApiResetChallenge = {
  resetId: string;
  customerId: string;
  destination: string;
  sent: boolean;
};

export type DashboardResponse = {
  customer: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
    idNumber?: string;
    createdAt: string;
  };
  verificationChecks: VerificationChecks;
  ficaDocuments: Record<string, boolean>;
  stats: { label: string; value: string; detail: string }[];
  plans: LaybyPlan[];
  vouchers: Voucher[];
  notices: SupportNotice[];
  payments: PaymentRecord[];
  documentUploads: DocumentUpload[];
};

export type MerchantWorkspaceResponse = {
  merchant: {
    id: string;
    companyName: string;
    workEmail: string;
    vendorNames: string[];
  };
  metrics: { label: string; value: string; detail: string }[];
  plans: LaybyPlan[];
  notices: SupportNotice[];
  releaseQueue: LaybyPlan[];
};

export type PaymentSessionResponse = {
  id: string;
  customerId?: string;
  provider: string;
  providerReference?: string;
  amount: number;
  currency: string;
  kind: string;
  status: string;
  checkoutUrl?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UploadableDocument = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  file?: File | null;
};

function arrayBufferToBase64(arrayBuffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return globalThis.btoa(binary);
}

async function toBase64(file: UploadableDocument) {
  if (file.file) {
    const arrayBuffer = await file.file.arrayBuffer();
    return arrayBufferToBase64(arrayBuffer);
  }

  return FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function getPayVayltApiBaseUrl() {
  const envBaseUrl = process.env.EXPO_PUBLIC_PAYVAYLT_API_URL;
  if (envBaseUrl && envBaseUrl.trim().length > 0) {
    return trimTrailingSlash(envBaseUrl.trim());
  }

  return 'http://localhost:4000/api';
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  sessionToken?: string
): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (sessionToken) {
    headers.set('Authorization', `Bearer ${sessionToken}`);
  }

  const response = await fetch(`${getPayVayltApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `PayVaylt API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

function mutateCustomerDocuments(
  customerId: string,
  documents: Record<string, unknown>,
  sessionToken: string
) {
  return request<DashboardResponse>(
    `/customers/${customerId}/fica-documents`,
    {
      method: 'PATCH',
      body: JSON.stringify({ documents }),
    },
    sessionToken
  );
}

export const payVayltApi = {
  health() {
    return request<{ ok: boolean; service: string; version: number }>('/health');
  },

  bootstrap() {
    return request<{
      brand: { headline: string; tagline: string; summary: string };
      ficaDocuments: { title: string; detail: string }[];
      vendors: { name: string; category: string; integration: string; status: string }[];
      journeyDemo: Record<string, unknown>;
      demoAccounts: Record<string, unknown>;
    }>('/catalog/bootstrap');
  },

  registerCustomer(payload: {
    fullName: string;
    email: string;
    mobile: string;
    password: string;
  }) {
    return request<ApiOtpChallenge>('/auth/customers/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signInCustomer(payload: { identifier: string; password: string }) {
    return request<ApiOtpChallenge>('/auth/customers/sign-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyCustomerOtp(payload: { challengeId: string; code: string }) {
    return request<{ session: ApiSession; nextStep: 'dashboard' | 'fica-upload' }>(
      '/auth/customers/verify-otp',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  requestPasswordReset(identifier: string) {
    return request<ApiResetChallenge>('/auth/customers/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    });
  },

  resetPassword(payload: { resetId: string; password: string }) {
    return request<{ ok: boolean; message: string }>('/auth/customers/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  signInMerchant(payload: { workEmail: string; password: string }) {
    return request<{ session: ApiSession; workspace: MerchantWorkspaceResponse }>(
      '/auth/merchants/sign-in',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  getCustomerDashboard(customerId: string, sessionToken: string) {
    return request<DashboardResponse>(`/customers/${customerId}/dashboard`, {}, sessionToken);
  },

  updateFicaDocuments(
    customerId: string,
    documents: Record<string, boolean>,
    sessionToken: string
  ) {
    return mutateCustomerDocuments(customerId, documents, sessionToken);
  },

  completeHomeAffairsCheck(customerId: string, sessionToken: string) {
    return mutateCustomerDocuments(
      customerId,
      {
        __action: 'complete-home-affairs',
      },
      sessionToken
    );
  },

  purchaseVoucher(
    customerId: string,
    payload: { merchant: string; amount: number; useCase: string },
    sessionToken: string
  ) {
    return mutateCustomerDocuments(
      customerId,
      {
        __action: 'purchase-voucher',
        ...payload,
      },
      sessionToken
    );
  },

  createPlan(
    customerId: string,
    payload: {
      merchant: string;
      item: string;
      itemCount?: number;
      depositPaid: number;
      total: number;
      cadence: Cadence;
      termMonths: number;
      nextPayment: string;
      payoutMethod: string;
      cartId: string;
    },
    sessionToken: string
  ) {
    return mutateCustomerDocuments(
      customerId,
      {
        __action: 'create-plan',
        ...payload,
      },
      sessionToken
    );
  },

  completeCheckout(
    payload: Record<string, unknown>
  ) {
    return request<{
      releaseReference: string;
      session: ApiSession;
      dashboard: DashboardResponse;
    }>('/checkout/complete', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createCheckoutPaymentSession(payload: Record<string, unknown>) {
    return request<PaymentSessionResponse>('/checkout/payment-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  confirmPaymentSession(paymentSessionId: string) {
    return request<PaymentSessionResponse>(`/payment-sessions/${paymentSessionId}/confirm`, {
      method: 'POST',
    });
  },

  getMerchantWorkspace(merchantId: string, sessionToken: string) {
    return request<MerchantWorkspaceResponse>(
      `/merchants/${merchantId}/workspace`,
      {},
      sessionToken
    );
  },

  signOut(sessionToken: string) {
    return request<void>(
      '/auth/sign-out',
      {
        method: 'POST',
      },
      sessionToken
    );
  },

  completeVerificationQuestions(customerId: string, sessionToken: string) {
    return mutateCustomerDocuments(
      customerId,
      {
        __action: 'complete-verification-questions',
      },
      sessionToken
    );
  },

  async uploadFicaDocument(
    customerId: string,
    documentTitle: string,
    file: UploadableDocument,
    sessionToken: string
  ) {
    const contentBase64 = await toBase64(file);

    return mutateCustomerDocuments(
      customerId,
      {
        __action: 'upload-document',
        documentTitle,
        fileName: file.name,
        mimeType: file.mimeType ?? 'application/octet-stream',
        sizeBytes: file.size ?? undefined,
        contentBase64,
      },
      sessionToken
    );
  },
};
