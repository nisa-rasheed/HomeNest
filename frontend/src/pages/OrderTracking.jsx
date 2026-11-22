
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import axiosInstance from "../services/axiosInstance";

import "./OrderTracking.css";

function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const trackingSteps = [
    { status: "pending", label: "Order Placed" },
    { status: "confirmed", label: "Order Confirmed" },
    { status: "shipped", label: "Shipped" },
    { status: "out_for_delivery", label: "Out for Delivery" },
    { status: "delivered", label: "Delivered" },
  ];

  useEffect(() => {
    const fetchOrderTracking = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get(
          `/api/orders/${orderId}/`
        );

        setOrder(response.data?.order || null);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Unable to load order tracking details."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrderTracking();
  }, [orderId]);

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const currentStatus = order?.status?.toLowerCase();

  const currentStepIndex = trackingSteps.findIndex(
    (step) => step.status === currentStatus
  );

  const trackingHistory = [...(order?.tracking_history || [])].sort(
    (a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
  );

  return (
    <div className="order-tracking-page">
      

      <main className="order-tracking-container">
        <button
          className="tracking-back-button"
          onClick={() => navigate("/my-orders")}
        >
          ← Back to My Orders
        </button>

        <div className="tracking-page-heading">
          <h1>Order Tracking</h1>
          <p>Follow your HomeNest order journey.</p>
        </div>

        {loading && (
          <div className="tracking-message">
            Loading order tracking details...
          </div>
        )}

        {!loading && error && (
          <div className="tracking-error">
            {error}
          </div>
        )}

        {!loading && !error && order && (
          <>
            <section className="tracking-order-summary">
              <div>
                <span className="tracking-label">Order ID</span>
                <h2>#{order.id}</h2>
              </div>

              <div>
                <span className="tracking-label">Order Date</span>
                <p>{formatDate(order.created_at)}</p>
              </div>

              <div>
                <span className="tracking-label">Order Status</span>
                <p className="tracking-current-status">
                  {currentStatus?.replaceAll("_", " ")}
                </p>
              </div>
            </section>

            {currentStatus === "cancelled" ? (
              <section className="tracking-cancelled">
                <h2>Order Cancelled</h2>
                <p>
                  This order has been cancelled.
                </p>
              </section>
            ) : (
              <section className="tracking-progress-section">
                <h2>Delivery Progress</h2>

                <div className="tracking-progress">
                  {trackingSteps.map((step, index) => {
                    const completed =
                      currentStepIndex >= 0 &&
                      index <= currentStepIndex;

                    const active =
                      index === currentStepIndex;

                    return (
                      <div
                        className={`tracking-step ${
                          completed ? "completed" : ""
                        } ${active ? "active" : ""}`}
                        key={step.status}
                      >
                        <div className="tracking-step-indicator">
                          {completed ? "✓" : index + 1}
                        </div>

                        <div className="tracking-step-content">
                          <h3>{step.label}</h3>

                          {active && (
                            <span>Current Status</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="tracking-history-section">
              <h2>Tracking History</h2>

              {trackingHistory.length > 0 ? (
                <div className="tracking-history-list">
                  {trackingHistory.map((item) => (
                    <div
                      className="tracking-history-item"
                      key={item.id}
                    >
                      <div className="tracking-history-dot" />

                      <div className="tracking-history-content">
                        <h3>
                          {item.status?.replaceAll("_", " ")}
                        </h3>

                        <p>
                          {item.description ||
                            "Order status updated."}
                        </p>

                        <span>
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="tracking-empty">
                  No tracking updates available yet.
                </p>
              )}
            </section>
          </>
        )}

        {!loading && !error && !order && (
          <div className="tracking-message">
            Order details not found.
          </div>
        )}
      </main>
    </div>
  );
}

export default OrderTracking;
