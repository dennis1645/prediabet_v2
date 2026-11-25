import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../utils/alerts";
import {
  BookOpen,
  Plus,
  Flame,
  Activity,
  Calendar,
  Utensils,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
} from "lucide-react";

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatIndoDate = (dateStr) => {
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const hari = dt.toLocaleDateString("id-ID", { weekday: "long" });
    const bulan = dt.toLocaleDateString("id-ID", { month: "long" });
    return { hari, tanggal: d, bulan, tahun: y };
  } catch {
    return { hari: "Hari Ini", tanggal: "-", bulan: "", tahun: "" };
  }
};

export default function ProgressTrackerPage() {
  const { analysis } = useAuth();

  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [foodLogs, setFoodLogs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [weeklyLogs, setWeeklyLogs] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ actual_kalori: 0, actual_karbo: 0, actual_protein: 0, actual_lemak: 0 });
  const [loading, setLoading] = useState(true);

  const [inputFoodName, setInputFoodName] = useState("");
  const [inputFoodMeal, setInputFoodMeal] = useState("Sarapan");
  const [inputFoodTime, setInputFoodTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });
  const [inputFoodCal, setInputFoodCal] = useState("");

  const [inputActivityName, setInputActivityName] = useState("Jalan Kaki Cepat");
  const [inputDuration, setInputDuration] = useState(30);

  const loadJournalData = async (dateToLoad = selectedDate) => {
    try {
      setLoading(true);
      const [res, weeklyRes] = await Promise.all([
        api.getDailyLog(dateToLoad),
        api.getWeeklySummary().catch(() => null),
      ]);

      if (weeklyRes?.success && Array.isArray(weeklyRes.data?.recent_logs)) {
        setWeeklyLogs(weeklyRes.data.recent_logs);
      }

      if (res && res.success && res.data?.log) {
        const log = res.data.log;
        setTodaySummary({
          actual_kalori: Math.round(log.actual_kalori || 0),
          actual_karbo: Math.round(log.actual_karbo || 0),
          actual_protein: Math.round(log.actual_protein || 0),
          actual_lemak: Math.round(log.actual_lemak || 0),
        });

        if (log.notes) {
          const lines = log.notes.split("\n");
          const parsed = [];
          lines.forEach((line, i) => {
            const m = line.match(/^\[(.*?)\]\s*(.*?)(?:\s*\((?:[^()]*?(\d+)\s*kkal)\))?\s*$/);
            if (m) {
              const tag = m[1].trim();
              const timeMatch = tag.match(/(\d{2}:\d{2})/);
              parsed.push({
                id: `log-${i}`,
                waktu: tag.replace(/\s*•?\s*\d{2}:\d{2}/, "").trim() || "Makan",
                jam: timeMatch ? timeMatch[1] : null,
                nama: m[2].trim(),
                kalori: m[3] ? parseInt(m[3], 10) : 0,
              });
            } else if (line.trim()) {
              parsed.push({
                id: `log-${i}`,
                waktu: "Catatan",
                jam: null,
                nama: line.trim(),
                kalori: 0,
              });
            }
          });
          setFoodLogs(parsed);
        } else {
          setFoodLogs([]);
        }

        if (log.activity_name) {
          setActivities([
            {
              id: "act-1",
              nama: log.activity_name,
              durasi: log.duration_minutes || 30,
              kaloriTerbakar: Math.round(log.activity_calories || 0),
              updatedAt: log.updated_at,
            },
          ]);
        } else {
          setActivities([]);
        }
      } else {
        setTodaySummary({ actual_kalori: 0, actual_karbo: 0, actual_protein: 0, actual_lemak: 0 });
        setFoodLogs([]);
        setActivities([]);
      }
    } catch (err) {
      console.warn("Gagal memuat jurnal harian:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournalData(selectedDate);
  }, [selectedDate]);

  const shiftDate = (delta) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta);
    setSelectedDate(getLocalDateStr(dt));
  };

  const totalCaloriesIn = foodLogs.reduce((sum, f) => sum + (parseInt(f.kalori, 10) || 0), 0) || todaySummary.actual_kalori;
  const totalCaloriesOut = activities.reduce((sum, a) => sum + (parseInt(a.kaloriTerbakar, 10) || 0), 0);
  const targetKalori = analysis?.target_kalori || 2000;
  const remainingCalories = targetKalori - totalCaloriesIn;
  const dateInfo = formatIndoDate(selectedDate);

  const handleAddFood = async (e) => {
    e.preventDefault();
    if (!inputFoodName.trim() || !inputFoodCal) return;

    try {
      const cal = parseInt(inputFoodCal, 10);
      const res = await api.logFoodDirect({
        food_name: inputFoodName.trim(),
        calories: cal,
        meal_time: `${inputFoodMeal} • ${inputFoodTime}`,
        tanggal: selectedDate,
      });
      if (res && res.success) {
        showToast("success", `${inputFoodName} (${inputFoodTime}) tercatat di Jurnal Harian!`);
        setInputFoodName("");
        setInputFoodCal("");
        loadJournalData(selectedDate);
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
    const estBurn = Math.round(dur * 4.5);

    try {
      const res = await api.saveDailyLog({
        tanggal: selectedDate,
        activity_name: inputActivityName,
        duration_minutes: dur,
        activity_calories: estBurn,
      });
      if (res && res.success) {
        showToast("success", `Aktivitas ${inputActivityName} (${estBurn} kkal) tersimpan di Jurnal!`);
        loadJournalData(selectedDate);
      } else {
        showToast("error", res?.message || "Gagal menyimpan aktivitas.");
      }
    } catch (err) {
      showToast("error", err.message || "Gagal menyimpan aktivitas fisik.");
    }
  };

  return (
    <div className="relative min-h-screen py-8 bg-gradient-to-br from-amber-50/40 via-slate-50 to-emerald-50/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* HEADER BUKU JURNAL & NAVIGATOR TANGGAL KALENDER */}
        <section className="bg-[#FCFBF7] rounded-[2rem] border-2 border-amber-200/70 p-6 md:p-8 mb-8 shadow-[0_18px_50px_rgba(120,53,15,0.06)] relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-black uppercase tracking-wider mb-3 border border-amber-200">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Buku Jurnal Harian 3J</span>
              </div>
              <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
                Jurnal Makan & Aktivitas Harian
              </h1>
              <p className="text-slate-600 font-medium text-sm mt-2 max-w-2xl">
                Catat dan tinjau kembali setiap waktu makan, jam konsumsi, serta aktivitas fisik Anda dari hari ke hari.
              </p>
            </div>

            {/* KARTU KALENDER TANGGAL JURNAL */}
            <div className="flex items-center gap-3 bg-white border-2 border-amber-200/80 rounded-3xl p-4 shadow-sm self-start lg:self-auto">
              <button
                type="button"
                onClick={() => shiftDate(-1)}
                className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center transition cursor-pointer"
                title="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 px-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex flex-col items-center justify-center shadow-md">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{dateInfo.bulan.slice(0, 3)}</span>
                  <span className="text-2xl font-black leading-none">{dateInfo.tanggal}</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{dateInfo.hari}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {dateInfo.tanggal} {dateInfo.bulan} {dateInfo.tahun}
                  </p>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                    className="mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-0.5 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => shiftDate(1)}
                className="w-9 h-9 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center transition cursor-pointer"
                title="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Strip Ringkasan Kalori & Riwayat Tanggal */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-amber-200/60">
            <div className="bg-white rounded-2xl p-3.5 border border-amber-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Target Kalori</span>
              <p className="text-xl font-black text-slate-800">{targetKalori} <span className="text-xs font-semibold text-slate-400">kkal</span></p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-emerald-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Masuk ({dateInfo.tanggal} {dateInfo.bulan.slice(0,3)})</span>
              <p className="text-xl font-black text-emerald-700">{totalCaloriesIn} <span className="text-xs font-semibold text-slate-400">kkal</span></p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-orange-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Terbakar Olahraga</span>
              <p className="text-xl font-black text-orange-600">{totalCaloriesOut} <span className="text-xs font-semibold text-slate-400">kkal</span></p>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200">
              <span className="text-[10px] font-black uppercase text-slate-400">Sisa Anggaran</span>
              <p className={`text-xl font-black ${remainingCalories >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                {remainingCalories} <span className="text-xs font-semibold text-slate-400">kkal</span>
              </p>
            </div>
          </div>
        </section>

        {/* HALAMAN BUKU JURNAL 2 SISI: KIRI (CATATAN MAKANAN) & KANAN (AKTIVITAS & ARSIP TANGGAL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">

          {/* SISI KIRI BUKU JURNAL (7 KOLOM): TIMELINE & INPUT MAKANAN */}
          <div className="lg:col-span-7 bg-[#FCFBF7] rounded-[2rem] border-2 border-amber-200/70 p-6 md:p-8 shadow-sm flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-amber-200/70">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-lg">Catatan Asupan Makanan</h2>
                    <p className="text-xs text-slate-500">Halaman tanggal {dateInfo.tanggal} {dateInfo.bulan} {dateInfo.tahun}</p>
                  </div>
                </div>
                {foodLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (window.confirm("Apakah Anda yakin ingin mereset catatan progres makanan?")) {
                        try {
                          await api.resetProgress();
                          showToast("success", "Catatan jurnal berhasil direset!");
                          loadJournalData(selectedDate);
                        } catch (err) {
                          showToast("error", err.message || "Gagal mereset.");
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>

              {/* Form Catat Makanan dengan Jam */}
              <form onSubmit={handleAddFood} className="bg-white rounded-2xl border border-amber-200/60 p-4 mb-6 space-y-3 shadow-2xs">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Waktu Makan</label>
                    <select
                      value={inputFoodMeal}
                      onChange={(e) => setInputFoodMeal(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Sarapan">Sarapan Pagi</option>
                      <option value="Selingan Pagi">Selingan Pagi</option>
                      <option value="Makan Siang">Makan Siang</option>
                      <option value="Selingan Sore">Selingan Sore</option>
                      <option value="Makan Malam">Makan Malam</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Jam Konsumsi</label>
                    <input
                      type="time"
                      value={inputFoodTime}
                      onChange={(e) => setInputFoodTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Kalori (kkal)</label>
                    <input
                      type="number"
                      value={inputFoodCal}
                      onChange={(e) => setInputFoodCal(e.target.value)}
                      placeholder="350"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputFoodName}
                    onChange={(e) => setInputFoodName(e.target.value)}
                    placeholder="Tulis makanan yang dimakan (misal: Nasi merah + pepes ikan)..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Catat</span>
                  </button>
                </div>
              </form>

              {/* Timeline Catatan Jurnal */}
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 font-semibold">Membuka halaman jurnal...</div>
                ) : foodLogs.length === 0 ? (
                  <div className="py-10 text-center text-xs text-slate-400 font-semibold bg-white/70 rounded-2xl border border-dashed border-amber-300">
                    Belum ada catatan makan pada {dateInfo.tanggal} {dateInfo.bulan} {dateInfo.tahun}.
                  </div>
                ) : (
                  foodLogs.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-amber-100 shadow-2xs"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded-md">
                              {item.waktu}
                            </span>
                            {item.jam && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                                <Clock className="w-2.5 h-2.5" />
                                {item.jam} WIB
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 text-sm">{item.nama}</p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-sm shrink-0">{item.kalori} kkal</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-amber-200/70 flex justify-between items-center text-sm font-black text-slate-800">
              <span>Total Kalori Tercatat:</span>
              <span className="text-lg text-emerald-700">{totalCaloriesIn} kkal</span>
            </div>
          </div>

          {/* SISI KANAN BUKU JURNAL (5 KOLOM): AKTIVITAS FISIK & ARSIP TANGGAL */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#FCFBF7] rounded-[2rem] border-2 border-amber-200/70 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-amber-200/70">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-lg">Catatan Aktivitas Fisik</h2>
                  <p className="text-xs text-slate-500">Meningkatkan sensitivitas insulin harian</p>
                </div>
              </div>

              <form onSubmit={handleAddActivity} className="space-y-3 mb-4">
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={inputActivityName}
                    onChange={(e) => setInputActivityName(e.target.value)}
                    className="col-span-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    <option value="Jalan Kaki Cepat">Jalan Kaki Cepat</option>
                    <option value="Bersepeda Santai">Bersepeda Santai</option>
                    <option value="Senam / Aerobik">Senam / Aerobik Ringan</option>
                    <option value="Berenang">Berenang</option>
                    <option value="Latihan Kekuatan Otot">Latihan Beban</option>
                  </select>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={inputDuration}
                    onChange={(e) => setInputDuration(e.target.value)}
                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    placeholder="Menit"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Catat Olahraga ({inputDuration} menit)</span>
                </button>
              </form>

              <div className="space-y-2">
                {activities.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-4 bg-white/70 rounded-xl border border-dashed border-amber-300">
                    Belum ada aktivitas fisik tercatat pada tanggal ini.
                  </p>
                ) : (
                  activities.map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-orange-100 text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{act.nama}</span>
                        <span className="text-slate-400 ml-1.5">({act.durasi} mnt)</span>
                      </div>
                      <span className="font-black text-orange-600">-{act.kaloriTerbakar} kkal</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Arsip Riwayat Tanggal 7 Hari Terakhir */}
            <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">Arsip Catatan 7 Hari Terakhir</h3>
              </div>
              {weeklyLogs.length === 0 ? (
                <p className="text-xs text-slate-400">Belum ada arsip catatan minggu ini.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {weeklyLogs.map((wl) => (
                    <button
                      key={wl.tanggal}
                      type="button"
                      onClick={() => setSelectedDate(wl.tanggal)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition cursor-pointer ${
                        selectedDate === wl.tanggal
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-amber-50/60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{wl.tanggal}</span>
                      </span>
                      <span className="font-mono text-[11px]">
                        {Math.round(wl.actual_kalori || 0)} kkal • {wl.duration_minutes || 0} mnt
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
