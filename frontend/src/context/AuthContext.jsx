import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("ioe_user");
      if (!storedUser) return null;

      const parsed = JSON.parse(storedUser);

      // In this auth system the "token" is just the user's own ID.
      // If they don't match, the stored data is stale (old JWT or session).
      if (!parsed?.token || !parsed?.id || parsed.token !== parsed.id) {
        localStorage.removeItem("ioe_user");
        localStorage.removeItem("ioe_token");
        return null;
      }

      return parsed;
    } catch (e) {
      localStorage.removeItem("ioe_user");
      localStorage.removeItem("ioe_token");
      return null;
    }
  });

  const [isLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem("ioe_user", JSON.stringify(user));
      localStorage.setItem("ioe_token", user.token);
    } else {
      localStorage.removeItem("ioe_user");
      localStorage.removeItem("ioe_token");
    }
  }, [user]);

  // Login: server returns token = user.id
  const login = ({ name, email, role, token, id }) => {
    setUser({ id, name, email, role, token });
  };

  // Logout: just clear local state — no server session to invalidate
  const logout = () => {
    setUser(null);
    localStorage.removeItem("ioe_user");
    localStorage.removeItem("ioe_token");
  };

  const getToken = () => user?.token;

  const getUserId = () => user?.id;

  const isAuthenticated = () => !!user && !!user.id;

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        getToken,
        getUserId,
        isAuthenticated,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
