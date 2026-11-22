
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./Register.css";

function Register({ onSignIn, onRegisterSuccess }) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(
  "/register/",
  formData,
  { skipAuth: true }
);

      setMessage(response.data.message);

      if (onRegisterSuccess) {
        onRegisterSuccess(formData.email);
      }
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

        setError(errorMessages || "Registration failed.");
      } else {
        setError(
          "Unable to connect to the server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }) => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
          <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a16 16 0 0 1-3.1 3.8" />
          <path d="M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );

  return (
    <div className="register-page">
      <header className="register-header">
        <div className="brand-logo">
          <span>⌂</span> HomeNest
        </div>

        <div className="header-signin">
          Already have an account?
          <button type="button" onClick={onSignIn} disabled={!onSignIn}>
            Sign In
          </button>
        </div>
      </header>

      <main className="register-main">
        <div className="register-card">
          <div className="register-icon">⌂</div>

          <h1>HomeNest</h1>
          <h2>Create Account</h2>

          <p className="register-subtitle">
            Begin your sanctuary journey
          </p>

          <button type="button" className="google-button">
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Logo"
              className="google-icon"
            />
            Continue with Google
          </button>

          <div className="register-divider">
            <span></span>
            OR
            <span></span>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="register-field">
              <label htmlFor="full_name">Full Name</label>
              <input
                id="full_name"
                type="text"
                name="full_name"
                placeholder="Enter your full name"
                value={formData.full_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="password">Password</label>

              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Toggle password visibility"
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
            </div>

            <div className="register-field">
              <label htmlFor="confirm_password">
                Confirm Password
              </label>

              <div className="password-wrapper">
                <input
                  id="confirm_password"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  placeholder="Confirm your password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(!showConfirmPassword)
                  }
                  aria-label="Toggle confirm password visibility"
                >
                  <EyeIcon visible={showConfirmPassword} />
                </button>
              </div>
            </div>

            {message && (
              <p className="register-success" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="register-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading ? "Registering..." : "Create Account →"}
            </button>
          </form>

          <p className="register-login">
            Already have an account?
            <button type="button" onClick={onSignIn} disabled={!onSignIn}>
              Log In
            </button>
          </p>
        </div>
      </main>

      <footer className="register-footer">
        <span>
          © 2025 HomeNest Living Inc. Quiet architectural sanctuaries.
        </span>

        <div>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
          <span>Assistance</span>
        </div>
      </footer>
    </div>
  );
}

export default Register;
