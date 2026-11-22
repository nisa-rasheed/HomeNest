import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminCategories.css";
import Pagination from "../components/Pagination";

const API_URL = "/products/admin/categories/";
const PAGE_SIZE = 6;

const initialForm = {
  name: "",
  description: "",
  is_active: true,
};

function AdminCategories() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (!data) return err.message || "Something went wrong.";
    if (typeof data === "string") return data;
    if (data.detail || data.message) return data.detail || data.message;

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : messages;

        return `${field}: ${message}`;
      })
      .join(" | ");
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(API_URL);
      const data = response.data;

      setCategories(
        Array.isArray(data)
          ? data
          : data.categories || data.results || []
      );
    } catch (err) {
      console.error("Category fetch error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
  const handleStatusChange = async (category) => {
  const newStatus = !category.is_active;

  try {
    setActionLoading(category.id);
    setError("");

    await axiosInstance.patch(
      `${API_URL}${category.id}/status/`,
      { is_active: newStatus }
    );

    setCategories((previous) =>
      previous.map((item) =>
        item.id === category.id
          ? { ...item, is_active: newStatus }
          : item
      )
    );

  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setActionLoading(null);
  }
};

  useEffect(() => {
    fetchCategories();
  }, []);

  const totalCategories = categories.length;
  const activeCategories = categories.filter(
    (item) => item.is_active
  ).length;
  const inactiveCategories = totalCategories - activeCategories;

  const filteredCategories = useMemo(() => {
    return categories.filter((item) => {
      const searchMatch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase());

      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "active" && item.is_active) ||
        (statusFilter === "inactive" && !item.is_active);

      return searchMatch && statusMatch;
    });
  }, [categories, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCategories.length / PAGE_SIZE)
  );

  const currentCategories = filteredCategories.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) return imagePath;

    const baseURL =
      axiosInstance.defaults.baseURL || "http://127.0.0.1:8000";

    return `${baseURL.replace(/\/$/, "")}/${imagePath.replace(/^\//, "")}`;
  };

  const openAddModal = () => {
    setForm(initialForm);
    setImage(null);
    setImagePreview("");
    setFormError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setForm(initialForm);
    setImage(null);
    setImagePreview("");
    setFormError("");
  };

  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setFormError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setFormError("Image size cannot exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setFormError("");
    setImage(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    if (!form.name.trim()) {
      setFormError("Please enter category name.");
      return;
    }

    if (form.name.trim().length > 100) {
      setFormError("Category name cannot exceed 100 characters.");
      return;
    }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("is_active", String(form.is_active));

    if (image) formData.append("image", image);

    try {
      setSaving(true);

      await axiosInstance.post(API_URL, formData);

      setSuccess("Category created successfully.");
      setShowModal(false);
      setForm(initialForm);
      setImage(null);
      setImagePreview("");

      await fetchCategories();
    } catch (err) {
      console.error("Category create error:", err);
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  
return (
  <div className="admin-categories-page">

    <div className="admin-categories-content">

      {/* HEADER */}
      <div className="admin-categories-header">
        <div>
          <h2>Category Management</h2>
          <p>Manage your product categories here.</p>
        </div>

        <button
          type="button"
          className="admin-category-add-btn"
          onClick={openAddModal}
        >
          + Add Category
        </button>
      </div>

      {/* SUMMARY */}
      <div className="admin-category-summary">
        <div className="admin-category-summary-card">
          <span>Total Categories</span>
          <strong>{totalCategories}</strong>
        </div>

        <div className="admin-category-summary-card">
          <span>Active Categories</span>
          <strong className="category-count-active">
            {activeCategories}
          </strong>
        </div>

        <div className="admin-category-summary-card">
          <span>Inactive Categories</span>
          <strong className="category-count-inactive">
            {inactiveCategories}
          </strong>
        </div>
      </div>

      {/* FILTERS */}
      <div className="admin-category-filters">
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">All Categories</option>
          <option value="active">Active Categories</option>
          <option value="inactive">Inactive Categories</option>
        </select>

        <button
          type="button"
          className="admin-category-reset-btn"
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setPage(1);
          }}
        >
          Reset
        </button>
      </div>

      {/* SUCCESS MESSAGE */}
      {success && (
        <div className="admin-category-success">
          {success}
        </div>
      )}

      {/* ERROR MESSAGE */}
      {error && (
        <div className="admin-category-error">
          {error}
          <button type="button" onClick={fetchCategories}>
            Retry
          </button>
        </div>
      )}

      {/* CATEGORY TABLE */}
      <div className="admin-category-table-wrapper">
        {loading ? (
          <p className="admin-category-message">
            Loading categories...
          </p>
        ) : currentCategories.length === 0 ? (
          <p className="admin-category-message">
            No categories found.
          </p>
        ) : (
          <table className="admin-category-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Category Name</th>
                <th>Description</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {currentCategories.map((category) => (
                <tr
                  key={category.id}
                  className="admin-category-clickable-row"
                  onClick={() =>
                    navigate(`/admin-categories/${category.id}`)
                  }
                  title="View category details"
                >
                  <td>{category.id}</td>

                  <td>
                    {category.image ? (
                      <img
                        className="admin-category-image"
                        src={getImageUrl(category.image)}
                        alt={category.name}
                      />
                    ) : (
                      <div className="admin-category-no-image">
                        No Image
                      </div>
                    )}
                  </td>

                  <td>
                    <strong className="admin-category-name">
                      {category.name}
                    </strong>
                  </td>

                  <td className="admin-category-description">
                    {category.description || "-"}
                  </td>

                  <td>
                    <span
                      className={`admin-category-status ${
                        category.is_active ? "active" : "inactive"
                      }`}
                    >
                      {category.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td>
                    <label
                      className="admin-category-toggle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={category.is_active}
                        disabled={actionLoading === category.id}
                        onChange={() => handleStatusChange(category)}
                      />
                      <span className="admin-category-toggle-slider"></span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>

    {/* FIXED BOTTOM PAGINATION */}
    {!loading && (
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    )}

    {/* ADD CATEGORY MODAL */}
    {showModal && (
      <div
        className="admin-category-modal-overlay"
        onClick={closeModal}
      >
        <div
          className="admin-category-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="admin-category-modal-header">
            <div>
              <h3>Add New Category</h3>
              <p>Enter the details for your new category.</p>
            </div>

            <button
              type="button"
              className="admin-category-modal-close"
              onClick={closeModal}
              disabled={saving}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSaveCategory}>
            <div className="admin-category-form-group">
              <label>Category Name *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
                placeholder="Example: Kitchen Storage"
                maxLength={100}
                required
              />
            </div>

            <div className="admin-category-form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                placeholder="Enter category description"
                rows={4}
              />
            </div>

            <div className="admin-category-form-group">
              <label>Category Image</label>

              <label className="admin-category-file-label">
                + Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={saving}
                />
              </label>

              <p className="admin-category-image-hint">
                Maximum image size: 5 MB.
              </p>

              {imagePreview && (
                <div className="admin-category-image-preview">
                  <img
                    src={imagePreview}
                    alt="Category preview"
                  />
                  <span>{image?.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setImage(null);
                      setImagePreview("");
                    }}
                  >
                    Remove image
                  </button>
                </div>
              )}
            </div>

            <label className="admin-category-active-option">
              <input
                type="checkbox"
                name="is_active"
                checked={form.is_active}
                onChange={handleFormChange}
              />
              Active Category
            </label>

            {formError && (
              <div className="admin-category-form-error">
                {formError}
              </div>
            )}

            <div className="admin-category-modal-actions">
              <button
                type="button"
                className="admin-category-cancel-btn"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-category-save-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Create Category"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

  </div>
);

}

export default AdminCategories;
