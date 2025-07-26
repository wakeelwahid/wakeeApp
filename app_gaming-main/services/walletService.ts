
import { apiService } from './apiService';

export const walletService = {
  // Add money to wallet
  addMoney: async (paymentData: any) => {
    try {
      const response = await apiService.post('/api/wallet/deposit', paymentData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error adding money:', error);
      return { success: false, error: 'Payment processing failed' };
    }
  },

  // Withdraw money from wallet
  withdrawMoney: async (withdrawData: any) => {
    try {
      const response = await apiService.post('/api/wallet/withdraw', withdrawData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error withdrawing money:', error);
      return { success: false, error: 'Withdrawal processing failed' };
    }
  },

  // Get wallet balance
  getWalletBalance: async () => {
    try {
      const response = await apiService.get('/api/wallet/balance');
      return response.data;
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return { balance: 0, winnings: 0, bonus: 0 };
    }
  },

  // Get transaction history
  getTransactionHistory: async () => {
    try {
      const response = await apiService.get('/api/wallet/transactions');
      return response.data;
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }
};
