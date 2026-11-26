import { DIET_CATALOG, hitungTargetKaloriMakro } from "../clinical/assessment.js";
import { generateDailyMealPlan, extractAllergies, MEAL_FREQUENCY_OPTIONS } from "../clinical/mealPlanEngine.js";
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
    if (Array.isArray(analysis.catatan_pola_makan) && analysis.catatan_pola_makan.length > 0 && macro.catatanDiet) {
      analysis.catatan_pola_makan[0] = macro.catatanDiet;
    }
    analysis.active_diet = dietId;
    analysis.active_diet_label = selectedDiet.nama;

    // Regenerate meal plan for new diet
    const allergies = extractAllergies(profile);

    const nextFreq = dietId === "intermittent_fasting" ? "2_kali" : (profile.meal_frequency || "normal_3j");
    const freqMeta = MEAL_FREQUENCY_OPTIONS[nextFreq] || MEAL_FREQUENCY_OPTIONS.normal_3j;
    profile.meal_frequency = nextFreq;
    profile.pola_waktu_makan = freqMeta.label;
    analysis.meal_frequency = nextFreq;
    analysis.pola_waktu_makan = freqMeta.label;
    analysis.frekuensi_makan = freqMeta.short;

    analysis.meal_plan = generateDailyMealPlan(analysis.target_kalori, allergies, dietId, nextFreq);

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

    // Nonaktifkan diet khusus -> kembali ke belum memilih diet (Pola Seimbang 3J Standar)
    profile.active_diet = "";
    profile.active_diet_label = "Belum Dipilih (Pola Seimbang 3J)";
    analysis.active_diet = "";
    analysis.active_diet_label = "Belum Dipilih (Pola Seimbang 3J)";

    const macro = hitungTargetKaloriMakro(
      analysis.tdee,
      analysis.kategori_risiko,
      analysis.bmi,
      profile.jenis_kelamin,
      ""
    );

    analysis.target_karbo = macro.karboGram;
    analysis.target_protein = macro.proteinGram;
    analysis.target_lemak = macro.lemakGram;
    if (Array.isArray(analysis.catatan_pola_makan) && analysis.catatan_pola_makan.length > 0 && macro.catatanDiet) {
      analysis.catatan_pola_makan[0] = macro.catatanDiet;
    }

    const allergies = extractAllergies(profile);

    const resetFreq = "normal_3j";
    const resetFreqMeta = MEAL_FREQUENCY_OPTIONS[resetFreq];
    profile.meal_frequency = resetFreq;
    profile.pola_waktu_makan = resetFreqMeta.label;
    analysis.meal_frequency = resetFreq;
    analysis.pola_waktu_makan = resetFreqMeta.label;
    analysis.frekuensi_makan = resetFreqMeta.short;

    analysis.meal_plan = generateDailyMealPlan(analysis.target_kalori, allergies, "", resetFreq);

    const now = new Date().toISOString();
    db.prepare("UPDATE profiles SET full_profile_data = ?, analysis_result = ?, updated_at = ? WHERE user_id = ?").run(
      JSON.stringify(profile),
      JSON.stringify(analysis),
      now,
      req.user.id
    );

    res.json({
      success: true,
      message: "Program diet khusus dinonaktifkan. Kembali ke pola seimbang 3J standar.",
      data: {
        active_diet: "",
        active_diet_label: "Belum Dipilih (Pola Seimbang 3J)",
        analysis,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menonaktifkan diet." });
  }
}
