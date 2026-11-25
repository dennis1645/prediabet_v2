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
  biasa_sarapan: "Masuk ke pola makan nih! Kamu tipe yang rutin sarapan pagi sebelum beraktivitas/ngampus gak?",
  frekuensi_minum_manis: "Seberapa sering kamu jajan minuman manis? (Kayak boba, kopi susu gula aren, es teh manis, soda)",
  frekuensi_gorengan: "Seberapa sering makan gorengan atau cemilan berminyak dalam seminggu?",
  frekuensi_makanan_manis: "Seberapa sering ngemil makanan manis kayak kue, cokelat, atau dessert?",
  frekuensi_sayuran: "Seberapa sering kamu makan sayur dalam seminggu nih?",
  frekuensi_buah: "Kalau makan buah-buahan segar, seberapa sering biasanya?",
  porsi_nasi: "Berapa porsi nasi yang biasa kamu makan per hari?",
  frekuensi_ngemil: "Seberapa sering kamu ngemil di antara jam makan utama?",
  jenis_camilan: "Camilan apa nih yang paling sering kamu makan pas santai, nugas, atau bekerja?",
  tempat_makan_harian: "Makanan sehari-hari kamu kebanyakan dari mana nih? (Boleh pilih lebih dari satu)",
  makan_larut_malam: "Pernah gak makan larut malam (setelah jam 9 malam) pas lagi nugas, kerja, atau begadang?",
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

const FORMAL_PROMPTS = {
  nama: "Perkenalkan, saya Dr. Predi. Boleh saya ketahui nama panggilan Anda?",
  phone_number: "Berapa nomor WhatsApp aktif Anda? (Opsional, untuk pengingat jadwal makan & kesehatan harian)",
  jenis_kelamin: "Apa jenis kelamin Anda? (Diperlukan untuk perhitungan metabolisme basal / BMR Anda)",
  usia: "Berapa usia Anda saat ini dalam tahun? (Ketik angkanya saja, misalnya: 35)",
  etnis: "Jika berkenan, apa etnis atau suku Anda? (Opsional, dapat dilewati)",
  jenjang_pendidikan: "Apa jenjang pendidikan terakhir atau status aktivitas Anda saat ini?",
  tempat_tinggal: "Di mana Anda tinggal sehari-hari saat ini?",
  berat_badan: "Berapa berat badan Anda saat ini dalam kg? (Misalnya: 65 — diperlukan untuk menghitung Indeks Massa Tubuh)",
  tinggi_badan: "Berapa tinggi badan Anda saat ini dalam cm? (Misalnya: 170)",
  lingkar_pinggang: "Berapa ukuran lingkar pinggang Anda (diukur di atas pusar dalam cm)? Jika belum mengetahui, Anda dapat mengetik 'skip' atau memilih Lewati.",
  riwayat_obesitas_nakes: "Apakah dokter atau tenaga kesehatan pernah menyampaikan bahwa Anda memiliki kelebihan berat badan atau obesitas?",
  tes_gula_darah_puasa: "Apakah Anda pernah menjalani pemeriksaan Gula Darah Puasa (GDP) di laboratorium atau fasilitas kesehatan?",
  tes_hba1c: "Apakah Anda pernah menjalani pemeriksaan HbA1c (rata-rata gula darah 3 bulan terakhir)?",
  tekanan_darah_sistol: "Berapa angka tekanan darah SISTOL (angka atas) Anda? (Contoh: 120. Ketik 'skip' jika belum pernah memeriksa)",
  tekanan_darah_diastol: "Berapa angka tekanan darah DIASTOL (angka bawah) Anda? (Contoh: 80. Ketik 'skip' jika belum tahu)",
  riwayat_kondisi_kesehatan: "Apakah Anda memiliki riwayat kondisi kesehatan berikut? (Dapat memilih lebih dari satu)",
  gejala_klasik: "Akhir-akhir ini, apakah Anda merasakan salah satu dari gejala berikut? (Dapat memilih lebih dari satu)",
  riwayat_diabetes_keluarga: "Apakah ada anggota keluarga kandung atau kerabat yang memiliki riwayat diabetes?",
  tingkat_kerabat_diabetes: "Jika ada, siapa anggota keluarga Anda yang memiliki riwayat diabetes?",
  riwayat_kardiovaskular_keluarga: "Apakah terdapat riwayat penyakit jantung atau stroke di keluarga Anda?",
  konsumsi_obat_rutin: "Apakah Anda saat ini sedang rutin mengonsumsi obat medis tertentu?",
  biasa_sarapan: "Sekarang masuk ke pola makan. Apakah Anda terbiasa sarapan pagi sebelum memulai aktivitas atau bekerja?",
  frekuensi_minum_manis: "Seberapa sering Anda mengonsumsi minuman manis (seperti kopi susu manis, teh manis, boba, atau minuman bersoda)?",
  frekuensi_gorengan: "Seberapa sering Anda mengonsumsi gorengan atau makanan berminyak dalam seminggu?",
  frekuensi_makanan_manis: "Seberapa sering Anda mengonsumsi makanan manis seperti kue, cokelat, atau hidangan penutup?",
  frekuensi_sayuran: "Seberapa sering Anda mengonsumsi sayuran dalam seminggu?",
  frekuensi_buah: "Seberapa sering Anda mengonsumsi buah-buahan segar?",
  porsi_nasi: "Berapa porsi nasi yang biasa Anda konsumsi per hari?",
  frekuensi_ngemil: "Seberapa sering Anda mengonsumsi camilan di antara waktu makan utama?",
  jenis_camilan: "Camilan apa yang paling sering Anda konsumsi saat bersantai atau di sela waktu bekerja?",
  tempat_makan_harian: "Dari mana biasanya sumber makanan Anda sehari-hari? (Dapat memilih lebih dari satu)",
  makan_larut_malam: "Apakah Anda sering makan larut malam (setelah pukul 21.00)?",
  pantangan_makanan: "Apakah Anda memiliki pantangan atau alergi makanan tertentu? (Dapat memilih lebih dari satu)",
  makanan_favorit: "Menu masakan Indonesia apa yang paling Anda sukai? (Dapat memilih lebih dari satu)",
  buah_favorit: "Buah segar apa yang paling Anda sukai dan mudah Anda peroleh?",
  sayur_favorit: "Sayuran segar apa yang paling Anda sukai dan biasa Anda konsumsi?",
  protein_favorit: "Sumber protein hewani apa yang paling Anda sukai?",
  anggaran_makan_harian: "Berapa perkiraan anggaran makan harian Anda?",
  hari_olahraga_seminggu: "Masuk ke aktivitas fisik. Berapa hari dalam seminggu Anda meluangkan waktu untuk berolahraga?",
  durasi_olahraga_sesi: "Saat berolahraga, berapa lama durasi rata-rata per sesi?",
  jenis_olahraga_favorit: "Jenis olahraga apa yang paling Anda sukai? (Dapat memilih lebih dari satu)",
  ikut_ekskul_olahraga: "Apakah Anda rutin mengikuti klub atau komunitas olahraga?",
  durasi_duduk_rebahan: "Di luar waktu tidur, berapa jam sehari rata-rata Anda duduk bekerja atau beristirahat?",
  hambatan_olahraga: "Apa kendala utama Anda untuk berolahraga secara rutin? (Dapat memilih lebih dari satu)",
  durasi_tidur_malam: "Mengenai pola tidur, berapa jam rata-rata Anda tidur malam pada hari kerja?",
  jam_mulai_tidur: "Pukul berapa Anda biasanya mulai tidur di malam hari?",
  gadget_sebelum_tidur: "Apakah Anda sering menggunakan ponsel atau laptop dalam 1 jam sebelum tidur?",
  gangguan_tidur: "Apakah Anda sering mengalami kesulitan tidur (insomnia) atau sering terbangun di tengah malam?",
  perasaan_bangun_pagi: "Bagaimana kondisi tubuh Anda saat bangun pagi?",
  tingkat_stres: "Bagaimana tingkat stres atau beban pikiran Anda akhir-akhir ini (pekerjaan maupun aktivitas harian)?",
  sumber_stres_utama: "Apa yang biasanya menjadi sumber stres utama Anda? (Dapat memilih lebih dari satu)",
  cara_atasi_stres: "Saat menghadapi stres atau kelelahan, bagaimana cara Anda mengatasinya?",
  merokok: "Apakah Anda merokok atau menggunakan rokok elektrik (vape)?",
  jumlah_rokok_per_hari: "Jika merokok, kira-kira berapa batang atau sesi per hari? (Ketik 0 jika tidak)",
  frekuensi_kafein: "Seberapa sering Anda mengonsumsi kafein seperti kopi, teh pekat, atau minuman berenergi?",
  screen_time_harian: "Berapa jam perkiraan penggunaan layar gawai Anda per hari di luar jam kerja?",
  dukungan_keluarga_lifestyle: "Apakah keluarga atau lingkungan terdekat Anda mendukung perubahan pola hidup sehat?",
  kesediaan_ubah_lifestyle: "Seberapa siap Anda untuk mulai mengatur pola makan dan gaya hidup sehat bersama PrediaBeat?",
  target_durasi_program: "Berapa lama target komitmen Anda dalam menjalankan program nutrisi ramah glukosa ini?",
  pernah_dengar_prediabetes: "Sebelumnya, apakah Anda sudah pernah mendengar tentang kondisi 'prediabetes'?",
  sumber_info_kesehatan: "Terakhir, dari mana biasanya Anda mencari informasi seputar kesehatan?"
};

export const ONBOARDING_QUESTIONS = RAW_QUESTIONS.map((q) => {
  return {
    ...q,
    genz_prompt: GENZ_PROMPTS[q.field_key] || q.question,
    formal_prompt: FORMAL_PROMPTS[q.field_key] || q.question
  };
});

function resolveIsFormal(answers = {}, userRow = {}) {
  const rawAge = answers?.usia ?? userRow?.usia;
  const parsed = parseInt(rawAge, 10);
  return Number.isFinite(parsed) && parsed >= 30;
}

/**
 * Deteksi respon defensif, lupa, terima kasih, atau percakapan santai (Intelligent Guardrail)
 */
export function handleSpecialConversationalIntent(userMessage, currentQuestion, isFormal = false) {
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
      bot_response: isFormal
        ? `Mohon maaf atas ketidaknyamanannya. Pertanyaan mengenai **${currentQuestion.question}** diperlukan semata-mata untuk menghitung sensitivitas insulin dan kebutuhan gizi Anda secara presisi. Seluruh data Anda terenkripsi aman dan hanya digunakan untuk evaluasi klinis pribadi Anda.`
        : "Tenang ya, Dr. Predi gak berniat kepo kok! 😉 " +
          `Pertanyaan soal **${currentQuestion.question}** ini penting banget untuk menghitung sensitivitas insulin dan batas toleransi glukosa tubuh kamu. ` +
          "Semua data medis kamu terenkripsi aman dan cuma dipakai supaya rekomendasi makanan kamu beneran pas. Yuk diisi pelan-pelan ya! ✨",
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
    
    let advice = isFormal
      ? "Tidak masalah apabila Anda lupa. Anda dapat memasukkan angka perkiraan terakhir saat pemeriksaan kesehatan."
      : "Gak masalah kok kalau lupa! Kamu boleh masukin angka perkiraan saat terakhir cek kesehatan.";
    if (isOptional) {
      advice += isFormal
        ? " Karena pertanyaan ini bersifat opsional, Anda juga dapat mengetik **'skip'** atau menekan tombol **'Lewati Pertanyaan Ini'**."
        : " Karena pertanyaan ini opsional, kamu juga boleh langsung ketik **'skip'** atau klik tombol **'Lewati Pertanyaan Ini'** ya!";
    } else {
      advice += isFormal
        ? " Mohon masukkan angka estimasi terbaik Anda."
        : " Masukin angka estimasi terbaik kamu aja ya!";
    }

    return {
      is_special: true,
      bot_response: isFormal
        ? `Baik, tidak masalah jika belum mengingat angkanya. 😊\n\n${advice}\n\nSilakan masukkan angka perkiraan Anda atau lewati jika opsional.`
        : `Santai aja, wajar kok kalau lupa! 😊\n\n${advice}\n\nMau pakai estimasi berapa atau kita lewati dulu?`,
      repeat_question: true
    };
  }

  // 3. Ucapan Terima Kasih / Sopan Santun
  const gratitudeKeywords = ["terima kasih", "makasih", "tengkyu", "thanks", "thx", "arigato", "nuhun"];
  if (gratitudeKeywords.some((k) => msg === k || msg.startsWith(k + " ") || msg.endsWith(" " + k))) {
    return {
      is_special: true,
      bot_response: isFormal
        ? "Sama-sama. Senang dapat mendampingi Anda. Mari kita lanjutkan beberapa pertanyaan berikutnya agar evaluasi medis Anda lengkap."
        : "Sama-sama! Senang banget bisa bantu kamu. 🌟 Yuk kita lanjutin beberapa pertanyaan lagi biar profil kesehatan kamu lengkap!",
      repeat_question: true
    };
  }

  // 4. Sapaan Kasual (Halo / Hai)
  const greetingKeywords = ["halo", "hai", "hei", "p", "pagi", "siang", "sore", "malam", "assalamualaikum"];
  if (greetingKeywords.some((k) => msg === k || msg.startsWith(k + " "))) {
    return {
      is_special: true,
      bot_response: isFormal
        ? "Halo, selamat datang kembali. Mari kita lanjutkan sesi wawancara rekam medis Anda."
        : "Halo juga! 👋 Senang kamu di sini. Yuk kita lanjutin sesi wawancaranya ya!",
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
  let answersModified = false;

  // Ambil data registrasi pengguna dari tabel users agar tidak ditanyakan ulang di kuesioner
  const userRow = db.prepare("SELECT username, email, phone_number, usia FROM users WHERE id = ?").get(userId);
  const regName = (userRow?.username || userObj?.username || "").trim();
  const regEmail = (userRow?.email || userObj?.email || "").trim();
  const regPhone = (userRow?.phone_number || userObj?.phone_number || "").trim();
  const regAge = userRow?.usia ?? userObj?.usia ?? null;

  if (regName && !answers.nama) {
    answers.nama = regName;
    answersModified = true;
  }
  if (regEmail && !answers.email) {
    answers.email = regEmail;
    answersModified = true;
  }
  if (regPhone && !answers.phone_number) {
    answers.phone_number = regPhone;
    answersModified = true;
  }
  if (regAge !== null && regAge !== undefined && !answers.usia) {
    answers.usia = String(regAge);
    answersModified = true;
  }

  const isFormal = resolveIsFormal(answers, userRow);

  // Jika sudah completed
  if (progress.is_completed) {
    return {
      is_completed: true,
      progress_percent: 100,
      current_step: ONBOARDING_QUESTIONS.length,
      total_steps: ONBOARDING_QUESTIONS.length,
      tone_mode: isFormal ? "formal" : "casual",
      message: "Profil rekam medis Anda telah lengkap dan seluruh fitur PrediaBeat telah aktif!",
      answers
    };
  }

  // Cari pertanyaan aktif
  let currentQIndex = ONBOARDING_QUESTIONS.findIndex((q) => q.id === progress.current_question_id);
  if (currentQIndex === -1) currentQIndex = 0;

  // Lewati pertanyaan yang sudah terisi otomatis dari registrasi (nama, phone_number, email, usia)
  let indexSkipped = false;
  while (currentQIndex < ONBOARDING_QUESTIONS.length) {
    const candidateKey = ONBOARDING_QUESTIONS[currentQIndex].field_key;
    const alreadyFilled =
      (candidateKey === "nama" && Boolean(answers.nama)) ||
      (candidateKey === "phone_number" && Boolean(answers.phone_number)) ||
      (candidateKey === "email" && Boolean(answers.email)) ||
      (candidateKey === "usia" && Boolean(answers.usia));

    if (alreadyFilled) {
      currentQIndex++;
      indexSkipped = true;
    } else {
      break;
    }
  }

  if (currentQIndex >= ONBOARDING_QUESTIONS.length) {
    currentQIndex = ONBOARDING_QUESTIONS.length - 1;
  }

  let activeQuestion = ONBOARDING_QUESTIONS[currentQIndex];

  if (answersModified || indexSkipped) {
    db.prepare(`
      UPDATE onboarding_progress
      SET current_question_id = ?, answers_json = ?, updated_at = ?
      WHERE user_id = ?
    `).run(activeQuestion.id, JSON.stringify(answers), now, userId);
  }
  const total = ONBOARDING_QUESTIONS.length;
  const progressPercent = Math.min(Math.round((currentQIndex / total) * 100), 99);

  return {
    is_completed: false,
    progress_percent: progressPercent,
    current_step: currentQIndex + 1,
    total_steps: total,
    tone_mode: isFormal ? "formal" : "casual",
    section: activeQuestion.section,
    question_id: activeQuestion.id,
    field_key: activeQuestion.field_key,
    question_text: activeQuestion.question,
    genz_prompt: isFormal ? activeQuestion.formal_prompt : activeQuestion.genz_prompt,
    formal_prompt: activeQuestion.formal_prompt,
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
  const currentIsFormal = state.tone_mode === "formal";
  const specialCheck = handleSpecialConversationalIntent(textMessage || String(rawAnswer), currentQ, currentIsFormal);
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
  const nextFormal = updatedState.tone_mode === "formal";

  // Buat respon feedback suportif dari Dr. Predi sesuai usia
  let feedback = nextFormal
    ? "Baik, jawaban Anda telah saya catat dengan baik. 👍"
    : "Sip, jawaban kamu udah Predi catat ya! 👍";
  if (currentQ.field_key === "berat_badan" || currentQ.field_key === "tinggi_badan") {
    feedback = nextFormal
      ? "Baik, data antropometri Anda sudah tersimpan. Mari lanjut ke detail berikutnya:"
      : "Sip, data fisik kamu udah kesimpan rapi! Lanjut ke detail berikutnya ya:";
  } else if (currentQ.field_key === "frekuensi_minum_manis") {
    feedback = nextFormal
      ? "Baik, catatan konsumsi minuman manis Anda sudah tercatat. Nanti saya bantu susun alternatif yang lebih aman bagi gula darah:"
      : "Noted soal minuman manis! Nanti Predi kasih trik biar gak gampang sugar craving pas beraktivitas:";
  } else if (currentQ.field_key === "durasi_tidur_malam") {
    feedback = nextFormal
      ? "Terima kasih, pola tidur Anda sudah tercatat. Kualitas tidur berperan penting dalam menjaga sensitivitas insulin:"
      : "Oke paham soal jam tidur kamu! Pola tidur emang ngaruh banget ke sensitivitas insulin keesokan harinya:";
  }

  return {
    is_completed: false,
    bot_feedback: feedback,
    next_state: updatedState
  };
}
