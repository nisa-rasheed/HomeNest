
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import axiosInstance from "../services/axiosInstance";
import "./Login.css";

function EyeIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="m3 3 18 18" />
          <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7s-3.5 7-10 7c-1.5 0-2.8-.4-4-1" />
          <path d="M6.2 6.2C3.5 8 2 12 2 12" />
        </>
      )}
    </svg>
  );
}

function Login({ onLoginSuccess, onRegister, onForgotPassword }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setMessage("");
    setError("");

    if (!credentialResponse.credential) {
      setError("Google login failed. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/google-login/",
        {
          credential: credentialResponse.credential,
        },
        { skipAuth: true }
      );

      sessionStorage.setItem("access_token", response.data.access);
      sessionStorage.setItem("refresh_token", response.data.refresh);

      onLoginSuccess(response.data.user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google login was unsuccessful. Please try again.");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/login/",
        formData,
        { skipAuth: true }
      );

      sessionStorage.setItem("access_token", response.data.access);
      sessionStorage.setItem("refresh_token", response.data.refresh);

      onLoginSuccess(response.data.user);
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

        setError(errorMessages || "Login failed.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-header">
        <div className="login-logo">
          <span>H</span> HomeNest
        </div>

        <div className="login-header-signup">
          New to HomeNest?
          <button type="button" onClick={onRegister}>
            Sign Up
          </button>
        </div>
      </header>

      <main className="login-main">
        <div className="login-card">
          <div className="login-icon">⌂</div>

          <h1>HomeNest</h1>
          <h2>Welcome Back</h2>

          <p className="login-subtitle">
            Sign in to continue to your account
          </p>

          <div className="login-google-button">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="continue_with"
              theme="outline"
              shape="rect"
              width="320"
            />
          </div>

          <div className="login-divider">
            <span></span>
            OR
            <span></span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>

              <div className="login-password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="login-forgot">
              <button
                type="button"
                onClick={onForgotPassword}
              >
                Forgot Password?
              </button>
            </div>

            {message && <p className="login-success">{message}</p>}
            {error && <p className="login-error" role="alert">{error}</p>}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>
          </form>

          <p className="login-register">
            Don't have an account?
            <button type="button" onClick={onRegister}>
              Create Account
            </button>
          </p>
        </div>
      </main>

      <footer className="login-footer">
        <span>© 2026 HomeNest. All rights reserved.</span>
        <span>Made for your home</span>
      </footer>
    </div>
  );
}

export default Login;
