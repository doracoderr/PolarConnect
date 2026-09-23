/**
 * Creates (or updates) the admin account, using the SEED_ADMIN_* values
 * from .env. Run with: npm run seed:admin
 *
 * This is idempotent/"upsert" on purpose: if an admin with this email
 * already exists, it just resets their password to SEED_ADMIN_PASSWORD
 * instead of skipping — so if you ever forget your admin password, just
 * update SEED_ADMIN_PASSWORD in .env and re-run this script.
 */
require("dotenv").config();
const bcrypt = require("bcryptjs");
const connectDB = require("../config/db");
const Admin = require("../models/Admin");

async function run() {
  await connectDB();

  const name = process.env.SEED_ADMIN_NAME || "Admin";
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@polarconnect.local").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "changeme";

  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await Admin.findOne({ email });
  if (existing) {
    existing.name = name;
    existing.passwordHash = passwordHash;
    await existing.save();
    console.log(`[seed] Admin already existed — password reset for: ${email}`);
    process.exit(0);
  }

  await Admin.create({ name, email, passwordHash, role: "admin" });
  console.log(`[seed] Admin created: ${email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
