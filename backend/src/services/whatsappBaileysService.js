import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import db from "../database/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, "../../data/baileys_auth");

let sock = null;
let connectionStatus = "disconnected"; // disconnected | connecting | qr_ready | connected
let latestQrDataUrl = null;
let connectedPhone = null;
let lastError = null;
let schedulerTimer = null;

const noopLogger = {
  level: "silent",
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
};

function ensureReminderLogsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS wa_reminder_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      reminder_type TEXT NOT NULL,
      reminder_label TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      last_sent_at TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 1,
      confirmed INTEGER NOT NULL DEFAULT 0,
      confirmed_at TEXT,
      UNIQUE(user_id, tanggal, reminder_type)
    );
  `);
}

export function normalizeWaJid(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith("0")) {
    normalized = "62" + normalized.slice(1);
  } else if (!normalized.startsWith("62")) {
    normalized = "62" + normalized;
  }
  return `${normalized}@s.whatsapp.net`;
}

function normalizeDigits(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("62")) return digits;
  return "62" + digits;
}

export function getWhatsAppBotStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === "connected",
    qr_data_url: latestQrDataUrl,
    connected_phone: connectedPhone,
    last_error: lastError,
  };
}

function findUserByPhoneDigits(senderDigits) {
  const normSender = normalizeDigits(senderDigits);
  if (!normSender) return null;

  const reminders = db
    .prepare("SELECT w.user_id, w.phone_number, u.username FROM whatsapp_reminders w JOIN users u ON u.id = w.user_id")
    .all();
  for (const r of reminders) {
    if (normalizeDigits(r.phone_number) === normSender) {
      return r;
    }
  }

  const users = db.prepare("SELECT id as user_id, phone_number, username FROM users WHERE phone_number IS NOT NULL").all();
  for (const u of users) {
    if (normalizeDigits(u.phone_number) === normSender) {
      return u;
    }
  }
  return null;
}

export async function connectWhatsAppBot(forceReset = false) {
  try {
    if (forceReset) {
      if (sock) {
        try { sock.end(undefined); } catch {}
        sock = null;
      }
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      }
      latestQrDataUrl = null;
      connectedPhone = null;
    }

    if (sock && (connectionStatus === "connected" || connectionStatus === "qr_ready" || connectionStatus === "connecting")) {
      return getWhatsAppBotStatus();
    }

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    connectionStatus = "connecting";
    lastError = null;

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version;
    try {
      const latest = await fetchLatestBaileysVersion();
      version = latest.version;
    } catch {
      version = undefined;
    }

    const createSocket = typeof makeWASocket === "function" ? makeWASocket : makeWASocket?.default;
    sock = createSocket({
      version,
      auth: state,
      logger: noopLogger,
      printQRInTerminal: false,
      browser: ["PrediaBeat Bot", "Chrome", "2.0.0"],
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          latestQrDataUrl = await QRCode.toDataURL(qr, {
            width: 280,
            margin: 2,
            color: { dark: "#064e3b", light: "#ffffff" },
          });
          connectionStatus = "qr_ready";
        } catch (err) {
          lastError = "Gagal membuat gambar QR Code.";
        }
      }

      if (connection === "open") {
        connectionStatus = "connected";
        latestQrDataUrl = null;
        lastError = null;
        const rawId = sock?.user?.id || "";
        connectedPhone = rawId.split(":")[0] || rawId.split("@")[0] || "Terhubung";
        console.log("✅ WhatsApp Baileys Bot terhubung:", connectedPhone);
      } else if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        sock = null;

        if (statusCode === DisconnectReason.loggedOut) {
          connectionStatus = "disconnected";
          connectedPhone = null;
          latestQrDataUrl = null;
          if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          }
        } else if (shouldReconnect) {
          connectionStatus = "connecting";
          setTimeout(() => {
            connectWhatsAppBot(false).catch(() => {});
          }, 4000);
        } else {
          connectionStatus = "disconnected";
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      if (!Array.isArray(messages)) return;
      ensureReminderLogsTable();

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const text = (
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          ""
        ).trim();
        if (!text) continue;

        const senderJid = msg.key.remoteJid || "";
        const senderDigits = senderJid.split("@")[0];

        // 1. Cek perintah LINK PB-XXXX
        const linkMatch = text.match(/^LINK\s+(PB-[A-Z0-9]+)$/i);
        if (linkMatch) {
          const code = linkMatch[1].toUpperCase();
          try {
            const row = db
              .prepare("SELECT user_id, phone_number FROM whatsapp_reminders WHERE UPPER(link_code) = ?")
              .get(code);
            if (row) {
              const now = new Date().toISOString();
              db.prepare(
                "UPDATE whatsapp_reminders SET bot_linked = 1, enabled = 1, phone_number = ?, updated_at = ? WHERE user_id = ?"
              ).run(row.phone_number || senderDigits, now, row.user_id);

              await sock.sendMessage(senderJid, {
                text: `Halo! Akun PrediaBeat Anda (${code}) berhasil terhubung dengan Bot WhatsApp. Pengingat cerdas jadwal makan, obat, dan olahraga sekarang aktif! 🌟`,
              });
            }
          } catch (e) {
            console.warn("Gagal proses LINK WA:", e.message);
          }
          continue;
        }

        // 2. Cek konfirmasi user ("okee saya udah minum", "sudah makan", "sudah", "done", "oke", dll)
        const low = text.toLowerCase();
        const isConfirmation = /\b(sudah|udah|done|selesai|beres|oke|okee|ok|siap|sampun)\b/.test(low);
        if (isConfirmation) {
          const matchedUser = findUserByPhoneDigits(senderDigits);
          if (matchedUser) {
            const wibDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
            const pendingLogs = db
              .prepare("SELECT * FROM wa_reminder_logs WHERE user_id = ? AND tanggal = ? AND confirmed = 0")
              .all(matchedUser.user_id, wibDate);

            if (pendingLogs.length > 0) {
              const nowIso = new Date().toISOString();
              db.prepare(
                "UPDATE wa_reminder_logs SET confirmed = 1, confirmed_at = ? WHERE user_id = ? AND tanggal = ? AND confirmed = 0"
              ).run(nowIso, matchedUser.user_id, wibDate);

              const labels = pendingLogs.map((l) => l.reminder_label).join(", ");
              await sock.sendMessage(senderJid, {
                text: `Terima kasih ${matchedUser.username}! ✅ Konfirmasi *${labels}* sudah kami catat. Pengingat untuk jadwal ini dihentikan hari ini. Tetap jaga pola 3J & kesehatan Anda! 🌟`,
              });
            } else {
              await sock.sendMessage(senderJid, {
                text: `Siap ${matchedUser.username}! 👍 Semua pengingat aktif hari ini sudah tercatat selesai. Semangat terus jaga gula darah stabil!`,
              });
            }
          }
        }
      }
    });

    return getWhatsAppBotStatus();
  } catch (error) {
    connectionStatus = "disconnected";
    lastError = error.message || "Gagal menginisialisasi Baileys.";
    console.error("Baileys connect error:", error);
    return getWhatsAppBotStatus();
  }
}

export async function disconnectWhatsAppBot() {
  try {
    if (sock) {
      try { await sock.logout(); } catch {}
      try { sock.end(undefined); } catch {}
      sock = null;
    }
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
    connectionStatus = "disconnected";
    latestQrDataUrl = null;
    connectedPhone = null;
    lastError = null;
    return getWhatsAppBotStatus();
  } catch (error) {
    lastError = error.message;
    return getWhatsAppBotStatus();
  }
}

export async function sendWhatsAppMessage(phoneNumber, text) {
  if (!sock || connectionStatus !== "connected") {
    throw new Error("Bot WhatsApp belum terhubung. Admin perlu scan barcode QR di Dashboard Admin terlebih dahulu.");
  }
  const jid = normalizeWaJid(phoneNumber);
  if (!jid) {
    throw new Error("Nomor WhatsApp tidak valid.");
  }
  await sock.sendMessage(jid, { text });
  return { success: true, jid };
}

async function runReminderTick() {
  if (!sock || connectionStatus !== "connected") return;
  try {
    ensureReminderLogsTable();
    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const wibDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(nowDate);
    const wibTime = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(nowDate);

    const rows = db
      .prepare(`
        SELECT w.*, u.username
        FROM whatsapp_reminders w
        JOIN users u ON u.id = w.user_id
        WHERE w.enabled = 1 AND w.phone_number IS NOT NULL AND w.phone_number != ''
      `)
      .all();

    // 1. Kirim pengingat awal saat jam jadwal tiba
    for (const r of rows) {
      const checks = [
        { cond: r.breakfast_time === wibTime, type: "breakfast", label: "Sarapan Pagi", time: r.breakfast_time, msg: `Halo ${r.username}! 🌅 Waktunya *Sarapan Pagi* sesuai pola 3J PrediaBeat Anda.\n\nBalas *"SUDAH"* atau *"OKE SUDAH MAKAN"* jika sudah sarapan ya!` },
        { cond: r.lunch_time === wibTime, type: "lunch", label: "Makan Siang", time: r.lunch_time, msg: `Halo ${r.username}! ☀️ Waktunya *Makan Siang* teratur sesuai target kalori 3J Anda.\n\nBalas *"SUDAH"* atau *"OKE SUDAH MAKAN"* jika sudah selesai makan ya!` },
        { cond: r.snack_time === wibTime, type: "snack", label: "Selingan Sehat", time: r.snack_time, msg: `Halo ${r.username}! 🍎 Saatnya *Selingan Sehat*. Pilih buah potong atau camilan rendah glikemik.\n\nBalas *"SUDAH"* setelah selesai ya!` },
        { cond: r.dinner_time === wibTime, type: "dinner", label: "Makan Malam", time: r.dinner_time, msg: `Halo ${r.username}! 🌙 Waktunya *Makan Malam* sehat. Utamakan sayur sebelum karbohidrat.\n\nBalas *"SUDAH"* jika sudah makan malam ya!` },
        { cond: r.medicine_enabled && r.medicine_time === wibTime, type: "medicine", label: `Minum Obat (${r.medicine_note || "Harian"})`, time: r.medicine_time, msg: `💊 Pengingat *Minum Obat / Suplemen (${r.medicine_note || "Harian"})* untuk ${r.username}.\n\nJangan lupa diminum tepat waktu, lalu balas *"OKE SUDAH MINUM"* agar pengingat berhenti ya!` },
        { cond: r.exercise_enabled && r.exercise_time === wibTime, type: "exercise", label: "Olahraga Harian", time: r.exercise_time, msg: `🏃 Halo ${r.username}! Waktunya *olahraga ringan 20–30 menit* hari ini untuk menjaga sensitivitas insulin.\n\nBalas *"SUDAH"* jika sudah berolahraga ya!` },
      ];

      for (const item of checks) {
        if (!item.cond) continue;
        const existingLog = db
          .prepare("SELECT * FROM wa_reminder_logs WHERE user_id = ? AND tanggal = ? AND reminder_type = ?")
          .get(r.user_id, wibDate, item.type);

        if (!existingLog) {
          try {
            await sendWhatsAppMessage(r.phone_number, item.msg);
            db.prepare(`
              INSERT INTO wa_reminder_logs (user_id, tanggal, reminder_type, reminder_label, scheduled_time, last_sent_at, retry_count, confirmed)
              VALUES (?, ?, ?, ?, ?, ?, 1, 0)
            `).run(r.user_id, wibDate, item.type, item.label, item.time, nowIso);
          } catch (err) {
            console.warn(`Gagal kirim WA reminder (${r.user_id}/${item.type}):`, err.message);
          }
        }
      }

      // Cek juga pengingat kustom milik user (tambah/edit/hapus sendiri)
      let customList = [];
      try {
        customList = JSON.parse(r.custom_reminders_json || "[]");
      } catch {
        customList = [];
      }
      if (Array.isArray(customList)) {
        for (const cr of customList) {
          if (!cr || cr.enabled === false || cr.time !== wibTime) continue;
          const customType = `custom_${cr.id}`;
          const existingLog = db
            .prepare("SELECT * FROM wa_reminder_logs WHERE user_id = ? AND tanggal = ? AND reminder_type = ?")
            .get(r.user_id, wibDate, customType);
          if (!existingLog) {
            const icon = cr.type === "medicine" ? "💊" : cr.type === "exercise" ? "🏃" : "🍽️";
            const noteLine = cr.note ? `\nCatatan: _${cr.note}_` : "";
            const msg = `${icon} Pengingat *${cr.label}* (${cr.time} WIB) untuk ${r.username}.${noteLine}\n\nBalas *"SUDAH"* atau *"OKE"* jika sudah dilakukan ya!`;
            try {
              await sendWhatsAppMessage(r.phone_number, msg);
              db.prepare(`
                INSERT INTO wa_reminder_logs (user_id, tanggal, reminder_type, reminder_label, scheduled_time, last_sent_at, retry_count, confirmed)
                VALUES (?, ?, ?, ?, ?, ?, 1, 0)
              `).run(r.user_id, wibDate, customType, cr.label, cr.time, nowIso);
            } catch (err) {
              console.warn(`Gagal kirim WA custom reminder (${r.user_id}/${customType}):`, err.message);
            }
          }
        }
      }
    }

    // 2. Follow-up Cerdas: Ingatkan ulang setiap 10 menit (maks 3x follow-up) jika user belum konfirmasi!
    const pendingFollowups = db
      .prepare(`
        SELECT l.*, w.phone_number, w.enabled, u.username
        FROM wa_reminder_logs l
        JOIN whatsapp_reminders w ON w.user_id = l.user_id
        JOIN users u ON u.id = l.user_id
        WHERE l.tanggal = ? AND l.confirmed = 0 AND l.retry_count < 4 AND w.enabled = 1 AND w.phone_number IS NOT NULL AND w.phone_number != ''
      `)
      .all(wibDate);

    for (const p of pendingFollowups) {
      const elapsedMinutes = (nowDate.getTime() - new Date(p.last_sent_at).getTime()) / (1000 * 60);
      if (elapsedMinutes >= 10) {
        const nextRetry = p.retry_count + 1;
        const followupMsg =
          `⏰ *Pengingat Lanjutan (#${nextRetry})*\n` +
          `Halo ${p.username}, kami belum menerima konfirmasi untuk jadwal *${p.reminder_label}* (${p.scheduled_time} WIB).\n\n` +
          `Jika sudah dilakukan, silakan balas *"SUDAH"* atau *"OKE SUDAH MINUM/MAKAN"* agar pengingat berhenti otomatis ya! 😊`;
        try {
          await sendWhatsAppMessage(p.phone_number, followupMsg);
          db.prepare("UPDATE wa_reminder_logs SET last_sent_at = ?, retry_count = ? WHERE id = ?").run(
            nowIso,
            nextRetry,
            p.id
          );
        } catch (err) {
          console.warn(`Gagal kirim WA follow-up (${p.user_id}/${p.reminder_type}):`, err.message);
        }
      }
    }
  } catch (err) {
    // Abaikan error sementara
  }
}

export function initWhatsAppScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) {
    connectWhatsAppBot(false).catch(() => {});
  }
  schedulerTimer = setInterval(runReminderTick, 60 * 1000);
}
