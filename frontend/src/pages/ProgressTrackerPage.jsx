import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../utils/alerts";
import {
  BookOpen,
  Plus,
  Activity,
  Calendar,
  Utensils,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Bookmark,
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
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[#EAE4D7]">
      <div className="max-w-7xl mx-auto">

        {/* BAR ATAS: JUDUL & NAVIGATOR TANGGAL BUKU */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/10 text-amber-950 text-xs font-black uppercase tracking-wider mb-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Buku Jurnal Harian 3J</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              Jurnal Makan &amp; Aktivitas Harian
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-white/90 border border-stone-300 rounded-2xl p-2 shadow-xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => shiftDate(-1)}
              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center transition cursor-pointer"
              title="Halaman Hari Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => shiftDate(1)}
              className="w-8 h-8 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center transition cursor-pointer"
              title="Halaman Hari Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SAMPUL BUKU KULIT & BUKU TERBUKA 2 HALAMAN (OPEN BOOK SPREAD) */}
        <div className="bg-[#5C4033] p-2.5 sm:p-4 rounded-[2.2rem] shadow-[0_28px_70px_rgba(41,25,15,0.28)] border-b-8 border-[#3E2723] relative">
          {/* Pita Pembatas Buku */}
          <div className="hidden sm:flex absolute -top-2 right-14 z-20 items-center gap-1 bg-rose-700 text-white px-3 py-1.5 rounded-b-xl shadow-md text-[10px] font-black uppercase tracking-wider">
            <Bookmark className="w-3 h-3" />
            <span>{dateInfo.tanggal} {dateInfo.bulan.slice(0, 3)}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 bg-[#FCF9F2] rounded-[1.7rem] overflow-hidden relative shadow-inner">
            {/* JILID TENGAH BUKU (SPINE & RING BINDER) */}
            <div className="hidden lg:flex flex-col justify-evenly items-center absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 z-20 pointer-events-none">
              <div className="w-full h-full bg-gradient-to-r from-black/10 via-stone-400/30 to-black/10 absolute inset-0" />
              {[1, 2, 3, 4, 5, 6].map((ring) => (
                <div
                  key={ring}
                  className="relative z-10 w-6 h-3 rounded-full bg-gradient-to-b from-stone-300 to-stone-500 border border-stone-600/40 shadow-sm"
                />
              ))}
            </div>

            {/* ========================================================= */}
            {/* HALAMAN KIRI: KERTAS BERGARIS + CATATAN MAKAN & AKTIVITAS */}
            {/* ========================================================= */}
            <div
              className="p-6 sm:p-8 lg:pr-12 border-b lg:border-b-0 lg:border-r border-stone-300 relative flex flex-col justify-between min-h-[580px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(148, 163, 184, 0.22) 32px)",
              }}
            >
              {/* Garis Margin Merah Tipis ala Buku Tulis */}
              <div className="hidden sm:block absolute top-0 bottom-0 left-10 w-[1px] bg-rose-300/60 pointer-events-none" />

              <div className="sm:pl-6 relative z-10">
                {/* Header Halaman Kiri dengan Stempel Tanggal Kalender */}
                <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b-2 border-stone-300/80">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-xl bg-white border-2 border-emerald-700 overflow-hidden shadow-xs flex flex-col items-center justify-center shrink-0">
                      <span className="w-full text-center bg-emerald-700 text-white text-[9px] font-black uppercase py-0.5">
                        {dateInfo.bulan.slice(0, 3)}
                      </span>
                      <span className="text-xl font-black text-stone-900 leading-tight my-auto">{dateInfo.tanggal}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Halaman Kiri • Catatan</p>
                      <h2 className="text-lg sm:text-xl font-black text-stone-900">
                        {dateInfo.hari}, {dateInfo.tanggal} {dateInfo.bulan} {dateInfo.tahun}
                      </h2>
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
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition cursor-pointer bg-white/80 border border-rose-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Stiker Ringkasan Kalori Hari Ini */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  <div className="bg-white/95 rounded-xl p-2.5 border border-emerald-200 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block">Masuk</span>
                    <span className="text-sm font-black text-emerald-700">{totalCaloriesIn} kkal</span>
                  </div>
                  <div className="bg-white/95 rounded-xl p-2.5 border border-orange-200 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block">Olahraga</span>
                    <span className="text-sm font-black text-orange-600">-{totalCaloriesOut} kkal</span>
                  </div>
                  <div className="bg-white/95 rounded-xl p-2.5 border border-stone-200 shadow-2xs">
                    <span className="text-[9px] font-black uppercase text-stone-400 block">Sisa ({targetKalori})</span>
                    <span className={`text-sm font-black ${remainingCalories >= 0 ? "text-teal-700" : "text-rose-600"}`}>
                      {remainingCalories} kkal
                    </span>
                  </div>
                </div>

                {/* Daftar Catatan Makanan */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Utensils className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-700">
                      Catatan Makanan Tercatat
                    </h3>
                  </div>

                  {loading ? (
                    <div className="py-6 text-center text-xs text-stone-400 font-semibold">Membuka halaman jurnal...</div>
                  ) : foodLogs.length === 0 ? (
                    <div className="py-7 text-center text-xs text-stone-500 font-semibold bg-white/75 rounded-2xl border border-dashed border-stone-300">
                      Halaman masih kosong untuk {dateInfo.tanggal} {dateInfo.bulan}.<br />
                      Tulis catatan makan di halaman kanan atau lapor ke Dr. Predi!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {foodLogs.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white/95 border border-stone-200 shadow-2xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-black text-emerald-800 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                                  {item.waktu}
                                </span>
                                {item.jam && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                    <Clock className="w-2.5 h-2.5" />
                                    {item.jam} WIB
                                  </span>
                                )}
                              </div>
                              <p className="font-bold text-stone-800 text-sm">{item.nama}</p>
                            </div>
                          </div>
                          <span className="font-black text-emerald-700 text-sm shrink-0">{item.kalori} kkal</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Daftar Aktivitas Fisik */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-orange-600" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-700">
                      Catatan Olahraga
                    </h3>
                  </div>
                  {activities.length === 0 ? (
                    <p className="text-xs text-stone-400 italic bg-white/60 px-3 py-2 rounded-xl border border-dashed border-stone-300">
                      Belum ada aktivitas fisik tercatat pada halaman ini.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activities.map((act) => (
                        <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-white/95 border border-orange-200 text-xs">
                          <div>
                            <span className="font-bold text-stone-800">{act.nama}</span>
                            <span className="text-stone-400 ml-1.5">({act.durasi} mnt)</span>
                          </div>
                          <span className="font-black text-orange-600">-{act.kaloriTerbakar} kkal</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:pl-6 mt-6 pt-3 border-t border-stone-300/70 flex justify-between items-center text-[11px] font-bold text-stone-400">
                <span>Hal. 1 — Catatan Harian</span>
                <span className="text-emerald-800 font-black">Total: {totalCaloriesIn} kkal</span>
              </div>
            </div>

            {/* ========================================================= */}
            {/* HALAMAN KANAN: FORM TULIS CATATAN & ARSIP TANGGAL         */}
            {/* ========================================================= */}
            <div
              className="p-6 sm:p-8 lg:pl-12 relative flex flex-col justify-between min-h-[580px]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(148, 163, 184, 0.22) 32px)",
              }}
            >
              <div className="space-y-6 relative z-10">
                <div className="pb-3 border-b-2 border-stone-300/80">
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Halaman Kanan • Tulis Entri</p>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    Tambah Catatan Baru
                  </h2>
                </div>

                {/* Form Catat Makanan */}
                <form onSubmit={handleAddFood} className="bg-white/95 rounded-2xl border border-stone-300/80 p-4 space-y-3 shadow-xs">
                  <p className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Catat Asupan Makanan</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Waktu</label>
                      <select
                        value={inputFoodMeal}
                        onChange={(e) => setInputFoodMeal(e.target.value)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                      >
                        <option value="Sarapan">Sarapan Pagi</option>
                        <option value="Selingan Pagi">Selingan Pagi</option>
                        <option value="Makan Siang">Makan Siang</option>
                        <option value="Selingan Sore">Selingan Sore</option>
                        <option value="Makan Malam">Makan Malam</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Jam (WIB)</label>
                      <input
                        type="time"
                        value={inputFoodTime}
                        onChange={(e) => setInputFoodTime(e.target.value)}
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                      />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-black text-stone-500 uppercase mb-1">Kalori</label>
                      <input
                        type="number"
                        value={inputFoodCal}
                        onChange={(e) => setInputFoodCal(e.target.value)}
                        placeholder="350"
                        className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputFoodName}
                      onChange={(e) => setInputFoodName(e.target.value)}
                      placeholder="Contoh: Nasi merah + pepes ikan..."
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tulis</span>
                    </button>
                  </div>
                </form>

                {/* Form Catat Olahraga */}
                <form onSubmit={handleAddActivity} className="bg-white/95 rounded-2xl border border-stone-300/80 p-4 space-y-2.5 shadow-xs">
                  <p className="text-xs font-black text-orange-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Catat Aktivitas Fisik</span>
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={inputActivityName}
                      onChange={(e) => setInputActivityName(e.target.value)}
                      className="col-span-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
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
                      className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800"
                      placeholder="Menit"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Simpan Olahraga ({inputDuration} menit)</span>
                  </button>
                </form>

                {/* Arsip Pembatas Halaman 7 Hari Terakhir */}
                <div className="bg-white/90 rounded-2xl border border-stone-300/80 p-4 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Calendar className="w-4 h-4 text-emerald-700" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-stone-800">
                      Arsip Halaman 7 Hari Terakhir
                    </h3>
                  </div>
                  {weeklyLogs.length === 0 ? (
                    <p className="text-xs text-stone-400">Belum ada arsip halaman minggu ini.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {weeklyLogs.map((wl) => (
                        <button
                          key={wl.tanggal}
                          type="button"
                          onClick={() => setSelectedDate(wl.tanggal)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition cursor-pointer ${
                            selectedDate === wl.tanggal
                              ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-amber-50"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
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

              <div className="mt-6 pt-3 border-t border-stone-300/70 flex justify-between items-center text-[11px] font-bold text-stone-400">
                <span>PrediaBeat Daily Journal</span>
                <span>Hal. 2 — Entri &amp; Arsip</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
