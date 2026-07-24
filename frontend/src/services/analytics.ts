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
    total_inversionistas: number;
    total_wallets: number;
    total_withdrawals: number;
  };
}

export interface DirectorPayoutProjection {
  mes: string;
  rentabilidad_proyectada: number;
  capital_vigente: number;
}

export interface DirectorAnalyticsDashboardData {
  summary_cards: {
    total_captado: number;
    total_comisiones: number;
    total_clientes: number;
    total_referidos: number;
    capital_propio_invertido: number;
    rendimiento_mensual_propio: number;
    total_ventas_count: number;
  };
  payout_projections: any[];
  package_distribution: any[];
}

export const analyticsService = {
  getAdminAnalyticsDashboard: async (): Promise<AdminAnalyticsDashboardData> => {
    return await fetchApi('/analytics/admin-dashboard');
  },

  getDirectorAnalyticsDashboard: async (): Promise<DirectorAnalyticsDashboardData> => {
    return await fetchApi('/analytics/director-dashboard');
  },
};
