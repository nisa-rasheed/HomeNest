
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminReturnDetails.css";

function AdminReturnDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [returnRequest, setReturnRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchReturnDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        `/api/orders/admin/returns/${id}/`
      );

      setReturnRequest(response.data.return_request);
      console.log("RETURN DETAILS API:", response.data.return_request);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Failed to load return request details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnDetails();
  }, [id]);

  const handleReturnAction = async (action) => {
    const endpoint =
      action === "approve" ? "approve" : "reject";

    try {
      setProcessing(true);
      setError("");
      setMessage("");

      const response = await axiosInstance.patch(
        `/api/orders/admin/returns/${id}/${endpoint}/`,
        {}
      );

      setMessage(
        response.data.message ||
        (action === "approve"
          ? "Return approved and refund processed successfully."
          : "Return request rejected successfully.")
      );

      await fetchReturnDetails();
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Unable to process this return request."
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price) =>
    `₹${Number(price || 0).toFixed(2)}`;

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="admin-return-details-page">
        Loading return request...
      </div>
    );
  }

  if (error && !returnRequest) {
    return (
      <div className="admin-return-details-page">
        <p className="return-details-error">{error}</p>
        <button onClick={() => navigate("/admin-returns")}>
          Back to Return Requests
        </button>
      </div>
    );
  }

  if (!returnRequest) return null;

  const isPending = returnRequest.status === "pending";

  return (
    <div className="admin-return-details-page">
      <button
        className="return-back-btn"
        onClick={() => navigate("/admin-returns")}
      >
        ← Back to Return Requests
      </button>

      <div className="return-details-header">
        <div>
          <h2>Return Request #{returnRequest.id}</h2>
          <p>Order #{returnRequest.order_id}</p>
        </div>

        <span
          className={`return-status-badge ${
            (returnRequest.status || "pending")
              .toLowerCase()
              .replaceAll("_", "-")
          }`}
        >
          {returnRequest.status?.replaceAll("_", " ")}
        </span>
      </div>

      {message && (
        <p className="return-details-success">{message}</p>
      )}

      {error && (
        <p className="return-details-error">{error}</p>
      )}

      <div className="return-details-grid">
        <section className="return-details-card">
          <h3>Customer Details</h3>

          <div className="return-detail-row">
            <span>Customer Name</span>
            <strong>{returnRequest.customer_name || "-"}</strong>
          </div>

          <div className="return-detail-row">
            <span>Email</span>
            <strong>{returnRequest.customer_email || "-"}</strong>
          </div>
        </section>

        
<section className="return-details-card">
  <h3>Product Details</h3>

  <div className="return-detail-row">
    <span>Product</span>
    <strong>{returnRequest.product_name || "-"}</strong>
  </div>

  <div className="return-detail-row">
    <span>Product Price</span>
    <strong>
      {formatPrice(returnRequest.product_price)}
    </strong>
  </div>

  <div className="return-detail-row">
    <span>Return Quantity</span>
    <strong>{returnRequest.return_quantity}</strong>
  </div>

  <div className="return-detail-row">
    <span>Product Amount</span>
    <strong>
      {formatPrice(
        Number(returnRequest.product_price || 0) *
        Number(returnRequest.return_quantity || 0)
      )}
    </strong>
  </div>

  <div className="return-detail-row">
    <span>Return Reason</span>
    <strong>{returnRequest.reason || "-"}</strong>
  </div>

  <div className="return-detail-row">
    <span>Description</span>
    <strong>{returnRequest.description || "-"}</strong>
  </div>
</section>

        <section className="return-details-card">
          <h3>Refund Details</h3>

          <div className="return-detail-row">
            <span>Refund Amount</span>
            <strong>{formatPrice(returnRequest.refund_amount)}</strong>
          </div>

          <div className="return-detail-row">
            <span>Refund Status</span>
            <strong>{returnRequest.refund_status || "-"}</strong>
          </div>

          <div className="return-detail-row">
            <span>Payment Method</span>
            <strong>{returnRequest.order_payment_method || "-"}</strong>
          </div>

          <div className="return-detail-row">
            <span>Payment Status</span>
            <strong>{returnRequest.order_payment_status || "-"}</strong>
          </div>

          <p className="return-refund-note">
            Approved refunds are credited to the customer's HomeNest Wallet.
          </p>
        </section>

        <section className="return-details-card">
          <h3>Request Information</h3>

          <div className="return-detail-row">
            <span>Request Group</span>
            <strong>{returnRequest.request_group || "-"}</strong>
          </div>

          <div className="return-detail-row">
            <span>Requested At</span>
            <strong>{formatDate(returnRequest.requested_at)}</strong>
          </div>

          <div className="return-detail-row">
            <span>Last Updated</span>
            <strong>{formatDate(returnRequest.updated_at)}</strong>
          </div>

          <div className="return-detail-row">
            <span>Order Status</span>
            <strong>{returnRequest.order_status || "-"}</strong>
          </div>
        </section>
      </div>

      {isPending && (
        <div className="return-action-section">
          <h3>Return Request Actions</h3>

          <p>
            Approving this request will process the wallet refund
            and restore the returned product stock.
          </p>

          <div className="return-action-buttons">
            <button
              className="return-approve-btn"
              disabled={processing}
              onClick={() => handleReturnAction("approve")}
            >
              {processing ? "Processing..." : "Approve & Refund"}
            </button>

            <button
              className="return-reject-btn"
              disabled={processing}
              onClick={() => handleReturnAction("reject")}
            >
              {processing ? "Processing..." : "Reject Return"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminReturnDetails;
