import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../utils/alerts";
import {
  TrendingUp,
  Plus,
  Flame,
  Activity,
  CheckCircle2,
  Calendar,
  Utensils,
  Award,
  RotateCcw,
} from "lucide-react";

export default function ProgressTrackerPage() {
  const { analysis } = useAuth();

  const [foodLogs, setFoodLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inputFoodName, setInputFoodName] = useState("");
  const [inputFoodMeal, setInputFoodMeal] = useState("Sarapan");
  const [inputFoodCal, setInputFoodCal] = useState("");

  const [inputActivityName, setInputActivityName] = useState("Jalan Kaki Cepat");
  const [inputDuration, setInputDuration] = useState(30);

  // Load live data from backend daily_progress_logs
  const loadDailyProgress = async () => {
    try {
      setLoading(true);
      const res = await api.getDailyLog();
      if (res && res.success && res.data?.log) {
        const log = res.data.log;

        // Parse food entries from notes
        if (log.notes) {
          const lines = log.notes.split("\n");
          const parsed = [];
          lines.forEach((line, i) => {
            const m = line.match(/^\[(.*?)\]\s*(.*?)(?:\s*\((.*?)\))?$/);
            if (m) {
              const calMatch = (m[3] || "").match(/(\d+)/);
              parsed.push({
                id: `log-${i}`,
                waktu: m[1],
                nama: m[2],
                kalori: calMatch ? parseInt(calMatch[1], 10) : 0,
              });
            } else if (line.trim()) {
              parsed.push({
                id: `log-${i}`,
                waktu: "Menu Harian",
                nama: line.trim(),
                kalori: 0,
              });
            }
          });
          setFoodLogs(parsed);
        } else {
          setFoodLogs([]);
        }

        // Parse activities
        if (log.activity_name) {
          setActivities([
            {
              id: "act-1",
              nama: log.activity_name,
              durasi: log.duration_minutes || 30,
              kaloriTerbakar: Math.round(log.activity_calories || 0),
            },
          ]);
        } else {
          setActivities([]);
        }
      }
    } catch (err) {
      console.warn("Gagal memuat log progress harian:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyProgress();
  }, []);

  const totalCaloriesIn = foodLogs.reduce((sum, f) => sum + (parseInt(f.kalori) || 0), 0);
  const totalCaloriesOut = activities.reduce((sum, a) => sum + (parseInt(a.kaloriTerbakar) || 0), 0);
  const remainingCalories = (analysis?.target_kalori || 2000) - totalCaloriesIn;

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!inputFoodName.trim() || !inputFoodCal) return;

    try {
      const cal = parseInt(inputFoodCal, 10);
      const res = await api.logFoodDirect({
        food_name: inputFoodName.trim(),
        calories: cal,
        meal_time: inputFoodMeal,
      });
      if (res && res.success) {
        showToast("success", `${inputFoodName} berhasil dicatat ke progress hari ini!`);
        setInputFoodName("");
        setInputFoodCal("");
        loadDailyProgress();
      } else {
        showToast("error", res?.message || "Gagal mencatat makanan.");
      }
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan log makanan.");
    }
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    const dur = parseInt(inputDuration, 10) || 15;
    const estBurn = Math.round(dur * 4.5); // ~4.5 kcal/min

    try {
      const res = await api.saveDailyLog({
        activity_name: inputActivityName,
        duration_minutes: dur,
        activity_calories: estBurn,
      });
      if (res && res.success) {
        showToast("success", `Aktivitas ${inputActivityName} (${estBurn} kkal) tersimpan!`);
        loadDailyProgress();
      } else {
        showToast("error", res?.message || "Gagal menyimpan aktivitas.");
      }
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan aktivitas fisik.");
    }
  };

  return (
    <div className="relative min-h-screen py-10">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-28 -left-24 w-96 h-96 rounded-full bg-emerald-200/40 blur-3xl animate-pulse"></div>
        <div className="absolute top-72 -right-28 w-96 h-96 rounded-full bg-teal-200/30 blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* HERO SECTION */}
        <section className="bg-white/80 backdrop-blur-2xl rounded-[2.25rem] border border-white p-6 md:p-8 lg:p-10 mb-8 shadow-xl shadow-slate-900/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-wider mb-4 border border-emerald-100">
                <TrendingUp className="w-3.5 h-3.5" />
                Progress Tracker Harian & Mingguan
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                Pantau Konsistensi Makan & Aktivitas Anda
              </h1>
              <p className="text-slate-600 font-medium text-sm md:text-base mt-3 leading-relaxed">
                Catat asupan makanan dan durasi olahraga hari ini untuk melihat apakah konsumsi kalori Anda selaras dengan target klinis.
              </p>
            </div>

            {/* 2 Metrik Kalori Atas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[320px] lg:min-w-[480px]">
              <div className="bg-slate-50/90 border border-slate-100 rounded-3xl p-5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Target Makan Harian
                </span>
                <p className="text-3xl font-black text-emerald-700 mt-1">
                  {analysis.target_kalori} <span className="text-sm font-semibold text-slate-400">kkal</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Tersisa:{" "}
                  <strong className={remainingCalories >= 0 ? "text-emerald-600" : "text-rose-500"}>
                    {remainingCalories} kkal
                  </strong>
                </p>
              </div>

              <div className="bg-slate-50/90 border border-slate-100 rounded-3xl p-5 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Kalori Terbakar Hari Ini
                </span>
                <p className="text-3xl font-black text-orange-600 mt-1">
                  {totalCaloriesOut} <span className="text-sm font-semibold text-slate-400">kkal</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 font-semibold">
                  Basal Metabolisme + Aktivitas Fisik
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 2 KOLOM FORM CATATAN: KIRI (MAKANAN) & KANAN (AKTIVITAS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          
          {/* KOLOM 1: INPUT MAKANAN */}
          <div className="bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Catat Makanan Hari Ini</h3>
                  <p className="text-xs text-slate-400">Masukkan makanan yang baru saja Anda konsumsi</p>
                </div>
              </div>

              <form onSubmit={handleAddFood} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Waktu Makan
                  </label>
                  <select
                    value={inputFoodMeal}
                    onChange={(e) => setInputFoodMeal(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    <option value="Sarapan">Sarapan Pagi</option>
                    <option value="Makan Siang">Makan Siang</option>
                    <option value="Makan Malam">Makan Malam</option>
                    <option value="Selingan / Snack">Selingan / Snack</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Nama Makanan
                    </label>
                    <input
                      type="text"
                      value={inputFoodName}
                      onChange={(e) => setInputFoodName(e.target.value)}
                      placeholder="Misal: Nasi merah & pepes ikan"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                      Kalori (kkal)
                    </label>
                    <input
                      type="number"
                      value={inputFoodCal}
                      onChange={(e) => setInputFoodCal(e.target.value)}
                      placeholder="350"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah ke Log Makanan
                </button>
              </form>

              {/* List Makanan Tercatat */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase text-slate-400">Makanan Terdata Hari Ini:</h4>
                  {foodLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm("Apakah Anda yakin ingin mereset seluruh catatan progres dan makanan hari ini?")) {
                          try {
                            await api.resetProgress();
                            showToast("success", "Catatan progres hari ini berhasil direset bersih!");
                            loadDailyProgress();
                          } catch (err) {
                            showToast("error", err.message || "Gagal mereset progres.");
                          }
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Data</span>
                    </button>
                  )}
                </div>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {foodLogs.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      Belum ada makanan dicatat hari ini. Catat lewat form di atas atau dari Chatbot Dr. Predi!
                    </div>
                  ) : (
                    foodLogs.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100/60 px-2 py-0.5 rounded-md mr-2">
                            {item.waktu}
                          </span>
                          <span className="font-bold text-slate-800">{item.nama}</span>
                        </div>
                        <span className="font-extrabold text-emerald-600">{item.kalori} kkal</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-800">
              <span>Total Kalori Makanan:</span>
              <span className="text-lg text-emerald-600">{totalCaloriesIn} kkal</span>
            </div>
          </div>

          {/* KOLOM 2: INPUT AKTIVITAS FISIK */}
          <div className="bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] p-6 md:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-lg">Catat Latihan Fisik</h3>
                  <p className="text-xs text-slate-400">Olahraga aerobik meningkatkan sensitivitas insulin</p>
                </div>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Jenis Olahraga / Aktivitas
                  </label>
                  <select
                    value={inputActivityName}
                    onChange={(e) => setInputActivityName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  >
                    <option value="Jalan Kaki Cepat">Jalan Kaki Cepat (Brisk Walk)</option>
                    <option value="Bersepeda Santai">Bersepeda Santai</option>
                    <option value="Senam / Aerobik">Senam / Aerobik Ringan</option>
                    <option value="Berenang">Berenang</option>
                    <option value="Latihan Kekuatan Otot">Latihan Beban / Kekuatan Otot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Durasi Latihan (Menit)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={inputDuration}
                    onChange={(e) => setInputDuration(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah ke Log Aktivitas
                </button>
              </form>

              {/* List Aktivitas Tercatat */}
              <div className="border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Aktivitas Hari Ini:</h4>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activities.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-semibold bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      Belum ada latihan fisik dicatat hari ini. Catat lewat form di atas atau konsultasi di Chatbot Dr. Predi!
                    </div>
                  ) : (
                    activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-800">{act.nama}</span>
                          <span className="text-xs text-slate-400 ml-2">({act.durasi} menit)</span>
                        </div>
                        <span className="font-extrabold text-orange-600">-{act.kaloriTerbakar} kkal</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center text-sm font-black text-slate-800">
              <span>Total Menit Olahraga:</span>
              <span className="text-lg text-orange-600">
                {activities.reduce((s, a) => s + (parseInt(a.durasi) || 0), 0)} Menit
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
