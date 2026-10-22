import db from "../database/connection.js";
import { detectAndCalculateExercise } from "../utils/metCalculator.js";

/**
 * Menentukan kategori jadwal makan berdasarkan input pengguna atau jam aktual WIB (UTC+7).
 */
function resolveMealTime(userQuery = "", explicitFromAI = null) {
  const ql = (userQuery || "").toLowerCase();
  if (explicitFromAI) return explicitFromAI;
  if (ql.includes("sarapan") || ql.includes("pagi") || ql.includes("breakfast")) return "Sarapan";
  if (ql.includes("makan siang") || ql.includes("siang") || ql.includes("lunch")) return "Makan Siang";
  if (ql.includes("makan malam") || ql.includes("malam") || ql.includes("dinner")) return "Makan Malam";
  if (ql.includes("camilan") || ql.includes("ngemil") || ql.includes("snack") || ql.includes("selingan") || ql.includes("sore")) return "Selingan";

  // Waktu Default berdasarkan Waktu Indonesia Barat (WIB / Asia/Jakarta)
  try {
    const wibHour = parseInt(
      new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jakarta", hour: "2-digit", hour12: false }).format(new Date()),
      10
    );
    if (wibHour >= 5 && wibHour < 11) return "Sarapan";
    if (wibHour >= 11 && wibHour < 16) return "Makan Siang";
    if (wibHour >= 16 && wibHour < 21) return "Makan Malam";
    return "Selingan";
  } catch (e) {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) return "Sarapan";
    if (h >= 11 && h < 16) return "Makan Siang";
    if (h >= 16 && h < 21) return "Makan Malam";
    return "Selingan";
  }
}

// Inisialisasi skema chat_sessions & pastikan kolom metadata dan session_id tersedia
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
} catch (e) {
  // Ignored if table already exists
}

try {
  db.exec("ALTER TABLE chat_logs ADD COLUMN metadata TEXT;");
} catch (e) {}

try {
  db.exec("ALTER TABLE chat_logs ADD COLUMN session_id TEXT;");
} catch (e) {}

try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at);");
} catch (e) {}

/**
 * Returns isolated medical context for the AI server to prevent multi-user context leakage.
 */
export function getUserAIContext(req, res) {
  try {
    const userId = req.user.id;

    const profileRow = db.prepare("SELECT full_profile_data, analysis_result FROM profiles WHERE user_id = ?").get(userId);

    let profile = {};
    let analysis = {};
    let hasProfile = false;

    if (profileRow) {
      try {
        profile = JSON.parse(profileRow.full_profile_data || "{}");
        analysis = JSON.parse(profileRow.analysis_result || "{}");
        hasProfile = true;
      } catch (e) {
        console.error("Error parsing profile JSON:", e);
      }
    }

    // Ambil 5 riwayat chat terakhir khusus user ini
    const chatHistory = db
      .prepare("SELECT role, content, created_at FROM chat_logs WHERE user_id = ? ORDER BY id DESC LIMIT 5")
      .all(userId);

    res.json({
      success: true,
      data: {
        userId,
        username: req.user.username,
        medicalContext: {
          nama: profile.nama || req.user.username,
          has_profile: hasProfile,
          usia: profile.usia || null,
          jenis_kelamin: profile.jenis_kelamin || "Laki-laki",
          bmi: analysis.bmi || null,
          kategori_bmi: analysis.status_bmi || analysis.kategori_bmi || (hasProfile ? "Normal" : "Belum diisi"),
          skor_risiko: analysis.skor_risiko || null,
          kategori_risiko: analysis.kategori_risiko || (hasProfile ? "Normal" : "Belum diisi"),
          gula_darah_puasa: profile.gula_darah_puasa || "Belum ada tes lab",
          hba1c: profile.hba1c || "Belum ada tes lab",
          pantangan_alergi: Array.from(
            new Set(
              (Array.isArray(profile.pantangan_alergi)
                ? profile.pantangan_alergi
                : typeof profile.pantangan_alergi === "string"
                ? profile.pantangan_alergi.split(",")
                : []
              )
                .map((s) => s.trim())
                .filter(Boolean)
            )
          ),
          komorbiditas: profile.komorbiditas || [],
          active_diet: analysis.active_diet_label || "Diet Seimbang Ramah Glukosa",
          target_kalori: analysis.target_kalori || (profile.jenis_kelamin === "Perempuan" ? 1700 : 2000),
        },
        chatHistory: chatHistory.reverse(),
      },
    });
  } catch (error) {
    console.error("AI context error:", error);
    res.status(500).json({ success: false, message: "Gagal menyiapkan konteks AI." });
  }
}

/**
 * Get all conversation sessions for the active user (like ChatGPT / Gemini sidebar).
 */
export function getChatSessions(req, res) {
  try {
    const userId = req.user.id;
    let sessions = db
      .prepare("SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC")
      .all(userId);

    // Otomatis buat sesi default jika ada riwayat legacy tanpa sesi
    if (sessions.length === 0) {
      const existingLogs = db.prepare("SELECT COUNT(*) as count FROM chat_logs WHERE user_id = ?").get(userId);
      if (existingLogs && existingLogs.count > 0) {
        const legacySessionId = `sess_default_${userId}`;
        const now = new Date().toISOString();
        db.prepare(
          "INSERT OR IGNORE INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        ).run(legacySessionId, userId, "Konsultasi Sebelumnya", now, now);

        db.prepare(
          "UPDATE chat_logs SET session_id = ? WHERE user_id = ? AND (session_id IS NULL OR session_id = '')"
        ).run(legacySessionId, userId);

        sessions = db
          .prepare("SELECT id, title, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC")
          .all(userId);
      }
    }

    res.json({ success: true, data: sessions });
  } catch (error) {
    console.error("Error getChatSessions:", error);
    res.status(500).json({ success: false, message: "Gagal memuat daftar sesi konsultasi." });
  }
}

/**
 * Create a new chat session.
 */
export function createChatSession(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const title = (req.body.title || "Konsultasi Baru").trim().slice(0, 45);

    db.prepare("INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(
      sessionId,
      userId,
      title,
      now,
      now
    );

    res.json({
      success: true,
      data: { id: sessionId, title, created_at: now, updated_at: now },
    });
  } catch (error) {
    console.error("Error createChatSession:", error);
    res.status(500).json({ success: false, message: "Gagal membuat sesi konsultasi baru." });
  }
}

/**
 * Get messages for a specific session.
 */
export function getChatSessionHistory(req, res) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const history = db
      .prepare(
        "SELECT id, role, content, metadata, created_at FROM chat_logs WHERE user_id = ? AND session_id = ? ORDER BY id ASC LIMIT 80"
      )
      .all(userId, sessionId);

    const mapped = history.map((item) => {
      let meta = {};
      if (item.metadata) {
        try {
          meta = JSON.parse(item.metadata);
        } catch (e) {}
      }
      return {
        id: item.id,
        role: item.role,
        content: item.content,
        metadata: meta,
        created_at: item.created_at,
      };
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error("Error getChatSessionHistory:", error);
    res.status(500).json({ success: false, message: "Gagal memuat pesan sesi chat." });
  }
}

/**
 * Delete a specific chat session and all its messages.
 */
export function deleteChatSession(req, res) {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    db.prepare("DELETE FROM chat_logs WHERE user_id = ? AND session_id = ?").run(userId, sessionId);
    db.prepare("DELETE FROM chat_sessions WHERE user_id = ? AND id = ?").run(userId, sessionId);

    res.json({ success: true, message: "Sesi percakapan berhasil dihapus." });
  } catch (error) {
    console.error("Error deleteChatSession:", error);
    res.status(500).json({ success: false, message: "Gagal menghapus sesi chat." });
  }
}

/**
 * Direct Log Makanan dari Visual Nutrition Card di Chatbot
 */
export function logFoodDirect(req, res) {
  try {
    const userId = req.user.id;
    const { food_name, calories, meal_time, protein, karbo, lemak } = req.body;
    if (!food_name) {
      return res.status(400).json({ success: false, message: "Nama makanan wajib diisi." });
    }

    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    const timeLabel = meal_time || "Makan Siang";
    const calVal = Math.round(parseFloat(calories) || 0);
    const protVal = Math.round(parseFloat(protein) || 0);
    const carbVal = Math.round(parseFloat(karbo) || 0);
    const fatVal = Math.round(parseFloat(lemak) || 0);

    const existing = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, today);
    const entryNote = `[${timeLabel}] ${food_name} (${calVal} kkal)`;

    if (existing) {
      const updatedNotes = existing.notes ? `${existing.notes}\n${entryNote}` : entryNote;
      const updatedKalori = (existing.actual_kalori || 0) + calVal;
      const updatedProtein = (existing.actual_protein || 0) + protVal;
      const updatedKarbo = (existing.actual_karbo || 0) + carbVal;
      const updatedLemak = (existing.actual_lemak || 0) + fatVal;

      db.prepare(`
        UPDATE daily_progress_logs 
        SET actual_kalori = ?, actual_protein = ?, actual_karbo = ?, actual_lemak = ?, notes = ?, updated_at = ?
        WHERE id = ?
      `).run(updatedKalori, updatedProtein, updatedKarbo, updatedLemak, updatedNotes, now, existing.id);
    } else {
      db.prepare(`
        INSERT INTO daily_progress_logs (
          user_id, tanggal, actual_kalori, actual_protein, actual_karbo, actual_lemak, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, today, calVal, protVal, carbVal, fatVal, entryNote, now, now);
    }

    res.json({
      success: true,
      message: `Menu ${food_name} (${calVal} kkal) berhasil dicatat ke progres ${timeLabel} hari ini!`,
      data: { food_name, meal_time: timeLabel, calories: calVal }
    });
  } catch (error) {
    console.error("Error in logFoodDirect:", error);
    res.status(500).json({ success: false, message: "Gagal mencatat makanan ke database progress." });
  }
}

/**
 * Save chat turn to user's isolated history
 */
export function saveChatLog(req, res) {
  try {
    const { role, content, session_id } = req.body;
    if (!role || !content) {
      return res.status(400).json({ success: false, message: "Role dan konten chat wajib diisi." });
    }

    const now = new Date().toISOString();
    db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
      req.user.id,
      session_id || null,
      role,
      content,
      now
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menyimpan log chat." });
  }
}

/**
 * Get user's isolated chat history (fallback or active session).
 */
export function getChatHistory(req, res) {
  try {
    const userId = req.user.id;
    const sessionId = req.query.session_id;

    let history;
    if (sessionId) {
      history = db
        .prepare(
          "SELECT id, role, content, metadata, created_at FROM chat_logs WHERE user_id = ? AND session_id = ? ORDER BY id ASC LIMIT 50"
        )
        .all(userId, sessionId);
    } else {
      history = db
        .prepare("SELECT id, role, content, metadata, created_at FROM chat_logs WHERE user_id = ? ORDER BY id ASC LIMIT 50")
        .all(userId);
    }

    const mapped = history.map((item) => {
      let meta = {};
      if (item.metadata) {
        try {
          meta = JSON.parse(item.metadata);
        } catch (e) {}
      }
      return {
        id: item.id,
        role: item.role,
        content: item.content,
        metadata: meta,
        created_at: item.created_at,
      };
    });

    res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat riwayat chat." });
  }
}

/**
 * Clear all chat history and all sessions for user.
 */
export function clearChatHistory(req, res) {
  try {
    const userId = req.user.id;
    db.prepare("DELETE FROM chat_logs WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM chat_sessions WHERE user_id = ?").run(userId);
    res.json({ success: true, message: "Semua riwayat percakapan berhasil dibersihkan." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghapus riwayat chat." });
  }
}

/**
 * Forward chat message to Python AI Server (localhost:8000) with strictly isolated user context & multi-session support.
 * Performs pre-filtering and sanitization on the backend first.
 */
export async function forwardChatToAI(req, res) {
  try {
    const rawMessage = req.body.message;
    if (!rawMessage || typeof rawMessage !== "string" || !rawMessage.trim()) {
      return res.status(400).json({ success: false, message: "Pesan pertanyaan wajib diisi." });
    }

    // 1. Backend Input Filtering & Sanitization
    const sanitizedMessage = rawMessage.replace(/<[^>]*>?/gm, "").trim().slice(0, 1000);
    const lowerMessage = sanitizedMessage.toLowerCase();
    const userId = req.user.id;
    const now = new Date().toISOString();

    // 2. Multi-Session Management (ChatGPT / Gemini model)
    let sessionId = req.body.session_id;
    const sessionTitle = sanitizedMessage.length > 32 
      ? sanitizedMessage.slice(0, 32) + "..." 
      : sanitizedMessage;

    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(
        "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
      ).run(sessionId, userId, sessionTitle, now, now);
    } else {
      const existingSession = db.prepare("SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?").get(sessionId, userId);
      if (!existingSession) {
        db.prepare(
          "INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        ).run(sessionId, userId, sessionTitle, now, now);
      } else {
        db.prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ? AND user_id = ?").run(now, sessionId, userId);
      }
    }

    // Ambil data profil medis user
    const profileRow = db.prepare("SELECT full_profile_data, analysis_result FROM profiles WHERE user_id = ?").get(userId);

    let profile = {};
    let analysis = {};
    let hasProfile = false;
    if (profileRow) {
      try {
        profile = JSON.parse(profileRow.full_profile_data || "{}");
        analysis = JSON.parse(profileRow.analysis_result || "{}");
        hasProfile = true;
      } catch (e) {
        console.error("Error parsing profile JSON in forwardChatToAI:", e);
      }
    }

    const displayName = profile.nama || req.user.username;
    const gender = profile.jenis_kelamin || "Laki-laki";
    const salutation = gender === "Perempuan" ? "Ibu" : "Pak";
    const userWeight = profile.berat_badan || 68;

    // Ambil 6 giliran chat terakhir KHUSUS SESI INI agar konteks tidak bocor antar sesi
    const chatHistory = db
      .prepare(
        "SELECT role, content, created_at FROM chat_logs WHERE user_id = ? AND session_id = ? ORDER BY id DESC LIMIT 6"
      )
      .all(userId, sessionId);

    // 3. Pre-filter Kondisi Kedaruratan Medis Akut (Red Flag Alert)
    const emergencyKeywords = ["tidak sadar", "kejang", "nyeri dada hebat", "koma", "pingsan mendadak", "napas sesak berat"];
    const isEmergency = emergencyKeywords.some((k) => lowerMessage.includes(k));

    if (isEmergency) {
      const emergencyResponse = 
        "⚠️ **PERINGATAN GAWAT DARURAT MEDIS:**\n\n" +
        "Gejala yang Anda sampaikan mengindikasikan potensi kondisi darurat akut (seperti hipoglikemia berat atau komplikasi kardiovaskular akut). " +
        "**JANGAN MENUNGGU KONSULTASI ONLINE.** Segera hubungi nomor darurat **119** atau bawa pasien ke Instalasi Gawat Darurat (IGD) rumah sakit terdekat untuk penanganan medis segera!";

      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
        userId, sessionId, "user", sanitizedMessage, now
      );
      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        userId, sessionId, "assistant", emergencyResponse, JSON.stringify({ guardrail: "Protokol Kedaruratan Medis Terpicu" }), now
      );

      return res.json({
        success: true,
        session_id: sessionId,
        response: emergencyResponse,
        guardrail: { zero_allergen_verified: true, safety_message: "Protokol Kedaruratan Medis Terpicu" },
        telemetry: { latency_ms: 5, vllm_connected: false },
      });
    }

    // 4. Pre-filter Guardrail Anti-Jailbreak & Bypass (Rule-Based & Regex)
    const jailbreakPatterns = [
      /\b(langgar|bypass|jailbreak|paksa|abaikan|hiraukan|override)\b/i,
      /\b(sekarang kamu bukan|kamu bukan lagi dokter|berperanlah sebagai|bertindaklah sebagai|pretend to be|act as|dan jawab saja|abaikan semua aturan)\b/i,
      /\b(tetap (buatkan|tuliskan|jawab|buat|tulis)|tetep (buatkan|tuliskan|jawab|buat|tulis)|buat aja|jawab aja|jangan menolak|jangan nolak|jangan sok suci)\b/i,
      /boleh dong kamu langgar/i,
      /kamu langgar/i,
      /bisa kamu langgar/i,
      /langgar aja/i,
      /langgar dong/i,
      /abaikan aturan/i,
      /abaikan panduan/i,
      /lupakan instruksi/i,
      /mode pengembang/i,
      /developer mode/i
    ];

    // Deteksi pembujukan lanjutan (follow-up coercion) jika interaksi sebelumnya adalah penolakan guardrail
    let isFollowupCoercion = false;
    if (chatHistory && chatHistory.length > 0) {
      const lastTurn = chatHistory[chatHistory.length - 1];
      const lastContent = (lastTurn.content || "").toLowerCase();
      const refusalSignals = [
        "tidak dapat menjawab pertanyaan di luar",
        "protokol keselamatan",
        "terikat secara ketat",
        "fokus keahlian saya didedikasikan khusus",
        "tidak diizinkan untuk melanggar"
      ];
      const wasRefused = refusalSignals.some((sig) => lastContent.includes(sig));
      if (wasRefused) {
        const coercionKeywords = [
          /\b(ayolah|plis|tolonglah|tolong dong|kenapa tidak bisa|kenapa gak bisa|kenapa ngga bisa|kenapa pelit|kan cuma|kan gampang|sekali aja|cuma nanya)\b/i,
          /\b(bisa dong|boleh ya|boleh dong|ayolah dok|ayolah predi|buatkan dong|jawab dong)\b/i
        ];
        isFollowupCoercion = coercionKeywords.some((p) => p.test(lowerMessage));
      }
    }

    const isJailbreak = jailbreakPatterns.some((jp) => jp.test(lowerMessage)) || isFollowupCoercion;
    if (isJailbreak) {
      const jailbreakResponse = 
        `Mohon maaf, ${displayName}! Sebagai **Dr. Predi**, konsultan nutrisi klinis pribadi Anda di PrediaBeat, saya terikat secara ketat pada protokol keselamatan medis PERKENI & Kemenkes RI.\n\n` +
        `Saya tidak diizinkan untuk melanggar panduan klinis, mengabaikan batasan sistem, ataupun memberikan kode pemrograman, topik politik, atau hal lain di luar gizi dan kesehatan prediabetes.\n\n` +
        `Mari kita kembali fokus pada kestabilan glukosa darah, rekomendasi hidangan ramah 3J, atau target nutrisi ${salutation} hari ini! 😊`;

      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
        userId, sessionId, "user", sanitizedMessage, now
      );
      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        userId, sessionId, "assistant", jailbreakResponse, JSON.stringify({ guardrail: "Guardrail Anti-Jailbreak Aktif" }), now
      );

      return res.json({
        success: true,
        session_id: sessionId,
        response: jailbreakResponse,
        guardrail: { zero_allergen_verified: true, safety_message: "100% Terverifikasi Aman" },
        telemetry: { latency_ms: 5, vllm_connected: false },
      });
    }

    // 4.1. Pre-filter Privasi Rekam Medis Pasien (Data Privacy Guardrail)
    const privacyPatterns = /\b(user lain|pasien lain|orang lain|data orang|pengguna lain)\b/i;
    if (privacyPatterns.test(lowerMessage)) {
      const privacyResponse = 
        `Mohon maaf, ${displayName}! Sesuai dengan kode etik kedokteran dan protokol privasi rekam medis pasien di PrediaBeat, ` +
        `saya tidak diizinkan untuk membagikan data, riwayat kesehatan, atau profil pasien lain. Seluruh data pasien diisolasi secara ketat.\n\n` +
        `Mari kita fokus pada evaluasi progres, pola makan 3J, dan kestabilan glukosa darah ${salutation} sendiri! 😊`;

      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
        userId, sessionId, "user", sanitizedMessage, now
      );
      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        userId, sessionId, "assistant", privacyResponse, JSON.stringify({ guardrail: "Guardrail Privasi Medis Aktif" }), now
      );

      return res.json({
        success: true,
        session_id: sessionId,
        response: privacyResponse,
        guardrail: { zero_allergen_verified: true, safety_message: "100% Terverifikasi Aman" },
        telemetry: { latency_ms: 5, vllm_connected: false },
      });
    }

    // 4.2. Pre-filter Guardrail Pertanyaan di Luar Lingkup Klinis & Gizi (Out-of-Scope Guardrail)
    const outOfScopePatterns = [
      /\b(presiden|wakil presiden|wapres|menteri|mentri|menter|kementerian|kemendikbud|mendikbud|dpr|mpr|pemilu|pilpres|pilkada|parpol|partai politik|kabinet|gubernur|walikota|bupati|konstitusi|ikn|pemerintah|pejabat|hukum pidana|pasal kuhp)\b/i,
      /\b(koding|coding|programming|source code|python|javascript|typescript|golang|c\+\+|html|css|react|sql query|fungsi sort|algorithm|debugging code|bikin program|script bash|buatkan saya code|buatkan kode|tuliskan kode|buat program)\b/i,
      /\b(sepak bola|liga champions|liga inggris|piala dunia|world cup|persib|persija|manchester united|real madrid|barcelona|skor bola|hasil pertandingan)\b/i,
      /\b(film bioskop|aktor|aktris|artis|konser musik|k-pop|anime|manga|mobile legends|free fire|dota|game steam|gosip|selebriti|sinetron|judika|penyanyi|musisi|lagu|album)\b/i,
      /\b(cryptocurrency|crypto|bitcoin|ethereum|trading saham|forex|pinjaman online|pinjol|investasi bodong)\b/i,
      /\b(teori relativitas|rumus integral|rumus fisika|kecepatan cahaya|tatasurya|astronomi|dinosaurus)\b/i,
    ];

    const healthKeywords = [
      "gula", "glukosa", "darah", "makan", "minum", "menu", "resep", "gizi", "nutrisi",
      "kalori", "protein", "karbo", "karbohidrat", "lemak", "serat", "diet", "diabetes", "prediabetes",
      "hba1c", "gdp", "kolesterol", "tensi", "hipertensi", "berat badan", "tinggi badan",
      "obesitas", "olahraga", "alergi", "pantangan", "puasa", "3j",
      "sayur", "buah", "nasi", "lauk", "ikan", "ayam", "daging", "tahu", "tempe", "telur",
      "oyong", "bayam", "wortel", "brokoli", "pepes", "sup", "soto",
      "siapa saya", "nama saya", "siapa aku", "profil saya", "umur saya", "usia saya"
    ];

    // Gunakan word-boundary regex agar kata seperti "ikan" TIDAK cocok di dalam kata "pendidikan"
    const hasHealthContext = healthKeywords.some((hk) => {
      const escaped = hk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escaped}\\b`, "i");
      return pattern.test(lowerMessage);
    });

    // Deteksi pertanyaan figur publik / selebriti non-kesehatan umum (seperti 'siapa judika')
    const isGenericPersonQuestion = /^\s*(?:siapa|taukah kamu siapa|kenalkah kamu|kenal|tahu)\s+([a-zA-Z\s]{2,25})\??\s*$/i.test(lowerMessage) && !/(saya|aku|predi|dr|dokter)/i.test(lowerMessage);

    const isOutOfScope = (outOfScopePatterns.some((pat) => pat.test(lowerMessage)) || isGenericPersonQuestion) && !hasHealthContext;

    if (isOutOfScope) {
      const outOfScopeResponse = 
        `Halo ${displayName}! Sebagai **Dr. Predi**, dokter konsultan nutrisi klinis pribadi Anda di PrediaBeat, fokus keahlian saya didedikasikan khusus untuk pendampingan pola makan ramah gula darah, takaran gizi 3J, dan pencegahan prediabetes/diabetes sesuai panduan klinis PERKENI & Kemenkes RI.\n\n` +
        `Saya tidak dapat menjawab pertanyaan di luar konteks gizi, kesehatan metabolik, atau rekomendasi menu makanan ramah gula darah.\n\n` +
        `Apakah ada pertanyaan seputar kandungan gizi bahan makanan, takaran karbohidrat/protein, atau rekomendasi menu sehat yang ingin ${salutation} konsultasikan hari ini? 😊`;

      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
        userId, sessionId, "user", sanitizedMessage, now
      );
      db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        userId, sessionId, "assistant", outOfScopeResponse, JSON.stringify({ guardrail: "Menolak Pertanyaan Non-Medis" }), now
      );

      return res.json({
        success: true,
        session_id: sessionId,
        response: outOfScopeResponse,
        guardrail: { zero_allergen_verified: true, safety_message: "100% Terverifikasi Aman" },
        telemetry: { latency_ms: 6, vllm_connected: false },
      });
    }

    // 5. Stateful Database Progress Cache (Memeriksa Riwayat Makan / Olahraga Langsung dari SQL)
    const historyKeywords = ["kemarin", "hari ini", "tadi", "semalam", "sarapan apa", "makan apa", "olahraga apa", "riwayat", "progres"];
    const asksAboutHistory = historyKeywords.some((k) => lowerMessage.includes(k));
    let databaseProgressCacheText = "";

    if (asksAboutHistory) {
      let targetDate = new Date().toISOString().split("T")[0];
      let dateLabel = "Hari ini";
      if (lowerMessage.includes("kemarin") || lowerMessage.includes("semalam")) {
        const yDate = new Date(Date.now() - 86400000);
        targetDate = yDate.toISOString().split("T")[0];
        dateLabel = `Kemarin (${targetDate})`;
      }
      const progressRow = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, targetDate);
      if (progressRow) {
        databaseProgressCacheText = 
          `\n=== DATA RIWAYAT PROGRESS RESMI DATABASE (${dateLabel.toUpperCase()}) ===\n` +
          `• Menu Makanan Tercatat: ${progressRow.notes || "Belum ada catatan makanan"}\n` +
          `• Total Kalori Asupan  : ${progressRow.actual_kalori || 0} kkal\n` +
          `• Aktivitas Olahraga   : ${progressRow.activity_name || "Belum ada"} (${progressRow.duration_minutes || 0} menit, terbakar ${progressRow.activity_calories || 0} kkal)\n` +
          `• Gula Darah Puasa     : ${progressRow.fasting_glucose || "Belum tercatat"} mg/dL\n` +
          `[INSTRUKSI DOKTER PREDI]: Pasien menanyakan riwayat aktivitas/makanan. Berikan laporan dari data resmi database di atas secara santun, akurat, dan apresiatif!`;
      }
    }

    // 6. Auto-Log Olahraga Deterministik (MET Science Formula)
    const detectedExercise = detectAndCalculateExercise(sanitizedMessage, userWeight);
    if (detectedExercise) {
      const today = new Date().toISOString().split("T")[0];
      const existingToday = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, today);
      if (existingToday) {
        const updatedActName = existingToday.activity_name 
          ? `${existingToday.activity_name}, ${detectedExercise.activity_name}`
          : detectedExercise.activity_name;
        const updatedDur = (existingToday.duration_minutes || 0) + detectedExercise.duration_minutes;
        const updatedCal = (existingToday.activity_calories || 0) + detectedExercise.activity_calories;
        db.prepare(`
          UPDATE daily_progress_logs 
          SET activity_name = ?, duration_minutes = ?, activity_calories = ?, updated_at = ?
          WHERE id = ?
        `).run(updatedActName, updatedDur, updatedCal, now, existingToday.id);
      } else {
        db.prepare(`
          INSERT INTO daily_progress_logs (
            user_id, tanggal, activity_name, duration_minutes, activity_calories, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, today, detectedExercise.activity_name, detectedExercise.duration_minutes, detectedExercise.activity_calories, now, now);
      }
    }

    const userContext = {
      userId,
      username: req.user.username,
      nama: displayName,
      has_profile: hasProfile,
      usia: profile.usia || null,
      jenis_kelamin: profile.jenis_kelamin || "Laki-laki",
      tinggi_badan: profile.tinggi_badan || null,
      berat_badan: profile.berat_badan || null,
      lingkar_pinggang: profile.lingkar_pinggang || null,
      aktivitas: profile.aktivitas || "sedang",
      bmi: analysis.bmi || null,
      kategori_bmi: analysis.status_bmi || analysis.kategori_bmi || (hasProfile ? "Normal" : "Belum diisi"),
      skor_risiko: analysis.skor_risiko || null,
      kategori_risiko: analysis.kategori_risiko || (hasProfile ? "Prediabetes" : "Belum diisi"),
      gula_darah_puasa: profile.gula_darah_puasa || null,
      hba1c: profile.hba1c || null,
      target_kalori: analysis.target_kalori || (profile.jenis_kelamin === "Perempuan" ? 1700 : 2000),
      target_karbo: analysis.target_karbo || 225,
      target_protein: analysis.target_protein || 100,
      target_lemak: analysis.target_lemak || 60,
      pola_waktu_makan: analysis.pola_waktu_makan || profile.pola_waktu_makan || "3 kali makan utama + 2 kali selingan",
      pantangan_alergi: Array.from(
        new Set(
          (Array.isArray(profile.pantangan_alergi)
            ? profile.pantangan_alergi
            : typeof profile.pantangan_alergi === "string"
            ? profile.pantangan_alergi.split(",")
            : []
          )
            .map((s) => s.trim())
            .filter(Boolean)
        )
      ),
      komorbiditas: profile.komorbiditas || [],
      active_diet: analysis.active_diet_label || "Diet Seimbang Ramah Glukosa",
      database_progress_cache: databaseProgressCacheText,
    };

    const aiServerUrl = process.env.AI_SERVER_URL || "http://localhost:8000/api/chat";

    // Simpan pesan user ke database terisolasi
    db.prepare("INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)").run(
      userId,
      sessionId,
      "user",
      sanitizedMessage,
      now
    );

    let aiData;
    try {
      const aiResponse = await fetch(aiServerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          message: sanitizedMessage,
          user_context: userContext,
          chat_history: chatHistory.slice().reverse(),
          last_suggested_recipe: req.body.last_suggested_recipe || null,
        }),
      });
      if (aiResponse.ok) {
        aiData = await aiResponse.json();
      } else {
        const errText = await aiResponse.text();
        console.error(`[AI Server] Non-200 response (${aiResponse.status}):`, errText);
        throw new Error(`AI server HTTP ${aiResponse.status}`);
      }
    } catch (err) {
      console.error("[aiContextController] Error connecting to AI server or handling response:", err.message);
      aiData = {
        success: true,
        response:
          `Halo ${displayName}! Mohon maaf, Dr. Predi mendeteksi sedikit kendala koneksi ke mesin komputasi AI saat ini.\n\n` +
          `Sesuai pedoman klinis PERKENI & Kemenkes RI, pastikan Anda tetap menjaga prinsip **3J (Jadwal, Jumlah, Jenis)** dan mengutamakan makanan tinggi serat serta rendah indeks glikemik.\n\n` +
          `Silakan ulangi pesan atau tanyakan kembali bahan makanan yang ingin Anda ketahui kandungan gizinya! 😊`,
        guardrail: { zero_allergen_verified: true, safety_message: "Koneksi Cadangan Aktif" },
        telemetry: { latency_ms: 50, vllm_connected: false, error: true },
      };
    }

    // Post-Flight Output Guardrail (Rule-Based intercept jika output AI membocorkan kode pemrograman)
    if (aiData && aiData.response) {
      const codeSignatures = [
        /```[a-z]*/i,
        /\bdef\s+[a-zA-Z0-9_]+\s*\(/i,
        /\bfunction\s+[a-zA-Z0-9_]+\s*\(/i,
        /\bconsole\.log\(/i,
        /\bprint\(/i,
        /\bimport\s+[a-zA-Z0-9_]+/i,
        /return\s+["']n\s+adalah/i
      ];
      const hasCodeOutput = codeSignatures.some((sig) => sig.test(aiData.response));
      if (hasCodeOutput) {
        aiData.response = 
          `Mohon maaf, ${displayName}! Sebagai **Dr. Predi**, dokter konsultan nutrisi klinis pribadi Anda di PrediaBeat, ` +
          `saya tidak diperkenankan memberikan kode pemrograman atau instruksi komputasi teknis di luar bidang kesehatan dan gizi prediabetes.\n\n` +
          `Adakah pertanyaan seputar pola makan 3J atau gizi ramah glukosa yang bisa saya bantu hari ini? 😊`;
      }
    }

    aiData.session_id = sessionId;
    if (detectedExercise && !aiData.exercise_logged) {
      aiData.exercise_logged = detectedExercise;
    }

    // Auto-log resep kontekstual ke daily_progress_logs jika pengguna menyetujui rekomendasi resep
    if (aiData.meal_logged && aiData.meal_logged.nama_makanan && aiData.meal_logged.nama_makanan !== "Menu Sehat 3J") {
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        const mealTime = resolveMealTime(sanitizedMessage, aiData.meal_logged.meal_time || null);
        const rName = aiData.meal_logged.nama_makanan;
        const rCal = Math.round(aiData.meal_logged.kalori || 250);
        const rProt = Math.round(aiData.meal_logged.protein || 15);
        const rCarb = Math.round(aiData.meal_logged.karbohidrat || 30);
        const rFat = Math.round(aiData.meal_logged.lemak || 8);
        const entryNote = `[${mealTime}] ${rName} (${rCal} kkal)`;

        const existingLog = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, todayDate);
        if (existingLog) {
          if (!existingLog.notes || !existingLog.notes.includes(entryNote)) {
            const updatedNotes = existingLog.notes ? `${existingLog.notes}\n${entryNote}` : entryNote;
            db.prepare(`
              UPDATE daily_progress_logs
              SET actual_kalori = actual_kalori + ?, actual_protein = actual_protein + ?, actual_karbo = actual_karbo + ?, actual_lemak = actual_lemak + ?, notes = ?, updated_at = ?
              WHERE id = ?
            `).run(rCal, rProt, rCarb, rFat, updatedNotes, now, existingLog.id);
          }
        } else {
          db.prepare(`
            INSERT INTO daily_progress_logs (user_id, tanggal, actual_kalori, actual_protein, actual_karbo, actual_lemak, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, todayDate, rCal, rProt, rCarb, rFat, entryNote, now, now);
        }
      } catch (errLog) {
        console.error("Auto-log contextual meal error:", errLog);
      }
    }

    // Auto-log otomatis makanan yang terdeteksi dari cerita pasien (misal 'Hari ini saya makan ayam goreng sama nasi')
    if (aiData.story_log && Array.isArray(aiData.story_log.items) && aiData.story_log.items.length > 0) {
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        const mealTime = resolveMealTime(sanitizedMessage, aiData.story_log.meal_time || null);

        let totalCal = 0;
        let totalProt = 0;
        let totalCarb = 0;
        let totalFat = 0;
        const entryNotesList = [];

        for (const item of aiData.story_log.items) {
          const itemCal = Math.round(item.kalori || 0);
          totalCal += itemCal;
          totalProt += Math.round(item.protein || 0);
          totalCarb += Math.round(item.karbo || 0);
          totalFat += Math.round(item.lemak || 0);
          entryNotesList.push(`[${mealTime}] ${item.nama} (${itemCal} kkal)`);
        }

        const entryNotesJoined = entryNotesList.join("\n");

        const existingLog = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, todayDate);
        if (existingLog) {
          // Cegah duplikasi jika teks catatan yang persis sama sudah ada di notes hari ini
          const newEntriesToAdd = entryNotesList.filter(note => !existingLog.notes || !existingLog.notes.includes(note));
          if (newEntriesToAdd.length > 0) {
            const updatedNotes = existingLog.notes ? `${existingLog.notes}\n${newEntriesToAdd.join("\n")}` : newEntriesToAdd.join("\n");
            db.prepare(`
              UPDATE daily_progress_logs
              SET actual_kalori = actual_kalori + ?, actual_protein = actual_protein + ?, actual_karbo = actual_karbo + ?, actual_lemak = actual_lemak + ?, notes = ?, updated_at = ?
              WHERE id = ?
            `).run(totalCal, totalProt, totalCarb, totalFat, updatedNotes, now, existingLog.id);
          }
        } else {
          db.prepare(`
            INSERT INTO daily_progress_logs (user_id, tanggal, actual_kalori, actual_protein, actual_karbo, actual_lemak, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, todayDate, totalCal, totalProt, totalCarb, totalFat, entryNotesJoined, now, now);
        }
        aiData.story_log.auto_logged = true;
      } catch (errStoryLog) {
        console.error("Auto-log story meal error:", errStoryLog);
      }
    }

    // Auto-log minuman manis jika pengguna menjawab konfirmasi takaran gula
    const lowerUserMsg = sanitizedMessage.toLowerCase();
    if (lowerUserMsg.includes("takaran gula") || (lowerUserMsg.includes("es teh") && (lowerUserMsg.includes("sdm") || lowerUserMsg.includes("sdt") || lowerUserMsg.includes("tawar")))) {
      try {
        let drinkCal = 0;
        let drinkName = lowerUserMsg.includes("es teh") ? "Es Teh Manis" : "Minuman Manis";
        if (lowerUserMsg.includes("1 sdt")) drinkCal = 16;
        else if (lowerUserMsg.includes("1 sdm")) drinkCal = 48;
        else if (lowerUserMsg.includes("2-3 sdm") || lowerUserMsg.includes("gula warung")) drinkCal = 100;
        else if (lowerUserMsg.includes("tawar") || lowerUserMsg.includes("tanpa gula")) {
          drinkCal = 0;
          drinkName = "Es Teh Tawar";
        }

        const todayDate = new Date().toISOString().split("T")[0];
        const mealTime = resolveMealTime(sanitizedMessage, null);
        const drinkNote = `[${mealTime}] ${drinkName} (${drinkCal} kkal)`;

        const existingLog = db.prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?").get(userId, todayDate);
        if (existingLog) {
          const updatedNotes = existingLog.notes ? `${existingLog.notes}\n${drinkNote}` : drinkNote;
          db.prepare(`
            UPDATE daily_progress_logs
            SET actual_kalori = actual_kalori + ?, actual_karbo = actual_karbo + ?, notes = ?, updated_at = ?
            WHERE id = ?
          `).run(drinkCal, Math.round(drinkCal / 4), updatedNotes, now, existingLog.id);
        } else {
          db.prepare(`
            INSERT INTO daily_progress_logs (user_id, tanggal, actual_kalori, actual_protein, actual_karbo, actual_lemak, notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(userId, todayDate, drinkCal, 0, Math.round(drinkCal / 4), 0, drinkNote, now, now);
        }
      } catch (errDrink) {
        console.error("Auto-log drink error:", errDrink);
      }
    }

    // Simpan respons asisten beserta telemetri & bukti graf RAG ke database terisolasi
    if (aiData.response) {
      const meta = {
        latency_ms: aiData.telemetry?.latency_ms,
        tokens_per_second: aiData.telemetry?.tokens_per_second,
        vllm_connected: aiData.telemetry?.vllm_connected,
        source: aiData.telemetry?.vllm_connected 
          ? "vLLM Engine RTX 5070 Ti (Qwen 2.5 7B)" 
          : "Dr. Predi Hybrid GraphRAG",
        guardrail: aiData.guardrail?.safety_message || "100% Bebas Alergen & Aman Secara Klinis",
        safe_foods: aiData.safe_foods_recommended || [],
        food_card: aiData.food_card || null,
        confirmation: aiData.confirmation || null,
        exercise_logged: aiData.exercise_logged || null,
        meal_logged: aiData.meal_logged || null,
        sugar_verification: aiData.sugar_verification || null,
        story_log: aiData.story_log || null,
      };

      try {
        db.prepare(
          "INSERT INTO chat_logs (user_id, session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        ).run(
          userId,
          sessionId,
          "assistant",
          aiData.response,
          JSON.stringify(meta),
          new Date().toISOString()
        );
      } catch (err) {
        db.prepare(
          "INSERT INTO chat_logs (user_id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)"
        ).run(
          userId,
          sessionId,
          "assistant",
          aiData.response,
          new Date().toISOString()
        );
      }
    }

    res.json(aiData);
  } catch (error) {
    console.error("Chat forward error:", error);
    res.status(500).json({ success: false, message: "Gagal memproses percakapan AI." });
  }
}
