const cloudinary = require("../config/cloudinary");

/**
 * Issues a signature so the React frontend can upload a file
 * DIRECTLY to Cloudinary (the file never passes through our server).
 * The frontend then sends back the resulting secure_url + public_id
 * when it calls POST /api/content.
 */
function getUploadSignature(req, res) {
  const timestamp = Math.round(Date.now() / 1000);
  const folder = process.env.CLOUDINARY_FOLDER || "polarconnect";

  const paramsToSign = { timestamp, folder };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  return res.json({
    timestamp,
    signature,
    folder,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  });
}

module.exports = { getUploadSignature };
