
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Layers,
  Palette,
  Tag,
  Warehouse,
  Image as ImageIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import axiosInstance from "../services/axiosInstance";
import "./AdminProductDetails.css";

const initialProductForm = {
  name: "",
  description: "",
  category: "",
  rooms: [],
  material: "",
  is_active: true,
};

const initialVariantForm = {
  sku: "",
  size: "",
  color: "",
  color_code: "#CCCCCC",
  price: "",
  stock: "",
};

function AdminProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Product edit modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [productError, setProductError] = useState("");

  // Product images
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageError, setImageError] = useState("");
  const [imageLoading, setImageLoading] = useState(false);

  // Variant modal
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState(initialVariantForm);
  const [variantError, setVariantError] = useState("");
  const [variantSaving, setVariantSaving] = useState(false);

  // Variant images
  const [variantSelectedImages, setVariantSelectedImages] = useState([]);
  const [variantImageError, setVariantImageError] = useState("");
  const [variantImageLoading, setVariantImageLoading] = useState(false);
    // Product Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (!data) {
      return err.message || "Something went wrong. Please try again.";
    }

    if (typeof data === "string") return data;

    if (data.detail || data.message) {
      return data.detail || data.message;
    }

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : String(messages);

        return `${field}: ${message}`;
      })
      .join(" | ");
  };

  // Fetch product details
  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get(
        `/products/admin/${id}/`
      );

      setProduct(response.data.product || response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };
    // Fetch reviews for this product
  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError("");

      const response = await axiosInstance.get(
        `/products/admin/reviews/?product=${id}`
      );

      const data = response.data;

      setReviews(
        Array.isArray(data)
          ? data
          : data.results || data.reviews || []
      );
    } catch (err) {
      setReviewsError(getErrorMessage(err));
    } finally {
      setReviewsLoading(false);
    }
  };
    // Delete a product review
const handleReviewDelete = async (reviewId) => {
  try {
    setDeletingReviewId(reviewId);
    setReviewsError("");

    await axiosInstance.delete(
      `/products/admin/reviews/${reviewId}/`
    );

    await fetchReviews();
  } catch (err) {
    setReviewsError(getErrorMessage(err));
  } finally {
    setDeletingReviewId(null);
  }
};

  // Fetch categories and rooms
  const fetchCategoriesAndRooms = async () => {
    try {
      const [categoryResponse, roomResponse] = await Promise.all([
        axiosInstance.get("/products/categories/"),
        axiosInstance.get("/products/rooms/"),
      ]);

      setCategories(
        categoryResponse.data.results || categoryResponse.data || []
      );

      setRooms(
        roomResponse.data.results || roomResponse.data || []
      );
    } catch (err) {
      console.error("Category/room fetch error:", err);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchCategoriesAndRooms();
    fetchReviews();
  }, [id]);

  const formatPrice = (price) => {
    if (price === null || price === undefined || price === "") {
      return "—";
    }

    return `₹${Number(price).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    const imagePath = image.image || image;

    if (typeof imagePath !== "string") return "";

    if (imagePath.startsWith("http")) return imagePath;

    return `http://127.0.0.1:8000${
      imagePath.startsWith("/") ? "" : "/"
    }${imagePath}`;
  };

  // Open product edit
  const openProductEdit = () => {
    const selectedCategory = categories.find(
      (item) => item.name === product.category
    );

    const selectedRooms = rooms
      .filter((item) =>
        (product.rooms || []).some((room) =>
          (typeof room === "object" ? room.name : room) === item.name
        )
      )
      .map((item) => item.id);

    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: selectedCategory ? String(selectedCategory.id) : "",
      rooms: selectedRooms,
      material: product.material || "",
      is_active: product.is_active,
    });

    setProductError("");
    setShowProductModal(true);
  };

  const handleProductFormChange = (e) => {
    const { name, value, checked, type } = e.target;

    setProductForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoomChange = (roomId) => {
    setProductForm((previous) => ({
      ...previous,
      rooms: previous.rooms.includes(roomId)
        ? previous.rooms.filter((item) => item !== roomId)
        : [...previous.rooms, roomId],
    }));
  };

  // Save product edit
  const handleProductUpdate = async (e) => {
    e.preventDefault();
    setProductError("");

    if (!productForm.name.trim()) {
      setProductError("Please enter product name.");
      return;
    }

    if (!productForm.category) {
      setProductError("Please select a category.");
      return;
    }

    if (productForm.rooms.length === 0) {
      setProductError("Please select at least one room.");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: Number(productForm.category),
      rooms: productForm.rooms.map(Number),
      material: productForm.material.trim(),
      is_active: productForm.is_active,
    };

    try {
      setActionLoading(true);

      await axiosInstance.patch(
        `/products/admin/${id}/`,
        payload
      );

      setShowProductModal(false);
      await fetchProduct();
    } catch (err) {
      setProductError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  // Select product images
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== files.length) {
      setImageError("Please select valid image files only.");
    } else {
      setImageError("");
    }

    setSelectedImages((previous) => [
      ...previous,
      ...validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);

    e.target.value = "";
  };

  const removeSelectedImage = (index) => {
    setSelectedImages((previous) => {
      URL.revokeObjectURL(previous[index].preview);

      return previous.filter((_, i) => i !== index);
    });
  };

  // Upload product images
  const handleImageUpload = async () => {
    if (selectedImages.length === 0) {
      setImageError("Please select at least one image.");
      return;
    }

    try {
      setImageLoading(true);
      setImageError("");

      for (const selected of selectedImages) {
        const imageData = new FormData();

        imageData.append("product", id);
        imageData.append("image", selected.file);
        imageData.append("alt_text", product.name);

        await axiosInstance.post(
          "/products/admin/images/",
          imageData
        );
      }

      selectedImages.forEach((item) =>
        URL.revokeObjectURL(item.preview)
      );

      setSelectedImages([]);
      await fetchProduct();
    } catch (err) {
      setImageError(getErrorMessage(err));
    } finally {
      setImageLoading(false);
    }
  };

  // Delete product image
const handleImageDelete = async (image) => {
  try {
    setImageLoading(true);
    setImageError("");

    await axiosInstance.delete(
      `/products/admin/images/${image.id}/`
    );

    await fetchProduct();
  } catch (err) {
    setImageError(getErrorMessage(err));
  } finally {
    setImageLoading(false);
  }
};
  // Open add variant
  const openAddVariant = () => {
    setEditingVariant(null);
    setVariantForm(initialVariantForm);
    setVariantSelectedImages([]);
    setVariantError("");
    setVariantImageError("");
    setShowVariantModal(true);
  };

  // Open edit variant
  const openEditVariant = (variant) => {
    setEditingVariant(variant);

    setVariantForm({
      sku: variant.sku || "",
      size: variant.size || "",
      color: variant.color || "",
      color_code: variant.color_code || "#CCCCCC",
      price: variant.price ?? "",
      stock: variant.stock ?? "",
    });

    setVariantSelectedImages([]);
    setVariantError("");
    setVariantImageError("");
    setShowVariantModal(true);
  };

  const handleVariantFormChange = (e) => {
    const { name, value } = e.target;

    setVariantForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Select multiple variant images
  const handleVariantImageChange = (e) => {
    const files = Array.from(e.target.files || []);

    const validFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (validFiles.length !== files.length) {
      setVariantImageError("Please select valid image files only.");
    } else {
      setVariantImageError("");
    }

    setVariantSelectedImages((previous) => [
      ...previous,
      ...validFiles.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      })),
    ]);

    e.target.value = "";
  };

  // Remove newly selected variant image
  const removeVariantSelectedImage = (index) => {
    setVariantSelectedImages((previous) => {
      URL.revokeObjectURL(previous[index].preview);

      return previous.filter((_, i) => i !== index);
    });
  };

  // Upload images to a particular variant
  const uploadVariantImages = async (variantId) => {
    for (const selected of variantSelectedImages) {
      const imageData = new FormData();

      imageData.append("product", id);
      imageData.append("variant", variantId);
      imageData.append("image", selected.file);
      imageData.append(
        "alt_text",
        `${product.name} - ${
          variantForm.color || variantForm.size || "Variant"
        }`
      );

      await axiosInstance.post(
        "/products/admin/images/",
        imageData
      );
    }

    variantSelectedImages.forEach((item) =>
      URL.revokeObjectURL(item.preview)
    );

    setVariantSelectedImages([]);
  };

  // Delete existing variant image
const handleVariantImageDelete = async (image) => {
  try {
    setVariantImageLoading(true);
    setVariantImageError("");

    await axiosInstance.delete(
      `/products/admin/images/${image.id}/`
    );

    await fetchProduct();
  } catch (err) {
    setVariantImageError(getErrorMessage(err));
  } finally {
    setVariantImageLoading(false);
  }
};
  // Add / update variant and upload its images
  const handleVariantSave = async (e) => {
    e.preventDefault();
    setVariantError("");
    setVariantImageError("");

    if (!variantForm.sku.trim()) {
      setVariantError("Please enter SKU.");
      return;
    }

    if (
      variantForm.price === "" ||
      Number(variantForm.price) <= 0
    ) {
      setVariantError("Price must be greater than zero.");
      return;
    }

    if (
      variantForm.stock === "" ||
      Number(variantForm.stock) < 0
    ) {
      setVariantError("Stock cannot be negative.");
      return;
    }

    if (!/^#[0-9A-Fa-f]{6}$/.test(variantForm.color_code)) {
      setVariantError("Please select a valid colour.");
      return;
    }

    const payload = {
      product: Number(id),
      sku: variantForm.sku.trim().toUpperCase(),
      size: variantForm.size.trim(),
      color: variantForm.color.trim(),
      color_code: variantForm.color_code.toUpperCase(),
      price: variantForm.price,
      stock: Number(variantForm.stock),
    };

    try {
      setVariantSaving(true);

      let variantId;

      if (editingVariant) {
        await axiosInstance.patch(
          `/products/admin/variants/${editingVariant.id}/`,
          payload
        );

        variantId = editingVariant.id;
      } else {
        const response = await axiosInstance.post(
          "/products/admin/variants/",
          payload
        );

        variantId = response.data.variant?.id;

        if (!variantId) {
          throw new Error(
            "Variant created, but its ID was not returned."
          );
        }
      }

      if (variantSelectedImages.length > 0) {
        await uploadVariantImages(variantId);
      }

      setShowVariantModal(false);
      setEditingVariant(null);
      setVariantForm(initialVariantForm);

      await fetchProduct();
    } catch (err) {
      setVariantError(getErrorMessage(err));
      await fetchProduct();
    } finally {
      setVariantSaving(false);
    }
  };

  // Delete variant
  const handleVariantDelete = async (variant) => {
    const confirmed = window.confirm(
      `Delete variant "${variant.sku}"?`
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);

      await axiosInstance.delete(
        `/products/admin/variants/${variant.id}/`
      );

      await fetchProduct();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-product-details-loading">
        Loading product details...
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="admin-product-details-page">
        <button
          className="admin-product-back-btn"
          onClick={() => navigate("/admin-products")}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>

        <p className="admin-product-details-error">{error}</p>
      </div>
    );
  }

  if (!product) return null;

  const variants = product.variants || [];

  // Product-level images only
  const images = (product.images || []).filter(
    (image) => !image.variant
  );

  const totalStock = variants.reduce(
    (total, variant) => total + Number(variant.stock || 0),
    0
  );

  const prices = variants
    .map((variant) => Number(variant.price))
    .filter((price) => Number.isFinite(price));

  const startingPrice =
    prices.length > 0 ? Math.min(...prices) : null;

  const category =
    typeof product.category === "object"
      ? product.category?.name
      : product.category;

  const roomNames = Array.isArray(product.rooms)
    ? product.rooms
        .map((room) =>
          typeof room === "object" ? room.name : room
        )
        .filter(Boolean)
        .join(", ")
    : "—";

  return (
    <div className="admin-product-details-page">

      {/* TOP NAVIGATION */}
      <div className="admin-product-details-top">
        <button
          className="admin-product-back-btn"
          onClick={() => navigate("/admin-products")}
        >
          <ArrowLeft size={18} />
          Back to Products
        </button>

        <span className="admin-product-breadcrumb">
          Product Management / Product Details
        </span>
      </div>

      {/* HEADING */}
      <div className="admin-product-details-heading">
        <div>
          <span className="admin-product-eyebrow">
            PRODUCT OVERVIEW
          </span>

          <h1>{product.name}</h1>

          <p>Manage product information, images and inventory.</p>
        </div>

        <div className="admin-product-heading-actions">
          <span
            className={`admin-product-details-status ${
              product.is_active ? "active" : "inactive"
            }`}
          >
            <span className="admin-status-dot"></span>
            {product.is_active ? "Active" : "Inactive"}
          </span>

          <button
            className="admin-details-edit-btn"
            onClick={openProductEdit}
          >
            <Pencil size={16} />
            Edit Product
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      <section className="admin-product-overview-card">

        <div className="admin-product-gallery">
          {images.length > 0 ? (
            <div className="admin-product-image-grid">
              {images.map((image) => {
                const imageUrl = getImageUrl(image);

                return imageUrl ? (
                  <div
                    className="admin-product-image-item"
                    key={image.id}
                  >
                    <img
                      src={imageUrl}
                      alt={image.alt_text || product.name}
                    />

                    <button
                      className="admin-image-delete-btn"
                      disabled={imageLoading}
                      onClick={() => handleImageDelete(image)}
                      title="Delete image"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <div className="admin-product-image-placeholder">
              <ImageIcon size={52} strokeWidth={1.3} />
              <p>No product images available</p>
            </div>
          )}

          {/* PRODUCT IMAGE UPLOAD */}
          <div className="admin-image-upload-box">
            <label className="admin-image-upload-label">
              <Plus size={17} />
              Select Product Images

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
            </label>

            {selectedImages.length > 0 && (
              <>
                <div className="admin-selected-image-grid">
                  {selectedImages.map((item, index) => (
                    <div key={`${item.file.name}-${index}`}>
                      <img src={item.preview} alt="Preview" />

                      <button
                        type="button"
                        onClick={() => removeSelectedImage(index)}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="admin-upload-images-btn"
                  onClick={handleImageUpload}
                  disabled={imageLoading}
                >
                  {imageLoading ? "Uploading..." : "Upload Images"}
                </button>
              </>
            )}

            {imageError && (
              <p className="admin-product-details-error">
                {imageError}
              </p>
            )}
          </div>
        </div>

        <div className="admin-product-overview-content">
          <span className="admin-product-section-label">
            PRODUCT INFORMATION
          </span>

          <h2>{product.name}</h2>

          <p className="admin-product-id">
            Product ID: #{product.id}
          </p>

          <div className="admin-product-price-box">
            <span>Starting Price</span>
            <strong>{formatPrice(startingPrice)}</strong>
          </div>

          <div className="admin-product-info-list">

            <div className="admin-product-info-item">
              <span className="admin-product-info-icon">
                <Tag size={17} />
              </span>
              <div>
                <label>Category</label>
                <p>{category || "—"}</p>
              </div>
            </div>

            <div className="admin-product-info-item">
              <span className="admin-product-info-icon">
                <Layers size={17} />
              </span>
              <div>
                <label>Room</label>
                <p>{roomNames || "—"}</p>
              </div>
            </div>

            <div className="admin-product-info-item">
              <span className="admin-product-info-icon">
                <Palette size={17} />
              </span>
              <div>
                <label>Material</label>
                <p>{product.material || "—"}</p>
              </div>
            </div>

            <div className="admin-product-info-item">
              <span className="admin-product-info-icon">
                <Warehouse size={17} />
              </span>
              <div>
                <label>Total Stock</label>
                <p>{totalStock} units</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* DESCRIPTION */}
      <section className="admin-product-details-card">
        <div className="admin-product-card-heading">
          <div>
            <span className="admin-product-section-label">
              ABOUT THE PRODUCT
            </span>
            <h3>Product Description</h3>
          </div>
        </div>

        <p className="admin-product-description-text">
          {product.description || "No description available."}
        </p>

        <div className="admin-product-slug">
          <span>Product Slug</span>
          <p>{product.slug || "—"}</p>
        </div>
      </section>

      {/* VARIANTS */}
      <section className="admin-product-details-card">

        <div className="admin-product-card-heading">
          <div>
            <span className="admin-product-section-label">
              INVENTORY MANAGEMENT
            </span>
            <h3>Product Variants</h3>
          </div>

          <div className="admin-variant-heading-actions">
            <span className="admin-product-variant-count">
              {variants.length} Variants
            </span>

            <button
              className="admin-add-variant-btn"
              onClick={openAddVariant}
            >
              <Plus size={16} />
              Add Variant
            </button>
          </div>
        </div>

        {variants.length > 0 ? (
          <div className="admin-product-variants-table-wrapper">
            <table className="admin-product-variants-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Stock Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {variants.map((variant) => (
                  <tr key={variant.id}>
                    <td className="admin-product-sku">
                      {variant.sku || "—"}
                    </td>

                    <td>{variant.size || "—"}</td>
                    <td>
                      <span className="admin-variant-table-color">
                        <span
                          className="admin-variant-table-color-swatch"
                          style={{
                            backgroundColor:
                              variant.color_code || "#CCCCCC",
                          }}
                        />
                        {variant.color || "—"}
                      </span>
                    </td>

                    <td className="admin-product-variant-price">
                      {formatPrice(variant.price)}
                    </td>

                    <td>{variant.stock ?? 0}</td>

                    <td>
                      <span
                        className={`admin-stock-badge ${
                          Number(variant.stock) > 0
                            ? "in-stock"
                            : "out-of-stock"
                        }`}
                      >
                        {Number(variant.stock) > 0
                          ? "In Stock"
                          : "Out of Stock"}
                      </span>
                    </td>

                    <td>
                      <div className="admin-variant-actions">
                        <button
                          className="admin-variant-edit-btn"
                          disabled={actionLoading}
                          onClick={() => openEditVariant(variant)}
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          className="admin-variant-delete-btn"
                          disabled={actionLoading}
                          onClick={() => handleVariantDelete(variant)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-product-empty">
            No variants available. Click Add Variant to create one.
          </p>
        )}
      </section>

      {error && (
        <p className="admin-product-details-error">{error}</p>
      )}
             {/* CUSTOMER REVIEWS */}
      <section className="admin-product-details-card admin-product-reviews-section">

        <div className="admin-product-card-heading">
          <div>
            <span className="admin-product-section-label">
              CUSTOMER FEEDBACK
            </span>
            <h3>Customer Reviews</h3>
          </div>

          <span className="admin-product-variant-count">
            {reviews.length} Reviews
          </span>
        </div>

        {reviewsLoading ? (
          <p className="admin-product-empty">
            Loading reviews...
          </p>
        ) : reviewsError ? (
          <p className="admin-product-details-error">
            {reviewsError}
          </p>
        ) : reviews.length === 0 ? (
          <p className="admin-product-empty">
            No reviews yet for this product.
          </p>
        ) : (
          <div className="admin-product-reviews-list">

            {reviews.map((review) => (
              <div
                className="admin-product-review-item"
                key={review.id}
              >
                <div className="admin-product-review-content">

                  <div className="admin-product-review-header">
                    <div>
                      <h4>
                        {review.customer_name || "Customer"}
                      </h4>

                      <p>
                        {review.customer_email || "—"}
                      </p>
                    </div>

                    <span className="admin-product-review-date">
                      {review.created_at &&
                      !Number.isNaN(new Date(review.created_at).getTime())
                        ? new Date(review.created_at).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )
                        : "—"}
                    </span>
                  </div>

                  <div className="admin-product-review-rating">
                    {"★".repeat(Number(review.rating) || 0)}
                    {"☆".repeat(
                      Math.max(0, 5 - (Number(review.rating) || 0))
                    )}
                    <span>{review.rating}/5</span>
                  </div>

                  <p className="admin-product-review-comment">
                    {review.comment || "No comment provided."}
                  </p>

                </div>

                <button
                  type="button"
                  className="admin-product-review-delete-btn"
                  onClick={() => handleReviewDelete(review.id)}
                  disabled={deletingReviewId === review.id}
                  title="Delete review"
                >
                  <Trash2 size={16} />
                  {deletingReviewId === review.id
                    ? "Deleting..."
                    : "Delete"}
                </button>

              </div>
            ))}

          </div>
        )}

      </section>
      {/* PRODUCT EDIT MODAL */}
      {showProductModal && (
        <div
          className="admin-details-modal-overlay"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="admin-details-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-details-modal-header">
              <div>
                <h3>Edit Product</h3>
                <p>Update this product's information.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                disabled={actionLoading}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleProductUpdate}>
              <div className="admin-details-form-group">
                <label>Product Name *</label>
                <input
                  name="name"
                  value={productForm.name}
                  onChange={handleProductFormChange}
                  required
                />
              </div>

              <div className="admin-details-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={productForm.description}
                  onChange={handleProductFormChange}
                  rows="4"
                />
              </div>

              <div className="admin-details-form-grid">
                <div className="admin-details-form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={productForm.category}
                    onChange={handleProductFormChange}
                    required
                  >
                    <option value="">Select Category</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-details-form-group">
                  <label>Material</label>
                  <input
                    name="material"
                    value={productForm.material}
                    onChange={handleProductFormChange}
                  />
                </div>
              </div>

              <div className="admin-details-form-group">
                <label>Rooms *</label>

                <div className="admin-details-room-options">
                  {rooms.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={productForm.rooms.includes(item.id)}
                        onChange={() => handleRoomChange(item.id)}
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>

              <label className="admin-details-active-option">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={productForm.is_active}
                  onChange={handleProductFormChange}
                />
                Active Product
              </label>

              {productError && (
                <p className="admin-details-form-error">
                  {productError}
                </p>
              )}

              <div className="admin-details-modal-actions">
                <button
                  type="button"
                  className="admin-details-cancel-btn"
                  onClick={() => setShowProductModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-details-save-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VARIANT ADD / EDIT MODAL */}
      {showVariantModal && (
        <div
          className="admin-details-modal-overlay"
          onClick={() => {
            if (!variantSaving) setShowVariantModal(false);
          }}
        >
          <div
            className="admin-details-modal admin-variant-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-details-modal-header">
              <div>
                <h3>
                  {editingVariant ? "Edit Variant" : "Add New Variant"}
                </h3>
                <p>Manage size, color, price, stock and images.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowVariantModal(false)}
                disabled={variantSaving}
              >
                <X />
              </button>
            </div>

            <form onSubmit={handleVariantSave}>
              <div className="admin-details-form-group">
                <label>SKU *</label>
                <input
                  name="sku"
                  value={variantForm.sku}
                  onChange={handleVariantFormChange}
                  placeholder="Example: HNK-RACK-001"
                  required
                />
              </div>

              <div className="admin-details-form-grid">
                <div className="admin-details-form-group">
                  <label>Size</label>
                  <input
                    name="size"
                    value={variantForm.size}
                    onChange={handleVariantFormChange}
                    placeholder="Example: Medium"
                  />
                </div>

                <div className="admin-details-form-group">
                  <label>Color Name</label>
                  <input
                    name="color"
                    value={variantForm.color}
                    onChange={handleVariantFormChange}
                    placeholder="Example: Sage Green"
                  />
                </div>

                <div className="admin-details-form-group">
                  <label>Choose Colour *</label>

                  <div className="admin-color-picker-wrapper">
                    <input
                      type="color"
                      name="color_code"
                      value={variantForm.color_code}
                      onChange={handleVariantFormChange}
                      title="Choose variant colour"
                    />

                    <span>
                      {variantForm.color_code.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="admin-details-form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    name="price"
                    min="0.01"
                    step="0.01"
                    value={variantForm.price}
                    onChange={handleVariantFormChange}
                    required
                  />
                </div>

                <div className="admin-details-form-group">
                  <label>Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    min="0"
                    step="1"
                    value={variantForm.stock}
                    onChange={handleVariantFormChange}
                    required
                  />
                </div>
              </div>

              {/* EXISTING VARIANT IMAGES */}
              {editingVariant && (
                <div className="admin-variant-images-editor">
                  <h4>Current Variant Images</h4>

                  {(() => {
                    const currentImages = (product.images || []).filter(
                      (image) =>
                        Number(
                          typeof image.variant === "object"
                            ? image.variant?.id
                            : image.variant
                        ) === Number(editingVariant.id)
                    );

                    return currentImages.length > 0 ? (
                      <div className="admin-variant-image-grid">
                        {currentImages.map((image) => (
                          <div
                            className="admin-variant-image-item"
                            key={image.id}
                          >
                            <img
                              src={getImageUrl(image)}
                              alt={image.alt_text || "Variant"}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleVariantImageDelete(image)
                              }
                              disabled={
                                variantImageLoading || variantSaving
                              }
                              title="Delete variant image"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="admin-variant-no-images">
                        No images available for this variant.
                      </p>
                    );
                  })()}
                </div>
              )}

              {/* ADD NEW VARIANT IMAGES */}
              <div className="admin-variant-images-editor">
                <h4>Upload Variant Images</h4>

                <label className="admin-image-upload-label">
                  <Plus size={17} />
                  Choose Variant Images

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleVariantImageChange}
                    disabled={variantSaving}
                  />
                </label>

                {variantSelectedImages.length > 0 && (
                  <>
                    <div className="admin-variant-image-grid">
                      {variantSelectedImages.map((item, index) => (
                        <div
                          className="admin-variant-image-item"
                          key={`${item.file.name}-${index}`}
                        >
                          <img
                            src={item.preview}
                            alt={item.file.name}
                          />

                          <button
                            type="button"
                            onClick={() =>
                              removeVariantSelectedImage(index)
                            }
                            disabled={variantSaving}
                            title="Remove selected image"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <p className="admin-variant-selected-count">
                      {variantSelectedImages.length} image(s) selected
                    </p>
                  </>
                )}

                {variantImageError && (
                  <p className="admin-details-form-error">
                    {variantImageError}
                  </p>
                )}
              </div>

              {variantError && (
                <p className="admin-details-form-error">
                  {variantError}
                </p>
              )}

              <div className="admin-details-modal-actions">
                <button
                  type="button"
                  className="admin-details-cancel-btn"
                  onClick={() => setShowVariantModal(false)}
                  disabled={variantSaving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-details-save-btn"
                  disabled={variantSaving}
                >
                  {variantSaving
                    ? "Saving..."
                    : editingVariant
                    ? "Update Variant"
                    : "Create Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminProductDetails;
