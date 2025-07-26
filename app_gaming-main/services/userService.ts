
import { ApiResponse } from './apiService';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  referralCode: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  phone: string;
  password: string;
}

export interface RegisterData {
  name: string;
  phone: string;
  email?: string;
  password: string;
  referralCode?: string;
}

class UserService {
  private baseUrl = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/user` : 'https://api.example.com/api/user';

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
          // Add authorization token if available
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
    // In React Native, use AsyncStorage or secure storage
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('authToken') || '';
      }
      return '';
    } catch (error) {
      console.error('Error getting token:', error);
      return '';
    }
  }

  private setToken(token: string): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('authToken', token);
      }
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  // Authentication APIs
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    const result = await this.makeRequest<{ user: UserProfile; token: string }>('/login', 'POST', credentials);
    
    if (result.success && result.data) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async register(userData: RegisterData): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    const result = await this.makeRequest<{ user: UserProfile; token: string }>('/register', 'POST', userData);
    
    if (result.success && result.data) {
      this.setToken(result.data.token);
    }
    
    return result;
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const result = await this.makeRequest<{ success: boolean }>('/logout', 'POST');
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('authToken');
      }
      return result;
    } catch (error) {
      console.error('Error during logout:', error);
      return { success: false, error: 'Logout failed' };
    }
  }

  // Authentication status check
  async checkAuthStatus(): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      // Check if we have stored user data
      if (typeof localStorage !== 'undefined') {
        const userData = localStorage.getItem('user_data');
        const authToken = localStorage.getItem('authToken');
        
        if (userData && authToken) {
          return {
            success: true,
            data: { user: JSON.parse(userData) }
          };
        }
      }
      
      return { success: false, error: 'No authentication found' };
    } catch (error) {
      return { success: false, error: 'Auth check failed' };
    }
  }

  // Profile APIs
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    if (!this.getToken()) {
      return { success: false, error: 'Authentication required' };
    }
    return this.makeRequest<UserProfile>('/profile');
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    if (!this.getToken()) {
      return { success: false, error: 'Authentication required' };
    }
    return this.makeRequest<UserProfile>('/profile', 'PUT', profileData);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ success: boolean }>> {
    if (!this.getToken()) {
      return { success: false, error: 'Authentication required' };
    }
    return this.makeRequest<{ success: boolean }>('/change-password', 'POST', {
      currentPassword,
      newPassword,
    });
  }

  // KYC APIs
  async submitKYC(kycData: {
    documentType: string;
    documentNumber: string;
    documentImages: string[];
    personalInfo: {
      fullName: string;
      dateOfBirth: string;
      address: string;
    };
  }): Promise<ApiResponse<{ kycId: string; status: string }>> {
    return this.makeRequest<{ kycId: string; status: string }>('/kyc/submit', 'POST', kycData);
  }

  async getKYCStatus(): Promise<ApiResponse<{ status: string; rejectionReason?: string }>> {
    return this.makeRequest<{ status: string; rejectionReason?: string }>('/kyc/status');
  }

  // Referral APIs
  async getReferralData(): Promise<ApiResponse<{
    referralCode: string;
    totalReferrals: number;
    totalEarnings: number;
    referrals: Array<{
      id: string;
      name: string;
      joinedAt: string;
      status: string;
      earnings: number;
    }>;
  }>> {
    return this.makeRequest('/referrals');
  }

  async generateNewReferralCode(): Promise<ApiResponse<{ referralCode: string }>> {
    return this.makeRequest<{ referralCode: string }>('/referrals/generate', 'POST');
  }
}

export const userService = new UserService();
