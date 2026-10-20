import db from "./connection.js";
import bcrypt from "bcryptjs";

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      username_normalized TEXT UNIQUE NOT NULL,
      email TEXT,
      email_normalized TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_profile_data TEXT NOT NULL,
      analysis_result TEXT NOT NULL,
      questionnaire_completed_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questionnaire_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      draft_data TEXT NOT NULL DEFAULT '{}',
      last_section INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assessment_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      full_profile_data TEXT NOT NULL,
      analysis_result TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_progress_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      tanggal TEXT NOT NULL,
      weight_kg REAL,
      waist_cm REAL,
      target_kalori REAL DEFAULT 0,
      target_karbo REAL DEFAULT 0,
      target_protein REAL DEFAULT 0,
      target_lemak REAL DEFAULT 0,
      tdee_reference REAL DEFAULT 0,
      bmr_estimated REAL DEFAULT 0,
      meal_plan_kalori REAL DEFAULT 0,
      meal_plan_adherence_percent REAL DEFAULT 0,
      actual_kalori REAL DEFAULT 0,
      actual_karbo REAL DEFAULT 0,
      actual_protein REAL DEFAULT 0,
      actual_lemak REAL DEFAULT 0,
      activity_name TEXT,
      activity_type TEXT,
      activity_met REAL DEFAULT 0,
      duration_minutes REAL DEFAULT 0,
      activity_calories REAL DEFAULT 0,
      calories_out REAL DEFAULT 0,
      deficit_calories REAL DEFAULT 0,
      estimated_weight_change_kg REAL DEFAULT 0,
      fasting_glucose REAL,
      sleep_hours REAL,
      sweet_drink_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, tanggal),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress_days_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      entry_date TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      foods_json TEXT DEFAULT '[]',
      activities_json TEXT DEFAULT '[]',
      snapshot_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id, entry_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Seed default demo user if table is empty
  const countStmt = db.prepare("SELECT COUNT(*) as count FROM users");
  const result = countStmt.get();

  if (result.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("PrediaBeat2026!", salt);
    const now = new Date().toISOString();

    const insertUser = db.prepare(`
      INSERT INTO users (username, username_normalized, email, email_normalized, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = insertUser.run(
      "budi_santoso",
      "budi_santoso",
      "budi@prediabeat.id",
      "budi@prediabeat.id",
      hash,
      "user",
      now,
      now
    );

    const userId = info.lastInsertRowid;

    // Seed default clinical profile for demo user
    const demoProfile = {
      nama: "Budi Santoso",
      usia: 48,
      jenis_kelamin: "Laki-laki",
      tinggi_badan: 170,
      berat_badan: 76,
      lingkar_pinggang: 92,
      frekuensi_olahraga: "1-2 kali seminggu",
      frekuensi_minum_manis: "setiap hari",
      porsi_nasi_per_hari: "2 porsi sedang",
      durasi_duduk_rebahan: "lebih dari 6 jam",
      durasi_tidur: "kurang dari 6 jam",
      riwayat_keluarga_diabetes: true,
      gejala_klasik: ["sering haus", "sering kencing malam"],
      hasil_lab: "GDP 118, HbA1c 5.9%",
      gula_darah_puasa: 118,
      hba1c: 5.9,
      tekanan_darah_sistolik: 130,
      tekanan_darah_diastolik: 85,
      kolesterol_total: 210,
      asam_urat: 6.8,
      komorbiditas: "Hipertensi Derajat 1",
      pantangan_alergi: ["kacang"],
      penyakit_lain_obat: "Hipertensi ringan",
      pola_waktu_makan: "makan_biasa",
      frekuensi_makan: "3 kali makan utama + 2 kali selingan",
      active_diet: "mediterania",
      active_diet_label: "Diet Mediterania",
    };

    const demoAnalysis = {
      bmi: 26.3,
      kategori_bmi: "Kelebihan Berat Badan (Overweight)",
      tdee: 2150,
      skor_risiko: 68,
      kategori_risiko: "Prediabetes (Impaired Fasting Glucose / IFG)",
      target_kalori: 1850,
      target_karbo: 231,
      target_protein: 92,
      target_lemak: 62,
      active_diet: "mediterania",
      active_diet_label: "Diet Mediterania",
      pola_waktu_makan: "makan_biasa",
      frekuensi_makan: "3 kali makan utama + 2 kali selingan",
      catatan_pola_makan: [
        "Konsumsi sayur atau serat larut terlebih dahulu sebelum karbohidrat untuk memperlambat penyerapan glukosa.",
        "Jaga jeda makan teratur 3–4 jam agar pelepasan insulin alami tubuh tetap stabil.",
        "Batasi gorengan dan minuman manis saat jeda antar jam makan.",
      ],
      health_score: {
        score: 82,
        status: "Kondisi Stabil & Baik",
        metrics: { days_logged: 5, avg_adherence: 86, total_exercise_minutes: 120 },
        breakdown: { food_quality: 8.5 },
      },
      weekly_insight: {
        message: "Pola makan 3J Anda sangat konsisten minggu ini! Pertahankan variasi sayuran tinggi serat untuk mempertahankan kestabilan glukosa darah.",
        priorities: [
          "Tingkatkan jalan santai 15–20 menit pasca makan malam untuk mengoptimalkan sensitivitas insulin.",
        ],
      },
    };

    db.prepare(`
      INSERT INTO profiles (user_id, full_profile_data, analysis_result, questionnaire_completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      JSON.stringify(demoProfile),
      JSON.stringify(demoAnalysis),
      now,
      now,
      now
    );

    console.log("Database initialized & demo user seeded: budi_santoso / PrediaBeat2026!");
  } else {
    console.log("Database initialized. Existing user records found.");
  }
}
