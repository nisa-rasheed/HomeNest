
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminOrderDetails.css";

function AdminOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [codReference, setCodReference] = useState("");
  const [collectingCOD, setCollectingCOD] = useState(false);

  const formatPrice = (amount) =>
    `₹${Number(amount || 0).toFixed(2)}`;

  const formatStatus = (value) => {
    if (!value) return "-";

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

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

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        `/api/orders/admin/${id}/`
      );

      setOrder(response.data.order);
      setNewStatus(response.data.order.status);
    } catch (err) {
      console.error("Order details error:", err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Unable to load order details."
      );
    } finally {
      setLoading(false);
    }
  };
   
  const updateOrderStatus = async () => {
  try {
    setUpdatingStatus(true);
    setError("");

    await axiosInstance.patch(
      `/api/orders/admin/${id}/status/`,
      {
        status: newStatus,
      }
    );

    

    await fetchOrderDetails();
  } catch (err) {
    console.error("Status update error:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.detail ||
      "Unable to update order status."
    );
  } finally {
    setUpdatingStatus(false);
  }
};

const collectCODPayment = async () => {
  if (!codReference.trim()) {
    setError("Please enter COD collection reference.");
    return;
  }

  try {
    setCollectingCOD(true);
    setError("");

    await axiosInstance.patch(
      `/api/orders/admin/${id}/cod-payment/`,
      {
        cod_collection_reference: codReference.trim(),
      }
    );


    setCodReference("");
    await fetchOrderDetails();

  } catch (err) {
    console.error("COD collection error:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.detail ||
      "Unable to collect COD payment."
    );
  } finally {
    setCollectingCOD(false);
  }
};
  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  if (loading) {
    return <div className="admin-order-details-page">Loading order details...</div>;
  }

  if (error || !order) {
    return (
      <div className="admin-order-details-page">
        <p>{error || "Order not found."}</p>
        <button onClick={() => navigate("/admin-orders")}>
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="admin-order-details-page">
      <button
        className="admin-order-back"
        onClick={() => navigate("/admin-orders")}
      >
        ← Back to Orders
      </button>

      <div className="admin-order-details-header">
        <div>
          <h2>Order #{order.id}</h2>
          <p>Placed on {formatDate(order.created_at)}</p>
        </div>

        <span className={`admin-order-status ${order.status}`}>
          {formatStatus(order.status)}
        </span>
      </div>

      <section className="admin-order-detail-card">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> {order.customer_name || "-"}</p>
        <p><strong>Email:</strong> {order.customer_email || "-"}</p>
        <p><strong>Phone:</strong> {order.shipping_phone || "-"}</p>
      </section>

      <section className="admin-order-detail-card">
            <h3>Shipping Address</h3>

            <p><strong>Name:</strong> {order.shipping_full_name || "-"}</p>
            <p><strong>Phone:</strong> {order.shipping_phone || "-"}</p>
            <p><strong>Address:</strong> {order.shipping_address_line || "-"}</p>
            <p><strong>City:</strong> {order.shipping_city || "-"}</p>
            <p><strong>District:</strong> {order.shipping_district || "-"}</p>
            <p><strong>State:</strong> {order.shipping_state || "-"}</p>
            <p><strong>PIN Code:</strong> {order.shipping_pincode || "-"}</p>
            </section>

            <section className="admin-order-detail-card">
  <h3>Update Order Status</h3>

  <select
    value={newStatus}
    onChange={(e) => setNewStatus(e.target.value)}
    disabled={updatingStatus}
  >
    <option value="pending">Pending</option>
    <option value="confirmed">Confirmed</option>
    <option value="shipped">Shipped</option>
    <option value="out_for_delivery">Out for Delivery</option>
    <option value="delivered">Delivered</option>
  </select>

  <button
    type="button"
    onClick={updateOrderStatus}
    disabled={updatingStatus || newStatus === order.status}
  >
    {updatingStatus ? "Updating..." : "Update Status"}
  </button>
</section>

      <section className="admin-order-detail-card">
        <h3>Payment Details</h3>
        <p><strong>Method:</strong> {formatStatus(order.payment_method)}</p>
        <p><strong>Payment Status:</strong> {formatStatus(order.payment_status)}</p>
        <p><strong>Wallet Used:</strong> {formatPrice(order.wallet_amount_used)}</p>
      </section>
       
       {order.payment_method === "cod" &&
  order.status === "delivered" &&
  order.payment_status === "pending" && (
    <section className="admin-order-detail-card">
      <h3>COD Payment Collection</h3>

      <p>
        <strong>Amount to Collect:</strong>{" "}
        {formatPrice(order.final_amount)}
      </p>

      <label>Collection Reference</label>

      <input
        type="text"
        value={codReference}
        onChange={(e) => setCodReference(e.target.value)}
        placeholder="Enter collection reference"
        disabled={collectingCOD}
      />

      <button
        type="button"
        onClick={collectCODPayment}
        disabled={collectingCOD || !codReference.trim()}
      >
        {collectingCOD ? "Processing..." : "Mark as Collected"}
      </button>
    </section>
  )}
      <section className="admin-order-detail-card">
        <h3>Order Items</h3>

        {order.items?.length ? (
          <div className="admin-order-items-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name || "-"}</td>
                    <td>{item.quantity}</td>
                    <td>{formatPrice(item.price)}</td>
                    <td>{formatPrice(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No order items found.</p>
        )}
      </section>

      <section className="admin-order-detail-card">
        <h3>Order Summary</h3>
        <p><strong>Product Amount:</strong> {formatPrice(order.product_amount)}</p>
        <p><strong>Tax:</strong> {formatPrice(order.tax_amount)}</p>
        <p><strong>Shipping:</strong> {formatPrice(order.shipping_charge)}</p>
        <p><strong>Discount:</strong> {formatPrice(order.discount_amount)}</p>
        <p><strong>Coupon:</strong> {order.coupon_code || "-"}</p>
        <h3>Total: {formatPrice(order.final_amount)}</h3>
      </section>

      <section className="admin-order-detail-card">
        <h3>Tracking History</h3>

        {order.tracking_history?.length ? (
          order.tracking_history.map((history, index) => (
            <div key={history.id || index}>
              <strong>{formatStatus(history.status)}</strong>
              <p>{history.description || "-"}</p>
              <small>{formatDate(history.created_at)}</small>
            </div>
          ))
        ) : (
          <p>No tracking history available.</p>
        )}
      </section>
    </div>
  );
}

export default AdminOrderDetails;
