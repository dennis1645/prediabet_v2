import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Sparkles,
  ArrowRight,
  RotateCw,
  Bell,
  HeartPulse,
  CheckCircle2,
  Check,
  AlertTriangle,
  Info,
  Clock,
  Utensils,
  Flame,
  Zap,
  Scale,
  ListCheck,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import api from "../services/api";
import { showToast } from "../utils/alerts";

export default function DashboardPage() {
  const { user, profile, analysis, setAnalysis, loading } = useAuth();
  const navigate = useNavigate();
  const [shuffling, setShuffling] = useState(false);
  const [liveData, setLiveData] = useState({ profile, analysis });
  const [mealPlan, setMealPlan] = useState(analysis?.meal_plan || []);
  const [shuffleToast, setShuffleToast] = useState("");

  // Jika pengguna belum mengisi kuesioner kesehatan, wajib dialihkan ke kuesioner terlebih dahulu
  React.useEffect(() => {
    if (!loading && !profile) {
      navigate("/questionnaire", { replace: true });
    }
  }, [profile, loading, navigate]);

  // Sync state if analysis updates
  React.useEffect(() => {
    if (analysis?.meal_plan) {
      setMealPlan(analysis.meal_plan);
    }
  }, [analysis]);

  // Load fresh dashboard data from backend API
  React.useEffect(() => {
    async function loadFreshDashboard() {
      try {
        const res = await api.getDashboard();
        if (res.success && res.data) {
          if (res.data.analysis) {
            setAnalysis(res.data.analysis);
            if (res.data.analysis.meal_plan) {
              setMealPlan(res.data.analysis.meal_plan);
            }
          }
          setLiveData(res.data);
        }
      } catch (err) {
        console.warn("Could not load live dashboard from server, using cached session:", err.message);
        if (err.status === 404 || err.needsQuestionnaire) {
          navigate("/questionnaire", { replace: true });
        }
      }
    }
    loadFreshDashboard();
  }, [navigate, setAnalysis]);

  const currentAnalysis = liveData.analysis || analysis || {};

  // Macro calculation
  const totalMacroKal =
    (currentAnalysis.target_karbo || 231) * 4 +
    (currentAnalysis.target_protein || 92) * 4 +
    (currentAnalysis.target_lemak || 62) * 9;

  const karboPct = totalMacroKal
    ? Math.round((((currentAnalysis.target_karbo || 231) * 4) / totalMacroKal) * 100)
    : 50;
  const proteinPct = totalMacroKal
    ? Math.round((((currentAnalysis.target_protein || 92) * 4) / totalMacroKal) * 100)
    : 20;
  const lemakPct = totalMacroKal
    ? Math.round((((currentAnalysis.target_lemak || 62) * 9) / totalMacroKal) * 100)
    : 30;

  const diffCal = (currentAnalysis.target_kalori || 1850) - (currentAnalysis.tdee || 2150);

  const healthScore = currentAnalysis.health_score || {
    score: 82,
    status: "Kondisi Stabil & Baik",
    metrics: { days_logged: 5, avg_adherence: 86, total_exercise_minutes: 120 },
    breakdown: { food_quality: 8.5 },
  };

  const weeklyInsight = currentAnalysis.weekly_insight || {
    message: "Pola makan 3J Anda sangat konsisten minggu ini! Pertahankan variasi sayuran tinggi serat untuk kestabilan glukosa darah.",
    priorities: ["Tingkatkan jalan santai 15–20 menit pasca makan malam untuk mengoptimalkan sensitivitas insulin."],
  };

  const waktuIcons = {
    "Sarapan Pagi": "🌅",
    "Selingan Pagi": "🍎",
    "Makan Siang": "☀️",
    "Selingan Sore": "🥜",
    "Makan Malam": "🌙",
  };

  // Interactive menu re-shuffle via backend API
  const handleRegenerateMenu = async () => {
    setShuffling(true);
    try {
      const res = await api.regenerateMealPlan();
      if (res.success && res.data?.meal_plan) {
        setMealPlan(res.data.meal_plan);
        showToast("success", "Menu harian berhasil diacak ulang dari server!");
      }
    } catch (err) {
      // Local fallback shuffle if offline
      const updated = mealPlan.map((slot) => ({
        ...slot,
        items: [...slot.items].sort(() => Math.random() - 0.5),
      }));
      setMealPlan(updated);
      showToast("info", "Menu diacak ulang secara lokal.");
    } finally {
      setShuffling(false);
    }
  };

  // Helper: Parse catatan makanan yang sudah dicatat di daily_progress_logs hari ini
  const parseLoggedMeals = (notes) => {
    if (!notes) return { Sarapan: [], "Makan Siang": [], "Makan Malam": [], Selingan: [] };
    const lines = notes.split("\n");
    const result = { Sarapan: [], "Makan Siang": [], "Makan Malam": [], Selingan: [] };

    for (const line of lines) {
      const match = line.match(/^\[(.*?)\]\s*(.*?)(?:\s*\((?:[^()]*?(\d+)\s*kkal)\))?\s*$/);
      if (match) {
        const slotRaw = match[1].trim().toLowerCase();
        const foodName = match[2].trim();
        const calories = match[3] ? parseInt(match[3], 10) : 0;

        let key = "Selingan";
        if (slotRaw.includes("sarapan") || slotRaw.includes("pagi")) key = "Sarapan";
        else if (slotRaw.includes("siang")) key = "Makan Siang";
        else if (slotRaw.includes("malam")) key = "Makan Malam";

        result[key].push({ nama: foodName, kalori: calories, raw: line });
      }
    }
    return result;
  };

  const mapSlotToKey = (waktu) => {
    const w = (waktu || "").toLowerCase();
    if (w.includes("sarapan")) return "Sarapan";
    if (w.includes("siang")) return "Makan Siang";
    if (w.includes("malam")) return "Makan Malam";
    return "Selingan";
  };

  const loggedMeals = parseLoggedMeals(liveData.todayLog?.notes);

  // Aksi Cepat: Tandai menu rencana sebagai sudah dikonsumsi
  const handleMarkMealConsumed = async (slot, item) => {
    try {
      const mealTime = mapSlotToKey(slot.waktu);
      const res = await api.logFoodDirect({
        food_name: item.nama,
        calories: item.kalori || 150,
        meal_time: mealTime,
        protein: item.protein || 10,
        karbo: item.karbo || 20,
        lemak: item.lemak || 5,
      });

      if (res && res.success) {
        showToast("success", `${item.nama} berhasil dicatat ke menu ${mealTime} hari ini!`);
        const fresh = await api.getDashboard();
        if (fresh.success && fresh.data) {
          setLiveData(fresh.data);
        }
      }
    } catch (err) {
      showToast("error", "Gagal mencatat menu ke progres harian.");
    }
  };

  return (
    <div className="relative min-h-screen pb-20 font-sans">
      
      {/* Background Floating Orbs Sesuai dashboard.html */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 -left-24 w-[28rem] h-[28rem] rounded-full bg-emerald-200/40 blur-3xl"></div>
        <div className="absolute top-24 -right-28 w-[24rem] h-[24rem] rounded-full bg-teal-200/45 blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-[32rem] h-[18rem] rounded-full bg-cyan-100/40 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10 w-full relative z-10">
        
        {/* ========================================================= */}
        {/* 1. REMINDER UPDATE PROFIL (Sesuai dashboard.html)          */}
        {/* ========================================================= */}
        <div className="mb-8 bg-white/80 backdrop-blur-xl rounded-[1.75rem] p-5 md:p-6 border-l-4 border-amber-400 border border-slate-200/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0 shadow-xs">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>Reminder Profil Klinis</span>
              </div>
              <h3 className="text-amber-950 font-extrabold text-base md:text-lg">
                Waktunya Update Profil Kesehatanmu
              </h3>
              <p className="text-amber-800/90 text-sm mt-0.5 leading-relaxed max-w-2xl">
                Kondisi metabolisme tubuh selalu berkembang. Perbarui berat badan dan data lab terkini agar target kalori 3J serta menu harian tetap presisi.
              </p>
            </div>
          </div>
          <Link
            to="/questionnaire"
            className="shrink-0 w-full md:w-auto text-center bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 hover:-translate-y-0.5"
          >
            Perbarui Sekarang
          </Link>
        </div>

        {/* ========================================================= */}
        {/* 2. HERO GREETING (Sesuai dashboard.html)                  */}
        {/* ========================================================= */}
        <section className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 md:p-8 lg:p-10 text-white shadow-2xl shadow-emerald-900/10 mb-8 animate-fade-in">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-24 -right-16 w-72 h-72 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-32 bg-emerald-200 rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3.5 py-1.5 text-xs font-bold mb-5 backdrop-blur">
                <span className="w-2 h-2 rounded-full bg-lime-300 animate-pulse"></span>
                <span>Dashboard Kesehatan Aktif</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                Halo, {user ? user.username : "Sahabat Sehat"} 👋<br />
                <span className="text-emerald-100">menu harianmu siap.</span>
              </h1>
              <p className="mt-4 text-emerald-50/90 text-sm md:text-base leading-relaxed max-w-2xl font-normal">
                Target kalori, makronutrien, jadwal makan teratur, diet aktif, dan rekomendasi hidangan hari ini telah disesuaikan dengan panduan medis PERKENI.
              </p>
            </div>

            {/* Status Pills Widget */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-5">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Pola Makan</p>
                <div className="text-2xl font-black">Normal 3J</div>
                <p className="text-xs text-emerald-100 mt-1">{analysis.frekuensi_makan || "3x makan utama"}</p>
              </div>

              <div className="rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-5">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Skor Risiko</p>
                <div className="text-3xl font-black">{analysis.skor_risiko || "68"}</div>
                <p className="text-xs text-emerald-100 mt-1 truncate">{analysis.kategori_risiko || "Prediabetes"}</p>
              </div>

              <div className="col-span-2 rounded-3xl bg-white/15 border border-white/20 backdrop-blur p-5">
                <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-1">Status Diet Aktif</p>
                <div className="text-xl font-black">{analysis.active_diet_label || "Diet Mediterania"}</div>
                <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                  Pola makan seimbang kaya serat dan rendah indeks glikemik untuk stabilisasi insulin.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 3. HEALTH SCORE MINGGU INI & RINGKASAN PROGRESS           */}
        {/* ========================================================= */}
        <section className="rounded-[2rem] p-5 md:p-7 mb-8 border border-emerald-100 bg-white/95 backdrop-blur-xl relative overflow-hidden shadow-sm animate-fade-in">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-100/70 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-100/60 blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_.9fr] gap-8 items-stretch">
            
            {/* Kiri: Health Score Widget */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-700 mb-4">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <span>Health Score Minggu Ini</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex items-end gap-2">
                    <span className="text-6xl md:text-7xl font-black tracking-tight text-slate-900 leading-none">
                      {healthScore.score}
                    </span>
                    <span className="text-xl md:text-2xl font-black text-slate-400 mb-2">/100</span>
                  </div>

                  <div className="sm:mb-2">
                    <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-100 px-4 py-2 rounded-2xl text-sm font-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{healthScore.status}</span>
                    </span>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mt-5 h-4 rounded-full bg-slate-100 overflow-hidden border border-slate-200/60">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, healthScore.score)}%` }}
                  ></div>
                </div>

                <p className="text-sm md:text-base font-bold text-slate-700 mt-4 leading-relaxed">
                  {weeklyInsight.message}
                </p>

                <p className="text-xs font-semibold text-slate-400 mt-3 leading-relaxed">
                  Dihitung dari {healthScore.metrics.days_logged} hari catatan pada minggu berjalan.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link
                  to="/progress"
                  className="inline-flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-3 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 text-sm"
                >
                  <span>Lihat Detail Progress</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/chatbot"
                  className="inline-flex justify-center items-center gap-2 bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 font-black px-5 py-3 rounded-2xl transition-all hover:-translate-y-0.5 text-sm"
                >
                  <span>Tanya Dr. Predi</span>
                </Link>
              </div>
            </div>

            {/* Kanan: Ringkasan Progress Grid */}
            <div className="rounded-[1.75rem] bg-slate-50/90 border border-slate-100 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <ListCheck className="w-4 h-4 text-emerald-600" />
                      <span>Ringkasan Progress Mingguan</span>
                    </p>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Detail log harian ada di halaman Progress.</p>
                  </div>
                  <span className="hidden sm:inline-flex text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                    7 Hari Terakhir
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Catatan Log</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">
                      {healthScore.metrics.days_logged}
                      <span className="text-sm text-slate-400">/7 hari</span>
                    </p>
                  </div>
                  
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Meal Plan</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">
                      {healthScore.metrics.avg_adherence}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Aktivitas Fisik</p>
                    <p className="text-2xl font-black text-orange-600 mt-1">
                      {healthScore.metrics.total_exercise_minutes}
                      <span className="text-sm text-slate-400">/150 mnt</span>
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-2xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Kualitas Makanan</p>
                    <p className="text-base font-black text-purple-700 mt-2">
                      Sangat Baik ({healthScore.breakdown.food_quality}/10)
                    </p>
                  </div>
                </div>
              </div>

              {weeklyInsight.priorities && weeklyInsight.priorities.length > 0 && (
                <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200/80 p-3.5 flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-amber-900">Fokus Langkah Berikutnya:</p>
                    <p className="text-xs font-medium text-amber-800 mt-0.5 leading-relaxed">
                      {weeklyInsight.priorities[0]}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. SUMMARY CARDS (BMI, RISIKO, TARGET KALORI, TDEE)       */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
          
          {/* Card 1: BMI */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-[1.75rem] p-6 relative overflow-hidden shadow-sm hover:-translate-y-1 transition-all">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-emerald-100 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl mb-4">
                <Scale className="w-6 h-6 text-emerald-600" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">BMI Anda</p>
              <div className="text-4xl font-black text-slate-800 mt-1">{currentAnalysis.bmi || 0}</div>
              <span className="inline-flex mt-3 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-extrabold px-3 py-1 rounded-full">
                {currentAnalysis.status_bmi || currentAnalysis.kategori_bmi || "Normal"}
              </span>
            </div>
          </div>

          {/* Card 2: Risiko Diabetes */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-[1.75rem] p-6 relative overflow-hidden shadow-sm hover:-translate-y-1 transition-all">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-rose-100 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl mb-4">
                <HeartPulse className="w-6 h-6 text-rose-600" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Risiko Diabetes</p>
              <div className="text-4xl font-black text-slate-800 mt-1">{currentAnalysis.skor_risiko ?? 0}</div>
              <span className="inline-flex mt-3 bg-rose-50 text-rose-700 border border-rose-100 text-xs font-extrabold px-3 py-1 rounded-full">
                {currentAnalysis.kategori_risiko || "Rendah"}
              </span>
            </div>
          </div>

          {/* Card 3: Target Kalori */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-[1.75rem] p-6 relative overflow-hidden shadow-sm hover:-translate-y-1 transition-all">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-teal-100 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl mb-4">
                <Flame className="w-6 h-6 text-teal-600" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Target Kalori</p>
              <div className="text-4xl font-black text-slate-800 mt-1">{currentAnalysis.target_kalori || 1850}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="bg-teal-50 text-teal-700 border border-teal-100 text-xs font-extrabold px-3 py-1 rounded-full">
                  kkal / hari
                </span>
                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-xs font-extrabold px-3 py-1 rounded-full">
                  {diffCal < 0 ? `Defisit ${Math.abs(diffCal)} kkal` : "Sesuai TDEE"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: TDEE */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-[1.75rem] p-6 relative overflow-hidden shadow-sm hover:-translate-y-1 transition-all">
            <div className="absolute -right-8 -top-8 w-28 h-28 bg-cyan-100 rounded-full blur-2xl pointer-events-none"></div>
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl mb-4">
                <Zap className="w-6 h-6 text-cyan-600" />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-wider">TDEE</p>
              <div className="text-4xl font-black text-slate-800 mt-1">{currentAnalysis.tdee || 2150}</div>
              <p className="text-xs text-slate-500 font-semibold mt-3">Estimasi pembakaran energi harian.</p>
            </div>
          </div>

        </section>

        {/* ========================================================= */}
        {/* 5. NUTRITION CONTROL CENTER & ASIDE (Sesuai dashboard.html) */}
        {/* ========================================================= */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          
          {/* Kiri (2 Kolom): Target Makro & Pola Makan */}
          <div className="lg:col-span-2 bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-7">
              <div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">
                  Nutrition Control Center
                </p>
                <h2 className="text-2xl font-black text-slate-800">Target Makro & Pola Makan</h2>
                <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                  Pantau komposisi target harian dan pengaturan diet/pola makan yang sedang aktif.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200/80 rounded-2xl px-4 py-2 text-xs font-extrabold text-slate-600 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Profile</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Pola Waktu Makan */}
              <div className="rounded-3xl bg-slate-50/80 border border-slate-200/70 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-teal-600 flex items-center justify-center text-xl shadow-xs">
                    <Clock className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">
                      Pola Waktu Makan
                    </p>
                    <h3 className="font-black text-slate-800 text-lg">Makan Biasa Teratur (3J)</h3>
                    <p className="text-xs text-slate-500 mt-1">3 kali makan utama + 2 kali selingan sehat.</p>
                  </div>
                </div>
              </div>

              {/* Diet Aktif */}
              <div className="rounded-3xl bg-emerald-50/80 border border-emerald-100 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white text-emerald-600 flex items-center justify-center text-xl shadow-xs">
                    <Utensils className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-1">
                      Diet Aktif
                    </p>
                    <h3 className="font-black text-slate-800 text-lg">{analysis.active_diet_label || "Diet Mediterania"}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Pola makan seimbang kaya asam lemak tak jenuh dan serat larut penahan glukosa.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Link
                        to="/diet"
                        className="text-[11px] bg-white border border-emerald-200 text-emerald-700 font-black px-3.5 py-1.5 rounded-xl hover:bg-emerald-50 transition shadow-2xs"
                      >
                        Ganti Program Diet
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Adaptasi Box (Sesuai dashboard.html) */}
            {analysis.catatan_pola_makan && (
              <div className="rounded-3xl bg-amber-50/80 border border-amber-200/80 p-5 mb-7">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white text-amber-600 flex items-center justify-center shadow-xs shrink-0">
                    <Lightbulb className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-amber-900 mb-2">Catatan Adaptasi Klinis</h4>
                    <ul className="space-y-1.5">
                      {analysis.catatan_pola_makan.map((catatan, i) => (
                        <li key={i} className="text-xs text-amber-800 leading-relaxed flex items-start gap-2">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{catatan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* 3 Makronutrien Bar Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Karbohidrat</p>
                    <h4 className="text-2xl font-black text-slate-800">{analysis.target_karbo}g</h4>
                  </div>
                  <span className="text-xs font-black text-emerald-600">{karboPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${karboPct}%` }}></div>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Protein</p>
                    <h4 className="text-2xl font-black text-slate-800">{analysis.target_protein}g</h4>
                  </div>
                  <span className="text-xs font-black text-emerald-600">{proteinPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-cyan-500" style={{ width: `${proteinPct}%` }}></div>
                </div>
              </div>

              <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-2xs">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Lemak Sehat</p>
                    <h4 className="text-2xl font-black text-slate-800">{analysis.target_lemak}g</h4>
                  </div>
                  <span className="text-xs font-black text-emerald-600">{lemakPct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-200/80 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500" style={{ width: `${lemakPct}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Kanan (1 Kolom): ASIDE MASCOT & CHAT (Sesuai aside dashboard.html) */}
          <aside className="bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-7 flex flex-col justify-between overflow-hidden relative shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
            <div className="absolute -top-20 -right-20 w-44 h-44 bg-emerald-200/60 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative flex-1 flex flex-col">
              <div className="rounded-[1.75rem] bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white text-center overflow-hidden relative mb-5 shadow-lg shadow-emerald-900/10">
                <div className="relative">
                  <img
                    src="/WajahMaskot2.png"
                    alt="Dr. Predi"
                    className="w-32 h-32 object-contain mx-auto drop-shadow-2xl"
                  />
                  <h3 className="text-xl font-black mt-2">Dr. Predi AI</h3>
                  <p className="text-xs sm:text-sm text-emerald-50 mt-2 leading-relaxed">
                    Sebagai pendamping nutrisi pribadimu, aku siap bantu evaluasi menu harian dan menjaga gula darah tetap stabil.
                  </p>
                </div>
              </div>

              <Link
                to="/chatbot"
                className="w-full inline-flex justify-center items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 px-5 rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 text-sm"
              >
                <span>Mulai Konsultasi Chat</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Frekuensi</p>
                  <p className="font-black text-slate-800 mt-1 text-sm">{analysis.frekuensi_makan || "3x makan"}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200/80 p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Slot Waktu</p>
                  <p className="font-black text-slate-800 mt-1 text-sm">{mealPlan.length} Waktu Makan</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* ========================================================= */}
        {/* 6. MEAL PLAN HARI INI (Sesuai dashboard.html Lengkap)     */}
        {/* ========================================================= */}
        {mealPlan.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-7">
              <div>
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">
                  Today's Meal Plan
                </p>
                <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                  <span>🍽️</span>
                  <span>Rencana Makan Hari Ini</span>
                </h2>
                <p className="text-slate-500 text-sm mt-2 max-w-3xl leading-relaxed">
                  Rekomendasi disesuaikan dengan target{" "}
                  <b className="text-emerald-700">{analysis.target_kalori} kkal</b>, risiko klinis, pantangan, dan preferensi diet aktif Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRegenerateMenu}
                disabled={shuffling}
                className="group inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black shadow-xl shadow-slate-900/10 transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-75 text-sm"
              >
                <RotateCw className={`w-4 h-4 ${shuffling ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"}`} />
                <span>{shuffling ? "Mengacak Menu..." : "Ganti Menu"}</span>
              </button>
            </div>

            {/* Toast feedback jika berhasil mengacak */}
            {shuffleToast && (
              <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{shuffleToast}</span>
              </div>
            )}

            <div className="space-y-8">
              {mealPlan.map((slot, idx) => {
                const totalSlotKal = slot.items.reduce((sum, item) => sum + (item.kalori || 0), 0);
                const targetSlotKal = slot.target_kalori_slot || Math.round(analysis.target_kalori / mealPlan.length);
                const slotPct = Math.min(100, Math.round((totalSlotKal / targetSlotKal) * 100));

                const slotKey = mapSlotToKey(slot.waktu);
                const loggedForThisSlot = loggedMeals[slotKey] || [];
                const isConsumed = loggedForThisSlot.length > 0;
                const loggedNames = loggedForThisSlot.map((l) => l.nama.toLowerCase());
                const matchesPlanned = slot.items.some((item) =>
                  loggedNames.some((lname) => lname.includes(item.nama.toLowerCase()) || item.nama.toLowerCase().includes(lname))
                );

                return (
                  <article
                    key={idx}
                    className={`bg-white/85 backdrop-blur-xl border rounded-[2rem] p-5 md:p-6 shadow-[0_14px_40px_rgba(15,23,42,0.055)] hover:-translate-y-0.5 transition-all ${
                      isConsumed
                        ? matchesPlanned
                          ? "border-emerald-300 ring-1 ring-emerald-400/30"
                          : "border-teal-300 ring-1 ring-teal-400/30"
                        : "border-white"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-2xl shadow-xs shrink-0">
                          {waktuIcons[slot.waktu] || "🍽️"}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                              <span>{slot.waktu}</span>
                              {slot.jam && (
                                <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200/80 px-3 py-1 rounded-full font-black">
                                  {slot.jam}
                                </span>
                              )}
                            </h3>

                            {/* Badge Status Konsumsi Realtime */}
                            {isConsumed ? (
                              matchesPlanned ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full shadow-2xs animate-fade-in">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Sudah Dikonsumsi (Sesuai Rencana)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-black text-teal-900 bg-teal-100 border border-teal-300 px-3 py-1 rounded-full shadow-2xs animate-fade-in">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                                  Sudah Dikonsumsi (Menu Diperbarui Sesuai Log)
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                Rencana Belum Dicatat
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-semibold mt-1">
                            {slot.items.length} menu makanan · target sekitar {targetSlotKal} kkal
                          </p>
                        </div>
                      </div>

                      <div className="min-w-[210px]">
                        <div className="flex justify-between text-xs font-black text-slate-500 mb-2">
                          <span>{isConsumed ? "Kalori Terkonsumsi" : "Target Slot"}</span>
                          <span className="text-emerald-700 font-black">
                            {isConsumed ? loggedForThisSlot.reduce((s, x) => s + (x.kalori || 0), 0) : totalSlotKal} kkal
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-200/70 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                            style={{ width: `${slotPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Jika pengguna mengonsumsi menu lain, tampilkan banner menu aktual yang dicatat */}
                    {isConsumed && !matchesPlanned && (
                      <div className="mb-5 p-4 rounded-2xl bg-teal-50/90 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                            ✓
                          </div>
                          <div>
                            <div className="text-xs font-black text-teal-950">
                              Menu Aktual yang Anda Konsumsi & Tercatat di Progres Hari Ini:
                            </div>
                            <div className="text-sm font-black text-teal-800 mt-0.5">
                              {loggedForThisSlot.map((l) => `${l.nama} (${l.kalori} kkal)`).join(" • ")}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-200/80 px-2.5 py-1 rounded-full border border-teal-300 shrink-0">
                          Sinkron dengan Progress
                        </span>
                      </div>
                    )}

                    {/* Meal Item Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {slot.items.map((item, itemIdx) => {
                        const itemConsumed = isConsumed && (matchesPlanned || loggedNames.some((l) => l.includes(item.nama.toLowerCase())));

                        return (
                          <div
                            key={itemIdx}
                            className={`rounded-[1.65rem] bg-white border overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all flex flex-col relative ${
                              itemConsumed ? "border-emerald-300 ring-2 ring-emerald-400/20" : "border-slate-200/80"
                            }`}
                          >
                            {/* Image Box */}
                            <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                              {item.gambar ? (
                                <img
                                  src={item.gambar}
                                  alt={item.nama}
                                  loading="lazy"
                                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-4xl bg-slate-50">
                                  {item.kategori === "Buah" ? "🍎" : item.kategori === "Sayur" ? "🥦" : item.kategori === "Lauk" ? "🍗" : "🍚"}
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none"></div>
                              
                              <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white text-[10px] font-black px-3 py-1 rounded-full">
                                {slot.waktu}
                              </span>

                              {itemConsumed ? (
                                <span className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Sudah Dimakan</span>
                                </span>
                              ) : (
                                <span className="absolute bottom-3 right-3 bg-white/95 text-amber-600 border border-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-xs">
                                  {item.kalori} kkal
                                </span>
                              )}
                            </div>

                            {/* Content Box */}
                            <div className="p-4 flex flex-col flex-1 justify-between">
                              <div>
                                <h4 className="text-base font-black text-slate-800 leading-snug mb-1">
                                  {item.nama}
                                </h4>
                                <p className="text-xs text-slate-500 font-bold mb-3">{item.porsi}</p>
                              </div>

                              {/* 3 Makronutrien Badges */}
                              <div className="grid grid-cols-3 gap-1.5 mt-auto pt-2 border-t border-slate-100">
                                <div className="rounded-xl bg-sky-50 border border-sky-100 p-1.5 text-center">
                                  <p className="text-[9px] font-black text-sky-500 uppercase">Karbo</p>
                                  <p className="text-xs font-black text-sky-700">{item.karbo || 15}g</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-1.5 text-center">
                                  <p className="text-[9px] font-black text-emerald-500 uppercase">Protein</p>
                                  <p className="text-xs font-black text-emerald-700">{item.protein || 8}g</p>
                                </div>
                                <div className="rounded-xl bg-pink-50 border border-pink-100 p-1.5 text-center">
                                  <p className="text-[9px] font-black text-pink-500 uppercase">Lemak</p>
                                  <p className="text-xs font-black text-pink-700">{item.lemak || 4}g</p>
                                </div>
                              </div>

                              {/* Tombol aksi cepat jika belum dikonsumsi */}
                              {!itemConsumed && !isConsumed && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkMealConsumed(slot, item)}
                                  className="w-full mt-3 inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-xl py-2 px-3 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Tandai Sudah Makan</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Disclaimer Medis Bawah */}
            <div className="mt-8 bg-white/80 backdrop-blur-md rounded-[1.75rem] p-5 text-center border border-slate-200/70 shadow-2xs">
              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-3xl mx-auto">
                ⚠️ Rekomendasi nutrisi ini bersifat informatif berbasis dataset klinis metode 3J. Konsultasikan dengan dokter spesialis atau ahli gizi klinis untuk intervensi medis personal lebih lanjut.
              </p>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
