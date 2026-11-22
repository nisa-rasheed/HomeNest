
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowLeft,
  Receipt,
} from "lucide-react";

import axiosInstance from "../services/axiosInstance";
import "./AdminCustomerWallet.css";

function AdminCustomerWallet() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [customer, setCustomer] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [totalRefunds, setTotalRefunds] = useState("0.00");
  const [transactions, setTransactions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWallet = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await axiosInstance.get(
        `/api/wallet/admin/customers/${id}/`
      );

      const data = response.data;

      setCustomer(data.customer || null);
      setWallet(data.wallet || null);
      setTotalRefunds(data.total_refunds || "0.00");
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Customer wallet loading error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to load customer wallet. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [id]);

  const formatAmount = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionLabel = (type) => {
    if (type === "credit") return "Refund Credit";
    if (type === "debit") return "Wallet Payment";

    return "Transaction";
  };

  if (loading) {
    return (
      <div className="admin-customer-wallet-loading">
        Loading customer wallet...
      </div>
    );
  }

  return (
    <div className="admin-customer-wallet-page">
      <header className="admin-customer-wallet-header">
        <div>
          <p className="admin-customer-wallet-subtitle">
            HOMENEST ADMIN PORTAL
          </p>

          <h1>Customer Wallet</h1>

          <p>
            View customer wallet balance and transaction history.
          </p>
        </div>
      </header>

      <main className="admin-customer-wallet-content">
        <button
          type="button"
          className="admin-wallet-back-button"
          onClick={() => navigate("/admin-customers")}
        >
          <ArrowLeft size={17} />
          Back to Customers
        </button>

        {error ? (
          <div className="admin-wallet-error">
            <p>{error}</p>

            <button type="button" onClick={fetchWallet}>
              Try Again
            </button>
          </div>
        ) : (
          <>
            {customer && (
              <section className="admin-wallet-customer-card">
                <div className="admin-wallet-customer-icon">
                  <Wallet size={25} />
                </div>

                <div>
                  <h2>{customer.full_name || "Customer"}</h2>
                  <p>{customer.email}</p>
                  <span>Customer ID: #{customer.id}</span>
                </div>
              </section>
            )}

            <section className="admin-wallet-summary">
              <div className="admin-wallet-summary-card balance-card">
                <div className="admin-wallet-summary-icon">
                  <Wallet size={21} />
                </div>

                <div>
                  <span>Available Balance</span>
                  <h2>
                    {formatAmount(wallet?.balance)}
                  </h2>
                </div>
              </div>

              <div className="admin-wallet-summary-card">
                <div className="admin-wallet-summary-icon refund-summary-icon">
                  <ArrowDownLeft size={21} />
                </div>

                <div>
                  <span>Total Refunds</span>
                  <h2>{formatAmount(totalRefunds)}</h2>
                </div>
              </div>

              <div className="admin-wallet-summary-card">
                <div className="admin-wallet-summary-icon transaction-summary-icon">
                  <Receipt size={21} />
                </div>

                <div>
                  <span>Total Transactions</span>
                  <h2>{transactions.length}</h2>
                </div>
              </div>
            </section>

            <section className="admin-wallet-history">
              <div className="admin-wallet-history-heading">
                <div>
                  <h2>Transaction History</h2>
                  <p>All wallet credits and debits</p>
                </div>

                <button
                  type="button"
                  onClick={fetchWallet}
                  disabled={loading}
                >
                  <RefreshCw size={15} />
                  Refresh
                </button>
              </div>

              {transactions.length === 0 ? (
                <div className="admin-wallet-empty">
                  <Wallet size={38} />
                  <h3>No Transactions Yet</h3>
                  <p>
                    This customer has no wallet transactions.
                  </p>
                </div>
              ) : (
                <div className="admin-wallet-table-wrapper">
                  <table className="admin-wallet-table">
                    <thead>
                      <tr>
                        <th>Transaction</th>
                        <th>Order ID</th>
                        <th>Reference ID</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((item) => {
                        const isCredit =
                          item.transaction_type === "credit";

                        const isSuccess =
                          item.status === "success";

                        return (
                          <tr key={item.id}>
                            <td>
                              <div className="admin-wallet-transaction-name">
                                <span
                                  className={`admin-wallet-transaction-icon ${
                                    isCredit ? "credit" : "debit"
                                  }`}
                                >
                                  {isCredit ? (
                                    <ArrowDownLeft size={17} />
                                  ) : (
                                    <ArrowUpRight size={17} />
                                  )}
                                </span>

                                {getTransactionLabel(
                                  item.transaction_type
                                )}
                              </div>
                            </td>

                            <td>
                              {item.order_id
                                ? `#${item.order_id}`
                                : "—"}
                            </td>

                            <td>
                              {item.reference_id || "—"}
                            </td>

                            <td>{formatDate(item.created_at)}</td>

                            <td>
                              <span
                                className={
                                  isCredit
                                    ? "admin-wallet-credit-amount"
                                    : "admin-wallet-debit-amount"
                                }
                              >
                                {isCredit ? "+" : "-"}
                                {formatAmount(item.amount)}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`admin-wallet-status ${
                                  isSuccess
                                    ? "success"
                                    : item.status === "pending"
                                    ? "pending"
                                    : "failed"
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AdminCustomerWallet;
