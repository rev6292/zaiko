import React, { useState, createContext, useContext, useMemo, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { authenticateUser } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  login: (id: string, password?: string) => Promise<void>;
  logout: () => void;
  setCurrentUser: (user: User | null) => void; // Keep for profile updates
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = useCallback(async (id: string, password?: string) => {
    try {
      const user = await authenticateUser(id, password);
      setCurrentUser(user);
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Re-throw to be handled by the caller (e.g., LoginPage)
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null); 
  }, []);
  
  const updateUserInContext = useCallback((updatedUser: User | null) => {
    setCurrentUser(prevUser => {
      // Handles logout
      if (updatedUser === null) {
          return null;
      }
      // Handles profile updates by merging properties
      if (prevUser && prevUser.id === updatedUser.id) {
        return { ...prevUser, ...updatedUser };
      }
      // Handles login and role switching by replacing the user object
      return updatedUser;
    });
  }, []);

  const value = useMemo(() => ({ currentUser, login, logout, setCurrentUser: updateUserInContext }), [currentUser, login, logout, updateUserInContext]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};