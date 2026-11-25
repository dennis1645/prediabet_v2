import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/connection.js";
import { config } from "../config/env.js";
import {
  getWhatsAppBotStatus,
  connectWhatsAppBot,
  disconnectWhatsAppBot,
  sendWhatsAppMessage,
} from "../services/whatsappBaileysService.js";

export function register(req, res) {
  try {
    const { username, email, password, phone_number, nomor_telepon, usia } = req.body;
    const finalPhone = (phone_number || nomor_telepon || "").trim() || null;
    const parsedAge = usia !== undefined && usia !== null && String(usia).trim() !== "" ? parseInt(usia, 10) : null;

    if (!username || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Nama minimal 3 karakter.",
      });
    }

    if (parsedAge !== null && (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 120)) {
      return res.status(400).json({
        success: false,
        message: "Usia tidak valid (harus antara 10 – 120 tahun).",
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

    try {
      db.exec("ALTER TABLE users ADD COLUMN usia INTEGER;");
    } catch (e) {}

    const insertStmt = db.prepare(`
      INSERT INTO users (username, username_normalized, email, email_normalized, phone_number, usia, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?, ?)
    `);

    const result = insertStmt.run(username.trim(), usernameNorm, email.trim(), emailNorm, finalPhone, parsedAge, passwordHash, now, now);
    const userId = result.lastInsertRowid;

    const token = jwt.sign(
      { id: userId, username: username.trim(), role: "user" },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      success: true,
      message: "Registrasi berhasil! Silakan ikuti sesi wawancara klinis bersama Dr. Predi.",
      data: {
        token,
        user: {
          id: userId,
          username: username.trim(),
          email: email.trim(),
          phone_number: finalPhone,
          usia: parsedAge,
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
          usia: user.usia ?? (profile?.usia ? parseInt(profile.usia, 10) : null),
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

function ensureWaReminderTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS whatsapp_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      phone_number TEXT,
      enabled INTEGER NOT NULL DEFAULT 0,
      breakfast_time TEXT NOT NULL DEFAULT '07:00',
      snack_time TEXT NOT NULL DEFAULT '15:30',
      lunch_time TEXT NOT NULL DEFAULT '12:30',
      dinner_time TEXT NOT NULL DEFAULT '18:30',
      medicine_enabled INTEGER NOT NULL DEFAULT 0,
      medicine_time TEXT NOT NULL DEFAULT '08:00',
      medicine_note TEXT DEFAULT 'Obat / Suplemen Harian',
      exercise_enabled INTEGER NOT NULL DEFAULT 0,
      exercise_time TEXT NOT NULL DEFAULT '17:00',
      bot_linked INTEGER NOT NULL DEFAULT 0,
      link_code TEXT,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
}

function generateLinkCode(userId) {
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PB-${userId}${rand}`;
}

export function getWaReminders(req, res) {
  try {
    ensureWaReminderTable();
    const userId = req.user.id;
    let row = db.prepare("SELECT * FROM whatsapp_reminders WHERE user_id = ?").get(userId);
    const userRow = db.prepare("SELECT phone_number FROM users WHERE id = ?").get(userId);
    const now = new Date().toISOString();

    if (!row) {
      const code = generateLinkCode(userId);
      db.prepare(`
        INSERT INTO whatsapp_reminders (user_id, phone_number, link_code, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(userId, userRow?.phone_number || "", code, now);
      row = db.prepare("SELECT * FROM whatsapp_reminders WHERE user_id = ?").get(userId);
    } else if (!row.link_code) {
      const code = generateLinkCode(userId);
      db.prepare("UPDATE whatsapp_reminders SET link_code = ? WHERE user_id = ?").run(code, userId);
      row.link_code = code;
    }

    res.json({
      success: true,
      data: {
        ...row,
        enabled: Boolean(row.enabled),
        medicine_enabled: Boolean(row.medicine_enabled),
        exercise_enabled: Boolean(row.exercise_enabled),
        bot_linked: Boolean(row.bot_linked),
      },
    });
  } catch (error) {
    console.error("getWaReminders error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat pengaturan pengingat WhatsApp." });
  }
}

export function saveWaReminders(req, res) {
  try {
    ensureWaReminderTable();
    const userId = req.user.id;
    const {
      phone_number,
      enabled,
      breakfast_time,
      snack_time,
      lunch_time,
      dinner_time,
      medicine_enabled,
      medicine_time,
      medicine_note,
      exercise_enabled,
      exercise_time,
    } = req.body;

    const now = new Date().toISOString();
    const existing = db.prepare("SELECT * FROM whatsapp_reminders WHERE user_id = ?").get(userId);
    const linkCode = existing?.link_code || generateLinkCode(userId);
    const cleanPhone = (phone_number || "").trim();

    db.prepare(`
      INSERT INTO whatsapp_reminders (
        user_id, phone_number, enabled, breakfast_time, snack_time, lunch_time, dinner_time,
        medicine_enabled, medicine_time, medicine_note, exercise_enabled, exercise_time,
        bot_linked, link_code, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        phone_number = excluded.phone_number,
        enabled = excluded.enabled,
        breakfast_time = excluded.breakfast_time,
        snack_time = excluded.snack_time,
        lunch_time = excluded.lunch_time,
        dinner_time = excluded.dinner_time,
        medicine_enabled = excluded.medicine_enabled,
        medicine_time = excluded.medicine_time,
        medicine_note = excluded.medicine_note,
        exercise_enabled = excluded.exercise_enabled,
        exercise_time = excluded.exercise_time,
        updated_at = excluded.updated_at
    `).run(
      userId,
      cleanPhone,
      enabled ? 1 : 0,
      breakfast_time || "07:00",
      snack_time || "15:30",
      lunch_time || "12:30",
      dinner_time || "18:30",
      medicine_enabled ? 1 : 0,
      medicine_time || "08:00",
      (medicine_note || "Obat / Suplemen Harian").trim(),
      exercise_enabled ? 1 : 0,
      exercise_time || "17:00",
      existing?.bot_linked ? 1 : 0,
      linkCode,
      now
    );

    if (cleanPhone) {
      try {
        db.prepare("UPDATE users SET phone_number = ?, updated_at = ? WHERE id = ?").run(cleanPhone, now, userId);
      } catch (e) {}
    }

    const updated = db.prepare("SELECT * FROM whatsapp_reminders WHERE user_id = ?").get(userId);
    res.json({
      success: true,
      message: "Pengaturan pengingat WhatsApp berhasil disimpan!",
      data: {
        ...updated,
        enabled: Boolean(updated.enabled),
        medicine_enabled: Boolean(updated.medicine_enabled),
        exercise_enabled: Boolean(updated.exercise_enabled),
        bot_linked: Boolean(updated.bot_linked),
      },
    });
  } catch (error) {
    console.error("saveWaReminders error:", error);
    res.status(500).json({ success: false, message: "Gagal menyimpan pengaturan pengingat WhatsApp." });
  }
}

export function getDueWaReminders(req, res) {
  try {
    ensureWaReminderTable();
    const wibNow = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
    const targetTime = req.query.time || wibNow;

    const rows = db
      .prepare(`
        SELECT w.*, u.username
        FROM whatsapp_reminders w
        JOIN users u ON u.id = w.user_id
        WHERE w.enabled = 1 AND w.phone_number IS NOT NULL AND w.phone_number != ''
      `)
      .all();

    const due = [];
    for (const r of rows) {
      if (r.breakfast_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "breakfast", time: targetTime, message: `Halo ${r.username}! Waktunya Sarapan Pagi sesuai pola 3J PrediaBeat Anda.` });
      }
      if (r.snack_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "snack", time: targetTime, message: `Halo ${r.username}! Saatnya Selingan Sehat sore ini. Pilih buah atau camilan rendah glikemik ya.` });
      }
      if (r.lunch_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "lunch", time: targetTime, message: `Halo ${r.username}! Waktunya Makan Siang teratur sesuai target kalori 3J Anda.` });
      }
      if (r.dinner_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "dinner", time: targetTime, message: `Halo ${r.username}! Waktunya Makan Malam sehat. Utamakan sayur terlebih dahulu sebelum karbohidrat.` });
      }
      if (r.medicine_enabled && r.medicine_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "medicine", time: targetTime, message: `Pengingat Minum Obat/Suplemen (${r.medicine_note}) untuk ${r.username}. Jangan sampai terlewat ya!` });
      }
      if (r.exercise_enabled && r.exercise_time === targetTime) {
        due.push({ user_id: r.user_id, username: r.username, phone_number: r.phone_number, type: "exercise", time: targetTime, message: `Halo ${r.username}! Waktunya olahraga ringan hari ini (misal jalan santai 20–30 menit) untuk menjaga sensitivitas insulin!` });
      }
    }

    res.json({ success: true, time_wib: targetTime, count: due.length, due });
  } catch (error) {
    console.error("getDueWaReminders error:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil jadwal pengingat." });
  }
}

export function verifyWaBotLink(req, res) {
  try {
    ensureWaReminderTable();
    const { link_code, phone_number } = req.body;
    if (!link_code) {
      return res.status(400).json({ success: false, message: "link_code wajib diisi." });
    }
    const row = db.prepare("SELECT * FROM whatsapp_reminders WHERE UPPER(link_code) = UPPER(?)").get(String(link_code).trim());
    if (!row) {
      return res.status(404).json({ success: false, message: "Kode hubung tidak ditemukan." });
    }
    const now = new Date().toISOString();
    const nextPhone = (phone_number || row.phone_number || "").trim();
    db.prepare("UPDATE whatsapp_reminders SET bot_linked = 1, enabled = 1, phone_number = ?, updated_at = ? WHERE user_id = ?").run(
      nextPhone,
      now,
      row.user_id
    );
    res.json({ success: true, message: "Bot WhatsApp berhasil terhubung dengan akun PrediaBeat Anda!" });
  } catch (error) {
    console.error("verifyWaBotLink error:", error);
    res.status(500).json({ success: false, message: "Gagal verifikasi bot WhatsApp." });
  }
}

export function getWaBotStatus(req, res) {
  res.json({ success: true, data: getWhatsAppBotStatus() });
}

export async function connectWaBot(req, res) {
  try {
    const forceReset = Boolean(req.body?.forceReset);
    const status = await connectWhatsAppBot(forceReset);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Gagal memulai sesi Baileys." });
  }
}

export async function disconnectWaBot(req, res) {
  try {
    const status = await disconnectWhatsAppBot();
    res.json({ success: true, message: "Koneksi Bot WhatsApp diputuskan.", data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || "Gagal memutus sesi Baileys." });
  }
}

export async function testSendWaReminder(req, res) {
  try {
    ensureWaReminderTable();
    const userId = req.user.id;
    const row = db.prepare("SELECT phone_number FROM whatsapp_reminders WHERE user_id = ?").get(userId);
    const userRow = db.prepare("SELECT username, phone_number FROM users WHERE id = ?").get(userId);
    const targetPhone = (req.body?.phone_number || row?.phone_number || userRow?.phone_number || "").trim();

    if (!targetPhone) {
      return res.status(400).json({ success: false, message: "Nomor WhatsApp belum diisi." });
    }

    await sendWhatsAppMessage(
      targetPhone,
      `Halo ${userRow?.username || "Sahabat PrediBeat"}! 🌟 Ini adalah pesan uji coba dari Bot WhatsApp PrediaBeat (Baileys). Pengingat jadwal makan, obat, dan olahraga Anda sudah siap!`
    );

    res.json({ success: true, message: `Pesan uji coba terkirim ke ${targetPhone}!` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || "Gagal mengirim pesan WhatsApp." });
  }
}
