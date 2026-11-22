
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import axiosInstance from "../services/axiosInstance";


import "./Wishlist.css";

function Wishlist({
  isAuthenticated,
  refreshCartCount,
  onLoginClick,
  
}) {
  const navigate = useNavigate();

  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [itemMessages, setItemMessages] = useState({});
  const [addingItem, setAddingItem] = useState(null);

  // Get product price
  const getProductPrice = (product) => {
    if (
      product.starting_price !== null &&
      product.starting_price !== undefined
    ) {
      return Number(product.starting_price);
    }

    const variants = product.variants || [];

    if (variants.length === 0) {
      return 0;
    }

    const prices = variants
      .map((variant) => Number(variant.price))
      .filter((price) => !Number.isNaN(price));

    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  // Fetch Wishlist
  const fetchWishlist = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axiosInstance.get("/api/wishlist/");
      const data = response.data;

      if (Array.isArray(data)) {
        setWishlistItems(data);
      } else if (Array.isArray(data.results)) {
        setWishlistItems(data.results);
      } else if (Array.isArray(data.items)) {
        setWishlistItems(data.items);
      } else {
        setWishlistItems([]);
      }
    } catch (err) {
      console.error("Wishlist loading error:", err);
      setError("Unable to load your wishlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Remove Wishlist Item
  const handleRemove = async (itemId) => {
    try {
      await axiosInstance.delete(`/api/wishlist/${itemId}/`);

      setWishlistItems((previousItems) =>
        previousItems.filter((item) => item.id !== itemId)
      );
    } catch (err) {
      console.error("Wishlist remove error:", err);
      alert("Unable to remove this product. Please try again.");
    }
  };

  // Add to Cart
  const handleAddToCart = async (item) => {
    const product = item.product;

    if (!isAuthenticated) {
      if (onLoginClick) {
        onLoginClick();
      } else {
        navigate("/login");
      }
      return;
    }

    const variants = product.variants || [];

    if (variants.length === 0) {
      setItemMessages((previous) => ({
        ...previous,
        [item.id]: "No variants available for this product.",
      }));
      return;
    }

    // Select first available variant
    const selectedVariant = variants.find(
      (variant) => Number(variant.stock) > 0
    );

    if (!selectedVariant) {
      setItemMessages((previous) => ({
        ...previous,
        [item.id]: "This product is currently out of stock.",
      }));
      return;
    }

    try {
      setAddingItem(item.id);

      setItemMessages((previous) => ({
        ...previous,
        [item.id]: "",
      }));

      // Step 1: Add product to Cart
      const response = await axiosInstance.post(
        "/api/cart/add/",
        {
          variant: selectedVariant.id,
          quantity: 1,
        }
      );

      // Step 2: Remove product from Wishlist
      try {
        await axiosInstance.delete(`/api/wishlist/${item.id}/`);

        setWishlistItems((previousItems) =>
          previousItems.filter(
            (wishlistItem) => wishlistItem.id !== item.id
          )
        );

        setItemMessages((previous) => ({
          ...previous,
          [item.id]: "Added to cart successfully!",
        }));
      } catch (wishlistError) {
        console.error("Wishlist removal error:", wishlistError);

        setItemMessages((previous) => ({
          ...previous,
          [item.id]:
            "Added to cart, but unable to remove from wishlist.",
        }));
      }

      // Step 3: Refresh Cart Count
      if (refreshCartCount) {
        await refreshCartCount();
      }

    } catch (err) {
      console.error("Add to cart error:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Unable to add this product to cart.";

      setItemMessages((previous) => ({
        ...previous,
        [item.id]: message,
      }));
    } finally {
      setAddingItem(null);
    }
  };

  return (
    <div className="wishlist-page">

      

      <main className="wishlist-container">

        {/* Heading */}
        <div className="wishlist-heading">
          <div>
            <p className="wishlist-eyebrow">YOUR COLLECTION</p>
            <h1>My Wishlist</h1>
            <p>Products you have saved for later.</p>
          </div>

          <div className="wishlist-heading-actions">
            <span className="wishlist-item-count">
              {wishlistItems.length} Items
            </span>

            <Link
              to="/products"
              className="wishlist-continue-button"
            >
              <span>Continue Shopping</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="wishlist-message">
            Loading your wishlist...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="wishlist-message wishlist-error">
            {error}
            <button onClick={fetchWishlist}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty Wishlist */}
        {!loading && !error && wishlistItems.length === 0 && (
          <div className="wishlist-empty">
            <div className="wishlist-empty-icon">♡</div>

            <h2>Your Wishlist is Empty</h2>

            <p>
              You haven't saved any products yet.
              Explore our collection and save your favourites.
            </p>

            <Link
              to="/products"
              className="wishlist-explore-button"
            >
              Explore Products
            </Link>
          </div>
        )}

        {/* Wishlist Products */}
        {!loading && !error && wishlistItems.length > 0 && (
          <div className="wishlist-grid">

            {wishlistItems.map((item) => {
              const product = item.product;

              const productImage =
                product.images?.[0]?.image || null;

              const price = getProductPrice(product);

              return (
                <div
                  className="wishlist-card"
                  key={item.id}
                >

                  {/* Product Image */}
                  <div className="wishlist-image-wrapper">
                    <Link to={`/products/${product.id}`}>
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.name}
                          className="wishlist-product-image"
                        />
                      ) : (
                        <div className="wishlist-no-image">
                          No Image Available
                        </div>
                      )}
                    </Link>
                  </div>

                  {/* Product Information */}
                  <div className="wishlist-card-content">

                    <p className="wishlist-category">
                      {product.category?.name || "Home Essentials"}
                    </p>

                    <h3>
                      <Link
                        to={`/products/${product.id}`}
                        className="wishlist-product-link"
                      >
                        {product.name}
                      </Link>
                    </h3>

                    {/* Price and Remove Button */}
                    <div className="wishlist-price-row">

                      <p className="wishlist-price">
                        ₹{price.toLocaleString("en-IN")}
                      </p>

                      <button
                        className="wishlist-remove-button"
                        onClick={() => handleRemove(item.id)}
                        title="Remove from Wishlist"
                        aria-label="Remove from Wishlist"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="19"
                          height="19"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v5M14 11v5" />
                        </svg>
                      </button>

                    </div>

                    {/* Add to Cart */}
                    <button
                      className="wishlist-cart-button"
                      onClick={() => handleAddToCart(item)}
                      disabled={addingItem === item.id}
                    >
                      {addingItem === item.id
                        ? "Adding..."
                        : "Add to Cart"}
                    </button>

                    {/* Feedback */}
                    {itemMessages[item.id] && (
                      <p className="wishlist-cart-message">
                        {itemMessages[item.id]}
                      </p>
                    )}

                  </div>
                </div>
              );
            })}

          </div>
        )}

      </main>
    </div>
  );
}

export default Wishlist;
