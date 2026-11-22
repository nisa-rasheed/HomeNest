
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminOrders.css";
import Pagination from "../components/Pagination";

function AdminOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);

  const [totalOrders, setTotalOrders] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (!data) {
      return err.message || "Something went wrong.";
    }

    if (typeof data === "string") return data;

    return data.message || data.detail || "Unable to fetch orders.";
  };

  // FETCH ADMIN ORDERS
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        page_size: 6,
        search: search.trim(),
        status,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });

      const response = await axiosInstance.get(
        "/api/orders/admin/",
        { params }
      );

      const data = response.data;

      setOrders(data.orders || []);
      setTotalOrders(data.total_orders || 0);
      setTotalPages(data.total_pages || 1);
      console.log("Orders Pagination:", {
      totalOrders: data.total_orders,
      totalPages: data.total_pages,
      currentPage: data.current_page,
    });
    } catch (err) {
  
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [
    page,
    search,
    status,
    paymentMethod,
    paymentStatus,
    dateFrom,
    dateTo,
    sort,
  ]);

  // FILTER CHANGE
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  // RESET FILTERS
  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setPaymentMethod("");
    setPaymentStatus("");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
    setPage(1);
  };

  // FORMAT PRICE
  const formatPrice = (amount) => {
    return `₹${Number(amount || 0).toFixed(2)}`;
  };

  // FORMAT DATE
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

  // DISPLAY STATUS
  const formatStatus = (value) => {
    if (!value) return "-";

    return value
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // OPEN ORDER DETAILS
  const openOrderDetails = (orderId) => {
    navigate(`/admin-orders/${orderId}`);
  };

  return (
    
  <div className="admin-orders-page">

    <div className="admin-orders-page-content">

     {/* HEADER */}
      <div className="admin-orders-header">
        <div>
          <h2>Order Management</h2>
          <p>View and manage all customer orders.</p>
        </div>

        <div className="admin-orders-count">
          Total Orders:
          <strong>{totalOrders}</strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className="admin-orders-filters">

        <input
          type="text"
          placeholder="Search Order ID, customer name or email..."
          value={search}
          onChange={(e) =>
            handleFilterChange(setSearch, e.target.value)
          }
        />

        <select
          value={status}
          onChange={(e) =>
            handleFilterChange(setStatus, e.target.value)
          }
        >
          <option value="">All Order Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentMethod}
          onChange={(e) =>
            handleFilterChange(setPaymentMethod, e.target.value)
          }
        >
          <option value="">All Payment Methods</option>
          <option value="cod">Cash on Delivery</option>
          <option value="razorpay">Razorpay</option>
          <option value="wallet">Wallet</option>
        </select>

        <select
          value={paymentStatus}
          onChange={(e) =>
            handleFilterChange(setPaymentStatus, e.target.value)
          }
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>

        <input
          type="date"
          title="From date"
          value={dateFrom}
          onChange={(e) =>
            handleFilterChange(setDateFrom, e.target.value)
          }
        />

        <input
          type="date"
          title="To date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) =>
            handleFilterChange(setDateTo, e.target.value)
          }
        />

        <select
          value={sort}
          onChange={(e) =>
            handleFilterChange(setSort, e.target.value)
          }
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="amount_high">Amount: High to Low</option>
          <option value="amount_low">Amount: Low to High</option>
        </select>

        

        <button
          type="button"
          className="admin-orders-reset"
          onClick={resetFilters}
        >
          Reset Filters
        </button>

      </div>

      {/* ERROR */}
      {error && (
        <div className="admin-orders-error">
          {error}

          <button type="button" onClick={fetchOrders}>
            Retry
          </button>
        </div>
      )}

      {/* ORDER TABLE */}
      <div className="admin-orders-table-wrapper">

        {loading ? (
          <p className="admin-orders-message">
            Loading orders...
          </p>
        ) : orders.length === 0 ? (
          <p className="admin-orders-message">
            No orders found.
          </p>
        ) : (
          <table className="admin-orders-table">

            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Order Status</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => openOrderDetails(order.id)}
                  style={{ cursor: "pointer" }}
                >

                  <td>
                    <strong>#{order.id}</strong>
                  </td>

                  <td>
                    <div className="admin-order-customer">

                      <button
                        type="button"
                        className="admin-orders-customer-link"
                        onClick={(e) => {
                            e.stopPropagation();
                            openOrderDetails(order.id);
                          }}
                      >
                        {order.customer_name || "-"}
                      </button>

                      <span>
                        {order.customer_email || "-"}
                      </span>

                    </div>
                  </td>

                  <td>{formatDate(order.created_at)}</td>

                  <td className="admin-order-amount">
                    {formatPrice(order.final_amount)}
                  </td>

                  <td>
                    {formatStatus(order.payment_method)}
                  </td>

                  <td>
                    <span
                      className={`admin-order-payment-status ${order.payment_status || ""}`}
                    >
                      {formatStatus(order.payment_status)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={`admin-order-status ${order.status || ""}`}
                    >
                      {formatStatus(order.status)}
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>

          </table>
        )}

      </div>
      </div>
      {!loading && (
  <Pagination
    currentPage={page}
    totalPages={totalPages}
    onPageChange={setPage}
  />
)}
  </div>
);
}

export default AdminOrders;