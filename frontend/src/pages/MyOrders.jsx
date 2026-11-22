
import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

import axiosInstance from "../services/axiosInstance";

import "./MyOrders.css";

function MyOrders({
  isAuthenticated,
  refreshCartCount,
  onContinueShopping,
}) {
  const navigate = useNavigate();

  const location = useLocation();

  const retryStartedRef = useRef(false);

  const [orders, setOrders] = useState([]);
  const [returnRequests, setReturnRequests] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState("orders");

  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnOrder, setReturnOrder] = useState(null);

  const [returnItems, setReturnItems] = useState([]);
  const [returnForm, setReturnForm] = useState({});

  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState(null);

  // SEARCH AND FILTER STATES
  const [orderSearch, setOrderSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [returnFilter, setReturnFilter] = useState("all");

  // PRICE FORMAT
  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // DATE FORMAT
  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ERROR MESSAGE
  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (typeof data?.detail === "string") {
      return data.detail;
    }

    if (data && typeof data === "object") {
      const firstValue = Object.values(data)[0];

      if (Array.isArray(firstValue)) {
        return firstValue[0];
      }

      if (typeof firstValue === "string") {
        return firstValue;
      }
    }

    return "Something went wrong. Please try again.";
  };

  // PAYMENT METHOD LABEL
  const getPaymentMethod = (method) => {
    const labels = {
      cod: "Cash on Delivery",
      razorpay: "Online Payment",
      wallet: "HomeNest Wallet",
      wallet_razorpay: "Wallet + Online Payment",
    };

    return labels[method] || method || "N/A";
  };

  // CHECK INVOICE DOWNLOAD ELIGIBILITY
  const canDownloadInvoice = (order) => {
    if (!order || order.status === "cancelled") {
      return false;
    }

    if (order.payment_method === "cod") {
      return true;
    }

    return order.payment_status === "paid";
  };

  // LOAD ORDERS
  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        "/api/orders/my-orders/"
      );

      setOrders(response.data?.orders || []);
    } catch (err) {
      console.error("My Orders loading error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // LOAD RETURN HISTORY
  const loadReturnHistory = async () => {
    try {
      const response = await axiosInstance.get(
        "/api/orders/return-requests/"
      );

      setReturnRequests(
        response.data?.return_requests || []
      );
    } catch (err) {
      console.error("Return history error:", err);
      setError(getErrorMessage(err));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
      loadReturnHistory();
    }
  }, [isAuthenticated]);

  // SEARCH + PAYMENT STATUS FILTER
  const filteredOrders = orders.filter((order) => {
    const searchTerm = orderSearch.trim().toLowerCase();

    const orderId = String(order.id || "").toLowerCase();

    const normalizedSearch = searchTerm.replace(/^#/, "");

    const orderIdMatch =
      orderId.includes(normalizedSearch);

    const productNameMatch = (order.items || []).some(
      (item) =>
        String(item.product_name || "")
          .toLowerCase()
          .includes(searchTerm)
    );

    const matchesSearch =
      !searchTerm || orderIdMatch || productNameMatch;

    const paymentStatus = String(
      order.payment_status || ""
    ).toLowerCase();

    const matchesPayment =
      paymentFilter === "all" ||
      paymentStatus === paymentFilter;

    return matchesSearch && matchesPayment;
  });
     // RETURN HISTORY STATUS FILTER
  const filteredReturnRequests = returnRequests.filter(
    (request) => {
      return (
        returnFilter === "all" ||
        String(request.status || "").toLowerCase() === returnFilter
      );
    }
  );
  // CLEAR MESSAGES
  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  // ORDER DETAILS
  const handleViewDetails = async (orderId) => {
    try {
      clearMessages();
      setDetailsLoading(true);

      const response = await axiosInstance.get(
        `/api/orders/${orderId}/`
      );

      setSelectedOrder(response.data?.order || null);
      console.log("ORDER DETAILS API RESPONSE:", response.data);
    } catch (err) {
      console.error("Order details error:", err);
      setError(getErrorMessage(err));
    } finally {
      setDetailsLoading(false);
    }
  };

  // DOWNLOAD INVOICE PDF
  const handleDownloadInvoice = async (orderId) => {
    try {
      clearMessages();
      setInvoiceLoadingId(orderId);

      const response = await axiosInstance.get(
        `/api/orders/${orderId}/`
      );

      const order = response.data?.order;

      if (!order) {
        throw new Error("Order details not found.");
      }

      if (!canDownloadInvoice(order)) {
        throw new Error(
          "Invoice is available after successful payment."
        );
      }

      const doc = new jsPDF();

      // INVOICE HEADER
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(23, 77, 58);
      doc.text("HOMENEST", 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Home & Kitchen Essentials", 14, 27);

      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text("INVOICE", 196, 20, {
        align: "right",
      });

      doc.setDrawColor(214, 184, 121);
      doc.line(14, 34, 196, 34);

      // ORDER DETAILS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Invoice / Order ID: #${order.id}`, 14, 44);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(
        `Order Date: ${formatDate(order.created_at)}`,
        14,
        51
      );

      doc.text(
        `Order Status: ${String(
          order.status || ""
        ).replaceAll("_", " ")}`,
        14,
        58
      );

      // CUSTOMER DETAILS
      doc.setFont("helvetica", "bold");
      doc.text("BILL TO / DELIVERY ADDRESS", 14, 72);

      doc.setFont("helvetica", "normal");

      const addressLines = [
        order.shipping_full_name || "",
        order.shipping_phone || "",
        order.shipping_address_line || "",
        `${order.shipping_city || ""}, ${
          order.shipping_district || ""
        }`,
        `${order.shipping_state || ""} - ${
          order.shipping_pincode || ""
        }`,
      ].filter(Boolean);

      doc.text(addressLines, 14, 80);

      // PRODUCT TABLE
      const tableRows = (order.items || []).map(
        (item, index) => [
          index + 1,
          item.product_name || "Product",
          item.sku || "N/A",
          item.quantity || 0,
          `Rs. ${Number(item.price || 0).toFixed(2)}`,
          `Rs. ${(
            Number(item.price || 0) *
            Number(item.quantity || 0)
          ).toFixed(2)}`,
        ]
      );

      autoTable(doc, {
        startY: 80 + addressLines.length * 6 + 8,

        head: [[
          "No.",
          "Product",
          "SKU",
          "Qty",
          "Unit Price",
          "Total",
        ]],

        body: tableRows,

        theme: "grid",

        styles: {
          font: "helvetica",
          fontSize: 8,
          cellPadding: 3,
        },

        headStyles: {
          fillColor: [23, 77, 58],
          textColor: 255,
          fontStyle: "bold",
        },

        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 52 },
          2: { cellWidth: 30 },
          3: { cellWidth: 15 },
          4: { cellWidth: 35 },
          5: { cellWidth: 35 },
        },
      });

      // PRICE SUMMARY
      let finalY = doc.lastAutoTable.finalY + 12;

      const priceRows = [
        ["Product Amount", order.product_amount],
        ["Tax", order.tax_amount],
        ["Shipping", order.shipping_charge],
      ];

      if (Number(order.discount_amount) > 0) {
        priceRows.push([
          "Discount",
          -Number(order.discount_amount),
        ]);
      }

      priceRows.push([
        "Final Amount",
        order.final_amount,
      ]);

      if (finalY > 245) {
        doc.addPage();
        finalY = 20;
      }

      autoTable(doc, {
        startY: finalY,

        body: priceRows.map(([label, amount]) => [
          label,
          `Rs. ${Number(amount || 0).toFixed(2)}`,
        ]),

        theme: "plain",

        styles: {
          font: "helvetica",
          fontSize: 10,
          cellPadding: 3,
        },

        columnStyles: {
          0: {
            cellWidth: 55,
            fontStyle: "bold",
          },
          1: {
            halign: "right",
            cellWidth: 45,
          },
        },

        margin: {
          left: 105,
          right: 14,
        },

        didParseCell: (data) => {
          if (data.row.index === priceRows.length - 1) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [23, 77, 58];
          }
        },
      });

      // PAYMENT DETAILS
      let paymentY = doc.lastAutoTable.finalY + 12;

      if (paymentY > 270) {
        doc.addPage();
        paymentY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);

      doc.text("Payment Details", 14, paymentY);

      doc.setFont("helvetica", "normal");

      doc.text(
        `Payment Method: ${getPaymentMethod(
          order.payment_method
        )}`,
        14,
        paymentY + 7
      );

      doc.text(
        `Payment Status: ${order.payment_status || "N/A"}`,
        14,
        paymentY + 14
      );

      // FOOTER ON EVERY PAGE
      const pageCount = doc.internal.getNumberOfPages();

      for (let page = 1; page <= pageCount; page++) {
        doc.setPage(page);

        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        doc.text(
          "Thank you for shopping with HomeNest!",
          105,
          285,
          { align: "center" }
        );
      }

      // SAVE PDF
      doc.save(
        `HomeNest_Invoice_Order_${order.id}.pdf`
      );

      setSuccess("Invoice downloaded successfully.");
    } catch (err) {
      console.error("Invoice download error:", err);

      setError(
        err.response
          ? getErrorMessage(err)
          : err.message || "Unable to download invoice."
      );
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  // CANCEL ORDER
  const handleCancelOrder = async () => {
    if (!cancelOrderId) return;

    try {
      setSubmitting(true);
      clearMessages();

      const response = await axiosInstance.post(
        `/api/orders/${cancelOrderId}/cancel/`
      );

      setSuccess(
        response.data?.message ||
          "Order cancelled successfully."
      );

      setShowCancelModal(false);
      setCancelOrderId(null);
      setSelectedOrder(null);

      await loadOrders();
    } catch (err) {
      console.error("Cancel order error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // RETURN ELIGIBILITY
  const canReturnOrder = (order) => {
    if (
      order.status !== "delivered" ||
      order.payment_status !== "paid" ||
      !order.delivered_at
    ) {
      return false;
    }

    const deliveredDate = new Date(order.delivered_at);
    const currentDate = new Date();

    const daysPassed =
      (currentDate - deliveredDate) /
      (1000 * 60 * 60 * 24);

    return daysPassed >= 0 && daysPassed <= 7;
  };

  // OPEN RETURN MODAL
  const handleOpenReturn = (order) => {
    const eligibleItems = (order.items || []).filter(
      (item) => item.status === "delivered"
    );

    if (eligibleItems.length === 0) {
      setError("No eligible delivered products found.");
      return;
    }

    setReturnOrder(order);
    setReturnItems(eligibleItems);

    const initialForm = {};

    eligibleItems.forEach((item) => {
      initialForm[item.id] = {
        selected: false,
        quantity: 1,
        reason: "Damaged product",
        description: "",
      };
    });

    setReturnForm(initialForm);
    setShowReturnModal(true);
    clearMessages();
  };

  // UPDATE RETURN FORM
  const updateReturnForm = (itemId, field, value) => {
    setReturnForm((previous) => ({
      ...previous,
      [itemId]: {
        ...previous[itemId],
        [field]: value,
      },
    }));
  };

  // SUBMIT RETURN REQUEST
  const handleSubmitReturn = async () => {
    if (!returnOrder) return;

    const selectedItems = returnItems.filter(
      (item) => returnForm[item.id]?.selected
    );

    if (selectedItems.length === 0) {
      setError("Please select at least one product.");
      return;
    }

    for (const item of selectedItems) {
      const form = returnForm[item.id];

      if (!form.reason) {
        setError("Please select a return reason.");
        return;
      }

      if (
        Number(form.quantity) < 1 ||
        Number(form.quantity) > Number(item.quantity)
      ) {
        setError("Please enter a valid return quantity.");
        return;
      }
    }

    try {
      setSubmitting(true);
      clearMessages();

      const payload = {
        order_id: returnOrder.id,

        items: selectedItems.map((item) => ({
          order_item: item.id,

          return_quantity: Number(
            returnForm[item.id].quantity
          ),

          reason: returnForm[item.id].reason,

          description:
            returnForm[item.id].description || "",
        })),
      };

      const response = await axiosInstance.post(
        "/api/orders/return-requests/create/",
        payload
      );

      setSuccess(
        response.data?.message ||
          "Return request submitted successfully."
      );

      setShowReturnModal(false);
      setReturnOrder(null);

      await loadReturnHistory();
      await loadOrders();
    } catch (err) {
      console.error("Return request error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // LOAD RAZORPAY SCRIPT
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // VERIFY RAZORPAY PAYMENT
  const verifyRazorpayPayment = async (paymentResponse) => {
    try {
      const response = await axiosInstance.post(
        "/api/orders/razorpay/verify/",
        {
          razorpay_order_id:
            paymentResponse.razorpay_order_id,

          razorpay_payment_id:
            paymentResponse.razorpay_payment_id,

          razorpay_signature:
            paymentResponse.razorpay_signature,
        }
      );

      setSuccess(
        response.data?.message ||
          "Payment completed successfully."
      );

      await loadOrders();

      if (refreshCartCount) {
        await refreshCartCount();
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setError(getErrorMessage(err));
    }
  };

  // RETRY RAZORPAY PAYMENT
  const handleRetryPayment = async (orderId) => {
    try {
      clearMessages();
      setRetryingOrderId(orderId);

      const response = await axiosInstance.post(
        `/api/orders/${orderId}/razorpay/retry/`
      );

      const razorpayData = response.data?.razorpay;

      if (
        !razorpayData?.key_id ||
        !razorpayData?.razorpay_order_id ||
        !razorpayData?.amount
      ) {
        throw new Error("Razorpay details are missing.");
      }

      const loaded = await loadRazorpay();

      if (!loaded) {
        throw new Error("Unable to load Razorpay.");
      }

      const options = {
        key: razorpayData.key_id,
        amount: razorpayData.amount,
        currency: razorpayData.currency || "INR",
        name: "HomeNest",
        description: "HomeNest Order Payment",
        order_id: razorpayData.razorpay_order_id,

        theme: {
          color: "#174D3A",
        },

        handler: async (paymentResponse) => {
          await verifyRazorpayPayment(paymentResponse);
        },

        modal: {
          ondismiss: () => {
            setError(
              "Payment was not completed. You can try again."
            );
          },
        },
      };
    
        // AUTO RETRY FROM PAYMENT FAILED PAGE
  
      const razorpay = new window.Razorpay(options);

      razorpay.on("payment.failed", (paymentError) => {
        setError(
          paymentError.error?.description ||
            "Payment failed. Please try again."
        );
      });

      razorpay.open();
    } catch (err) {
      console.error("Retry payment error:", err);

      setError(
        err.response
          ? getErrorMessage(err)
          : err.message || "Unable to retry payment."
      );
    } finally {
      setRetryingOrderId(null);
    }
  };
    // AUTO RETRY FROM PAYMENT FAILED PAGE
  useEffect(() => {
    const retryOrderId = location.state?.retryOrderId;

    if (
      !retryOrderId ||
      loading ||
      retryStartedRef.current
    ) {
      return;
    }

    retryStartedRef.current = true;

    navigate(location.pathname, {
      replace: true,
      state: null,
    });

    handleRetryPayment(retryOrderId);

  }, [location.state, location.pathname, loading, navigate]);
  // CHECK CANCELLATION ELIGIBILITY
  const canCancelOrder = (order) =>
    ["pending", "confirmed"].includes(order.status);

  // ORDER STATUS CLASS
  const getStatusClass = (status) =>
    String(status || "pending")
      .toLowerCase()
      .replaceAll("_", "-");

    if (loading) {
    return (
      <div className="my-orders-page">
        <div className="my-orders-loading">
          Loading your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="my-orders-page">
      

      <main className="my-orders-container">
        <div className="my-orders-heading">
          <div>
            <p className="my-orders-brand">HOMENEST</p>
            <h1>My Orders</h1>
            <p>Manage and track your purchases.</p>
          </div>

          <button
            className="orders-shop-button"
            onClick={
              onContinueShopping ||
              (() => navigate("/products"))
            }
          >
            Continue Shopping
          </button>
        </div>

        {error && (
          <div className="orders-alert error" role="alert">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {success && (
          <div className="orders-alert success" role="status">
            {success}
            <button onClick={() => setSuccess("")}>×</button>
          </div>
        )}

        {/* TABS */}
        <div className="orders-tabs">
          <button
            className={activeTab === "orders" ? "active" : ""}
            onClick={() => {
              setActiveTab("orders");
              setSelectedOrder(null);
              clearMessages();
            }}
          >
            My Orders
          </button>

          <button
            className={activeTab === "returns" ? "active" : ""}
            onClick={() => {
              setActiveTab("returns");
              setSelectedOrder(null);
              clearMessages();
              loadReturnHistory();
            }}
          >
            Return History
          </button>
        </div>

        {/* ORDERS TAB */}
        {activeTab === "orders" && (
          <>
            {/* SEARCH AND FILTER */}
            <div className="orders-search-filter">

              <div className="orders-search">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) =>
                    setOrderSearch(e.target.value)
                  }
                  placeholder="Search by Order ID or Product Name..."
                  aria-label="Search by Order ID or Product Name"
                />

                {orderSearch && (
                  <button
                    type="button"
                    onClick={() => setOrderSearch("")}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="orders-payment-filter">
                <label htmlFor="paymentStatusFilter">
                  Payment Status
                </label>

                <select
                  id="paymentStatusFilter"
                  value={paymentFilter}
                  onChange={(e) =>
                    setPaymentFilter(e.target.value)
                  }
                >
                  <option value="all">All Payments</option>
                  <option value="paid">Paid / Successful</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* EMPTY STATE */}
            {filteredOrders.length === 0 ? (
              <div className="orders-empty">
                <div className="orders-empty-icon">🛍</div>

                <h2>
                  {orders.length === 0
                    ? "No Orders Yet"
                    : "No Matching Orders Found"}
                </h2>

                <p>
                  {orders.length === 0
                    ? "You haven't placed any orders. Your purchases will appear here."
                    : "No orders match your search or selected payment filter. Please try again."}
                </p>

                {orders.length === 0 ? (
                  <button
                    onClick={() => navigate("/products")}
                  >
                    Start Shopping
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setOrderSearch("");
                      setPaymentFilter("all");
                    }}
                  >
                    Clear Search & Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="orders-list">
                {filteredOrders.map((order) => (
                  <article
                    className="order-card"
                    key={order.id}
                  >
                    <div className="order-card-top">
                      <div>
                        <span className="order-label">
                          ORDER ID
                        </span>

                        <h3>#{order.id}</h3>

                        <p>
                          Placed on {formatDate(order.created_at)}
                        </p>
                      </div>

                      <span
                        className={`order-status ${getStatusClass(
                          order.status
                        )}`}
                      >
                        {String(order.status || "").replaceAll(
                          "_",
                          " "
                        )}
                      </span>
                    </div>

                    <div className="order-card-info">
                      <div>
                        <span>Items</span>

                        <strong>
                          {order.items?.length || 0}
                        </strong>
                      </div>

                      <div>
                        <span>Total Amount</span>

                        <strong>
                          {formatPrice(order.final_amount)}
                        </strong>
                      </div>

                      <div>
                        <span>Payment</span>

                        <strong>
                          {String(
                            order.payment_status || ""
                          ).replaceAll("_", " ")}
                        </strong>
                      </div>
                    </div>

                    <div className="order-card-actions">
                      {/* DOWNLOAD INVOICE */}
                      {canDownloadInvoice(order) && (
                        <button
                          className="order-details-button"
                          onClick={() =>
                            handleDownloadInvoice(order.id)
                          }
                          disabled={
                            invoiceLoadingId === order.id
                          }
                        >
                          {invoiceLoadingId === order.id
                            ? "Generating Invoice..."
                            : "Download Invoice"}
                        </button>
                      )}

                      {/* VIEW DETAILS */}
                      <button
                        className="order-details-button"
                        onClick={() =>
                          handleViewDetails(order.id)
                        }
                      >
                        View Details
                      </button>

                      {/* ORDER TRACKING */}
                      <button
                        className="order-tracking-button"
                        onClick={() =>
                          navigate(`/order-tracking/${order.id}`)
                        }
                      >
                        Track Order
                      </button>

                      {/* CANCEL ORDER */}
                      {canCancelOrder(order) && (
                        <button
                          className="order-cancel-button"
                          onClick={() => {
                            setCancelOrderId(order.id);
                            setShowCancelModal(true);
                            clearMessages();
                          }}
                        >
                          Cancel Order
                        </button>
                      )}

                      {/* RETRY PAYMENT */}
                      {order.payment_method === "razorpay" &&
                        order.payment_status === "pending" &&
                        order.status !== "cancelled" && (
                          <button
                            className="order-retry-button"
                            onClick={() =>
                              handleRetryPayment(order.id)
                            }
                            disabled={
                              retryingOrderId === order.id
                            }
                          >
                            {retryingOrderId === order.id
                              ? "Please wait..."
                              : "Retry Payment"}
                          </button>
                        )}

                      {/* RETURN REQUEST */}
                      {canReturnOrder(order) && (
                        <button
                          className="order-return-button"
                          onClick={() => handleOpenReturn(order)}
                        >
                          Request Return
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* RETURN HISTORY TAB */}
        {activeTab === "returns" && (
          <div className="return-history-section">
            <div className="return-history-heading">
                <h2>Return Requests</h2>

                <div className="return-status-filter">
                <label htmlFor="returnStatusFilter">
                    Filter Status
                </label>

                <select
                    id="returnStatusFilter"
                    value={returnFilter}
                    onChange={(e) => setReturnFilter(e.target.value)}
                >
                    <option value="all">All Requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="completed">Completed</option>
                    <option value="rejected">Rejected</option>
                </select>
                </div>
            </div>

            {filteredReturnRequests.length === 0 ? (
              <div className="orders-empty">
                <div className="orders-empty-icon">↩</div>

                <h2>
                    {returnRequests.length === 0
                        ? "No Return Requests"
                        : "No Matching Return Requests"}
                    </h2>

                    <p>
                    {returnRequests.length === 0
                        ? "Your return requests will appear here."
                        : "No return requests found for this status."}
                    </p>
              </div>
            ) : (
              <div className="return-history-list">
                {filteredReturnRequests.map((request) => (
                  <article
                    className="return-history-card"
                    key={request.id}
                  >
                    <div>
                      <span className="order-label">
                        ORDER #{request.order_id}
                      </span>

                      <h3>{request.product_name}</h3>

                      <p>
                        Requested: {formatDate(request.requested_at)}
                      </p>

                      <p>Reason: {request.reason}</p>

                      <p>
                        Quantity: {request.return_quantity}
                      </p>
                    </div>

                    <div className="return-history-right">
                      <span
                        className={`order-status ${getStatusClass(
                          request.status
                        )}`}
                      >
                        {String(request.status || "").replaceAll(
                          "_",
                          " "
                        )}
                      </span>

                      <strong>
                        Refund: {formatPrice(request.refund_amount)}
                      </strong>

                      <span>
                        Refund status:{" "}
                        {request.refund_status || "Pending"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ORDER DETAILS MODAL */}
        {selectedOrder && (
          <div
            className="orders-modal-overlay"
            onClick={() => setSelectedOrder(null)}
          >
            <div
              className="orders-modal order-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="orders-modal-heading">
                <div>
                  <p>HOMENEST</p>
                  <h2>Order #{selectedOrder.id}</h2>
                </div>

                <button
                  className="orders-modal-close"
                  onClick={() => setSelectedOrder(null)}
                >
                  ×
                </button>
              </div>

              <div className="order-details-content">
                <div className="details-status-row">
                  <span>Order Status</span>

                  <strong
                    className={`order-status ${getStatusClass(
                      selectedOrder.status
                    )}`}
                  >
                    {String(selectedOrder.status || "").replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </div>

                <h3>Products</h3>

                {(selectedOrder.items || []).map((item) => (
                  <div
                    className="details-product"
                    key={item.id}
                  >
                    <div className="details-product-placeholder">
                      HN
                    </div>

                    <div className="details-product-info">
                      <strong>{item.product_name}</strong>

                      <p>SKU: {item.sku || "N/A"}</p>
                      <p>Size: {item.size || "N/A"}</p>
                      <p>Color: {item.color || "N/A"}</p>
                      <p>Quantity: {item.quantity}</p>

                      <p>
                        Status:{" "}
                        {String(item.status || "").replaceAll(
                          "_",
                          " "
                        )}
                      </p>
                    </div>

                    <strong>
                      {formatPrice(
                        Number(item.price) *
                          Number(item.quantity)
                      )}
                    </strong>
                  </div>
                ))}

                <h3>Delivery Address</h3>

                <div className="details-address">
                  <strong>
                    {selectedOrder.shipping_full_name}
                  </strong>

                  <p>{selectedOrder.shipping_phone}</p>
                  <p>{selectedOrder.shipping_address_line}</p>

                  <p>
                    {selectedOrder.shipping_city},{" "}
                    {selectedOrder.shipping_district}
                  </p>

                  <p>
                    {selectedOrder.shipping_state} -{" "}
                    {selectedOrder.shipping_pincode}
                  </p>
                </div>

                <h3>Payment Details</h3>

                <div className="details-price-list">
                  <div>
                    <span>Product Amount</span>

                    <strong>
                      {formatPrice(selectedOrder.product_amount)}
                    </strong>
                  </div>

                  <div>
                    <span>Tax</span>

                    <strong>
                      {formatPrice(selectedOrder.tax_amount)}
                    </strong>
                  </div>

                  <div>
                    <span>Shipping</span>

                    <strong>
                      {formatPrice(selectedOrder.shipping_charge)}
                    </strong>
                  </div>

                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div>
                      <span>Discount</span>

                      <strong>
                        -{formatPrice(
                          selectedOrder.discount_amount
                        )}
                      </strong>
                    </div>
                  )}

                  <div>
                    <span>Payment Method</span>

                    <strong>
                      {getPaymentMethod(
                        selectedOrder.payment_method
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Payment Status</span>

                    <strong>
                      {selectedOrder.payment_status}
                    </strong>
                  </div>

                  <div className="details-grand-total">
                    <span>Final Amount</span>

                    <strong>
                      {formatPrice(selectedOrder.final_amount)}
                    </strong>
                  </div>
                </div>

                <div className="details-modal-actions">
                  {canCancelOrder(selectedOrder) && (
                    <button
                      className="order-cancel-button"
                      onClick={() => {
                        setCancelOrderId(selectedOrder.id);
                        setShowCancelModal(true);
                        setSelectedOrder(null);
                      }}
                    >
                      Cancel Order
                    </button>
                  )}

                  {canReturnOrder(selectedOrder) && (
                    <button
                      className="order-return-button"
                      onClick={() => {
                        const order = selectedOrder;
                        setSelectedOrder(null);
                        handleOpenReturn(order);
                      }}
                    >
                      Request Return
                    </button>
                  )}

                  <button
                    className="order-details-button"
                    onClick={() => setSelectedOrder(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CANCEL CONFIRMATION MODAL */}
        {showCancelModal && (
          <div
            className="orders-modal-overlay"
            onClick={() => {
              if (!submitting) {
                setShowCancelModal(false);
                setCancelOrderId(null);
              }
            }}
          >
            <div
              className="orders-modal confirmation-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="confirmation-icon">!</div>

              <h2>Cancel Order?</h2>

              <p>
                Are you sure you want to cancel order #
                {cancelOrderId}? This action cannot be undone.
              </p>

              <div className="confirmation-actions">
                <button
                  className="confirmation-keep-button"
                  disabled={submitting}
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelOrderId(null);
                  }}
                >
                  Keep Order
                </button>

                <button
                  className="confirmation-cancel-button"
                  disabled={submitting}
                  onClick={handleCancelOrder}
                >
                  {submitting ? "Cancelling..." : "Yes, Cancel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RETURN REQUEST MODAL */}
        {showReturnModal && returnOrder && (
          <div
            className="orders-modal-overlay"
            onClick={() => {
              if (!submitting) setShowReturnModal(false);
            }}
          >
            <div
              className="orders-modal return-request-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="orders-modal-heading">
                <div>
                  <p>HOMENEST</p>
                  <h2>Request a Return</h2>
                  <span>Order #{returnOrder.id}</span>
                </div>

                <button
                  className="orders-modal-close"
                  onClick={() => setShowReturnModal(false)}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>

              <div className="return-request-content">
                <p className="return-instruction">
                  Select the products you want to return and
                  provide the reason.
                </p>

                {returnItems.map((item) => (
                  <div
                    className="return-product-form"
                    key={item.id}
                  >
                    <label className="return-product-select">
                      <input
                        type="checkbox"
                        checked={Boolean(
                          returnForm[item.id]?.selected
                        )}
                        onChange={(e) =>
                          updateReturnForm(
                            item.id,
                            "selected",
                            e.target.checked
                          )
                        }
                      />

                      <strong>{item.product_name}</strong>
                    </label>

                    <p>Quantity ordered: {item.quantity}</p>

                    {returnForm[item.id]?.selected && (
                      <div className="return-product-fields">
                        <label>
                          Return Quantity

                          <input
                            type="number"
                            min="1"
                            max={item.quantity}
                            value={returnForm[item.id].quantity}
                            onChange={(e) =>
                              updateReturnForm(
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </label>

                        <label>
                          Reason

                          <select
                            value={returnForm[item.id].reason}
                            onChange={(e) =>
                              updateReturnForm(
                                item.id,
                                "reason",
                                e.target.value
                              )
                            }
                          >
                            <option value="Damaged product">
                              Damaged Product
                            </option>

                            <option value="Defective product">
                              Defective Product
                            </option>

                            <option value="Wrong product">
                              Wrong Product
                            </option>

                            <option value="Wrong size">
                              Wrong Size
                            </option>

                            <option value="Quality issue">
                              Quality Issue
                            </option>

                            <option value="Other">Other</option>
                          </select>
                        </label>

                        <label>
                          Additional Description (Optional)

                          <textarea
                            rows="3"
                            value={returnForm[item.id].description}
                            onChange={(e) =>
                              updateReturnForm(
                                item.id,
                                "description",
                                e.target.value
                              )
                            }
                            placeholder="Tell us more about the issue..."
                          />
                        </label>
                      </div>
                    )}
                  </div>
                ))}

                <div className="return-modal-actions">
                  <button
                    className="confirmation-keep-button"
                    disabled={submitting}
                    onClick={() => setShowReturnModal(false)}
                  >
                    Cancel
                  </button>

                  <button
                    className="order-return-button"
                    disabled={submitting}
                    onClick={handleSubmitReturn}
                  >
                    {submitting
                      ? "Submitting..."
                      : "Submit Return Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {detailsLoading && (
          <div className="orders-loading-overlay">
            Loading order details...
          </div>
        )}
      </main>
    </div>
  );
}

export default MyOrders;
