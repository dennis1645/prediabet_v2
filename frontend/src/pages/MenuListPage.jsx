import React, { useState, useEffect } from "react";
import { sampleFoods } from "../services/mockData";
import api from "../services/api";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Filter,
  Utensils,
  Sparkles,
  Loader2,
} from "lucide-react";

export default function MenuListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [filterRecommended, setFilterRecommended] = useState("all"); // 'all', 'recommended', 'limited'
  const [foods, setFoods] = useState(sampleFoods);
  const [loading, setLoading] = useState(false);

  const categories = [
    "Semua",
    "Karbohidrat",
    "Lauk Pauk",
    "Sayuran",
    "Buah",
    "Minuman",
  ];

  // Fetch foods from backend API with debounce
  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = {};
        if (searchTerm.trim()) params.q = searchTerm.trim();
        if (selectedCategory !== "Semua") params.kategori = selectedCategory;

        const res = await api.getFoods(params);
        if (!isCancelled && res.success && res.data && res.data.length > 0) {
          // Normalize backend items to match component format
          const mapped = res.data.map((item) => ({
            id: item.id,
            nama: item.nama,
            kategori: item.kelompok || "Bahan Makanan",
            kalori: item.kalori || 0,
            karbo: item.karbo || 0,
            protein: item.protein || 0,
            lemak: item.lemak || 0,
            gula: item.gula || 0,
            natrium: item.natrium || 0,
            gi: item.gi ?? 35,
            is_recommended: (item.gi ?? 35) <= 55 && !item.flags?.gorengan,
            alasan: (item.gi ?? 35) <= 55
              ? "Indeks glikemik bersahabat untuk kestabilan respon insulin"
              : "Indeks glikemik tinggi atau olahan tepung/minyak tinggi",
          }));
          setFoods(mapped);
        } else if (!isCancelled && (!searchTerm && selectedCategory === "Semua")) {
          setFoods(sampleFoods);
        }
      } catch (err) {
        console.warn("Backend foods search fallback:", err.message);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, selectedCategory]);

  const filteredFoods = foods.filter((food) => {
    const matchesCategory =
      selectedCategory === "Semua" ||
      food.kategori.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesRecommendation =
      filterRecommended === "all"
        ? true
        : filterRecommended === "recommended"
        ? food.is_recommended
        : !food.is_recommended;

    return matchesCategory && matchesRecommendation;
  });

  return (
    <div className="relative min-h-screen py-10">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 -left-24 w-96 h-96 rounded-full bg-emerald-200/50 blur-3xl animate-pulse"></div>
        <div className="absolute top-72 -right-28 w-96 h-96 rounded-full bg-cyan-200/40 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative overflow-hidden rounded-[2.25rem] bg-white/80 backdrop-blur-2xl border border-white shadow-xl shadow-slate-900/5 p-6 md:p-10 mb-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-4">
              <Utensils className="w-3.5 h-3.5" />
              Database Nutrisi Makanan Nusantara
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Daftar Menu &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-600">
                Detail Nutrisi
              </span>
            </h1>
            <p className="text-slate-500 mt-3 leading-relaxed text-sm md:text-base">
              Cari makanan harian, periksa kalori, kadar gula sederhana, dan indeks glikemik untuk memastikan asupan Anda ramah prediabetes.
            </p>
          </div>

          {/* Search Bar & Filters */}
          <div className="mt-8 flex flex-col md:flex-row gap-4 items-center">
            <div className="relative w-full md:flex-grow">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari makanan (misal: beras merah, tempe, alpukat, ayam)..."
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800 transition"
              />
              {loading && (
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>

            {/* Rekomendasi Filter Tabs */}
            <div className="flex gap-2 w-full md:w-auto">
              <button
                onClick={() => setFilterRecommended("all")}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterRecommended === "all"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterRecommended("recommended")}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterRecommended === "recommended"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Direkomendasikan
              </button>
              <button
                onClick={() => setFilterRecommended("limited")}
                className={`px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  filterRecommended === "limited"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Perlu Dibatasi
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 mt-4 pt-4 border-t border-slate-100">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* FOOD CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFoods.map((food) => (
            <div
              key={food.id}
              className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      {food.kategori}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5 leading-snug">
                      {food.nama}
                    </h3>
                  </div>
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl shrink-0">
                    {food.kalori} kkal
                  </span>
                </div>

                {/* Badge Rekomendasi Medis */}
                <div className="mb-4">
                  {food.is_recommended ? (
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aman & Direkomendasikan
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Perlu Dibatasi
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed italic">
                    "{food.alasan}"
                  </p>
                </div>

                {/* Nutrisi Rinci */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50/80 rounded-2xl p-3 border border-slate-100/80 mb-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Karbo</p>
                    <p className="text-xs font-black text-slate-700">{food.karbo} g</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Protein</p>
                    <p className="text-xs font-black text-slate-700">{food.protein} g</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Lemak</p>
                    <p className="text-xs font-black text-slate-700">{food.lemak} g</p>
                  </div>
                </div>
              </div>

              {/* Indikator Glikemik & Gula */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
                <span>Gula: <strong className="text-slate-800">{food.gula} g</strong></span>
                <span>GI: <strong className="text-emerald-700 font-extrabold">{food.gi}</strong></span>
              </div>
            </div>
          ))}
        </div>

        {filteredFoods.length === 0 && (
          <div className="text-center py-16 bg-white/70 backdrop-blur-xl border border-white rounded-3xl p-8">
            <Utensils className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Makanan Tidak Ditemukan</h3>
            <p className="text-sm text-slate-400 mt-1">
              Coba kata kunci lain atau pilih kategori "Semua".
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
