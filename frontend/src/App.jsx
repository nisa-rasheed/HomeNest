
import { useCallback, useEffect, useState } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { GoogleOAuthProvider } from "@react-oauth/google";
import axiosInstance from "./services/axiosInstance";

import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Profile from "./pages/Profile";
import VerifyOTP from "./pages/VerifyOTP";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetOTP from "./pages/VerifyResetOTP";
import ResetPassword from "./pages/ResetPassword";
import Addresses from "./pages/Addresses";
import ChangeEmail from "./pages/ChangeEmail";
import ChangePassword from "./pages/ChangePassword";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import ProductList from "./pages/ProductList";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import OrderTracking from "./pages/OrderTracking";
import PaymentFailed from "./pages/PaymentFailed";
import Wallet from "./pages/Wallet";

import AdminDashboard from "./pages/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import CustomerLayout from "./components/CustomerLayout";

import AdminProducts from "./pages/AdminProducts";
import AdminProductDetails from "./pages/AdminProductDetails";
import AdminCategories from "./pages/AdminCategories";
import AdminCategoryDetails from "./pages/AdminCategoryDetails";
import AdminOrders from "./pages/AdminOrders";
import AdminOrderDetails from "./pages/AdminOrderDetails";
import AdminReturns from "./pages/AdminReturns";
import AdminReturnDetails from "./pages/AdminReturnDetails";
import AdminInventory from "./pages/AdminInventory";
import AdminCoupons from "./pages/AdminCoupons";
import AdminCustomerWallet from "./pages/AdminCustomerWallet";



function getDestination(from) {
  if (typeof from === "string") {
    return from || "/";
  }

  if (!from?.pathname) {
    return "/";
  }

  return {
    pathname: from.pathname,
    search: from.search || "",
    hash: from.hash || "",
  };
}


// CUSTOMER PROTECTED ROUTE
function CustomerProtectedRoute({ children }) {
  const location = useLocation();

  const accessToken = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_role");

  if (!accessToken || role !== "customer") {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}


// ADMIN PROTECTED ROUTE
function AdminProtectedRoute({ children }) {
  const accessToken = sessionStorage.getItem("access_token");
  const role = sessionStorage.getItem("user_role");

  if (!accessToken || role !== "admin") {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
}


function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  const verificationEmail = location.state?.email;
  const resetEmail = location.state?.email;
  const resetToken = location.state?.token;

  const destination = getDestination(location.state?.from);

  const accessToken = sessionStorage.getItem("access_token");
  const userRole = sessionStorage.getItem("user_role");

  const isAuthenticated = Boolean(
    accessToken && userRole === "customer"
  );


  // REFRESH CART COUNT
  const refreshCartCount = useCallback(async () => {
    if (!isAuthenticated) {
      setCartCount(0);
      return;
    }

    try {
      const response = await axiosInstance.get("/api/cart/");

      const items = response.data?.items || [];

      const totalQuantity = items.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      );

      setCartCount(totalQuantity);
    } catch (error) {
      console.error("Cart count loading error:", error);
      setCartCount(0);
    }
  }, [isAuthenticated]);


  // REFRESH WISHLIST COUNT
  const refreshWishlistCount = useCallback(async () => {
    if (!isAuthenticated) {
      setWishlistCount(0);
      return;
    }

    try {
      const response = await axiosInstance.get("/api/wishlist/");

      const items = Array.isArray(response.data)
        ? response.data
        : response.data?.results ||
          response.data?.items ||
          [];

      setWishlistCount(items.length);
    } catch (error) {
      console.error("Wishlist count loading error:", error);
      setWishlistCount(0);
    }
  }, [isAuthenticated]);


  useEffect(() => {
    refreshCartCount();
    refreshWishlistCount();
  }, [refreshCartCount, refreshWishlistCount]);


  // CUSTOMER LOGOUT
  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_role");

    setCartCount(0);
    setWishlistCount(0);

    navigate("/", { replace: true });
  };


  // ADMIN LOGOUT
  const handleAdminLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("user_role");

    navigate("/admin-login", { replace: true });
  };


  return (
    <Routes>

      {/* HOME PAGE */}
      <Route
        path="/"
        element={
          <Home
            isAuthenticated={isAuthenticated}
            cartCount={cartCount}
            refreshCartCount={refreshCartCount}
            wishlistCount={wishlistCount}
            refreshWishlistCount={refreshWishlistCount}
            onCartClick={() => navigate("/cart")}
            onProfileClick={() => navigate("/profile")}
            onLogout={handleLogout}
            onLoginClick={() => navigate("/login")}
            onRegisterClick={() => navigate("/register")}
            onShopNow={() => navigate("/products")}
            onRoomClick={(room) =>
              navigate(
                `/products?room=${encodeURIComponent(room)}`
              )
            }
          />
        }
      />


      {/* COMMON CUSTOMER HEADER */}
      <Route
        element={
          <CustomerLayout
            isAuthenticated={isAuthenticated}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            onLogout={handleLogout}
          />
        }
      >

        {/* PRODUCT LIST */}
        <Route
          path="/products"
          element={
            <ProductList
              isAuthenticated={isAuthenticated}
              refreshCartCount={refreshCartCount}
              refreshWishlistCount={refreshWishlistCount}
              onLoginClick={() =>
                navigate("/login", {
                  state: { from: location },
                })
              }
            />
          }
        />


        {/* PRODUCT DETAILS */}
        <Route
          path="/products/:id"
          element={
            <ProductDetail
              isAuthenticated={isAuthenticated}
              cartCount={cartCount}
              refreshCartCount={refreshCartCount}
              wishlistCount={wishlistCount}
              refreshWishlistCount={refreshWishlistCount}
              onProfileClick={() => navigate("/profile")}
              onLogout={handleLogout}
              onLoginClick={() =>
                navigate("/login", {
                  state: { from: location },
                })
              }
              onRegisterClick={() =>
                navigate("/register", {
                  state: { from: location },
                })
              }
            />
          }
        />


        {/* CART */}
        <Route
          path="/cart"
          element={
            <CustomerProtectedRoute>
              <Cart
                isAuthenticated={isAuthenticated}
                cartCount={cartCount}
                wishlistCount={wishlistCount}
                refreshCartCount={refreshCartCount}
                refreshWishlistCount={refreshWishlistCount}
                onProfileClick={() => navigate("/profile")}
                onLogout={handleLogout}
                onLoginClick={() =>
                  navigate("/login", {
                    state: { from: location },
                  })
                }
                onRegisterClick={() =>
                  navigate("/register", {
                    state: { from: location },
                  })
                }
              />
            </CustomerProtectedRoute>
          }
        />


        {/* CHECKOUT */}
        <Route
          path="/checkout"
          element={
            <CustomerProtectedRoute>
              <Checkout
                isAuthenticated={isAuthenticated}
                refreshCartCount={refreshCartCount}
                onBackToCart={() => navigate("/cart")}
              />
            </CustomerProtectedRoute>
          }
        />


        {/* MY ORDERS */}
        <Route
          path="/my-orders"
          element={
            <CustomerProtectedRoute>
              <MyOrders
                isAuthenticated={isAuthenticated}
                refreshCartCount={refreshCartCount}
                onContinueShopping={() => navigate("/products")}
              />
            </CustomerProtectedRoute>
          }
        />


        {/* ORDER TRACKING */}
        <Route
          path="/order-tracking/:orderId"
          element={
            <CustomerProtectedRoute>
              <OrderTracking />
            </CustomerProtectedRoute>
          }
        />


        {/* PAYMENT FAILED */}
        <Route
          path="/payment-failed"
          element={
            <CustomerProtectedRoute>
              <PaymentFailed />
            </CustomerProtectedRoute>
          }
        />


        {/* WISHLIST */}
        <Route
          path="/wishlist"
          element={
            <CustomerProtectedRoute>
              <Wishlist
                isAuthenticated={isAuthenticated}
                refreshCartCount={refreshCartCount}
                onLoginClick={() =>
                  navigate("/login", {
                    state: { from: location },
                  })
                }
              />
            </CustomerProtectedRoute>
          }
        />


        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <CustomerProtectedRoute>
              <Profile
                refreshCartCount={refreshCartCount}
                refreshWishlistCount={refreshWishlistCount}
                onAddressesClick={() => navigate("/addresses")}
                onWalletClick={() => navigate("/wallet")}
                onChangeEmailClick={() => navigate("/change-email")}
                onChangePasswordClick={() =>
                  navigate("/change-password")
                }
                onContinueShopping={() => navigate("/")}
                onLogout={handleLogout}
              />
            </CustomerProtectedRoute>
          }
        />
        
        {/* CUSTOMER WALLET */}
        <Route
          path="/wallet"
          element={
            <CustomerProtectedRoute>
              <Wallet />
            </CustomerProtectedRoute>
          }
        />

        {/* SAVED ADDRESSES */}
        <Route
          path="/addresses"
          element={
            <CustomerProtectedRoute>
              <Addresses
                onBack={() => navigate("/profile")}
                onContinueShopping={() => navigate("/")}
              />
            </CustomerProtectedRoute>
          }
        />


        {/* CHANGE EMAIL */}
        <Route
          path="/change-email"
          element={
            <CustomerProtectedRoute>
              <ChangeEmail
                onBack={() => navigate("/profile")}
                onEmailChanged={() => navigate("/profile")}
              />
            </CustomerProtectedRoute>
          }
        />


        {/* CHANGE PASSWORD */}
        <Route
          path="/change-password"
          element={
            <CustomerProtectedRoute>
              <ChangePassword
                onBack={() => navigate("/profile")}
              />
            </CustomerProtectedRoute>
          }
        />

      </Route>


      {/* CUSTOMER LOGIN */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={destination} replace />
          ) : (
            <Login
              onLoginSuccess={(user) => {
                sessionStorage.setItem(
                  "user_role",
                  user?.role || "customer"
                );

                navigate(destination, { replace: true });
              }}
              onRegister={() =>
                navigate("/register", {
                  state: { from: location.state?.from },
                })
              }
              onForgotPassword={() => navigate("/forgot")}
            />
          )
        }
      />


      {/* ADMIN LOGIN */}
      <Route
        path="/admin-login"
        element={
          accessToken && userRole === "admin" ? (
            <Navigate to="/admin-dashboard" replace />
          ) : (
            <AdminLogin
              onAdminLoginSuccess={(user) => {
                if (user?.role !== "admin") {
                  sessionStorage.removeItem("access_token");
                  sessionStorage.removeItem("refresh_token");
                  sessionStorage.removeItem("user_role");

                  navigate("/admin-login", { replace: true });
                  return;
                }

                sessionStorage.setItem("user_role", "admin");

                navigate("/admin-dashboard", { replace: true });
              }}
              onBackToCustomerLogin={() => navigate("/")}
            />
          )
        }
      />


      {/* ADMIN ROUTES */}
      <Route
        element={
          <AdminProtectedRoute>
            <AdminLayout onLogout={handleAdminLogout} />
          </AdminProtectedRoute>
        }
      >

        <Route
          path="/admin-dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin-products"
          element={<AdminProducts />}
        />

        <Route
          path="/admin-products/:id"
          element={<AdminProductDetails />}
        />

        <Route
          path="/admin-categories"
          element={<AdminCategories />}
        />

        <Route
          path="/admin-categories/:id"
          element={<AdminCategoryDetails />}
        />

        <Route
          path="/admin-customers"
          element={<Customers />}
        />

        <Route
          path="/admin-customers/:id"
          element={<CustomerDetails />}
        />
        
        <Route
          path="/admin-customers/:id/wallet"
          element={<AdminCustomerWallet />}
        />
        
        <Route
          path="/admin-orders"
          element={<AdminOrders />}
        />

        <Route
          path="/admin-orders/:id"
          element={<AdminOrderDetails />}
        />

        <Route
          path="/admin-returns"
          element={<AdminReturns />}
        />

        <Route
          path="/admin-returns/:id"
          element={<AdminReturnDetails />}
        />

        <Route
          path="/admin-inventory"
          element={<AdminInventory />}
        />
         <Route
          path="/admin-coupons"
          element={<AdminCoupons />}
        />

        
      </Route>


      {/* CUSTOMER REGISTRATION */}
      <Route
        path="/register"
        element={
          <Register
            onSignIn={() =>
              navigate("/login", {
                state: { from: location.state?.from },
              })
            }
            onRegisterSuccess={(email) =>
              navigate("/verify", {
                state: {
                  email,
                  from: location.state?.from,
                },
              })
            }
          />
        }
      />


      {/* EMAIL OTP VERIFICATION */}
      <Route
        path="/verify"
        element={
          verificationEmail ? (
            <VerifyOTP
              email={verificationEmail}
              onVerificationSuccess={() =>
                navigate(destination, { replace: true })
              }
            />
          ) : (
            <Navigate to="/register" replace />
          )
        }
      />


      {/* FORGOT PASSWORD */}
      <Route
        path="/forgot"
        element={
          <ForgotPassword
            onBack={() => navigate("/login")}
            onOTPSent={(email) =>
              navigate("/verify-reset", {
                state: { email },
              })
            }
          />
        }
      />


      {/* PASSWORD RESET OTP */}
      <Route
        path="/verify-reset"
        element={
          resetEmail ? (
            <VerifyResetOTP
              email={resetEmail}
              onOTPVerified={(token) =>
                navigate("/reset-password", {
                  state: { token },
                })
              }
            />
          ) : (
            <Navigate to="/forgot" replace />
          )
        }
      />


      {/* RESET PASSWORD */}
      <Route
        path="/reset-password"
        element={
          resetToken ? (
            <ResetPassword
              resetToken={resetToken}
              onResetSuccess={() =>
                navigate("/login", { replace: true })
              }
            />
          ) : (
            <Navigate to="/forgot" replace />
          )
        }
      />


      {/* OLD HOME URL */}
      <Route
        path="/home"
        element={<Navigate to="/" replace />}
      />


      {/* UNKNOWN URL */}
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}


function App() {
  return (
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
