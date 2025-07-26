
import { apiService } from './apiService';

export const betService = {
  // Place a bet
  placeBet: async (betData: any) => {
    try {
      const response = await apiService.post('/api/bets', betData);
      return response.data;
    } catch (error) {
      console.error('Error placing bet:', error);
      throw error;
    }
  },

  // Get bet history
  getBetHistory: async () => {
    try {
      const response = await apiService.get('/api/bets/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching bet history:', error);
      return [];
    }
  },

  // Get active bets
  getActiveBets: async () => {
    try {
      const response = await apiService.get('/api/bets/active');
      return response.data;
    } catch (error) {
      console.error('Error fetching active bets:', error);
      return [];
    }
  },

  // Cancel bet
  cancelBet: async (betId: string) => {
    try {
      const response = await apiService.delete(`/api/bets/${betId}`);
      return response.data;
    } catch (error) {
      console.error('Error cancelling bet:', error);
      throw error;
    }
  },

  // Get bet results
  getBetResults: async (gameId: string) => {
    try {
      const response = await apiService.get(`/api/games/${gameId}/results`);
      return response.data;
    } catch (error) {
      console.error('Error fetching bet results:', error);
      return null;
    }
  }
};
