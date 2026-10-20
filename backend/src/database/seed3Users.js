import db from "./connection.js";
import bcrypt from "bcryptjs";
import { prosesAnalisisKlinis } from "../clinical/assessment.js";
import { generateDailyMealPlan } from "../clinical/mealPlanEngine.js";
import referenceService from "../services/referenceService.js";

export function seedThreeUsers() {
  console.log("==================================================");
  console.log("💉 MENYUNTIKKAN DATA 3 PENGGUNA KLINIS KE DATABASE");
  console.log("==================================================");

  // Pastikan dataset makanan telah dimuat ke memory
  referenceService.init();

  const salt = bcrypt.genSaltSync(10);
  const commonPassword = "PrediaBeat2026!";
  const passwordHash = bcrypt.hashSync(commonPassword, salt);
  const now = new Date().toISOString();

  const usersToSeed = [
    // --------------------------------------------------------------------------
    // USER 1 (COWO): Budi Santoso - Pria Paruh Baya, Obesitas, Hipertensi & Asam Urat
    // --------------------------------------------------------------------------
    {
      username: "budi_santoso",
      email: "budi.santoso@prediabeat.id",
      profile: {
        nama: "Budi Santoso",
        usia: 50,
        jenis_kelamin: "Laki-laki",
        tinggi_badan: 172,
        berat_badan: 78,
        lingkar_pinggang: 94, // Obesitas sentral pria >= 90 cm
        aktivitas: "sedang",
        frekuensi_olahraga: "3-4 kali seminggu",
        gula_darah_puasa: 114,
        hba1c: 5.8,
        riwayat_keluarga_diabetes: true,
        pola_makan: "Suka makan berlemak dan sering makan malam larut",
        pantangan_alergi: ["Seafood", "Kacang Tanah", "Santan"],
        komorbiditas: ["Hipertensi Derajat 1", "Asam Urat"],
        active_diet: "mediterania",
        pola_waktu_makan: "3 kali makan utama + 2 kali selingan",
      },
      chatLogs: [
        {
          role: "user",
          content: "Selamat siang Dr. Predi, hasil lab saya GDP 114 dan tensi sering 135/85. Menu makan siang apa yang aman?",
        },
        {
          role: "assistant",
          content: "Selamat siang Pak Budi. Berdasarkan hasil lab dan diagnosis prediabetes dengan komorbid hipertensi serta alergi seafood dan santan, pola makan difokuskan pada Diet Mediterania rendah sodium:\n\n1. **Pepes Ikan Mas Bumbu Kuning Kemangi (100g)** (180 kkal) - bebas minyak & santan.\n2. **Sayur Bening Bayam Oyong (150g)** (65 kkal) - tinggi kalium alami penurun tensi.\n3. **Nasi Beras Merah (100g)** (145 kkal) - kaya serat larut beta-glukan.\n\n🛡️ Menu ini dijamin **100% bebas dari seafood, kacang tanah, dan santan**.",
        },
      ],
    },

    // --------------------------------------------------------------------------
    // USER 2 (COWO): Dimas Pratama - Pria Muda Produktif, Sedentary, Kolesterol & Kebiasaan Minis Manis
    // --------------------------------------------------------------------------
    {
      username: "dimas_pratama",
      email: "dimas.pratama@prediabeat.id",
      profile: {
        nama: "Dimas Pratama",
        usia: 36,
        jenis_kelamin: "Laki-laki",
        tinggi_badan: 168,
        berat_badan: 74,
        lingkar_pinggang: 88, // Overweight
        aktivitas: "ringan",
        frekuensi_olahraga: "jarang / tidak pernah",
        gula_darah_puasa: 108,
        hba1c: 5.7,
        riwayat_keluarga_diabetes: false,
        pola_makan: "Sering konsumsi kopi susu gula aren dan camilan gorengan kantor",
        pantangan_alergi: ["Susu Sapi", "Gluten"],
        komorbiditas: ["Kolesterol Tinggi (Dislipidemia)"],
        active_diet: "rendah_karbo",
        pola_waktu_makan: "3 kali makan utama + 2 kali selingan",
      },
      chatLogs: [
        {
          role: "user",
          content: "Halo Dok, saya sering lemas di jam 3 sore dan pengen kopi manis. Alternatif apa yang aman ya?",
        },
        {
          role: "assistant",
          content: "Halo Mas Dimas. Rasa lemas di jam 3 sore tersebut adalah gejala klasik 'sugar crash' akibat lonjakan insulin setelah konsumsi karbohidrat olahan/gula aren saat makan siang. Karena Anda sedang menjalani Diet Rendah Karbohidrat dengan pantangan susu sapi dan gluten:\n\n- Ganti kopi susu gula aren dengan **Americano / Teh Hijau Tanpa Gula**.\n- Untuk camilan pengganjal, pilih **Edamame Rebus (100g)** atau **Alpukat Kerok Jeruk Nipis** yang kaya lemak tak jenuh ganda penurun kolesterol LDL Anda.",
        },
      ],
    },

    // --------------------------------------------------------------------------
    // USER 3 (CEWE): Ratna Dewi - Wanita Muda, Riwayat Gestasional & PCOS
    // --------------------------------------------------------------------------
    {
      username: "ratna_dewi",
      email: "ratna.dewi@prediabeat.id",
      profile: {
        nama: "Ratna Dewi",
        usia: 32,
        jenis_kelamin: "Perempuan",
        tinggi_badan: 158,
        berat_badan: 65,
        lingkar_pinggang: 83, // Obesitas sentral wanita >= 80 cm
        aktivitas: "sedang",
        frekuensi_olahraga: "1-2 kali seminggu",
        gula_darah_puasa: 102,
        hba1c: 5.7,
        riwayat_keluarga_diabetes: true,
        pola_makan: "Nafsu makan mudah meningkat saat fase ovulasi/PCOS",
        pantangan_alergi: ["Telur", "Susu Sapi"],
        komorbiditas: ["PCOS (Polycystic Ovary Syndrome)", "Riwayat Diabetes Gestasional"],
        active_diet: "dash",
        pola_waktu_makan: "3 kali makan utama + 2 kali selingan",
      },
      chatLogs: [
        {
          role: "user",
          content: "Dr. Predi, dengan riwayat PCOS dan diabetes gestasional, bagaimana mengatur sarapan agar hormon insulin saya lebih stabil?",
        },
        {
          role: "assistant",
          content: "Selamat pagi Ibu Ratna. Pasien PCOS memiliki resistensi insulin yang lebih peka terhadap lonjakan gula darah di pagi hari. Karena Anda alergi telur dan susu sapi, strategi sarapan terbaik adalah:\n\n1. **Bubur Havermut (Oat) Chia Seed Kuah Susu Kedelai Tawar** (160 kkal).\n2. Tambahkan potongan buah apel hijau lokal atau pepaya segar untuk serat pektin.\n3. Minum segelas air hangat dengan perasan lemon.\n\n🛡️ Menu ini 100% bebas dari telur dan susu hewani, sangat mendukung keseimbangan hormonal PCOS Anda.",
        },
      ],
    },
  ];

  for (const u of usersToSeed) {
    const usernameNorm = u.username.toLowerCase();
    const emailNorm = u.email.toLowerCase();

    // 1. Cek atau Buat User
    let userRow = db
      .prepare("SELECT id FROM users WHERE username_normalized = ? OR email_normalized = ?")
      .get(usernameNorm, emailNorm);

    let userId;
    if (userRow) {
      userId = userRow.id;
      // Perbarui password hash jika sudah ada
      db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
        passwordHash,
        now,
        userId
      );
    } else {
      const insertUser = db.prepare(`
        INSERT INTO users (username, username_normalized, email, email_normalized, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'user', ?, ?)
      `);
      const info = insertUser.run(u.username, usernameNorm, u.email, emailNorm, passwordHash, now, now);
      userId = info.lastInsertRowid;
    }

    // 2. Jalankan Perhitungan Klinis PERKENI & 3J
    const analysis = prosesAnalisisKlinis(u.profile);

    // 3. Generate 5-Slot Meal Plan Khusus Alergi & Diet User
    const allergies = Array.isArray(u.profile.pantangan_alergi)
      ? u.profile.pantangan_alergi
      : [];
    const mealPlan = generateDailyMealPlan(
      analysis.target_kalori,
      allergies,
      u.profile.active_diet
    );
    analysis.meal_plan = mealPlan;

    // 4. Simpan Profil Klinis & Hasil Analisis
    const profileStmt = db.prepare(`
      INSERT INTO profiles (user_id, full_profile_data, analysis_result, questionnaire_completed_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        full_profile_data = excluded.full_profile_data,
        analysis_result = excluded.analysis_result,
        questionnaire_completed_at = excluded.questionnaire_completed_at,
        updated_at = excluded.updated_at
    `);

    profileStmt.run(
      userId,
      JSON.stringify(u.profile),
      JSON.stringify(analysis),
      now,
      now,
      now
    );

    // 5. Simpan ke Riwayat Assessment
    db.prepare(`
      INSERT INTO assessment_history (user_id, full_profile_data, analysis_result, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, JSON.stringify(u.profile), JSON.stringify(analysis), now);

    // 6. Suntikkan Riwayat Chat Unik
    // Bersihkan chat lama jika ada untuk user ini agar rapi
    db.prepare("DELETE FROM chat_logs WHERE user_id = ?").run(userId);
    const chatStmt = db.prepare(`
      INSERT INTO chat_logs (user_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `);

    for (const chat of u.chatLogs) {
      chatStmt.run(userId, chat.role, chat.content, now);
    }

    console.log(
      `✅ USER [ID: ${userId}] ${u.username} (${u.profile.jenis_kelamin}, ${u.profile.usia} th) | BMI: ${analysis.bmi} (${analysis.status_bmi}) | Risiko: ${analysis.skor_risiko} (${analysis.kategori_risiko}) | Kalori: ${analysis.target_kalori} kkal | Pantangan: [${allergies.join(", ")}]`
    );
  }

  console.log("==================================================");
  console.log("🎉 PENYUNTIKAN 3 USER BERHASIL LENGKAP!");
  console.log(`Password Default untuk Ketiga User: "${commonPassword}"`);
  console.log("==================================================");
}

// Jalankan otomatis jika dipanggil langsung via node
seedThreeUsers();
