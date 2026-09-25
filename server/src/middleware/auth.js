const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * Verifies the Bearer JWT on protected admin routes and attaches
 * the authenticated admin to req.admin.
 */
async function requireAuth(req, res, next) {
  try {
    // Cookie is the source of truth now (httpOnly, so JS can't touch it).
    // The Authorization header is kept as a fallback so any non-browser
    // client (e.g. a Postman/API test) can still authenticate explicitly.
    const header = req.headers.authorization || "";
    const headerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.pc_token || headerToken;

    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(payload.id).select("-passwordHash");

    if (!admin) {
      return res.status(401).json({ message: "Admin account no longer exists" });
    }

    req.admin = admin;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };
