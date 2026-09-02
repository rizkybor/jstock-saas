import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("jstock_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = ({ user: userData, token }) => {
    localStorage.setItem("jstock_token", token);
    localStorage.setItem("jstock_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("jstock_token");
    localStorage.removeItem("jstock_user");
    setUser(null);
  };

  const can = (permission) => user?.permissions?.includes(permission) ?? false;

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
