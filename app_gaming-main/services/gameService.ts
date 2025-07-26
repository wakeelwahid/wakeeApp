import { ApiResponse } from './apiService';

export interface Game {
  id: number;
  title: string;
  openTime: string;
  closeTime: string;
  status: 'OPEN' | 'CLOSED' | 'RESULT_DECLARED';
  color: string;
  bgColor: string;
  lastResult?: string;
  nextResultTime?: string;
}

export interface Bet {
  id: string;
  gameId: number;
  gameName: string;
  number: string | number;
  amount: number;
  type: 'SINGLE' | 'JODI' | 'SINGLE_PANNA' | 'DOUBLE_PANNA' | 'TRIPLE_PANNA';
  status: 'PENDING' | 'WIN' | 'LOSS';
  multiplier: number;
  winAmount?: number;
  placedAt: string;
  resultTime?: string;
}

export interface BetRequest {
  gameId: number;
  number: string | number;
  amount: number;
  type: string;
}

export interface GameResult {
  id: string;
  gameId: number;
  gameName: string;
  result: string;
  declaredAt: string;
  date: string;
}

class GameService {
  private baseUrl = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/games` : 'https://api.example.com/api/games';

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<ApiResponse<T>> {
    try {
      const config: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`,
        },
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'API call failed',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private getToken(): string {
    return localStorage.getItem('authToken') || '';
  }

  // Game APIs
  async getGames(): Promise<ApiResponse<Game[]>> {
    return this.makeRequest<Game[]>('/');
  }

  async getGameById(gameId: number): Promise<ApiResponse<Game>> {
    return this.makeRequest<Game>(`/${gameId}`);
  }

  async getGameStatus(gameId: number): Promise<ApiResponse<{
    isOpen: boolean;
    nextOpenTime?: string;
    nextCloseTime?: string;
    timeRemaining?: number;
  }>> {
    return this.makeRequest(`/${gameId}/status`);
  }

  // Betting APIs
  async placeBet(betData: BetRequest): Promise<ApiResponse<{
    betId: string;
    message: string;
    newBalance: number;
  }>> {
    return this.makeRequest('/bet/place', 'POST', betData);
  }

  async getBetHistory(
    page: number = 1,
    limit: number = 20,
    gameId?: number
  ): Promise<ApiResponse<{
    bets: Bet[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(gameId && { gameId: gameId.toString() }),
    });

    return this.makeRequest(`/bet/history?${params}`);
  }

  async getBetDetails(betId: string): Promise<ApiResponse<Bet>> {
    return this.makeRequest<Bet>(`/bet/${betId}`);
  }

  async cancelBet(betId: string): Promise<ApiResponse<{
    success: boolean;
    refundAmount: number;
    newBalance: number;
  }>> {
    return this.makeRequest(`/bet/${betId}/cancel`, 'POST');
  }

  // Results APIs
  async getResults(
    gameId?: number,
    date?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{
    results: GameResult[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(gameId && { gameId: gameId.toString() }),
      ...(date && { date }),
    });

    return this.makeRequest(`/results?${params}`);
  }

  async getLatestResults(): Promise<ApiResponse<GameResult[]>> {
    return this.makeRequest<GameResult[]>('/results/latest');
  }

  async getResultByGame(gameId: number, date?: string): Promise<ApiResponse<GameResult>> {
    const params = date ? `?date=${date}` : '';
    return this.makeRequest<GameResult>(`/results/game/${gameId}${params}`);
  }

  // Chart APIs
  async getChart(gameId: number, month: string, year: string): Promise<ApiResponse<{
    gameId: number;
    gameName: string;
    month: string;
    year: string;
    results: Array<{
      date: string;
      result: string;
      day: string;
    }>;
  }>> {
    return this.makeRequest(`/chart/${gameId}?month=${month}&year=${year}`);
  }

  // Statistics APIs
  async getGameStatistics(gameId: number): Promise<ApiResponse<{
    totalBets: number;
    totalAmount: number;
    winPercentage: number;
    popularNumbers: Array<{
      number: string;
      count: number;
      percentage: number;
    }>;
  }>> {
    return this.makeRequest(`/statistics/${gameId}`);
  }

  async getUserStatistics(): Promise<ApiResponse<{
    totalBets: number;
    totalAmount: number;
    totalWins: number;
    totalLosses: number;
    winPercentage: number;
    favoriteGame: string;
    biggestWin: number;
  }>> {
    return this.makeRequest('/statistics/user');
  }

  // Rates APIs
  async getBetRates(): Promise<ApiResponse<{
    single: number;
    jodi: number;
    singlePanna: number;
    doublePanna: number;
    triplePanna: number;
  }>> {
    return this.makeRequest('/rates');
  }
}

export const gameService = new GameService();