import { useState, useEffect } from "react";
import { userService } from "../services/userService";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure authentication state is properly synchronized
  useEffect(() => {
    const hasValidUser = user && (user.id || user.mobile || user.phone) && (user.name || user.username);
    setIsAuthenticated(hasValidUser);
    console.log("Auth state updated:", {
      hasValidUser,
      userId: user?.id,
      userName: user?.name || user?.username,
      userPhone: user?.phone || user?.mobile,
    });
  }, [user]);

  // Login validation function
  const validateCredentials = (credentials: any) => {
    if (!credentials.phone || credentials.phone.trim() === "") {
      return { valid: false, error: "📱 Mobile number जरूरी है" };
    }

    if (!credentials.password || credentials.password.trim() === "") {
      return { valid: false, error: "🔒 Password जरूरी है" };
    }

    // Remove any spaces and check if it's numeric
    const cleanPhone = credentials.phone.replace(/\s/g, "");
    if (!/^\d{10}$/.test(cleanPhone)) {
      return {
        valid: false,
        error: "📱 10 digit का valid mobile number डालें",
      };
    }

    if (credentials.password.length < 4) {
      return {
        valid: false,
        error: "🔒 Password कम से कम 4 characters का होना चाहिए",
      };
    }

    return { valid: true };
  };

  // Register validation function
  const validateRegistration = (userData: any) => {
    if (
      !userData.name ||
      !userData.phone ||
      !userData.password ||
      !userData.confirmPassword
    ) {
      return { valid: false, error: "सभी required fields भरना जरूरी है" };
    }

    if (userData.phone.length !== 10) {
      return { valid: false, error: "Phone number 10 digits का होना चाहिए" };
    }

    if (userData.password !== userData.confirmPassword) {
      return {
        valid: false,
        error: "Password और Confirm Password match नहीं कर रहे",
      };
    }

    if (userData.password.length < 6) {
      return {
        valid: false,
        error: "Password कम से कम 6 characters का होना चाहिए",
      };
    }

    if (userData.email && !userData.email.includes("@")) {
      return { valid: false, error: "Valid email address डालें" };
    }

    return { valid: true };
  };

  const login = async (credentials: any) => {
    try {
      setIsLoading(true);
      // Validate credentials first
      const validation = validateCredentials(credentials);
      if (!validation.valid) {
        setIsLoading(false);
        return { success: false, error: validation.error };
      }

      // Call login API
      const response = await userService.login({
        phone: credentials.phone.trim(),
        password: credentials.password,
      });

      if (response.success && response.data) {
        const { user, token } = response.data;
        await AsyncStorage.setItem("user_data", JSON.stringify(user));
        await AsyncStorage.setItem("auth_token", token);
        setUser(user);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true, user };
      } else {
        setIsLoading(false);
        return {
          success: false,
          error:
            response.error || "Login में problem हुई। कृपया फिर से try करें।",
        };
      }
    } catch (error) {
      setIsLoading(false);
      console.error("Login error:", error);
      return {
        success: false,
        error: "Login में problem हुई। कृपया फिर से try करें।",
      };
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      // Validate registration data
      const validation = validateRegistration(userData);
      if (!validation.valid) {
        setIsLoading(false);
        return { success: false, error: validation.error };
      }

      // Call register API
      const response = await userService.register({
        name: userData.name.trim(),
        phone: userData.phone.trim(),
        email: userData.email?.trim() || "",
        password: userData.password,
        referralCode: userData.referralCode?.trim().toUpperCase() || "",
      });

      if (response.success && response.data) {
        const { user, token } = response.data;
        await AsyncStorage.setItem("user_data", JSON.stringify(user));
        await AsyncStorage.setItem("auth_token", token);
        setUser(user);
        setIsAuthenticated(true);
        setIsLoading(false);
        return { success: true, user };
      } else {
        setIsLoading(false);
        return {
          success: false,
          error: response.error || "Registration failed. Please try again.",
        };
      }
    } catch (error) {
      setIsLoading(false);
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  };

  const logout = async () => {
    try {
      // Clear all stored data
      await AsyncStorage.multiRemove(["user_data", "auth_token"]);

      // Reset all states to initial values
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);

      console.log("Logout successful - all states cleared");
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: "Logout failed" };
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      if (!isAuthenticated) {
        return { success: false, error: "User not authenticated" };
      }

      const updatedUser = { ...user, ...profileData };
      await AsyncStorage.setItem("user_data", JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: "Profile update failed" };
    }
  };

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("user_data");
      const authToken = await AsyncStorage.getItem("auth_token");

      if (userData && authToken) {
        // Validate token before accepting it
        if (isTokenValid(authToken)) {
          const user = JSON.parse(userData);
          setUser(user);
          setIsAuthenticated(true);
          return { success: true, user };
        } else {
          // Token is invalid, clear data
          await AsyncStorage.multiRemove(["user_data", "auth_token", "refresh_token"]);
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      return { success: false };
    } catch (error) {
      console.error("Auth check error:", error);
      return { success: false };
    }
  };

  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };

  const requireAuth = () => {
    return isAuthenticated;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const result = await checkAuthStatus();
        if (result.success && result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    checkAuthStatus,
    requireAuth,
  };
};
