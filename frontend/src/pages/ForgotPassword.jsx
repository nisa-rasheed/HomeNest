
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./ForgotPassword.css";

function ForgotPassword({ onBack, onOTPSent }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/forgot/",
        { email: email },
        { skipAuth: true }
      );

      setMessage(response.data.message);
      onOTPSent(email);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to process your request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-page">
      <div className="forgot-card">
        <div className="forgot-icon">🔒</div>

        <h1>HomeNest</h1>
        <h2>Forgot Password?</h2>

        <p className="forgot-description">
          Enter your registered email address.
          We'll send you an OTP to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="forgot-field">
            <label htmlFor="forgot-email">Email Address</label>

            <input
              id="forgot-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          {message && (
            <p className="forgot-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="forgot-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="forgot-submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send OTP"}
          </button>
        </form>

        <button
          type="button"
          className="forgot-back"
          onClick={onBack}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;
