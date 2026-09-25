const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

// Shared cookie options — httpOnly stops JS (and any XSS payload) from ever
// reading the token; secure means it only travels over HTTPS in production;
// sameSite "lax" stops it being sent on cross-site requests (CSRF surface).
const COOKIE_NAME = "pc_token";
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 1000, // 1h — keep in sync with JWT_EXPIRES_IN
  path: "/",
});

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    // Token now lives ONLY in the httpOnly cookie — it is never put in the
    // JSON body, so client-side JS (and therefore XSS) can never read it.
    res.cookie(COOKIE_NAME, token, cookieOptions());

    return res.json({
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err) {
    console.error("[auth] login error:", err.message);
    return res.status(500).json({ message: "Server error during login" });
  }
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  return res.json({ message: "Logged out" });
}

async function me(req, res) {
  return res.json({ admin: req.admin });
}

module.exports = { login, logout, me };
