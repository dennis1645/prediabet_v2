// Mock data representing PrediaBeat database & clinical outputs
export const initialUser = {
  id: 1,
  username: "Sahabat Sehat",
  email: "user@prediabeat.id",
  role: "user",
};

export const initialProfile = {
  nama: "Sahabat Sehat",
  usia: 45,
  jenis_kelamin: "Laki-laki",
  tinggi_badan: 170,
  berat_badan: 74,
  aktivitas: "ringan",
  gula_darah_puasa: 118,
  hba1c: 5.9,
  tekanan_darah_sistolik: 130,
  tekanan_darah_diastolik: 85,
  kolesterol_total: 210,
  asam_urat: 6.8,
  komorbiditas: "Hipertensi Derajat 1",
  pantangan_alergi: "Kacang Tanah & Olahannya",
  penyakit_lain_obat: "Metformin 500mg bila perlu",
  active_diet: "mediterania",
  active_diet_label: "Diet Mediterania",
};

export const initialAnalysis = {
  kategori_risiko: "Prediabetes (Impaired Fasting Glucose / IFG)",
  skor_risiko: 68,
  status_bmi: "Kelebihan Berat Badan (Overweight)",
  bmi: 25.6,
  target_kalori: 1850,
  tdee: 2150,
  target_karbo: 231, // g
  target_protein: 92, // g
  target_lemak: 62, // g
  active_diet: "mediterania",
  active_diet_label: "Diet Mediterania",
  frekuensi_makan: "3x makan utama + 2x selingan",
  catatan_pola_makan: [
    "Konsumsi sayur atau serat larut terlebih dahulu sebelum karbohidrat untuk memperlambat penyerapan glukosa.",
    "Jaga jeda makan teratur 3–4 jam agar pelepasan insulin alami tubuh tetap stabil.",
    "Hindari minuman manis kemasan saat jeda antar jam makan.",
  ],
  health_score: {
    score: 82,
    status: "Kondisi Stabil & Baik",
    metrics: {
      days_logged: 5,
      avg_adherence: 86,
      total_exercise_minutes: 120,
    },
    breakdown: {
      food_quality: 8.5,
    },
  },
  weekly_insight: {
    message: "Pola makan 3J Anda sangat konsisten minggu ini! Pertahankan variasi sayuran tinggi serat untuk mempertahankan kestabilan glukosa darah.",
    priorities: [
      "Tingkatkan jalan santai 15–20 menit pasca makan malam untuk mengoptimalkan sensitivitas insulin.",
    ],
  },
  meal_plan: [
    {
      waktu: "Sarapan Pagi",
      jam: "07:00",
      target_kalori_slot: 400,
      total_kalori_slot: 400,
      items: [
        { nama: "Bubur Oatmeal Ayam Suwir", kalori: 320, porsi: "1 mangkok", gi: "Rendah (48)", kategori: "Karbo", karbo: 42, protein: 22, lemak: 6, gambar: "https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=500&auto=format&fit=crop&q=80" },
        { nama: "Telur Rebus", kalori: 78, porsi: "1 butir", gi: "Rendah (0)", kategori: "Lauk", karbo: 0.6, protein: 6.3, lemak: 5.3, gambar: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&auto=format&fit=crop&q=80" },
        { nama: "Teh Hijau Tawar", kalori: 2, porsi: "1 cangkir", gi: "Rendah (0)", kategori: "Minuman", karbo: 0, protein: 0.2, lemak: 0, gambar: "https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=500&auto=format&fit=crop&q=80" },
      ],
    },
    {
      waktu: "Selingan Pagi",
      jam: "10:00",
      target_kalori_slot: 100,
      total_kalori_slot: 65,
      items: [
        { nama: "Apel Malang Segar", kalori: 65, porsi: "1 buah sedang", gi: "Rendah (36)", kategori: "Buah", karbo: 15, protein: 0.3, lemak: 0.2, gambar: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&auto=format&fit=crop&q=80" },
      ],
    },
    {
      waktu: "Makan Siang",
      jam: "12:30",
      target_kalori_slot: 650,
      total_kalori_slot: 570,
      items: [
        { nama: "Nasi Beras Merah", kalori: 215, porsi: "1 centong (150g)", gi: "Sedang (55)", kategori: "Karbo", karbo: 45, protein: 4.5, lemak: 1.6, gambar: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80" },
        { nama: "Pepes Ikan Mas Kemangi", kalori: 180, porsi: "1 ekor sedang", gi: "Rendah (0)", kategori: "Lauk", karbo: 2, protein: 26, lemak: 7.5, gambar: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80" },
        { nama: "Sayur Bening Bayam & Jagung", kalori: 85, porsi: "1 mangkuk kecil", gi: "Rendah (35)", kategori: "Sayur", karbo: 14, protein: 3.5, lemak: 0.8, gambar: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80" },
        { nama: "Tempe Kukus Bumbu Kuning", kalori: 90, porsi: "2 potong sedang", gi: "Rendah (20)", kategori: "Lauk", karbo: 6, protein: 9, lemak: 4, gambar: "https://images.unsplash.com/photo-1628294895950-9805252327bc?w=500&auto=format&fit=crop&q=80" },
      ],
    },
    {
      waktu: "Selingan Sore",
      jam: "16:00",
      target_kalori_slot: 100,
      total_kalori_slot: 70,
      items: [
        { nama: "Pepaya Potong Jeruk Nipis", kalori: 70, porsi: "1 piring kecil", gi: "Rendah (40)", kategori: "Buah", karbo: 16, protein: 0.8, lemak: 0.3, gambar: "https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=500&auto=format&fit=crop&q=80" },
      ],
    },
    {
      waktu: "Makan Malam",
      jam: "19:00",
      target_kalori_slot: 500,
      total_kalori_slot: 380,
      items: [
        { nama: "Sup Ayam Kampung Kaldu Bening", kalori: 210, porsi: "1 mangkok", gi: "Rendah (0)", kategori: "Lauk", karbo: 5, protein: 24, lemak: 9, gambar: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=500&auto=format&fit=crop&q=80" },
        { nama: "Tahu Sutra Kukus", kalori: 75, porsi: "1 potong besar", gi: "Rendah (15)", kategori: "Lauk", karbo: 2, protein: 8, lemak: 4, gambar: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80" },
        { nama: "Tumis Buncis & Wortel", kalori: 95, porsi: "1 porsi", gi: "Rendah (30)", kategori: "Sayur", karbo: 12, protein: 2.8, lemak: 3.5, gambar: "https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=500&auto=format&fit=crop&q=80" },
      ],
    },
  ],
};

export const sampleDiets = [
  {
    id: "mediterania",
    nama: "Diet Mediterania",
    kategori: "Pola Seimbang Klinis",
    ringkasan: "Kaya akan lemak sehat (minyak zaitun), ikan, sayuran berdaun hijau, dan biji-bijian utuh ramah resistensi insulin.",
    gambar: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
    supported: true,
    cocok_untuk: "Prediabetes, Hipertensi, dan Penurunan Kolesterol LDL",
    kelebihan: ["Memperbaiki sensitivitas insulin", "Kaya antioksidan polifenol", "Menjaga kesehatan jantung"],
  },
  {
    id: "rendah_karbo",
    nama: "Diet Rendah Karbohidrat (Low Carb)",
    kategori: "Kontrol Glikemik Intensif",
    ringkasan: "Membatasi karbohidrat olahan dan gula sederhana untuk menekan lonjakan glukosa darah post-prandial secara cepat.",
    gambar: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80",
    supported: true,
    cocok_untuk: "Gula Darah Puasa Tinggi & Obesitas Sentral",
    kelebihan: ["Menurunkan HbA1c lebih cepat", "Mengurangi nafsu makan berlebih", "Mengurangi perlemakan hati"],
  },
  {
    id: "dash",
    nama: "Diet DASH (Dietary Approaches to Stop Hypertension)",
    kategori: "Kardiovaskular & Ginjal",
    ringkasan: "Fokus pada pengurangan natrium maksimal 2.000 mg/hari, memperbanyak kalium, magnesium, dan serat sayuran.",
    gambar: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80",
    supported: true,
    cocok_untuk: "Komorbid Hipertensi & Gagal Ginjal Ringan",
    kelebihan: ["Menstabilkan tekanan darah", "Rendah garam & pengawet", "Kaya mineral penting"],
  },
  {
    id: "intermittent_fasting",
    nama: "Intermittent Fasting (16/8)",
    kategori: "Protokol Jendela Makan",
    ringkasan: "Mengatur waktu makan dalam jendela 8 jam dan puasa kalori selama 16 jam guna memicu autofagi seluler dan efisiensi insulin.",
    gambar: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80",
    supported: true,
    cocok_untuk: "Memperbaiki metabolisme basal",
    kelebihan: ["Memicu sensitivitas hormon insulin", "Mudah dikombinasikan dengan diet lain"],
  },
];

export const sampleFoods = [
  { id: 1, nama: "Beras Merah Pulen", kategori: "Karbohidrat Kompleks", kalori: 145, karbo: 31, protein: 3.2, lemak: 1.1, gula: 0.5, natrium: 5, gi: 55, is_recommended: true, alasan: "Kaya serat larut penstabil glukosa darah" },
  { id: 2, nama: "Ikan Kembung Bakar Kunyit", kategori: "Lauk Pauk & Protein", kalori: 165, karbo: 1.2, protein: 21.4, lemak: 7.8, gula: 0, natrium: 75, gi: 0, is_recommended: true, alasan: "Kaya Omega-3 dan protein murni tanpa gula" },
  { id: 3, nama: "Tempe Mendoan Goreng Tepung", kategori: "Gorengan / Olahan", kalori: 240, karbo: 18.5, protein: 8.5, lemak: 16.2, gula: 1.2, natrium: 340, gi: 65, is_recommended: false, alasan: "Tinggi lemak jenuh minyak goreng & tepung terigu rafinasi" },
  { id: 4, nama: "Sayur Bening Bayam Oyong", kategori: "Sayuran Hijau", kalori: 45, karbo: 7.2, protein: 2.8, lemak: 0.4, gula: 2.1, natrium: 120, gi: 25, is_recommended: true, alasan: "Sangat tinggi serat inulin dan magnesium relaksasi pembuluh" },
  { id: 5, nama: "Minuman Teh Manis Kemasan Botol", kategori: "Minuman Manis", kalori: 150, karbo: 38, protein: 0, lemak: 0, gula: 36, natrium: 45, gi: 78, is_recommended: false, alasan: "Tinggi gula cair fruktosa pemicu lonjakan gula darah ekstrem" },
  { id: 6, nama: "Tahu Kukus Isi Jamur Tiram", kategori: "Lauk Pauk & Protein", kalori: 95, karbo: 4.5, protein: 10.2, lemak: 3.8, gula: 0.8, natrium: 65, gi: 15, is_recommended: true, alasan: "Protein nabati ramah asam urat dan rendah kalori" },
  { id: 7, nama: "Buah Alpukat Mentega", kategori: "Buah & Lemak Sehat", kalori: 160, karbo: 8.5, protein: 2.0, lemak: 14.7, gula: 0.7, natrium: 7, gi: 15, is_recommended: true, alasan: "Lemak tak jenuh tunggal yang melindungi kardiovaskular" },
];
