import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ApiSession,
  DashboardResponse,
  MerchantWorkspaceResponse,
  payVayltApi,
} from '@/lib/payvaylt-api';
import {
  Cadence,
  createDefaultFicaDocuments,
  createSeededState,
  customerToDraft,
  CustomerAccount,
  CustomerDraft as BaseCustomerDraft,
  deriveDashboardStats,
  emptyVerificationChecks,
  findCustomerByIdentifier,
  formatCurrency,
  merchantToDraft,
  MerchantAccount,
  MerchantDraft as BaseMerchantDraft,
  payVayltStorageKey,
  PersistedState,
  Session,
  SupportNotice,
  VerificationChecks,
  Voucher,
} from '@/lib/payvaylt-mvp';

export type AuthRole = 'customer' | 'merchant';
export type CustomerDraft = BaseCustomerDraft;
export type MerchantDraft = BaseMerchantDraft;

type PendingOtp = PersistedState['pendingOtp'];
type PlanSummary = {
  id: string;
  merchant: string;
  item: string;
  depositPaid: string;
  remaining: string;
  total: string;
  cadence: string;
  chosenTerm: string;
  nextPayment: string;
  progress: number;
  status: string;
  payoutMethod: string;
};
type VoucherSummary = {
  merchant: string;
  balance: string;
  expiry: string;
  useCase: string;
};
type FeedSummary = {
  title: string;
  description: string;
  icon: string;
};

type CheckoutDemoInput = {
  registration: CustomerDraft & { idNumber: string };
  verification: VerificationChecks;
  plan: {
    deposit: number;
    voucherAmount: number;
    cadence: Cadence;
    termMonths: number;
  };
  journey: {
    merchant: string;
    store: string;
    cartId: string;
    cartTotal: number;
    itemCount: number;
    leadItem: string;
    reservedUntil: string;
    releaseLeadTime: string;
  };
  releaseReference: string;
};

type AuthContextValue = {
  isHydrated: boolean;
  authMessage: string;
  session: Session | null;
  customerProfile: CustomerDraft;
  merchantProfile: MerchantDraft;
  pendingOtp: PendingOtp;
  passwordResetTarget: string;
  passwordResetSent: boolean;
  verificationChecks: VerificationChecks;
  ficaDocuments: Record<string, boolean>;
  dashboardStats: { label: string; value: string; detail: string }[];
  planSummaries: PlanSummary[];
  voucherSummaries: VoucherSummary[];
  supportFeed: FeedSummary[];
  beginCustomerSignIn: (payload: CustomerDraft) => Promise<boolean>;
  beginCustomerCreateAccount: (payload: CustomerDraft) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<'dashboard' | 'fica-upload' | 'invalid'>;
  requestPasswordReset: (identifier: string) => Promise<boolean>;
  completePasswordReset: (password: string) => Promise<boolean>;
  signInMerchant: (payload: MerchantDraft) => Promise<boolean>;
  toggleFicaDocument: (title: string) => void;
  finalizeFicaReview: () => Promise<void>;
  completeHomeAffairsCheck: () => Promise<void>;
  completeCheckoutDemo: (input: CheckoutDemoInput) => Promise<string>;
  clearAuthMessage: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function createPlanSummary(plan: PersistedState['plans'][number]): PlanSummary {
  return {
    id: plan.id,
    merchant: plan.merchant,
    item: plan.item,
    depositPaid: formatCurrency(plan.depositPaid),
    remaining: formatCurrency(plan.remaining),
    total: formatCurrency(plan.total),
    cadence: `${formatCurrency(
      Math.max(plan.total - plan.depositPaid, 0) / Math.max(plan.termMonths, 1)
    )} ${plan.cadence.toLowerCase()}`,
    chosenTerm: `${plan.termMonths} months`,
    nextPayment: plan.nextPayment,
    progress: plan.progress,
    status: plan.status,
    payoutMethod: plan.payoutMethod,
  };
}

function createVoucherSummary(voucher: Voucher): VoucherSummary {
  return {
    merchant: voucher.merchant,
    balance: formatCurrency(voucher.balance),
    expiry: voucher.expiry,
    useCase: voucher.useCase,
  };
}

function createFeedSummary(notice: SupportNotice): FeedSummary {
  return {
    title: notice.title,
    description: notice.description,
    icon: notice.icon,
  };
}

function sortByNewest<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => {
    const leftValue = left.createdAt ?? '';
    const rightValue = right.createdAt ?? '';
    return rightValue.localeCompare(leftValue);
  });
}

function normalizePersistedState(input: Partial<PersistedState> | null | undefined): PersistedState {
  const seeded = createSeededState();

  if (!input) {
    return seeded;
  }

  return {
    ...seeded,
    ...input,
    customers: input.customers ?? seeded.customers,
    merchants: input.merchants ?? seeded.merchants,
    plans: input.plans ?? seeded.plans,
    vouchers: input.vouchers ?? seeded.vouchers,
    notices: input.notices ?? seeded.notices,
    payments: input.payments ?? seeded.payments,
    session: input.session ?? seeded.session,
    pendingOtp: input.pendingOtp ?? seeded.pendingOtp,
    passwordResetTarget: input.passwordResetTarget ?? seeded.passwordResetTarget,
    passwordResetChallengeId: input.passwordResetChallengeId ?? null,
    passwordResetCustomerId: input.passwordResetCustomerId ?? null,
    passwordResetSent: input.passwordResetSent ?? false,
    lastCustomerProfile: input.lastCustomerProfile ?? seeded.lastCustomerProfile,
    lastMerchantProfile: input.lastMerchantProfile ?? seeded.lastMerchantProfile,
  };
}

function findActiveCustomer(state: PersistedState) {
  if (state.session?.role === 'customer') {
    return state.customers.find((customer) => customer.id === state.session?.accountId) ?? null;
  }

  return (
    findCustomerByIdentifier(state.customers, state.lastCustomerProfile.email) ??
    findCustomerByIdentifier(state.customers, state.lastCustomerProfile.mobile) ??
    state.customers[0] ??
    null
  );
}

function findActiveMerchant(state: PersistedState) {
  if (state.session?.role === 'merchant') {
    return state.merchants.find((merchant) => merchant.id === state.session?.accountId) ?? null;
  }

  return (
    state.merchants.find((merchant) => merchant.workEmail.trim().toLowerCase() === state.lastMerchantProfile.workEmail.trim().toLowerCase()) ??
    state.merchants[0] ??
    null
  );
}

function toSession(session: ApiSession): Session {
  return {
    id: session.id,
    token: session.token,
    role: session.role,
    accountId: session.accountId,
    displayName: session.displayName,
    identifier: session.identifier,
    createdAt: session.createdAt,
  };
}

function mergeCustomerDashboard(
  current: PersistedState,
  dashboard: DashboardResponse,
  session?: Session | null
) {
  const existingCustomer = current.customers.find((customer) => customer.id === dashboard.customer.id);
  const mergedCustomer: CustomerAccount = {
    fullName: dashboard.customer.fullName,
    email: dashboard.customer.email,
    mobile: dashboard.customer.mobile,
    password: existingCustomer?.password ?? current.lastCustomerProfile.password,
    id: dashboard.customer.id,
    idNumber: dashboard.customer.idNumber,
    createdAt: dashboard.customer.createdAt,
    verificationChecks: dashboard.verificationChecks,
    ficaDocuments: dashboard.ficaDocuments,
  };

  const customers = current.customers.some((customer) => customer.id === mergedCustomer.id)
    ? current.customers.map((customer) => (customer.id === mergedCustomer.id ? mergedCustomer : customer))
    : [mergedCustomer, ...current.customers];

  const plans = [
    ...dashboard.plans,
    ...current.plans.filter((plan) => plan.customerId !== mergedCustomer.id),
  ];
  const vouchers = [
    ...dashboard.vouchers,
    ...current.vouchers.filter((voucher) => voucher.customerId !== mergedCustomer.id),
  ];
  const notices = [
    ...dashboard.notices,
    ...current.notices.filter(
      (notice) => !(notice.audience === 'customer' && notice.customerId === mergedCustomer.id)
    ),
  ];
  const payments = [
    ...dashboard.payments,
    ...current.payments.filter((payment) => payment.customerId !== mergedCustomer.id),
  ];

  return {
    ...current,
    customers,
    plans,
    vouchers,
    notices,
    payments,
    session: session ?? current.session,
    lastCustomerProfile: customerToDraft(mergedCustomer),
    pendingOtp: null,
  };
}

function mergeMerchantWorkspace(
  current: PersistedState,
  workspace: MerchantWorkspaceResponse,
  session?: Session | null
) {
  const existingMerchant = current.merchants.find((merchant) => merchant.id === workspace.merchant.id);
  const mergedMerchant: MerchantAccount = {
    companyName: workspace.merchant.companyName,
    workEmail: workspace.merchant.workEmail,
    password: existingMerchant?.password ?? current.lastMerchantProfile.password,
    id: workspace.merchant.id,
    createdAt: existingMerchant?.createdAt ?? new Date().toISOString(),
    vendorNames: workspace.merchant.vendorNames,
  };

  const merchants = current.merchants.some((merchant) => merchant.id === mergedMerchant.id)
    ? current.merchants.map((merchant) => (merchant.id === mergedMerchant.id ? mergedMerchant : merchant))
    : [mergedMerchant, ...current.merchants];

  const vendorNames = new Set(mergedMerchant.vendorNames);
  const plans = [
    ...workspace.plans,
    ...current.plans.filter((plan) => !vendorNames.has(plan.merchant)),
  ];
  const notices = [
    ...workspace.notices,
    ...current.notices.filter(
      (notice) =>
        !(
          notice.audience === 'merchant' &&
          (!notice.merchantAccountId || notice.merchantAccountId === mergedMerchant.id)
        )
    ),
  ];

  return {
    ...current,
    merchants,
    plans,
    notices,
    session: session ?? current.session,
    lastMerchantProfile: merchantToDraft(mergedMerchant),
  };
}

function extractErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<PersistedState>(createSeededState());
  const [isHydrated, setIsHydrated] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const hydratedRef = useRef(false);
  const stateRef = useRef(state);

  function commitState(nextState: PersistedState) {
    stateRef.current = nextState;
    setState(nextState);
    return nextState;
  }

  function updateState(updater: (current: PersistedState) => PersistedState) {
    const nextState = updater(stateRef.current);
    return commitState(nextState);
  }

  async function buildRemoteState(session: Session, baseState: PersistedState) {
    if (!session.token) {
      return baseState;
    }

    if (session.role === 'customer') {
      const dashboard = await payVayltApi.getCustomerDashboard(session.accountId, session.token);
      return mergeCustomerDashboard(baseState, dashboard, session);
    }

    const workspace = await payVayltApi.getMerchantWorkspace(session.accountId, session.token);
    return mergeMerchantWorkspace(baseState, workspace, session);
  }

  useEffect(() => {
    async function loadState() {
      try {
        const stored = await AsyncStorage.getItem(payVayltStorageKey);
        let nextState = normalizePersistedState(stored ? (JSON.parse(stored) as Partial<PersistedState>) : null);

        if (nextState.session?.token) {
          try {
            nextState = await buildRemoteState(nextState.session, nextState);
          } catch (error) {
            setAuthMessage(
              extractErrorMessage(
                error,
                'Saved session could not be refreshed. Start the PayVaylt backend with npm run backend and try again.'
              )
            );
          }
        }

        commitState(nextState);
      } catch {
        commitState(createSeededState());
        setAuthMessage('Saved PayVaylt data could not be restored, so the workspace was reset.');
      } finally {
        hydratedRef.current = true;
        setIsHydrated(true);
      }
    }

    void loadState();
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) {
      return;
    }

    stateRef.current = state;
    AsyncStorage.setItem(payVayltStorageKey, JSON.stringify(state)).catch(() => {
      setAuthMessage('PayVaylt could not save the latest workspace changes on this device.');
    });
  }, [state]);

  const currentCustomer = useMemo(() => findActiveCustomer(state), [state]);
  const currentMerchant = useMemo(() => findActiveMerchant(state), [state]);

  const customerProfile = currentCustomer ? customerToDraft(currentCustomer) : state.lastCustomerProfile;
  const merchantProfile = currentMerchant ? merchantToDraft(currentMerchant) : state.lastMerchantProfile;
  const verificationChecks = currentCustomer?.verificationChecks ?? emptyVerificationChecks;
  const ficaDocuments = currentCustomer?.ficaDocuments ?? createDefaultFicaDocuments(false);

  const visiblePlans = useMemo(() => {
    if (state.session?.role === 'merchant') {
      return sortByNewest(state.plans);
    }

    if (!currentCustomer) {
      return [];
    }

    return sortByNewest(state.plans.filter((plan) => plan.customerId === currentCustomer.id));
  }, [currentCustomer, state.plans, state.session]);

  const visibleVouchers = useMemo(() => {
    if (!currentCustomer) {
      return [];
    }

    return sortByNewest(state.vouchers.filter((voucher) => voucher.customerId === currentCustomer.id));
  }, [currentCustomer, state.vouchers]);

  const visibleFeed = useMemo(() => {
    if (state.session?.role === 'merchant') {
      const merchantId = currentMerchant?.id;
      return sortByNewest(
        state.notices.filter(
          (notice) =>
            notice.audience === 'merchant' &&
            (!merchantId || !notice.merchantAccountId || notice.merchantAccountId === merchantId)
        )
      ).map(createFeedSummary);
    }

    if (!currentCustomer) {
      return [];
    }

    return sortByNewest(
      state.notices.filter(
        (notice) => notice.audience === 'customer' && (!notice.customerId || notice.customerId === currentCustomer.id)
      )
    ).map(createFeedSummary);
  }, [currentCustomer, currentMerchant, state.notices, state.session]);

  function clearAuthMessage() {
    setAuthMessage('');
  }

  async function beginCustomerSignIn(payload: CustomerDraft) {
    try {
      clearAuthMessage();
      const identifier = payload.email.trim() || payload.mobile.trim();
      const challenge = await payVayltApi.signInCustomer({
        identifier,
        password: payload.password,
      });

      updateState((current) => ({
        ...current,
        session: null,
        lastCustomerProfile: {
          ...current.lastCustomerProfile,
          ...payload,
        },
        pendingOtp: {
          flow: 'sign-in',
          destination: challenge.destination,
          customerId: challenge.customerId,
          challengeId: challenge.challengeId,
        },
        passwordResetSent: false,
        passwordResetChallengeId: null,
        passwordResetCustomerId: null,
      }));

      return true;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'No customer account matches those credentials yet.')
      );
      return false;
    }
  }

  async function beginCustomerCreateAccount(payload: CustomerDraft) {
    try {
      clearAuthMessage();
      const challenge = await payVayltApi.registerCustomer(payload);

      updateState((current) => ({
        ...current,
        session: null,
        lastCustomerProfile: payload,
        pendingOtp: {
          flow: 'create-account',
          destination: challenge.destination,
          customerId: challenge.customerId,
          challengeId: challenge.challengeId,
        },
        passwordResetSent: false,
        passwordResetChallengeId: null,
        passwordResetCustomerId: null,
      }));

      return true;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'A customer account with that email or mobile number already exists.')
      );
      return false;
    }
  }

  async function verifyOtp(code: string) {
    const pendingOtp = stateRef.current.pendingOtp;

    if (!pendingOtp?.challengeId || code.trim().length < 4) {
      setAuthMessage('Enter any 4-digit prototype code to continue.');
      return 'invalid';
    }

    try {
      clearAuthMessage();
      const result = await payVayltApi.verifyCustomerOtp({
        challengeId: pendingOtp.challengeId,
        code,
      });
      const session = toSession(result.session);
      const dashboard = await payVayltApi.getCustomerDashboard(session.accountId, session.token ?? '');
      commitState(
        mergeCustomerDashboard(
          {
            ...stateRef.current,
            session,
            pendingOtp: null,
          },
          dashboard,
          session
        )
      );

      return result.nextStep;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'The OTP verification request could not be completed.')
      );
      return 'invalid';
    }
  }

  async function requestPasswordReset(identifier: string) {
    try {
      clearAuthMessage();
      const resetChallenge = await payVayltApi.requestPasswordReset(identifier);

      updateState((current) => ({
        ...current,
        passwordResetTarget: resetChallenge.destination,
        passwordResetChallengeId: resetChallenge.resetId,
        passwordResetCustomerId: resetChallenge.customerId,
        passwordResetSent: true,
      }));

      return true;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'No customer account matches that email address or mobile number.')
      );
      return false;
    }
  }

  async function completePasswordReset(password: string) {
    const current = stateRef.current;

    if (!current.passwordResetChallengeId) {
      setAuthMessage('Start a password reset request before trying to save a new password.');
      return false;
    }

    try {
      clearAuthMessage();
      await payVayltApi.resetPassword({
        resetId: current.passwordResetChallengeId,
        password,
      });

      updateState((previous) => ({
        ...previous,
        customers: previous.customers.map((customer) =>
          customer.id === previous.passwordResetCustomerId ? { ...customer, password } : customer
        ),
        lastCustomerProfile: {
          ...previous.lastCustomerProfile,
          password,
        },
        passwordResetSent: false,
        passwordResetChallengeId: null,
        passwordResetCustomerId: null,
      }));

      return true;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'The password reset could not be completed.')
      );
      return false;
    }
  }

  async function signInMerchant(payload: MerchantDraft) {
    try {
      clearAuthMessage();
      const result = await payVayltApi.signInMerchant(payload);
      const session = toSession(result.session);
      commitState(
        mergeMerchantWorkspace(
          {
            ...stateRef.current,
            session,
          },
          result.workspace,
          session
        )
      );

      return true;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'Merchant credentials did not match a configured PayVaylt partner account.')
      );
      return false;
    }
  }

  function toggleFicaDocument(title: string) {
    const current = stateRef.current;
    const customer = findActiveCustomer(current);

    if (!customer || customer.verificationChecks.ficaUploaded) {
      return;
    }

    updateState((previous) => ({
      ...previous,
      customers: previous.customers.map((entry) =>
        entry.id === customer.id
          ? {
              ...entry,
              ficaDocuments: {
                ...entry.ficaDocuments,
                [title]: !entry.ficaDocuments[title],
              },
            }
          : entry
      ),
    }));
  }

  async function finalizeFicaReview() {
    const current = stateRef.current;
    const customer = findActiveCustomer(current);
    const session = current.session;

    if (!customer || session?.role !== 'customer' || !session.token) {
      return;
    }

    try {
      clearAuthMessage();
      const dashboard = await payVayltApi.updateFicaDocuments(
        customer.id,
        customer.ficaDocuments,
        session.token
      );
      commitState(mergeCustomerDashboard(current, dashboard, session));
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'The FICA submission could not be completed.')
      );
    }
  }

  async function completeHomeAffairsCheck() {
    const current = stateRef.current;
    const customer = findActiveCustomer(current);
    const session = current.session;

    if (!customer || session?.role !== 'customer' || !session.token) {
      return;
    }

    try {
      clearAuthMessage();
      const dashboard = await payVayltApi.completeHomeAffairsCheck(customer.id, session.token);
      commitState(mergeCustomerDashboard(current, dashboard, session));
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'The Home Affairs match could not be completed.')
      );
    }
  }

  async function completeCheckoutDemo(input: CheckoutDemoInput) {
    try {
      clearAuthMessage();
      const result = await payVayltApi.completeCheckout(input);
      const session = toSession(result.session);
      commitState(
        mergeCustomerDashboard(
          {
            ...stateRef.current,
            session,
          },
          result.dashboard,
          session
        )
      );

      return result.releaseReference;
    } catch (error) {
      setAuthMessage(
        extractErrorMessage(error, 'The checkout demo could not be completed against the backend.')
      );
      return '';
    }
  }

  function signOut() {
    clearAuthMessage();
    updateState((current) => ({
      ...current,
      session: null,
      pendingOtp: null,
      passwordResetSent: false,
      passwordResetChallengeId: null,
      passwordResetCustomerId: null,
    }));
  }

  const dashboardStats = useMemo(
    () => deriveDashboardStats(visiblePlans, visibleVouchers, verificationChecks),
    [verificationChecks, visiblePlans, visibleVouchers]
  );

  const value: AuthContextValue = {
    isHydrated,
    authMessage,
    session: state.session,
    customerProfile,
    merchantProfile,
    pendingOtp: state.pendingOtp,
    passwordResetTarget: state.passwordResetTarget,
    passwordResetSent: state.passwordResetSent,
    verificationChecks,
    ficaDocuments,
    dashboardStats,
    planSummaries: visiblePlans.map(createPlanSummary),
    voucherSummaries: visibleVouchers.map(createVoucherSummary),
    supportFeed: visibleFeed,
    beginCustomerSignIn,
    beginCustomerCreateAccount,
    verifyOtp,
    requestPasswordReset,
    completePasswordReset,
    signInMerchant,
    toggleFicaDocument,
    finalizeFicaReview,
    completeHomeAffairsCheck,
    completeCheckoutDemo,
    clearAuthMessage,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
