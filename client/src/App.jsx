import { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import PublicPortal from "./pages/PublicPortal.jsx";
import ContentDetail from "./pages/ContentDetail.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminUpload from "./pages/AdminUpload.jsx";
import AdminContentList from "./pages/AdminContentList.jsx";
import AdminEditContent from "./pages/AdminEditContent.jsx";
import Sitemap from "./pages/Sitemap.jsx";

function isLoggedIn() {
  return Boolean(localStorage.getItem("pc_token"));
}

// Small compass-rose mark used as the brand icon — nods to expedition
// navigation without leaning on a stock snowflake/globe emoji.
function BrandMark() {
  return (
    <svg className="brand-mark" width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M13 4.5L15.2 11.4 13 21.5 10.8 11.4 13 4.5Z" fill="currentColor" />
      <circle cx="13" cy="13" r="1.6" fill="var(--navy)" />
    </svg>
  );
}

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const loggedIn = isLoggedIn();

  const logout = () => {
    localStorage.removeItem("pc_token");
    setMenuOpen(false);
    navigate("/");
  };

  const closeMenu = () => setMenuOpen(false);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  const navClass = ({ isActive }) => "nav-link" + (isActive ? " is-active" : "");

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={closeMenu}>
          <BrandMark />
          <span className="brand-text">
            PolarConnect
            <span className="brand-sub">NCPOR &middot; Polar &amp; Ocean Research</span>
          </span>
        </Link>

        <button
          className="nav-toggle"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={"nav-links" + (menuOpen ? " is-open" : "")}>
          <NavLink to="/" end className={navClass} onClick={closeMenu}>
            Portal
          </NavLink>

          {loggedIn ? (
            <div className="nav-admin-group">
              <span className="nav-divider" aria-hidden="true" />
              <NavLink to="/admin/content" className={navClass} onClick={closeMenu}>
                Content
              </NavLink>
              <NavLink to="/admin/upload" className={navClass} onClick={closeMenu}>
                Upload
              </NavLink>
              <button onClick={logout} className="nav-button nav-button-outline">
                Log out
              </button>
            </div>
          ) : (
            <NavLink
              to="/admin/login"
              className={({ isActive }) => "nav-button" + (isActive ? " is-active" : "")}
              onClick={closeMenu}
            >
              Admin login
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }) {
  const navigate = useNavigate();
  if (!isLoggedIn()) {
    navigate("/admin/login");
    return null;
  }
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PublicPortal />} />
          <Route path="/content/:id" element={<ContentDetail />} />
          <Route path="/sitemap" element={<Sitemap />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/upload"
            element={
              <RequireAuth>
                <AdminUpload />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/content"
            element={
              <RequireAuth>
                <AdminContentList />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/content/:id/edit"
            element={
              <RequireAuth>
                <AdminEditContent />
              </RequireAuth>
            }
          />
        </Routes>
      </main>
      <footer className="footer">
        NCPOR &middot; Ministry of Earth Sciences &middot; Built by Team The PARIKALP (SIH26063) &middot; <Link to="/sitemap">Sitemap</Link>
      </footer>
    </div>
  );
}