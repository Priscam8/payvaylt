import { payvayltData } from '@/constants/payvaylt-data';

export type AuthRole = 'customer' | 'merchant';
export type OtpFlow = 'sign-in' | 'create-account';
export type Cadence = 'Weekly' | 'Fortnightly' | 'Monthly';

export type CustomerDraft = {
  fullName: string;
  email: string;
  mobile: string;
  password: string;
};

export type MerchantDraft = {
  companyName: string;
  workEmail: string;
  password: string;
};

export type Session = {
  id?: string;
  token?: string;
  role: AuthRole;
  accountId: string;
  displayName: string;
  identifier: string;
  createdAt?: string;
  expiresAt?: string;
};

export type VerificationChecks = {
  accountCreated: boolean;
  otpVerified: boolean;
  questionsPassed: boolean;
  ficaUploaded: boolean;
  homeAffairsMatched: boolean;
};

export type PendingOtp = {
  challengeId?: string;
  devCode?: string;
  flow: OtpFlow;
  destination: string;
  customerId: string;
};

export type CustomerAccount = CustomerDraft & {
  id: string;
  idNumber?: string;
  createdAt: string;
  verificationChecks: VerificationChecks;
  ficaDocuments: Record<string, boolean>;
};

export type MerchantAccount = MerchantDraft & {
  id: string;
  createdAt: string;
  vendorNames: string[];
};

export type LaybyPlan = {
  id: string;
  customerId: string;
  merchant: string;
  item: string;
  itemCount: number;
  depositPaid: number;
  remaining: number;
  total: number;
  cadence: Cadence;
  termMonths: number;
  nextPayment: string;
  progress: number;
  status: string;
  payoutMethod: string;
  cartId: string;
  reservedUntil?: string;
  releaseLeadTime?: string;
  releaseReference?: string;
  createdAt: string;
};

export type Voucher = {
  id: string;
  customerId: string;
  merchant: string;
  balance: number;
  expiry: string;
  useCase: string;
  createdAt: string;
};

export type SupportNotice = {
  id: string;
  title: string;
  description: string;
  icon: string;
  audience: AuthRole;
  customerId?: string;
  merchantAccountId?: string;
  type: 'verification' | 'merchant' | 'voucher' | 'payment' | 'release';
  createdAt: string;
};

export type PaymentRecord = {
  id: string;
  customerId: string;
  planId: string;
  amount: number;
  kind: 'deposit' | 'voucher' | 'instalment' | 'final';
  method: string;
  createdAt: string;
};

export type DocumentUpload = {
  id: string;
  customerId: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  status: string;
  reviewNotes?: string;
  uploadedAt: string;
  reviewedAt?: string;
};

export type PersistedState = {
  version: 2;
  customers: CustomerAccount[];
  merchants: MerchantAccount[];
  plans: LaybyPlan[];
  vouchers: Voucher[];
  notices: SupportNotice[];
  payments: PaymentRecord[];
  documentUploads: DocumentUpload[];
  session: Session | null;
  pendingOtp: PendingOtp | null;
  passwordResetTarget: string;
  passwordResetChallengeId: string | null;
  passwordResetCustomerId: string | null;
  passwordResetSent: boolean;
  lastCustomerProfile: CustomerDraft;
  lastMerchantProfile: MerchantDraft;
};

export const payVayltStorageKey = 'payvaylt/mvp-state/v2';

export const defaultCustomerDraft: CustomerDraft = {
  fullName: 'Nandi Mokoena',
  email: 'nandi@example.com',
  mobile: '0825550192',
  password: 'goal2026!',
};

export const defaultMerchantDraft: MerchantDraft = {
  companyName: 'Exact Retail',
  workEmail: 'merchant@exact.co.za',
  password: 'merchant2026!',
};

export const emptyVerificationChecks: VerificationChecks = {
  accountCreated: false,
  otpVerified: false,
  questionsPassed: false,
  ficaUploaded: false,
  homeAffairsMatched: false,
};

export const completeVerificationChecks: VerificationChecks = {
  accountCreated: true,
  otpVerified: true,
  questionsPassed: true,
  ficaUploaded: true,
  homeAffairsMatched: true,
};

export function createDefaultFicaDocuments(completed = false) {
  return Object.fromEntries(
    payvayltData.ficaDocuments.map((item) => [item.title, completed])
  ) as Record<string, boolean>;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeMobile(value: string) {
  return value.replace(/\D+/g, '');
}

export function normalizeIdentifier(value: string) {
  const trimmed = value.trim();
  return trimmed.includes('@') ? normalizeEmail(trimmed) : normalizeMobile(trimmed);
}

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function formatCurrency(amount: number) {
  const hasCents = amount % 1 !== 0;
  return `R ${amount.toLocaleString('en-ZA', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function createCustomerSession(customer: CustomerAccount): Session {
  return {
    role: 'customer',
    accountId: customer.id,
    displayName: customer.fullName || 'PayVaylt customer',
    identifier: customer.email || customer.mobile,
  };
}

export function createMerchantSession(merchant: MerchantAccount): Session {
  return {
    role: 'merchant',
    accountId: merchant.id,
    displayName: merchant.companyName,
    identifier: merchant.workEmail,
  };
}

export function customerToDraft(customer: CustomerAccount): CustomerDraft {
  return {
    fullName: customer.fullName,
    email: customer.email,
    mobile: customer.mobile,
    password: customer.password,
  };
}

export function merchantToDraft(merchant: MerchantAccount): MerchantDraft {
  return {
    companyName: merchant.companyName,
    workEmail: merchant.workEmail,
    password: merchant.password,
  };
}

export function matchesCustomerCredential(customer: CustomerAccount, payload: CustomerDraft) {
  const emailMatches =
    payload.email.trim().length > 0 &&
    normalizeEmail(customer.email) === normalizeEmail(payload.email);
  const mobileMatches =
    payload.mobile.trim().length > 0 &&
    normalizeMobile(customer.mobile) === normalizeMobile(payload.mobile);

  return (emailMatches || mobileMatches) && customer.password === payload.password;
}

export function findCustomerByIdentifier(customers: CustomerAccount[], identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  return customers.find(
    (customer) =>
      normalizeEmail(customer.email) === normalized || normalizeMobile(customer.mobile) === normalized
  );
}

export function deriveVerificationProgress(checks: VerificationChecks) {
  const completed = Object.values(checks).filter(Boolean).length;
  const total = Object.values(checks).length;
  const percentage = Math.round((completed / total) * 100);

  return { completed, total, percentage };
}

export function deriveDashboardStats(
  plans: LaybyPlan[],
  vouchers: Voucher[],
  verificationChecks: VerificationChecks
) {
  const activePlans = plans.filter((plan) => plan.status !== 'Completed');
  const overduePlans = activePlans.filter((plan) => plan.status === 'Payment due').length;
  const reviewPlans = activePlans.filter((plan) => plan.status === 'Merchant review').length;
  const onTrackPlans = activePlans.filter((plan) => plan.status === 'On track').length;
  const securedValue = activePlans.reduce((total, plan) => total + plan.total, 0);
  const voucherBalance = vouchers.reduce((total, voucher) => total + voucher.balance, 0);
  const verification = deriveVerificationProgress(verificationChecks);

  return [
    {
      label: 'Active lay-bys',
      value: String(activePlans.length),
      detail: `${onTrackPlans} on track, ${overduePlans} awaiting payment, ${reviewPlans} under review`,
    },
    {
      label: 'Secured cart value',
      value: formatCurrency(securedValue),
      detail: 'Reserved with partner merchants',
    },
    {
      label: 'Voucher balance',
      value: formatCurrency(voucherBalance),
      detail: 'Store-specific vouchers with no expiry',
    },
    {
      label: 'Verification status',
      value: `${verification.percentage}%`,
      detail: `${verification.completed} of ${verification.total} onboarding checks completed`,
    },
  ];
}

export function createSeededState(): PersistedState {
  const seededCustomerId = 'customer-nandi';
  const seededMerchantId = 'merchant-exact';
  const createdAt = '2026-04-17T08:00:00.000Z';

  const customer: CustomerAccount = {
    ...defaultCustomerDraft,
    id: seededCustomerId,
    idNumber: '9801010123088',
    createdAt,
    verificationChecks: completeVerificationChecks,
    ficaDocuments: createDefaultFicaDocuments(true),
  };

  const merchant: MerchantAccount = {
    ...defaultMerchantDraft,
    id: seededMerchantId,
    createdAt,
    vendorNames: payvayltData.vendors.map((vendor) => vendor.name),
  };

  const plans: LaybyPlan[] = payvayltData.activePlans.map((plan) => ({
    id: plan.id,
    customerId: seededCustomerId,
    merchant: plan.merchant,
    item: plan.item,
    itemCount: 1,
    depositPaid: Number(plan.depositPaid.replace(/[^\d.]/g, '')),
    remaining: Number(plan.remaining.replace(/[^\d.]/g, '')),
    total: Number(plan.total.replace(/[^\d.]/g, '')),
    cadence: plan.cadence.includes('monthly')
      ? 'Monthly'
      : plan.cadence.includes('2 weeks')
        ? 'Fortnightly'
        : 'Weekly',
    termMonths: Number(plan.chosenTerm.replace(/[^\d]/g, '')) || 1,
    nextPayment: plan.nextPayment,
    progress: plan.progress,
    status: plan.status,
    payoutMethod: plan.payoutMethod,
    cartId: `CART-${plan.id.toUpperCase()}`,
    createdAt,
  }));

  const vouchers: Voucher[] = payvayltData.vouchers.map((voucher) => ({
    id: createId('voucher'),
    customerId: seededCustomerId,
    merchant: voucher.merchant,
    balance: Number(voucher.balance.replace(/[^\d.]/g, '')),
    expiry: voucher.expiry,
    useCase: voucher.useCase,
    createdAt,
  }));

  const notices: SupportNotice[] = [
    ...payvayltData.supportFeed.map((item) => ({
      id: createId('notice'),
      title: item.title,
      description: item.description,
      icon: item.icon,
      audience: 'customer' as const,
      customerId: seededCustomerId,
      type: item.title.toLowerCase().includes('voucher')
        ? ('voucher' as const)
        : item.title.toLowerCase().includes('merchant')
          ? ('merchant' as const)
          : ('verification' as const),
      createdAt,
    })),
    {
      id: createId('notice'),
      title: 'Release-ready queue',
      description: 'Two Exact orders are ready for handoff once the final merchant release is confirmed.',
      icon: 'local-shipping',
      audience: 'merchant',
      merchantAccountId: seededMerchantId,
      type: 'release' as const,
      createdAt,
    },
  ];

  return {
    version: 2,
    customers: [customer],
    merchants: [merchant],
    plans,
    vouchers,
    notices,
    payments: [],
    documentUploads: [],
    session: null,
    pendingOtp: null,
    passwordResetTarget: defaultCustomerDraft.email,
    passwordResetChallengeId: null,
    passwordResetCustomerId: null,
    passwordResetSent: false,
    lastCustomerProfile: defaultCustomerDraft,
    lastMerchantProfile: defaultMerchantDraft,
  };
}
