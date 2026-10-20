import referenceService from "../services/referenceService.js";

export function searchFoods(req, res) {
  try {
    const { q, kategori, maxGI, exclude } = req.query;

    const excludeFlags = exclude ? exclude.split(",").map((s) => s.trim()) : [];

    const foods = referenceService.getFoods({
      search: q,
      kelompok: kategori,
      maxGI: maxGI ? parseFloat(maxGI) : undefined,
      excludeFlags,
    });

    // Limit to 50 results for optimal response payload
    const paginated = foods.slice(0, 50);

    res.json({
      success: true,
      total: foods.length,
      count: paginated.length,
      data: paginated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal mencari database makanan." });
  }
}

export function getFoodDetail(req, res) {
  try {
    const { id } = req.params;
    const food = referenceService.foods.find((f) => f.id === parseInt(id, 10));

    if (!food) {
      return res.status(404).json({ success: false, message: "Bahan makanan tidak ditemukan." });
    }

    res.json({
      success: true,
      data: food,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat detail makanan." });
  }
}

export function getActivities(req, res) {
  try {
    res.json({
      success: true,
      total: referenceService.activities.length,
      data: referenceService.activities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal memuat daftar aktivitas fisik." });
  }
}

export function calculateBurn(req, res) {
  try {
    const { met, weightKg, durationMinutes } = req.body;

    const m = parseFloat(met) || 3.5;
    const w = parseFloat(weightKg) || 70;
    const d = parseFloat(durationMinutes) || 30;

    // Formula: Calories = MET * 3.5 * weightKg / 200 * durationMinutes
    const caloriesBurned = Math.round(((m * 3.5 * w) / 200) * d);

    res.json({
      success: true,
      data: {
        met: m,
        weightKg: w,
        durationMinutes: d,
        caloriesBurned,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Gagal menghitung pembakaran kalori." });
  }
}
