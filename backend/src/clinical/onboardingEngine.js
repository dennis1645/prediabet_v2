import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import db from "../database/connection.js";
import { prosesAnalisisKlinis } from "./assessment.js";
import { generateDailyMealPlan } from "./mealPlanEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const itemsPath = path.join(__dirname, "questionnaire_items_enhanced.json");

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS onboarding_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      current_question_id INTEGER NOT NULL DEFAULT 1,
      answers_json TEXT NOT NULL DEFAULT '{}',
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  try {
    db.exec("ALTER TABLE users ADD COLUMN phone_number TEXT;");
  } catch (e) {}
} catch (e) {}

export const RAW_QUESTIONS = JSON.parse(fs.readFileSync(itemsPath, "utf-8"));

/**
 * Pemetaan teks Gen Z yang ramah, luwes, dan akrab untuk tiap nomor pertanyaan
 */
const GENZ_PROMPTS = {
  nama: "Kenalin, gue Predi! Boleh tau nama panggilan santai kamu biar kita lebih akrab? 😊",
  phone_number: "Kalo boleh tau, nomor WhatsApp kamu berapa nih? (Tenang, ini opsional buat persiapan pengingat jadwal makan & tips sehat harian nanti!) 📱",
  jenis_kelamin: "Apa jenis kelamin kamu nih? (Penting buat perhitungan metabolisme basal / BMR kamu)",
  usia: "Btw, usia kamu saat ini berapa tahun bro/sis? (Ketik angkanya aja ya, misal: 20)",
  etnis: "Kalau boleh tau, etnis atau suku kamu apa nih? (Bebas pilih atau lewati kalau gak mau sebutin ya!)",
  jenjang_pendidikan: "Sekarang kamu lagi menempuh pendidikan di jenjang apa nih?",
  tempat_tinggal: "Keseharian kamu tinggal di mana nih? Anak kosan mandiri atau bareng keluarga?",
  berat_badan: "Berapa berat badan kamu saat ini dalam kg? (Misal: 65 — ini penting banget buat hitung Indeks Massa Tubuh ya!)",
  tinggi_badan: "Lanjut, tinggi badan kamu berapa cm nih? (Misal: 170)",
  lingkar_pinggang: "Berapa lingkar pinggang kamu? (Ukur di atas pusar ya. Kalau gak punya meteran di kosan, boleh ketik 'skip' atau 'lupa' kok!)",
  riwayat_obesitas_nakes: "Pernah gak dokter atau tenaga kesehatan bilang kalau kamu kelebihan berat badan atau obesitas?",
  tes_gula_darah_puasa: "Pernah cek tes gula darah puasa (GDP) di lab atau puskesmas gak? Gimana hasilnya?",
  tes_hba1c: "Kalau tes HbA1c (rata-rata gula darah 3 bulan terakhir) udah pernah belum?",
  tekanan_darah_sistol: "Berapa angka tensi darah SISTOL (angka atas) kamu? (Contoh: 120. Kalau belum pernah tensi, ketik 'skip' ya)",
  tekanan_darah_diastol: "Lalu angka DIASTOL (angka bawah) kamu berapa? (Contoh: 80. Kalau belum tahu, ketik 'skip')",
  riwayat_kondisi_kesehatan: "Apakah kamu punya riwayat kondisi kesehatan berikut? (Boleh centang yang berlaku)",
  gejala_klasik: "Akhir-akhir ini, pernah ngerasain gejala klasik kayak gini gak? (Boleh pilih lebih dari satu ya!)",
  riwayat_diabetes_keluarga: "Ada anggota keluarga kandung atau kerabat yang punya riwayat diabetes gak nih?",
  tingkat_kerabat_diabetes: "Kalau ada, siapa anggota keluarga kamu yang punya riwayat diabetes?",
  riwayat_kardiovaskular_keluarga: "Kalau riwayat penyakit jantung atau stroke di keluarga, ada juga gak nih?",
  konsumsi_obat_rutin: "Apakah kamu saat ini lagi rutin konsumsi obat medis tertentu?",
  biasa_sarapan: "Masuk ke pola makan nih! Kamu tipe yang rutin sarapan pagi sebelum ngampus/aktivitas gak?",
  frekuensi_minum_manis: "Seberapa sering kamu jajan minuman manis? (Kayak boba, kopi susu gula aren, es teh manis, soda)",
  frekuensi_gorengan: "Seberapa sering makan gorengan atau cemilan berminyak dalam seminggu?",
  frekuensi_makanan_manis: "Seberapa sering ngemil makanan manis kayak kue, cokelat, atau dessert?",
  frekuensi_sayuran: "Seberapa sering kamu makan sayur dalam seminggu nih?",
  frekuensi_buah: "Kalau makan buah-buahan segar, seberapa sering biasanya?",
  porsi_nasi: "Berapa porsi nasi yang biasa kamu makan per hari?",
  frekuensi_ngemil: "Seberapa sering kamu ngemil di antara jam makan utama?",
  jenis_camilan: "Camilan apa nih yang paling sering kamu makan pas santai atau nugas?",
  tempat_makan_harian: "Makanan sehari-hari kamu kebanyakan dari mana nih? (Boleh pilih lebih dari satu)",
  makan_larut_malam: "Pernah gak makan larut malam (setelah jam 9 malam) pas nugas atau begadang?",
  pantangan_makanan: "Apakah kamu memiliki pantangan atau batasan makanan? (Boleh pilih lebih dari satu)",
  makanan_favorit: "Makanan khas Indonesia apa nih yang paling kamu suka? (Boleh pilih lebih dari satu)",
  buah_favorit: "Buah segar apa yang paling kamu suka dan mudah ditemukan di sekitarmu?",
  sayur_favorit: "Kalau sayuran segar, sayur apa yang paling kamu suka dan biasa kamu santap?",
  protein_favorit: "Sumber lauk protein hewani apa yang paling kamu suka santap?",
  anggaran_makan_harian: "Rata-rata budget uang jajan atau makan kamu sehari kira-kira berapa nih?",
  hari_olahraga_seminggu: "Masuk ke aktivitas fisik! Berapa hari dalam seminggu kamu sempatin olahraga atau gerak aktif?",
  durasi_olahraga_sesi: "Kalau lagi olahraga, biasanya durasinya berapa lama per sesi?",
  jenis_olahraga_favorit: "Olahraga apa nih yang paling kamu suka lakuin? (Bisa pilih lebih dari satu)",
  ikut_ekskul_olahraga: "Ikut kegiatan olahraga atau ekskul fisik di sekolah/kampus gak?",
  durasi_duduk_rebahan: "Jujur nih, di luar tidur, berapa jam sehari kamu biasanya duduk nugas, main HP, atau rebahan?",
  hambatan_olahraga: "Apa hambatan terbesar kamu buat berolahraga rutin? (Boleh pilih lebih dari satu)",
  durasi_tidur_malam: "Nah soal tidur nih, rata-rata berapa jam kamu tidur di malam hari pas hari kuliah/kerja?",
  jam_mulai_tidur: "Jam berapa kamu biasanya baru mulai merem / tidur malam?",
  gadget_sebelum_tidur: "Suka scrolling HP / laptop di kasur dalam 1 jam sebelum tidur gak nih?",
  gangguan_tidur: "Sering ngalamin susah tidur (insomnia) atau sering kebangun tengah malam gak?",
  perasaan_bangun_pagi: "Gimana rasanya pas bangun pagi? Seger bugar atau masih lemes ngantuk?",
  tingkat_stres: "Soal beban pikiran, gimana tingkat stres kamu akhir-akhir ini (tugas kuliah/kerjaan)?",
  sumber_stres_utama: "Apa nih yang biasanya jadi sumber stres utama kamu? (Boleh pilih lebih dari satu)",
  cara_atasi_stres: "Kalau lagi stres atau burn out, biasanya pelampiasannya ke mana nih?",
  merokok: "Apakah kamu merokok atau menggunakan vape/rokok elektrik?",
  jumlah_rokok_per_hari: "Kalau merokok, kira-kira berapa batang atau sesi per hari? (Ketik 0 jika tidak merokok)",
  frekuensi_kafein: "Seberapa sering kamu konsumsi kafein kayak kopi, teh pekat, atau minuman berenergi?",
  screen_time_harian: "Berapa jam estimasi screen time HP kamu per hari di luar urusan kuliah/belajar?",
  dukungan_keluarga_lifestyle: "Keluarga atau teman satu kosan kamu ngedukung gak kalau kamu mau ubah pola hidup lebih sehat?",
  kesediaan_ubah_lifestyle: "Seberapa siap dan semangat kamu buat mulai atur pola makan dan gaya hidup sehat bareng Predi?",
  target_durasi_program: "Berapa lama kamu pengen komitmen jalanin program kesehatan ramah glukosa ini?",
  pernah_dengar_prediabetes: "Sebelumnya, kamu udah pernah dengar tentang kondisi 'prediabetes' belum?",
  sumber_info_kesehatan: "Terakhir nih! Biasanya kamu paling sering cari info seputar kesehatan dari mana?"
};

export const ONBOARDING_QUESTIONS = RAW_QUESTIONS.map((q) => {
  return {
    ...q,
    genz_prompt: GENZ_PROMPTS[q.field_key] || q.question
  };
});

/**
 * Deteksi respon defensif, lupa, terima kasih, atau percakapan santai (Intelligent Guardrail)
 */
export function handleSpecialConversationalIntent(userMessage, currentQuestion) {
  const msg = (userMessage || "").trim().toLowerCase();

  // 1. Defensif / Sarcastic / Skeptis
  const defensiveKeywords = [
    "mau tau banget", "kepo amat", "kepo", "ngapain nanya", "bukan urusanmu",
    "rahasia", "gak mau jawab", "ngapain kepo", "ribet amat", "banyak tanya",
    "suka suka gue", "kenapa nanya"
  ];
  if (defensiveKeywords.some((k) => msg.includes(k))) {
    return {
      is_special: true,
      bot_response:
        "Haha santai bro/sis, Predi gak lagi ngepoin privasi lo kok! 😉 " +
        `Alasan Predi nanya soal **${currentQuestion.question}** ini penting banget, karena data ini bakal jadi kunci perhitungan sensitivitas insulin dan batas toleransi glukosa tubuh lo. ` +
        "Tenang, semua data medis lo terenkripsi aman dan cuma dipake biar rekomendasi makanan lo nanti beneran pas di badan lo. " +
        "Yuk, spill dikit dong biar Predi bisa bantuin analisis kesehatan lo dengan presisi! ✨",
      repeat_question: true
    };
  }

  // 2. Lupa / Tidak Tahu / Bingung
  const forgetKeywords = [
    "lupa", "gak tau", "nggak tau", "kurang tau", "gak inget", "ngga inget",
    "bingung", "kira kira", "belum timbang", "gak ada meteran", "lupa tensi"
  ];
  if (forgetKeywords.some((k) => msg.includes(k))) {
    const isOptional = !currentQuestion.required || ["lingkar_pinggang", "tekanan_darah_sistol", "tekanan_darah_diastol", "etnis", "phone_number"].includes(currentQuestion.field_key);
    
    let advice = "Gak masalah banget kalau lupa! Lo boleh masukin angka perkiraan pas terakhir cek kesehatan atau yang ada di data SIM/KTP.";
    if (isOptional) {
      advice += " Karena pertanyaan ini opsional, lo juga boleh langsung ketik **'skip'** atau klik tombol **'Lewati Dulu'** ya!";
    } else {
      advice += " Masukin angka estimasi terbaik lo aja ya, bro/sis!";
    }

    return {
      is_special: true,
      bot_response:
        `Santai bro/sis, wajar banget kok kalau lupa! 😊\n\n${advice}\n\nGimana, mau pakai estimasi berapa nih atau mau kita lewati?`,
      repeat_question: true
    };
  }

  // 3. Ucapan Terima Kasih / Sopan Santun
  const gratitudeKeywords = ["terima kasih", "makasih", "tengkyu", "thanks", "thx", "arigato", "nuhun"];
  if (gratitudeKeywords.some((k) => msg === k || msg.startsWith(k + " ") || msg.endsWith(" " + k))) {
    return {
      is_special: true,
      bot_response:
        "Sama-sama bro/sis! Senang banget bisa jadi health buddy lo. 🌟 Yuk kita lanjutin beberapa pertanyaan lagi ya biar profil kesehatan lo lengkap!",
      repeat_question: true
    };
  }

  // 4. Sapaan Kasual (Halo / Hai)
  const greetingKeywords = ["halo", "hai", "hei", "p", "pagi", "siang", "sore", "malam", "assalamualaikum"];
  if (greetingKeywords.some((k) => msg === k || msg.startsWith(k + " "))) {
    return {
      is_special: true,
      bot_response:
        "Halo juga bro/sis! 👋 Senang banget kamu ada di sini. Yuk kita lanjutin sesi wawancara santai kita ya!",
      repeat_question: true
    };
  }

  return { is_special: false };
}

/**
 * Mengambil status dan pertanyaan terkini untuk pengguna
 */
export function getUserOnboardingState(userId, userObj = {}) {
  let progress = db.prepare("SELECT * FROM onboarding_progress WHERE user_id = ?").get(userId);
  const now = new Date().toISOString();

  if (!progress) {
    db.prepare(`
      INSERT INTO onboarding_progress (user_id, current_question_id, answers_json, is_completed, created_at, updated_at)
      VALUES (?, 1, '{}', 0, ?, ?)
    `).run(userId, now, now);

    progress = {
      user_id: userId,
      current_question_id: 1,
      answers_json: "{}",
      is_completed: 0
    };
  }

  // Periksa apakah user sebenarnya sudah memiliki profil selesai di tabel profiles
  const profileRow = db.prepare("SELECT id FROM profiles WHERE user_id = ?").get(userId);
  if (profileRow && !progress.is_completed) {
    db.prepare("UPDATE onboarding_progress SET is_completed = 1, updated_at = ? WHERE user_id = ?").run(now, userId);
    progress.is_completed = 1;
  }

  const answers = JSON.parse(progress.answers_json || "{}");

  // Jika sudah completed
  if (progress.is_completed) {
    return {
      is_completed: true,
      progress_percent: 100,
      current_step: ONBOARDING_QUESTIONS.length,
      total_steps: ONBOARDING_QUESTIONS.length,
      message: "Profil rekam medis Anda telah lengkap dan seluruh fitur PrediaBeat telah aktif!",
      answers
    };
  }

  // Cari pertanyaan aktif
  let currentQIndex = ONBOARDING_QUESTIONS.findIndex((q) => q.id === progress.current_question_id);
  if (currentQIndex === -1) currentQIndex = 0;

  // Lewati pertanyaan yang sudah terisi otomatis dari registrasi jika ada
  let activeQuestion = ONBOARDING_QUESTIONS[currentQIndex];

  // Jika pertanyaan nama dan nama sudah ada di userObj atau answers, lewati jika sudah dijawab
  const total = ONBOARDING_QUESTIONS.length;
  const progressPercent = Math.min(Math.round((currentQIndex / total) * 100), 99);

  return {
    is_completed: false,
    progress_percent: progressPercent,
    current_step: currentQIndex + 1,
    total_steps: total,
    section: activeQuestion.section,
    question_id: activeQuestion.id,
    field_key: activeQuestion.field_key,
    question_text: activeQuestion.question,
    genz_prompt: activeQuestion.genz_prompt,
    type: activeQuestion.type,
    is_multi: activeQuestion.is_multi,
    required: activeQuestion.required,
    options: activeQuestion.options || [],
    note: activeQuestion.note || null,
    answers
  };
}

/**
 * Menyimpan jawaban dan memajukan kuesioner ke pertanyaan berikutnya
 */
export function submitAnswerAndAdvance(userId, rawAnswer, textMessage = "", userObj = {}) {
  const state = getUserOnboardingState(userId, userObj);
  if (state.is_completed) {
    return { is_completed: true, message: "Onboarding sudah selesai!" };
  }

  const currentQ = ONBOARDING_QUESTIONS.find((q) => q.id === state.question_id);
  if (!currentQ) {
    throw new Error("Pertanyaan tidak ditemukan.");
  }

  // Cek apakah user mengirim respon defensif/lupa/terima kasih
  const specialCheck = handleSpecialConversationalIntent(textMessage || String(rawAnswer), currentQ);
  if (specialCheck.is_special) {
    return {
      is_special_reaction: true,
      bot_reaction: specialCheck.bot_response,
      repeat_question: true,
      state
    };
  }

  // Normalisasi jawaban
  let cleanedAnswer = rawAnswer;
  if (typeof rawAnswer === "string") {
    cleanedAnswer = rawAnswer.trim();
  }

  // Simpan jawaban
  const answers = state.answers || {};
  answers[currentQ.field_key] = cleanedAnswer;

  // Khusus jika ini nomor telepon, simpan juga ke tabel users
  if (currentQ.field_key === "phone_number" && cleanedAnswer && cleanedAnswer !== "skip") {
    try {
      db.prepare("UPDATE users SET phone_number = ? WHERE id = ?").run(cleanedAnswer, userId);
    } catch (e) {
      console.warn("Gagal update phone_number di users:", e.message);
    }
  }

  // Tentukan pertanyaan berikutnya
  let nextIndex = ONBOARDING_QUESTIONS.findIndex((q) => q.id === currentQ.id) + 1;

  // Logika conditional skip: misal jika merokok == "Tidak merokok", lewati jumlah_rokok_per_hari
  if (currentQ.field_key === "merokok" && String(cleanedAnswer).toLowerCase().includes("tidak")) {
    const skipIdx = ONBOARDING_QUESTIONS.findIndex((q) => q.field_key === "jumlah_rokok_per_hari");
    if (skipIdx !== -1 && nextIndex === skipIdx) {
      answers["jumlah_rokok_per_hari"] = "0";
      nextIndex = skipIdx + 1;
    }
  }

  // Logika conditional skip: jika riwayat_diabetes_keluarga TIDAK ADA / TIDAK TAHU, lewati tingkat_kerabat_diabetes
  if (currentQ.field_key === "riwayat_diabetes_keluarga") {
    const ansLow = String(cleanedAnswer).toLowerCase();
    if (ansLow.includes("tidak") || ansLow.includes("ngga") || ansLow.includes("gak") || ansLow.includes("bukan")) {
      const skipIdx = ONBOARDING_QUESTIONS.findIndex((q) => q.field_key === "tingkat_kerabat_diabetes");
      if (skipIdx !== -1 && nextIndex === skipIdx) {
        answers["tingkat_kerabat_diabetes"] = "Tidak ada";
        nextIndex = skipIdx + 1;
      }
    }
  }

  // Cek jika sudah mencapai akhir kuesioner
  const isFinished = nextIndex >= ONBOARDING_QUESTIONS.length;
  const now = new Date().toISOString();

  if (isFinished) {
    // Jalankan analisis klinis dan simpan ke profiles & assessment_history
    const analysis = prosesAnalisisKlinis(answers);
    const rawAllergies = answers.pantangan_makanan || answers.pantangan_alergi || [];
    const allergies = Array.isArray(rawAllergies)
      ? rawAllergies
      : typeof rawAllergies === "string"
      ? rawAllergies.split(",").map((s) => s.trim())
      : [];

    const mealPlan = generateDailyMealPlan(analysis.target_kalori, allergies, analysis.active_diet);
    analysis.meal_plan = mealPlan;

    // Simpan ke database profiles
    db.prepare(`
      INSERT INTO profiles (user_id, full_profile_data, analysis_result, questionnaire_completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        full_profile_data = excluded.full_profile_data,
        analysis_result = excluded.analysis_result,
        questionnaire_completed_at = excluded.questionnaire_completed_at,
        updated_at = excluded.updated_at
    `).run(userId, JSON.stringify(answers), JSON.stringify(analysis), now, now, now);

    // Simpan ke assessment_history
    db.prepare(`
      INSERT INTO assessment_history (user_id, full_profile_data, analysis_result, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, JSON.stringify(answers), JSON.stringify(analysis), now);

    // Update status onboarding_progress
    db.prepare(`
      UPDATE onboarding_progress
      SET is_completed = 1, current_question_id = ?, answers_json = ?, updated_at = ?
      WHERE user_id = ?
    `).run(ONBOARDING_QUESTIONS[ONBOARDING_QUESTIONS.length - 1].id, JSON.stringify(answers), now, userId);

    return {
      is_completed: true,
      message: "Selamat! Wawancara intake klinis berhasil diselesaikan. Profil rekam medis kamu telah aktif!",
      analysis,
      profile: answers
    };
  }

  // Update progress ke pertanyaan berikutnya
  const nextQ = ONBOARDING_QUESTIONS[nextIndex];
  db.prepare(`
    UPDATE onboarding_progress
    SET current_question_id = ?, answers_json = ?, updated_at = ?
    WHERE user_id = ?
  `).run(nextQ.id, JSON.stringify(answers), now, userId);

  const updatedState = getUserOnboardingState(userId, userObj);

  // Buat respon feedback suportif dari Dr. Predi
  let feedback = "Keren, jawaban lo udah Predi catat ya! 👍";
  if (currentQ.field_key === "berat_badan" || currentQ.field_key === "tinggi_badan") {
    feedback = "Sip, data fisik lo udah kesimpan rapi! Lanjut ke detail berikutnya ya:";
  } else if (currentQ.field_key === "frekuensi_minum_manis") {
    feedback = "Noted banget soal minuman manis! Nanti Predi kasih trik biar gak gampang sugar craving pas nugas:";
  } else if (currentQ.field_key === "durasi_tidur_malam") {
    feedback = "Oke paham soal jam tidur lo! Pola tidur emang ngaruh banget ke sensitivitas insulin keesokan harinya:";
  }

  return {
    is_completed: false,
    bot_feedback: feedback,
    next_state: updatedState
  };
}
