
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./ChangeEmail.css";

function ChangeEmail({ onBack, onEmailChanged }) {
  const [newEmail, setNewEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axiosInstance.post("/change-email/", {
        new_email: newEmail,
      });

      setMessage(
        response.data.message || "OTP sent to your new email address."
      );
      setOtpSent(true);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.message ||
        data?.new_email?.[0] ||
        "Unable to send OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await axiosInstance.post(
        "/verify-email-change/",
        { otp }
      );

      setMessage(
        response.data.message || "Email changed successfully."
      );

      setTimeout(() => {
        onEmailChanged();
      }, 1000);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.message ||
        data?.otp?.[0] ||
        "Invalid OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-email-page">
      <header className="change-email-header">
        <div className="change-email-logo">HomeNest</div>

        <button
          type="button"
          className="change-email-back"
          onClick={onBack}
        >
          Back to Profile
        </button>
      </header>

      <main className="change-email-container">
        <div className="change-email-card">
          <p className="change-email-label">ACCOUNT SECURITY</p>

          <h1>{otpSent ? "Verify Your Email" : "Change Email"}</h1>

          <p className="change-email-description">
            {otpSent
              ? `Enter the OTP sent to ${newEmail}`
              : "Enter your new email address to receive a verification OTP."}
          </p>

          {!otpSent ? (
            <form onSubmit={handleEmailSubmit}>
              <div className="change-email-field">
                <label>New Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Enter your new email"
                  required
                />
              </div>

              <button
                type="submit"
                className="change-email-submit"
                disabled={loading}
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <div className="change-email-field">
                <label>Verification OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                />
              </div>

              <button
                type="submit"
                className="change-email-submit"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>

              <button
                type="button"
                className="change-email-secondary"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                  setMessage("");
                  setError("");
                }}
              >
                Change Email Address
              </button>
            </form>
          )}

          {message && (
            <p className="change-email-success">{message}</p>
          )}

          {error && (
            <p className="change-email-error">{error}</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default ChangeEmail;
