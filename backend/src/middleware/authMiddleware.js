import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import db from "../database/connection.js";

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token autentikasi tidak ditemukan.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Look up user in database
    const userStmt = db.prepare("SELECT id, username, email, role FROM users WHERE id = ?");
    const user = userStmt.get(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Pengguna tidak ditemukan atau sesi telah berakhir.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Sesi login Anda telah kedaluwarsa. Silakan masuk kembali.",
      });
    }
    return res.status(403).json({
      success: false,
      message: "Token autentikasi tidak valid.",
    });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({
        success: false,
        message: "Akses terlarang. Anda tidak memiliki izin untuk fitur ini.",
      });
    }
    next();
  };
}
