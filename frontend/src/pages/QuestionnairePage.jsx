import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  User,
  Heart,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  X,
  Check,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert } from "../utils/alerts";

// Preset opsi pantangan makanan ramah prediabetes
const PRESET_PANTANGAN = [
  { label: "Tidak Ada", value: "Tidak Ada", icon: "✨" },
  { label: "Seafood & Udang", value: "Seafood", icon: "🦐" },
  { label: "Kacang-kacangan", value: "Kacang", icon: "🥜" },
  { label: "Susu & Laktosa", value: "Susu", icon: "🥛" },
  { label: "Telur Ayam / Bebek", value: "Telur", icon: "🥚" },
  { label: "Daging Sapi", value: "Daging Sapi", icon: "🥩" },
  { label: "Daging Babi", value: "Daging Babi", icon: "🥓" },
  { label: "Santan Kelapa", value: "Santan", icon: "🥥" },
  { label: "Gluten / Tepung Terigu", value: "Gluten", icon: "🌾" },
  { label: "Gorengan Minyak Jelantah", value: "Gorengan", icon: "🍟" },
];

// Preset opsi riwayat komorbiditas / penyakit penyerta
const PRESET_KOMORBID = [
  { label: "Tidak Ada", value: "Tidak Ada", icon: "✨" },
  { label: "Hipertensi / Tekanan Darah Tinggi", value: "Hipertensi", icon: "🩺" },
  { label: "Kolesterol Tinggi / Dislipidemia", value: "Kolesterol", icon: "🧪" },
  { label: "Asam Urat / Gout", value: "Asam Urat", icon: "🦶" },
  { label: "PCOS (Sindrom Polikistik Ovarium)", value: "PCOS", icon: "🔬" },
  { label: "Riwayat Diabetes Gestasional", value: "Gestasional", icon: "🤰" },
  { label: "Penyakit Jantung / Kardiovaskular", value: "Jantung", icon: "❤️" },
  { label: "Asma / Gangguan Pernapasan", value: "Asma", icon: "🫁" },
  { label: "Perlemakan Hati (Fatty Liver)", value: "Fatty Liver", icon: "🛡️" },
];

export default function QuestionnairePage() {
  const { profile, updateProfileAndAnalysis } = useAuth();
  const navigate = useNavigate();

  // Helper parsing array or string
  const parseList = (val, defaultVal = []) => {
    if (!val) return defaultVal;
    if (Array.isArray(val)) return val;
    return String(val)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const [formData, setFormData] = useState({
    usia: profile?.usia ?? "",
    jenis_kelamin: profile?.jenis_kelamin || "Laki-laki",
    tinggi_badan: profile?.tinggi_badan ?? "",
    berat_badan: profile?.berat_badan ?? "",
    lingkar_pinggang: profile?.lingkar_pinggang ?? "",
    aktivitas: profile?.aktivitas || "ringan",
    gula_darah_puasa: profile?.gula_darah_puasa ?? "",
    hba1c: profile?.hba1c ?? "",
    tekanan_darah_sistolik: profile?.tekanan_darah_sistolik ?? "",
    tekanan_darah_diastolik: profile?.tekanan_darah_diastolik ?? "",
    kolesterol_total: profile?.kolesterol_total ?? "",
    asam_urat: profile?.asam_urat ?? "",
  });

  // State multi-selection (kosong untuk pendaftaran akun baru)
  const [selectedPantangan, setSelectedPantangan] = useState(() =>
    profile?.pantangan_alergi ? parseList(profile.pantangan_alergi, []) : []
  );
  const [selectedKomorbid, setSelectedKomorbid] = useState(() =>
    profile?.komorbiditas ? parseList(profile.komorbiditas, []) : []
  );

  // Sinkronkan form jika data profil pengguna sudah ada sebelumnya di server
  React.useEffect(() => {
    if (profile) {
      setFormData({
        usia: profile.usia ?? "",
        jenis_kelamin: profile.jenis_kelamin || "Laki-laki",
        tinggi_badan: profile.tinggi_badan ?? "",
        berat_badan: profile.berat_badan ?? "",
        lingkar_pinggang: profile.lingkar_pinggang ?? "",
        aktivitas: profile.aktivitas || "ringan",
        gula_darah_puasa: profile.gula_darah_puasa ?? "",
        hba1c: profile.hba1c ?? "",
        tekanan_darah_sistolik: profile.tekanan_darah_sistolik ?? "",
        tekanan_darah_diastolik: profile.tekanan_darah_diastolik ?? "",
        kolesterol_total: profile.kolesterol_total ?? "",
        asam_urat: profile.asam_urat ?? "",
      });
      if (profile.pantangan_alergi) {
        setSelectedPantangan(parseList(profile.pantangan_alergi, []));
      }
      if (profile.komorbiditas) {
        setSelectedKomorbid(parseList(profile.komorbiditas, []));
      }
    }
  }, [profile]);

  const [customPantangan, setCustomPantangan] = useState("");
  const [customKomorbid, setCustomKomorbid] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle pantangan
  const togglePantangan = (val) => {
    if (val === "Tidak Ada") {
      setSelectedPantangan(["Tidak Ada"]);
      return;
    }

    setSelectedPantangan((prev) => {
      const filtered = prev.filter((p) => p !== "Tidak Ada");
      if (filtered.includes(val)) {
        return filtered.filter((p) => p !== val);
      } else {
        return [...filtered, val];
      }
    });
  };

  const handleAddCustomPantangan = (e) => {
    if (e) e.preventDefault();
    const clean = customPantangan.trim();
    if (clean && !selectedPantangan.includes(clean)) {
      setSelectedPantangan((prev) => [...prev.filter((p) => p !== "Tidak Ada"), clean]);
      setCustomPantangan("");
    }
  };

  const removePantangan = (val) => {
    setSelectedPantangan((prev) => prev.filter((p) => p !== val));
  };

  // Toggle komorbiditas
  const toggleKomorbid = (val) => {
    if (val === "Tidak Ada") {
      setSelectedKomorbid(["Tidak Ada"]);
      return;
    }

    setSelectedKomorbid((prev) => {
      const filtered = prev.filter((k) => k !== "Tidak Ada");
      if (filtered.includes(val)) {
        return filtered.filter((k) => k !== val);
      } else {
        return [...filtered, val];
      }
    });
  };

  const handleAddCustomKomorbid = (e) => {
    if (e) e.preventDefault();
    const clean = customKomorbid.trim();
    if (clean && !selectedKomorbid.includes(clean)) {
      setSelectedKomorbid((prev) => [...prev.filter((k) => k !== "Tidak Ada"), clean]);
      setCustomKomorbid("");
    }
  };

  const removeKomorbid = (val) => {
    setSelectedKomorbid((prev) => prev.filter((k) => k !== val));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.usia || !formData.tinggi_badan || !formData.berat_badan) {
      showErrorAlert(
        "Data Belum Lengkap",
        "Mohon isi data Usia, Tinggi Badan, dan Berat Badan untuk menghitung profil metabolik Anda."
      );
      return;
    }

    setLoading(true);

    const payload = {
      ...formData,
      usia: parseInt(formData.usia, 10),
      tinggi_badan: parseFloat(formData.tinggi_badan),
      berat_badan: parseFloat(formData.berat_badan),
      lingkar_pinggang: formData.lingkar_pinggang ? parseFloat(formData.lingkar_pinggang) : null,
      gula_darah_puasa: formData.gula_darah_puasa ? parseFloat(formData.gula_darah_puasa) : "Belum ada tes lab",
      hba1c: formData.hba1c ? parseFloat(formData.hba1c) : "Belum ada tes lab",
      tekanan_darah_sistolik: formData.tekanan_darah_sistolik ? parseInt(formData.tekanan_darah_sistolik, 10) : null,
      tekanan_darah_diastolik: formData.tekanan_darah_diastolik ? parseInt(formData.tekanan_darah_diastolik, 10) : null,
      kolesterol_total: formData.kolesterol_total ? parseInt(formData.kolesterol_total, 10) : null,
      asam_urat: formData.asam_urat ? parseFloat(formData.asam_urat) : null,
      pantangan_alergi: selectedPantangan.filter((p) => p !== "Tidak Ada"),
      komorbiditas: selectedKomorbid.filter((k) => k !== "Tidak Ada"),
    };

    try {
      await updateProfileAndAnalysis(payload);
      setLoading(false);

      await showSuccessAlert(
        "Analisis Klinis Berhasil!",
        "Profil metabolik, data pantangan alergi ganda, dan target diet 3J Anda telah berhasil dihitung dan disimpan."
      );

      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      showErrorAlert("Gagal Menyimpan", err.message || "Gagal memproses kuesioner medis.");
    }
  };

  return (
    <div className="relative min-h-screen py-10 font-sans">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-20 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-teal-200/40 blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Skrining Klinis Nutrisi 3J</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Kuesioner Profil &amp; Parameter Medis
          </h1>
          <p className="text-slate-500 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Lengkapi data di bawah untuk menghitung skor risiko, kebutuhan kalori harian, serta meal plan yang dipersonalisasi.
          </p>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-6 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] space-y-10"
        >
          
          {/* ========================================================= */}
          {/* SECTION 1: PROFIL DASAR & FISIK                          */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">1. Profil Dasar &amp; Data Fisik</h2>
                <p className="text-xs text-slate-400">Digunakan untuk menghitung BMR, TDEE, dan Indeks Massa Tubuh (BMI)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Usia (Tahun)
                </label>
                <input
                  type="number"
                  name="usia"
                  required
                  min="15"
                  max="100"
                  placeholder="Cth: 28"
                  value={formData.usia}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Jenis Kelamin
                </label>
                <select
                  name="jenis_kelamin"
                  value={formData.jenis_kelamin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Tinggi Badan (cm)
                </label>
                <input
                  type="number"
                  name="tinggi_badan"
                  required
                  min="100"
                  max="230"
                  placeholder="Cth: 168"
                  value={formData.tinggi_badan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Berat Badan (kg)
                </label>
                <input
                  type="number"
                  name="berat_badan"
                  required
                  min="30"
                  max="200"
                  placeholder="Cth: 65.5"
                  value={formData.berat_badan}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Lingkar Pinggang (cm)
                </label>
                <input
                  type="number"
                  name="lingkar_pinggang"
                  min="40"
                  max="180"
                  value={formData.lingkar_pinggang}
                  onChange={handleChange}
                  placeholder="Misal: 88 (Batas aman: <90 pria, <80 wanita)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Aktivitas Fisik Sehari-hari
                </label>
                <select
                  name="aktivitas"
                  value={formData.aktivitas}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800 cursor-pointer"
                >
                  <option value="sedentary">Sangat Sedikit Gerak (Banyak duduk)</option>
                  <option value="ringan">Ringan (Olahraga ringan 1–3 hari/minggu)</option>
                  <option value="sedang">Sedang (Olahraga teratur 3–5 hari/minggu)</option>
                  <option value="berat">Sangat Aktif (Latihan berat / pekerja lapangan)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 2: PARAMETER LABORATORIUM & GLUKOSA               */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">2. Parameter Laboratorium &amp; Glukosa</h2>
                <p className="text-xs text-slate-400">Hasil tes medis darah terbaru (Kosongkan jika belum pernah tes lab)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Gula Darah Puasa (GDP - mg/dL)
                </label>
                <input
                  type="number"
                  name="gula_darah_puasa"
                  value={formData.gula_darah_puasa}
                  onChange={handleChange}
                  placeholder="Normal <100, Prediabetes 100-125, Diabetes ≥126"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Kadar HbA1c (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="hba1c"
                  value={formData.hba1c}
                  onChange={handleChange}
                  placeholder="Normal <5.7%, Prediabetes 5.7-6.4%, Diabetes ≥6.5%"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Tekanan Darah (Sistolik / Diastolik)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    name="tekanan_darah_sistolik"
                    value={formData.tekanan_darah_sistolik}
                    onChange={handleChange}
                    placeholder="Sistolik (120)"
                    className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                  <span className="text-slate-400 font-bold">/</span>
                  <input
                    type="number"
                    name="tekanan_darah_diastolik"
                    value={formData.tekanan_darah_diastolik}
                    onChange={handleChange}
                    placeholder="Diastolik (80)"
                    className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Asam Urat &amp; Kolesterol Total
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    name="asam_urat"
                    value={formData.asam_urat}
                    onChange={handleChange}
                    placeholder="Asam Urat (6.8)"
                    className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                  <input
                    type="number"
                    name="kolesterol_total"
                    value={formData.kolesterol_total}
                    onChange={handleChange}
                    placeholder="Kolesterol (210)"
                    className="w-1/2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SECTION 3: PANTANGAN MAKANAN (MULTI-SELECT + TAGS)        */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">3. Pantangan &amp; Alergi Makanan</h2>
                  <p className="text-xs text-slate-400">Pilih semua bahan makanan yang harus dieliminasi dari meal plan Anda (Bisa pilih lebih dari satu)</p>
                </div>
              </div>

              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {selectedPantangan.length} Terpilih
              </span>
            </div>

            {/* Grid Checkbox Chips Opsi Populer */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mb-4">
              {PRESET_PANTANGAN.map((item) => {
                const isSelected = selectedPantangan.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => togglePantangan(item.value)}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm shadow-emerald-500/25 ring-2 ring-emerald-400/40"
                        : "bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Tambah Pantangan Kustom Bebas */}
            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Punya alergi atau pantangan lain? Tambahkan di sini:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPantangan}
                  onChange={(e) => setCustomPantangan(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomPantangan(e)}
                  placeholder="Ketik pantangan lain (misal: Kerang, MSG, Kedelai)..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPantangan}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Tag List Pantangan yang Sedang Aktif */}
            {selectedPantangan.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedPantangan.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl"
                  >
                    <span>{p}</span>
                    <button
                      type="button"
                      onClick={() => removePantangan(p)}
                      className="text-emerald-500 hover:text-emerald-800 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* SECTION 4: RIWAYAT PENYAKIT & KOMORBIDITAS (MULTI-SELECT) */}
          {/* ========================================================= */}
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">4. Riwayat Penyakit Penyerta (Komorbiditas)</h2>
                  <p className="text-xs text-slate-400">Pilih semua kondisi kesehatan yang pernah atau sedang Anda alami (Bisa pilih lebih dari satu)</p>
                </div>
              </div>

              <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                {selectedKomorbid.length} Terpilih
              </span>
            </div>

            {/* Grid Checkbox Chips Opsi Populer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 mb-4">
              {PRESET_KOMORBID.map((item) => {
                const isSelected = selectedKomorbid.includes(item.value);
                return (
                  <button
                    type="button"
                    key={item.value}
                    onClick={() => toggleKomorbid(item.value)}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-extrabold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25 ring-2 ring-amber-400/40"
                        : "bg-slate-50/80 hover:bg-slate-100/80 text-slate-700 border-slate-200/80"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-sm">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-1 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Tambah Komorbid / Obat Kustom Bebas */}
            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Punya riwayat komorbiditas atau obat rutin lainnya?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKomorbid}
                  onChange={(e) => setCustomKomorbid(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomKomorbid(e)}
                  placeholder="Ketik penyakit atau nama obat (misal: Amlodipine 5mg, Asam Lambung)..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomKomorbid}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Tag List Komorbid yang Sedang Aktif */}
            {selectedKomorbid.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedKomorbid.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl"
                  >
                    <span>{k}</span>
                    <button
                      type="button"
                      onClick={() => removeKomorbid(k)}
                      className="text-amber-500 hover:text-amber-800 cursor-pointer p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* TOMBOL SUBMIT & ANALISIS 3J                               */}
          {/* ========================================================= */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-base shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Menghitung Skor Risiko &amp; Menyusun Meal Plan 3J...</span>
                </>
              ) : (
                <>
                  <span>Simpan &amp; Buat Rekomendasi Nutrisi 3J Sekarang</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
