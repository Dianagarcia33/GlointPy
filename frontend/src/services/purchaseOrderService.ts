import { fetchApi } from './api';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id?: number | null;
  item_name: string;
  item_sku?: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier_name?: string | null;
  supplier_nit?: string | null;
  status: 'DRAFT' | 'REQUESTED' | 'APPROVED' | 'RECEIVED' | 'CANCELLED';
  issue_date: string;
  expected_delivery_date?: string | null;
  received_date?: string | null;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  invoice_number?: string | null;
  invoice_url?: string | null;
  notes?: string | null;
  created_by_id?: number | null;
  created_by_name?: string | null;
  approved_by_id?: number | null;
  approved_by_name?: string | null;
  received_by_id?: number | null;
  received_by_name?: string | null;
  created_at?: string;
  updated_at?: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderStats {
  total_orders: number;
  requested_orders: number;
  approved_orders: number;
  received_orders: number;
  cancelled_orders: number;
  total_received_amount: number;
  pending_amount: number;
}

export interface PurchaseOrderListResponse {
  items: PurchaseOrder[];
  total: number;
}

export interface CreateOrderItemPayload {
  item_id?: number | null;
  item_name: string;
  item_sku?: string | null;
  quantity_ordered: number;
  unit_cost: number;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: number;
  payment_method: string;
  expected_delivery_date?: string | null;
  tax_amount?: number;
  invoice_number?: string | null;
  invoice_url?: string | null;
  notes?: string | null;
  items: CreateOrderItemPayload[];
}

export interface ReceiveOrderPayload {
  invoice_number?: string;
  invoice_url?: string;
  notes?: string;
  items?: {
    order_item_id: number;
    quantity_received: number;
    unit_cost?: number;
  }[];
}

export const purchaseOrderService = {
  getStats: async (): Promise<PurchaseOrderStats> => {
    return await fetchApi('/purchase-orders/stats');
  },

  getOrders: async (params?: {
    search?: string;
    status?: string;
    supplier_id?: number;
    skip?: number;
    limit?: number;
  }): Promise<PurchaseOrderListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.supplier_id) searchParams.append('supplier_id', String(params.supplier_id));
    if (params?.skip !== undefined) searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) searchParams.append('limit', String(params.limit));

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi(`/purchase-orders${queryString}`);
  },

  getOrder: async (id: number): Promise<PurchaseOrder> => {
    return await fetchApi(`/purchase-orders/${id}`);
  },

  createOrder: async (data: CreatePurchaseOrderPayload): Promise<PurchaseOrder> => {
    return await fetchApi('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  approveOrder: async (id: number): Promise<PurchaseOrder> => {
    return await fetchApi(`/purchase-orders/${id}/approve`, {
      method: 'POST',
    });
  },

  receiveOrder: async (id: number, data: ReceiveOrderPayload): Promise<PurchaseOrder> => {
    return await fetchApi(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  cancelOrder: async (id: number, reason?: string): Promise<PurchaseOrder> => {
    return await fetchApi(`/purchase-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
