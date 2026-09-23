const { Resend } = require("resend");

let resendClient = null;

function getClient() {
  if (resendClient) return resendClient;

  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — email sending is disabled");
    return null;
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

async function sendUploadConfirmation(content) {
  const client = getClient();
  if (!client) return; // silently skip in dev if Resend isn't configured

  try {
    await client.emails.send({
      from: process.env.EMAIL_FROM || "PolarConnect <onboarding@resend.dev>",
      to: process.env.EMAIL_TO || "admin@ncpor.res.in",
      subject: `New content uploaded: ${content.title}`,
      html:
        `<p>A new item was uploaded to PolarConnect.</p>` +
        `<ul>` +
        `<li><strong>Title:</strong> ${content.title}</li>` +
        `<li><strong>Category:</strong> ${content.category}</li>` +
        `<li><strong>Expedition:</strong> ${content.expeditionName || "-"}</li>` +
        `<li><strong>Media:</strong> <a href="${content.mediaUrl}">${content.mediaUrl}</a></li>` +
        `</ul>`,
    });
  } catch (err) {
    console.error("[email] Failed to send upload confirmation:", err.message);
  }
}

module.exports = { sendUploadConfirmation };
