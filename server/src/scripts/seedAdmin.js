/**
 * Creates the first admin account, using the SEED_ADMIN_* values
 * from .env. Run with: npm run seed:admin
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

  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`[seed] Admin already exists: ${email}`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ name, email, passwordHash, role: "admin" });

  console.log(`[seed] Admin created: ${email}`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[seed] Failed:", err.message);
  process.exit(1);
});
