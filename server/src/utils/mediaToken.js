const jwt = require("jsonwebtoken");

// Separate, short expiry from the admin login token — this token only
// ever grants "view this one piece of media", nothing else.
const MEDIA_TOKEN_TTL = process.env.MEDIA_TOKEN_TTL || "2h";

// `preview: true` is only ever passed from admin-authenticated routes. It
// lets the admin panel view/thumbnail DRAFT items that the public can't see.
function signMediaToken(contentId, { preview = false } = {}) {
  const payload = { cid: String(contentId) };
  if (preview) payload.preview = true;
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: MEDIA_TOKEN_TTL,
  });
}

function verifyMediaToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload.cid;
}

// Full payload (cid + optional preview flag).
function decodeMediaToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signMediaToken, verifyMediaToken, decodeMediaToken };
