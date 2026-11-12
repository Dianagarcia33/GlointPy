import { fetchApi, API_URL } from './api';

export type IncomeSource = 'automatic' | 'manual';

export interface IncomeBucket {
  count: number;
  amount: number;
  wallet_used: number;
  external_amount: number;
}

export interface IncomeReportItem {
  id: number;
  source: IncomeSource;
  approved_at: string | null;
  day: string | null;
  investor_name: string | null;
  investor_email: string | null;
  investor_document: string | null;
  contract_id: number | null;
  is_upgrade: boolean;
  package_amount: number;
  income_amount: number;
  wallet_used: number;
  external_amount: number;
  payment_method: string;
  reference: string | null;
  approved_by: string | null;
  has_receipt: boolean;
}

export interface IncomeReportDay {
  date: string;
  automatic_amount: number;
  automatic_count: number;
  manual_amount: number;
  manual_count: number;
  total_amount: number;
}

export interface IncomeReportResponse {
  start_date: string;
  end_date: string;
  summary: {
    total: IncomeBucket;
    automatic: IncomeBucket;
    manual: IncomeBucket;
  };
  by_day: IncomeReportDay[];
  items: IncomeReportItem[];
  filtered_amount: number;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface IncomeReportFilter {
  startDate: string;
  endDate: string;
  source?: IncomeSource | '';
  search?: string;
  page?: number;
  pageSize?: number;
}

const buildParams = (filter: IncomeReportFilter): URLSearchParams => {
  const params = new URLSearchParams();
  params.append('start_date', filter.startDate);
  params.append('end_date', filter.endDate);
  if (filter.source) params.append('source', filter.source);
  if (filter.search?.trim()) params.append('search', filter.search.trim());
  return params;
};

export const incomeReportService = {
  /** Informe de ingresos por paquetes aprobados en el rango de días (hora Colombia). */
  async getReport(filter: IncomeReportFilter): Promise<IncomeReportResponse> {
    const params = buildParams(filter);
    if (filter.page) params.append('page', filter.page.toString());
    if (filter.pageSize) params.append('page_size', filter.pageSize.toString());
    return fetchApi<IncomeReportResponse>(`/income-report?${params.toString()}`);
  },

  /** URL de descarga del detalle en CSV con los mismos filtros de la tabla. */
  getExportCsvUrl(filter: IncomeReportFilter): string {
    return `${API_URL}/income-report/export?${buildParams(filter).toString()}`;
  },
};
