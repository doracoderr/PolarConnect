import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";

import PublicPortal from "./pages/PublicPortal.jsx";
import Home from "./pages/Home.jsx";
import ContentDetail from "./pages/ContentDetail.jsx";
import Expeditions from "./pages/Expeditions.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminUpload from "./pages/AdminUpload.jsx";
import AdminContentList from "./pages/AdminContentList.jsx";
import AdminEditContent from "./pages/AdminEditContent.jsx";
import Sitemap from "./pages/Sitemap.jsx";
import Footer from "./components/footer.jsx";
import BrandMark from "./components/BrandMark.jsx";
import Privacy from "./pages/Privacy.jsx";
import Terms from "./pages/Terms.jsx";

import "./admin.css";

function isLoggedIn() {
  return Boolean(sessionStorage.getItem("pc_token"));
}

/* =========================================================
   BRAND MARK
   ========================================================= */

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="13"
        cy="13"
        r="11.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />

      <path
        d="M13 4.5L15.2 11.4 13 21.5 10.8 11.4 13 4.5Z"
        fill="currentColor"
      />

      <circle
        cx="13"
        cy="13"
        r="1.6"
        fill="var(--navy)"
      />
    </svg>
  );
}

/* =========================================================
   EXISTING PUBLIC NAVBAR
   IMPORTANT:
   This navbar is only for PUBLIC pages.
   ========================================================= */


function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const loggedIn = isLoggedIn();

  const logout = () => {
    sessionStorage.removeItem("pc_token");
    sessionStorage.removeItem("pc_admin_email");
    sessionStorage.removeItem("pc_admin_name");
    sessionStorage.removeItem("pc_admin_avatar");
    sessionStorage.removeItem("pc_admin_role");

    setMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const navClass = ({ isActive }) =>
    "nav-link" + (isActive ? " is-active" : "");

  return (
    <nav className="navbar">
      <div className="navbar-inner">

        {/* =================================================
            BRAND
            ================================================= */}

        <Link
          to="/"
          className="brand"
          onClick={closeMenu}
        >
          <span className="brand-icon-wrap">
            <BrandMark />
          </span>

          <span className="brand-text">
            <strong>PolarConnect</strong>

            <span className="brand-sub">
              NCPOR · Polar &amp; Ocean Research
            </span>
          </span>
        </Link>

        {/* =================================================
            MOBILE TOGGLE
            ================================================= */}

        <button
          type="button"
          className={
            "nav-toggle" +
            (menuOpen ? " is-open" : "")
          }
          aria-label={
            menuOpen ? "Close navigation" : "Open navigation"
          }
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        {/* =================================================
            NAVIGATION
            ================================================= */}

        <div
          className={
            "nav-links" +
            (menuOpen ? " is-open" : "")
          }
        >

          <NavLink
            to="/"
            end
            className={navClass}
            onClick={closeMenu}
          >
            Home
          </NavLink>

          <NavLink
            to="/antarctica"
            className={navClass}
            onClick={closeMenu}
          >
            Antarctica
          </NavLink>

          <NavLink
            to="/arctic"
            className={navClass}
            onClick={closeMenu}
          >
            Arctic
          </NavLink>

          <NavLink
            to="/himalaya"
            className={navClass}
            onClick={closeMenu}
          >
            Himalaya
          </NavLink>

          <NavLink
            to="/expeditions"
            className={navClass}
            onClick={closeMenu}
          >
            Expeditions
          </NavLink>

          <NavLink
            to="/about"
            className={navClass}
            onClick={closeMenu}
          >
            About
          </NavLink>

          <NavLink
            to="/contact"
            className={navClass}
            onClick={closeMenu}
          >
            Contact
          </NavLink>

          

          {/* =================================================
              ADMIN AREA
              ================================================= */}

          {loggedIn ? (
            <div className="nav-admin-group">

              <span
                className="nav-divider"
                aria-hidden="true"
              />

              <Link
                to="/admin/dashboard"
                className="nav-button nav-button-admin"
                onClick={closeMenu}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3.5 19 6v5.4c0 4.3-2.8 7.9-7 9.1-4.2-1.2-7-4.8-7-9.1V6l7-2.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />

                  <path
                    d="m9.2 12 1.8 1.8 3.8-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>Admin Panel</span>
              </Link>

              {/* Mobile logout */}
              <button
                type="button"
                className="mobile-nav-logout"
                onClick={logout}
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="nav-admin-group">

              <span
                className="nav-divider"
                aria-hidden="true"
              />

              <Link
                to="/admin/login"
                className="nav-button nav-button-outline"
                onClick={closeMenu}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />

                  <path
                    d="M8 10V7.8a4 4 0 0 1 8 0V10"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>

                <span>Admin Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

/* =========================================================
   ADMIN ICONS
   ========================================================= */

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="4"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="4"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <rect
        x="14"
        y="14"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 15V4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m8 8 4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3.5h8l4 4V20.5H6V3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 12h6M9 15.5h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M3.8 12h16.4M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5s-1.1 6.2-3.3 8.5c-2.2-2.3-3.3-5.1-3.3-8.5S9.8 5.8 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MountainIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m3.5 19 6.8-11 3.1 4.7 2.2-3.1 5 9.4H3.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="m8.4 19 2.4-3.8 2.6 3.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShipIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 15h14l-2 4H7l-2-4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M8 15V7h7l2 3H8M10 7V4h4v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M3.5 20c1.3 0 1.3 1 2.7 1s1.4-1 2.7-1 1.4 1 2.7 1 1.4-1 2.7-1 1.4 1 2.7 1 1.4-1 2.7-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M12 10.5v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <circle
        cx="12"
        cy="7.5"
        r="1"
        fill="currentColor"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m4.5 7 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="5"
        width="17"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M7 3.5v3M17 3.5v3M3.5 9.5h17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M8 13h2M14 13h2M8 16.5h2M14 16.5h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="M14 8l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 12h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* =========================================================
   ADMIN SIDEBAR
   ========================================================= */

function AdminSidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}) {
  const closeAfterNavigation = () => {
    onMobileClose();
  };

  const sidebarLinkClass = ({ isActive }) =>
    "admin-sidebar-link" +
    (isActive ? " is-active" : "");

  return (
    <aside
      className={
        "admin-sidebar" +
        (collapsed ? " is-collapsed" : "") +
        (mobileOpen ? " is-mobile-open" : "")
      }
    >
      {/* BRAND */}
      <div className="admin-sidebar-brand">
        <Link
          to="/admin/dashboard"
          className="admin-sidebar-brand-link"
          onClick={closeAfterNavigation}
        >
          <span className="admin-sidebar-logo">
            <BrandMark />
          </span>

          <span className="admin-sidebar-brand-text">
            <strong>PolarConnect</strong>
            <small>Admin Panel</small>
          </span>
        </Link>

        <button
          type="button"
          className="admin-sidebar-mobile-close"
          aria-label="Close navigation"
          onClick={onMobileClose}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* =================================================
          PUBLIC PORTAL
          ================================================= */}

      <div className="admin-sidebar-public-section">
        <div className="admin-sidebar-section-title">
          <span>Public Portal</span>
        </div>

        <nav
          className="admin-sidebar-nav admin-sidebar-public-nav"
          aria-label="Public navigation"
        >
          <NavLink
            to="/"
            end
            className={sidebarLinkClass}
            title="Home"
            onClick={closeAfterNavigation}
          >
            <HomeIcon />
            <span>Home</span>
          </NavLink>

          <NavLink
            to="/antarctica"
            className={sidebarLinkClass}
            title="Antarctica"
            onClick={closeAfterNavigation}
          >
            <GlobeIcon />
            <span>Antarctica</span>
          </NavLink>

          <NavLink
            to="/arctic"
            className={sidebarLinkClass}
            title="Arctic"
            onClick={closeAfterNavigation}
          >
            <GlobeIcon />
            <span>Arctic</span>
          </NavLink>

          <NavLink
            to="/himalaya"
            className={sidebarLinkClass}
            title="Himalaya"
            onClick={closeAfterNavigation}
          >
            <MountainIcon />
            <span>Himalaya</span>
          </NavLink>

          <NavLink
            to="/expeditions"
            className={sidebarLinkClass}
            title="Expeditions"
            onClick={closeAfterNavigation}
          >
            <ShipIcon />
            <span>Expeditions</span>
          </NavLink>

          <NavLink
            to="/about"
            className={sidebarLinkClass}
            title="About"
            onClick={closeAfterNavigation}
          >
            <InfoIcon />
            <span>About</span>
          </NavLink>

          <NavLink
            to="/contact"
            className={sidebarLinkClass}
            title="Contact"
            onClick={closeAfterNavigation}
          >
            <MailIcon />
            <span>Contact</span>
          </NavLink>
        </nav>
      </div>

      {/* =================================================
          ADMIN NAVIGATION
          ================================================= */}

      <div className="admin-sidebar-admin-section">
        <div className="admin-sidebar-section-title admin-sidebar-section-title-admin">
          <span>Admin</span>
        </div>

        <nav
          className="admin-sidebar-nav admin-sidebar-admin-nav"
          aria-label="Admin navigation"
        >
          <NavLink
            to="/admin/dashboard"
            end
            className={sidebarLinkClass}
            title="Dashboard"
            onClick={closeAfterNavigation}
          >
            <DashboardIcon />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/upload"
            className={sidebarLinkClass}
            title="Upload"
            onClick={closeAfterNavigation}
          >
            <UploadIcon />
            <span>Upload</span>
          </NavLink>

          <NavLink
            to="/admin/content"
            className={sidebarLinkClass}
            title="Manage Content"
            onClick={closeAfterNavigation}
          >
            <ContentIcon />
            <span>Manage Content</span>
          </NavLink>
        </nav>
      </div>

    </aside>
  );
}

/* =========================================================
   ADMIN TOPBAR
   ========================================================= */

function AdminTopbar({
  collapsed,
  onDesktopToggle,
  onMobileToggle,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const adminName =
    sessionStorage.getItem("pc_admin_name") ||
    "Admin";

  const adminEmail =
    sessionStorage.getItem("pc_admin_email") ||
    "admin@polarconnect.org";

  const adminAvatar =
    sessionStorage.getItem("pc_admin_avatar") ||
    "";

  const adminRole =
    sessionStorage.getItem("pc_admin_role") ||
    "admin";

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedDate =
    currentDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const logout = () => {
    sessionStorage.removeItem("pc_token");
    sessionStorage.removeItem("pc_admin_email");
    sessionStorage.removeItem("pc_admin_name");
    sessionStorage.removeItem("pc_admin_avatar");
    sessionStorage.removeItem("pc_admin_role");

    setProfileOpen(false);
    navigate("/");
  };

  const initials =
    adminName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "A";

  return (
    <header className="admin-topbar">
      {/* =================================================
          LEFT
          ================================================= */}

      <div className="admin-topbar-left">
        <button
          type="button"
          className="admin-hamburger"
          onClick={() => {
            if (
              window.matchMedia(
                "(max-width: 768px)"
              ).matches
            ) {
              onMobileToggle();
            } else {
              onDesktopToggle();
            }
          }}
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* =================================================
          RIGHT
          ================================================= */}

      <div className="admin-topbar-right">
        {/* DATE / CALENDAR */}

        <button
          type="button"
          className="admin-current-date"
          title="Open calendar"
          onClick={() => {
            const input =
              document.getElementById(
                "admin-topbar-calendar"
              );

            if (!input) return;

            if (
              typeof input.showPicker ===
              "function"
            ) {
              input.showPicker();
            } else {
              input.click();
            }
          }}
        >
          <CalendarIcon />

          <span>{formattedDate}</span>

          <input
            id="admin-topbar-calendar"
            className="admin-hidden-calendar"
            type="date"
            aria-label="Select date"
            onChange={(event) => {
              if (event.target.value) {
                sessionStorage.setItem(
                  "pc_selected_date",
                  event.target.value
                );
              }
            }}
          />
        </button>

        {/* =================================================
            PROFILE
            ================================================= */}

        <div className="admin-profile-wrapper">
          <button
            type="button"
            className={
              "admin-profile-button" +
              (profileOpen ? " is-open" : "")
            }
            onClick={() =>
              setProfileOpen((value) => !value)
            }
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="admin-avatar">
              {adminAvatar ? (
                <img
                  src={adminAvatar}
                  alt={adminName}
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                initials
              )}
            </span>

            <span className="admin-profile-text">
              <strong>{adminName}</strong>
            </span>

            <svg
              className="admin-profile-chevron"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m7 10 5 5 5-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {profileOpen && (
            <div
              className="admin-profile-menu"
              role="menu"
            >
              <div className="admin-profile-menu-info">
                <span className="admin-profile-menu-avatar">
                  {adminAvatar ? (
                    <img
                      src={adminAvatar}
                      alt={adminName}
                    />
                  ) : (
                    initials
                  )}
                </span>

                <div>
                  <span>{adminEmail}</span>
                </div>
              </div>

              <div className="admin-profile-menu-role">
                <span className="admin-profile-menu-role-label">
                  Role
                </span>

                <span className="admin-role-badge">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M12 3.5 19 6v5.4c0 4.3-2.8 7.9-7 9.1-4.2-1.2-7-4.8-7-9.1V6l7-2.5Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {adminRole}
                </span>
              </div>

              <div className="admin-profile-menu-divider" />

              <button
                type="button"
                className="admin-logout-button"
                onClick={logout}
                role="menuitem"
              >
                <LogoutIcon />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   ADMIN LAYOUT
   ========================================================= */

function AdminLayout({ children }) {
  const location = useLocation();

  const [collapsed, setCollapsed] =
    useState(() => {
      return (
        localStorage.getItem(
          "pc_admin_sidebar_collapsed"
        ) === "true"
      );
    });

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const toggleDesktopSidebar = () => {
    setCollapsed((value) => {
      const nextValue = !value;

      localStorage.setItem(
        "pc_admin_sidebar_collapsed",
        String(nextValue)
      );

      return nextValue;
    });
  };

  const toggleMobileSidebar = () => {
    setMobileOpen((value) => !value);
  };

  const closeMobileSidebar = () => {
    setMobileOpen(false);
  };

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className={
        "admin-layout" +
        (collapsed
          ? " sidebar-collapsed"
          : "") +
        (mobileOpen
          ? " mobile-sidebar-open"
          : "")
      }
    >
      {/* MOBILE OVERLAY */}

      <button
        type="button"
        className="admin-sidebar-overlay"
        aria-label="Close admin navigation"
        onClick={closeMobileSidebar}
      />

      {/* SIDEBAR */}

      <AdminSidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleDesktopSidebar}
        onMobileClose={closeMobileSidebar}
      />

      {/* MAIN */}

      <div className="admin-layout-main">
        <AdminTopbar
          collapsed={collapsed}
          onDesktopToggle={toggleDesktopSidebar}
          onMobileToggle={toggleMobileSidebar}
        />

        <main className="admin-page-content">
          {children}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   EXPEDITION DETAIL
   ========================================================= */

function ExpeditionDetail() {
  const { name } = useParams();

  const decoded = decodeURIComponent(
    name || ""
  );

  return (
    <PublicPortal
      key={decoded}
      fixedExpedition={decoded}
    />
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  return children;
}

/* =========================================================
   ADMIN ROUTE WRAPPER
   ========================================================= */

function AdminRoute({ children }) {
  return (
    <RequireAuth>
      <AdminLayout>
        {children}
      </AdminLayout>
    </RequireAuth>
  );
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        {/* =================================================
            PUBLIC ROUTES
            ================================================= */}

        <Route
          path="/"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Home />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/antarctica"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <PublicPortal
                  key="antarctica"
                  fixedCategory="Antarctica"
                />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/arctic"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <PublicPortal
                  key="arctic"
                  fixedCategory="Arctic"
                />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/himalaya"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <PublicPortal
                  key="himalaya"
                  fixedCategory="Himalaya"
                />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/expeditions"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Expeditions />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/expedition/:name"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <ExpeditionDetail />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/content/:id"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <ContentDetail />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/about"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <About />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/contact"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Contact />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/sitemap"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Sitemap />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/privacy"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Privacy />
              </main>

              <Footer />
            </>
          }
        />

        <Route
          path="/terms"
          element={
            <>
              <Navbar />

              <main className="main-content">
                <Terms />
              </main>

              <Footer />
            </>
          }
        />

        {/* =================================================
            ADMIN LOGIN
            ================================================= */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* =================================================
            ADMIN DASHBOARD
            ================================================= */}

        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN UPLOAD
            ================================================= */}

        <Route
          path="/admin/upload"
          element={
            <AdminRoute>
              <AdminUpload />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN CONTENT
            ================================================= */}

        <Route
          path="/admin/content"
          element={
            <AdminRoute>
              <AdminContentList />
            </AdminRoute>
          }
        />

        {/* =================================================
            ADMIN EDIT
            ================================================= */}

        <Route
          path="/admin/content/:id/edit"
          element={
            <AdminRoute>
              <AdminEditContent />
            </AdminRoute>
          }
        />
      </Routes>
    </div>
  );
}