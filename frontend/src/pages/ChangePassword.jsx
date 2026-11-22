
import { useState } from "react";
import axiosInstance from "../services/axiosInstance";
import "./ChangePassword.css";

function ChangePassword({ onBack }) {
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showPassword, setShowPassword] = useState({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const togglePassword = (field) => {
    setShowPassword((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (formData.new_password !== formData.confirm_password) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axiosInstance.post(
        "/change-password/",
        {
          current_password: formData.current_password,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password,
        }
      );

      setMessage(
        response.data.message || "Password changed successfully."
      );

      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      setShowPassword({
        current_password: false,
        new_password: false,
        confirm_password: false,
      });
    } catch (err) {
      const data = err.response?.data;

      setError(
        data?.current_password?.[0] ||
        data?.new_password?.[0] ||
        data?.confirm_password?.[0] ||
        data?.detail ||
        data?.message ||
        "Unable to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }) => (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
    <div className="change-password-page">
      <header className="change-password-header">
        <div className="change-password-logo">HomeNest</div>

        <button
          type="button"
          className="change-password-back"
          onClick={onBack}
        >
          Back to Profile
        </button>
      </header>

      <main className="change-password-container">
        <div className="change-password-card">
          <p className="change-password-label">ACCOUNT SECURITY</p>

          <h1>Change Password</h1>

          <p className="change-password-description">
            Update your password to keep your account secure.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="change-password-field">
              <label htmlFor="current_password">
                Current Password
              </label>

              <div className="password-wrapper">
                <input
                  id="current_password"
                  type={
                    showPassword.current_password ? "text" : "password"
                  }
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleChange}
                  placeholder="Enter current password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePassword("current_password")}
                  aria-label="Toggle current password visibility"
                >
                  <EyeIcon visible={showPassword.current_password} />
                </button>
              </div>
            </div>

            <div className="change-password-field">
              <label htmlFor="new_password">New Password</label>

              <div className="password-wrapper">
                <input
                  id="new_password"
                  type={
                    showPassword.new_password ? "text" : "password"
                  }
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePassword("new_password")}
                  aria-label="Toggle new password visibility"
                >
                  <EyeIcon visible={showPassword.new_password} />
                </button>
              </div>
            </div>

            <div className="change-password-field">
              <label htmlFor="confirm_password">
                Confirm New Password
              </label>

              <div className="password-wrapper">
                <input
                  id="confirm_password"
                  type={
                    showPassword.confirm_password ? "text" : "password"
                  }
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePassword("confirm_password")}
                  aria-label="Toggle confirm password visibility"
                >
                  <EyeIcon visible={showPassword.confirm_password} />
                </button>
              </div>
            </div>

            {message && (
              <p className="change-password-success" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="change-password-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="change-password-submit"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default ChangePassword;
