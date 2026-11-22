import { useState, useEffect } from "react";
import axiosInstance from "../services/axiosInstance";
import "./VerifyOTP.css";

function VerifyOTP({ email, onVerificationSuccess }) {
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

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
      setError("OTP expired. Please resend a new OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/verify-otp/",
        {
          email: email,
          otp: otp,
        },
        { skipAuth: true }
      );

      sessionStorage.setItem("access_token", response.data.access);
      sessionStorage.setItem("refresh_token", response.data.refresh);
      sessionStorage.setItem("user_role", "customer");

      setMessage(response.data.message);
      onVerificationSuccess();
    } catch (err) {
      setError(
        err.response?.data?.message ||
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
        "/resend-otp/",
        {
          email: email,
        },
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
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-icon">✉</div>

        <h1>HomeNest</h1>
        <h2>Verify Your Email</h2>

        <p className="verify-description">
          We've sent a 6-digit verification code to
        </p>

        <p className="verify-email">{email}</p>

        <p className="verify-timer">
          OTP expires in: <strong>{formattedTime}</strong>
        </p>

        <form onSubmit={handleVerify}>
          <div className="verify-field">
            <label htmlFor="otp">Enter OTP</label>

            <input
              id="otp"
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
            <p className="verify-success" role="status">
              {message}
            </p>
          )}

          {error && (
            <p className="verify-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="verify-submit"
            disabled={loading || timeLeft <= 0}
          >
            {loading ? "Verifying..." : "Verify Email"}
          </button>
        </form>

        <p className="verify-resend">
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

export default VerifyOTP;