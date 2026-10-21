/**
 * Kalkulator Kalori Olahraga Deterministik berbasis Standar Medis Internasional
 * Berdasarkan Compendium of Physical Activities (Ainsworth et al., CDC / ACSM).
 * Formula MET: Kalori (kkal) = MET * Berat Badan (kg) * (Durasi (menit) / 60)
 */

export const MET_ACTIVITIES = {
  // Jalan Kaki
  "jalan santai": { name: "Jalan Santai", met: 3.5, icon: "Footprints" },
  "jalan kaki": { name: "Jalan Kaki", met: 3.5, icon: "Footprints" },
  "jalan cepat": { name: "Jalan Cepat (Brisk Walk)", met: 4.8, icon: "Footprints" },
  "brisk walk": { name: "Jalan Cepat (Brisk Walk)", met: 4.8, icon: "Footprints" },
  "treadmill": { name: "Jalan di Treadmill", met: 4.5, icon: "Footprints" },

  // Lari / Jogging
  "jogging": { name: "Jogging Santai", met: 7.0, icon: "Activity" },
  "lari santai": { name: "Jogging Santai", met: 7.0, icon: "Activity" },
  "lari": { name: "Lari Sedang", met: 8.5, icon: "Activity" },
  "lari cepat": { name: "Lari Cepat", met: 10.5, icon: "Activity" },
  "sprint": { name: "Lari Cepat / Sprint", met: 11.5, icon: "Activity" },

  // Sepeda
  "sepeda": { name: "Bersepeda Santai", met: 6.0, icon: "Bike" },
  "bersepeda": { name: "Bersepeda Santai", met: 6.0, icon: "Bike" },
  "sepedaan": { name: "Bersepeda Santai", met: 6.0, icon: "Bike" },
  "sepeda statis": { name: "Sepeda Statis", met: 5.5, icon: "Bike" },

  // Renang
  "renang": { name: "Berenang", met: 6.0, icon: "Waves" },
  "berenang": { name: "Berenang", met: 6.0, icon: "Waves" },

  // Senam & Aerobik
  "senam": { name: "Senam Aerobik Ringan", met: 4.5, icon: "Heart" },
  "aerobik": { name: "Senam Aerobik Sedang", met: 5.5, icon: "Heart" },
  "zumba": { name: "Senam Zumba", met: 6.5, icon: "Heart" },
  "senam diabetes": { name: "Senam Diabetes / Kaki", met: 3.5, icon: "Heart" },

  // Olahraga Raket / Permainan
  "badminton": { name: "Bulu Tangkis (Badminton)", met: 6.0, icon: "Trophy" },
  "bulutangkis": { name: "Bulu Tangkis (Badminton)", met: 6.0, icon: "Trophy" },
  "tenis meja": { name: "Tenis Meja / Pingpong", met: 4.0, icon: "Trophy" },
  "futsal": { name: "Futsal / Sepak Bola", met: 8.0, icon: "Trophy" },
  "basket": { name: "Bola Basket", met: 7.5, icon: "Trophy" },

  // Latihan Kekuatan & Fleksibilitas
  "latihan beban": { name: "Latihan Beban / Otot", met: 4.0, icon: "Dumbbell" },
  "angkat beban": { name: "Latihan Beban / Otot", met: 4.0, icon: "Dumbbell" },
  "gym": { name: "Fitness / Gym", met: 4.5, icon: "Dumbbell" },
  "push up": { name: "Kalistenik (Push up, Sit up)", met: 4.5, icon: "Dumbbell" },
  "yoga": { name: "Yoga / Stretching", met: 2.8, icon: "Sparkles" },
  "stretching": { name: "Peregangan Otot", met: 2.5, icon: "Sparkles" },
};

/**
 * Mendeteksi aktivitas olahraga dari teks percakapan dan menghitung kalori terbakar
 * @param {string} text Teks laporan pengguna
 * @param {number} userWeight Berat badan pengguna (kg)
 * @returns {object|null}
 */
export function detectAndCalculateExercise(text, userWeight = 68) {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();

  // Ekstrak durasi menit (misal: "30 menit", "1 jam", "45 mnt", "15menit")
  let durationMinutes = null;
  const hourMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jam|hours?)/);
  if (hourMatch) {
    durationMinutes = Math.round(parseFloat(hourMatch[1].replace(",", ".")) * 60);
  } else {
    const minMatch = lower.match(/(\d+)\s*(?:menit|mnt|mins?)/);
    if (minMatch) {
      durationMinutes = parseInt(minMatch[1], 10);
    }
  }

  // Jika durasi tidak disebutkan eksplisit tetapi ada laporan olahraga, gunakan default klinis 30 menit
  if (!durationMinutes) {
    const isExerciseStatement = [
      "tadi lari", "habis lari", "sudah lari", "tadi jalan", "habis jalan", "jalan kaki",
      "olahraga tadi", "bersepeda tadi", "sepedaan tadi", "renang tadi", "senam tadi"
    ].some(k => lower.includes(k));
    if (isExerciseStatement) {
      durationMinutes = 30;
    } else {
      return null;
    }
  }

  // Batasi durasi realistis 5 - 360 menit
  durationMinutes = Math.min(Math.max(durationMinutes, 5), 360);

  // Cari aktivitas yang cocok
  let matchedActivity = null;
  for (const [key, data] of Object.entries(MET_ACTIVITIES)) {
    if (lower.includes(key)) {
      matchedActivity = data;
      break;
    }
  }

  // Fallback ke "Aktivitas Fisik Aerobik Sedang" jika kata kunci olahraga umum ada
  if (!matchedActivity) {
    if (lower.includes("olahraga") || lower.includes("workout") || lower.includes("keringetan")) {
      matchedActivity = { name: "Latihan Aerobik Sedang", met: 5.0, icon: "Activity" };
    } else {
      return null;
    }
  }

  // Berat badan valid (fallback 68 kg jika null/0)
  const weight = (userWeight && userWeight > 30 && userWeight < 250) ? userWeight : 68;

  // Rumus MET Ilmiah: kkal = MET * kg * (menit / 60)
  const burnedCalories = Math.round(matchedActivity.met * weight * (durationMinutes / 60));

  return {
    activity_name: matchedActivity.name,
    duration_minutes: durationMinutes,
    activity_calories: burnedCalories,
    met: matchedActivity.met,
    weight_used: weight,
    clinical_note: `Latihan ${matchedActivity.name} selama ${durationMinutes} menit efektif membakar ~${burnedCalories} kkal dan merangsang translokasi transporter GLUT-4 untuk menyerap glukosa darah ke dalam otot tanpa bergantung berlebih pada insulin.`
  };
}
