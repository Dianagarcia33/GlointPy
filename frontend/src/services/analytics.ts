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
}

export const analyticsService = {
  getAdminAnalyticsDashboard: async (): Promise<AdminAnalyticsDashboardData> => {
    return await fetchApi('/analytics/admin-dashboard');
  },

  getDirectorAnalyticsDashboard: async (): Promise<DirectorAnalyticsDashboardData> => {
    return await fetchApi('/analytics/director-dashboard');
  },
};
