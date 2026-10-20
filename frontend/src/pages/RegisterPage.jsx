import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronRight,
  Lock,
  User,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showToast } from "../utils/alerts";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (username.trim().length < 3) {
      const msg = "Username minimal 3 karakter.";
      setError(msg);
      showErrorAlert("Validasi Gagal", msg);
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      const msg = "Format alamat email tidak valid.";
      setError(msg);
      showErrorAlert("Validasi Gagal", msg);
      return;
    }
    if (password.length < 8) {
      const msg = "Password minimal 8 karakter untuk keamanan data medis Anda.";
      setError(msg);
      showErrorAlert("Validasi Gagal", msg);
      return;
    }
    if (!agreeTerms) {
      const msg = "Anda perlu menyetujui Ketentuan Layanan untuk melanjutkan.";
      setError(msg);
      showErrorAlert("Persetujuan Dibutuhkan", msg);
      return;
    }

    setLoading(true);
    try {
      const res = await register(username.trim(), email.trim(), password);
      setLoading(false);

      await showSuccessAlert(
        "Pendaftaran Berhasil!",
        "Akun Anda telah dibuat. Sekarang mari lengkapi kuesioner medis untuk analisis risiko dan meal plan 3J Anda."
      );

      navigate("/questionnaire");
    } catch (err) {
      setLoading(false);
      const errorMsg = err.message || "Gagal melakukan pendaftaran akun.";
      setError(errorMsg);
      showErrorAlert("Registrasi Gagal", errorMsg);
    }
  };

  // Demo auto-fill helper for quick registration testing
  const handleQuickDemo = () => {
    const randomId = Math.floor(100 + Math.random() * 900);
    setUsername(`pengguna_${randomId}`);
    setEmail(`pengguna${randomId}@example.com`);
    setPassword("PrediaBeat2026!");
    setAgreeTerms(true);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Glow / Blur Ornaments */}
      <div className="absolute top-[-12%] right-[-10%] w-[420px] h-[420px] bg-gradient-to-bl from-teal-300 to-emerald-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-12%] left-[-8%] w-[420px] h-[420px] bg-gradient-to-tr from-emerald-300 to-cyan-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none [animation-delay:2s]"></div>
      <div className="absolute top-[35%] left-[15%] w-72 h-72 bg-teal-200/40 rounded-full filter blur-[90px] pointer-events-none"></div>

      {/* Main Card Container */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white/90 backdrop-blur-2xl border border-white/90 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.12),0_10px_25px_-5px_rgba(15,23,42,0.04)] min-h-[640px] relative z-10 overflow-hidden transition-all duration-300">
        
        {/* ========================================================= */}
        {/* PANEL KIRI: Branding, Sapaan & Tab Switcher (Desktop)      */}
        {/* ========================================================= */}
        <div className="hidden md:flex flex-col justify-between w-5/12 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white relative p-8 lg:p-10 shadow-[10px_0_25px_-5px_rgba(0,0,0,0.08)] z-20 overflow-hidden">
          
          {/* Hiasan Geometris Abstrak */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
            <div className="absolute -top-12 -right-12 w-48 h-48 border-[22px] border-white rounded-full"></div>
            <div className="absolute bottom-16 -left-12 w-32 h-32 border-[14px] border-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/3 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
          </div>

          {/* Sapaan Atas */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-extrabold text-emerald-100 border border-white/20 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Langkah Awal Sehat</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Mulai<br />Langkahmu!
            </h2>
            <p className="text-emerald-50/90 text-sm mt-2 leading-relaxed">
              Buat akun barumu dan dapatkan analisis risiko klinis serta meal plan 3J otomatis dalam hitungan menit.
            </p>
          </div>

          {/* Tab Switcher Interaktif (Sign Up Aktif) */}
          <div className="relative z-10 flex flex-col space-y-3 my-auto ml-2">
            {/* Tab Inaktif: Sign In */}
            <Link
              to="/login"
              className="text-emerald-100 hover:text-white px-6 py-3.5 font-bold text-sm w-full flex items-center justify-between transition-all hover:translate-x-1.5 rounded-l-2xl hover:bg-white/10"
            >
              <span>Sign In</span>
              <span className="text-xs opacity-60">← Masuk Akun</span>
            </Link>

            {/* Tab Aktif: Sign Up */}
            <div className="bg-white text-emerald-700 px-6 py-3.5 rounded-l-2xl font-black text-sm shadow-xl shadow-black/10 w-full flex items-center justify-between transition-all transform translate-x-4 border-l-4 border-emerald-500">
              <span className="tracking-wide">Sign Up</span>
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Keunggulan Singkat & Logo Brand Bawah */}
          <div className="relative z-10 pt-4 border-t border-white/15 space-y-3">
            <div className="flex items-center gap-2 text-xs text-emerald-100 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Solusi cerdas pantau kesehatan</span>
            </div>
            
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 p-1 flex items-center justify-center border border-white/25">
                  <img
                    src="/WajahMaskot2.png"
                    alt="Maskot PrediaBeat"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-white">
                  PrediaBeat
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80 bg-white/10 px-2 py-0.5 rounded-md">
                v1.0
              </span>
            </div>
          </div>

        </div>

        {/* ========================================================= */}
        {/* PANEL KANAN: Formulir Registrasi                          */}
        {/* ========================================================= */}
        <div className="w-full md:w-7/12 p-7 sm:p-10 lg:p-12 flex flex-col justify-center relative bg-white/70">
          
          {/* Header Mobile Only (Tab Switcher untuk Layar Kecil) */}
          <div className="md:hidden mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <img
                  src="/WajahMaskot2.png"
                  alt="Maskot PrediaBeat"
                  className="w-9 h-9 object-contain"
                />
                <span className="font-extrabold text-lg tracking-tight text-slate-800">
                  PrediaBeat
                </span>
              </div>
              <Link to="/" className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Beranda</span>
              </Link>
            </div>
            
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-2xl text-center text-xs font-bold">
              <Link
                to="/login"
                className="py-2.5 text-slate-500 hover:text-slate-800 transition"
              >
                Sign In
              </Link>
              <div className="py-2.5 bg-white text-emerald-700 rounded-xl shadow-xs font-extrabold">
                Sign Up
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-left mb-5">
            <div className="hidden md:inline-flex items-center gap-2 mb-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-extrabold border border-emerald-200/70">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Registrasi Pengguna Baru</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Buat Akun Baru
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Hanya butuh 1 menit untuk memulai panduan gaya hidup sehat Anda.
            </p>
          </div>

          {/* Pesan Error */}
          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Form Utama */}
          <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
            
            {/* Input Username */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Username
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Pilih nama pengguna unik (min. 3 huruf)"
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Input Email */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Alamat Email Aktif
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter..."
                  className="w-full pl-11 pr-11 py-3 sm:py-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Persetujuan & Demo Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">
                  Saya setuju dengan <a href="#" onClick={(e) => e.preventDefault()} className="text-emerald-600 font-bold hover:underline">Ketentuan & Privasi</a>
                </span>
              </label>

              {/* Demo Auto-fill */}
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200/70 transition-colors"
                title="Isi otomatis untuk pengujian cepat"
              >
                Isi Data Contoh
              </button>
            </div>

            {/* Tombol Submit Utama */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-3.5 sm:py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/35 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-70 text-sm flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Mempersiapkan Akun...</span>
                </>
              ) : (
                <>
                  <span>Daftar & Lanjut Skrining</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Footer Card: Link Login & Back to Home */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Sudah punya akun?{" "}
              <Link
                to="/login"
                className="text-emerald-600 font-extrabold hover:text-emerald-700 hover:underline"
              >
                Masuk di sini
              </Link>
            </div>

            <Link
              to="/"
              className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
