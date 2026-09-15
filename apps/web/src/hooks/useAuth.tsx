"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { apiClient } from "../lib/api/client";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .request<{ success: boolean; data: User }>("/users/me")
      .then((res) => {
        // Mock response unpack since Nest returns raw user object
        setUser(res as any);
      })
      .catch(() => {
        apiClient.clearTokens();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = (token: string, user: User) => {
    apiClient.setTokens(token);
    setUser(user);
  };

  const logout = () => {
    apiClient.clearTokens();
    setUser(null);
    window.location.href = "/";
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
