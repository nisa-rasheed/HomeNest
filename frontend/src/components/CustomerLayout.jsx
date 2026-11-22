
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import CustomerHeader from "./CustomerHeader";
import "./CustomerHeader.css";

function CustomerLayout({
  isAuthenticated,
  cartCount,
  wishlistCount,
  onLogout,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleLoginClick = () => {
    navigate("/login", {
      state: { from: location },
    });
  };

  const handleRegisterClick = () => {
    navigate("/register", {
      state: { from: location },
    });
  };

  return (
    <>
      <CustomerHeader
        isAuthenticated={isAuthenticated}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        onProfileClick={handleProfileClick}
        onLogout={onLogout}
        onLoginClick={handleLoginClick}
        onRegisterClick={handleRegisterClick}
      />

      <Outlet />
    </>
  );
}

export default CustomerLayout;
