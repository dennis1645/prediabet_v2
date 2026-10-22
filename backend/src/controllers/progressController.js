import db from "../database/connection.js";

export function getDailyLog(req, res) {
  try {
    const { date } = req.params;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const log = db
      .prepare("SELECT * FROM daily_progress_logs WHERE user_id = ? AND tanggal = ?")
      .get(req.user.id, targetDate);

    // Ambil target kalori dari profil jika log belum punya
    const profileRow = db.prepare("SELECT analysis_result FROM profiles WHERE user_id = ?").get(req.user.id);
    let analysis = {};
    if (profileRow) {
      analysis = JSON.parse(profileRow.analysis_result);
    }

    res.json({
      success: true,
      data: {
        date: targetDate,
        log: log || null,
        target: {
          target_kalori: analysis.target_kalori || 1850,
          target_karbo: analysis.target_karbo || 231,
          target_protein: analysis.target_protein || 92,
          target_lemak: analysis.target_lemak || 62,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mengambil log progress harian." });
  }
}

export function saveDailyLog(req, res) {
  try {
    const {
      tanggal,
      weight_kg,
      waist_cm,
      actual_kalori,
      actual_karbo,
      actual_protein,
      actual_lemak,
      meal_plan_adherence_percent,
      activity_name,
      duration_minutes,
      activity_calories,
      fasting_glucose,
      sleep_hours,
      sweet_drink_count,
      notes,
    } = req.body;

    const targetDate = tanggal || new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();

    const profileRow = db.prepare("SELECT analysis_result FROM profiles WHERE user_id = ?").get(req.user.id);
    let analysis = {};
    if (profileRow) {
      analysis = JSON.parse(profileRow.analysis_result);
    }

    const tdee = analysis.tdee || 2150;
    const targetKalori = analysis.target_kalori || 1850;
    const caloriesOut = tdee + (parseFloat(activity_calories) || 0);
    const deficitCalories = caloriesOut - (parseFloat(actual_kalori) || targetKalori);

    const stmt = db.prepare(`
      INSERT INTO daily_progress_logs (
        user_id, tanggal, weight_kg, waist_cm, target_kalori, target_karbo, target_protein, target_lemak,
        tdee_reference, actual_kalori, actual_karbo, actual_protein, actual_lemak,
        meal_plan_adherence_percent, activity_name, duration_minutes, activity_calories,
        calories_out, deficit_calories, fasting_glucose, sleep_hours, sweet_drink_count, notes,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, tanggal) DO UPDATE SET
        weight_kg = excluded.weight_kg,
        waist_cm = excluded.waist_cm,
        actual_kalori = excluded.actual_kalori,
        actual_karbo = excluded.actual_karbo,
        actual_protein = excluded.actual_protein,
        actual_lemak = excluded.actual_lemak,
        meal_plan_adherence_percent = excluded.meal_plan_adherence_percent,
        activity_name = excluded.activity_name,
        duration_minutes = excluded.duration_minutes,
        activity_calories = excluded.activity_calories,
        calories_out = excluded.calories_out,
        deficit_calories = excluded.deficit_calories,
        fasting_glucose = excluded.fasting_glucose,
        sleep_hours = excluded.sleep_hours,
        sweet_drink_count = excluded.sweet_drink_count,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      req.user.id,
      targetDate,
      weight_kg || null,
      waist_cm || null,
      targetKalori,
      analysis.target_karbo || 0,
      analysis.target_protein || 0,
      analysis.target_lemak || 0,
      tdee,
      actual_kalori || 0,
      actual_karbo || 0,
      actual_protein || 0,
      actual_lemak || 0,
      meal_plan_adherence_percent || 0,
      activity_name || null,
      duration_minutes || 0,
      activity_calories || 0,
      caloriesOut,
      deficitCalories,
      fasting_glucose || null,
      sleep_hours || null,
      sweet_drink_count || 0,
      notes || null,
      now,
      now
    );

    res.json({
      success: true,
      message: "Catatan progress harian berhasil disimpan!",
    });
  } catch (error) {
    console.error("Save daily log error:", error);
    res.status(500).json({ success: false, message: "Gagal menyimpan catatan progress." });
  }
}

export function getWeeklySummary(req, res) {
  try {
    const logs = db
      .prepare(`
        SELECT * FROM daily_progress_logs
        WHERE user_id = ?
        ORDER BY tanggal DESC
        LIMIT 7
      `)
      .all(req.user.id);

    const daysLogged = logs.length;
    let totalAdherence = 0;
    let totalExerciseMinutes = 0;

    for (const log of logs) {
      totalAdherence += log.meal_plan_adherence_percent || 0;
      totalExerciseMinutes += log.duration_minutes || 0;
    }

    const avgAdherence = daysLogged > 0 ? Math.round(totalAdherence / daysLogged) : 85;

    res.json({
      success: true,
      data: {
        days_logged: daysLogged,
        avg_adherence: avgAdherence,
        total_exercise_minutes: Math.round(totalExerciseMinutes),
        recent_logs: logs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghitung ringkasan mingguan." });
  }
}

export function resetProgress(req, res) {
  try {
    const userId = req.user.id;
    db.prepare("DELETE FROM daily_progress_logs WHERE user_id = ?").run(userId);
    res.json({
      success: true,
      message: "Seluruh catatan progres harian berhasil direset ke status awal.",
    });
  } catch (error) {
    console.error("Reset progress error:", error);
    res.status(500).json({ success: false, message: "Gagal mereset progress pengguna." });
  }
}
