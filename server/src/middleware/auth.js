const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");

/**
 * Verifies the Bearer JWT on protected admin routes and attaches
 * the authenticated admin to req.admin.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Missing or invalid Authorization header" });
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
