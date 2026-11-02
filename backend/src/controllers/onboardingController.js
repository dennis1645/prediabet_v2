import {
  getUserOnboardingState,
  submitAnswerAndAdvance
} from "../clinical/onboardingEngine.js";
import db from "../database/connection.js";

export function getOnboardingState(req, res) {
  try {
    const state = getUserOnboardingState(req.user.id, req.user);
    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    console.error("getOnboardingState error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memuat status wawancara onboarding."
    });
  }
}

export function answerOnboardingQuestion(req, res) {
  try {
    const { answer, message } = req.body;
    if (answer === undefined && !message) {
      return res.status(400).json({
        success: false,
        message: "Jawaban pertanyaan tidak boleh kosong."
      });
    }

    const result = submitAnswerAndAdvance(
      req.user.id,
      answer !== undefined ? answer : message,
      message || String(answer),
      req.user
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("answerOnboardingQuestion error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Gagal menyimpan jawaban wawancara."
    });
  }
}

export function resetOnboarding(req, res) {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO onboarding_progress (user_id, current_question_id, answers_json, is_completed, created_at, updated_at)
      VALUES (?, 1, '{}', 0, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        current_question_id = 1,
        answers_json = '{}',
        is_completed = 0,
        updated_at = excluded.updated_at
    `).run(req.user.id, now, now);

    const state = getUserOnboardingState(req.user.id, req.user);
    res.json({
      success: true,
      message: "Sesi wawancara berhasil diulang dari awal.",
      data: state
    });
  } catch (error) {
    console.error("resetOnboarding error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengulang sesi wawancara."
    });
  }
}
