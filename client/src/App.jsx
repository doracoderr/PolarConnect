import { Routes, Route, Link, useNavigate } from "react-router-dom";
import PublicPortal from "./pages/PublicPortal.jsx";
import ContentDetail from "./pages/ContentDetail.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import AdminUpload from "./pages/AdminUpload.jsx";
import Sitemap from "./pages/Sitemap.jsx";

function isLoggedIn() {
  return Boolean(localStorage.getItem("pc_token"));
}

function Navbar() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("pc_token");
    navigate("/");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="brand">PolarConnect</Link>
      <div className="nav-links">
        <Link to="/">Portal</Link>
        {isLoggedIn() ? (
          <>
            <Link to="/admin/upload">Upload</Link>
            <button onClick={logout} className="link-button">Logout</button>
          </>
        ) : (
          <Link to="/admin/login">Admin Login</Link>
        )}
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
        </Routes>
      </main>
      <footer className="footer">
        NCPOR &middot; Ministry of Earth Sciences &middot; Built by Team The PARIKALP (SIH26063) &middot; <Link to="/sitemap">Sitemap</Link>
      </footer>
    </div>
  );
}
