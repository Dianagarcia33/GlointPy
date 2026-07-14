import { User } from '../../users/types';
import { Withdrawal } from '../../payments/types';

export interface AuditUserSummary {
  user_id: number;
  name: string;
  email: string;
  document_id: string | null;
  total_investments: number;
  total_withdrawals: number;
  active_packages_count: number;
  pending_requests_count: number;
}

export interface PaginatedAuditUsers {
  data: AuditUserSummary[];
  total: number;
  page: number;
  limit: number;
}

// We define basic interfaces for related models if they aren't globally available
export interface SimplePackage {
  id: number;
  name: string;
  roi_percentage: number;
}

export interface SimplePeriod {
  id: number;
  name: string;
  duration_months: number;
}

export interface AuditInvestment {
  id: number;
  user_id: number;
  package_id: number;
  period_id: number;
  start_date: string;
  package: SimplePackage;
  period: SimplePeriod;
  created_at: string;
}

export interface AuditInvestmentRequest {
  id: number;
  user_id: number;
  paquete_inversion_id: number;
  monto: number;
  status: string;
  created_at: string;
  package: SimplePackage;
}

export interface AuditUserHistory {
  user_id: number;
  name: string;
  investments: AuditInvestment[];
  withdrawals: Withdrawal[];
  requests: AuditInvestmentRequest[];
  accelerations: any[]; // Placeholder for accelerations
}
