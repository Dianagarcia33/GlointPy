export type WithdrawalStatus = 'pendiente' | 'aprobado' | 'rechazado' | 'procesado';
export type WithdrawalType = 'rendimiento' | 'capital' | 'bono';

export interface SimpleUser {
  id: number;
  name: string;
  email: string;
  document_id: string;
}

export interface Withdrawal {
  id: number;
  user_id: number;
  investor_id?: number;
  origen: string;
  tipo: WithdrawalType;
  monto: string | number;
  impuesto: string | number;
  monto_neto: string | number;
  fecha_solicitud: string;
  fecha_retiro?: string;
  estado: WithdrawalStatus;
  metodo_pago?: string;
  banco?: string;
  tipo_cuenta?: string;
  numero_cuenta?: string;
  observaciones?: string;
  motivo_rechazo?: string;
  aprobado_por?: number;
  fecha_aprobacion?: string;
  procesado_por?: number;
  fecha_procesamiento?: string;
  comprobante_pago?: string;
  receipt_path?: string;
  created_at: string;
  updated_at: string;
  user?: SimpleUser;
}

export interface WithdrawalSummaryStats {
  total_count: number;
  pending_count: number;
  pending_amount_total: number;
  approved_count: number;
  total_amount_paid: number;
}

export interface PaginatedWithdrawals {
  data: Withdrawal[];
  total: number;
  page: number;
  limit: number;
  summary?: WithdrawalSummaryStats;
}

export interface CompanyTaxLedgerItem {
  id: number;
  withdrawal_id: number;
  investor_id: number;
  investor_name?: string;
  investor_email?: string;
  investor_document?: string;
  amount: number;
  gross_amount: number;
  net_amount: number;
  type: string;
  status: 'COLLECTED' | 'REFUNDED' | 'SETTLED' | string;
  description?: string;
  balance_after: number;
  created_at?: string;
}

export interface CompanyTaxLedgerSummary {
  wallet_id: string;
  current_balance: number;
  currency: string;
  total_transactions: number;
  total_collected: number;
  total_refunded: number;
  latest_transactions: CompanyTaxLedgerItem[];
}
