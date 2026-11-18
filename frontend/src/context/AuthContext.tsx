import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const defaultUsers: Record<UserRole, User> = {
  admin: { id: 1, username: 'admin', full_name: 'Dinesh Sharma (Owner)', role: 'admin', phone: '9851087654', active: 1 },
  cashier: { id: 2, username: 'cashier', full_name: 'Suman Thapa (Cashier)', role: 'cashier', phone: '9841234567', active: 1 },
  storekeeper: { id: 3, username: 'storekeeper', full_name: 'Bikash Tamang (Storekeeper)', role: 'storekeeper', phone: '9812345678', active: 1 },
  accountant: { id: 4, username: 'accountant', full_name: 'Pooja Shrestha (Accountant)', role: 'accountant', phone: '9801234567', active: 1 },
};

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

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('iron_store_user');
    localStorage.removeItem('iron_store_token');
  };

  const switchRole = (role: UserRole) => {
    const roleUser = defaultUsers[role];
    if (roleUser) {
      setCurrentUser(roleUser);
    }
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
        logout,
        switchRole,
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
