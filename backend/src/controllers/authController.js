import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/connection.js";
import { config } from "../config/env.js";

export function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Username minimal 3 karakter.",
      });
    }

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Format email tidak valid.",
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter.",
      });
    }

    const usernameNorm = username.trim().toLowerCase();
    const emailNorm = email.trim().toLowerCase();

    // Check existing
    const existing = db
      .prepare("SELECT id FROM users WHERE username_normalized = ? OR email_normalized = ?")
      .get(usernameNorm, emailNorm);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Username atau email sudah terdaftar. Silakan gunakan yang lain.",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (username, username_normalized, email, email_normalized, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'user', ?, ?)
    `);

    const result = insertStmt.run(username.trim(), usernameNorm, email.trim(), emailNorm, passwordHash, now, now);
    const userId = result.lastInsertRowid;

    const token = jwt.sign(
      { id: userId, username: username.trim(), role: "user" },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil! Silakan lengkapi profil kesehatan Anda.",
      data: {
        token,
        user: {
          id: userId,
          username: username.trim(),
          email: email.trim(),
          role: "user",
        },
        hasCompletedQuestionnaire: false,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memproses registrasi.",
    });
  }
}

export function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Silakan isi username/email dan password.",
      });
    }

    const inputNorm = username.trim().toLowerCase();

    const user = db
      .prepare("SELECT * FROM users WHERE username_normalized = ? OR email_normalized = ?")
      .get(inputNorm, inputNorm);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Kredensial salah. Username atau email tidak ditemukan.",
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Password yang Anda masukkan salah.",
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Check if user has completed questionnaire profile
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(user.id);

    let profile = null;
    let analysis = null;

    if (profileRow) {
      try {
        profile = JSON.parse(profileRow.full_profile_data);
        analysis = JSON.parse(profileRow.analysis_result);
      } catch (e) {
        console.error("Error parsing user profile JSON:", e);
      }
    }

    res.json({
      success: true,
      message: "Login berhasil! Selamat datang kembali.",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        hasCompletedQuestionnaire: Boolean(profileRow),
        profile,
        analysis,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memproses login pengguna.",
    });
  }
}

export function getMe(req, res) {
  try {
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);

    let profile = null;
    let analysis = null;

    if (profileRow) {
      try {
        profile = JSON.parse(profileRow.full_profile_data);
        analysis = JSON.parse(profileRow.analysis_result);
      } catch (e) {
        console.error("Parse error:", e);
      }
    }

    res.json({
      success: true,
      data: {
        user: req.user,
        hasCompletedQuestionnaire: Boolean(profileRow),
        profile,
        analysis,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil data user." });
  }
}
