import { ApiResponse } from "./apiService";
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  referralCode: string;
  kycStatus: "VERIFIED" | "PENDING" | "REJECTED";
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
  // Use your backend API base URL directly for local/dev
  private baseUrl =
    "https://0c5eefa7-e862-4121-8b2a-bae77840c1fc-00-20ced033t5o6m.kirk.replit.dev:5000";
  private async makeRequest<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
    body?: any,
    retryOnAuthError: boolean = true,
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const token = await this.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const config: RequestInit = {
        method,
        headers,
      };
      if (body && method !== "GET") {
        config.body = JSON.stringify(body);
      }
      
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, config);
      
      // Handle 401 Unauthorized - token expired
      if (response.status === 401 && retryOnAuthError) {
        console.log("Token expired, attempting refresh...");
        const refreshResult = await this.refreshToken();
        
        if (refreshResult.success) {
          // Retry the original request with new token
          return this.makeRequest(endpoint, method, body, false);
        } else {
          // Refresh failed, clear auth and return error
          this.clearAuthData();
          return {
            success: false,
            error: "Session expired. Please login again.",
          };
        }
      }
      
      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          error: data.detail || data.message || "API call failed",
        };
      }
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
  private async getToken(): Promise<string> {
    // Try AsyncStorage (React Native), then localStorage (web)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const token =
          localStorage.getItem("auth_token") ||
          localStorage.getItem("authToken");
        if (token) {
          // Validate token before returning
          if (this.isTokenValid(token)) {
            return token;
          } else {
            // Token is invalid, clear it and trigger logout
            this.clearAuthData();
            return "";
          }
        }
      }
      if (typeof require !== "undefined") {
        try {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          const token = await AsyncStorage.getItem("auth_token");
          if (token && this.isTokenValid(token)) {
            return token;
          } else if (token) {
            // Clear invalid token
            await AsyncStorage.removeItem("auth_token");
          }
        } catch {}
      }
      return "";
    } catch (error) {
      console.error("Error getting token:", error);
      return "";
    }
  }

  private isTokenValid(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  }

  private clearAuthData(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("user_data");
      
      // Trigger logout event
      window.dispatchEvent(new CustomEvent('authLogout', { 
        detail: { reason: 'token_expired' } 
      }));
    }
  }
  private async setToken(token: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem("auth_token", token);
        localStorage.setItem("authToken", token);
      }
      if (typeof require !== "undefined") {
        try {
          const AsyncStorage =
            require("@react-native-async-storage/async-storage").default;
          await AsyncStorage.setItem("auth_token", token);
        } catch {}
      }
    } catch (error) {
      console.error("Error setting token:", error);
    }
  }
  // Authentication APIs
  async login(
    credentials: LoginCredentials & { mobile?: string },
  ): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    const payload = {
      mobile: credentials.phone || credentials.mobile,
      password: credentials.password,
    };
    const result = await this.makeRequest<{ user: UserProfile; token: string }>(
      "/api/login/",
      "POST",
      payload,
    );
    if (result.success && result.data) {
      await this.setToken(result.data.access); // Store the access token
      
      // Store refresh token if available
      if (result.data.refresh) {
        localStorage.setItem("refresh_token", result.data.refresh);
      }
      
      localStorage.setItem("user_data", JSON.stringify(result.data.user)); // Store user data

      // Trigger navigation without page refresh
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('authSuccess', { 
          detail: { navigateTo: 'home' } 
        }));
      }
    }
    return result;
  }
  async register(
    userData: RegisterData & {
      username?: string;
      mobile?: string;
      confirmPassword?: string;
      confirm_password?: string;
      referral_code?: string;
    },
  ): Promise<ApiResponse<{ user: UserProfile; token: string }>> {
    const payload = {
      username: userData.name || userData.username,
      mobile: userData.phone || userData.mobile,
      email: userData.email || "",
      password: userData.password,
      confirm_password:
        userData.confirmPassword ||
        userData.confirm_password ||
        userData.password,
      referral_code: userData.referralCode || userData.referral_code || "",
    };
    const result = await this.makeRequest<any>(
      "/api/register/",
      "POST",
      payload,
    );

    if (result.success && result.data) {
      const token = result.data.token; // Ensure your backend returns the token
      const user = result.data.user;
      if (token && user) {
        await this.setToken(token); // Store the token
        localStorage.setItem("user_data", JSON.stringify(user)); // Store user data
      }
      return {
        success: true,
        data: { user, token },
      };
    }

    return result;
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      // Clear all auth data
      this.clearAuthData();
      
      // Optional: Call backend logout endpoint
      try {
        await this.makeRequest<{ success: boolean }>(
          "/api/logout/",
          "POST",
        );
      } catch (error) {
        // Continue with logout even if backend call fails
        console.warn("Backend logout failed:", error);
      }
      
      return { success: true, data: { success: true } };
    } catch (error) {
      console.error("Error during logout:", error);
      return { success: false, error: "Logout failed" };
    }
  }

  async refreshToken(): Promise<ApiResponse<{ access: string }>> {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        return { success: false, error: "No refresh token available" };
      }

      const response = await fetch(`${this.baseUrl}/api/token/refresh/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        this.clearAuthData();
        return { success: false, error: "Token refresh failed" };
      }

      const data = await response.json();
      await this.setToken(data.access);
      
      return { success: true, data };
    } catch (error) {
      this.clearAuthData();
      return { success: false, error: "Token refresh failed" };
    }
  }

  // Authentication status check
  async checkAuthStatus(): Promise<ApiResponse<{ user: UserProfile }>> {
    try {
      // Check if we have stored user data
      if (typeof localStorage !== "undefined") {
        const userData = localStorage.getItem("user_data");
        const authToken = localStorage.getItem("authToken");

        if (userData && authToken) {
          return {
            success: true,
            data: { user: JSON.parse(userData) },
          };
        }
      }

      return { success: false, error: "No authentication found" };
    } catch (error) {
      return { success: false, error: "Auth check failed" };
    }
  }

  // Profile APIs
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    if (!this.getToken()) {
      return { success: false, error: "Authentication required" };
    }
    return this.makeRequest<UserProfile>("/api/profile/");
  }

  async updateProfile(
    profileData: Partial<UserProfile>,
  ): Promise<ApiResponse<UserProfile>> {
    if (!this.getToken()) {
      return { success: false, error: "Authentication required" };
    }
    return this.makeRequest<UserProfile>("/profile", "PUT", profileData);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    if (!this.getToken()) {
      return { success: false, error: "Authentication required" };
    }
    return this.makeRequest<{ success: boolean }>("/change-password", "POST", {
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
    return this.makeRequest<{ kycId: string; status: string }>(
      "/kyc/submit",
      "POST",
      kycData,
    );
  }

  async getKYCStatus(): Promise<
    ApiResponse<{ status: string; rejectionReason?: string }>
  > {
    return this.makeRequest<{ status: string; rejectionReason?: string }>(
      "/kyc/status",
    );
  }

  // Referral APIs
  async getReferralData(): Promise<
    ApiResponse<{
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
    }>
  > {
    return this.makeRequest("/referrals");
  }

  async generateNewReferralCode(): Promise<
    ApiResponse<{ referralCode: string }>
  > {
    return this.makeRequest<{ referralCode: string }>(
      "/referrals/generate",
      "POST",
    );
  }
}

export const userService = new UserService();
