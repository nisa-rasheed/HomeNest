
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminCategories.css";

const API_URL = "/products/admin/categories/";

function AdminCategoryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  

  const [form, setForm] = useState({
    name: "",
    description: "",
    
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (!data) return err.message || "Something went wrong.";

    if (typeof data === "string") return data;

    if (data.detail || data.message) {
      return data.detail || data.message;
    }

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : messages;

        return `${field}: ${message}`;
      })
      .join(" | ");
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";

    if (imagePath.startsWith("http")) return imagePath;

    const baseURL =
      axiosInstance.defaults.baseURL || "http://127.0.0.1:8000";

    return `${baseURL.replace(/\/$/, "")}/${imagePath.replace(/^\//, "")}`;
  };

  // FETCH CATEGORY DETAILS
  const fetchCategory = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(`${API_URL}${id}/`);

      setCategory(response.data);

      setForm({
        name: response.data.name || "",
        description: response.data.description || "",
        
      });

      setImage(null);
      setImagePreview("");
    } catch (err) {
      console.error("Category details error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategory();
  }, [id]);

  // FORM CHANGE
  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // IMAGE CHANGE
  const handleImageChange = (e) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("Image size cannot exceed 5 MB.");
      e.target.value = "";
      return;
    }

    setError("");
    setImage(selectedFile);
    setImagePreview(URL.createObjectURL(selectedFile));
  };

  // CANCEL EDIT
  const handleCancelEdit = () => {
    setEditing(false);
    setImage(null);
    setImagePreview("");

    setForm({
      name: category.name || "",
      description: category.description || "",
      
    });

    setError("");
  };

  // UPDATE CATEGORY
  const handleUpdateCategory = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please enter category name.");
      return;
    }

    if (form.name.trim().length > 100) {
      setError("Category name cannot exceed 100 characters.");
      return;
    }

    const formData = new FormData();

    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    

    if (image) {
      formData.append("image", image);
    }

    try {
      setSaving(true);

      const response = await axiosInstance.patch(
        `${API_URL}${id}/`,
        formData
      );

      setCategory(response.data.category);

      setForm({
        name: response.data.category.name || "",
        description: response.data.category.description || "",
        
      });

      setImage(null);
      setImagePreview("");
      setEditing(false);

      
    } catch (err) {
      console.error("Category update error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  
  // DELETE CATEGORY
  const handleDeleteCategory = async () => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${category.name}"?`
  );

  if (!confirmed) return;

  try {
    setError("");

    const response = await axiosInstance.delete(
      `${API_URL}${id}/`
    );

    navigate("/admin-categories", {
      replace: true,
      state: {
        success: response.data.message,
      },
    });
  } catch (err) {
    setError(getErrorMessage(err));
  }
};

  if (loading) {
    return (
      <div className="admin-category-message">
        Loading category details...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="admin-category-details-page">
        <p className="admin-category-error">
          {error || "Category not found."}
        </p>

        <button
          type="button"
          className="admin-category-back-btn"
          onClick={() => navigate("/admin-categories")}
        >
          Back to Categories
        </button>
      </div>
    );
  }

  return (
    <div className="admin-category-details-page">

      <button
        type="button"
        className="admin-category-back-btn"
        onClick={() => navigate("/admin-categories")}
      >
        ← Back to Categories
      </button>

      <div className="admin-category-details-header">
        <div>
          <h2>Category Details</h2>
          <p>View and manage category information.</p>
        </div>
      </div>

      {success && (
        <div className="admin-category-success">
          {success}
        </div>
      )}

      {error && (
        <div className="admin-category-error">
          {error}
        </div>
      )}

      {!editing ? (
        <div className="admin-category-details-card">

          <div className="admin-category-details-top">

            {category.image ? (
              <img
                className="admin-category-details-image"
                src={getImageUrl(category.image)}
                alt={category.name}
              />
            ) : (
              <div className="admin-category-details-no-image">
                No Image
              </div>
            )}

            <div className="admin-category-details-title">
              <h3>{category.name}</h3>

              <span
                className={`admin-category-status ${
                  category.is_active ? "active" : "inactive"
                }`}
              >
                {category.is_active ? "Active" : "Inactive"}
              </span>
            </div>

          </div>

          <div className="admin-category-details-info">

            <div>
              <span>Category ID</span>
              <strong>{category.id}</strong>
            </div>

            <div>
              <span>Category Name</span>
              <strong>{category.name}</strong>
            </div>

            <div>
              <span>Slug</span>
              <strong>{category.slug || "-"}</strong>
            </div>

            <div>
              <span>Description</span>
              <strong>
                {category.description || "No description available."}
              </strong>
            </div>

            <div>
              <span>Created At</span>
              <strong>
                {category.created_at
                  ? new Date(category.created_at).toLocaleString()
                  : "-"}
              </strong>
            </div>

            <div>
              <span>Last Updated</span>
              <strong>
                {category.updated_at
                  ? new Date(category.updated_at).toLocaleString()
                  : "-"}
              </strong>
            </div>

          </div>

          <div className="admin-category-details-actions">

  <button
    type="button"
    className="admin-category-save-btn"
    onClick={() => setEditing(true)}
  >
    Edit Category
  </button>

  <button
    type="button"
    className="admin-category-delete-btn"
    onClick={handleDeleteCategory}
  >
    Delete Category
  </button>

</div>
        </div>
      ) : (

        <div className="admin-category-details-card">

          <h3>Edit Category</h3>

          <form onSubmit={handleUpdateCategory}>

            <div className="admin-category-form-group">
              <label>Category Name *</label>

              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleFormChange}
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

              {imagePreview ? (
                <div className="admin-category-image-preview">
                  <img src={imagePreview} alt="New category preview" />
                </div>
              ) : category.image ? (
                <div className="admin-category-image-preview">
                  <img
                    src={getImageUrl(category.image)}
                    alt={category.name}
                  />
                  <span>Current image</span>
                </div>
              ) : null}
            </div>

            

            <div className="admin-category-modal-actions">

              <button
                type="button"
                className="admin-category-cancel-btn"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="admin-category-save-btn"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

            </div>

          </form>
        </div>
      )}

    </div>
  );
}

export default AdminCategoryDetails;
