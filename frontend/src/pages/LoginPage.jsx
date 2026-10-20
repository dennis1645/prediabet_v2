import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ChevronRight,
  Lock,
  User,
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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      const msg = "Silakan masukkan username/email dan password Anda.";
      setError(msg);
      showErrorAlert("Input Kurang Lengkap", msg);
      return;
    }

    setLoading(true);
    try {
      const res = await login(username.trim(), password);
      setLoading(false);
      
      // SweetAlert Berhasil Login
      await showSuccessAlert(
        "Login Berhasil!",
        `Selamat datang kembali, ${res.data?.user?.username || username}!`
      );
      
      navigate("/dashboard");
    } catch (err) {
      setLoading(false);
      const errorMsg = err.message || "Gagal masuk ke akun Anda.";
      setError(errorMsg);
      showErrorAlert("Login Gagal", errorMsg);
    }
  };

  // Demo auto-fill helper for convenience
  const handleQuickDemo = () => {
    setUsername("budi_santoso");
    setPassword("PrediaBeat2026!");
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50/80 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans">
      
      {/* Background Glow / Blur Ornaments */}
      <div className="absolute top-[-12%] left-[-10%] w-[420px] h-[420px] bg-gradient-to-br from-emerald-300 to-teal-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-12%] right-[-8%] w-[420px] h-[420px] bg-gradient-to-tr from-teal-300 to-cyan-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-40 animate-pulse pointer-events-none [animation-delay:2s]"></div>
      <div className="absolute top-[40%] right-[15%] w-72 h-72 bg-emerald-200/40 rounded-full filter blur-[90px] pointer-events-none"></div>

      {/* Main Card Container */}
      <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white/90 backdrop-blur-2xl border border-white/90 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(16,185,129,0.12),0_10px_25px_-5px_rgba(15,23,42,0.04)] min-h-[620px] relative z-10 overflow-hidden transition-all duration-300">
        
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
              <span>Digital Health AI</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Selamat<br />Datang!
            </h2>
            <p className="text-emerald-50/90 text-sm mt-2 leading-relaxed">
              Kendalikan gula darahmu dan mulai hidup sehat bersama panduan AI klinis hari ini.
            </p>
          </div>

          {/* Tab Switcher Interaktif (Sign In Aktif) */}
          <div className="relative z-10 flex flex-col space-y-3 my-auto ml-2">
            {/* Tab Aktif: Sign In */}
            <div className="bg-white text-emerald-700 px-6 py-3.5 rounded-l-2xl font-black text-sm shadow-xl shadow-black/10 w-full flex items-center justify-between transition-all transform translate-x-4 border-l-4 border-emerald-500">
              <span className="tracking-wide">Sign In</span>
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Tab Inaktif: Sign Up */}
            <Link
              to="/register"
              className="text-emerald-100 hover:text-white px-6 py-3.5 font-bold text-sm w-full flex items-center justify-between transition-all hover:translate-x-1.5 rounded-l-2xl hover:bg-white/10"
            >
              <span>Sign Up</span>
              <span className="text-xs opacity-60">Daftar Baru →</span>
            </Link>
          </div>

          {/* Keunggulan Singkat & Logo Brand Bawah */}
          <div className="relative z-10 pt-4 border-t border-white/15 space-y-3">
            <div className="flex items-center gap-2 text-xs text-emerald-100 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Tenang dan nyaman tanpa khawatir.</span>
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
        {/* PANEL KANAN: Formulir Login                               */}
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
              <div className="py-2.5 bg-white text-emerald-700 rounded-xl shadow-xs font-extrabold">
                Sign In
              </div>
              <Link
                to="/register"
                className="py-2.5 text-slate-500 hover:text-slate-800 transition"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Form Header */}
          <div className="text-left mb-6">
            <div className="hidden md:inline-flex items-center gap-2 mb-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-extrabold border border-emerald-200/70">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Masuk Pengguna</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              Masuk Akun
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Gunakan akun PrediaBeat Anda untuk melanjutkan pemantauan.
            </p>
          </div>

          {/* Pesan Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Form Utama */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            
            {/* Input Username / Email */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 ml-1">
                Username / Email
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: budi_santoso atau nama@email.com"
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-slate-50/90 border border-slate-200 rounded-2xl text-slate-800 text-sm font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Input Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Fitur reset password: Gunakan akun demo atau masukkan password Anda.");
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Lupa Password?
                </a>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-4 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
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

            {/* Ingat Saya Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">
                  Ingat saya di perangkat ini
                </span>
              </label>

              {/* Demo 1-Click Fill Button */}
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-xs font-bold text-teal-600 bg-teal-50 hover:bg-teal-100/80 px-2.5 py-1 rounded-lg border border-teal-200/70 transition-colors"
                title="Isi otomatis untuk pengujian cepat"
              >
                Isi Akun Demo
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
                  <span>Memverifikasi Kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

          </form>

          {/* Footer Card: Link Register & Back to Home */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-500">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="text-emerald-600 font-extrabold hover:text-emerald-700 hover:underline"
              >
                Daftar Sekarang
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
