import db from "../database/connection.js";
import { prosesAnalisisKlinis } from "../clinical/assessment.js";
import { generateDailyMealPlan } from "../clinical/mealPlanEngine.js";

export function getDraft(req, res) {
  try {
    const draft = db
      .prepare("SELECT draft_data, last_section, updated_at FROM questionnaire_drafts WHERE user_id = ?")
      .get(req.user.id);

    if (!draft) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: {
        draftData: JSON.parse(draft.draft_data),
        lastSection: draft.last_section,
        updatedAt: draft.updated_at,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat draft kuesioner." });
  }
}

export function saveDraft(req, res) {
  try {
    const { draftData, lastSection } = req.body;
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO questionnaire_drafts (user_id, draft_data, last_section, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        draft_data = excluded.draft_data,
        last_section = excluded.last_section,
        updated_at = excluded.updated_at
    `);

    stmt.run(req.user.id, JSON.stringify(draftData || {}), lastSection || 1, now);

    res.json({
      success: true,
      message: "Draft kuesioner berhasil disimpan.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menyimpan draft kuesioner." });
  }
}

export function submitQuestionnaire(req, res) {
  try {
    const profil = req.body;

    if (!profil.berat_badan || !profil.tinggi_badan || !profil.usia) {
      return res.status(400).json({
        success: false,
        message: "Data berat badan, tinggi badan, dan usia wajib diisi.",
      });
    }

    // 1. Jalankan Analisis Klinis Presisi
    const analysis = prosesAnalisisKlinis(profil);

    // 2. Generate Rencana Meal Plan 3J Harian Berdasarkan Profil & Pantangan
    const allergies = Array.isArray(profil.pantangan_alergi)
      ? profil.pantangan_alergi
      : typeof profil.pantangan_alergi === "string"
      ? profil.pantangan_alergi.split(",").map((s) => s.trim())
      : [];

    const mealPlan = generateDailyMealPlan(analysis.target_kalori, allergies, analysis.active_diet);
    analysis.meal_plan = mealPlan;

    const now = new Date().toISOString();

    // 3. Simpan Profil & Analisis ke Database
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
      req.user.id,
      JSON.stringify(profil),
      JSON.stringify(analysis),
      now,
      now,
      now
    );

    // Simpan ke riwayat assessment
    db.prepare(`
      INSERT INTO assessment_history (user_id, full_profile_data, analysis_result, created_at)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, JSON.stringify(profil), JSON.stringify(analysis), now);

    // Hapus draft kuesioner karena sudah selesai
    db.prepare("DELETE FROM questionnaire_drafts WHERE user_id = ?").run(req.user.id);

    res.json({
      success: true,
      message: "Kuesioner klinis berhasil diproses! Hasil analisis dan meal plan telah dibuat.",
      data: {
        profile: profil,
        analysis,
      },
    });
  } catch (error) {
    console.error("Submit Questionnaire Error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memproses hasil kuesioner medis.",
    });
  }
}
