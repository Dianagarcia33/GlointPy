import { fetchApi, API_URL } from './api';

export interface DailyYieldWorkerStatus {
  is_running: boolean;
  timezone: string;
  frequency: string;
  schedule_time: string;
  recovery: string;
  current_colombia_time: string;
}

export interface DailyHistoryDay {
  date: string;
  total_amount: number;
  users_count: number;
  transfers_count: number;
  status: 'COMPLETED' | 'PENDING' | 'SIN_MOVIMIENTOS';
}

export interface DailyYieldSummary {
  target_date: string;
  is_today: boolean;
  is_executed: boolean;
  status: 'COMPLETED' | 'PENDING' | 'SIN_REGISTRO';
  total_dispersed: number;
  total_yields: number;
  total_bonuses: number;
  total_users: number;
  total_movements: number;
  target_batch?: {
    batch_id: string;
    status: string;
    executed_at?: string;
    details?: any;
  } | null;
  last_batch?: {
    batch_id: string;
    action: string;
    status: string;
    is_automatic: boolean;
    executed_at_cot?: string;
    global_grand_total: number;
    total_users_paid: number;
    cycle_start_date?: string;
    cycle_end_date?: string;
  } | null;
  worker_status: DailyYieldWorkerStatus;
  history_7_days: DailyHistoryDay[];
}

export interface DailyYieldBatch {
  id: number;
  batch_id: string;
  action: string;
  action_label: string;
  is_automatic: boolean;
  cycle_start_date?: string;
  cycle_end_date?: string;
  executed_at_cot?: string;
  executed_at_utc?: string;
  total_users_paid: number;
  total_transfers_count: number;
  skipped_count: number;
  global_grand_total: number;
  global_yield_total: number;
  global_acceleration_bonus_total: number;
  status: string;
  description?: string;
  created_at?: string;
}

export interface DailyYieldMovement {
  id: number;
  batch_id: string;
  user_id?: number;
  user_name: string;
  user_email: string;
  document_id: string;
  investor_id?: number;
  assigned_code: string;
  package_name: string;
  type: string;
  type_label: string;
  amount: number;
  balance_before?: number | null;
  balance_after?: number | null;
  status: string;
  message?: string;
  created_at?: string;
  created_at_cot?: string;
}

export interface MovementsFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  batchId?: string;
  search?: string;
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface BatchesFilter {
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export const dailyYieldsService = {
  /**
   * Obtiene el resumen del día seleccionado o del día actual
   */
  async getSummary(targetDate?: string): Promise<DailyYieldSummary> {
    const query = targetDate ? `?target_date=${encodeURIComponent(targetDate)}` : '';
    return fetchApi<DailyYieldSummary>(`/daily-yields/summary${query}`);
  },

  /**
   * Lista los lotes históricos de dispersión
   */
  async getBatches(filter: BatchesFilter = {}): Promise<{
    items: DailyYieldBatch[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams();
    if (filter.startDate) params.append('start_date', filter.startDate);
    if (filter.endDate) params.append('end_date', filter.endDate);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('page_size', filter.pageSize.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/daily-yields/batches${qs}`);
  },

  /**
   * Lista los movimientos individuales de transferencias a wallets
   */
  async getMovements(filter: MovementsFilter = {}): Promise<{
    items: DailyYieldMovement[];
    total: number;
    total_amount_sum: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const params = new URLSearchParams();
    if (filter.date) params.append('date', filter.date);
    if (filter.startDate) params.append('start_date', filter.startDate);
    if (filter.endDate) params.append('end_date', filter.endDate);
    if (filter.batchId) params.append('batch_id', filter.batchId);
    if (filter.search) params.append('search', filter.search);
    if (filter.type) params.append('type', filter.type);
    if (filter.status) params.append('status', filter.status);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('page_size', filter.pageSize.toString());

    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/daily-yields/movements${qs}`);
  },

  /**
   * Dispara manualmente la dispersión del ciclo de hoy
   */
  async triggerDailyDispersal(): Promise<any> {
    return fetchApi('/daily-yields/trigger-daily', {
      method: 'POST'
    });
  },

  /**
   * Retorna URL de descarga para exportación a CSV
   */
  getExportCsvUrl(filter: { date?: string; startDate?: string; endDate?: string; batchId?: string; type?: string } = {}): string {
    const params = new URLSearchParams();
    if (filter.date) params.append('date', filter.date);
    if (filter.startDate) params.append('start_date', filter.startDate);
    if (filter.endDate) params.append('end_date', filter.endDate);
    if (filter.batchId) params.append('batch_id', filter.batchId);
    if (filter.type) params.append('type', filter.type);

    const qs = params.toString() ? `?${params.toString()}` : '';
    return `${API_URL}/daily-yields/export${qs}`;
  }
};
