import express from "express";
import cors from "cors";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.resolve(__dirname, "../public");

const app = express();

// CORS configuration (mendukung localhost dan tunnel publik seperti ngrok)
app.use(
  cors({
    origin: (origin, callback) => {
      // Izinkan request tanpa origin (same-origin, curl, mobile) atau dari domain ngrok/localhost
      callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Logging
if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static built frontend files if available (Production / Docker combined image)
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
} else {
  // Health Check Endpoint for Dev mode
  app.get("/", (req, res) => {
    res.json({
      status: "online",
      name: "PrediaBeat Clinical Backend API",
      version: "1.0.0",
      standard: "PERKENI 2021 & Kemenkes RI Guidelines",
      timestamp: new Date().toISOString(),
    });
  });
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    database: "sqlite (WAL mode)",
    auth: "JWT Bearer active",
    timestamp: new Date().toISOString(),
  });
});

// Main API Router
app.use("/api", apiRouter);

// SPA fallback for frontend routes in combined image
if (fs.existsSync(publicPath)) {
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(publicPath, "index.html"));
  });
}

// 404 Handler for API
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
