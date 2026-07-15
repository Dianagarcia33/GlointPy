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

export interface PaginatedWithdrawals {
  data: Withdrawal[];
  total: number;
  page: number;
  limit: number;
}
