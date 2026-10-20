import db from "../database/connection.js";
import { generateDailyMealPlan } from "../clinical/mealPlanEngine.js";

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
        analysis.active_diet || "mediterania"
      );
    }

    // Ambil log progress hari ini jika ada
    const today = new Date().toISOString().split("T")[0];
    const todayLog = db
      .prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?")
      .get(req.user.id, today);

    res.json({
      success: true,
      data: {
        user: req.user,
        profile,
        analysis,
        todayLog: todayLog || null,
        needsUpdate: false,
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

    const allergies = Array.isArray(profile.pantangan_alergi)
      ? profile.pantangan_alergi
      : typeof profile.pantangan_alergi === "string"
      ? profile.pantangan_alergi.split(",").map((s) => s.trim())
      : [];

    const newMealPlan = generateDailyMealPlan(
      analysis.target_kalori || 1850,
      allergies,
      analysis.active_diet || "mediterania"
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
