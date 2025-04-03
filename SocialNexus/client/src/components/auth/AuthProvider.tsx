import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/types/forum';

interface TcIdentityData {
  tcNo: string;
  firstName: string;
  lastName: string;
  yearOfBirth: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, displayName: string, tcIdentity?: TcIdentityData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await res.json();
      setUser(userData);
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.displayName}!`,
      });
      return userData;
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, password: string, displayName: string, tcIdentity?: TcIdentityData) => {
    try {
      setIsLoading(true);
      // Generate avatar URL based on display name
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0084FF&color=fff`;
      
      // Kayıt işlemi için gerekli veriler
      const registerData = { 
        username, 
        password, 
        displayName,
        avatar
      };
      
      // TC kimlik bilgileri varsa ekle
      if (tcIdentity) {
        Object.assign(registerData, {
          tcNo: tcIdentity.tcNo,
          firstName: tcIdentity.firstName,
          lastName: tcIdentity.lastName,
          yearOfBirth: tcIdentity.yearOfBirth
        });
      }
      
      const res = await apiRequest('POST', '/api/auth/register', registerData);
      const userData = await res.json();
      setUser(userData);
      toast({
        title: "Registration successful",
        description: `Welcome to the forum, ${userData.displayName}!`,
      });
      return userData;
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiRequest('POST', '/api/auth/logout', {});
      setUser(null);
      
      // Clear all cached data
      queryClient.clear();
      
      // Redirect to home page
      setLocation('/');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
