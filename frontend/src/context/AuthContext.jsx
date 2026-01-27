import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      // Try to restore user from localStorage
      const storedUser = localStorage.getItem("ioe_user");
      const storedToken = localStorage.getItem("ioe_token");

      if (storedUser && storedToken) {
        return JSON.parse(storedUser);
      }
      return null;
    } catch (e) {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Persist user and token to localStorage
    if (user) {
      localStorage.setItem("ioe_user", JSON.stringify(user));
      if (user.token) {
        localStorage.setItem("ioe_token", user.token);
      }
    } else {
      localStorage.removeItem("ioe_user");
      localStorage.removeItem("ioe_token");
    }
  }, [user]);

  // Function to validate token with backend
  const validateToken = async (token) => {
    try {
      const response = await fetch("http://localhost:3001/api/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };

  // Login with database credentials
  const login = ({ name, email, role, token, id }) => {
    setUser({ id, name, email, role, token });
  };

  // Logout and clear all stored data
  const logout = () => {
    setUser(null);
    localStorage.removeItem("ioe_user");
    localStorage.removeItem("ioe_token");
  };

  // Get token from user state (from database)
  const getToken = () => {
    return user?.token;
  };

  // Get user ID from authenticated user
  const getUserId = () => {
    return user?.id;
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!user.token;
  };

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
        validateToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
