import { fetchApi } from './api';

export interface InventoryCategory {
  id: number;
  name: string;
  description?: string | null;
  item_type: 'PRODUCT' | 'OFFICE_SUPPLY' | 'GENERAL';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  item_type: 'PRODUCT' | 'OFFICE_SUPPLY';
  category_id?: number | null;
  category_name?: string | null;
  unit_measure: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  sale_price?: number | null;
  is_active: boolean;
  is_low_stock: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InventoryMovement {
  id: number;
  item_id: number;
  item_name?: string;
  item_sku?: string;
  item_type?: 'PRODUCT' | 'OFFICE_SUPPLY';
  movement_type: 'ENTRY' | 'DISPATCH_OFFICE' | 'SALE' | 'ADJUSTMENT' | 'WASTE';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  unit_cost: number;
  total_cost: number;
  user_id?: number | null;
  user_name?: string | null;
  destination_department?: string | null;
  reference?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface DepartmentExpense {
  department: string;
  total_amount: number;
  movements_count: number;
}

export interface InventoryDashboardStats {
  total_products: number;
  total_supplies: number;
  low_stock_count: number;
  total_inventory_valuation: number;
  monthly_office_expenses: number;
  expenses_by_department: DepartmentExpense[];
}

export interface CreateItemPayload {
  sku: string;
  name: string;
  description?: string;
  item_type: 'PRODUCT' | 'OFFICE_SUPPLY';
  category_id?: number | null;
  unit_measure: string;
  current_stock: number;
  min_stock: number;
  unit_cost: number;
  sale_price?: number | null;
  is_active?: boolean;
}

export interface UpdateItemPayload {
  name?: string;
  description?: string;
  category_id?: number | null;
  unit_measure?: string;
  min_stock?: number;
  unit_cost?: number;
  sale_price?: number | null;
  is_active?: boolean;
}

export interface CreateMovementPayload {
  movement_type: 'ENTRY' | 'DISPATCH_OFFICE' | 'SALE' | 'ADJUSTMENT' | 'WASTE';
  quantity: number;
  unit_cost?: number;
  destination_department?: string;
  reference?: string;
  notes?: string;
}

export interface AdjustStockPayload {
  actual_stock: number;
  reason: string;
  notes?: string;
}

export const inventoryService = {
  getStats: async (): Promise<InventoryDashboardStats> => {
    return await fetchApi('/inventory/stats');
  },

  getCategories: async (itemType?: string): Promise<InventoryCategory[]> => {
    const query = itemType ? `?item_type=${encodeURIComponent(itemType)}` : '';
    return await fetchApi(`/inventory/categories${query}`);
  },

  createCategory: async (data: { name: string; description?: string; item_type?: string }): Promise<InventoryCategory> => {
    return await fetchApi('/inventory/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getItems: async (params?: {
    item_type?: string;
    category_id?: number;
    search?: string;
    only_low_stock?: boolean;
    active_only?: boolean;
  }): Promise<InventoryItem[]> => {
    const searchParams = new URLSearchParams();
    if (params?.item_type && params.item_type !== 'ALL') searchParams.append('item_type', params.item_type);
    if (params?.category_id) searchParams.append('category_id', String(params.category_id));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.only_low_stock) searchParams.append('only_low_stock', 'true');
    if (params?.active_only !== undefined) searchParams.append('active_only', String(params.active_only));

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi(`/inventory/items${queryString}`);
  },

  getItem: async (itemId: number): Promise<InventoryItem> => {
    return await fetchApi(`/inventory/items/${itemId}`);
  },

  createItem: async (data: CreateItemPayload): Promise<InventoryItem> => {
    return await fetchApi('/inventory/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updateItem: async (itemId: number, data: UpdateItemPayload): Promise<InventoryItem> => {
    return await fetchApi(`/inventory/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteItem: async (itemId: number): Promise<{ success: boolean; message: string }> => {
    return await fetchApi(`/inventory/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  createMovement: async (itemId: number, data: CreateMovementPayload): Promise<InventoryMovement> => {
    return await fetchApi(`/inventory/items/${itemId}/movements`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  adjustStock: async (itemId: number, data: AdjustStockPayload): Promise<InventoryMovement> => {
    return await fetchApi(`/inventory/items/${itemId}/adjust`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getMovements: async (params?: {
    item_id?: number;
    item_type?: string;
    movement_type?: string;
    department?: string;
    limit?: number;
    offset?: number;
  }): Promise<InventoryMovement[]> => {
    const searchParams = new URLSearchParams();
    if (params?.item_id) searchParams.append('item_id', String(params.item_id));
    if (params?.item_type && params.item_type !== 'ALL') searchParams.append('item_type', params.item_type);
    if (params?.movement_type && params.movement_type !== 'ALL') searchParams.append('movement_type', params.movement_type);
    if (params?.department) searchParams.append('department', params.department);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));

    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return await fetchApi(`/inventory/movements${queryString}`);
  },
};
