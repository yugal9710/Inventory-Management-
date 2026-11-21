import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

export interface RegisterPayload {
  username: string;
  password: string;
  full_name: string;
  role?: UserRole;
  phone?: string;
}

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('iron_store_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.warn('Failed to parse saved user from localStorage', e);
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('iron_store_token') || null;
    } catch {
      return null;
    }
  });

  // Verify stored session on app mount against backend database
  useEffect(() => {
    const verifyStoredSession = async () => {
      const storedToken = localStorage.getItem('iron_store_token');
      if (!storedToken) {
        setCurrentUser(null);
        setToken(null);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          // Token invalid or unregistered user - clear session
          setCurrentUser(null);
          setToken(null);
          localStorage.removeItem('iron_store_user');
          localStorage.removeItem('iron_store_token');
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      }
    };
    verifyStoredSession();
  }, []);

  // Keep localStorage in sync
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('iron_store_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('iron_store_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('iron_store_token', token);
    } else {
      localStorage.removeItem('iron_store_token');
    }
  }, [token]);

  const login = async (username: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Invalid username or password',
        };
      }

      const authenticatedUser: User = data.user;
      setCurrentUser(authenticatedUser);
      setToken(data.token);

      return {
        success: true,
        user: authenticatedUser,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to connect to authentication server.',
      };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; message?: string; user?: User }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data.message || 'Registration failed.',
        };
      }

      const registeredUser: User = data.user;
      if (data.token && registeredUser) {
        setCurrentUser(registeredUser);
        setToken(data.token);
      }

      return {
        success: true,
        message: data.message,
        user: registeredUser,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Unable to connect to registration server.',
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('iron_store_user');
    localStorage.removeItem('iron_store_token');
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
