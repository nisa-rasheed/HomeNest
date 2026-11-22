
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Heart,
  ShoppingCart,
  UserRound,
  LogOut,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  House,
  Tag,
  ClipboardList,
  PackageCheck,
  CreditCard,
} from "lucide-react";

import axiosInstance from "../services/axiosInstance";
import "./Home.css";

function Home({
  isAuthenticated,
  cartCount = 0,
  wishlistCount = 0,
  onCartClick,
  onProfileClick,
  onLogout,
  onLoginClick,
  onRegisterClick,
  onShopNow,
  onRoomClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [categories, setCategories] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(true);

  // Active Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponLoading, setCouponLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Wishlist click
  const handleWishlistClick = () => {
    if (isAuthenticated) {
      navigate("/wishlist");
    } else {
      navigate("/login", {
        state: { from: location },
      });
    }
  };

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axiosInstance.get(
          "/products/categories/"
        );

        const data = response.data;

        setCategories(
          Array.isArray(data) ? data : data.results || []
        );
      } catch (error) {
        console.error("Category fetching error:", error);
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Fetch active coupons
  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const response = await axiosInstance.get(
          "/api/coupons/active/"
        );

        setCoupons(response.data.coupons || []);
      } catch (error) {
        console.error("Coupon fetching error:", error);
        setCoupons([]);
      } finally {
        setCouponLoading(false);
      }
    };

    fetchActiveCoupons();
  }, []);

  // Handle category click
  const handleCategoryClick = (categorySlug) => {
    navigate(
      `/products?category=${encodeURIComponent(categorySlug)}`
    );
  };

  // Handle product search
  const handleSearch = (event) => {
    event.preventDefault();

    const searchValue = searchQuery.trim();

    if (!searchValue) return;

    navigate(
      `/products?search=${encodeURIComponent(searchValue)}`
    );

    setSearchOpen(false);
    setSearchQuery("");
  };

  // Get category image
  const getCategoryImage = (category) => {
    const imagePath = category.image;

    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `http://127.0.0.1:8000${imagePath}`;
  };

  const rooms = [
    {
      name: "Kitchen",
      image:
        "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=600",
    },
    {
      name: "Living Room",
      image:
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600",
    },
    {
      name: "Dining Room",
      image:
        "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600",
    },
    {
      name: "Bedroom",
      image:
        "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600",
    },
    {
      name: "Bathroom",
      image:
        "https://images.unsplash.com/photo-1620626011761-996317b8d101?w=600",
    },
  ];

  return (
    <div className="home-page">

      {/* Announcement */}
      <div className="top-announcement">
        ✨ Make Your Home a Place You Love. ✨
      </div>

      {/* Header */}
      <header className="home-header">

        <div className="brand-logo">
          <House size={27} />
          <span>HomeNest</span>
        </div>

        <nav className={`home-nav ${menuOpen ? "nav-open" : ""}`}>
          <a href="#home" onClick={() => setMenuOpen(false)}>
            Home
          </a>

          <a href="#categories" onClick={() => setMenuOpen(false)}>
            Shop by Category
          </a>

          <a href="#rooms" onClick={() => setMenuOpen(false)}>
            Shop by Room
          </a>

          <a href="#about" onClick={() => setMenuOpen(false)}>
            About
          </a>
        </nav>

        <div className="header-actions">

          <button
            aria-label="Search"
            onClick={() => setSearchOpen((prev) => !prev)}
          >
            {searchOpen ? <X /> : <Search />}
          </button>

          {/* Wishlist */}
          <button
            className="home-wishlist-button"
            aria-label={`Wishlist, ${wishlistCount} items`}
            onClick={handleWishlistClick}
          >
            <Heart />

            {isAuthenticated && (
              <span className="home-wishlist-count">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart */}
          <button
            className="home-cart-button"
            aria-label={`Cart, ${cartCount} items`}
            onClick={onCartClick}
          >
            <ShoppingCart />

            {cartCount > 0 && (
              <span className="home-cart-count">
                {cartCount}
              </span>
            )}
          </button>

          {/* My Orders */}
          {isAuthenticated && (
            <button
              aria-label="My Orders"
              title="My Orders"
              onClick={() => navigate("/my-orders")}
            >
              <ClipboardList />
            </button>
          )}

          {isAuthenticated ? (
            <>
              <button
                aria-label="Profile"
                onClick={onProfileClick}
              >
                <UserRound />
              </button>

              <button
                className="logout-button"
                aria-label="Logout"
                onClick={onLogout}
              >
                <LogOut />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <>
              <button
                className="logout-button"
                onClick={onLoginClick}
              >
                <UserRound />
                <span>Sign In</span>
              </button>

              <button
                className="logout-button"
                onClick={onRegisterClick}
              >
                <span>Sign Up</span>
              </button>
            </>
          )}

        </div>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

      </header>

      {/* Full Width Search Bar */}
      {searchOpen && (
        <form
          className="home-search-panel"
          onSubmit={handleSearch}
        >
          <div className="home-search-inner">

            <Search size={22} />

            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(event.target.value)
              }
              autoFocus
            />

            <button type="submit">
              Search
            </button>

          </div>
        </form>
      )}

      <main>

        {/* Hero Section */}
        <section className="hero-section" id="home">
          <div className="hero-content">

            <p className="hero-subtitle">
              MAKE YOUR HOME A
            </p>

            <h1>
              Place You <span>Love.</span>
            </h1>

            <p className="hero-description">
              Stylish. Comfortable. Affordable.
              <br />
              Everything you need for a beautiful home.
            </p>

            <button
              className="shopping-button"
              onClick={onShopNow}
            >
              <ShoppingCart size={18} />
              Shop Now
              <ArrowRight size={18} />
            </button>

          </div>
        </section>

        
{/* Offers Section */}
<section className="offers-section">

  <div className="offers-heading">
    <p>SPECIAL OFFERS</p>
    <h2>Offers Just for You</h2>
  </div>

  <div className="coupons-container">

    {couponLoading ? (
      <p className="coupon-message">
        Loading offers...
      </p>
    ) : coupons.length === 0 ? (
      <p className="coupon-message">
        No active coupons available right now.
      </p>
    ) : (
      coupons.map((coupon) => (
        <div className="coupon-offer" key={coupon.id}>
          <Tag size={30} />

          <div>
            <h2>{coupon.discount_percentage}% OFF</h2>

            <p>
              Use Coupon: <strong>{coupon.code}</strong>
            </p>

            <small>
              Minimum Order: ₹{coupon.minimum_amount}
              {" | "}
              Maximum Discount: ₹{coupon.maximum_discount}
            </small>
          </div>
        </div>
      ))
    )}

  </div>
</section>

{/* Why Shop With HomeNest */}
<section className="features-section">

  <div className="features-heading">
    <p>THE HOMENEST PROMISE</p>
    <h2>Why Shop With HomeNest?</h2>
  </div>

  <div className="features-grid">

    <div className="feature-item">
      <Truck />
      <div>
        <h3>Shipping Benefits</h3>
        <p>Free shipping on orders above ₹2,000</p>
      </div>
    </div>

    <div className="feature-item">
      <CreditCard />
      <div>
        <h3>Secure Payments</h3>
        <p>Razorpay, Wallet & Cash on Delivery</p>
      </div>
    </div>

    <div className="feature-item">
      <PackageCheck />
      <div>
        <h3>Easy Return Requests</h3>
        <p>Return requests for eligible orders</p>
      </div>
    </div>

    <div className="feature-item">
      <ClipboardList />
      <div>
        <h3>Order Tracking</h3>
        <p>Stay updated on your order status</p>
      </div>
    </div>

    <div className="feature-item">
      <ShieldCheck />
      <div>
        <h3>Secure Shopping</h3>
        <p>Your shopping experience matters to us</p>
      </div>
    </div>

    <div className="feature-item">
      <House />
      <div>
        <h3>Quality Essentials</h3>
        <p>Thoughtfully selected home products</p>
      </div>
    </div>

  </div>
</section>



        {/* Shop by Category */}
        <section className="categories-section" id="categories">

          <div className="section-heading">
            <p>FIND WHAT YOU LOVE</p>
            <h2>Shop by Category</h2>
            <span>
              Explore our collection of beautiful home essentials.
            </span>
          </div>

          {categoryLoading ? (
            <p className="category-message">
              Loading categories...
            </p>
          ) : categories.length === 0 ? (
            <p className="category-message">
              No categories available.
            </p>
          ) : (
            <div className="category-grid">

              {categories.map((category) => (
                <div
                  className="category-card"
                  key={category.id}
                  onClick={() =>
                    handleCategoryClick(category.slug)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" ||
                      event.key === " "
                    ) {
                      event.preventDefault();
                      handleCategoryClick(category.slug);
                    }
                  }}
                >

                  {getCategoryImage(category) ? (
                    <img
                      src={getCategoryImage(category)}
                      alt={category.name}
                    />
                  ) : (
                    <div className="category-image-placeholder">
                      HomeNest
                    </div>
                  )}

                  <div className="category-card-title">
                    <h3>{category.name}</h3>
                    <ArrowRight size={18} />
                  </div>

                </div>
              ))}

            </div>
          )}

        </section>

        {/* Rooms Section */}
        <section className="rooms-section" id="rooms">

          <div className="section-heading">
            <p>EXPLORE HOMENEST</p>
            <h2>Explore Our Rooms</h2>
            <span>
              Find beautiful essentials for every space.
            </span>
          </div>

          <div className="room-grid">
            {rooms.map((room) => (
              <div
                className="room-card"
                key={room.name}
                onClick={() => onRoomClick(room.name)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" ||
                    event.key === " "
                  ) {
                    event.preventDefault();
                    onRoomClick(room.name);
                  }
                }}
              >
                <img
                  src={room.image}
                  alt={`${room.name} interior`}
                />

                <div className="room-card-title">
                  <h3>{room.name}</h3>
                  <ArrowRight size={18} />
                </div>
              </div>
            ))}
          </div>

        </section>

        {/* About Section */}
        <section className="about-section" id="about">

          <p>THE HOMENEST EXPERIENCE</p>

          <h2>
            A Better Home, A Happier You.
          </h2>

          <p>
            HomeNest brings together home and kitchen essentials
            designed to make everyday living more comfortable,
            stylish and beautiful.
          </p>

        </section>

      </main>

      {/* Footer */}
      <footer className="home-footer">

        <div className="brand-logo">
          <House size={24} />
          <span>HomeNest</span>
        </div>

        <p>Make yourself at home.</p>

        <p>© 2026 HomeNest. All rights reserved.</p>

      </footer>

    </div>
  );
}

export default Home;
