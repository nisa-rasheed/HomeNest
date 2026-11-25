
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

import "./Cart.css";

function Cart({ refreshCartCount }) {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState(null);
  const [error, setError] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  // LOAD CART
  const fetchCart = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError("");

      const response = await axiosInstance.get("/api/cart/");
      setCart(response.data);

      const latestItems = response.data?.items || [];

      setSelectedItemIds((previous) =>
        previous.filter((id) =>
          latestItems.some((item) => item.id === id)
        )
      );
    } catch (err) {
      console.error("Cart loading error:", err);

      setError(
        err.response?.data?.detail ||
        "Unable to load your cart. Please try again."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const items = cart?.items || [];
  useEffect(() => {
  console.log(
    "CART ORDER:",
    items.map((item) => ({
      id: item.id,
      name: item.product_name,
      quantity: item.quantity,
    }))
  );
}, [items]);

  // SELECT / DESELECT SINGLE PRODUCT
  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((previous) =>
      previous.includes(itemId)
        ? previous.filter((id) => id !== itemId)
        : [...previous, itemId]
    );
  };

  // SELECTED PRODUCTS
  const selectedItems = items.filter((item) =>
    selectedItemIds.includes(item.id)
  );

  // SELECT ALL
  const allSelected =
    items.length > 0 &&
    items.every((item) => selectedItemIds.includes(item.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(items.map((item) => item.id));
    }
  };

  // SELECTED QUANTITY
  const selectedItemCount = selectedItems.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  // TOTAL CART QUANTITY
  const itemCount = items.reduce(
    (total, item) => total + Number(item.quantity),
    0
  );

  // SELECTED SUBTOTAL
  const selectedSubtotal = selectedItems.reduce(
    (total, item) =>
      total + Number(item.price) * Number(item.quantity),
    0
  );

  // SHIPPING FOR SELECTED PRODUCTS
  const shippingCharge =
    selectedItems.length === 0
      ? 0
      : selectedSubtotal > 2000
      ? 0
      : 50;

  const estimatedTotal = selectedSubtotal + shippingCharge;

  // FORMAT PRICE
  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // IMAGE URL
  const getImageUrl = (image) => {
    if (!image) return "";

    return image.startsWith("http")
      ? image
      : `http://127.0.0.1:8000${image}`;
  };

  
 
const updateQuantity = async (item, newQuantity) => {
  if (newQuantity < 1) return;

  try {
    setUpdatingItem(item.id);
    setError("");

    const response = await axiosInstance.patch(
      `/api/cart/update/${item.id}/`,
      { quantity: newQuantity }
    );

    const updatedCart = response.data.cart;
    console.log("UPDATED CART:", updatedCart.items.map(item => ({
  id: item.id,
  name: item.product_name,
  quantity: item.quantity
})));

    setCart((previousCart) => {
  if (!previousCart) return updatedCart;

  return {
    ...previousCart,
    ...updatedCart,
    items: updatedCart.items,
  };
});

await refreshCartCount();

  } catch (err) {
    console.error("Quantity update error:", err);

    setError(
      err.response?.data?.message ||
      err.response?.data?.detail ||
      err.message ||
      "Unable to update quantity."
    );
  } finally {
    setUpdatingItem(null);
  }
};


    // REMOVE PRODUCT
  const removeItem = async (itemId) => {
    try {
      setUpdatingItem(itemId);
      setError("");

      await axiosInstance.delete(`/api/cart/remove/${itemId}/`);

      setSelectedItemIds((previous) =>
        previous.filter((id) => id !== itemId)
      );

      await fetchCart(false);
      await refreshCartCount();

    } catch (err) {
      console.error("Remove cart item error:", err);

      setError(
        err.response?.data?.message ||
        "Unable to remove this product."
      );
    } finally {
      setUpdatingItem(null);
    }
  };
  
  // PROCEED TO CHECKOUT
  const handleCheckout = () => {
    if (selectedItems.length === 0) {
      setError("Please select at least one product to checkout.");
      return;
    }

    navigate("/checkout", {
      state: {
        buyNow: false,
        selectedCartItemIds: selectedItems.map((item) => item.id),
        selectedItems: selectedItems,
      },
    });
  };

  return (
    <div className="cart-page">

      

      <div className="cart-container">

        {/* BACK TO SHOPPING */}
        <button
          className="cart-back-btn"
          onClick={() => navigate("/products")}
        >
          <svg viewBox="0 0 24 24">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back to Shopping
        </button>

        {/* HEADING */}
        <div className="cart-heading">
          <div>
            <p className="cart-eyebrow">YOUR SHOPPING BAG</p>
            <h1>My Cart</h1>
          </div>

          <span className="cart-count">
            {itemCount} {itemCount === 1 ? "Item" : "Items"}
          </span>
        </div>

        {error && (
          <div className="cart-error">
            {error}
          </div>
        )}

        {/* LOADING */}
        {loading ? (
          <div className="cart-loading">
            <div className="cart-spinner"></div>
            <p>Loading your shopping cart...</p>
          </div>
        ) : items.length === 0 ? (

          /* EMPTY CART */
          <div className="empty-cart-card">

            <div className="empty-cart-icon">
              <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M20 35H80L75 82H25L20 35Z"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
                <path
                  d="M35 38V27C35 18 41 12 50 12C59 12 65 18 65 27V38"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2>Your cart is waiting</h2>

            <p>
              Looks like you haven't added anything yet.
              Explore our collection and find something
              beautiful for your home.
            </p>

            <button
              className="continue-shopping-btn"
              onClick={() => navigate("/products")}
            >
              Explore Products <span>→</span>
            </button>

          </div>
        ) : (

          /* CART WITH PRODUCTS */
          <div className="cart-layout">

            {/* PRODUCT LIST */}
            <div className="cart-items-section">

              <div className="cart-section-heading">
                <h2>Shopping Items</h2>
                <span>{itemCount} items</span>
              </div>

              {/* SELECT ALL */}
              <div className="cart-select-all">
                <label>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />

                  <span>
                    Select All ({items.length} products)
                  </span>
                </label>

                <span>
                  {selectedItems.length} selected
                </span>
              </div>

              {/* PRODUCT CARDS */}
              {items.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);

                return (
                  <div
                    className={`cart-item-card ${
                      isSelected ? "cart-item-selected" : ""
                    }`}
                    key={item.id}
                  >

                    {/* PRODUCT CHECKBOX */}
                    <div className="cart-item-checkbox">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        aria-label={`Select ${item.product_name}`}
                      />
                    </div>

                    {/* PRODUCT IMAGE */}
                    <div className="cart-product-image">
                      {item.product_image ? (
                        <img
                          src={getImageUrl(item.product_image)}
                          alt={item.product_name}
                        />
                      ) : (
                        <div className="cart-no-image">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* PRODUCT DETAILS */}
                    <div className="cart-product-info">

                      <h3>{item.product_name}</h3>

                      <p className="cart-product-variant">
                        Size: {item.size || "N/A"}
                      </p>

                      <p className="cart-product-variant">
                        Color: {item.color || "N/A"}
                      </p>

                      <p className="cart-product-price">
                        {formatPrice(item.price)}
                      </p>

                      <div className="cart-item-actions">

                        {/* QUANTITY */}
                        <div className="quantity-control">
                          <button
                            onClick={() =>
                              updateQuantity(item, Number(item.quantity) - 1)
                            }
                            disabled={
                              updatingItem === item.id ||
                              item.quantity <= 1
                            }
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            onClick={() =>
                              updateQuantity(item, Number(item.quantity) + 1)
                            }
                            disabled={updatingItem === item.id}
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        {/* DELETE */}
                        <button
                          className="remove-cart-btn"
                          onClick={() => removeItem(item.id)}
                          disabled={updatingItem === item.id}
                          title="Remove item"
                          aria-label={`Remove ${item.product_name} from cart`}
                        >
                          <svg viewBox="0 0 24 24">
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5M14 11v5" />
                          </svg>
                        </button>

                      </div>
                    </div>

                    {/* ITEM TOTAL */}
                    <div className="cart-item-total">
                      {formatPrice(
                        Number(item.price) * Number(item.quantity)
                      )}
                    </div>

                  </div>
                );
              })}

            </div>

            {/* ORDER SUMMARY */}
            <aside className="cart-summary">

              <h2>Order Summary</h2>

              <div className="summary-row">
                <span>
                  Selected Items ({selectedItemCount})
                </span>
                <span>{formatPrice(selectedSubtotal)}</span>
              </div>

              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {selectedItems.length === 0
                    ? "—"
                    : shippingCharge === 0
                    ? "FREE"
                    : formatPrice(shippingCharge)}
                </span>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-total">
                <span>Estimated Total</span>
                <strong>
                  {formatPrice(estimatedTotal)}
                </strong>
              </div>

              <p className="summary-note">
                {selectedItems.length === 0
                  ? "Select products to see your order total."
                  : "Final tax, shipping and available discounts will be calculated at checkout."}
              </p>

              <button
                className="checkout-btn"
                onClick={handleCheckout}
                disabled={
                  selectedItems.length === 0 ||
                  updatingItem !== null
                }
              >
                Proceed to Checkout →
              </button>

              {selectedItems.length === 0 && (
                <p className="cart-selection-hint">
                  Please select at least one product.
                </p>
              )}

            </aside>

          </div>
        )}

      </div>
    </div>
  );
}

export default Cart;
