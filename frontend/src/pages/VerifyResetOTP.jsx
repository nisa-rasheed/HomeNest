
import { useState, useEffect } from "react";
import axiosInstance from "../services/axiosInstance";
import "./VerifyResetOTP.css";

function VerifyResetOTP({ email, onOTPVerified }) {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((previousTime) => previousTime - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  const handleVerify = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (timeLeft <= 0) {
      setError("OTP expired. Please request a new OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/verify-reset-otp/",
        {
          email: email,
          otp: otp,
        },
        { skipAuth: true }
      );

      setMessage(response.data.message);
      onOTPVerified(response.data.reset_token);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setMessage("");
    setError("");
    setResendLoading(true);

    try {
      const response = await axiosInstance.post(
        "/forgot/",
        { email: email },
        { skipAuth: true }
      );

      setMessage(response.data.message);
      setOtp("");
      setTimeLeft(300);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend OTP. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="reset-otp-page">
      <div className="reset-otp-card">
        <div className="reset-otp-icon">✉</div>

        <h1>HomeNest</h1>
        <h2>Verify Reset OTP</h2>

        <p className="reset-otp-description">
          Enter the 6-digit password reset code sent to
        </p>

        <p className="reset-otp-email">{email}</p>

        <p className="reset-otp-timer">
          OTP expires in: <strong>{formattedTime}</strong>
        </p>

        <form onSubmit={handleVerify}>
          <div className="reset-otp-field">
            <label htmlFor="reset-otp">Enter OTP</label>

            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, ""))
              }
              required
            />
          </div>

          {message && (
            <p className="reset-otp-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="reset-otp-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="reset-otp-submit"
            disabled={loading || timeLeft <= 0}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <p className="reset-otp-resend">
          Didn't receive the code?
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
          >
            {resendLoading ? "Sending..." : "Resend OTP"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default VerifyResetOTP;
