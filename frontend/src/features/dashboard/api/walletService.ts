import { fetchApi } from '../../../services/api';

export interface WalletBalanceResponse {
  has_wallet?: boolean;
  balance_visible?: boolean;
  balance: number | null;
  currency: string;
}

export const walletService = {
  getMyBalance: async (): Promise<WalletBalanceResponse> => {
    return fetchApi('/wallets/me/balance', {
      method: 'GET'
    });
  }
};
