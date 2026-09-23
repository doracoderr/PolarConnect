const jwt = require("jsonwebtoken");

// Separate, short expiry from the admin login token — this token only
// ever grants "view this one piece of media", nothing else.
const MEDIA_TOKEN_TTL = process.env.MEDIA_TOKEN_TTL || "2h";

function signMediaToken(contentId) {
  return jwt.sign({ cid: String(contentId) }, process.env.JWT_SECRET, {
    expiresIn: MEDIA_TOKEN_TTL,
  });
}

function verifyMediaToken(token) {
  const payload = jwt.verify(token, process.env.JWT_SECRET);
  return payload.cid;
}

module.exports = { signMediaToken, verifyMediaToken };
