
import { useNavigate, useLocation } from "react-router-dom";
import "../pages/ProductList.css";

function CustomerHeader({
  isAuthenticated,
  onProfileClick,
  onLogout,
  onLoginClick,
  onRegisterClick,
  cartCount = 0,
  wishlistCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleWishlistClick = () => {
    if (isAuthenticated) {
      navigate("/wishlist");
    } else {
      navigate("/login", {
        state: { from: location },
      });
    }
  };

  const handleCartClick = () => {
    if (isAuthenticated) {
      navigate("/cart");
    } else {
      navigate("/login", {
        state: { from: location },
      });
    }
  };

  // My Orders Navigation
  const handleMyOrdersClick = () => {
    if (isAuthenticated) {
      navigate("/my-orders");
    } else {
      navigate("/login", {
        state: { from: location },
      });
    }
  };

  return (
    <header className="product-header">
      <div
        className="product-logo"
        onClick={() => navigate("/")}
        role="button"
        tabIndex={0}
      >
        HomeNest
      </div>

      <div className="product-header-actions">

        {/* Home */}
        <button
          className="header-icon-btn"
          onClick={() => navigate("/")}
          title="Home"
          aria-label="Home"
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 10.5L12 3l9 7.5" />
            <path d="M5.5 9.5V21h13V9.5" />
            <path d="M9.5 21v-7h5v7" />
          </svg>
        </button>

        {/* Wishlist */}
        <button
          className="header-icon-btn"
          onClick={handleWishlistClick}
          title="Wishlist"
          aria-label={`Wishlist, ${wishlistCount} items`}
        >
          <svg viewBox="0 0 24 24">
            <path d="M20.8 8.8c0 5.2-8.8 11-8.8 11s-8.8-5.8-8.8-11a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7Z" />
          </svg>

          {isAuthenticated && (
            <span className="icon-count">
              {wishlistCount}
            </span>
          )}
        </button>

        {/* My Orders */}
        <button
          className="header-icon-btn"
          onClick={handleMyOrdersClick}
          title="My Orders"
          aria-label="My Orders"
        >
          <svg viewBox="0 0 24 24">
            <path d="M6 3h12a2 2 0 0 1 2 2v16H4V5a2 2 0 0 1 2-2Z" />
            <path d="M8 8h8" />
            <path d="M8 12h8" />
            <path d="M8 16h5" />
          </svg>
        </button>

        {/* Cart */}
        <button
          className="header-icon-btn"
          onClick={handleCartClick}
          title="Cart"
          aria-label={`Cart, ${cartCount} items`}
        >
          <svg viewBox="0 0 24 24">
            <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H6" />
            <circle cx="10" cy="21" r="1" />
            <circle cx="18" cy="21" r="1" />
          </svg>

          {isAuthenticated && (
            <span className="icon-count">
              {cartCount}
            </span>
          )}
        </button>

        {/* Authenticated Customer */}
        {isAuthenticated ? (
          <>
            <button
              className="header-icon-btn"
              onClick={onProfileClick}
              title="Profile"
              aria-label="Profile"
            >
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </button>

            <button
              className="header-icon-btn"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
            >
              <svg viewBox="0 0 24 24">
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <button
              className="header-icon-btn"
              onClick={onLoginClick}
            >
              Sign In
            </button>

            <button
              className="header-icon-btn"
              onClick={onRegisterClick}
            >
              Sign Up
            </button>
          </>
        )}

      </div>
    </header>
  );
}

export default CustomerHeader;
