import referenceService from "../services/referenceService.js";

const DEFAULT_MEAL_POOL = {
  sarapan: [
    { nama: "Bubur Oatmeal Ayam Suwir", kalori: 320, porsi: "1 mangkok (200g)", gi: "Rendah (48)", kategori: "Karbo", karbo: 42, protein: 22, lemak: 6, gambar: "/food-images/bubur-oatmeal.jpg" },
    { nama: "Telur Rebus Setengah Matang", kalori: 78, porsi: "1 butir", gi: "Rendah (0)", kategori: "Lauk", karbo: 0.6, protein: 6.3, lemak: 5.3, gambar: "/food-images/telur-rebus.jpg" },
    { nama: "Roti Gandum Utuh Panggang", kalori: 140, porsi: "2 lembar", gi: "Rendah (50)", kategori: "Karbo", karbo: 24, protein: 6, lemak: 2, gambar: "/food-images/roti-gandum.jpg" },
    { nama: "Omelet Bayam Jamur Minyak Zaitun", kalori: 165, porsi: "1 porsi", gi: "Rendah (10)", kategori: "Lauk", karbo: 3, protein: 14, lemak: 11, gambar: "/food-images/omelet.jpg" },
    { nama: "Ubi Rebus Gurih", kalori: 130, porsi: "1 buah sedang", gi: "Sedang (54)", kategori: "Karbo", karbo: 30, protein: 2, lemak: 0.5, gambar: "/food-images/ubi-rebus.jpg" },
  ],
  selingan_pagi: [
    { nama: "Apel Malang Segar", kalori: 65, porsi: "1 buah sedang", gi: "Rendah (36)", kategori: "Buah", karbo: 15, protein: 0.3, lemak: 0.2, gambar: "/food-images/buah-apel.jpg" },
    { nama: "Pir Hijau Potong", kalori: 75, porsi: "1 buah sedang", gi: "Rendah (38)", kategori: "Buah", karbo: 18, protein: 0.5, lemak: 0.2, gambar: "/food-images/buah-pir.jpg" },
    { nama: "Kacang Almond Panggang Tawar", kalori: 95, porsi: "12 butir (15g)", gi: "Rendah (15)", kategori: "Snack", karbo: 3, protein: 3.5, lemak: 8, gambar: "/food-images/almond.jpg" },
    { nama: "Pisang Kepok Kukus", kalori: 90, porsi: "1 buah sedang", gi: "Rendah (45)", kategori: "Buah", karbo: 22, protein: 1.1, lemak: 0.3, gambar: "/food-images/pisang.jpg" },
  ],
  makan_siang: [
    { nama: "Nasi Beras Merah Pulen", kalori: 215, porsi: "1 centong (150g)", gi: "Sedang (55)", kategori: "Karbo", karbo: 45, protein: 4.5, lemak: 1.6, gambar: "/food-images/nasi-merah.jpg" },
    { nama: "Pepes Ikan Mas Bumbu Kuning", kalori: 180, porsi: "1 ekor sedang", gi: "Rendah (0)", kategori: "Lauk", karbo: 2, protein: 26, lemak: 7.5, gambar: "/food-images/pepes-ikan.jpg" },
    { nama: "Dada Ayam Bakar Bumbu Rujak", kalori: 210, porsi: "1 potong (120g)", gi: "Rendah (0)", kategori: "Lauk", karbo: 3, protein: 31, lemak: 8, gambar: "/food-images/dada-ayam.jpg" },
    { nama: "Ayam Goreng Lengkuas Tanpa Kulit", kalori: 235, porsi: "1 potong dada", gi: "Rendah (0)", kategori: "Lauk", karbo: 2, protein: 28, lemak: 12, gambar: "/food-images/ayam-goreng.jpg" },
    { nama: "Sayur Bening Bayam Oyong Jagung", kalori: 85, porsi: "1 mangkuk kecil", gi: "Rendah (35)", kategori: "Sayur", karbo: 14, protein: 3.5, lemak: 0.8, gambar: "/food-images/sayur-bening.jpg" },
    { nama: "Tempe Bacem Kukus Tanpa Minyak", kalori: 95, porsi: "2 potong sedang", gi: "Rendah (20)", kategori: "Lauk", karbo: 6, protein: 9, lemak: 4, gambar: "/food-images/tempe.jpg" },
    { nama: "Gado-Gado Sayur Saus Sedang", kalori: 190, porsi: "1 porsi", gi: "Rendah (40)", kategori: "Sayur", karbo: 16, protein: 8, lemak: 9, gambar: "/food-images/gado-gado.jpg" },
    { nama: "Capcay Kuah Bening Ayam", kalori: 140, porsi: "1 mangkok", gi: "Rendah (32)", kategori: "Sayur", karbo: 10, protein: 12, lemak: 4, gambar: "/food-images/capcay.jpg" },
  ],
  selingan_sore: [
    { nama: "Pepaya Potong Jeruk Nipis", kalori: 70, porsi: "1 piring kecil", gi: "Rendah (40)", kategori: "Buah", karbo: 16, protein: 0.8, lemak: 0.3, gambar: "/food-images/buah-pepaya.jpg" },
    { nama: "Alpukat Kocok Tawar Madu Sedikit", kalori: 110, porsi: "1/2 buah", gi: "Rendah (15)", kategori: "Buah", karbo: 6, protein: 1.5, lemak: 9, gambar: "/food-images/alpukat.jpg" },
    { nama: "Jagung Manis Rebus", kalori: 95, porsi: "1/2 tongkol", gi: "Sedang (52)", kategori: "Snack", karbo: 20, protein: 3.2, lemak: 1.2, gambar: "/food-images/jagung-rebus.jpg" },
  ],
  makan_malam: [
    { nama: "Sup Ayam Kampung Kaldu Bening", kalori: 210, porsi: "1 mangkok", gi: "Rendah (0)", kategori: "Lauk", karbo: 5, protein: 24, lemak: 9, gambar: "/food-images/sop-ayam.jpg" },
    { nama: "Soto Ayam Bening Tanpa Santan", kalori: 220, porsi: "1 mangkok", gi: "Rendah (30)", kategori: "Lauk", karbo: 8, protein: 25, lemak: 8, gambar: "/food-images/soto-ayam.jpg" },
    { nama: "Tahu Sutra Kukus Tabur Daun Bawang", kalori: 75, porsi: "1 potong besar", gi: "Rendah (15)", kategori: "Lauk", karbo: 2, protein: 8, lemak: 4, gambar: "/food-images/tahu.jpg" },
    { nama: "Tumis Buncis & Wortel Minyak Jagung", kalori: 95, porsi: "1 porsi", gi: "Rendah (30)", kategori: "Sayur", karbo: 12, protein: 2.8, lemak: 3.5, gambar: "/food-images/buncis-wortel.jpg" },
    { nama: "Ikan Kembung Panggang Sambal Matah", kalori: 195, porsi: "1 ekor", gi: "Rendah (0)", kategori: "Lauk", karbo: 1, protein: 24, lemak: 10, gambar: "/food-images/ikan-kembung.jpg" },
    { nama: "Kentang Rebus Bumbu Oregano", kalori: 120, porsi: "1 buah sedang", gi: "Sedang (56)", kategori: "Karbo", karbo: 26, protein: 2.5, lemak: 0.2, gambar: "/food-images/kentang-rebus.jpg" },
  ],
};

export function generateDailyMealPlan(targetKalori = 1850, allergies = [], activeDiet = "mediterania") {
  const isAllergic = (name) => {
    const lower = name.toLowerCase();
    for (const a of allergies) {
      if (lower.includes(a.toLowerCase())) return true;
    }
    return false;
  };

  const pickRandom = (arr, count) => {
    const filtered = arr.filter((item) => !isAllergic(item.nama));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  };

  const slots = [
    {
      waktu: "Sarapan Pagi",
      jam: "07:00",
      target_kalori_slot: Math.round(targetKalori * 0.22),
      items: pickRandom(DEFAULT_MEAL_POOL.sarapan, 2),
    },
    {
      waktu: "Selingan Pagi",
      jam: "10:00",
      target_kalori_slot: Math.round(targetKalori * 0.08),
      items: pickRandom(DEFAULT_MEAL_POOL.selingan_pagi, 1),
    },
    {
      waktu: "Makan Siang",
      jam: "12:30",
      target_kalori_slot: Math.round(targetKalori * 0.35),
      items: pickRandom(DEFAULT_MEAL_POOL.makan_siang, 3),
    },
    {
      waktu: "Selingan Sore",
      jam: "16:00",
      target_kalori_slot: Math.round(targetKalori * 0.08),
      items: pickRandom(DEFAULT_MEAL_POOL.selingan_sore, 1),
    },
    {
      waktu: "Makan Malam",
      jam: "19:00",
      target_kalori_slot: Math.round(targetKalori * 0.27),
      items: pickRandom(DEFAULT_MEAL_POOL.makan_malam, 3),
    },
  ];

  // Recalculate total calories per slot
  for (const slot of slots) {
    slot.total_kalori_slot = slot.items.reduce((acc, curr) => acc + (curr.kalori || 0), 0);
  }

  return slots;
}
