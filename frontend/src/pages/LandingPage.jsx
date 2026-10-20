import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Activity,
  Apple,
  Clock,
  Scale,
  UtensilsCrossed,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  TrendingDown,
  Mail,
  MapPin,
  HelpCircle,
} from "lucide-react";

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0); // Pertanyaan pertama terbuka default

  // Typewriter Effect: Kata dinamis yang nyambung 100% dengan "Cegah Diabetes Bersama"
  const dynamicWords = [
    "Dr. Predi AI",
    "Panduan Nutrisi 3J",
    "Pola Hidup Sehat",
    "PrediaBeat",
  ];
  const [wordIndex, setWordIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const targetWord = dynamicWords[wordIndex];
    const typingSpeed = isDeleting ? 40 : 80;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentWord(targetWord.substring(0, currentWord.length + 1));
        if (currentWord === targetWord) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        setCurrentWord(targetWord.substring(0, currentWord.length - 1));
        if (currentWord === "") {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % dynamicWords.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentWord, isDeleting, wordIndex]);

  // Data FAQ Bersih & Mudah Dipahami (Tanpa Label Kategori yang Memenuhi Layar)
  const faqs = [
    {
      q: "Apa itu prediabetes dan apakah berbahaya?",
      a: "Prediabetes adalah kondisi saat kadar gula darah lebih tinggi dari normal, namun belum mencapai tingkat diabetes tipe 2. Kondisi ini adalah sinyal peringatan awal dari tubuh, dan merupakan kesempatan terbaik untuk mencegah diabetes permanen melalui perbaikan pola makan.",
    },
    {
      q: "Berapa angka gula darah yang tergolong prediabetes?",
      a: "Berdasarkan standar medis resmi: Gula Darah Puasa (GDP) antara 100 – 125 mg/dL (normal di bawah 100), atau nilai rata-rata 3 bulan HbA1c antara 5.7% – 6.4% (normal di bawah 5.7%). Jika di atas rentang ini, sudah masuk kategori diabetes.",
    },
    {
      q: "Apakah prediabetes memiliki tanda atau gejala fisik?",
      a: "Sebagian besar orang dengan prediabetes tidak merasakan gejala fisik apa pun. Itulah sebabnya banyak orang tidak sadar hingga melakukan tes lab atau skrining kesehatan berkala.",
    },
    {
      q: "Apakah prediabetes bisa dicegah agar tidak menjadi diabetes?",
      a: "Bisa! Berbagai riset medis membuktikan bahwa menjaga pola makan seimbang (rendah gula & karbohidrat olahan) serta rutin beraktivitas fisik mampu menurunkan risiko berkembang menjadi diabetes hingga 58%.",
    },
    {
      q: "Bagaimana cara PrediaBeat membantu saya setiap hari?",
      a: "PrediaBeat menghitung kebutuhan kalori harian Anda, menyusun jadwal dan jenis menu ramah gula darah menggunakan metode 3J, serta menyediakan asisten cerdas Dr. Predi AI untuk konsultasi makanan kapan saja.",
    },
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="bg-slate-50 text-slate-800 relative min-h-screen flex flex-col justify-between font-['Poppins',sans-serif] pt-20">
      {/* Ornamen Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-32 -left-32 w-[36rem] h-[36rem] bg-emerald-200/40 rounded-full blur-[130px]"></div>
        <div className="absolute top-[25%] -right-32 w-[32rem] h-[32rem] bg-teal-200/35 rounded-full blur-[130px]"></div>
        <div className="absolute top-[60%] -left-20 w-[30rem] h-[30rem] bg-cyan-100/45 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-20 right-[15%] w-[34rem] h-[34rem] bg-emerald-100/35 rounded-full blur-[140px]"></div>
      </div>

      {/* ========================================================= */}
      {/* 1. NAVBAR RESPONSIF (Fixed Top: Selalu Ikut Saat Scroll)  */}
      {/* ========================================================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo & Brand */}
            <Link to="/" className="flex items-center space-x-3 cursor-pointer group">
              <div className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                <img
                  src="/WajahMaskot2.png"
                  alt="Maskot PrediaBeat"
                  className="w-full h-full object-contain drop-shadow-sm"
                />
              </div>
              <span className="text-xl md:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 tracking-tight">
                Prediabeat
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center space-x-7 text-sm font-bold text-slate-600">
              <a href="#home" className="hover:text-emerald-600 transition-colors">
                Beranda
              </a>
              <a href="#cara-kerja" className="hover:text-emerald-600 transition-colors">
                Cara Kerja
              </a>
              <a href="#fitur" className="hover:text-emerald-600 transition-colors">
                Metode 3J
              </a>
              <a href="#faq" className="hover:text-emerald-600 transition-colors">
                Tanya Jawab (FAQ)
              </a>
              <a href="#aplikasi" className="hover:text-emerald-600 transition-colors">
                Aplikasi
              </a>
            </div>

            {/* Desktop CTA Action Buttons */}
            <div className="hidden sm:flex items-center space-x-3">
              <Link
                to="/login"
                className="text-teal-700 bg-teal-50 px-5 py-2.5 rounded-full font-bold hover:bg-teal-100 hover:text-teal-800 transition-colors text-sm border border-teal-200/80"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 rounded-full font-bold shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 hover:-translate-y-0.5 transition-all text-sm"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Hamburger Toggle Button (Bersih tanpa tombol login ganda) */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/98 border-b border-slate-200 px-4 pt-3 pb-6 space-y-3 shadow-xl">
            <a
              href="#home"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Beranda
            </a>
            <a
              href="#cara-kerja"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Cara Kerja
            </a>
            <a
              href="#fitur"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Metode 3J
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Tanya Jawab (FAQ)
            </a>
            <a
              href="#aplikasi"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
            >
              Aplikasi Smartphone
            </a>
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-xl font-bold text-teal-700 bg-teal-50 border border-teal-200 text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 text-sm shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ========================================================= */}
      {/* 2. HERO SECTION (Simple, Nyambung & Langsung Kena)        */}
      {/* ========================================================= */}
      <section
        id="home"
        className="relative z-10 w-full min-h-[calc(100vh-80px)] flex items-center justify-center py-8 lg:py-0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            
            {/* Kolom Teks Kiri (7 Kolom Desktop, Rata Kiri di Semua Layar) */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Badge Kategori */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-emerald-100/90 to-teal-100/90 text-emerald-800 font-extrabold rounded-full text-xs tracking-wider border border-emerald-200 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>ASISTEN NUTRISI PREDIABETES CERDAS</span>
              </div>

              {/* Headline Sederhana: Teks Dinamis di Baris Bawahnya (Stabil, Tidak Naik Turun) */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.2]">
                <span className="block">Cegah Diabetes Bersama</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 min-h-[44px] sm:min-h-[58px] lg:min-h-[72px] flex items-center">
                  <span>{currentWord}</span>
                  <span className="inline-block w-[3px] h-[26px] sm:h-[40px] lg:h-[48px] bg-emerald-500 ml-2 animate-pulse"></span>
                </span>
              </h1>

              {/* Subheadline Ringkas & Padat */}
              <p className="text-slate-600 text-base sm:text-lg max-w-xl text-left leading-relaxed font-normal">
                Kendalikan gula darah Anda sejak dini melalui panduan nutrisi metode 3J dan pendampingan cerdas dari asisten AI pribadi Anda.
              </p>

              {/* CTA Buttons: Proporsional & Rata Kiri */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-3.5">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-7 py-3.5 rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 hover:-translate-y-0.5 transition-all group text-center"
                >
                  <span>Mulai Skrining Gratis</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#cara-kerja"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3.5 rounded-2xl font-bold text-sm border border-slate-200/90 shadow-2xs hover:-translate-y-0.5 transition-all text-center"
                >
                  <span>Pelajari Alur Kerja</span>
                  <ChevronRight className="w-4 h-4 text-emerald-600" />
                </a>
              </div>

              {/* Quick Metrics Bar */}
              <div className="pt-6 border-t border-slate-200/70 grid grid-cols-3 gap-3 sm:gap-6 max-w-lg text-left">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-700">500+</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Pangan Rendah GI</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-teal-700">3J</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Pedoman PERKENI</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-cyan-700">58%</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Turunkan Risiko (DPP)</p>
                </div>
              </div>

            </div>

            {/* Kolom Karakter Kanan (5 Kolom Desktop) */}
            <div className="lg:col-span-5 flex justify-center relative mt-4 lg:mt-0">
              {/* Glow Aura */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl w-4/5 h-4/5 m-auto animate-pulse"></div>
              
              {/* Karakter Maskot Utama */}
              <img
                src="/Maskot.png"
                alt="Maskot PrediaBeat"
                className="w-4/5 max-w-xs sm:max-w-sm md:max-w-md drop-shadow-[0_20px_35px_rgba(5,150,105,0.22)] relative z-10 transition-transform hover:scale-102 duration-500"
              />

              {/* Floating Badge 1 (Kiri Atas): Target Klinis */}
              <div className="absolute top-4 -left-2 sm:left-0 z-20 bg-white/95 backdrop-blur-md border border-white/90 p-3 rounded-2xl shadow-lg shadow-emerald-500/5 hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Klinis</p>
                  <p className="text-xs font-extrabold text-slate-800">Gula Darah Stabil</p>
                </div>
              </div>

              {/* Floating Badge 2 (Kanan Bawah): Terverifikasi */}
              <div className="absolute bottom-2 right-0 sm:right-2 z-20 bg-white/95 backdrop-blur-md border border-white/90 p-3 rounded-2xl shadow-lg shadow-emerald-500/5 hidden sm:flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Terverifikasi</p>
                  <p className="text-xs font-extrabold text-slate-800">Meal Plan Rendah GI</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. SECTION TIMELINE 3 LANGKAH DENGAN GARIS PERJALANAN      */}
      {/* ========================================================= */}
      <section
        id="cara-kerja"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 w-full"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Alur Terarah & Berkesinambungan
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            3 Langkah Mudah Menuju Gula Darah Stabil
          </h2>
          <p className="text-slate-600 text-sm md:text-base mt-3 leading-relaxed">
            Tidak perlu bingung mengatur pola makan. Prediabeat memandu Anda langkah demi langkah dengan pendekatan personalisasi klinis.
          </p>
        </div>

        {/* Timeline Container dengan Garis Penghubung Nyata */}
        <div className="relative">
          
          {/* Garis Penghubung Desktop (Horizontal) */}
          <div className="hidden md:block absolute top-[52px] left-[15%] right-[15%] h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 -z-0 rounded-full border-t border-dashed border-emerald-300"></div>

          {/* Garis Penghubung Mobile (Vertical) */}
          <div className="block md:hidden absolute top-8 bottom-8 left-[38px] w-1 bg-gradient-to-b from-emerald-400 via-teal-400 to-cyan-400 -z-0 rounded-full"></div>

          {/* Grid 3 Kartu Langkah */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
            
            {/* Langkah 01 */}
            <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-emerald-500/25 ring-4 ring-white">
                    01
                  </div>
                  <span className="text-xs font-bold uppercase text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    Skrining Medis
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                  Isi Kuesioner & Parameter Tubuh
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Lengkapi data profil demografi, indeks massa tubuh (BMI), riwayat komorbid, dan hasil tes lab terkini seperti GDP, HbA1c, dan tekanan darah.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-emerald-600">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Skor Risiko Klinis Dihitung Seketika</span>
              </div>
            </div>

            {/* Langkah 02 */}
            <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-teal-500/25 ring-4 ring-white">
                    02
                  </div>
                  <span className="text-xs font-bold uppercase text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    Rencana 3J
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                  Dapatkan Meal Plan Otomatis
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Sistem langsung menyusun menu harian yang memperhitungkan Jadwal (jam makan teratur), Jumlah (target kalori & makro), dan Jenis (rendah GI).
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-teal-600">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                <span>Variasi Menu Bisa Diacak Kapan Saja</span>
              </div>
            </div>

            {/* Langkah 03 */}
            <div className="relative bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-cyan-500/25 ring-4 ring-white">
                    03
                  </div>
                  <span className="text-xs font-bold uppercase text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
                    AI & Tracker
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-3">
                  Konsultasi AI & Pantau Progres
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Tanyakan keamanan makanan kepada Dr. Predi AI dan catat log asupan harian Anda untuk memperoleh evaluasi skor kepatuhan (Health Score) mingguan.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-cyan-600">
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                <span>Health Score Mingguan Terpantau</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. METODE 3J (JADWAL, JUMLAH, JENIS)                      */}
      {/* ========================================================= */}
      <section
        id="fitur"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 w-full"
      >
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-3">
            <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-600" />
            Metode Klinis 3J
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Filosofi 3J: Fondasi Pengendalian Glukosa
          </h2>
          <p className="text-slate-600 text-sm md:text-base mt-3 leading-relaxed">
            Metode nutrisi yang direkomendasikan Perkumpulan Endokrinologi Indonesia (PERKENI) untuk mencegah lonjakan glukosa darah pasca makan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* J1: Jadwal */}
          <div className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-xs">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-3">
              Jadwal Makan Teratur
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Membagi waktu makan menjadi 3 waktu makan utama dan 2 selingan dengan jeda 3–4 jam untuk menjaga ritme pelepasan insulin alami tubuh tetap stabil.
            </p>
          </div>

          {/* J2: Jumlah */}
          <div className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-xs">
              <Scale className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-3">
              Jumlah Kalori Terukur
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Dihitung menggunakan rumus Mifflin-St Jeor dan TDEE sesuai tingkat aktivitas fisik harian Anda, mencegah defisit ekstrem atau surplus berlebih.
            </p>
          </div>

          {/* J3: Jenis */}
          <div className="bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-6 shadow-xs">
              <Apple className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 mb-3">
              Jenis Rendah Indeks Glikemik
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Memprioritaskan karbohidrat kompleks, serat larut tinggi, dan lemak sehat tak jenuh yang terbukti tidak memicu lonjakan glukosa mendadak.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. SECTION FAQ BERSIH & ELEGAN (TANPA LABEL KATEGORI RIBET) */}
      {/* ========================================================= */}
      <section
        id="faq"
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 w-full"
      >
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-800 text-xs font-extrabold uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            Bantuan &amp; Edukasi
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h2>
          <p className="text-slate-500 text-sm md:text-base mt-3 leading-relaxed">
            Jawaban praktis dan mudah dipahami seputar prediabetes serta bagaimana PrediaBeat membantu Anda.
          </p>
        </div>

        {/* Clean Accordion Cards */}
        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                  isOpen
                    ? "bg-white border-emerald-300 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-300/40"
                    : "bg-white/80 border-slate-200/80 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4 cursor-pointer focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    {faq.q}
                  </h3>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? "rotate-180 bg-emerald-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 text-sm sm:text-base leading-relaxed border-t border-slate-100/80 animate-fade-in">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 6. SHOWCASE APLIKASI (RAPI & PROPORSIONAL)                */}
      {/* ========================================================= */}
      <section
        id="aplikasi"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 w-full"
      >
        <div className="bg-white/90 backdrop-blur-2xl border border-slate-200/80 rounded-[2.5rem] p-8 sm:p-12 lg:p-16 shadow-[0_20px_60px_rgba(15,23,42,0.06)] flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          
          {/* Gambar HP Mockup */}
          <div className="w-full lg:w-5/12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-teal-400/20 to-emerald-400/20 rounded-[3rem] blur-2xl transform translate-x-3 translate-y-3"></div>
              <img
                src="/Hp.jpg"
                alt="Aplikasi Prediabetes Mockup"
                className="w-64 sm:w-72 md:w-80 shadow-2xl rounded-[2.5rem] border-8 border-white relative z-10 object-contain hover:scale-102 transition-transform duration-300"
              />
            </div>
          </div>

          {/* Teks Deskripsi Aplikasi (Rata Kiri di Semua Layar) */}
          <div className="w-full lg:w-7/12 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black uppercase tracking-wider border border-emerald-200">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Akses Kapan Saja & Di Mana Saja
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Pantau Gula Darah di <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500">
                Setiap Langkah Keseharian Anda
              </span>
            </h2>

            <p className="text-slate-600 leading-relaxed text-sm sm:text-base font-normal max-w-xl text-left">
              PrediaBeat dirancang agar Anda bisa memonitor jadwal makan, memilih menu rendah indeks glikemik di restoran, hingga mencatat aktivitas olahraga ringan secara teratur tanpa stres.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-start gap-4">
              <a
                href="#"
                className="inline-flex items-center bg-[#0f172a] hover:bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-bold shadow-lg shadow-black/15 hover:-translate-y-0.5 transition-all group"
              >
                <svg
                  className="w-7 h-7 mr-3 group-hover:scale-105 transition-transform"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M4 22.3407V1.6593C4 1.13459 4.58245 0.82079 5.02008 1.10996L20.8929 11.606C21.2828 11.8636 21.2828 12.4338 20.8929 12.6914L5.02008 23.1874C4.58245 23.4766 4 23.1628 4 22.6381V22.3407Z"
                    fill="url(#paint0_linear_store_5)"
                  />
                  <path
                    d="M14.9218 15.654L4 23.1874V1.6593L14.9218 9.19277L9.93291 12.4234L14.9218 15.654Z"
                    fill="#F4F4F4"
                    fillOpacity="0.2"
                  />
                  <defs>
                    <linearGradient
                      id="paint0_linear_store_5"
                      x1="4"
                      y1="12.4234"
                      x2="21.1111"
                      y2="12.4234"
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop stopColor="#2196F3" />
                      <stop offset="0.33" stopColor="#4CAF50" />
                      <stop offset="0.66" stopColor="#FFC107" />
                      <stop offset="1" stopColor="#F44336" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-left">
                  <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Download di
                  </div>
                  <div className="text-base font-extrabold leading-none mt-0.5">Google Play Store</div>
                </div>
              </a>

              <Link
                to="/register"
                className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-6 py-3.5 rounded-2xl font-bold text-sm border border-emerald-200/80 transition"
              >
                <span>Akses Versi Web Langsung</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 7. CTA BANNER PRA-FOOTER (MASKOT UTUH TIDAK TERPOTONG)    */}
      {/* ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative z-10 w-full">
        <div className="rounded-[2.5rem] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-8 pt-8 pb-8 sm:px-12 sm:pt-12 sm:pb-0 lg:px-14 lg:pt-14 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/15">
          
          {/* Subtle Glow Patterns */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            
            {/* Teks Kiri (7 Kolom, Rata Kiri di Semua Layar) */}
            <div className="lg:col-span-7 pb-4 sm:pb-12 text-left space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold text-emerald-100">
                <Clock className="w-3.5 h-3.5" />
                <span>Hanya Memakan Waktu 2 Menit</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
                Mulai Perjalanan Sehat Anda Sekarang
              </h2>
              <p className="text-emerald-50 text-sm sm:text-base leading-relaxed opacity-95 max-w-xl">
                Skrining prediabetes hanya memakan waktu 2 menit. Dapatkan meal plan harian yang disesuaikan untuk tubuh Anda sekarang juga.
              </p>
              
              <div className="pt-3">
                <Link
                  to="/register"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-base px-8 py-4 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 hover:shadow-slate-900/30"
                >
                  <span>Daftar Gratis & Mulai Skrining</span>
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                </Link>
              </div>
            </div>

            {/* Maskot Predi Full Hingga Bawah Card (5 Kolom) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-end relative">
              {/* Balon Ucapan */}
              <div className="mb-2 bg-white text-slate-800 px-4 py-2 rounded-2xl shadow-lg text-xs font-extrabold flex items-center gap-1.5 border border-emerald-100 animate-bounce [animation-duration:3s]">
                <span>Yuk mulai sekarang, gratis kok!</span>
                <span>👋</span>
              </div>
              
              {/* Maskot Karakter Berdiri Utuh Hingga Bawah */}
              <div className="relative w-full flex justify-center">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl"></div>
                <img
                  src="/Maskot.png"
                  alt="Maskot Predi Utuh"
                  className="w-48 sm:w-56 lg:w-64 h-auto max-h-[300px] object-contain object-bottom drop-shadow-2xl relative z-10"
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 8. FOOTER LENGKAP & PROFESIONAL (MULTI-KOLOM MODERN)      */}
      {/* ========================================================= */}
      <footer id="contact" className="bg-[#0f172a] text-slate-300 relative mt-16 pt-16 pb-12 overflow-hidden border-t border-slate-800">
        
        {/* Glow & Hiasan Geometris */}
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full border-[18px] border-emerald-500/20 opacity-50 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Main Footer Grid (5 Kolom Lengkap) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
            
            {/* Kolom 1 & 2: Identitas Brand & Misi */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/10 rounded-2xl p-1.5 flex items-center justify-center border border-white/15">
                  <img
                    src="/WajahMaskot2.png"
                    alt="Prediabeat"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-2xl font-black text-white tracking-tight">
                  Prediabeat
                </span>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
                Platform digital health berbasis kecerdasan buatan untuk deteksi dini, edukasi nutrisi klinis 3J, dan pendampingan pencegahan Diabetes Melitus Tipe 2 di Indonesia.
              </p>

              <div className="pt-2 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Standar PERKENI & Kemenkes
                </span>
              </div>
            </div>

            {/* Kolom 3: Fitur & Layanan */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Fitur Utama
              </h4>
              <ul className="space-y-2 text-sm text-slate-400 font-medium">
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors">
                    Skrining GDP & HbA1c
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors">
                    Meal Plan 3J Harian
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors">
                    Database Bahan Rendah GI
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors">
                    Konsultasi Dr. Predi AI
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition-colors">
                    Progress & Health Score
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kolom 4: Edukasi & Pedoman */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Edukasi Nutrisi
              </h4>
              <ul className="space-y-2 text-sm text-slate-400 font-medium">
                <li>
                  <a href="#faq" className="hover:text-emerald-400 transition-colors">
                    Apa Itu Prediabetes?
                  </a>
                </li>
                <li>
                  <a href="#fitur" className="hover:text-emerald-400 transition-colors">
                    Metode 3J (PERKENI)
                  </a>
                </li>
                <li>
                  <a href="#cara-kerja" className="hover:text-emerald-400 transition-colors">
                    Alur Skrining Klinis
                  </a>
                </li>
                <li>
                  <a href="#aplikasi" className="hover:text-emerald-400 transition-colors">
                    Unduh Aplikasi Android
                  </a>
                </li>
                <li>
                  <Link to="/login" className="hover:text-emerald-400 transition-colors">
                    Masuk ke Akun Anda
                  </Link>
                </li>
              </ul>
            </div>

            {/* Kolom 5: Riset & Kontak */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Kontak & Riset
              </h4>
              <div className="space-y-2.5 text-sm text-slate-400 font-medium">
                <p className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>Jl. Sangkuriang, Dago, Kecamatan Coblong, Kota Bandung, Jawa Barat 40135</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <a href="mailto:support@prediabeat.com" className="hover:text-emerald-400 transition-colors">
                    support@prediabeat.com
                  </a>
                </p>
                <div className="pt-2">
                  <span className="text-xs text-slate-500 font-semibold block">
                    Bantuan Pengguna:
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    Senin – Jumat (08.00 – 17.00 WIB)
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bar: Disclaimer & Copyright */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <p>
              &copy; {new Date().getFullYear()} <strong>PrediaBeat</strong>. Seluruh Hak Cipta Dilindungi Undang-Undang.
            </p>
            <p className="text-slate-400 text-center md:text-right max-w-xl text-[11px] leading-relaxed">
              *Disclaimer Medis: PrediaBeat adalah alat bantu skrining dan manajemen pola makan digital. Untuk diagnosis medis pasti dan terapi farmakologis, selalu konsultasikan dengan dokter spesialis Anda.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}
