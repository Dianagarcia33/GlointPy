import React, { createContext, useContext, useState } from 'react';

interface User {
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
  login: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Estado simulado temporal para que puedas ver el menú de usuario.
  const [user, setUser] = useState<User | null>(null);

  const logout = async () => {
    setUser(null);
  };

  const login = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, logout, login }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
