import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/connection.js";
import { config } from "../config/env.js";

export function register(req, res) {
  try {
    const { username, email, password, phone_number, nomor_telepon } = req.body;
    const finalPhone = (phone_number || nomor_telepon || "").trim() || null;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Nama minimal 3 karakter.",
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
        message: "Nama atau email sudah terdaftar. Silakan gunakan yang lain.",
      });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const now = new Date().toISOString();

    const insertStmt = db.prepare(`
      INSERT INTO users (username, username_normalized, email, email_normalized, phone_number, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'user', ?, ?)
    `);

    const result = insertStmt.run(username.trim(), usernameNorm, email.trim(), emailNorm, finalPhone, passwordHash, now, now);
    const userId = result.lastInsertRowid;

    const token = jwt.sign(
      { id: userId, username: username.trim(), role: "user" },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil! Silakan ikuti sesi wawancara klinis santai bersama Dr. Predi.",
      data: {
        token,
        user: {
          id: userId,
          username: username.trim(),
          email: email.trim(),
          phone_number: finalPhone,
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
          phone_number: user.phone_number || null,
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

export function updateAccountProfile(req, res) {
  try {
    const userId = req.user.id;
    const { nama, email, phone_number, current_password, new_password } = req.body;

    const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!userRow) {
      return res.status(404).json({ success: false, message: "Akun pengguna tidak ditemukan." });
    }

    const nextName = (nama !== undefined ? String(nama) : userRow.username).trim();
    const nextEmail = (email !== undefined ? String(email) : userRow.email).trim();
    const nextPhone = phone_number !== undefined ? (String(phone_number).trim() || null) : userRow.phone_number;

    if (!nextName || nextName.length < 3) {
      return res.status(400).json({ success: false, message: "Nama minimal 3 karakter." });
    }
    if (!nextEmail || !nextEmail.includes("@")) {
      return res.status(400).json({ success: false, message: "Format alamat email tidak valid." });
    }

    const nameNorm = nextName.toLowerCase();
    const emailNorm = nextEmail.toLowerCase();

    const conflict = db
      .prepare("SELECT id FROM users WHERE (username_normalized = ? OR email_normalized = ?) AND id != ?")
      .get(nameNorm, emailNorm, userId);

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "Nama atau alamat email sudah digunakan oleh akun lain.",
      });
    }

    let nextPasswordHash = userRow.password_hash;
    if (new_password !== undefined && String(new_password).length > 0) {
      if (!current_password) {
        return res.status(400).json({
          success: false,
          message: "Masukkan password saat ini untuk mengganti password baru.",
        });
      }
      const isMatch = bcrypt.compareSync(String(current_password), userRow.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Password saat ini tidak sesuai.",
        });
      }
      if (String(new_password).length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password baru minimal 8 karakter.",
        });
      }
      const salt = bcrypt.genSaltSync(10);
      nextPasswordHash = bcrypt.hashSync(String(new_password), salt);
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE users
      SET username = ?, username_normalized = ?, email = ?, email_normalized = ?, phone_number = ?, password_hash = ?, updated_at = ?
      WHERE id = ?
    `).run(nextName, nameNorm, nextEmail, emailNorm, nextPhone, nextPasswordHash, now, userId);

    // Sinkronkan nama ke full_profile_data jika profil klinis sudah ada
    let updatedProfile = null;
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(userId);
    if (profileRow && profileRow.full_profile_data) {
      try {
        const prof = JSON.parse(profileRow.full_profile_data);
        prof.nama = nextName;
        if (nextPhone) prof.phone_number = nextPhone;
        updatedProfile = prof;
        db.prepare("UPDATE profiles SET full_profile_data = ?, updated_at = ? WHERE user_id = ?").run(
          JSON.stringify(prof),
          now,
          userId
        );
      } catch (e) {}
    }

    const token = jwt.sign(
      { id: userId, username: nextName, role: userRow.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      success: true,
      message: new_password ? "Identitas akun dan password berhasil diperbarui!" : "Identitas akun berhasil diperbarui!",
      data: {
        token,
        user: {
          id: userId,
          username: nextName,
          email: nextEmail,
          phone_number: nextPhone,
          role: userRow.role,
        },
        profile: updatedProfile,
      },
    });
  } catch (error) {
    console.error("updateAccountProfile error:", error);
    res.status(500).json({ success: false, message: "Gagal memperbarui profil akun." });
  }
}
