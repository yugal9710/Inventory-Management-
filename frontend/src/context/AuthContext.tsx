import React, { createContext, useContext, useState } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User;
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
  const [currentUser, setCurrentUser] = useState<User>(defaultUsers.admin);

  const switchRole = (role: UserRole) => {
    setCurrentUser(defaultUsers[role]);
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider value={{ currentUser, switchRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
