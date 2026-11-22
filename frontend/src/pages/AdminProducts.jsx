
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./AdminProducts.css";
import Pagination from "../components/Pagination"


const initialForm = {
  name: "",
  description: "",
  category: "",
  rooms: [],
  material: "",
  is_active: true,
};

const createEmptyVariant = () => ({
  sku: "",
  size: "",
  color: "",
  color_code: "#CCCCCC",
  price: "",
  stock: "0",
  images: [],
});

function AdminProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [room, setRoom] = useState("");
  const [status, setStatus] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ADD PRODUCT MODAL
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // PRODUCT IMAGES
  const [productImages, setProductImages] = useState([]);

  // VARIANTS
  const [variants, setVariants] = useState([]);

  const getErrorMessage = (err) => {
    const data = err.response?.data;

    if (!data) {
      return err.message || "Something went wrong. Please try again.";
    }

    if (typeof data === "string") {
      return data;
    }

    if (data.detail || data.message) {
      return data.detail || data.message;
    }

    return Object.entries(data)
      .map(([field, messages]) => {
        const message = Array.isArray(messages)
          ? messages.join(", ")
          : typeof messages === "object"
          ? JSON.stringify(messages)
          : messages;

        return `${field}: ${message}`;
      })
      .join(" | ");
  };

  // FETCH PRODUCTS
  const fetchProducts = async (currentPage = page) => {
    try {
      
      setError("");

      const params = {
        page: currentPage,
        page_size: 6,
        search,
        category,
        room,
        status,
        stock: stockStatus,
        min_price: minPrice,
        max_price: maxPrice,
        sort,
      };

      Object.keys(params).forEach((key) => {
        if (params[key] === "") {
          delete params[key];
        }
      });

      const response = await axiosInstance.get(
        "/products/admin/",
        { params }
      );

      const data = response.data;

      setProducts(data.results || []);
      setTotalProducts(data.count || 0);
      setTotalPages(Math.ceil((data.count || 0) / 6) || 1);
    } catch (err) {
      console.error("Products fetch error:", err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // FETCH CATEGORIES AND ROOMS
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
      console.error("Categories and rooms fetch error:", err);
    }
  };

  useEffect(() => {
    fetchCategoriesAndRooms();
  }, []);

  useEffect(() => {
    fetchProducts(page);
  }, [
    page,
    search,
    category,
    room,
    status,
    stockStatus,
    minPrice,
    maxPrice,
    sort,
  ]);

  // FILTER CHANGE
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };

  // OPEN ADD PRODUCT MODAL
  const openAddModal = () => {
    setForm(initialForm);
    setProductImages([]);
    setVariants([]);
    setFormError("");
    setShowModal(true);
  };

  // CLOSE MODAL
  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setForm(initialForm);
    setProductImages([]);
    setVariants([]);
    setFormError("");
  };

  // PRODUCT FORM CHANGE
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ROOM MULTIPLE SELECTION
  const handleRoomChange = (roomId) => {
    setForm((previous) => {
      const numericId = Number(roomId);
      const roomExists = previous.rooms.includes(numericId);

      return {
        ...previous,
        rooms: roomExists
          ? previous.rooms.filter((id) => id !== numericId)
          : [...previous.rooms, numericId],
      };
    });
  };

  // PRODUCT IMAGE SELECTION
  const handleProductImagesChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    setProductImages((previous) => [
      ...previous,
      ...selectedFiles,
    ]);

    e.target.value = "";
  };

  const removeProductImage = (index) => {
    setProductImages((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  // ADD VARIANT
  const addVariant = () => {
    setVariants((previous) => [
      ...previous,
      createEmptyVariant(),
    ]);
  };

  // REMOVE VARIANT
  const removeVariant = (index) => {
    setVariants((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  // VARIANT FIELD CHANGE
  const handleVariantChange = (index, field, value) => {
    setVariants((previous) =>
      previous.map((variant, i) =>
        i === index
          ? { ...variant, [field]: value }
          : variant
      )
    );
  };

  // VARIANT IMAGE SELECTION
  const handleVariantImagesChange = (index, e) => {
    const selectedFiles = Array.from(e.target.files || []);

    setVariants((previous) =>
      previous.map((variant, i) =>
        i === index
          ? {
              ...variant,
              images: [...variant.images, ...selectedFiles],
            }
          : variant
      )
    );

    e.target.value = "";
  };

  const removeVariantImage = (variantIndex, imageIndex) => {
    setVariants((previous) =>
      previous.map((variant, i) =>
        i === variantIndex
          ? {
              ...variant,
              images: variant.images.filter(
                (_, imageIndexValue) => imageIndexValue !== imageIndex
              ),
            }
          : variant
      )
    );
  };

  // UPLOAD ONE IMAGE
  const uploadImage = async (productId, file, variantId = null) => {
    const imageData = new FormData();

    imageData.append("product", productId);
    imageData.append("image", file);
    imageData.append("alt_text", file.name);

    if (variantId !== null) {
      imageData.append("variant", variantId);
    }

    await axiosInstance.post(
      "/products/admin/images/",
      imageData
    );
  };

  // VALIDATE FORM
  const validateForm = () => {
    if (!form.name.trim()) {
      return "Please enter product name.";
    }

    if (!form.category) {
      return "Please select a category.";
    }

    if (form.rooms.length === 0) {
      return "Please select at least one room.";
    }

    const hasAttachments =
      productImages.length > 0 ||
      variants.length > 0;

    if (!form.is_active && hasAttachments) {
      return "Please activate the product before adding images or variants.";
    }

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];

      if (!variant.sku.trim()) {
        return `Please enter SKU for Variant ${i + 1}.`;
      }

      if (!variant.price || Number(variant.price) <= 0) {
        return `Please enter a valid price for Variant ${i + 1}.`;
      }

      if (
        variant.stock === "" ||
        Number(variant.stock) < 0 ||
        !Number.isInteger(Number(variant.stock))
      ) {
        return `Please enter a valid stock quantity for Variant ${i + 1}.`;
      }

      if (
        !/^#[0-9A-Fa-f]{6}$/.test(variant.color_code || "")
      ) {
        return `Please choose a valid colour for Variant ${i + 1}.`;
      }
    }

    return "";
  };

  // CREATE PRODUCT + UPLOAD IMAGES + CREATE VARIANTS
  const handleSaveProduct = async (e) => {
    e.preventDefault();

    setFormError("");

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      category: Number(form.category),
      rooms: form.rooms.map(Number),
      material: form.material.trim(),
      is_active: form.is_active,
    };

    let createdProductId = null;

    try {
      setSaving(true);

      // STEP 1: CREATE PRODUCT
      const productResponse = await axiosInstance.post(
        "/products/admin/",
        payload
      );

      const createdProduct =
        productResponse.data.product || productResponse.data;

      createdProductId = createdProduct.id;

      if (!createdProductId) {
        throw new Error(
          "Product was created, but product ID was not received."
        );
      }

      // STEP 2: UPLOAD PRODUCT IMAGES
      for (const file of productImages) {
        await uploadImage(createdProductId, file);
      }

      // STEP 3: CREATE VARIANTS AND UPLOAD THEIR IMAGES
      for (const variant of variants) {
        const variantPayload = {
          product: Number(createdProductId),
          sku: variant.sku.trim(),
          size: variant.size.trim(),
          color: variant.color.trim(),
          color_code: variant.color_code.toUpperCase(),
          price: Number(variant.price),
          stock: Number(variant.stock),
        };

        const variantResponse = await axiosInstance.post(
          "/products/admin/variants/",
          variantPayload
        );

        const createdVariant =
          variantResponse.data.variant || variantResponse.data;

        if (!createdVariant.id) {
          throw new Error(
            `Variant ${variant.sku} was created, but its ID was not received.`
          );
        }

        // UPLOAD IMAGES FOR THIS VARIANT
        for (const file of variant.images) {
          await uploadImage(
            createdProductId,
            file,
            createdVariant.id
          );
        }
      }

      setShowModal(false);
      setForm(initialForm);
      setProductImages([]);
      setVariants([]);

      // OPEN CREATED PRODUCT DETAILS
      navigate(`/admin-products/${createdProductId}`);
    } catch (err) {
      console.error("Product creation error:", err);

      if (createdProductId) {
        window.alert(
          `Product ID ${createdProductId} was created, but an image or variant could not be saved.\n\n${getErrorMessage(err)}\n\nYou can continue managing this product from its Details page.`
        );

        setShowModal(false);
        navigate(`/admin-products/${createdProductId}`);
      } else {
        setFormError(
          err.message || getErrorMessage(err)
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ACTIVATE / DEACTIVATE PRODUCT
  const handleStatusChange = async (product) => {
    const newStatus = !product.is_active;

    try {
      setActionLoading(product.id);
      setError("");

      await axiosInstance.patch(
        `/products/admin/${product.id}/status/`,
        { is_active: newStatus }
      );

      setProducts((previousProducts) =>
        previousProducts.map((item) =>
          item.id === product.id
            ? { ...item, is_active: newStatus }
            : item
        )
      );
    } catch (err) {
      console.error("Product status update error:", err);
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price) => {
    if (price === null || price === undefined) {
      return "₹0.00";
    }

    return `₹${Number(price).toFixed(2)}`;
  };

  return (
    
  <div className="admin-products-page">

    <div className="admin-products-content">

      {/* HEADER */}
      <div className="admin-products-header">
        <div>
          <h2>Product Management</h2>
          <p>Manage all your products here.</p>
        </div>

        <div className="admin-products-header-actions">
          <div className="admin-products-count">
            Total Products: {totalProducts}
          </div>

          <button
            type="button"
            className="admin-add-product-btn"
            onClick={openAddModal}
          >
            + Add Product
          </button>
        </div>
      </div>

      {/* FILTERS */}
      <div className="admin-products-filters">

        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) =>
            handleFilterChange(setSearch, e.target.value)
          }
        />

        <select
          value={category}
          onChange={(e) =>
            handleFilterChange(setCategory, e.target.value)
          }
        >
          <option value="">All Categories</option>

          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={room}
          onChange={(e) =>
            handleFilterChange(setRoom, e.target.value)
          }
        >
          <option value="">All Rooms</option>

          {rooms.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) =>
            handleFilterChange(setStatus, e.target.value)
          }
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={stockStatus}
          onChange={(e) =>
            handleFilterChange(setStockStatus, e.target.value)
          }
        >
          <option value="">All Stock</option>
          <option value="in_stock">In Stock</option>
          <option value="out_of_stock">Out of Stock</option>
          <option value="low_stock">Low Stock</option>
        </select>

        <input
          type="number"
          min="0"
          placeholder="Min Price"
          value={minPrice}
          onChange={(e) =>
            handleFilterChange(setMinPrice, e.target.value)
          }
        />

        <input
          type="number"
          min="0"
          placeholder="Max Price"
          value={maxPrice}
          onChange={(e) =>
            handleFilterChange(setMaxPrice, e.target.value)
          }
        />

        <select
          value={sort}
          onChange={(e) =>
            handleFilterChange(setSort, e.target.value)
          }
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="rating_high">Rating: High to Low</option>
          <option value="stock_low">Stock: Low to High</option>
        </select>

      </div>

      {error && (
        <div className="admin-products-error">
          {error}
        </div>
      )}

      {/* PRODUCTS TABLE */}
      <div className="admin-products-table-wrapper">

        {loading && products.length === 0 ? (
  <p className="admin-products-loading">
    Loading products...
  </p>
) : products.length === 0 ? (
          <p className="admin-products-empty">
            No products found.
          </p>
        ) : (
          <table className="admin-products-table">

            <thead>
              <tr>
                <th>ID</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Starting Price</th>
                <th>Total Stock</th>
                <th>Rating</th>
                <th>Total Reviews</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="admin-product-row"
                  onClick={() =>
                    navigate(`/admin-products/${product.id}`)
                  }
                >
                  <td>{product.id}</td>

                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>{product.category || "-"}</td>

                  <td>
                    {formatPrice(product.starting_price)}
                  </td>

                  <td>{product.total_stock ?? 0}</td>
                  <td>
                    {product.review_count > 0 &&
                    product.average_rating !== null &&
                    product.average_rating !== undefined
                      ? `⭐ ${Number(product.average_rating).toFixed(1)}`
                      : "-"}
                  </td>
                  <td>{product.review_count ?? 0}</td>

                  <td>
                    <span
                      className={
                        product.is_active
                          ? "admin-status-active"
                          : "admin-status-inactive"
                      }
                    >
                      {product.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td
                    className="admin-product-actions-cell"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="admin-toggle">
                      <input
                        type="checkbox"
                        checked={product.is_active}
                        disabled={actionLoading === product.id}
                        onChange={() =>
                          handleStatusChange(product)
                        }
                      />

                      <span className="admin-toggle-slider"></span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}

            </div>

    </div>

      {/* REUSABLE PAGINATION */}
        {!loading && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}

      {/* ADD PRODUCT MODAL */}
      {showModal && (
        <div
          className="admin-product-modal-overlay"
          onClick={closeModal}
        >
          <div
            className="admin-product-modal admin-product-large-modal"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="admin-product-modal-header">
              <div>
                <h3>Add New Product</h3>
                <p>
                  Add product details, images and variants.
                </p>
              </div>

              <button
                type="button"
                className="admin-product-modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>

              {/* BASIC PRODUCT DETAILS */}
              <h4 className="admin-add-section-title">
                Product Information
              </h4>

              <div className="admin-product-form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="admin-product-form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Enter product description"
                  rows="4"
                />
              </div>

              <div className="admin-product-form-grid">

                <div className="admin-product-form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
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

                <div className="admin-product-form-group">
                  <label>Material</label>
                  <input
                    type="text"
                    name="material"
                    value={form.material}
                    onChange={handleFormChange}
                    placeholder="Example: Wood"
                  />
                </div>

              </div>

              <div className="admin-product-form-group">
                <label>Rooms *</label>

                <div className="admin-product-room-options">
                  {rooms.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={form.rooms.includes(item.id)}
                        onChange={() => handleRoomChange(item.id)}
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>

              <label className="admin-product-active-option">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleFormChange}
                />
                Active Product
              </label>

              {/* PRODUCT IMAGES */}
              <div className="admin-add-product-section">
                <h4 className="admin-add-section-title">
                  Product Images
                </h4>

                <p className="admin-add-section-description">
                  These images belong to the main product.
                </p>

                <label className="admin-add-file-label">
                  + Choose Product Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleProductImagesChange}
                    disabled={saving}
                  />
                </label>

                {productImages.length > 0 && (
                  <div className="admin-add-image-list">
                    {productImages.map((file, index) => (
                      <div
                        className="admin-add-image-item"
                        key={`${file.name}-${index}`}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                        />

                        <span>{file.name}</span>

                        <button
                          type="button"
                          onClick={() => removeProductImage(index)}
                          disabled={saving}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* VARIANTS */}
              <div className="admin-add-product-section">
                <div className="admin-add-variant-heading">
                  <div>
                    <h4 className="admin-add-section-title">
                      Product Variants
                    </h4>
                    <p className="admin-add-section-description">
                      Add different sizes, colors and prices.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="admin-add-variant-btn"
                    onClick={addVariant}
                    disabled={saving}
                  >
                    + Add Variant
                  </button>
                </div>

                {variants.length === 0 && (
                  <p className="admin-no-variants">
                    No variants added yet.
                  </p>
                )}

                {variants.map((variant, index) => (
                  <div
                    className="admin-add-variant-card"
                    key={index}
                  >
                    <div className="admin-add-variant-card-heading">
                      <h5>Variant {index + 1}</h5>

                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="admin-product-form-grid">

                      <div className="admin-product-form-group">
                        <label>SKU *</label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "sku",
                              e.target.value
                            )
                          }
                          placeholder="Example: HNK-RACK-001"
                          required
                        />
                      </div>

                      <div className="admin-product-form-group">
                        <label>Size</label>
                        <input
                          type="text"
                          value={variant.size}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "size",
                              e.target.value
                            )
                          }
                          placeholder="Example: Medium"
                        />
                      </div>

                      {/* COLOUR NAME */}
                      <div className="admin-product-form-group">
                        <label>Color Name</label>
                        <input
                          type="text"
                          value={variant.color}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "color",
                              e.target.value
                            )
                          }
                          placeholder="Example: Sage Green"
                        />
                      </div>

                      {/* COLOUR PICKER */}
                      <div className="admin-product-form-group">
                        <label>Choose Colour</label>

                        <div className="admin-color-picker-wrapper">
                          <input
                            type="color"
                            value={variant.color_code || "#CCCCCC"}
                            onChange={(e) =>
                              handleVariantChange(
                                index,
                                "color_code",
                                e.target.value.toUpperCase()
                              )
                            }
                          />

                          <span>
                            {variant.color_code || "#CCCCCC"}
                          </span>
                        </div>
                      </div>

                      <div className="admin-product-form-group">
                        <label>Price (₹) *</label>
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={variant.price}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "price",
                              e.target.value
                            )
                          }
                          placeholder="Enter price"
                          required
                        />
                      </div>

                      <div className="admin-product-form-group">
                        <label>Stock *</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={variant.stock}
                          onChange={(e) =>
                            handleVariantChange(
                              index,
                              "stock",
                              e.target.value
                            )
                          }
                          required
                        />
                      </div>

                    </div>

                    {/* VARIANT IMAGES */}
                    <div className="admin-variant-image-section">
                      <label className="admin-add-file-label">
                        + Choose Images for Variant {index + 1}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) =>
                            handleVariantImagesChange(index, e)
                          }
                          disabled={saving}
                        />
                      </label>

                      {variant.images.length > 0 && (
                        <div className="admin-add-image-list">
                          {variant.images.map((file, imageIndex) => (
                            <div
                              className="admin-add-image-item"
                              key={`${file.name}-${imageIndex}`}
                            >
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                              />

                              <span>{file.name}</span>

                              <button
                                type="button"
                                onClick={() =>
                                  removeVariantImage(index, imageIndex)
                                }
                                disabled={saving}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                ))}
              </div>

              {formError && (
                <div className="admin-product-form-error">
                  {formError}
                </div>
              )}

              <div className="admin-product-modal-actions">

                <button
                  type="button"
                  className="admin-product-cancel-btn"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="admin-product-save-btn"
                  disabled={saving}
                >
                  {saving ? "Creating Product..." : "Create Product"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminProducts;
