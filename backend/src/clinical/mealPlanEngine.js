import referenceService from "../services/referenceService.js";

const DEFAULT_MEAL_POOL = {
  sarapan: [
    { nama: "Bubur Oatmeal Ayam Suwir", kalori: 320, porsi: "1 mangkok (200g)", gi: "Rendah (48)", kategori: "Karbo", karbo: 42, protein: 22, lemak: 6, gambar: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=500&auto=format&fit=crop&q=80" },
    { nama: "Telur Rebus Setengah Matang", kalori: 78, porsi: "1 butir", gi: "Rendah (0)", kategori: "Lauk", karbo: 0.6, protein: 6.3, lemak: 5.3, gambar: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80" },
    { nama: "Roti Gandum Utuh Panggang", kalori: 140, porsi: "2 lembar", gi: "Rendah (50)", kategori: "Karbo", karbo: 24, protein: 6, lemak: 2, gambar: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80" },
    { nama: "Omelet Bayam Jamur Minyak Zaitun", kalori: 165, porsi: "1 porsi", gi: "Rendah (10)", kategori: "Lauk", karbo: 3, protein: 14, lemak: 11, gambar: "https://images.unsplash.com/photo-1510693206972-df098062cb71?w=500&auto=format&fit=crop&q=80" },
  ],
  selingan_pagi: [
    { nama: "Apel Malang Segar", kalori: 65, porsi: "1 buah sedang", gi: "Rendah (36)", kategori: "Buah", karbo: 15, protein: 0.3, lemak: 0.2, gambar: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80" },
    { nama: "Pir Hijau Potong", kalori: 75, porsi: "1 buah sedang", gi: "Rendah (38)", kategori: "Buah", karbo: 18, protein: 0.5, lemak: 0.2, gambar: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80" },
    { nama: "Kacang Almond Panggang Tawar", kalori: 95, porsi: "12 butir (15g)", gi: "Rendah (15)", kategori: "Snack", karbo: 3, protein: 3.5, lemak: 8, gambar: "https://images.unsplash.com/photo-1508061252966-ef1fe9f590db?w=500&auto=format&fit=crop&q=80" },
  ],
  makan_siang: [
    { nama: "Nasi Beras Merah Pulen", kalori: 215, porsi: "1 centong (150g)", gi: "Sedang (55)", kategori: "Karbo", karbo: 45, protein: 4.5, lemak: 1.6, gambar: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80" },
    { nama: "Pepes Ikan Mas Bumbu Kuning", kalori: 180, porsi: "1 ekor sedang", gi: "Rendah (0)", kategori: "Lauk", karbo: 2, protein: 26, lemak: 7.5, gambar: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80" },
    { nama: "Dada Ayam Bakar Bumbu Rujak", kalori: 210, porsi: "1 potong (120g)", gi: "Rendah (0)", kategori: "Lauk", karbo: 3, protein: 31, lemak: 8, gambar: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500&auto=format&fit=crop&q=80" },
    { nama: "Sayur Bening Bayam Oyong Jagung", kalori: 85, porsi: "1 mangkuk kecil", gi: "Rendah (35)", kategori: "Sayur", karbo: 14, protein: 3.5, lemak: 0.8, gambar: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80" },
    { nama: "Tempe Bacem Kukus Tanpa Minyak", kalori: 95, porsi: "2 potong sedang", gi: "Rendah (20)", kategori: "Lauk", karbo: 6, protein: 9, lemak: 4, gambar: "https://images.unsplash.com/photo-1628294895950-9805252327bc?w=500&auto=format&fit=crop&q=80" },
  ],
  selingan_sore: [
    { nama: "Pepaya Potong Jeruk Nipis", kalori: 70, porsi: "1 piring kecil", gi: "Rendah (40)", kategori: "Buah", karbo: 16, protein: 0.8, lemak: 0.3, gambar: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500&auto=format&fit=crop&q=80" },
    { nama: "Alpukat Kocok Tawar Madu Sedikit", kalori: 110, porsi: "1/2 buah", gi: "Rendah (15)", kategori: "Buah", karbo: 6, protein: 1.5, lemak: 9, gambar: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=500&auto=format&fit=crop&q=80" },
  ],
  makan_malam: [
    { nama: "Sup Ayam Kampung Kaldu Bening", kalori: 210, porsi: "1 mangkok", gi: "Rendah (0)", kategori: "Lauk", karbo: 5, protein: 24, lemak: 9, gambar: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80" },
    { nama: "Tahu Sutra Kukus Tabur Daun Bawang", kalori: 75, porsi: "1 potong besar", gi: "Rendah (15)", kategori: "Lauk", karbo: 2, protein: 8, lemak: 4, gambar: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80" },
    { nama: "Tumis Buncis & Wortel Minyak Jagung", kalori: 95, porsi: "1 porsi", gi: "Rendah (30)", kategori: "Sayur", karbo: 12, protein: 2.8, lemak: 3.5, gambar: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=500&auto=format&fit=crop&q=80" },
    { nama: "Ikan Kembung Panggang Sambal Matah", kalori: 195, porsi: "1 ekor", gi: "Rendah (0)", kategori: "Lauk", karbo: 1, protein: 24, lemak: 10, gambar: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=80" },
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
