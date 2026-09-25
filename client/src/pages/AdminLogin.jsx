import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/client";
import BrandMark from "../components/BrandMark.jsx";
import ContourLines from "../components/ContourLines.jsx";
import "./login.css";

function EyeIcon({ off }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  // RequireAuth passes the page the admin was trying to reach.
  const redirectTo = location.state?.from || "/admin/dashboard";

  useEffect(() => {
    document.title = "Admin login — PolarConnect";
  }, []);

  function clearError() {
    if (error) setError("");
  }

  function trackCapsLock(e) {
    setCapsLock(e.getModifierState && e.getModifierState("CapsLock"));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });

      // The real token is now set by the server as an httpOnly cookie —
      // it never appears in this response body, so it can't be stored or
      // read here. This flag is only a UI hint for showing admin nav links;
      // every actual protected request is still verified server-side
      // against the cookie.
      sessionStorage.setItem("pc_logged_in", "true");
      sessionStorage.setItem("pc_admin_name", data.admin?.name || "");
      sessionStorage.setItem("pc_admin_email", data.admin?.email || "");
      sessionStorage.setItem("pc_admin_role", data.admin?.role || "");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.message || "Login failed. Please try again.");
      } else {
        setError("Can't reach the server. Check your connection and try again.");
      }
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  const hasError = Boolean(error);

  return (
    <div className="login-page">
      <div className="login-card">
        <aside className="login-aside">
          <ContourLines />
          <BrandMark size={34} className="login-aside-mark" />
          <p className="login-aside-title">PolarConnect</p>
          <p className="login-aside-text">
            Manage expedition reports, photos and videos for the NCPOR public portal.
          </p>
        </aside>

        <div className="login-main">
          <h1>Admin login</h1>
          <p className="login-intro">Log in to upload and manage content.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                placeholder="name@example.com"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
                disabled={loading}
                aria-invalid={hasError}
                aria-describedby={hasError ? "login-error" : undefined}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  onKeyUp={trackCapsLock}
                  onKeyDown={trackCapsLock}
                  onBlur={() => setCapsLock(false)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  aria-invalid={hasError}
                  aria-describedby={hasError ? "login-error" : undefined}
                />
                <button
                  type="button"
                  className="login-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  <EyeIcon off={showPassword} />
                </button>
              </div>
              {capsLock && <p className="login-hint">Caps Lock is on.</p>}
            </div>

            {hasError && (
              <p id="login-error" className="login-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="login-submit" disabled={loading}>
              {loading && <span className="login-spinner" aria-hidden="true" />}
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
