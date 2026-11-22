
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import Pagination from "../components/Pagination";
import "./Customers.css";

function Customers() {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [previousPage, setPreviousPage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingCustomerId, setUpdatingCustomerId] = useState(null);

  const pageSize = 6;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch customer list
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await axiosInstance.get(
          "/api/admin/customers/",
          {
            params: {
              search: search.trim(),
              status: status === "all" ? "" : status,
              page: page,
              page_size: pageSize,
            },
          }
        );

        const data = response.data;

        setCustomers(data.results || []);
        setTotalCount(data.count || 0);
        setNextPage(data.next);
        setPreviousPage(data.previous);
      
      } catch (err) {
        console.error("Customer loading error:", err);

        setError(
          err.response?.data?.detail ||
            "Unable to load customers. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [search, status, page]);

  // Format registration date
  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Open customer details
  const handleView = (customerId) => {
    navigate(`/admin-customers/${customerId}`);
  };

  // Open specific customer's wallet
  const handleWalletView = (event, customerId) => {
    event.stopPropagation();
    navigate(`/admin-customers/${customerId}/wallet`);
  };

  // Block or Unblock customer
  const handleBlockUnblock = async (customer) => {
    const isBlocked = customer.is_active;

    setUpdatingCustomerId(customer.id);
    setError("");

    try {
      const response = await axiosInstance.patch(
        `/api/admin/customers/${customer.id}/status/`,
        {
          is_blocked: isBlocked,
        }
      );

      setCustomers((currentCustomers) =>
        currentCustomers.map((item) =>
          item.id === customer.id
            ? { ...item, is_active: response.data.is_active }
            : item
        )
      );
    } catch (err) {
      console.error("Customer status update error:", err);

      setError(
        err.response?.data?.error ||
          "Unable to update customer status. Please try again."
      );
    } finally {
      setUpdatingCustomerId(null);
    }
  };

  return (
    <div className="customers-page">

      <div className="customers-page-content">

        {/* HEADER */}
        <header className="customers-header">
          <div>
            <p className="customers-subtitle">
              HOMENEST ADMIN PORTAL
            </p>

            <h1>Customer Management</h1>

            <p className="customers-description">
              View and manage registered customers.
            </p>
          </div>

          <button
            type="button"
            className="customers-logout-button"
            onClick={() => {
              sessionStorage.removeItem("access_token");
              sessionStorage.removeItem("refresh_token");
              sessionStorage.removeItem("user_role");

              navigate("/admin-login", { replace: true });
            }}
          >
            Logout
          </button>
        </header>

        <main className="customers-content">

          {/* SEARCH AND FILTER */}
          <div className="customers-toolbar">
            <input
              type="search"
              className="customers-search"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            <select
              className="customers-filter"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All Customers</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="customers-count">
            Total Customers: <strong>{totalCount}</strong>
          </div>

          {error && (
            <p className="customers-error" role="alert">
              {error}
            </p>
          )}

          {/* CUSTOMER TABLE */}
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Registered Date</th>
                  <th>Status</th>
                  <th>Action</th>
                  <th>Wallet</th>
                </tr>
              </thead>

              <tbody>
                {loading && customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="customers-message">
                      Loading customers...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="customers-message">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => handleView(customer.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>#{customer.id}</td>

                      <td className="customer-name">
                        {customer.full_name || "N/A"}
                      </td>

                      <td>{customer.email}</td>

                      <td>{formatDate(customer.created_at)}</td>

                      <td>
                        <span
                          className={`customer-status ${
                            customer.is_active ? "active" : "blocked"
                          }`}
                        >
                          {customer.is_active ? "Active" : "Blocked"}
                        </span>
                      </td>

                      <td>
                        <div className="customer-actions">
                          <button
                            type="button"
                            className={`customer-toggle ${
                              customer.is_active
                                ? "toggle-active"
                                : "toggle-blocked"
                            }`}
                            role="switch"
                            aria-checked={customer.is_active}
                            aria-label={
                              customer.is_active
                                ? "Block customer"
                                : "Unblock customer"
                            }
                            onClick={(event) => {
                              event.stopPropagation();
                              handleBlockUnblock(customer);
                            }}
                            disabled={
                              updatingCustomerId === customer.id
                            }
                          >
                            <span className="toggle-slider"></span>
                          </button>
                        </div>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="customer-wallet-view"
                          onClick={(event) =>
                            handleWalletView(event, customer.id)
                          }
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </main>
      </div>

      {/* FIXED BOTTOM PAGINATION */}
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

export default Customers;
