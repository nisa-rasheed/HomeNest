
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./AdminLogin.css";
function EyeIcon({ visible }) {
  return visible ? (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a14.5 14.5 0 0 1-3 3.8" />
      <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7c1.3 0 2.5-.3 3.6-.8" />
    </svg>
  );
}
function AdminLogin({ onAdminLoginSuccess, onBackToCustomerLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/api/admin/login/",
        formData,
        { skipAuth: true }
      );

      sessionStorage.setItem("access_token", response.data.access);
      sessionStorage.setItem("refresh_token", response.data.refresh);

      onAdminLoginSuccess(response.data.user);
    } catch (err) {
      const data = err.response?.data;

      if (data && typeof data === "object") {
        const errorMessages = Object.entries(data)
          .map(([field, messages]) => {
            const text = Array.isArray(messages)
              ? messages.join(" ")
              : String(messages);

            return `${field}: ${text}`;
          })
          .join(" ");

        setError(errorMessages || "Admin login failed.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <header className="admin-login-header">
        <div className="admin-login-logo">
          <span>H</span> HomeNest
        </div>
        <span className="admin-label">ADMIN PORTAL</span>
      </header>

      <main className="admin-login-main">
        <div className="admin-login-card">
          <div className="admin-login-icon">♙</div>

          <h1>Admin Login</h1>

          <p className="admin-login-subtitle">
            Sign in to manage HomeNest customers
          </p>

          <form onSubmit={handleSubmit}>
            <div className="admin-login-field">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                name="email"
                placeholder="Enter admin email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>

              <div className="admin-password-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                    type="button"
                    className="admin-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                >
                    <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            {error && (
              <p className="admin-login-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <button
            type="button"
            className="admin-back-button"
            onClick={onBackToCustomerLogin}
          >
            Back to Customer Login
          </button>
        </div>
      </main>

      <footer className="admin-login-footer">
        © 2026 HomeNest. All rights reserved.
      </footer>
    </div>
  );
}

export default AdminLogin;
