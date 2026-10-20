import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { sampleDiets } from "../services/mockData";
import {
  Sprout,
  Check,
  Star,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import api from "../services/api";
import { showSuccessAlert, showErrorAlert } from "../utils/alerts";

export default function DietListPage() {
  const { analysis, updateProfileAndAnalysis } = useAuth();
  const [activeDietId, setActiveDietId] = useState(analysis?.active_diet || "mediterania");

  const handleActivateDiet = async (diet) => {
    try {
      setActiveDietId(diet.id);
      await api.activateDiet(diet.id);
      await showSuccessAlert(
        "Program Diet Aktif!",
        `Program diet berhasil diubah ke "${diet.nama}". Target makronutrien dan meal plan Anda telah disesuaikan.`
      );
    } catch (err) {
      updateProfileAndAnalysis({
        active_diet: diet.id,
        active_diet_label: diet.nama,
      });
      await showSuccessAlert(
        "Program Diet Diperbarui",
        `Program ${diet.nama} telah diaktifkan secara lokal.`
      );
    }
  };

  const handleDeactivateDiet = async () => {
    try {
      setActiveDietId("mediterania");
      await api.activateDiet("mediterania");
      await showSuccessAlert(
        "Kembali ke Pola Standar",
        "Program diet dinonaktifkan. Sistem kembali ke pola makan seimbang bawaan PrediaBeat."
      );
    } catch (err) {
      setActiveDietId("");
      updateProfileAndAnalysis({
        active_diet: "",
        active_diet_label: "Pola Seimbang Umum (Bawaan PrediBeat)",
      });
      await showSuccessAlert(
        "Kembali ke Pola Standar",
        "Program diet dinonaktifkan."
      );
    }
  };

  return (
    <div className="relative min-h-screen py-10">
      {/* Background Orbs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-[-100px] w-96 h-96 bg-teal-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header Navigation */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <Link
              to="/dashboard"
              className="text-sm font-bold text-emerald-700 hover:text-emerald-800"
            >
              ← Kembali ke Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 mt-3">
              Pilih Program Pola Makan
            </h1>
            <p className="text-slate-500 mt-2 max-w-3xl text-sm">
              Diet Mediterania, Rendah Karbo, dan DASH mengatur pilihan komposisi makanan. Intermittent Fasting mengatur jendela waktu makan dan dapat dikombinasikan.
            </p>
          </div>

          {activeDietId && (
            <button
              onClick={handleDeactivateDiet}
              className="bg-white border border-rose-200 text-rose-600 px-5 py-2.5 rounded-xl font-bold hover:bg-rose-50 transition-all shadow-xs cursor-pointer text-sm"
            >
              Matikan Diet Khusus
            </button>
          )}
        </div>

        {/* 2 Banner Atas (Target Kalori & Paling Direkomendasikan) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">
          
          {/* Card Target Kalori */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Target Kalori Harian
              </div>
              <div className="text-4xl font-black text-emerald-700">
                {analysis.target_kalori} <span className="text-base font-semibold text-slate-500">kkal</span>
              </div>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Dihitung dari profil tubuh, aktivitas, BMI, dan risiko Anda. Mengganti program tidak mengubah batas kalori esensial ini.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs font-bold text-slate-600">
              Diet Aktif: <span className="text-emerald-700 font-extrabold">{analysis.active_diet_label}</span>
            </div>
          </div>

          {/* Card Paling Direkomendasikan */}
          <div className="lg:col-span-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl shadow-xl shadow-emerald-900/10 p-6 md:p-8 text-white relative overflow-hidden">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-emerald-100 mb-3 border border-white/20">
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  Kesesuaian Tertinggi (95% Match)
                </div>
                <h2 className="text-2xl md:text-3xl font-black">Diet Mediterania</h2>
                <p className="text-sm text-emerald-100 mt-1 max-w-xl leading-relaxed">
                  Pola makan paling terbukti secara uji klinis dalam meningkatkan sensitivitas insulin dan menurunkan kolesterol pada pasien prediabetes.
                </p>
              </div>

              <button
                onClick={() => handleActivateDiet(sampleDiets[0])}
                className="bg-white text-emerald-700 px-6 py-3 rounded-2xl font-black hover:bg-emerald-50 transition-all shadow-md text-sm shrink-0 cursor-pointer"
              >
                Gunakan Diet Ini
              </button>
            </div>
          </div>

        </div>

        {/* GRID DIET CATALOG */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sampleDiets.map((diet) => {
            const isActive = activeDietId === diet.id;

            return (
              <div
                key={diet.id}
                className={`bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden shadow-sm border transition-all flex flex-col justify-between group ${
                  isActive
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-xl"
                    : "border-slate-100 hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                {/* Gambar Hero Diet */}
                <div className="relative h-56 bg-slate-100 overflow-hidden">
                  <img
                    src={diet.gambar}
                    alt={diet.nama}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 shadow-sm">
                    {diet.kategori}
                  </div>
                  {isActive && (
                    <div className="absolute top-4 right-4 bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-md flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Sedang Aktif
                    </div>
                  )}
                </div>

                {/* Konten Rinci */}
                <div className="p-6 md:p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 mb-2">
                      {diet.nama}
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">
                      {diet.ringkasan}
                    </p>

                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                        Kelebihan Klinis Utama:
                      </p>
                      <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
                        {diet.kelebihan.map((point, pIdx) => (
                          <li key={pIdx} className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div>
                    {isActive ? (
                      <div className="w-full py-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-sm text-center flex items-center justify-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        Program Pola Makan Aktif
                      </div>
                    ) : (
                      <button
                        onClick={() => handleActivateDiet(diet)}
                        className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-emerald-600 text-white font-extrabold text-sm transition-all shadow-md hover:shadow-lg cursor-pointer"
                      >
                        Pilih & Aktifkan Program Ini
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
