import { getPayVayltApiBaseUrl } from '@/lib/payvaylt-api';

export type PosSource = 'catalog' | 'manual' | 'service';
export type PosStatus =
  | 'awaiting_customer'
  | 'awaiting_bank'
  | 'paid'
  | 'declined'
  | 'cancelled';

export type PosMerchant = {
  id: string;
  name: string;
  city: string;
  settlement: string;
  whatsappNumber: string;
  supportLabel: string;
};

export type PosProduct = {
  id: string;
  sku: string;
  name: string;
  price: number;
  note: string;
  active: boolean;
};

export type PosOrderItem = {
  key: string;
  name: string;
  price: number;
  quantity: number;
  source: PosSource;
  note: string;
};

export type PosOrderHistoryEntry = {
  status: PosStatus;
  at: string;
  note: string;
};

export type PosOrder = {
  id: string;
  token: string;
  merchantId: string;
  merchantName: string;
  items: PosOrderItem[];
  total: number;
  createdAt: string;
  expiresAt: string;
  status: PosStatus;
  bankReference?: string;
  declineReason?: string;
  receiptChannel: string;
  history: PosOrderHistoryEntry[];
};

type PosOrderResponse = {
  order: PosOrder;
  recentOrders: PosOrder[];
};

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function getPosApiBaseUrl() {
  return trimTrailingSlash(getPayVayltApiBaseUrl());
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${getPosApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `POS API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export const payVayltPosApi = {
  bootstrap() {
    return request<{
      merchant: PosMerchant;
      products: PosProduct[];
      recentOrders: PosOrder[];
    }>('/pos/bootstrap');
  },

  listOrders() {
    return request<{ orders: PosOrder[] }>('/pos/orders');
  },

  getOrder(orderId: string) {
    return request<{ order: PosOrder }>(`/pos/orders/${orderId}`);
  },

  createOrder(items: PosOrderItem[]) {
    return request<PosOrderResponse>('/pos/orders', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  sendToBank(orderId: string) {
    return request<PosOrderResponse>(`/pos/orders/${orderId}/send-to-bank`, {
      method: 'POST',
    });
  },

  resolvePayment(orderId: string, outcome: 'paid' | 'declined') {
    return request<PosOrderResponse>(`/pos/orders/${orderId}/payment-outcome`, {
      method: 'POST',
      body: JSON.stringify({ outcome }),
    });
  },

  cancelOrder(orderId: string) {
    return request<PosOrderResponse>(`/pos/orders/${orderId}/cancel`, {
      method: 'POST',
    });
  },
};
