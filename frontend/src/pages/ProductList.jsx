import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../services/axiosInstance";
import "./ProductList.css";


function ProductList({
  isAuthenticated,
  refreshCartCount,
  refreshWishlistCount,
  onLoginClick,

}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState("");
  const [room, setRoom] = useState("");
  const [sort, setSort] = useState("");

  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalProducts, setTotalProducts] = useState(0);

  const [wishlistIds, setWishlistIds] = useState([]);
  const [wishlistLoadingIds, setWishlistLoadingIds] = useState([]);

  const [cartIds, setCartIds] = useState([]);
  const [addingCartIds, setAddingCartIds] = useState([]);

  // LOAD WISHLIST
  useEffect(() => {
    const loadWishlistProducts = async () => {
      if (!isAuthenticated) {
        setWishlistIds([]);
        return;
      }

      try {
        const response = await axiosInstance.get("/api/wishlist/");

        const items = Array.isArray(response.data)
          ? response.data
          : response.data?.results || response.data?.items || [];

        const ids = items
          .map((item) => Number(item.product?.id || item.product))
          .filter((id) => !Number.isNaN(id));

        setWishlistIds(ids);
      } catch (error) {
        console.error("Wishlist loading error:", error);
      }
    };

    loadWishlistProducts();
  }, [isAuthenticated]);

  // LOAD CART
  useEffect(() => {
    const loadCartProducts = async () => {
      if (!isAuthenticated) {
        setCartIds([]);
        return;
      }

      try {
        const response = await axiosInstance.get("/api/cart/");
        const items = response.data?.items || [];

        const ids = products
          .filter((product) =>
            product.variants?.some((variant) =>
              items.some(
                (item) => Number(item.variant) === Number(variant.id)
              )
            )
          )
          .map((product) => product.id);

        setCartIds(ids);
      } catch (error) {
        console.error("Cart loading error:", error);
      }
    };

    loadCartProducts();
  }, [isAuthenticated, products]);

  // FETCH CATEGORIES AND ROOMS
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [categoryResponse, roomResponse] = await Promise.all([
          axiosInstance.get("/products/categories/"),
          axiosInstance.get("/products/rooms/"),
        ]);

        setCategories(
          Array.isArray(categoryResponse.data)
            ? categoryResponse.data
            : categoryResponse.data?.results || []
        );

        setRooms(
          Array.isArray(roomResponse.data)
            ? roomResponse.data
            : roomResponse.data?.results || []
        );
      } catch (error) {
        console.error("Filter loading error:", error);
      }
    };

    fetchFilters();
  }, []);

  // READ FILTERS FROM URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const selectedSearch = params.get("search") || "";
    const selectedCategory = params.get("category") || "";
    const selectedRoom = params.get("room") || "";

    const matchedCategory = categories.find(
      (item) =>
        item.slug === selectedCategory ||
        item.name.toLowerCase() === selectedCategory.toLowerCase()
    );

    const matchedRoom = rooms.find(
      (item) =>
        item.slug === selectedRoom ||
        item.name.toLowerCase() === selectedRoom.toLowerCase()
    );

    setSearch(selectedSearch);
    setSearchInput(selectedSearch);

    setCategory(
      matchedCategory
        ? matchedCategory.slug
        : selectedCategory.toLowerCase().trim().replace(/\s+/g, "-")
    );

    setRoom(
      matchedRoom
        ? matchedRoom.slug
        : selectedRoom.toLowerCase().trim().replace(/\s+/g, "-")
    );

    setPage(1);
  }, [location.search, categories, rooms]);

  // FETCH PRODUCTS
  useEffect(() => {
    let isCurrentRequest = true;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await axiosInstance.get("/products/", {
          params: {
            search: search || undefined,
            category: category || undefined,
            room: room || undefined,
            sort: sort || undefined,
            min_price: minPrice || undefined,
            max_price: maxPrice || undefined,
            page,
            page_size: pageSize,
          },
        });

        if (!isCurrentRequest) return;

        setProducts(response.data.results || []);
        setTotalProducts(response.data.count || 0);
      } catch (error) {
        if (!isCurrentRequest) return;

        console.error("Product fetching error:", error);

        setError(
          error.response?.data?.message ||
            "Unable to load products. Please try again."
        );

        setProducts([]);
        setTotalProducts(0);
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isCurrentRequest = false;
    };
  }, [search, category, room, sort, minPrice, maxPrice, page, pageSize]);

  // SEARCH
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  // PRICE FILTER
  const handlePriceFilter = () => {
    const min = minPriceInput.trim();
    const max = maxPriceInput.trim();

    if (
      (min && (!Number.isFinite(Number(min)) || Number(min) < 0)) ||
      (max && (!Number.isFinite(Number(max)) || Number(max) < 0))
    ) {
      alert("Please enter a valid price.");
      return;
    }

    if (min && max && Number(min) > Number(max)) {
      alert("Minimum price cannot be greater than maximum price.");
      return;
    }

    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };
   // CLEAR PRICE FILTER
const handleClearPrice = () => {
  setMinPriceInput("");
  setMaxPriceInput("");
  setMinPrice("");
  setMaxPrice("");
  setPage(1);
};
  // CLEAR FILTERS
  const handleClearFilters = () => {
    setSearch("");
    setSearchInput("");
    setCategory("");
    setRoom("");
    setSort("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setMinPrice("");
    setMaxPrice("");
    setPage(1);

    navigate("/products", { replace: true });
  };

  // WISHLIST
  const handleWishlist = async (productId) => {
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }

    if (wishlistLoadingIds.includes(productId)) return;

    try {
      setWishlistLoadingIds((prev) => [...prev, productId]);

      if (wishlistIds.includes(productId)) {
        const response = await axiosInstance.get("/api/wishlist/");

        const items = Array.isArray(response.data)
          ? response.data
          : response.data?.results || response.data?.items || [];

        const wishlistItem = items.find(
          (item) =>
            Number(item.product?.id || item.product) === Number(productId)
        );

        if (wishlistItem) {
          await axiosInstance.delete(
            `/api/wishlist/${wishlistItem.id}/`
          );
        }

        setWishlistIds((prev) =>
          prev.filter((id) => id !== productId)
        );
      } else {
        await axiosInstance.post("/api/wishlist/", {
          product_id: productId,
        });

        setWishlistIds((prev) =>
          prev.includes(productId) ? prev : [...prev, productId]
        );
      }

      if (refreshWishlistCount) {
        await refreshWishlistCount();
      }
    } catch (error) {
      console.error("Wishlist update error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to update Wishlist. Please try again."
      );
    } finally {
      setWishlistLoadingIds((prev) =>
        prev.filter((id) => id !== productId)
      );
    }
  };

  // ADD TO CART
  const handleAddToCart = async (product) => {
    if (!isAuthenticated) {
      onLoginClick();
      return;
    }

    const variant = product.variants?.find(
      (item) => Number(item.stock) > 0
    );

    if (!variant) {
      alert("This product is currently out of stock.");
      return;
    }

    if (addingCartIds.includes(product.id)) return;

    try {
      setAddingCartIds((prev) => [...prev, product.id]);

      await axiosInstance.post("/api/cart/add/", {
        variant: variant.id,
        quantity: 1,
      });

      setCartIds((prev) =>
        prev.includes(product.id) ? prev : [...prev, product.id]
      );

      if (refreshCartCount) {
        await refreshCartCount();
      }
    } catch (error) {
      console.error("Add to cart error:", error);

      alert(
        error.response?.data?.message ||
          error.response?.data?.detail ||
          "Unable to add product to cart. Please try again."
      );
    } finally {
      setAddingCartIds((prev) =>
        prev.filter((id) => id !== product.id)
      );
    }
  };

  // PRODUCT IMAGE
  const getProductImage = (product) => {
    const firstImage = product.images?.[0];

    if (!firstImage) return "";

    const imagePath =
      typeof firstImage === "string"
        ? firstImage
        : firstImage.image_url ||
          firstImage.image ||
          firstImage.url ||
          "";

    if (!imagePath) return "";

    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    return `http://127.0.0.1:8000${imagePath}`;
  };
  
  
  // PRODUCT RATING
  const renderRating = (product) => {
    const hasReviews =
      Number(product.review_count) > 0 &&
      product.average_rating !== null &&
      product.average_rating !== undefined;

    if (!hasReviews) {
      return (
        <div className="product-rating rating-placeholder" />
      );
    }

    const rating = Number(product.average_rating);

    return (
      <div className="product-rating">
        <span className="rating-stars">
          {Array.from({ length: 5 }, (_, index) => (
            <span key={index}>
              {index < Math.round(rating) ? "★" : "☆"}
            </span>
          ))}
        </span>

        <span className="rating-value">
          {rating.toFixed(1)}
        </span>

        <span className="rating-count">
          ({product.review_count}{" "}
          {Number(product.review_count) === 1 ? "review" : "reviews"})
        </span>
      </div>
    );
  };

  const totalPages = Math.ceil(totalProducts / pageSize);

  return (
    <div className="product-page">

      

      {/* HERO AND SEARCH */}
      <section className="product-list-hero">
        <p className="product-subtitle">
          MAKE YOUR HOME BEAUTIFUL
        </p>

        <h1>Our Collection</h1>

        <p className="hero-description">
          Thoughtfully selected essentials to make every corner
          of your home feel special.
        </p>

        <form
          className="product-search-section"
          onSubmit={handleSearchSubmit}
        >
          <span className="search-icon">⌕</span>

          <input
            type="text"
            placeholder="Search products, furniture and more..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search products"
          />

          {searchInput && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
              }}
            >
              ×
            </button>
          )}

          <button type="submit" className="product-search-btn">
            Search
          </button>
        </form>
      </section>

      {/* MAIN PRODUCT LAYOUT */}
      <main className="product-layout">

        {/* LEFT FILTER SIDEBAR */}
        <aside className="product-sidebar">

          <div className="filter-heading">
            <div>
              <span className="filter-eyebrow">
                REFINE YOUR SEARCH
              </span>
              <h2>Filters</h2>
            </div>

            <button
              type="button"
              className="clear-filter-btn"
              onClick={handleClearFilters}
            >
              Clear all
            </button>
          </div>

          {/* ROOMS */}
          <div className="sidebar-filter-group">
            <h3>Shop by Room</h3>

            <div className="room-options">

              <label className="room-option">
                <input
                  type="radio"
                  name="room"
                  value=""
                  checked={room === ""}
                  onChange={() => {
                    setRoom("");
                    setPage(1);
                  }}
                />
                <span className="custom-radio" />
                <span>All Rooms</span>
              </label>

              {rooms.map((item) => (
                <label className="room-option" key={item.id}>
                  <input
                    type="radio"
                    name="room"
                    value={item.slug}
                    checked={room === item.slug}
                    onChange={() => {
                      setRoom(item.slug);
                      setPage(1);
                    }}
                  />

                  <span className="custom-radio" />
                  <span>{item.name}</span>
                </label>
              ))}

            </div>
          </div>

          <div className="filter-divider" />

          {/* CATEGORY */}
          <div className="sidebar-filter-group">
            <h3>Category</h3>

            <select
              className="sidebar-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Categories</option>

              {categories.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-divider" />

          {/* PRICE RANGE */}
<div className="sidebar-filter-group">
  <h3>Price Range</h3>

  <div className="price-inputs">
    <div className="price-input-group">
      <label htmlFor="min-price">Minimum Price</label>
      <div className="price-input-wrapper">
        <span>₹</span>
        <input
          id="min-price"
          type="number"
          min="0"
          placeholder="0"
          value={minPriceInput}
          onChange={(e) => setMinPriceInput(e.target.value)}
        />
      </div>
    </div>

    <div className="price-input-group">
      <label htmlFor="max-price">Maximum Price</label>
      <div className="price-input-wrapper">
        <span>₹</span>
        <input
          id="max-price"
          type="number"
          min="0"
          placeholder="Any"
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
        />
      </div>
    </div>
  </div>

  <button
    type="button"
    className="apply-price-btn"
    onClick={handlePriceFilter}
  >
    Apply Price
  </button>

  <button
    type="button"
    className="clear-price-btn"
    onClick={handleClearPrice}
  >
    Clear Price
  </button>
</div>

<div className="filter-note">
  Find the perfect pieces for every corner of your home.
</div>
        </aside>

        {/* RIGHT PRODUCTS SECTION */}
        <section className="products-main">

          {/* TOOLBAR */}
          <div className="products-toolbar">
            <div>
              <h2>Explore Products</h2>
              <p>
                Showing <strong>{totalProducts}</strong> products
              </p>
            </div>

            <div className="sort-control">
              <label htmlFor="product-sort">Sort by</label>

              <select
                id="product-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Select</option>
                <option value="rating_high">Highest Rated</option>
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="product-message">
              Loading products...
            </div>
          )}

          {/* ERROR */}
          {!loading && error && (
            <div className="product-error">
              {error}
            </div>
          )}

          {/* EMPTY */}
          {!loading && !error && products.length === 0 && (
            <div className="product-message empty-products">
              <h3>No products found</h3>
              <p>Try changing your search or filters.</p>

              <button
                type="button"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* PRODUCT GRID */}
          {!loading && !error && products.length > 0 && (
            <div className="product-grid">

              {products.map((product) => (
                <article className="product-card" key={product.id}>

                  {/* IMAGE */}
                  <div className="product-image-container">
                    {getProductImage(product) ? (
                      <img
                        src={getProductImage(product)}
                        alt={product.name}
                        className="product-image"
                        onClick={() =>
                          navigate(`/products/${product.id}`)
                        }
                      />
                    ) : (
                      <div
                        className="product-image-placeholder"
                        onClick={() =>
                          navigate(`/products/${product.id}`)
                        }
                      >
                        HomeNest
                      </div>
                    )}

                    {/* WISHLIST */}
                    <button
                      type="button"
                      className={`wishlist-btn ${
                        wishlistIds.includes(product.id) ? "active" : ""
                      }`}
                      onClick={() => handleWishlist(product.id)}
                      disabled={wishlistLoadingIds.includes(product.id)}
                      aria-label={
                        wishlistIds.includes(product.id)
                          ? "Remove from Wishlist"
                          : "Add to Wishlist"
                      }
                      title={
                        wishlistIds.includes(product.id)
                          ? "Remove from Wishlist"
                          : "Add to Wishlist"
                      }
                    >
                      {wishlistLoadingIds.includes(product.id)
                        ? "..."
                        : wishlistIds.includes(product.id)
                        ? "♥"
                        : "♡"}
                    </button>
                  </div>

                  {/* CONTENT */}
                  <div className="product-card-content">

                    <p className="product-category">
                      {product.category?.name || product.category || ""}
                    </p>

                    <h3
                      onClick={() =>
                        navigate(`/products/${product.id}`)
                      }
                    >
                      {product.name}
                    </h3>

                    {/* SAME RATING SPACE FOR ALL PRODUCTS */}
                    {renderRating(product)}

                    <p className="product-description">
                      {product.description || ""}
                    </p>
                 <div className="product-card-bottom">
                      <div>
                        <span className="starting-price-label">
                          Starting from
                        </span>

                        <p className="product-price">
                          ₹
                          {Number(product.starting_price).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                      </div>

                      <span className="product-material">
                        {product.material || ""}
                      </span>
                    </div>

                    {/* ADD TO CART */}
                    <button
                      type="button"
                      className={`add-cart-btn ${
                        cartIds.includes(product.id) ? "added" : ""
                      }`}
                      onClick={() => handleAddToCart(product)}
                      disabled={addingCartIds.includes(product.id)}
                    >
                      {addingCartIds.includes(product.id)
                        ? "Adding..."
                        : cartIds.includes(product.id)
                        ? "✓ Added"
                        : "Add to Cart"}
                    </button>

                  </div>
                </article>
              ))}

            </div>
          )}

          {/* PAGINATION */}
          {!loading && !error && totalPages > 1 && (
            <div className="products-pagination">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((prev) => prev - 1)}
              >
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => prev + 1)}
              >
                Next
              </button>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={6}>6 per page</option>
                <option value={12}>12 per page</option>
                <option value={18}>18 per page</option>
              </select>
            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default ProductList;