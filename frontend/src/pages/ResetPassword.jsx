
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./ResetPassword.css";

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

function ResetPassword({ resetToken, onResetSuccess }) {
  const [formData, setFormData] = useState({
    new_password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    if (formData.new_password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/\d/.test(formData.new_password)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (!/[^a-zA-Z0-9]/.test(formData.new_password)) {
      setError("Password must contain at least one symbol.");
      return;
    }

    if (formData.new_password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/reset-password/",
        {
          reset_token: resetToken,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password,
        },
        { skipAuth: true }
      );

      setMessage(response.data.message);

      setFormData({
        new_password: "",
        confirm_password: "",
      });

      onResetSuccess();
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

        setError(errorMessages || "Password reset failed.");
      } else {
        setError("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <div className="reset-password-icon">🔒</div>

        <h1>HomeNest</h1>
        <h2>Reset Password</h2>

        <p className="reset-password-description">
          Create a new password for your account.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="reset-password-field">
            <label htmlFor="new-password">New Password</label>

            <div className="reset-password-input-wrapper">
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                name="new_password"
                placeholder="Enter new password"
                value={formData.new_password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="reset-password-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <EyeIcon visible={showPassword} />
              </button>
            </div>
          </div>

          <div className="reset-password-field">
            <label htmlFor="confirm-password">Confirm Password</label>

            <div className="reset-password-input-wrapper">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                name="confirm_password"
                placeholder="Confirm new password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
              />

              <button
                type="button"
                className="reset-password-eye"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                <EyeIcon visible={showConfirmPassword} />
              </button>
            </div>
          </div>

          <p className="reset-password-hint">
            Password must contain at least 8 characters, one number
            and one symbol.
          </p>

          {message && (
            <p className="reset-password-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="reset-password-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="reset-password-submit"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResetPassword;
