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
const sentLogCache = new Set(); // key: `${date}_${time}_${userId}_${type}`

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

export function getWhatsAppBotStatus() {
  return {
    status: connectionStatus,
    connected: connectionStatus === "connected",
    qr_data_url: latestQrDataUrl,
    connected_phone: connectedPhone,
    last_error: lastError,
  };
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
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;
        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          "";
        const match = String(text).trim().match(/^LINK\s+(PB-[A-Z0-9]+)$/i);
        if (match) {
          const code = match[1].toUpperCase();
          const senderJid = msg.key.remoteJid || "";
          const senderDigits = senderJid.split("@")[0];
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
                text: `Halo! Akun PrediaBeat Anda (${code}) berhasil terhubung dengan Bot WhatsApp. Pengingat jadwal makan, obat, dan olahraga sekarang aktif! 🌟`,
              });
            }
          } catch (e) {
            console.warn("Gagal proses LINK WA:", e.message);
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
    throw new Error("Bot WhatsApp belum terhubung. Silakan scan barcode QR terlebih dahulu.");
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
    const nowDate = new Date();
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

    for (const r of rows) {
      const checks = [
        { cond: r.breakfast_time === wibTime, type: "breakfast", msg: `Halo ${r.username}! 🌅 Waktunya Sarapan Pagi sesuai jadwal 3J PrediaBeat Anda.` },
        { cond: r.lunch_time === wibTime, type: "lunch", msg: `Halo ${r.username}! ☀️ Waktunya Makan Siang teratur sesuai target kalori 3J Anda.` },
        { cond: r.snack_time === wibTime, type: "snack", msg: `Halo ${r.username}! 🍎 Saatnya Selingan Sehat. Pilih buah potong atau camilan rendah glikemik.` },
        { cond: r.dinner_time === wibTime, type: "dinner", msg: `Halo ${r.username}! 🌙 Waktunya Makan Malam sehat. Utamakan sayur terlebih dahulu sebelum karbohidrat.` },
        { cond: r.medicine_enabled && r.medicine_time === wibTime, type: "medicine", msg: `💊 Pengingat Minum Obat/Suplemen (${r.medicine_note || "Harian"}) untuk ${r.username}. Jangan sampai terlewat!` },
        { cond: r.exercise_enabled && r.exercise_time === wibTime, type: "exercise", msg: `🏃 Halo ${r.username}! Waktunya olahraga ringan 20–30 menit hari ini untuk menjaga sensitivitas insulin.` },
      ];

      for (const item of checks) {
        if (!item.cond) continue;
        const key = `${wibDate}_${wibTime}_${r.user_id}_${item.type}`;
        if (sentLogCache.has(key)) continue;
        sentLogCache.add(key);
        try {
          await sendWhatsAppMessage(r.phone_number, item.msg);
        } catch (err) {
          console.warn(`Gagal kirim WA reminder (${key}):`, err.message);
        }
      }
    }
  } catch (err) {
    // Abaikan jika tabel belum terbentuk
  }
}

export function initWhatsAppScheduler() {
  if (schedulerTimer) clearInterval(schedulerTimer);
  // Auto-reconnect jika kredensial Baileys sudah pernah tersimpan sebelumnya
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) {
    connectWhatsAppBot(false).catch(() => {});
  }
  schedulerTimer = setInterval(runReminderTick, 60 * 1000);
}
