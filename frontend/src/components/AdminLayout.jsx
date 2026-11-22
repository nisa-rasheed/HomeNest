
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Grid2X2,
  Users,
  LogOut,
  House,
  ShoppingBag,
  RotateCcw,
  Warehouse,
  TicketPercent,
  
} from "lucide-react";

import "./AdminLayout.css";

function AdminLayout({ onLogout }) {
  const navigate = useNavigate();

  const menuItems = [
    {
      name: "Dashboard",
      path: "/admin-dashboard",
      icon: LayoutDashboard,
    },
    {
      name: "Product Management",
      path: "/admin-products",
      icon: Package,
    },
    {
      name: "Category Management",
      path: "/admin-categories",
      icon: Grid2X2,
    },
    {
      name: "Customer Management",
      path: "/admin-customers",
      icon: Users,
    },
    {
      name: "Order Management",
      path: "/admin-orders",
      icon: ShoppingBag,
    },
    {
      name: "Return Management",
      path: "/admin-returns",
      icon: RotateCcw,
    },
    {
      name: "Inventory Management",
      path: "/admin-inventory",
      icon: Warehouse,
    },
    {
    name: "Coupon Management",
    path: "/admin-coupons",
    icon: TicketPercent,
    },
    
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">

        <div className="admin-brand">
          <House size={27} />
          <span>HomeNest</span>
        </div>

        <p className="admin-menu-label">MAIN MENU</p>

        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={true}
                className={({ isActive }) =>
                  `admin-menu-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <button
          className="admin-logout"
          onClick={() => {
            onLogout();
            navigate("/");
          }}
        >
          <LogOut size={19} />
          <span>Logout</span>
        </button>

      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
