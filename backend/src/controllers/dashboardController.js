import db from "../database/connection.js";
import { generateDailyMealPlan, MEAL_FREQUENCY_OPTIONS, resolveMealFrequencyConfig } from "../clinical/mealPlanEngine.js";
import { hitungKesesuaianDiet } from "../clinical/assessment.js";

export function getDashboard(req, res) {
  try {
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);

    if (!profileRow) {
      return res.status(404).json({
        success: false,
        message: "Profil klinis belum ditemukan. Silakan lengkapi kuesioner terlebih dahulu.",
        needsQuestionnaire: true,
      });
    }

    const profile = JSON.parse(profileRow.full_profile_data);
    const analysis = JSON.parse(profileRow.analysis_result);

    if (!Array.isArray(analysis.diet_recommendations) || analysis.diet_recommendations.length === 0) {
      analysis.diet_recommendations = hitungKesesuaianDiet(profile, analysis.bmi, analysis.kategori_risiko);
    }

    // Pastikan meal plan selalu terisi
    if (!analysis.meal_plan || analysis.meal_plan.length === 0) {
      const allergies = Array.isArray(profile.pantangan_alergi)
        ? profile.pantangan_alergi
        : typeof profile.pantangan_alergi === "string"
        ? profile.pantangan_alergi.split(",").map((s) => s.trim())
        : [];

      analysis.meal_plan = generateDailyMealPlan(
        analysis.target_kalori || 1850,
        allergies,
        analysis.active_diet || "",
        profile.meal_frequency || ""
      );

      const now = new Date().toISOString();
      try {
        db.prepare("UPDATE profiles SET analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
          JSON.stringify(analysis),
          now,
          req.user.id
        );
      } catch (eSave) {
        console.warn("Notice: could not auto-save initial meal plan to profiles:", eSave.message);
      }
    }

    // Ambil log progress hari ini jika ada
    const today = new Date().toISOString().split("T")[0];
    const todayLog = db
      .prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?")
      .get(req.user.id, today);

    // Hitung Health Score & Ringkasan Progress Mingguan secara dinamis dari 7 hari terakhir
    const sevenDaysAgoDate = new Date();
    sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgoDate.toISOString().split("T")[0];

    const weeklyLogs = db
      .prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal >= ? ORDER BY tanggal DESC")
      .all(req.user.id, sevenDaysAgoStr);

    const activeLogs = weeklyLogs.filter(
      (l) => (l.actual_kalori || 0) > 0 || (l.duration_minutes || 0) > 0 || (l.notes && l.notes.trim().length > 0)
    );
    const daysLogged = activeLogs.length;
    const totalExerciseMinutes = Math.round(
      weeklyLogs.reduce((sum, l) => sum + (parseFloat(l.duration_minutes) || 0), 0)
    );

    const targetKal = analysis.target_kalori || 1850;
    let avgAdherence = 0;
    let foodQuality = 0;

    if (daysLogged > 0) {
      const adherenceList = activeLogs.map((l) => {
        if (l.meal_plan_adherence_percent > 0) return Math.min(100, l.meal_plan_adherence_percent);
        if ((l.actual_kalori || 0) > 0) {
          const diffRatio = Math.abs(l.actual_kalori - targetKal) / Math.max(targetKal, 1);
          return Math.max(40, Math.round((1 - Math.min(diffRatio, 0.6)) * 100));
        }
        return 70;
      });
      avgAdherence = Math.round(adherenceList.reduce((a, b) => a + b, 0) / adherenceList.length);

      const sweetAvg =
        activeLogs.reduce((sum, l) => sum + (parseFloat(l.sweet_drink_count) || 0), 0) / daysLogged;
      const baseQuality = (avgAdherence / 100) * 9.5 - Math.min(sweetAvg * 1.2, 3);
      foodQuality = Math.max(4.0, Math.min(10.0, Math.round(baseQuality * 10) / 10));
    }

    const scoreVal =
      daysLogged === 0
        ? 0
        : Math.min(
            100,
            Math.round(
              (Math.min(daysLogged, 7) / 7) * 25 +
                (avgAdherence / 100) * 35 +
                Math.min(totalExerciseMinutes / 150, 1) * 25 +
                (foodQuality / 10) * 15
            )
          );

    let scoreStatus = "Belum Ada Catatan Minggu Ini";
    let insightMsg =
      "Belum ada catatan asupan atau aktivitas fisik pada minggu ini. Mulai catat makanan atau olahraga pertama Anda di Jurnal Harian untuk memantau Health Score secara real-time.";
    const priorities = [];

    if (daysLogged > 0) {
      if (scoreVal >= 80) scoreStatus = "Kondisi Stabil & Baik";
      else if (scoreVal >= 60) scoreStatus = "Cukup Baik (Terus Tingkatkan)";
      else scoreStatus = "Perlu Konsistensi";

      insightMsg = `Tercatat ${daysLogged} hari log aktif pada minggu ini dengan rata-rata kepatuhan ${avgAdherence}% dan total aktivitas fisik ${totalExerciseMinutes} menit.`;
      if (totalExerciseMinutes < 150) {
        priorities.push(
          `Tambahkan ${150 - totalExerciseMinutes} menit aktivitas fisik ringan-sedang minggu ini untuk mencapai target 150 menit/minggu PERKENI.`
        );
      } else {
        priorities.push("Target 150 menit olahraga mingguan sudah tercapai! Pertahankan konsistensi Anda.");
      }
    } else {
      priorities.push("Catat menu makan hari ini di Dashboard atau Jurnal Harian untuk mengaktifkan perhitungan Health Score.");
    }

    analysis.health_score = {
      score: scoreVal,
      status: scoreStatus,
      metrics: {
        days_logged: daysLogged,
        avg_adherence: avgAdherence,
        total_exercise_minutes: totalExerciseMinutes,
      },
      breakdown: { food_quality: foodQuality },
    };
    analysis.weekly_insight = {
      message: insightMsg,
      priorities,
    };

    const lastProfileDate = new Date(profileRow.questionnaire_completed_at || profileRow.updated_at || Date.now());
    const daysSinceUpdate = (Date.now() - lastProfileDate.getTime()) / (1000 * 60 * 60 * 24);
    const needsUpdate = Number.isFinite(daysSinceUpdate) && daysSinceUpdate >= 30;

    res.json({
      success: true,
      data: {
        user: req.user,
        profile,
        analysis,
        todayLog: todayLog || null,
        needsUpdate,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ success: false, message: "Gagal memuat data dashboard." });
  }
}

export function regenerateMealPlan(req, res) {
  try {
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);

    if (!profileRow) {
      return res.status(404).json({
        success: false,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    const profile = JSON.parse(profileRow.full_profile_data);
    const analysis = JSON.parse(profileRow.analysis_result);

    if (!Array.isArray(analysis.diet_recommendations) || analysis.diet_recommendations.length === 0) {
      analysis.diet_recommendations = hitungKesesuaianDiet(profile, analysis.bmi, analysis.kategori_risiko);
    }

    const allergies = Array.isArray(profile.pantangan_alergi)
      ? profile.pantangan_alergi
      : typeof profile.pantangan_alergi === "string"
      ? profile.pantangan_alergi.split(",").map((s) => s.trim())
      : [];

    const newMealPlan = generateDailyMealPlan(
      analysis.target_kalori || 1850,
      allergies,
      analysis.active_diet || "",
      profile.meal_frequency || ""
    );

    analysis.meal_plan = newMealPlan;

    // Update profiles table
    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
      JSON.stringify(analysis),
      now,
      req.user.id
    );

    res.json({
      success: true,
      message: "Rencana makan harian berhasil diacak ulang sesuai rekomendasi 3J!",
      data: {
        meal_plan: newMealPlan,
      },
    });
  } catch (error) {
    console.error("Regenerate meal plan error:", error);
    res.status(500).json({ success: false, message: "Gagal mengacak ulang meal plan." });
  }
}

export function updateMealFrequency(req, res) {
  try {
    const { frequency, mainMeals, snacks } = req.body;
    let freqKey = frequency;
    if (mainMeals !== undefined && snacks !== undefined) {
      const m = Math.max(1, Math.min(3, parseInt(mainMeals, 10) || 3));
      const s = Math.max(0, Math.min(3, parseInt(snacks, 10) || 0));
      freqKey = `custom_${m}_${s}`;
    }
    const option = freqKey && (MEAL_FREQUENCY_OPTIONS[freqKey] || freqKey.startsWith("custom_"))
      ? resolveMealFrequencyConfig(freqKey)
      : null;
    if (!option) {
      return res.status(400).json({
        success: false,
        message: "Pilihan frekuensi makan tidak valid (minimal 1x makan 0x selingan, maksimal 3x makan 3x selingan).",
      });
    }

    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);
    if (!profileRow) {
      return res.status(404).json({ success: false, message: "Profil tidak ditemukan." });
    }

    const profile = JSON.parse(profileRow.full_profile_data);
    const analysis = JSON.parse(profileRow.analysis_result);

    if (!Array.isArray(analysis.diet_recommendations) || analysis.diet_recommendations.length === 0) {
      analysis.diet_recommendations = hitungKesesuaianDiet(profile, analysis.bmi, analysis.kategori_risiko);
    }

    profile.meal_frequency = option.id;
    profile.pola_waktu_makan = option.label;
    analysis.meal_frequency = option.id;
    analysis.pola_waktu_makan = option.label;
    analysis.frekuensi_makan = option.short;

    const allergies = Array.isArray(profile.pantangan_alergi)
      ? profile.pantangan_alergi
      : typeof profile.pantangan_alergi === "string"
      ? profile.pantangan_alergi.split(",").map((s) => s.trim())
      : [];

    analysis.meal_plan = generateDailyMealPlan(
      analysis.target_kalori || 1850,
      allergies,
      analysis.active_diet || "",
      option.id
    );

    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET full_profile_data = ?, analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
      JSON.stringify(profile),
      JSON.stringify(analysis),
      now,
      req.user.id
    );

    res.json({
      success: true,
      message: `Pola makan diubah ke ${option.label}.`,
      data: {
        profile,
        analysis,
      },
    });
  } catch (error) {
    console.error("Update meal frequency error:", error);
    res.status(500).json({ success: false, message: "Gagal mengubah frekuensi makan." });
  }
}
