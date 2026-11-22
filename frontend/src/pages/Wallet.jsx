
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  ArrowLeft,
} from "lucide-react";

import axiosInstance from "../services/axiosInstance";
import "./Wallet.css";

function Wallet() {
  const navigate = useNavigate();

  const [balance, setBalance] = useState("0.00");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchWalletData = async () => {
    setLoading(true);
    setError("");

    try {
      const [walletResponse, transactionResponse] =
        await Promise.all([
          axiosInstance.get("/api/wallet/"),
          axiosInstance.get("/api/wallet/transactions/"),
        ]);

      setBalance(
        walletResponse.data?.wallet?.balance || "0.00"
      );

      setTransactions(
        transactionResponse.data?.transactions || []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load wallet details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const totalRefunds = transactions
    .filter(
      (item) =>
        item.transaction_type === "credit" &&
        item.status === "success"
    )
    .reduce(
      (total, item) => total + Number(item.amount || 0),
      0
    );

  const formatAmount = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

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
    return type || "Transaction";
  };

  if (loading) {
    return (
      <div className="wallet-loading">
        Loading wallet...
      </div>
    );
  }

  return (
    <div className="wallet-page">
      <main className="wallet-container">

        <button
          type="button"
          className="wallet-back-btn"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft size={16} />
          Back to Profile
        </button>

        <div className="wallet-heading">
          <p>YOUR HOME NEST WALLET</p>
          <h1>My Wallet</h1>
          <span>Manage your wallet balance and transactions</span>
        </div>

        {error && (
          <div className="wallet-error">
            {error}
            <button
              type="button"
              onClick={fetchWalletData}
            >
              Try Again
            </button>
          </div>
        )}

        {!error && (
          <>
            <div className="wallet-balance-card">
              <div className="wallet-balance-top">
                <div>
                  <span>Available Balance</span>
                  <h2>{formatAmount(balance)}</h2>
                </div>

                <div className="wallet-icon-circle">
                  <WalletIcon size={25} />
                </div>
              </div>

              <div className="wallet-balance-bottom">
                <span>HomeNest Wallet</span>

                <button
                  type="button"
                  onClick={fetchWalletData}
                  disabled={loading}
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="wallet-summary">

              <div className="wallet-summary-card">
                <div className="wallet-summary-icon refund-icon">
                  <ArrowDownLeft size={19} />
                </div>

                <div>
                  <span>Total Refunds</span>
                  <h3>{formatAmount(totalRefunds)}</h3>
                </div>
              </div>

              <div className="wallet-summary-card">
                <div className="wallet-summary-icon transaction-icon">
                  <ShoppingBag size={19} />
                </div>

                <div>
                  <span>Total Transactions</span>
                  <h3>{transactions.length}</h3>
                </div>
              </div>

            </div>

            <section className="wallet-history">

              <div className="wallet-history-heading">
                <div>
                  <h2>Transaction History</h2>
                  <p>View your wallet activity</p>
                </div>
              </div>

              {transactions.length === 0 ? (
                <div className="wallet-empty">
                  <WalletIcon size={35} />
                  <h3>No Transactions Yet</h3>
                  <p>
                    Your wallet transactions will appear here.
                  </p>
                </div>
              ) : (
                <div className="wallet-transaction-list">

                  {transactions.map((item) => {
                    const isCredit =
                      item.transaction_type === "credit";

                    const isSuccess =
                      item.status === "success";

                    return (
                      <div
                        className="wallet-transaction"
                        key={item.id}
                      >

                        <div
                          className={`wallet-transaction-icon ${
                            isCredit ? "credit" : "debit"
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft size={19} />
                          ) : (
                            <ArrowUpRight size={19} />
                          )}
                        </div>

                        <div className="wallet-transaction-info">
                          <h3>
                            {getTransactionLabel(
                              item.transaction_type
                            )}
                          </h3>

                          <span>
                            {formatDate(item.created_at)}
                          </span>

                          <span>
                            Order ID: {item.order_id ?? "—"}
                          </span>

                          {item.reference_id && (
                            <span>
                              Reference: {item.reference_id}
                            </span>
                          )}
                        </div>

                        <div className="wallet-transaction-amount">
                          <h3
                            className={
                              isCredit ? "credit-text" : "debit-text"
                            }
                          >
                            {isCredit ? "+" : "-"}
                            {formatAmount(item.amount)}
                          </h3>

                          <span
                            className={`wallet-status ${
                              isSuccess ? "success" : "failed"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

            </section>

          </>
        )}

      </main>
    </div>
  );
}

export default Wallet;
