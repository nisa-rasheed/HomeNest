
import { useEffect, useState } from "react";

import axiosInstance from "../services/axiosInstance";
import Pagination from "../components/Pagination";
import "./AdminCoupons.css";

const initialForm = {
  code: "",
  description: "",
  discount_percentage: "",
  minimum_amount: "",
  maximum_discount: "",
  usage_limit: "",
  starting_date: "",
  expiry_date: "",
  is_active: true,
};

function getErrorMessage(err) {
  const data = err.response?.data;

  if (!data) {
    return err.message || "Something went wrong.";
  }

  if (typeof data === "string") return data;

  if (data.message || data.detail) {
    return data.message || data.detail;
  }

  return Object.entries(data)
    .map(([field, messages]) => {
      const message = Array.isArray(messages)
        ? messages.join(", ")
        : String(messages);

      return `${field}: ${message}`;
    })
    .join(" | ");
}

function toLocalDateTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;

  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 16);
}

function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const [totalCoupons, setTotalCoupons] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 6;

  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [formError, setFormError] = useState("");

  const [usageCoupon, setUsageCoupon] = useState(null);
  const [usages, setUsages] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  // FETCH COUPONS
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        page_size: pageSize,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== "") {
        params.is_active = statusFilter;
      }

      const response = await axiosInstance.get(
        "/api/coupons/admin/",
        { params }
      );

      setCoupons(response.data.coupons || []);
      setTotalCoupons(response.data.total_coupons || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      console.error("Coupon fetch error:", err);
      setError(getErrorMessage(err));
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCoupons, 300);

    return () => clearTimeout(timer);
  }, [search, statusFilter, page]);

  // RESET PAGE WHEN SEARCH OR FILTER CHANGES
  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  // FORM CHANGE
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // OPEN CREATE MODAL
  const openCreateModal = () => {
    setEditingCoupon(null);
    setForm(initialForm);
    setFormError("");
    setShowModal(true);
  };

  // OPEN EDIT MODAL
  const openEditModal = (coupon) => {
    setEditingCoupon(coupon);

    setForm({
      code: coupon.code || "",
      description: coupon.description || "",
      discount_percentage: coupon.discount_percentage,
      minimum_amount: coupon.minimum_amount,
      maximum_discount: coupon.maximum_discount,
      usage_limit: coupon.usage_limit ?? "",
      starting_date: toLocalDateTime(coupon.starting_date),
      expiry_date: toLocalDateTime(coupon.expiry_date),
      is_active: coupon.is_active,
    });

    setFormError("");
    setShowModal(true);
  };

  // CLOSE MODAL
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingCoupon(null);
    setForm(initialForm);
    setFormError("");
  };

  // VALIDATE FORM
  const validateForm = () => {
    if (!form.code.trim()) {
      return "Please enter coupon code.";
    }

    if (
      !form.discount_percentage ||
      Number(form.discount_percentage) <= 0 ||
      Number(form.discount_percentage) > 100
    ) {
      return "Discount percentage must be between 0.01 and 100.";
    }

    if (
      !form.minimum_amount ||
      Number(form.minimum_amount) <= 0
    ) {
      return "Minimum amount must be greater than zero.";
    }

    if (
      !form.maximum_discount ||
      Number(form.maximum_discount) <= 0
    ) {
      return "Maximum discount must be greater than zero.";
    }

    if (
      form.usage_limit !== "" &&
      (!Number.isInteger(Number(form.usage_limit)) ||
        Number(form.usage_limit) <= 0)
    ) {
      return "Usage limit must be a positive whole number.";
    }

    if (!form.starting_date || !form.expiry_date) {
      return "Please select starting and expiry dates.";
    }

    if (
      new Date(form.expiry_date) <=
      new Date(form.starting_date)
    ) {
      return "Expiry date must be after starting date.";
    }

    if (
      !editingCoupon &&
      new Date(form.starting_date) <= new Date()
    ) {
      return "Starting date must be in the future.";
    }

    return "";
  };

  // CREATE / UPDATE COUPON
  const handleSaveCoupon = async (e) => {
    e.preventDefault();

    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      description: form.description.trim(),
      discount_percentage: Number(form.discount_percentage),
      minimum_amount: Number(form.minimum_amount),
      maximum_discount: Number(form.maximum_discount),
      usage_limit:
        form.usage_limit === ""
          ? null
          : Number(form.usage_limit),
      starting_date: new Date(
        form.starting_date
      ).toISOString(),
      expiry_date: new Date(
        form.expiry_date
      ).toISOString(),
      is_active: form.is_active,
    };

    try {
      setSaving(true);

      if (editingCoupon) {
        await axiosInstance.patch(
          `/api/coupons/admin/${editingCoupon.id}/`,
          payload
        );

        setSuccess("Coupon updated successfully.");
      } else {
        await axiosInstance.post(
          "/api/coupons/admin/",
          payload
        );

        setSuccess("Coupon created successfully.");
        setPage(1);
      }

      closeModal();
      await fetchCoupons();
    } catch (err) {
      console.error("Coupon save error:", err);
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ACTIVATE / DEACTIVATE
  const handleStatusChange = async (coupon) => {
    const newStatus = !coupon.is_active;

    try {
      setActionLoading(coupon.id);
      setError("");
      setSuccess("");

      await axiosInstance.patch(
        `/api/coupons/admin/${coupon.id}/`,
        { is_active: newStatus }
      );

      setCoupons((previous) =>
        previous.map((item) =>
          item.id === coupon.id
            ? { ...item, is_active: newStatus }
            : item
        )
      );

      setSuccess(
        newStatus
          ? "Coupon activated successfully."
          : "Coupon deactivated successfully."
      );

      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  // VIEW USAGE HISTORY
  const handleViewUsages = async (coupon) => {
    setUsageCoupon(coupon);
    setUsages([]);

    try {
      setUsageLoading(true);

      const response = await axiosInstance.get(
        `/api/coupons/admin/${coupon.id}/usages/`
      );

      setUsages(response.data.usages || []);
    } catch (err) {
      setError(getErrorMessage(err));
      setUsageCoupon(null);
    } finally {
      setUsageLoading(false);
    }
  };

  // DELETE COUPON
  const handleDeleteCoupon = async (coupon) => {
    if (
      Number(coupon.used_count) > 0 ||
      Number(coupon.actual_used_count) > 0
    ) {
      setError(
        "Used coupons cannot be deleted. Deactivate instead."
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete coupon ${coupon.code}?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(coupon.id);
      setError("");

      await axiosInstance.delete(
        `/api/coupons/admin/${coupon.id}/`
      );

      setSuccess("Coupon deleted successfully.");

      // Move to previous page if current page becomes empty
      if (coupons.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        await fetchCoupons();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatAmount = (value) =>
    `₹${Number(value || 0).toFixed(2)}`;

  return (
    <div className="admin-coupons-page">

      <div className="admin-coupons-content">

        {/* HEADER */}
        <div className="admin-coupons-header">
          <div>
            <h2>Coupon Management</h2>
            <p>Manage discounts and promotional offers.</p>
          </div>

          <div className="admin-coupons-header-actions">
            <div className="admin-coupons-count">
              Total Coupons: <strong>{totalCoupons}</strong>
            </div>

            <button
              className="admin-coupon-add-btn"
              onClick={openCreateModal}
            >
              + Add Coupon
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTER */}
        <div className="admin-coupons-filters">
          <input
            type="text"
            placeholder="Search coupon code or description..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              handleStatusFilterChange(e.target.value)
            }
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {success && (
          <div className="admin-coupon-success">
            {success}
          </div>
        )}

        {error && (
          <div className="admin-coupon-error">
            {error}
          </div>
        )}

        {/* COUPON TABLE */}
        <div className="admin-coupons-table-wrapper">

          {loading ? (
            <p className="admin-coupons-message">
              Loading coupons...
            </p>
          ) : coupons.length === 0 ? (
            <p className="admin-coupons-message">
              No coupons found.
            </p>
          ) : (
            <table className="admin-coupons-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Minimum Amount</th>
                  <th>Maximum Discount</th>
                  <th>Usage</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>{coupon.id}</td>

                    <td>
                      <strong>{coupon.code}</strong>
                      <small>{coupon.description}</small>
                    </td>

                    <td>{coupon.discount_percentage}%</td>

                    <td>{formatAmount(coupon.minimum_amount)}</td>

                    <td>{formatAmount(coupon.maximum_discount)}</td>

                    <td>
                      {coupon.actual_used_count ?? coupon.used_count}
                      {" / "}
                      {coupon.usage_limit ?? "Unlimited"}
                    </td>

                    <td>
                      {formatDate(coupon.starting_date)}
                      <br />
                      to {formatDate(coupon.expiry_date)}
                    </td>

                    <td>
                      <span
                        className={
                          coupon.is_active
                            ? "admin-coupon-status active"
                            : "admin-coupon-status inactive"
                        }
                      >
                        {coupon.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="admin-coupon-actions">

                        <div className="admin-coupon-action-buttons">
                          <button
                            className="admin-coupon-edit-btn"
                            onClick={() => openEditModal(coupon)}
                            disabled={actionLoading === coupon.id}
                          >
                            Edit
                          </button>

                          <button
                            className="admin-coupon-usage-btn"
                            onClick={() => handleViewUsages(coupon)}
                            disabled={actionLoading === coupon.id}
                          >
                            Usage
                          </button>

                          <button
                            className="admin-coupon-delete-btn"
                            onClick={() => handleDeleteCoupon(coupon)}
                            disabled={
                              actionLoading === coupon.id ||
                              Number(coupon.used_count) > 0 ||
                              Number(coupon.actual_used_count) > 0
                            }
                          >
                            Delete
                          </button>
                        </div>

                        <label className="admin-coupon-toggle">
                          <input
                            type="checkbox"
                            checked={coupon.is_active}
                            disabled={actionLoading === coupon.id}
                            onChange={() => handleStatusChange(coupon)}
                          />
                          <span></span>
                        </label>

                      </div>
                    </td>
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

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div
          className="admin-coupon-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="admin-coupon-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-coupon-modal-header">
              <div>
                <h3>
                  {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                </h3>
                <p>Enter coupon details below.</p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCoupon}>
              <div className="admin-coupon-form-grid">

                <div className="admin-coupon-form-group">
                  <label>Coupon Code *</label>
                  <input
                    name="code"
                    value={form.code}
                    onChange={handleFormChange}
                    placeholder="Example: WELCOME15"
                    required
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Discount Percentage *</label>
                  <input
                    type="number"
                    name="discount_percentage"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={form.discount_percentage}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="admin-coupon-form-group full">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="Enter coupon description"
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Minimum Amount (₹) *</label>
                  <input
                    type="number"
                    name="minimum_amount"
                    min="0.01"
                    step="0.01"
                    value={form.minimum_amount}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Maximum Discount (₹) *</label>
                  <input
                    type="number"
                    name="maximum_discount"
                    min="0.01"
                    step="0.01"
                    value={form.maximum_discount}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Usage Limit</label>
                  <input
                    type="number"
                    name="usage_limit"
                    min="1"
                    step="1"
                    value={form.usage_limit}
                    onChange={handleFormChange}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Starting Date *</label>
                  <input
                    type="datetime-local"
                    name="starting_date"
                    value={form.starting_date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

                <div className="admin-coupon-form-group">
                  <label>Expiry Date *</label>
                  <input
                    type="datetime-local"
                    name="expiry_date"
                    value={form.expiry_date}
                    onChange={handleFormChange}
                    required
                  />
                </div>

              </div>

              <label className="admin-coupon-active-option">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleFormChange}
                />
                Active Coupon
              </label>

              {formError && (
                <div className="admin-coupon-error">
                  {formError}
                </div>
              )}

              <div className="admin-coupon-modal-actions">
                <button
                  type="button"
                  className="admin-coupon-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-coupon-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingCoupon
                    ? "Update Coupon"
                    : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USAGE HISTORY MODAL */}
      {usageCoupon && (
        <div
          className="admin-coupon-modal-overlay"
          onClick={() => setUsageCoupon(null)}
        >
          <div
            className="admin-coupon-modal admin-coupon-usage-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-coupon-modal-header">
              <div>
                <h3>{usageCoupon.code} - Usage History</h3>
                <p>Customers who used this coupon.</p>
              </div>

              <button onClick={() => setUsageCoupon(null)}>
                ×
              </button>
            </div>

            {usageLoading ? (
              <p className="admin-coupons-message">
                Loading usage history...
              </p>
            ) : usages.length === 0 ? (
              <p className="admin-coupons-message">
                No customers have used this coupon yet.
              </p>
            ) : (
              <div className="admin-coupons-table-wrapper">
                <table className="admin-coupons-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Order ID</th>
                      <th>Used Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {usages.map((usage) => (
                      <tr key={usage.id}>
                        <td>{usage.customer_name || "-"}</td>
                        <td>{usage.customer_email}</td>
                        <td>{usage.order_id ?? "-"}</td>
                        <td>{formatDate(usage.used_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminCoupons;
