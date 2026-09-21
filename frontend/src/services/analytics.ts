import { fetchApi } from './api';

export interface MonthlyGrowthPoint {
  month: string;
  capital_captado: number;
  ventas_comerciales: number;
}

export interface PackageDistributionItem {
  name: string;
  value: number;
  package_id: number;
  monto_unitario: number;
  total_monto: number;
}

export interface LiquidityBalanceItem {
  category: string;
  amount: number;
  color: string;
}

export interface SalesByTypeItem {
  name: string;
  value: number;
}

export interface AdminAnalyticsDashboardData {
  monthly_growth: MonthlyGrowthPoint[];
  package_distribution: PackageDistributionItem[];
  liquidity_balance: LiquidityBalanceItem[];
  sales_by_type: SalesByTypeItem[];
  summary_cards: {
    total_invertido: number;
    total_capital_finalizado?: number;
    total_inversionistas: number;
    total_inversionistas_inactivos?: number;
    total_wallets: number;
    total_withdrawals: number;
  };
}

export interface DirectorPayoutProjection {
  mes: string;
  captado: number;
  comision: number;
}

export interface DirectorLeaderboardItem {
  rank: number;
  commercial_id: number;
  commercial_name: string;
  total_volume: number;
  total_closures: number;
}

export interface ExpiringContractItem {
  id: number;
  codigo_contrato: string;
  cliente_nombre: string;
  cliente_documento: string;
  asesor_adjudicado: string;
  monto: number;
  fecha_ingreso: string;
  fecha_vencimiento: string;
  dias_restantes: number;
}

export interface DirectorAnalyticsDashboardData {
  summary_cards: {
    captacion_mes: number;
    comisiones_mes: number;
    cierres_mes: number;
    captacion_historica: number;
    leader_name: string;
  };
  payout_projections: DirectorPayoutProjection[];
  package_distribution: any[];
  leaderboard: DirectorLeaderboardItem[];
  expiring_contracts: ExpiringContractItem[];
}

export interface PendingInvestmentRequestItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_document?: string | null;
  package_name: string;
  monto: number;
  comprobante_path?: string | null;
  created_at: string | null;
}

export interface PendingRechargeItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_document?: string | null;
  amount: number;
  payment_method: string;
  reference_number?: string | null;
  receipt_url: string;
  created_at: string | null;
}

export interface PendingWithdrawalItem {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  user_document?: string | null;
  monto: number;
  impuesto: number;
  monto_neto: number;
  banco?: string | null;
  tipo_cuenta?: string | null;
  numero_cuenta?: string | null;
  tipo: string;
  fecha_solicitud: string | null;
  created_at: string | null;
}

export interface AccountingAnalyticsDashboardData {
  summary_cards: {
    pending_investments_count: number;
    pending_investments_amount: number;
    pending_recharges_count: number;
    pending_recharges_amount: number;
    pending_withdrawals_count: number;
    pending_withdrawals_amount: number;
    total_pending_action_amount: number;
  };
  pending_investment_requests: PendingInvestmentRequestItem[];
  pending_recharges: PendingRechargeItem[];
  pending_withdrawals: PendingWithdrawalItem[];
}

export const analyticsService = {
  getAdminAnalyticsDashboard: async (): Promise<AdminAnalyticsDashboardData> => {
    return await fetchApi('/analytics/admin-dashboard');
  },

  getDirectorAnalyticsDashboard: async (): Promise<DirectorAnalyticsDashboardData> => {
    return await fetchApi('/analytics/director-dashboard');
  },

  getAccountingAnalyticsDashboard: async (): Promise<AccountingAnalyticsDashboardData> => {
    return await fetchApi('/analytics/accounting-dashboard');
  },
};
