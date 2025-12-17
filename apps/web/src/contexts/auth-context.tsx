import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiCall } from '@/lib/api';

export interface User {
  id: number;
  githubId: string;
  username: string;
  name: string;
  email: string;
  avatarUrl: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('github_token');
    if (token) {
      fetchUserData(token);
    } else {
      setIsLoading(false);
    }

    // Listen for storage changes (when token is added/removed in other tabs or by auth callback)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'github_token') {
        if (event.newValue) {
          // Token was added
          fetchUserData(event.newValue);
        } else {
          // Token was removed
          setUser(null);
          setIsLoading(false);
        }
      }
    };

    // Listen for custom token update events (from auth callback)
    const handleTokenUpdate = (event: CustomEvent) => {
      const token = event.detail;
      if (token) {
        fetchUserData(token);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('github-token-updated', handleTokenUpdate as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('github-token-updated', handleTokenUpdate as EventListener);
    };
  }, []);

  const fetchUserData = async (token: string) => {
    setIsLoading(true);
    try {
      // Fetch user data from our backend instead of GitHub directly
      const response = await apiCall('/auth/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        console.warn('Token is invalid, removing from storage');
        // Token is invalid, remove it
        localStorage.removeItem('github_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't remove token on network errors, just log the error
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = () => {
    // GitHub OAuth configuration
    const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || '';
    const scope = 'user:email,repo';
    
    if (!clientId) {
      alert('GitHub OAuth Client ID not configured. Please set VITE_GITHUB_OAUTH_CLIENT_ID in your environment variables.');
      return;
    }

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
    window.location.href = githubAuthUrl;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('github_token');
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('github_token');
    if (token) {
      try {
        await fetchUserData(token);
      } catch (error) {
        console.error('Error refreshing user data:', error);
        // If refresh fails, remove the invalid token
        localStorage.removeItem('github_token');
        setUser(null);
        throw error;
      }
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
