
import { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure authentication state is properly synchronized
  useEffect(() => {
    const hasValidUser = user && user.id && user.phone;
    setIsAuthenticated(hasValidUser);
    console.log('Auth state updated:', { hasValidUser, userId: user?.id, userName: user?.name });
  }, [user]);

  // Login validation function
  const validateCredentials = (credentials: any) => {
    if (!credentials.phone || credentials.phone.trim() === '') {
      return { valid: false, error: '📱 Mobile number जरूरी है' };
    }
    
    if (!credentials.password || credentials.password.trim() === '') {
      return { valid: false, error: '🔒 Password जरूरी है' };
    }
    
    // Remove any spaces and check if it's numeric
    const cleanPhone = credentials.phone.replace(/\s/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      return { valid: false, error: '📱 10 digit का valid mobile number डालें' };
    }
    
    if (credentials.password.length < 4) {
      return { valid: false, error: '🔒 Password कम से कम 4 characters का होना चाहिए' };
    }
    
    return { valid: true };
  };

  // Register validation function
  const validateRegistration = (userData: any) => {
    if (!userData.name || !userData.phone || !userData.password || !userData.confirmPassword) {
      return { valid: false, error: 'सभी required fields भरना जरूरी है' };
    }
    
    if (userData.phone.length !== 10) {
      return { valid: false, error: 'Phone number 10 digits का होना चाहिए' };
    }
    
    if (userData.password !== userData.confirmPassword) {
      return { valid: false, error: 'Password और Confirm Password match नहीं कर रहे' };
    }
    
    if (userData.password.length < 6) {
      return { valid: false, error: 'Password कम से कम 6 characters का होना चाहिए' };
    }
    
    if (userData.email && !userData.email.includes('@')) {
      return { valid: false, error: 'Valid email address डालें' };
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
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any 10-digit phone with password length >= 6
      const mockUser = {
        id: Date.now().toString(),
        name: `User ${credentials.phone.slice(-4)}`,
        phone: credentials.phone,
        email: `user${credentials.phone.slice(-4)}@example.com`,
        kycStatus: 'PENDING' as const,
        referralCode: 'REF' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        walletBalance: Math.floor(Math.random() * 5000) + 1000,
        isVerified: true,
        joinedAt: new Date().toISOString()
      };
      
      // Store user data securely
      await AsyncStorage.setItem('user_data', JSON.stringify(mockUser));
      await AsyncStorage.setItem('auth_token', 'demo_token_' + Date.now());
      
      // Ensure both states are updated properly
      setUser(mockUser);
      setIsAuthenticated(true);
      
      console.log('User authenticated successfully:', mockUser.name, 'ID:', mockUser.id);
      return { success: true, user: mockUser };
      
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login में problem हुई। कृपया फिर से try करें।' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      setIsLoading(true);
      
      // Validate registration data
      const validation = validateRegistration(userData);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      // Mock successful registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const newUser = {
        id: Date.now().toString(),
        name: userData.name,
        phone: userData.phone,
        email: userData.email || '',
        kycStatus: 'PENDING',
        referralCode: 'REF' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        walletBalance: 0,
        isVerified: false,
        joinedAt: new Date().toISOString(),
        referredBy: userData.referralCode || null
      };
      
      // Store user data securely
      await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
      await AsyncStorage.setItem('auth_token', 'demo_token_' + Date.now());
      
      // Ensure both states are updated properly
      setUser(newUser);
      setIsAuthenticated(true);
      
      console.log('User registered and authenticated successfully:', newUser.name);
      return { success: true, user: newUser };
      
    } catch (error) {
      return { success: false, error: 'Registration failed. Please try again.' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear all stored data
      await AsyncStorage.multiRemove(['user_data', 'auth_token']);
      
      // Reset all states to initial values
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      
      console.log('Logout successful - all states cleared');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Logout failed' };
    }
  };

  const updateProfile = async (profileData: any) => {
    try {
      if (!isAuthenticated) {
        return { success: false, error: 'User not authenticated' };
      }
      
      const updatedUser = { ...user, ...profileData };
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true, user: updatedUser };
    } catch (error) {
      return { success: false, error: 'Profile update failed' };
    }
  };

  const checkAuthStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      const authToken = await AsyncStorage.getItem('auth_token');
      
      if (userData && authToken) {
        const user = JSON.parse(userData);
        setUser(user);
        setIsAuthenticated(true);
        return { success: true, user };
      }
      
      return { success: false };
    } catch (error) {
      console.error('Auth check error:', error);
      return { success: false };
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
        console.error('Auth initialization error:', error);
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
    requireAuth
  };
};
