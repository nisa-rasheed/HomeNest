
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./PaymentFailed.css";

function PaymentFailed() {
  const location = useLocation();
  const navigate = useNavigate();

  const { orderId, amount, message } = location.state || {};

  useEffect(() => {
    if (!orderId) {
      navigate("/my-orders", { replace: true });
    }
  }, [orderId, navigate]);

  if (!orderId) {
    return null;
  }

  const formattedAmount = Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleRetryPayment = () => {
    navigate("/my-orders", {
      state: { retryOrderId: orderId },
    });
  };

  return (
    <div className="payment-failed-page">
      <div className="payment-failed-card">
        <div className="payment-failed-icon">✕</div>

        <h1>Payment Failed</h1>

        <p className="payment-failed-message">
          {message || "Your payment could not be completed."}
        </p>

        <div className="payment-failed-details">
          <div>
            <span>Order ID</span>
            <strong>#{orderId}</strong>
          </div>

          <div>
            <span>Order Amount</span>
            <strong>₹{formattedAmount}</strong>
          </div>

          <div>
            <span>Payment Status</span>
            <strong className="failed-status">Failed / Pending</strong>
          </div>
        </div>

        <p className="payment-failed-note">
          Your order has been saved. You can retry the payment without
          creating another order.
        </p>

        <button
          className="payment-retry-button"
          onClick={handleRetryPayment}
        >
          Retry Payment
        </button>

        <button
          className="payment-orders-button"
          onClick={() => navigate("/my-orders")}
        >
          Back to My Orders
        </button>
      </div>
    </div>
  );
}

export default PaymentFailed;
