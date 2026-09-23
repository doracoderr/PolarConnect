require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const uploadRoutes = require("./routes/upload.routes");
const contentRoutes = require("./routes/content.routes");
const seoRoutes = require("./routes/seo.routes");
const mediaRoutes = require("./routes/media.routes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "polarconnect-api" }));

app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/media", mediaRoutes);
app.use("/", seoRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// Central error handler
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] PolarConnect API running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("[server] Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
