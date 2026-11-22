
import { useEffect, useState } from "react";

import {
  Package,
  Users,
  ShoppingBag,
  IndianRupee,
  Clock,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ShoppingCart,
  CalendarDays,
  FileDown,
  Wallet,
  CircleDollarSign,
  Boxes,
  CheckCircle,
  XCircle,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import axiosInstance from "../services/axiosInstance";
import "./AdminDashboard.css";


function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Revenue analytics
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  // Custom date range
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customRevenue, setCustomRevenue] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);
  const [customError, setCustomError] = useState("");

  // PDF report
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [pdfError, setPdfError] = useState("");


  // --------------------------------
  // FORMAT HELPERS
  // --------------------------------

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  };


  const formatNumber = (value) => {
    return Number(value || 0).toLocaleString("en-IN");
  };


  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };


  const formatStatus = (status) => {
    if (!status) return "-";

    return status
      .split("_")
      .map((word) =>
        word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(" ");
  };


  // --------------------------------
  // FETCH DASHBOARD DATA
  // --------------------------------

  const fetchDashboardStats = async (
    period = selectedPeriod,
    isRefresh = false,
    dates = {}
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!dashboardData) {
        setLoading(true);
      }

      const params = {
        period,
        ...dates,
      };

      const response = await axiosInstance.get(
        "/api/admin/dashboard-stats/",
        { params }
      );

      setDashboardData(response.data);
      setError("");

      if (dates.start_date && dates.end_date) {
        setCustomRevenue(response.data.custom_revenue);
      }

    } catch (err) {
      console.error("Dashboard API Error:", err);

      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Unable to load dashboard statistics."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    fetchDashboardStats("monthly");
  }, []);


  // --------------------------------
  // REVENUE PERIOD CHANGE
  // --------------------------------

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
    fetchDashboardStats(period);
  };


  // --------------------------------
  // CUSTOM DATE RANGE
  // --------------------------------

  const handleCustomRevenue = async () => {
    setCustomError("");
    setCustomRevenue(null);

    if (!startDate || !endDate) {
      setCustomError("Please select both start date and end date.");
      return;
    }

    if (startDate > endDate) {
      setCustomError("Start date cannot be after end date.");
      return;
    }

    try {
      setCustomLoading(true);

      const response = await axiosInstance.get(
        "/api/admin/dashboard-stats/",
        {
          params: {
            period: selectedPeriod,
            start_date: startDate,
            end_date: endDate,
          },
        }
      );

      setDashboardData(response.data);
      setCustomRevenue(response.data.custom_revenue);
      setError("");

    } catch (err) {
      setCustomError(
        err.response?.data?.message ||
        "Unable to load custom revenue."
      );

    } finally {
      setCustomLoading(false);
    }
  };


  // --------------------------------
  // PDF SALES REPORT DOWNLOAD
  // --------------------------------

  const handleDownloadPDF = async () => {
    setPdfError("");

    if ((startDate && !endDate) || (!startDate && endDate)) {
      setPdfError("Select both dates or clear both dates.");
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      setPdfError("Start date cannot be after end date.");
      return;
    }

    try {
      setDownloadingPDF(true);

      const params = {};

      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }

      const response = await axiosInstance.get(
        "/api/admin/sales-report/pdf/",
        {
          params,
          responseType: "blob",
        }
      );

      const fileURL = window.URL.createObjectURL(
        new Blob([response.data], {
          type: "application/pdf",
        })
      );

      const link = document.createElement("a");

      link.href = fileURL;
      link.download = "HomeNest-Sales-Report.pdf";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(fileURL);

    } catch (err) {
      console.error("PDF Download Error:", err);
      setPdfError("Unable to download the sales report.");

    } finally {
      setDownloadingPDF(false);
    }
  };


  // --------------------------------
  // STATISTICS CARDS
  // --------------------------------

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(dashboardData?.total_revenue),
      description: "Revenue from paid orders",
      icon: IndianRupee,
      style: "revenue",
    },
    {
      title: "Total Orders",
      value: formatNumber(dashboardData?.total_orders),
      description: "All customer orders",
      icon: ShoppingBag,
      style: "orders",
    },
    {
      title: "Pending Orders",
      value: formatNumber(dashboardData?.pending_orders),
      description: "Orders awaiting processing",
      icon: Clock,
      style: "pending",
    },
    {
      title: "Total Customers",
      value: formatNumber(dashboardData?.total_customers),
      description: "Registered customers",
      icon: Users,
      style: "customers",
    },
    {
      title: "Total Products",
      value: formatNumber(dashboardData?.total_products),
      description: "Active store products",
      icon: Package,
      style: "products",
    },
    {
      title: "Pending Returns",
      value: formatNumber(dashboardData?.pending_return_requests),
      description: "Return requests awaiting review",
      icon: RotateCcw,
      style: "returns",
    },
  ];


  // --------------------------------
  // LOADING
  // --------------------------------

  if (loading && !dashboardData) {
    return (
      <>
        <header className="admin-topbar">
          <div>
            <p className="admin-welcome">WELCOME BACK</p>
            <h2>Admin Dashboard</h2>
          </div>

          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <section className="admin-dashboard-content">
          <p className="dashboard-message">
            Loading dashboard...
          </p>
        </section>
      </>
    );
  }


  // --------------------------------
  // ERROR
  // --------------------------------

  if (error && !dashboardData) {
    return (
      <>
        <header className="admin-topbar">
          <div>
            <p className="admin-welcome">WELCOME BACK</p>
            <h2>Admin Dashboard</h2>
          </div>

          <div className="admin-profile">
            <div className="admin-avatar">A</div>
            <div>
              <strong>Administrator</strong>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <section className="admin-dashboard-content">
          <p className="dashboard-error">{error}</p>

          <button
            className="dashboard-refresh-btn"
            onClick={() => fetchDashboardStats(selectedPeriod, true)}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </section>
      </>
    );
  }


  // --------------------------------
  // MAIN DASHBOARD
  // --------------------------------

  return (
    <>
      {/* TOPBAR */}

      <header className="admin-topbar">
        <div>
          <p className="admin-welcome">WELCOME BACK</p>
          <h2>Admin Dashboard</h2>
        </div>

        <div className="admin-profile">
          <div className="admin-avatar">A</div>

          <div>
            <strong>Administrator</strong>
            <span>Admin</span>
          </div>
        </div>
      </header>


      <section className="admin-dashboard-content">

        {/* PAGE HEADING */}

        <div className="admin-page-heading dashboard-main-heading">
          <div>
            <h1>Dashboard Overview</h1>
            <p>
              Monitor your HomeNest store performance and activities.
            </p>
          </div>

          <button
            className="dashboard-refresh-btn"
            onClick={() => fetchDashboardStats(selectedPeriod, true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "refresh-spinning" : ""}
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>


        {/* STATISTICS CARDS */}

        <div className="admin-stats-grid dashboard-stats-grid">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                className="admin-stat-card dashboard-stat-card"
                key={item.title}
              >
                <div className={`admin-stat-icon ${item.style}`}>
                  <Icon size={22} />
                </div>

                <p>{item.title}</p>
                <h2>{item.value}</h2>
                <span>{item.description}</span>
              </div>
            );
          })}
        </div>


        {/* REVENUE ANALYTICS */}

        <section className="dashboard-panel revenue-analytics-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Revenue Analytics</h2>
              <p>Track your store revenue performance</p>
            </div>

            <TrendingUp size={22} color="#174D3A" />
          </div>


          <div className="revenue-period-controls">
            {["weekly", "monthly", "yearly"].map((period) => (
              <button
                key={period}
                className={
                  selectedPeriod === period
                    ? "revenue-period-btn active"
                    : "revenue-period-btn"
                }
                onClick={() => handlePeriodChange(period)}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>


          <div className="dashboard-chart-label">
            <span></span>
            Revenue
          </div>


          <div className="monthly-chart">

            {dashboardData?.revenue_analytics?.data?.length > 0 ? (

              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dashboardData.revenue_analytics.data}
                  margin={{
                    top: 15,
                    right: 20,
                    left: 5,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#EAEDE9"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#858C85", fontSize: 12 }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#858C85", fontSize: 11 }}
                    tickFormatter={(value) =>
                      `₹${Number(value).toLocaleString("en-IN")}`
                    }
                    width={85}
                  />

                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(value),
                      "Revenue",
                    ]}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #EAE8DF",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#174D3A"
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#D6B879",
                      stroke: "#174D3A",
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>

            ) : (
              <p className="dashboard-message">
                No revenue data available.
              </p>
            )}

          </div>

        </section>


        {/* CUSTOM DATE RANGE */}

        <section className="dashboard-panel custom-revenue-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Custom Date Range Report</h2>
              <p>View revenue between selected dates</p>
            </div>

            <CalendarDays size={22} color="#174D3A" />
          </div>


          <div className="custom-revenue-controls">

            <div className="custom-date-field">
              <label htmlFor="revenue-start-date">
                Start Date
              </label>

              <input
                id="revenue-start-date"
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>


            <div className="custom-date-field">
              <label htmlFor="revenue-end-date">
                End Date
              </label>

              <input
                id="revenue-end-date"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>


            <button
              className="dashboard-action-btn"
              onClick={handleCustomRevenue}
              disabled={customLoading}
            >
              {customLoading ? "Loading..." : "Generate Report"}
            </button>

          </div>


          {customError && (
            <p className="dashboard-error">
              {customError}
            </p>
          )}


          {customRevenue && (
            <div className="custom-revenue-result">

              <div>
                <span>Selected Period</span>
                <strong>
                  {formatDate(customRevenue.start_date)}
                  {" - "}
                  {formatDate(customRevenue.end_date)}
                </strong>
              </div>

              <div>
                <span>Total Revenue</span>
                <strong>
                  {formatCurrency(customRevenue.total_revenue)}
                </strong>
              </div>

              <div>
                <span>Paid Orders</span>
                <strong>
                  {formatNumber(customRevenue.total_orders)}
                </strong>
              </div>

            </div>
          )}

        </section>


        {/* PDF SALES REPORT */}

        <section className="dashboard-panel pdf-report-panel">

          <div className="pdf-report-info">
            <div className="pdf-report-icon">
              <FileDown size={23} />
            </div>

            <div>
              <h2>Sales Report</h2>
              <p>
                Download your HomeNest sales report as a PDF.
                Select dates above for a custom-period report,
                or leave them empty for the full report.
              </p>
            </div>
          </div>


          <button
            className="dashboard-action-btn pdf-download-btn"
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
          >
            <FileDown size={17} />
            {downloadingPDF ? "Preparing PDF..." : "Download PDF"}
          </button>


          {pdfError && (
            <p className="dashboard-error">
              {pdfError}
            </p>
          )}

        </section>


        {/* ORDERS OVERVIEW */}

        <section className="dashboard-panel orders-overview-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Orders Overview</h2>
              <p>Current order status summary</p>
            </div>

            <ShoppingCart size={22} color="#174D3A" />
          </div>


          <div className="orders-overview-grid">

            {dashboardData?.orders_overview?.map((item) => (

              <div
                className="order-status-item"
                key={item.status}
              >
                <div className="order-status-top">
                  <span
                    className={`order-status-dot ${item.status}`}
                  ></span>

                  <span>{item.label}</span>
                </div>

                <strong>{formatNumber(item.count)}</strong>

                <small>
                  {formatCurrency(item.total_amount)}
                </small>
              </div>

            ))}

          </div>

        </section>


        {/* PAYMENT ANALYTICS */}

        <section className="dashboard-panel payment-analytics-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Payment Analytics</h2>
              <p>Payment method and transaction summary</p>
            </div>

            <Wallet size={22} color="#174D3A" />
          </div>


          <div className="analytics-table-wrapper">
            <table className="dashboard-table analytics-table">

              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Total Orders</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Failed</th>
                  <th>Refunded</th>
                  <th>Paid Revenue</th>
                </tr>
              </thead>


              <tbody>
                {dashboardData?.payment_analytics?.length > 0 ? (

                  dashboardData.payment_analytics.map((payment) => (

                    <tr key={payment.payment_method}>
                      <td>{payment.label}</td>
                      <td>{formatNumber(payment.total_orders)}</td>
                      <td>{formatNumber(payment.paid_orders)}</td>
                      <td>{formatNumber(payment.pending_orders)}</td>
                      <td>{formatNumber(payment.failed_orders)}</td>
                      <td>{formatNumber(payment.refunded_orders)}</td>
                      <td className="dashboard-order-amount">
                        {formatCurrency(payment.paid_revenue)}
                      </td>
                    </tr>

                  ))

                ) : (
                  <tr>
                    <td colSpan="7">No payment data available.</td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

        </section>


        {/* RETURN AND REFUND ANALYTICS */}

        <section className="dashboard-panel return-analytics-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Return & Refund Analytics</h2>
              <p>Return request status and refund summary</p>
            </div>

            <RotateCcw size={22} color="#174D3A" />
          </div>


          <div className="analytics-summary-grid">

            <div className="analytics-summary-card">
              <span>Total Return Requests</span>
              <strong>
                {formatNumber(dashboardData?.total_return_requests)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Total Refund Amount</span>
              <strong>
                {formatCurrency(dashboardData?.total_refund_amount)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Completed Refunds</span>
              <strong>
                {formatCurrency(dashboardData?.completed_refund_amount)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Pending Refunds</span>
              <strong>
                {formatCurrency(dashboardData?.pending_refund_amount)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Failed Refunds</span>
              <strong>
                {formatNumber(dashboardData?.failed_refund_count)}
              </strong>
            </div>

          </div>


          <div className="analytics-table-wrapper">
            <table className="dashboard-table analytics-table">

              <thead>
                <tr>
                  <th>Return Status</th>
                  <th>Total Requests</th>
                  <th>Refund Amount</th>
                </tr>
              </thead>

              <tbody>
                {dashboardData?.return_analytics?.length > 0 ? (

                  dashboardData.return_analytics.map((item) => (

                    <tr key={item.status}>
                      <td>{item.label}</td>
                      <td>{formatNumber(item.total_requests)}</td>
                      <td className="dashboard-order-amount">
                        {formatCurrency(item.total_refund_amount)}
                      </td>
                    </tr>

                  ))

                ) : (
                  <tr>
                    <td colSpan="3">No return data available.</td>
                  </tr>
                )}
              </tbody>

            </table>
          </div>

        </section>


        {/* INVENTORY ANALYTICS */}

        <section className="dashboard-panel inventory-analytics-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Inventory Analytics</h2>
              <p>Current inventory and stock value summary</p>
            </div>

            <Boxes size={22} color="#174D3A" />
          </div>


          <div className="analytics-summary-grid">

            <div className="analytics-summary-card">
              <span>Total Variants</span>
              <strong>
                {formatNumber(dashboardData?.total_variants)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Low Stock Variants</span>
              <strong className="analytics-warning">
                {formatNumber(dashboardData?.low_stock_variants)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Out of Stock</span>
              <strong className="analytics-danger">
                {formatNumber(dashboardData?.out_of_stock_variants)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Total Stock Quantity</span>
              <strong>
                {formatNumber(dashboardData?.total_inventory_stock)}
              </strong>
            </div>

            <div className="analytics-summary-card">
              <span>Inventory Stock Value</span>
              <strong>
                {formatCurrency(dashboardData?.inventory_stock_value)}
              </strong>
            </div>

          </div>

        </section>


        {/* TOP SELLING PRODUCTS AND LOW STOCK PRODUCTS */}

        <div className="dashboard-two-column">

          {/* TOP SELLING PRODUCTS */}

          <section className="dashboard-panel">

            <div className="dashboard-section-heading">
              <div>
                <h2>Top Selling Products</h2>
                <p>Products with highest sales quantity</p>
              </div>

              <TrendingUp size={22} color="#174D3A" />
            </div>


            {dashboardData?.top_selling_products?.length > 0 ? (

              <div className="dashboard-list">

                {dashboardData.top_selling_products.map(
                  (product, index) => (

                    <div
                      className="dashboard-list-item"
                      key={`${product.product_name}-${index}`}
                    >

                      <div className="dashboard-rank">
                        {index + 1}
                      </div>

                      <div className="dashboard-list-info">
                        <strong>{product.product_name}</strong>

                        <span>
                          {formatCurrency(product.total_revenue)}
                        </span>

                        <span>
                          {formatNumber(product.total_orders)} orders
                        </span>
                      </div>

                      <div className="dashboard-list-value">
                        {formatNumber(product.total_quantity)}
                        <span>Sold</span>
                      </div>

                    </div>

                  )
                )}

              </div>

            ) : (
              <p className="dashboard-message">
                No sales found.
              </p>
            )}

          </section>


          {/* LOW STOCK PRODUCTS */}

          <section className="dashboard-panel">

            <div className="dashboard-section-heading">
              <div>
                <h2>Low Stock Products</h2>
                <p>
                  {formatNumber(dashboardData?.total_low_stock_variants)}
                  {" "}variants need attention
                </p>
              </div>

              <AlertTriangle size={22} color="#B7791F" />
            </div>


            {dashboardData?.low_stock_products?.length > 0 ? (

              <div className="dashboard-list">

                {dashboardData.low_stock_products.map(
                  (product, index) => (

                    <div
                      className="dashboard-list-item"
                      key={`${product.sku}-${index}`}
                    >

                      <div className="low-stock-icon">
                        <Package size={19} />
                      </div>

                      <div className="dashboard-list-info">
                        <strong>{product.product_name}</strong>
                        <span>{product.sku}</span>
                      </div>

                      <div
                        className={`stock-count ${
                          product.stock <= 2 ? "critical-stock" : ""
                        }`}
                      >
                        {product.stock} left
                      </div>

                    </div>

                  )
                )}

              </div>

            ) : (
              <p className="dashboard-message">
                All products have sufficient stock.
              </p>
            )}

          </section>

        </div>


        {/* RECENT ORDERS */}

        <section className="dashboard-panel recent-orders-panel">

          <div className="dashboard-section-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>Latest customer orders</p>
            </div>

            <span className="dashboard-record-count">
              {dashboardData?.recent_orders?.length ?? 0} Recent
            </span>
          </div>


          {dashboardData?.recent_orders?.length > 0 ? (

            <div className="dashboard-table-wrapper">

              <table className="dashboard-table">

                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>


                <tbody>

                  {dashboardData.recent_orders.map((order) => (

                    <tr key={order.id}>

                      <td className="dashboard-order-id">
                        #{order.id}
                      </td>

                      <td>
                        <div className="dashboard-customer">
                          <strong>{order.customer_name}</strong>
                          <span>{order.customer_email}</span>
                        </div>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td className="dashboard-order-amount">
                        {formatCurrency(order.final_amount)}
                      </td>

                      <td>
                        <span
                          className={`dashboard-status-badge payment-${order.payment_status}`}
                        >
                          {formatStatus(order.payment_status)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`dashboard-status-badge order-${order.status}`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          ) : (
            <p className="dashboard-message">
              No recent orders found.
            </p>
          )}

        </section>


        {/* RECENTLY ADDED PRODUCTS */}

        <section className="recent-products-section">

          <div className="recent-products-heading">

            <div>
              <h2>Recently Added Products</h2>
              <p>Latest products added to your store.</p>
            </div>

            <button
              onClick={() =>
                window.location.assign("/admin-products")
              }
              className="recent-products-view"
            >
              View Products
              <ArrowUpRight size={15} />
            </button>

          </div>


          {dashboardData?.recent_products?.length > 0 ? (

            <div className="recent-products-list">

              {dashboardData.recent_products.map((product) => (

                <div
                  className="recent-product-item"
                  key={product.id}
                >

                  <div className="recent-product-icon">
                    <Package size={22} />
                  </div>

                  <div className="recent-product-info">
                    <h3>{product.name}</h3>
                    <p>{product.category}</p>
                  </div>

                  <span className="recent-product-date">
                    {formatDate(product.created_at)}
                  </span>

                </div>

              ))}

            </div>

          ) : (
            <p className="dashboard-message">
              No products found.
            </p>
          )}

        </section>

      </section>
    </>
  );
}

export default AdminDashboard;
