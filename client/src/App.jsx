import { useEffect, useState } from "react";
import {
  Routes,
  Route,
  Link,
  NavLink,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";

import PublicPortal from "./pages/PublicPortal.jsx";
import ContentDetail from "./pages/ContentDetail.jsx";
import About from "./pages/About.jsx";
import Contact from "./pages/Contact.jsx";

import AdminLogin from "./pages/AdminLogin.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminUpload from "./pages/AdminUpload.jsx";
import AdminContentList from "./pages/AdminContentList.jsx";
import AdminEditContent from "./pages/AdminEditContent.jsx";

import Sitemap from "./pages/Sitemap.jsx";
import Footer from "./components/footer.jsx";

import "./styles.css";
import "./admin.css";


/* =========================================================
   AUTH
========================================================= */

function isLoggedIn() {
  return Boolean(localStorage.getItem("pc_token"));
}


function RequireAuth({ children }) {
  if (!isLoggedIn()) {
    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  return (
    <AdminLayout>
      {children}
    </AdminLayout>
  );
}


/* =========================================================
   BRAND ICON
========================================================= */

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="17"
        cy="17"
        r="15"
        stroke="currentColor"
        strokeWidth="1.8"
      />

      <path
        d="M17 5.8L20 14.7 17 28.2 14 14.7 17 5.8Z"
        fill="currentColor"
      />

      <circle
        cx="17"
        cy="17"
        r="2"
        fill="var(--navy)"
      />
    </svg>
  );
}


/* =========================================================
   ADMIN ICONS
========================================================= */

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="1"
      />

      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
      />

      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
      />

      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
      />
    </svg>
  );
}


function UploadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />

      <path d="M4 14v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" />
    </svg>
  );
}


function ContentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="3"
        width="14"
        height="18"
        rx="2"
      />

      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}


function PagesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="2"
      />

      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}


function MediaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <circle
        cx="8"
        cy="9"
        r="1.5"
      />

      <path d="M4 17l5-5 4 4 3-3 4 4" />
    </svg>
  );
}


function SitemapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M12 3v18" />
      <path d="M5 8h14" />

      <path d="M5 8v4" />
      <path d="M19 8v4" />

      <rect
        x="2.5"
        y="12"
        width="5"
        height="5"
        rx="1"
      />

      <rect
        x="16.5"
        y="12"
        width="5"
        height="5"
        rx="1"
      />

      <rect
        x="9.5"
        y="2"
        width="5"
        height="5"
        rx="1"
      />
    </svg>
  );
}


function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5" />

      <path d="M14 8l4 4-4 4" />

      <path d="M9 12h9" />
    </svg>
  );
}


function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />

      <path d="M10 21h4" />
    </svg>
  );
}


function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m7 9 5 5 5-5" />
    </svg>
  );
}


/* =========================================================
   ADMIN SIDEBAR
========================================================= */

function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  function logout() {
    localStorage.removeItem("pc_token");
    navigate("/");
  }

  function isActive(path) {
    return (
      location.pathname === path ||
      location.pathname.startsWith(`${path}/`)
    );
  }

  return (
    <aside className="admin-sidebar">

      <div className="admin-sidebar-top">

        <Link
          to="/admin/dashboard"
          className="admin-brand"
        >
          <BrandMark />

          <span className="admin-brand-text">
            <strong>
              PolarConnect
            </strong>

            <small>
              NCPOR · Polar &amp; Ocean Research
            </small>
          </span>
        </Link>


        <nav className="admin-sidebar-nav">

          <NavLink
            to="/admin/dashboard"
            className={
              "admin-sidebar-link" +
              (
                isActive("/admin/dashboard")
                  ? " is-active"
                  : ""
              )
            }
          >
            <span className="admin-sidebar-icon">
              <DashboardIcon />
            </span>

            <span>
              Dashboard
            </span>
          </NavLink>


          <NavLink
            to="/admin/upload"
            className={
              "admin-sidebar-link" +
              (
                isActive("/admin/upload")
                  ? " is-active"
                  : ""
              )
            }
          >
            <span className="admin-sidebar-icon">
              <UploadIcon />
            </span>

            <span>
              Upload Content
            </span>
          </NavLink>


          <NavLink
            to="/admin/content"
            className={
              "admin-sidebar-link" +
              (
                isActive("/admin/content")
                  ? " is-active"
                  : ""
              )
            }
          >
            <span className="admin-sidebar-icon">
              <ContentIcon />
            </span>

            <span>
              Manage Content
            </span>
          </NavLink>


          <NavLink
            to="/sitemap"
            className={
              "admin-sidebar-link" +
              (
                isActive("/sitemap")
                  ? " is-active"
                  : ""
              )
            }
          >
            <span className="admin-sidebar-icon">
              <PagesIcon />
            </span>

            <span>
              Pages
            </span>
          </NavLink>


          <NavLink
            to="/admin/content"
            className="admin-sidebar-link"
          >
            <span className="admin-sidebar-icon">
              <MediaIcon />
            </span>

            <span>
              Media Library
            </span>
          </NavLink>


          <NavLink
            to="/sitemap"
            className={
              "admin-sidebar-link" +
              (
                isActive("/sitemap")
                  ? " is-active"
                  : ""
              )
            }
          >
            <span className="admin-sidebar-icon">
              <SitemapIcon />
            </span>

            <span>
              Sitemap
            </span>
          </NavLink>

        </nav>
      </div>


      <button
        type="button"
        className="admin-logout"
        onClick={logout}
      >
        <span className="admin-sidebar-icon">
          <LogoutIcon />
        </span>

        <span>
          Log out
        </span>
      </button>

    </aside>
  );
}


/* =========================================================
   ADMIN TOP BAR
   View Site intentionally removed
========================================================= */

function AdminTopbar() {
  return (
    <header className="admin-topbar">

      <div className="admin-topbar-links">

        <Link to="/">
          Home
        </Link>

        <Link to="/about">
          About
        </Link>

        <Link to="/contact">
          Contact
        </Link>

      </div>


      <div className="admin-topbar-right">

        <button
          type="button"
          className="admin-notification"
          aria-label="Notifications"
        >
          <BellIcon />

          <span className="admin-notification-count">
            3
          </span>
        </button>


        <button
          type="button"
          className="admin-profile"
        >
          <span className="admin-profile-avatar">
            A
          </span>

          <span className="admin-profile-name">
            Admin
          </span>

          <ChevronIcon />
        </button>

      </div>

    </header>
  );
}


/* =========================================================
   ADMIN LAYOUT
========================================================= */

function AdminLayout({ children }) {
  return (
    <div className="admin-layout">

      <AdminSidebar />

      <div className="admin-main">

        <AdminTopbar />

        <main className="admin-page-content">
          {children}
        </main>

      </div>

    </div>
  );
}


/* =========================================================
   PUBLIC NAVBAR
========================================================= */

function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const loggedIn = isLoggedIn();


  function logout() {
    localStorage.removeItem("pc_token");

    setMenuOpen(false);

    navigate("/");
  }


  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);


  const navClass = ({ isActive }) =>
    "nav-link" +
    (
      isActive
        ? " is-active"
        : ""
    );


  return (
    <nav className="navbar">

      <div className="navbar-inner">

        <Link
          to="/"
          className="brand"
          onClick={() =>
            setMenuOpen(false)
          }
        >
          <BrandMark />

          <span className="brand-text">

            PolarConnect

            <span className="brand-sub">
              NCPOR &middot; Polar &amp; Ocean Research
            </span>

          </span>
        </Link>


        <button
          className="nav-toggle"
          type="button"
          aria-label={
            menuOpen
              ? "Close menu"
              : "Open menu"
          }
          aria-expanded={menuOpen}
          onClick={() =>
            setMenuOpen(
              (value) => !value
            )
          }
        >
          <span />
          <span />
          <span />
        </button>


        <div
          className={
            "nav-links" +
            (
              menuOpen
                ? " is-open"
                : ""
            )
          }
        >

          <NavLink
            to="/"
            end
            className={navClass}
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Home
          </NavLink>


          <NavLink
            to="/about"
            className={navClass}
            onClick={() =>
              setMenuOpen(false)
            }
          >
            About
          </NavLink>


          <NavLink
            to="/contact"
            className={navClass}
            onClick={() =>
              setMenuOpen(false)
            }
          >
            Contact
          </NavLink>


          {loggedIn ? (

            <div className="nav-admin-group">

              <span
                className="nav-divider"
                aria-hidden="true"
              />

              <NavLink
                to="/admin/dashboard"
                className={navClass}
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                Dashboard
              </NavLink>


              <button
                type="button"
                onClick={logout}
                className="nav-button nav-button-outline"
              >
                Log out
              </button>

            </div>

          ) : (

            <NavLink
              to="/admin/login"
              className={({ isActive }) =>
                "nav-button" +
                (
                  isActive
                    ? " is-active"
                    : ""
                )
              }
              onClick={() =>
                setMenuOpen(false)
              }
            >
              Admin login
            </NavLink>

          )}

        </div>

      </div>

    </nav>
  );
}


/* =========================================================
   APP
========================================================= */

export default function App() {
  return (
    <div className="app-shell">

      <Routes>

        {/* ===============================================
            ADMIN LOGIN
        =============================================== */}

        <Route
          path="/admin/login"
          element={
            <AdminLogin />
          }
        />


        {/* ===============================================
            ADMIN DASHBOARD
        =============================================== */}

        <Route
          path="/admin/dashboard"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />


        {/* ===============================================
            ADMIN UPLOAD
        =============================================== */}

        <Route
          path="/admin/upload"
          element={
            <RequireAuth>
              <AdminUpload />
            </RequireAuth>
          }
        />


        {/* ===============================================
            ADMIN CONTENT
        =============================================== */}

        <Route
          path="/admin/content"
          element={
            <RequireAuth>
              <AdminContentList />
            </RequireAuth>
          }
        />


        {/* ===============================================
            ADMIN EDIT
        =============================================== */}

        <Route
          path="/admin/content/:id/edit"
          element={
            <RequireAuth>
              <AdminEditContent />
            </RequireAuth>
          }
        />


        {/* ===============================================
            PUBLIC HOME
        =============================================== */}

        <Route
          path="/"
          element={
            <>
              <PublicNavbar />

              <main className="main-content">
                <PublicPortal />
              </main>

              <Footer />
            </>
          }
        />


        {/* ===============================================
            CONTENT DETAIL
        =============================================== */}

        <Route
          path="/content/:id"
          element={
            <>
              <PublicNavbar />

              <main className="main-content">
                <ContentDetail />
              </main>

              <Footer />
            </>
          }
        />


        {/* ===============================================
            ABOUT
        =============================================== */}

        <Route
          path="/about"
          element={
            <>
              <PublicNavbar />

              <main className="main-content">
                <About />
              </main>

              <Footer />
            </>
          }
        />


        {/* ===============================================
            CONTACT
        =============================================== */}

        <Route
          path="/contact"
          element={
            <>
              <PublicNavbar />

              <main className="main-content">
                <Contact />
              </main>

              <Footer />
            </>
          }
        />


        {/* ===============================================
            SITEMAP
        =============================================== */}

        <Route
          path="/sitemap"
          element={
            <>
              <PublicNavbar />

              <main className="main-content">
                <Sitemap />
              </main>

              <Footer />
            </>
          }
        />

      </Routes>

    </div>
  );
}