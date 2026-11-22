
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";

import "./Checkout.css";

const EMPTY_SELECTED_CART_IDS = [];

function Checkout({
  isAuthenticated,
  refreshCartCount,
  onBackToCart,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const buyNow = location.state?.buyNow === true;

  const selectedCartItemIds =
    location.state?.selectedCartItemIds ??
    EMPTY_SELECTED_CART_IDS;

  const buyNowProduct = location.state?.product;
  const buyNowVariant = location.state?.variant;
  const buyNowVariantId = location.state?.variantId;
  const buyNowQuantity = Number(location.state?.quantity || 1);

  const [cartItems, setCartItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  // PAYMENT STATES
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState("");

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isCustomer =
    isAuthenticated &&
    sessionStorage.getItem("user_role") === "customer";

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

  // LOAD CART, ADDRESS AND WALLET
  useEffect(() => {
    const loadCheckoutData = async () => {
      try {
        setLoading(true);
        setError("");

        if (!isCustomer) {
          navigate("/login", {
            state: { from: location },
          });
          return;
        }

        // LOAD WALLET BALANCE
        try {
          const walletResponse = await axiosInstance.get(
            "/api/wallet/"
          );

          setWalletBalance(
            Number(walletResponse.data?.wallet?.balance || 0)
          );
        } catch (walletError) {
          console.error(
            "Wallet loading error:",
            walletError
          );
          setWalletBalance(0);
        }

        // LOAD BUY NOW OR CART ITEMS
        if (buyNow) {
          if (
            !buyNowProduct ||
            !buyNowVariant ||
            !buyNowVariantId ||
            buyNowQuantity < 1
          ) {
            setError(
              "Buy Now details are missing. Please try again."
            );
            return;
          }

          setCartItems([]);
        } else {
          const cartResponse = await axiosInstance.get(
            "/api/cart/"
          );

          const items = cartResponse.data?.items || [];

          const selectedItems = items.filter((item) =>
            selectedCartItemIds.some(
              (selectedId) =>
                String(selectedId) === String(item.id)
            )
          );

          setCartItems(selectedItems);
        }

        // LOAD ADDRESSES
        const addressResponse = await axiosInstance.get(
          "/addresses/"
        );

        const addressData = Array.isArray(addressResponse.data)
          ? addressResponse.data
          : addressResponse.data?.results ||
            addressResponse.data?.addresses ||
            [];

        setAddresses(addressData);

        const defaultAddress = addressData.find(
          (address) => address.is_default
        );

        if (defaultAddress) {
          setSelectedAddress(String(defaultAddress.id));
        } else if (addressData.length > 0) {
          setSelectedAddress(String(addressData[0].id));
        }
      } catch (err) {
        console.error("Checkout loading error:", err);

        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "Unable to load checkout details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, []);

  // LOAD AVAILABLE COUPONS
  useEffect(() => {
    if (!isCustomer) return;

    if (buyNow && !buyNowVariantId) return;

    if (!buyNow && selectedCartItemIds.length === 0) return;

    const loadCoupons = async () => {
      try {
        setCouponLoading(true);

        const requestData = buyNow
          ? {
              buy_now: true,
              variant_id: Number(buyNowVariantId),
              quantity: buyNowQuantity,
            }
          : {
              buy_now: false,
              selected_cart_item_ids: selectedCartItemIds.map(Number),
            };

        const response = await axiosInstance.post(
          "/api/coupons/available/",
          requestData
        );

        setAvailableCoupons(response.data?.coupons || []);
      } catch (err) {
        console.error("Coupon loading error:", err);
        setAvailableCoupons([]);
      } finally {
        setCouponLoading(false);
      }
    };

    loadCoupons();
  }, [
    isCustomer,
    buyNow,
    buyNowVariantId,
    buyNowQuantity,
    selectedCartItemIds,
  ]);

  // CHECKOUT ITEMS
  const checkoutItems = buyNow
    ? [
        {
          id: buyNowVariantId,
          product_name: buyNowProduct?.name,
          product_image:
            buyNowProduct?.images?.find((image) => {
              const imageVariant =
                typeof image.variant === "object"
                  ? image.variant?.id
                  : image.variant;

              return (
                Number(imageVariant) === Number(buyNowVariantId) &&
                image.image
              );
            })?.image ||
            buyNowProduct?.images?.find(
              (image) =>
                image.variant === null ||
                image.variant === undefined ||
                image.variant === ""
            )?.image,
          size: buyNowVariant?.size,
          color: buyNowVariant?.color,
          price: buyNowVariant?.price,
          quantity: buyNowQuantity,
        },
      ]
    : cartItems;

  // PRICE CALCULATION
  const subtotal = checkoutItems.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  // SHIPPING
  const estimatedShipping = subtotal > 2000 ? 0 : 50;

  // COUPON DISCOUNT
  const couponDiscount = appliedCoupon
    ? Math.min(
        (subtotal *
          Number(appliedCoupon.discount_percentage)) /
          100,
        Number(appliedCoupon.maximum_discount || 0)
      )
    : 0;

  // ESTIMATED TOTAL
  const estimatedTotal =
    subtotal + estimatedShipping - couponDiscount;

  // COMBINED PAYMENT CALCULATION
  const selectedWalletAmount = Number(walletAmount || 0);

  const remainingRazorpayAmount = Math.max(
    0,
    estimatedTotal - selectedWalletAmount
  );

  // APPLY COUPON
  const handleApplyCoupon = (coupon) => {
    setError("");

    if (subtotal < Number(coupon.minimum_amount)) {
      setError(
        `Minimum purchase of ${formatPrice(
          coupon.minimum_amount
        )} is required for this coupon.`
      );
      return;
    }

    setAppliedCoupon(coupon);
  };

  // REMOVE COUPON
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setError("");
  };

  // ADDRESS DISPLAY
  const selectedAddressData = addresses.find(
    (address) =>
      String(address.id) === String(selectedAddress)
  );

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
          "Payment successful. Your order has been placed."
      );

      if (refreshCartCount) {
        await refreshCartCount();
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // OPEN RAZORPAY CHECKOUT
  const openRazorpay = async (razorpayData, orderData) => {
    const loaded = await loadRazorpay();

    if (!loaded) {
      setError("Unable to load Razorpay. Please try again.");
      setSubmitting(false);
      return;
    }

    if (
      !razorpayData?.key_id ||
      !razorpayData?.razorpay_order_id
    ) {
      setError("Razorpay order details are missing.");
      setSubmitting(false);
      return;
    }

    let failureHandled = false;
    let failureMessage = "";

    const goToPaymentFailed = () => {
      if (failureHandled) return;

      failureHandled = true;
      setSubmitting(false);

      navigate("/payment-failed", {
        state: {
          orderId: orderData?.id,
          amount:
            orderData?.final_amount ??
            Number(razorpayData.amount || 0) / 100,
          message:
            failureMessage ||
            "Payment was not completed. You can try again.",
        },
        replace: true,
      });
    };

    const options = {
      key: razorpayData.key_id,
      amount: razorpayData.amount,
      currency: razorpayData.currency || "INR",
      name: "HomeNest",
      description: "HomeNest Order Payment",
      order_id: razorpayData.razorpay_order_id,

      prefill: {
        name: selectedAddressData?.full_name || "",
        contact: selectedAddressData?.phone || "",
      },

      theme: {
        color: "#174D3A",
      },

      handler: async (paymentResponse) => {
        await verifyRazorpayPayment(paymentResponse);
      },

      modal: {
        ondismiss: () => {
          console.log("RAZORPAY WINDOW CLOSED");
          goToPaymentFailed();
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", (response) => {
      console.log("RAZORPAY PAYMENT FAILED:", response);

      failureMessage =
        response.error?.description ||
        "Payment failed. Please try again.";
    });

    razorpay.open();
  };

  // PLACE ORDER
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setError("Please select a delivery address.");
      return;
    }

    if (checkoutItems.length === 0) {
      setError("There are no products to checkout.");
      return;
    }

    if (
      buyNow &&
      (!buyNowVariantId || buyNowQuantity < 1)
    ) {
      setError("Invalid Buy Now details.");
      return;
    }

    // WALLET + RAZORPAY VALIDATION
    if (paymentMethod === "wallet_razorpay") {
      if (
        !Number.isFinite(selectedWalletAmount) ||
        selectedWalletAmount <= 0
      ) {
        setError("Please enter a valid wallet amount.");
        return;
      }

      if (selectedWalletAmount > walletBalance) {
        setError(
          "Wallet amount cannot exceed your available balance."
        );
        return;
      }

      if (selectedWalletAmount >= estimatedTotal) {
        setError(
          "For combined payment, wallet amount must be less than the order total."
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const orderData = {
        address_id: Number(selectedAddress),
        payment_method: paymentMethod,
      };

      // WALLET AMOUNT FOR COMBINED PAYMENT
      if (paymentMethod === "wallet_razorpay") {
        orderData.wallet_amount = selectedWalletAmount;
      }

      if (!buyNow) {
        if (selectedCartItemIds.length === 0) {
          setError("Please select products from your cart.");
          setSubmitting(false);
          return;
        }

        orderData.selected_cart_item_ids =
          selectedCartItemIds.map(Number);
      }

      if (appliedCoupon) {
        orderData.coupon_code = appliedCoupon.code;
      }

      if (buyNow) {
        orderData.buy_now = true;
        orderData.variant_id = Number(buyNowVariantId);
        orderData.quantity = buyNowQuantity;
      }

      const response = await axiosInstance.post(
        "/api/orders/checkout/",
        orderData
      );

      // RAZORPAY OR WALLET + RAZORPAY
      if (
        paymentMethod === "razorpay" ||
        paymentMethod === "wallet_razorpay"
      ) {
        await openRazorpay(
          response.data?.razorpay,
          response.data?.order
        );
        return;
      }

      // COD OR FULL WALLET PAYMENT
      setSuccess(
        response.data?.message ||
          "Your order has been placed successfully."
      );

      if (refreshCartCount) {
        await refreshCartCount();
      }
    } catch (err) {
      console.error("Place order error:", err);
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  // LOADING
  if (loading) {
    return (
      <div className="checkout-loading">
        Loading checkout...
      </div>
    );
  }

  // SUCCESS
  if (success) {
    return (
      <div className="checkout-success-page">
        <div className="checkout-success-card">
          <div className="success-brand">HOMENEST</div>

          <div className="checkout-success-icon">
            <span>✓</span>
          </div>

          <span className="success-status">
            ORDER CONFIRMED
          </span>

          <h1>Thank You!</h1>

          <h2>Your Order Has Been Placed</h2>

          <p className="success-message">{success}</p>

          {paymentMethod === "cod" && (
            <div className="cod-confirmation-note">
              <span>💳</span>
              <div>
                <strong>Cash on Delivery</strong>
                <p>
                  Please keep the payment ready when
                  your order arrives.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "wallet" && (
            <div className="cod-confirmation-note">
              <span>💚</span>
              <div>
                <strong>HomeNest Wallet</strong>
                <p>
                  Your order has been paid using your wallet balance.
                </p>
              </div>
            </div>
          )}

          {paymentMethod === "wallet_razorpay" && (
            <div className="cod-confirmation-note">
              <span>💳</span>
              <div>
                <strong>Wallet + Razorpay</strong>
                <p>
                  Your combined payment was completed successfully.
                </p>
              </div>
            </div>
          )}

          <div className="success-divider"></div>

          <p className="success-footer-text">
            Thank you for choosing HomeNest.
            We hope you love your purchase!
          </p>

          <button
            className="success-continue-btn"
            onClick={() => navigate("/")}
          >
            Continue Shopping
            <span>→</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <main className="checkout-container">
        <button
          className="checkout-back-btn"
          onClick={() => {
            if (buyNow) {
              navigate(-1);
            } else if (onBackToCart) {
              onBackToCart();
            } else {
              navigate("/cart");
            }
          }}
        >
          ← Back
        </button>

        <div className="checkout-heading">
          <p>HOMENEST</p>
          <h1>Checkout</h1>

          <span>
            {buyNow
              ? "Buy Now – Selected Product"
              : "Complete your order"}
          </span>
        </div>

        {error && (
          <div className="checkout-error" role="alert">
            {error}
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-main">
            {/* DELIVERY ADDRESS */}
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>1</span>

                <div>
                  <h2>Delivery Address</h2>
                  <p>
                    Choose where you want your order delivered.
                  </p>
                </div>
              </div>

              {addresses.length === 0 ? (
                <div className="checkout-empty-address">
                  <p>
                    You haven't added a delivery address yet.
                  </p>

                  <button
                    onClick={() =>
                      navigate("/addresses", {
                        state: {
                          from: "/checkout",
                          checkoutState: location.state,
                        },
                      })
                    }
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="checkout-address-list">
                  {addresses.map((address) => (
                    <label
                      className={
                        String(selectedAddress) ===
                        String(address.id)
                          ? "checkout-address-card selected"
                          : "checkout-address-card"
                      }
                      key={address.id}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        value={address.id}
                        checked={
                          String(selectedAddress) ===
                          String(address.id)
                        }
                        onChange={(e) =>
                          setSelectedAddress(e.target.value)
                        }
                      />

                      <div>
                        <strong>{address.full_name}</strong>

                        {address.is_default && (
                          <span className="default-address-label">
                            Default
                          </span>
                        )}

                        <p>{address.phone}</p>
                        <p>{address.address_line}</p>
                        <p>
                          {address.city}, {address.district}
                        </p>
                        <p>
                          {address.state} - {address.pincode}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {addresses.length > 0 && (
                <button
                  className="checkout-add-address-btn"
                  onClick={() =>
                    navigate("/addresses", {
                      state: {
                        from: "/checkout",
                        checkoutState: location.state,
                      },
                    })
                  }
                >
                  + Manage Addresses
                </button>
              )}
            </section>

            {/* ORDER ITEMS */}
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>2</span>

                <div>
                  <h2>Order Items</h2>
                  <p>
                    {buyNow
                      ? "Only your selected product will be ordered."
                      : "Products added to your shopping cart."}
                  </p>
                </div>
              </div>

              {checkoutItems.length === 0 ? (
                <p className="checkout-empty">
                  Your cart is empty.
                </p>
              ) : (
                <div className="checkout-items">
                  {checkoutItems.map((item, index) => (
                    <div
                      className="checkout-product"
                      key={item.id || index}
                    >
                      <div className="checkout-product-image">
                        {item.product_image ? (
                          <img
                            src={getImageUrl(item.product_image)}
                            alt={item.product_name}
                          />
                        ) : (
                          <span>HomeNest</span>
                        )}
                      </div>

                      <div className="checkout-product-info">
                        <h3>{item.product_name}</h3>
                        <p>Size: {item.size || "N/A"}</p>
                        <p>Color: {item.color || "N/A"}</p>
                        <p>Quantity: {item.quantity}</p>
                      </div>

                      <strong>
                        {formatPrice(
                          Number(item.price) *
                            Number(item.quantity)
                        )}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* PAYMENT METHOD */}
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>3</span>

                <div>
                  <h2>Payment Method</h2>
                  <p>
                    Select your preferred payment option.
                  </p>
                </div>
              </div>

              <div className="checkout-payment-options">
                {/* COD */}
                <label
                  className={
                    paymentMethod === "cod"
                      ? "checkout-payment-option selected"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                  />

                  <div>
                    <strong>Cash on Delivery</strong>
                    <p>Pay when your order arrives.</p>
                  </div>
                </label>

                {/* RAZORPAY */}
                <label
                  className={
                    paymentMethod === "razorpay"
                      ? "checkout-payment-option selected"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="razorpay"
                    checked={paymentMethod === "razorpay"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                  />

                  <div>
                    <strong>Online Payment</strong>
                    <p>Pay securely using Razorpay.</p>
                  </div>
                </label>

                {/* FULL WALLET */}
                <label
                  className={
                    paymentMethod === "wallet"
                      ? "checkout-payment-option selected"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="wallet"
                    checked={paymentMethod === "wallet"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                  />

                  <div>
                    <strong>HomeNest Wallet</strong>
                    <p>
                      Available Balance:{" "}
                      <strong>{formatPrice(walletBalance)}</strong>
                    </p>
                    <p>Pay the full order amount using your wallet.</p>
                  </div>
                </label>

                {/* WALLET + RAZORPAY */}
                <label
                  className={
                    paymentMethod === "wallet_razorpay"
                      ? "checkout-payment-option selected"
                      : "checkout-payment-option"
                  }
                >
                  <input
                    type="radio"
                    name="payment"
                    value="wallet_razorpay"
                    checked={paymentMethod === "wallet_razorpay"}
                    onChange={(e) =>
                      setPaymentMethod(e.target.value)
                    }
                  />

                  <div>
                    <strong>Wallet + Razorpay</strong>
                    <p>
                      Use part of your wallet balance and pay
                      the remaining amount through Razorpay.
                    </p>
                    <p>
                      Available Wallet Balance:{" "}
                      <strong>{formatPrice(walletBalance)}</strong>
                    </p>
                  </div>
                </label>
              </div>

              {/* COMBINED PAYMENT AMOUNT */}
              {paymentMethod === "wallet_razorpay" && (
                <div className="checkout-wallet-selection">
                  <h3>Choose Wallet Amount</h3>

                  <p>
                    Available Balance:{" "}
                    <strong>{formatPrice(walletBalance)}</strong>
                  </p>

                  <label htmlFor="walletAmount">
                    Amount to use from Wallet
                  </label>

                  <input
                    id="walletAmount"
                    type="number"
                    min="0.01"
                    max={walletBalance}
                    step="0.01"
                    placeholder="Enter wallet amount"
                    value={walletAmount}
                    onChange={(e) =>
                      setWalletAmount(e.target.value)
                    }
                  />

                  <p>
                    Remaining amount through Razorpay:{" "}
                    <strong>
                      {formatPrice(remainingRazorpayAmount)}
                    </strong>
                  </p>

                  {selectedWalletAmount > walletBalance && (
                    <p className="checkout-error">
                      Wallet amount cannot exceed your available balance.
                    </p>
                  )}

                  {walletBalance <= 0 && (
                    <p className="checkout-error">
                      Your wallet balance is insufficient for combined payment.
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* ORDER SUMMARY */}
          <aside className="checkout-summary">
            <h2>Order Summary</h2>

            <div className="checkout-summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Estimated Shipping</span>

              <strong>
                {estimatedShipping === 0
                  ? "FREE"
                  : formatPrice(estimatedShipping)}
              </strong>
            </div>

            {/* AVAILABLE COUPONS */}
            <div className="checkout-coupon">
              <h3>Available Coupons</h3>

              {couponLoading ? (
                <p>Loading available coupons...</p>
              ) : availableCoupons.length === 0 ? (
                <p>
                  No available coupons at the moment.
                </p>
              ) : (
                <div className="available-coupons">
                  {availableCoupons.map((coupon) => (
                    <div
                      className="available-coupon-card"
                      key={coupon.id}
                    >
                      <div>
                        <strong>
                          {coupon.discount_percentage}% OFF
                        </strong>

                        <h4>{coupon.code}</h4>
                        <p>{coupon.description}</p>

                        <p>
                          Minimum purchase:{" "}
                          {formatPrice(coupon.minimum_amount)}
                        </p>

                        <p>
                          Maximum discount:{" "}
                          {formatPrice(coupon.maximum_discount)}
                        </p>

                        {coupon.expiry_date && (
                          <p>
                            Valid until:{" "}
                            {new Date(
                              coupon.expiry_date
                            ).toLocaleDateString("en-IN")}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyCoupon(coupon)}
                        disabled={appliedCoupon?.id === coupon.id}
                      >
                        {appliedCoupon?.id === coupon.id
                          ? "Applied"
                          : "Apply"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {appliedCoupon && (
                <div className="applied-coupon">
                  <p>
                    Applied Coupon:{" "}
                    <strong>{appliedCoupon.code}</strong>
                  </p>

                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                  >
                    Remove Coupon
                  </button>
                </div>
              )}
            </div>

            {appliedCoupon && (
              <div className="checkout-summary-row">
                <span>Coupon Discount</span>
                <strong>
                  -{formatPrice(couponDiscount)}
                </strong>
              </div>
            )}

            <p className="checkout-summary-note">
              Final shipping, tax and discount amounts will be
              calculated by the server.
            </p>

            <div className="checkout-summary-total">
              <span>Estimated Total</span>
              <strong>{formatPrice(estimatedTotal)}</strong>
            </div>

            {paymentMethod === "wallet_razorpay" && (
              <>
                <div className="checkout-summary-row">
                  <span>Wallet Amount</span>
                  <strong>
                    -{formatPrice(selectedWalletAmount)}
                  </strong>
                </div>

                <div className="checkout-summary-total">
                  <span>Pay through Razorpay</span>
                  <strong>
                    {formatPrice(remainingRazorpayAmount)}
                  </strong>
                </div>
              </>
            )}

            <button
              className="checkout-place-order-btn"
              onClick={handlePlaceOrder}
              disabled={
                submitting ||
                checkoutItems.length === 0 ||
                addresses.length === 0 ||
                !selectedAddress
              }
            >
              {submitting
                ? "Processing..."
                : paymentMethod === "razorpay" ||
                  paymentMethod === "wallet_razorpay"
                ? "Continue to Payment"
                : "Place Order"}
            </button>

            <p className="checkout-secure-note">
              Secure checkout · Your order details are protected.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}

export default Checkout;
