
import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

import axiosInstance from "../services/axiosInstance";
import "./ProductDetail.css";

// TEMPORARY PRODUCT CACHE
const productCache = new Map();

const getAvailableVariant = (product) => {
  if (!product?.variants?.length) {
    return null;
  }

  return (
    product.variants.find(
      (variant) => Number(variant.stock) > 0
    ) || product.variants[0]
  );
};

function ProductDetail({
  isAuthenticated,
  refreshCartCount,
  onLoginClick,
  refreshWishlistCount,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const cachedProduct = productCache.get(id);

  const [product, setProduct] = useState(
    () => cachedProduct || null
  );

  const [loading, setLoading] = useState(
    () => !cachedProduct
  );

  const [error, setError] = useState("");

  const [selectedImage, setSelectedImage] = useState(0);

  const [selectedVariant, setSelectedVariant] = useState(
    () => getAvailableVariant(cachedProduct)
  );

  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartMessage, setCartMessage] = useState("");

  // WISHLIST STATES
  const [wishlistItemId, setWishlistItemId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState("");

  // REVIEW STATES
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const accessToken = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_role");
  const isCustomer = Boolean(accessToken && role === "customer");

  // FETCH PRODUCT
  useEffect(() => {
    const cachedData = productCache.get(id);

    if (cachedData) {
      setProduct(cachedData);
      setSelectedVariant(getAvailableVariant(cachedData));
      setSelectedImage(0);
      setQuantity(1);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const fetchProduct = async () => {
      try {
        setError("");

        const response = await axiosInstance.get(
          `/products/${id}/`
        );

        const productData =
          response.data.product || response.data;

        // SAVE PRODUCT IN CACHE
        productCache.set(id, productData);

        setProduct(productData);

        setSelectedVariant(
          getAvailableVariant(productData)
        );

        setSelectedImage(0);
        setQuantity(1);
        setCartMessage("");
      } catch (err) {
        console.error("Product detail error:", err);

        if (!cachedData) {
          setError("Unable to load product details.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // CHECK WHETHER PRODUCT IS ALREADY IN WISHLIST
  useEffect(() => {
    const fetchWishlistStatus = async () => {
      if (!isAuthenticated || !isCustomer || !product?.id) {
        setWishlistItemId(null);
        return;
      }

      try {
        const response = await axiosInstance.get("/api/wishlist/");

        const items = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        const existingItem = items.find(
          (item) => Number(item.product?.id) === Number(product.id)
        );

        setWishlistItemId(existingItem?.id || null);
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    fetchWishlistStatus();
  }, [product?.id, isAuthenticated, isCustomer]);

  // FETCH REVIEWS
  const fetchReviews = async () => {
    try {
      setReviewLoading(true);
      setReviewError("");

      const response = await axiosInstance.get(
        `/products/${id}/reviews/`
      );

      setReviews(response.data);
    } catch (err) {
      console.error("Review fetch error:", err);
      setReviewError("Unable to load reviews.");
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  // IMAGE URL
  const getImageUrl = (image) => {
    if (!image?.image) return "";

    if (image.image.startsWith("http")) {
      return image.image;
    }

    return `http://127.0.0.1:8000${image.image}`;
  };

  // COLOR SWATCH
  const getColorStyle = (variant) => {
    return {
      backgroundColor: variant?.color_code || "#CCCCCC",
    };
  };

  // ADD TO CART
  const handleAddToCart = async () => {
    if (!isAuthenticated || !isCustomer) {
      if (onLoginClick) {
        onLoginClick();
      } else {
        navigate("/login", {
          state: { from: location },
        });
      }
      return;
    }

    if (!selectedVariant) {
      setCartMessage("Please select a product variant.");
      return;
    }

    if (Number(selectedVariant.stock) <= 0) {
      setCartMessage("This variant is currently out of stock.");
      return;
    }

    if (quantity > Number(selectedVariant.stock)) {
      setCartMessage(
        "Selected quantity is not available in stock."
      );
      return;
    }

    try {
      setAddingToCart(true);
      setCartMessage("");

      const response = await axiosInstance.post(
        "/api/cart/add/",
        {
          variant: selectedVariant.id,
          quantity: quantity,
        }
      );

      setCartMessage(
        response.data.message ||
          "Product added to cart successfully."
      );

      if (refreshCartCount) {
        await refreshCartCount();
      }
    } catch (err) {
      console.error("Add to cart error:", err);

      setCartMessage(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Unable to add product to cart."
      );
    } finally {
      setAddingToCart(false);
    }
  };

  // ADD OR REMOVE FROM WISHLIST
  const handleWishlistToggle = async () => {
    if (!isAuthenticated || !isCustomer) {
      if (onLoginClick) {
        onLoginClick();
      } else {
        navigate("/login", {
          state: { from: location },
        });
      }
      return;
    }

    try {
      setWishlistLoading(true);
      setWishlistMessage("");

      if (wishlistItemId) {
        await axiosInstance.delete(
          `/api/wishlist/${wishlistItemId}/`
        );

        setWishlistItemId(null);
        setWishlistMessage("Removed from wishlist.");
      } else {
        const response = await axiosInstance.post(
          "/api/wishlist/",
          {
            product_id: product.id,
          }
        );

        setWishlistItemId(response.data.id);
        setWishlistMessage("Added to wishlist.");
      }

      if (refreshWishlistCount) {
        await refreshWishlistCount();
      }
    } catch (error) {
      console.error("Wishlist error:", error);

      setWishlistMessage(
        error.response?.data?.product_id?.[0] ||
          error.response?.data?.detail ||
          "Unable to update wishlist."
      );
    } finally {
      setWishlistLoading(false);
    }
  };

  // BUY NOW
  const handleBuyNow = () => {
    if (!isAuthenticated || !isCustomer) {
      if (onLoginClick) {
        onLoginClick();
      } else {
        navigate("/login", {
          state: { from: location },
        });
      }
      return;
    }

    if (!selectedVariant) {
      setCartMessage("Please select a product variant.");
      return;
    }

    if (Number(selectedVariant.stock) <= 0) {
      setCartMessage("This variant is currently out of stock.");
      return;
    }

    if (quantity > Number(selectedVariant.stock)) {
      setCartMessage(
        "Selected quantity is not available in stock."
      );
      return;
    }

    setCartMessage("");

    navigate("/checkout", {
      state: {
        buyNow: true,
        productId: product.id,
        product: product,
        variant: selectedVariant,
        variantId: selectedVariant.id,
        quantity: quantity,
      },
    });
  };

  // OPEN REVIEW FORM
  const handleWriteReview = () => {
    if (!isCustomer) {
      if (onLoginClick) {
        onLoginClick();
      } else {
        navigate("/login", {
          state: { from: location },
        });
      }
      return;
    }

    const myReview = reviews.find(
      (review) => review.is_owner
    );

    if (myReview) {
      handleEditReview(myReview);
      return;
    }

    setEditingReviewId(null);
    setRating(0);
    setComment("");
    setReviewMessage("");
    setShowReviewForm(true);
  };

  // SUBMIT OR UPDATE REVIEW
  const handleReviewSubmit = async (e) => {
    e.preventDefault();

    if (!isCustomer) {
      handleWriteReview();
      return;
    }

    if (rating === 0) {
      setReviewMessage("Please select a star rating.");
      return;
    }

    if (!comment.trim()) {
      setReviewMessage("Please enter your review comment.");
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewMessage("");

      const reviewData = {
        rating,
        comment: comment.trim(),
      };

      if (editingReviewId) {
        await axiosInstance.patch(
          `/products/reviews/${editingReviewId}/`,
          reviewData
        );

        setReviewMessage("Review updated successfully.");
      } else {
        await axiosInstance.post(
          `/products/${id}/reviews/`,
          reviewData
        );

        setReviewMessage("Review submitted successfully.");
      }

      setComment("");
      setRating(0);
      setEditingReviewId(null);

      await fetchReviews();

      setShowReviewForm(false);
    } catch (err) {
      console.error("Review submit error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Unable to submit review.";

      setReviewMessage(message);
    } finally {
      setSubmittingReview(false);
    }
  };

  // EDIT REVIEW
  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
    setReviewMessage("");
    setShowReviewForm(true);

    setTimeout(() => {
      document
        .getElementById("review-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  };

  // DELETE REVIEW
  const handleDeleteReview = async (reviewId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this review?"
    );

    if (!confirmed) return;

    try {
      await axiosInstance.delete(
        `/products/reviews/${reviewId}/`
      );

      setReviews((prev) =>
        prev.filter((review) => review.id !== reviewId)
      );

      if (editingReviewId === reviewId) {
        setEditingReviewId(null);
        setComment("");
        setRating(0);
        setShowReviewForm(false);
      }

      setReviewMessage("Review deleted successfully.");
    } catch (err) {
      console.error("Review delete error:", err);

      setReviewMessage(
        err.response?.data?.message ||
          "Unable to delete review."
      );
    }
  };

  // CANCEL REVIEW FORM
  const cancelReviewEdit = () => {
    setEditingReviewId(null);
    setRating(0);
    setComment("");
    setReviewMessage("");
    setShowReviewForm(false);
  };

  // AVERAGE RATING
  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (total, review) =>
              total + Number(review.rating),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";

  // LOADING
  if (loading && !product) {
    return (
      <div className="detail-message">
        Loading product details...
      </div>
    );
  }

  // ERROR
  if (error || !product) {
    return (
      <div className="detail-message">
        {error || "Product not found."}

        <button onClick={() => navigate("/products")}>
          Back to Products
        </button>
      </div>
    );
  }

  // VARIANTS AND IMAGES
  const variants = product.variants || [];
  const allImages = product.images || [];

  // PRODUCT-LEVEL IMAGES
  const productImages = allImages.filter(
    (image) =>
      image.variant === null ||
      image.variant === undefined ||
      image.variant === ""
  );

  // SELECTED VARIANT IMAGES
  const variantImages = selectedVariant
    ? allImages.filter((image) => {
        const variantId =
          typeof image.variant === "object"
            ? image.variant?.id
            : image.variant;

        return (
          Number(variantId) === Number(selectedVariant.id)
        );
      })
    : [];

  // SHOW VARIANT IMAGES FIRST
  const images =
    variantImages.length > 0
      ? variantImages
      : productImages;

  const currentPrice = selectedVariant
    ? Number(selectedVariant.price)
    : null;

  const currentStock = selectedVariant
    ? Number(selectedVariant.stock)
    : 0;

  const myReview = reviews.find(
    (review) => review.is_owner
  );

  return (
    <div className="product-detail-page">

      {/* BACK TO PRODUCTS */}
      <div className="detail-back-section">
        <button
          className="back-to-products-btn"
          onClick={() => navigate("/products")}
        >
          ← Back to Products
        </button>
      </div>

      {/* PRODUCT DETAILS */}
      <main className="detail-container">

        {/* IMAGES */}
        <section className="detail-images">
          <div className="main-product-image">
            {images.length > 0 &&
            getImageUrl(images[selectedImage]) ? (
              <img
                src={getImageUrl(images[selectedImage])}
                alt={
                  images[selectedImage].alt_text ||
                  product.name
                }
              />
            ) : (
              <div className="detail-image-placeholder">
                HomeNest
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="detail-thumbnail-list">
              {images.map((image, index) => (
                <button
                  key={image.id || index}
                  className={
                    selectedImage === index
                      ? "selected"
                      : ""
                  }
                  onClick={() => setSelectedImage(index)}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={
                      image.alt_text || product.name
                    }
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* PRODUCT INFORMATION */}
        <section className="detail-information">

          <p className="detail-category">
            {product.category}
          </p>

          <h1>{product.name}</h1>

          <p className="detail-description">
            {product.description}
          </p>

          <div className="detail-meta">
            <p>
              <strong>Material:</strong>{" "}
              {product.material || "Not specified"}
            </p>

            <p>
              <strong>Rooms:</strong>{" "}
              {product.rooms?.join(", ") || "Not specified"}
            </p>
          </div>

          {/* VARIANTS */}
          {variants.length > 0 ? (
            <div className="variant-section">

              {/* SIZE SELECTION */}
              
              <div className="variant-size-list">
  {[
    ...new Map(
      variants
        .filter((v) => v.size?.trim())
        .map((v) => [
          v.size.trim().toLowerCase(),
          v.size.trim(),
        ])
    ).values(),
  ].map((size) => {
    const sizeVariants = variants.filter(
      (v) =>
        v.size?.trim().toLowerCase() ===
        size.toLowerCase()
    );

    const matchingVariant =
      sizeVariants.find(
        (v) =>
          v.color?.trim().toLowerCase() ===
            selectedVariant?.color?.trim().toLowerCase() &&
          Number(v.stock) > 0
      ) ||
      sizeVariants.find((v) => Number(v.stock) > 0) ||
      sizeVariants[0];

    const allOutOfStock = sizeVariants.every(
      (v) => Number(v.stock) <= 0
    );

    return (
      <button
        key={size}
        type="button"
        className={`variant-size-option ${
          selectedVariant?.size?.trim().toLowerCase() ===
          size.toLowerCase()
            ? "selected"
            : ""
        } ${allOutOfStock ? "out-of-stock" : ""}`}
        onClick={() => {
          if (matchingVariant) {
            setSelectedVariant(matchingVariant);
            setSelectedImage(0);
            setQuantity(1);
            setCartMessage("");
          }
        }}
      >
        {size}
      </button>
    );
  })}
</div>

              {/* COLOR SELECTION */}
              <div className="variant-color-section">
                <h3>Select Color</h3>

                <div className="variant-color-list">
                  {[
                    ...new Map(
                      variants
                        .filter(
                          (v) =>
                            v.size?.trim().toLowerCase() ===
                              selectedVariant?.size?.trim().toLowerCase() &&
                            v.color?.trim()
                        )
                        .map((v) => [
                          v.color.trim().toLowerCase(),
                          v.color.trim(),
                        ])
                    ).values(),
                  ].map((color) => {

                    const matchingVariant = variants.find(
                      (v) =>
                        v.size?.trim().toLowerCase() ===
                          selectedVariant?.size?.trim().toLowerCase() &&
                        v.color?.trim().toLowerCase() ===
                          color.toLowerCase()
                    );

                    const stock = Number(
                      matchingVariant?.stock || 0
                    );

                    const stockClass =
                      stock <= 0
                        ? "out-of-stock"
                        : stock <= 5
                        ? "low-stock"
                        : "";

                    return (
                      <button
                        key={color}
                        type="button"
                        title={`${color} - ${
                          stock <= 0
                            ? "Out of Stock"
                            : stock <= 5
                            ? `Only ${stock} left`
                            : "Available"
                        }`}
                        aria-label={`Select ${color}`}
                        className={`variant-color-option ${
                          selectedVariant?.color?.trim().toLowerCase() ===
                          color.toLowerCase()
                            ? "selected"
                            : ""
                        } ${stockClass}`}
                        onClick={() => {
                          if (matchingVariant) {
                            setSelectedVariant(matchingVariant);
                            setSelectedImage(0);
                            setQuantity(1);
                            setCartMessage("");
                          }
                        }}
                      >
                        <span
                          className="variant-color-swatch"
                          style={getColorStyle(matchingVariant)}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <p>No variants available.</p>
          )}

          {/* PRICE AND CART ACTIONS */}
          {selectedVariant && (
            <>

              <h2 className="detail-price">
                ₹{currentPrice.toLocaleString("en-IN")}
              </h2>

              {/* SELECTED VARIANT STOCK STATUS */}
              <p
                className={`detail-stock ${
                  currentStock <= 0
                    ? "out-of-stock"
                    : currentStock <= 5
                    ? "low-stock"
                    : "available"
                }`}
              >
                {currentStock <= 0
                  ? "Out of Stock"
                  : currentStock <= 5
                  ? `Only ${currentStock} left!`
                  : "Available"}
              </p>

              {/* QUANTITY */}
              {currentStock > 0 && (
                <div className="quantity-section">
                  <label>Quantity:</label>

                  <button
                    onClick={() =>
                      setQuantity((prev) =>
                        Math.max(1, prev - 1)
                      )
                    }
                    disabled={quantity <= 1}
                  >
                    −
                  </button>

                  <span>{quantity}</span>

                  <button
                    onClick={() =>
                      setQuantity((prev) =>
                        Math.min(currentStock, prev + 1)
                      )
                    }
                    disabled={quantity >= currentStock}
                  >
                    +
                  </button>
                </div>
              )}

              {/* TOTAL AMOUNT */}
              <div className="detail-total">
                <span>Total Amount:</span>

                <strong>
                  ₹{(currentPrice * quantity).toLocaleString("en-IN")}
                </strong>
              </div>

              {/* ACTION BUTTONS */}
              <div className="detail-actions">

                <button
                  className="detail-cart-btn"
                  disabled={
                    currentStock <= 0 ||
                    addingToCart ||
                    !selectedVariant
                  }
                  onClick={handleAddToCart}
                >
                  {addingToCart
                    ? "Adding..."
                    : "Add to Cart"}
                </button>

                <button
                  className="detail-buy-btn"
                  disabled={
                    currentStock <= 0 ||
                    addingToCart ||
                    !selectedVariant
                  }
                  onClick={handleBuyNow}
                >
                  {addingToCart
                    ? "Please wait..."
                    : "Buy Now"}
                </button>

                <button
                  className="detail-wishlist-btn"
                  onClick={handleWishlistToggle}
                  disabled={wishlistLoading}
                >
                  {wishlistLoading
                    ? "Please wait..."
                    : wishlistItemId
                    ? "♥ Remove from Wishlist"
                    : "♡ Add to Wishlist"}
                </button>

              </div>

              {wishlistMessage && (
                <p className="cart-feedback-message" role="status">
                  {wishlistMessage}
                </p>
              )}

              {cartMessage && (
                <p
                  className="cart-feedback-message"
                  role="status"
                >
                  {cartMessage}
                </p>
              )}

              {/* DELIVERY AND OFFERS INFORMATION */}
              <div className="delivery-offers-section">

                <div className="delivery-offer-item">
                  <span className="delivery-offer-icon">
                    🚚
                  </span>

                  <div>
                    <h4>Shipping Information</h4>

                    <p>
                      Free shipping on orders above ₹2,000.
                      Orders of ₹2,000 or below have a
                      shipping charge of ₹50.
                    </p>
                  </div>
                </div>

                <div className="delivery-offer-item">
                  <span className="delivery-offer-icon">
                    🏷️
                  </span>

                  <div>
                    <h4>Available Offers</h4>

                    <p>
                      Applicable coupons can be viewed and
                      applied at checkout.
                    </p>
                  </div>
                </div>

                <p className="delivery-offer-note">
                  * Shipping charges are calculated based
                  on the total order value.
                </p>

              </div>

            </>
          )}

        </section>
      </main>

      {/* CUSTOMER REVIEWS */}
      <section className="reviews-section">

        <div className="reviews-heading">
          <p className="reviews-eyebrow">
            CUSTOMER FEEDBACK
          </p>

          <h2>Customer Reviews</h2>

          <p>
            See what customers think about this product.
          </p>
        </div>

        {/* RATING SUMMARY */}
        <div className="rating-summary">

          <div className="average-rating">
            <strong>{averageRating}</strong>

            <div className="rating-stars">
              {"★".repeat(
                Math.round(Number(averageRating))
              )}
              {"☆".repeat(
                5 - Math.round(Number(averageRating))
              )}
            </div>

            <span>
              {reviews.length}{" "}
              {reviews.length === 1
                ? "Review"
                : "Reviews"}
            </span>
          </div>

          <div className="rating-summary-text">
            <h3>Customer experience matters</h3>

            <p>
              Your feedback helps other customers make better
              shopping decisions.
            </p>
          </div>

        </div>

        {/* WRITE REVIEW BUTTON AND FORM */}
        <div className="review-form-wrapper">

          <button
            type="button"
            className="write-review-toggle-btn"
            onClick={() => {
              if (!isCustomer) {
                handleWriteReview();
                return;
              }

              if (showReviewForm) {
                cancelReviewEdit();
                return;
              }

              if (myReview) {
                handleEditReview(myReview);
              } else {
                handleWriteReview();
              }
            }}
          >
            {showReviewForm
              ? "Close Review Form"
              : myReview
              ? "Edit Your Review"
              : "Write a Review"}
          </button>

          {showReviewForm && (
            <div
              className="review-form-card"
              id="review-form"
            >

              <h3>
                {editingReviewId
                  ? "Edit Your Review"
                  : "Write a Review"}
              </h3>

              <form onSubmit={handleReviewSubmit}>

                <label className="review-label">
                  Your Rating
                </label>

                <div className="review-star-picker">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      className={
                        star <= rating ? "active" : ""
                      }
                      onClick={() => setRating(star)}
                      aria-label={`Rate ${star} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>

                <label
                  className="review-label"
                  htmlFor="review-comment"
                >
                  Your Review
                </label>

                <textarea
                  id="review-comment"
                  value={comment}
                  onChange={(e) =>
                    setComment(e.target.value)
                  }
                  placeholder="Share your experience with this product..."
                  maxLength={1000}
                  rows={4}
                  required
                />

                <div className="review-form-footer">

                  <span>
                    {comment.length}/1000 characters
                  </span>

                  <div>
                    <button
                      type="button"
                      className="review-cancel-btn"
                      onClick={cancelReviewEdit}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="review-submit-btn"
                      disabled={submittingReview}
                    >
                      {submittingReview
                        ? "Submitting..."
                        : editingReviewId
                        ? "Update Review"
                        : "Submit Review"}
                    </button>
                  </div>

                </div>
              </form>
            </div>
          )}

          {reviewMessage && (
            <p
              className="review-feedback-message"
              role="status"
            >
              {reviewMessage}
            </p>
          )}

        </div>

        {/* REVIEW LIST */}
        <div className="review-list-section">

          <h3>What Customers Say</h3>

          {reviewLoading ? (
            <p className="review-status">
              Loading reviews...
            </p>
          ) : reviewError ? (
            <p className="review-status">
              {reviewError}
            </p>
          ) : reviews.length === 0 ? (
            <div className="no-reviews">
              <span>☆</span>

              <h4>No reviews yet</h4>

              <p>
                Be the first to share your experience!
              </p>
            </div>
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                <article
                  className="review-card"
                  key={review.id}
                >

                  <div className="review-card-top">

                    <div className="review-customer-info">

                      <div className="review-avatar">
                        {(review.user_name || "C")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <h4>
                          {review.user_name || "Customer"}
                        </h4>

                        <span>
                          {new Date(
                            review.created_at
                          ).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                      </div>

                    </div>

                    <div className="review-card-rating">
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </div>

                  </div>

                  <p className="review-comment">
                    {review.comment}
                  </p>

                  {review.is_owner && (
                    <div className="review-owner-actions">
                      <button
                        onClick={() =>
                          handleEditReview(review)
                        }
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          handleDeleteReview(review.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}

                </article>
              ))}
            </div>
          )}

        </div>

      </section>

    </div>
  );
}

export default ProductDetail;
