import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const Login = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("buyer");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password || (isSignup && !firstName)) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const apiUrl = "http://localhost:3001";
      const endpoint = isSignup ? "/api/register" : "/api/login";

      if (isSignup) {
        // Register new user
        const registerResponse = await fetch(`${apiUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, email, password, role }),
        });

        const registerData = await registerResponse.json();

        if (!registerResponse.ok) {
          toast.error(registerData.error || "Registration failed");
          return;
        }

        toast.success("Account created successfully! Please login.");
        setIsSignup(false);
        setPassword("");
      } else {
        // Login existing user
        const loginResponse = await fetch(`${apiUrl}${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          toast.error(loginData.error || "Login failed");
          return;
        }

        // Store token and user data
        login({
          id: loginData.user.id,
          name: loginData.user.firstName,
          email: loginData.user.email,
          role: loginData.user.role,
          token: loginData.token,
        });

        toast.success("Logged in successfully");
        navigate("/");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Network error. Please check your connection.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        {/* Project Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-600">
            IOE Smart Agriculture
          </h1>
          <p className="text-sm text-gray-500">Agricultural IoT Platform</p>
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-800">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        <div className="flex mt-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setIsSignup(false)}
            className={`flex-1 py-2 rounded-lg transition ${
              !isSignup ? "bg-white shadow text-green-600" : "text-gray-500"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsSignup(true)}
            className={`flex-1 py-2 rounded-lg transition ${
              isSignup ? "bg-white shadow text-green-600" : "text-gray-500"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition"
            />
          </div>

          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2"></label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    role === "buyer"
                      ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-300 bg-white text-gray-600 hover:border-green-300"
                  }`}
                >
                  🛒 Customer
                </button>
                <button
                  type="button"
                  onClick={() => setRole("farmer")}
                  className={`py-3 px-4 rounded-lg border-2 transition-all ${
                    role === "farmer"
                      ? "border-green-500 bg-green-50 text-green-700 font-semibold"
                      : "border-gray-300 bg-white text-gray-600 hover:border-green-300"
                  }`}
                >
                  🌾 Farmer
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition"
          >
            {isSignup ? "Create Account" : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          {isSignup ? "Already have an account?" : "New here?"}{" "}
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-green-600 font-medium hover:underline"
          >
            {isSignup ? "Login" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
