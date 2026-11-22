
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import Pagination from "../components/Pagination";
import "./AdminReturns.css";

function AdminReturns() {
  const navigate = useNavigate();

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReturns, setTotalReturns] = useState(0);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        "/api/orders/admin/returns/",
        {
          params: {
            status: status || undefined,
            page: page,
            page_size: 6,
          },
        }
      );

      setReturns(response.data.returns || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalReturns(response.data.total_returns || 0);

    } catch (err) {
      setReturns([]);
      setError(
        err.response?.data?.message ||
        "Failed to load return requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [status, page]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toFixed(2)}`;
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (value) => {
    return (value || "pending").toLowerCase().replaceAll("_", "-");
  };

  const openDetails = (id) => {
    navigate(`/admin-returns/${id}`);
  };

  return (
    <div className="admin-returns-page">

      <div className="admin-returns-content">

        {/* HEADER */}

        <div className="admin-returns-header">
          <div>
            <h2>Return Management</h2>
            <p>Manage customer return requests and refunds.</p>
          </div>

          <button
            onClick={fetchReturns}
            className="returns-refresh-btn"
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* FILTER */}

        <div className="returns-filter-section">
          <label htmlFor="return-status">
            Filter by Status
          </label>

          <select
            id="return-status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* TOTAL RETURNS */}

        <div className="returns-count">
          Total Return Requests: {totalReturns}
        </div>

        {/* TABLE */}

        <div className="returns-table-wrapper">

          {loading ? (
            <p className="returns-message">
              Loading return requests...
            </p>
          ) : error ? (
            <p className="returns-error">{error}</p>
          ) : returns.length === 0 ? (
            <p className="returns-message">
              No return requests found.
            </p>
          ) : (
            <table className="returns-table">

              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Refund Amount</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                </tr>
              </thead>

              <tbody>
                {returns.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => openDetails(item.id)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openDetails(item.id);
                      }
                    }}
                    title="Click to view return details"
                  >
                    <td>#{item.id}</td>
                    <td>#{item.order_id}</td>
                    <td>{item.customer_name || "-"}</td>
                    <td>{item.product_name || "-"}</td>
                    <td>{item.return_quantity}</td>
                    <td>{item.reason || "-"}</td>
                    <td>{formatPrice(item.refund_amount)}</td>

                    <td>
                      <span
                        className={`return-status-badge ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status?.replaceAll("_", " ") || "Pending"}
                      </span>
                    </td>

                    <td>{formatDate(item.requested_at)}</td>
                  </tr>
                ))}
              </tbody>

            </table>
          )}

        </div>

      </div>

      {/* PAGINATION */}

      {!loading && !error && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

    </div>
  );
}

export default AdminReturns;
