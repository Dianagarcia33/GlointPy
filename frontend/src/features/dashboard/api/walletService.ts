import { fetchApi } from '../../../services/api';

export interface WalletBalanceResponse {
  balance: number;
  currency: string;
}

export const walletService = {
  getMyBalance: async (): Promise<WalletBalanceResponse> => {
    return fetchApi('/wallets/me/balance', {
      method: 'GET'
    });
  }
};
