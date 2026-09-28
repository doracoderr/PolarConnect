const rateLimit = require("express-rate-limit");

// Login is the only unauthenticated write-ish endpoint that touches
// credentials, so it gets a tight limit to blunt brute-force/credential-
// stuffing attempts: 5 attempts per IP per 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// Loose, general-purpose ceiling for the rest of the public API so a single
// client (script, scraper, misbehaving tab) can't hammer the server.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down and try again shortly." },
});

module.exports = { loginLimiter, apiLimiter };
