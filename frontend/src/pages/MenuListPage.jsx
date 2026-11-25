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
    "Lauk Hewani",
    "Lauk Nabati",
    "Sayur",
    "Buah",
    "Snack",
    "Minuman",
    "Dairy",
    "Biji/Kacang",
    "Dessert",
    "Bumbu & Pelengkap",
  ];

  const resolveMenuImage = (nama = "", kategori = "") => {
    const n = nama.toLowerCase();
    const k = kategori.toLowerCase();
    if (n.includes("oatmeal") || n.includes("oat")) return "/food-images/oatmeal.jpg";
    if (n.includes("nasi merah")) return "/food-images/nasi-merah.jpg";
    if (n.includes("nasi goreng")) return "/food-images/nasi-goreng.jpg";
    if (n.includes("nasi")) return "/food-images/nasi-putih.jpg";
    if (n.includes("roti")) return "/food-images/roti-gandum.jpg";
    if (n.includes("kentang")) return "/food-images/kentang-rebus.jpg";
    if (n.includes("ubi")) return "/food-images/ubi-rebus.jpg";
    if (n.includes("jagung")) return "/food-images/jagung-rebus.jpg";
    if (n.includes("mie")) return "/food-images/mie-ayam.jpg";
    if (n.includes("soto")) return "/food-images/soto-ayam.jpg";
    if (n.includes("sop") || n.includes("sup")) return "/food-images/sop-ayam.jpg";
    if (n.includes("rawon")) return "/food-images/rawon.jpg";
    if (n.includes("gudeg")) return "/food-images/gudeg.jpg";
    if (n.includes("taliwang")) return "/food-images/ayam-taliwang.jpg";
    if (n.includes("dada ayam")) return "/food-images/dada-ayam.jpg";
    if (n.includes("ayam")) return "/food-images/ayam-goreng.jpg";
    if (n.includes("kembung")) return "/food-images/ikan-kembung.jpg";
    if (n.includes("pepes")) return "/food-images/pepes-ikan.jpg";
    if (n.includes("ikan") || n.includes("patin") || n.includes("salmon") || n.includes("tuna") || n.includes("mackerel") || n.includes("sardines")) return "/food-images/ikan-bakar.jpg";
    if (n.includes("omelet")) return "/food-images/omelet.jpg";
    if (n.includes("dadar")) return "/food-images/telur-dadar.jpg";
    if (n.includes("telur")) return "/food-images/telur-rebus.jpg";
    if (n.includes("tempe")) return "/food-images/tempe.jpg";
    if (n.includes("tahu")) return "/food-images/tahu.jpg";
    if (n.includes("gado")) return "/food-images/gado-gado.jpg";
    if (n.includes("capcay")) return "/food-images/capcay.jpg";
    if (n.includes("kangkung")) return "/food-images/kangkung.jpg";
    if (n.includes("bayam")) return "/food-images/sayur-bayam.jpg";
    if (n.includes("salad")) return "/food-images/salad-sayur.jpg";
    if (n.includes("apel")) return "/food-images/buah-apel.jpg";
    if (n.includes("pir")) return "/food-images/buah-pir.jpg";
    if (n.includes("pepaya")) return "/food-images/buah-pepaya.jpg";
    if (n.includes("alpukat")) return "/food-images/alpukat.jpg";
    if (n.includes("pisang")) return "/food-images/pisang.jpg";
    if (n.includes("almond") || n.includes("pecan") || n.includes("kacang")) return "/food-images/almond.jpg";
    if (n.includes("kopi")) return "/food-images/kopi.jpg";
    if (n.includes("teh")) return "/food-images/es-teh.jpg";
    if (n.includes("jus")) return "/food-images/jus-buah.jpg";
    if (k.includes("karbohidrat")) return "/food-images/nasi-merah.jpg";
    if (k.includes("lauk hewani")) return "/food-images/pepes-ikan.jpg";
    if (k.includes("lauk nabati")) return "/food-images/tempe.jpg";
    if (k.includes("sayur")) return "/food-images/sayur-bening.jpg";
    if (k.includes("buah")) return "/food-images/buah-apel.jpg";
    if (k.includes("biji") || k.includes("snack")) return "/food-images/almond.jpg";
    if (k.includes("minuman") || k.includes("dairy")) return "/food-images/jus-buah.jpg";
    return "/food-images/salad-sayur.jpg";
  };

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
          // Normalize backend items to match component format (selaras dengan knowledge_base_new P001-P025)
          const mapped = res.data.map((item) => {
            const giVal = item.gi ?? 35;
            const natriumVal = item.natrium || 0;
            const gulaVal = item.gula || 0;
            const kelompokLower = (item.kelompok || "").toLowerCase();
            const prosesLower = (item.tingkat_proses || "").toLowerCase();
            const namaLower = (item.nama || "").toLowerCase();

            const isUltraProcessed =
              kelompokLower.includes("bumbu") ||
              kelompokLower.includes("dessert") ||
              prosesLower.includes("ultra") ||
              prosesLower.includes("kemasan") ||
              /\b(abc|chatime|cimory|boba|grass jelly|milk tea|fresh milk chocolate|susu coklat|sarden|sardines|terasi|kecap|saus|kental manis|keripik|kornet|sosis|nugget)\b/i.test(namaLower);
            const isContraindicated = /\b(belimbing|jengkol|jeroan|hati|ampela|usus|babat|otak)\b/i.test(namaLower);
            const isHighSodiumOrSugar = natriumVal > 350 || gulaVal >= 8;

            const isSafeRecommended =
              giVal <= 55 &&
              !item.flags?.gorengan &&
              !item.flags?.alkohol &&
              !isUltraProcessed &&
              !isContraindicated &&
              !isHighSodiumOrSugar;

            let reasonText = "Indeks glikemik bersahabat & minim proses untuk kestabilan respon insulin";
            if (isContraindicated) {
              reasonText = "Kontraindikasi klinis (P012/P016/P017): hindari atau batasi sangat ketat";
            } else if (isUltraProcessed || isHighSodiumOrSugar) {
              reasonText = "Produk ultra-proses atau tinggi natrium/gula — perlu dibatasi sesuai pedoman PERKENI & DASH";
            } else if (giVal > 55 || item.flags?.gorengan) {
              reasonText = "Indeks glikemik tinggi atau olahan gorengan/minyak jenuh";
            }

            return {
              id: item.id,
              nama: item.nama,
              kategori: item.kelompok || "Bahan Makanan",
              kalori: item.kalori || 0,
              karbo: item.karbo || 0,
              protein: item.protein || 0,
              lemak: item.lemak || 0,
              gula: gulaVal,
              natrium: natriumVal,
              gi: giVal,
              is_recommended: isSafeRecommended,
              alasan: reasonText,
              gambar: item.gambar ? `/food-images/${item.gambar}` : resolveMenuImage(item.nama, item.kelompok),
            };
          });
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
              Daftar Makanan &{" "}
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
              className="bg-white/90 backdrop-blur-xl border border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 bg-slate-100 overflow-hidden">
                  <img
                    src={food.gambar || resolveMenuImage(food.nama, food.kategori)}
                    alt={food.nama}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = "/food-images/salad-sayur.jpg";
                    }}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 right-3 text-xs font-black text-emerald-700 bg-white/95 backdrop-blur px-2.5 py-1 rounded-xl shadow-xs">
                    {food.kalori} kkal
                  </span>
                </div>
                <div className="p-6 pb-2">
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
              </div>

              {/* Indikator Glikemik & Gula */}
              <div className="flex items-center justify-between px-6 pb-5 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500">
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
