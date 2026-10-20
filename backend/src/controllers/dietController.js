import { DIET_CATALOG, hitungTargetKaloriMakro } from "../clinical/assessment.js";
import { generateDailyMealPlan } from "../clinical/mealPlanEngine.js";
import db from "../database/connection.js";

export function getAllDiets(req, res) {
  try {
    const list = Object.values(DIET_CATALOG);
    res.json({
      success: true,
      data: list,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat katalog diet." });
  }
}

export function getDietDetail(req, res) {
  try {
    const { slug } = req.params;
    const diet = DIET_CATALOG[slug] || Object.values(DIET_CATALOG).find((d) => d.slug === slug);

    if (!diet) {
      return res.status(404).json({
        success: false,
        message: "Program diet tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      data: diet,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat detail diet." });
  }
}

export function activateDiet(req, res) {
  try {
    const { dietId } = req.body;
    const selectedDiet = DIET_CATALOG[dietId];

    if (!selectedDiet) {
      return res.status(400).json({
        success: false,
        message: "Pilihan program diet tidak valid.",
      });
    }

    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);
    if (!profileRow) {
      return res.status(404).json({ success: false, message: "Profil tidak ditemukan." });
    }

    const profile = JSON.parse(profileRow.full_profile_data);
    const analysis = JSON.parse(profileRow.analysis_result);

    // Update active diet
    profile.active_diet = dietId;
    profile.active_diet_label = selectedDiet.nama;

    // Recalculate macro targets based on chosen diet
    const macro = hitungTargetKaloriMakro(
      analysis.tdee,
      analysis.kategori_risiko,
      analysis.bmi,
      profile.jenis_kelamin,
      dietId
    );

    analysis.target_karbo = macro.karboGram;
    analysis.target_protein = macro.proteinGram;
    analysis.target_lemak = macro.lemakGram;
    analysis.active_diet = dietId;
    analysis.active_diet_label = selectedDiet.nama;

    // Regenerate meal plan for new diet
    const allergies = Array.isArray(profile.pantangan_alergi)
      ? profile.pantangan_alergi
      : typeof profile.pantangan_alergi === "string"
      ? profile.pantangan_alergi.split(",").map((s) => s.trim())
      : [];

    analysis.meal_plan = generateDailyMealPlan(analysis.target_kalori, allergies, dietId);

    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET full_profile_data = ?, analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
      JSON.stringify(profile),
      JSON.stringify(analysis),
      now,
      req.user.id
    );

    res.json({
      success: true,
      message: `Program ${selectedDiet.nama} berhasil diaktifkan! Target makro dan meal plan telah diperbarui.`,
      data: {
        active_diet: dietId,
        active_diet_label: selectedDiet.nama,
        analysis,
      },
    });
  } catch (error) {
    console.error("Activate diet error:", error);
    res.status(500).json({ success: false, message: "Gagal mengaktifkan program diet." });
  }
}

export function deactivateDiet(req, res) {
  try {
    const profileRow = db.prepare("SELECT * FROM profiles WHERE user_id = ?").get(req.user.id);
    if (!profileRow) {
      return res.status(404).json({ success: false, message: "Profil tidak ditemukan." });
    }

    const profile = JSON.parse(profileRow.full_profile_data);
    const analysis = JSON.parse(profileRow.analysis_result);

    // Reset to Mediterania as baseline
    profile.active_diet = "mediterania";
    profile.active_diet_label = "Diet Mediterania";
    analysis.active_diet = "mediterania";
    analysis.active_diet_label = "Diet Mediterania";

    const macro = hitungTargetKaloriMakro(
      analysis.tdee,
      analysis.kategori_risiko,
      analysis.bmi,
      profile.jenis_kelamin,
      "mediterania"
    );

    analysis.target_karbo = macro.karboGram;
    analysis.target_protein = macro.proteinGram;
    analysis.target_lemak = macro.lemakGram;

    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET full_profile_data = ?, analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
      JSON.stringify(profile),
      JSON.stringify(analysis),
      now,
      req.user.id
    );

    res.json({
      success: true,
      message: "Program diet khusus dinonaktifkan. Kembali ke pola diet seimbang standar.",
      data: {
        analysis,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menonaktifkan diet." });
  }
}
