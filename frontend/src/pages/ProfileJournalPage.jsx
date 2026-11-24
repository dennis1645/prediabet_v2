import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  BookOpen,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Activity,
  Sparkles,
  FileText,
  Save,
} from "lucide-react";
import { showSuccessAlert, showErrorAlert, showToast } from "../utils/alerts";

const JOURNAL_CHAPTERS = [
  {
    id: 0,
    num: "01",
    tab: "Identitas Akun",
    title: "Identitas & Kontak",
    subtitle: "Catatan nama panggilan, alamat email aktif, serta nomor WhatsApp pengingat harian.",
    icon: User,
  },
  {
    id: 1,
    num: "02",
    tab: "Keamanan & Sandi",
    title: "Keamanan Akun",
    subtitle: "Perbarui kata sandi secara berkala untuk menjaga privasi data rekam medis Anda.",
    icon: Lock,
  },
  {
    id: 2,
    num: "03",
    tab: "Catatan Klinis 3J",
    title: "Preferensi & Data Fisik",
    subtitle: "Atur jumlah makan harian Anda dan periksa ringkasan profil kesehatan terkini.",
    icon: Activity,
  },
];

const MEAL_FREQ_CHOICES = [
  { id: "normal_3j", title: "3x Utama + 2x Selingan", desc: "Pola Seimbang 3J Standar" },
  { id: "3_kali", title: "3x Makan Utama", desc: "Tanpa camilan selingan" },
  { id: "2_kali", title: "2x Utama + 1x Selingan", desc: "Cocok untuk jendela 16/8" },
  { id: "2_kali_ketat", title: "2x Makan Utama", desc: "Intensitas ringan tanpa selingan" },
];

export default function ProfileJournalPage() {
  const { user, profile, analysis, setAnalysis, setProfile, updateAccount } = useAuth();

  const [activePage, setActivePage] = useState(0);
  const [slideDir, setSlideDir] = useState("next");
  const touchStartX = useRef(null);

  // Halaman 1: Identitas
  const [nama, setNama] = useState(profile?.nama || user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || profile?.phone_number || "");
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Halaman 2: Keamanan & Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Halaman 3: Frekuensi Makan
  const [savingFreq, setSavingFreq] = useState(false);

  const goToPage = (nextIdx) => {
    if (nextIdx === activePage || nextIdx < 0 || nextIdx >= JOURNAL_CHAPTERS.length) return;
    setSlideDir(nextIdx > activePage ? "next" : "prev");
    setActivePage(nextIdx);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) < 45) return;
    if (diff < 0 && activePage < JOURNAL_CHAPTERS.length - 1) {
      goToPage(activePage + 1);
    } else if (diff > 0 && activePage > 0) {
      goToPage(activePage - 1);
    }
  };

  const handleSaveIdentity = async (e) => {
    e.preventDefault();
    if (nama.trim().length < 3) {
      showErrorAlert("Validasi Nama", "Nama minimal 3 karakter.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      showErrorAlert("Validasi Email", "Format alamat email tidak valid.");
      return;
    }
    setSavingIdentity(true);
    try {
      const res = await updateAccount({
        nama: nama.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
      });
      await showSuccessAlert("Jurnal Diperbarui", res.message || "Identitas akun berhasil disimpan.");
    } catch (err) {
      showErrorAlert("Gagal Menyimpan", err.message || "Tidak dapat memperbarui identitas akun.");
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      showErrorAlert("Verifikasi Diperlukan", "Masukkan password saat ini terlebih dahulu.");
      return;
    }
    if (newPassword.length < 8) {
      showErrorAlert("Password Terlalu Pendek", "Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorAlert("Konfirmasi Tidak Cocok", "Password baru dan konfirmasi password harus sama.");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await updateAccount({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await showSuccessAlert("Password Diperbarui", res.message || "Kata sandi baru Anda sudah aktif.");
    } catch (err) {
      showErrorAlert("Gagal Mengganti Password", err.message || "Password saat ini tidak sesuai.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSelectMealFreq = async (freqId) => {
    setSavingFreq(true);
    try {
      const res = await api.updateMealFrequency(freqId);
      if (res.success && res.data?.analysis) {
        setAnalysis(res.data.analysis);
        if (res.data.profile) setProfile(res.data.profile);
        showToast(res.message || "Frekuensi makan berhasil diperbarui!", "success");
      }
    } catch (err) {
      showToast(err.message || "Gagal memperbarui frekuensi makan.", "error");
    } finally {
      setSavingFreq(false);
    }
  };

  const formatName = (val) =>
    (val || "Sahabat Sehat")
      .replace(/[_.-]+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const currentChapter = JOURNAL_CHAPTERS[activePage];
  const ChapterIcon = currentChapter.icon;

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-[#F4F1EA]">
      <div className="max-w-5xl mx-auto">
        {/* Header Jurnal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/10 text-emerald-900 text-xs font-extrabold uppercase tracking-wider mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Jurnal Profil Pribadi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Buku Catatan Kesehatan &amp; Akun
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Geser halaman atau pilih pembatas buku di bawah untuk memperbarui identitas, sandi, dan pola makan Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/80 px-3.5 py-2 rounded-2xl border border-stone-200 shadow-2xs self-start sm:self-auto">
            <span>Halaman {activePage + 1} / {JOURNAL_CHAPTERS.length}</span>
          </div>
        </div>

        {/* Bookmark Tabs (Pembatas Buku) */}
        <div className="flex flex-wrap gap-2 mb-4" role="tablist" aria-label="Bab Jurnal Profil">
          {JOURNAL_CHAPTERS.map((ch) => {
            const isActive = ch.id === activePage;
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => goToPage(ch.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-2xl rounded-b-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
                  isActive
                    ? "bg-[#FCFBF7] text-emerald-900 border-stone-300 shadow-sm -translate-y-0.5 border-b-emerald-600 border-b-2"
                    : "bg-[#EAE5D9]/80 text-slate-600 border-stone-300/60 hover:bg-[#FCFBF7]/70"
                }`}
              >
                <span className="text-[10px] font-black opacity-60">{ch.num}</span>
                <Icon className="w-4 h-4 text-emerald-700" />
                <span>{ch.tab}</span>
              </button>
            );
          })}
        </div>

        {/* Open Two-Page Journal Spread */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative rounded-[2rem] bg-[#FCFBF7] border border-stone-300/90 shadow-[0_24px_60px_-20px_rgba(30,41,59,0.22),0_4px_12px_rgba(30,41,59,0.06)] overflow-hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(16, 185, 129, 0.06) 32px)",
          }}
        >
          {/* Animated Page Container */}
          <div
            key={activePage}
            className="grid grid-cols-1 md:grid-cols-[0.88fr_1.12fr] min-h-[470px] transition-all duration-300 ease-out animate-fade-in"
            style={{
              animation: `${slideDir === "next" ? "journalSlideNext" : "journalSlidePrev"} 240ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            {/* LEFT PAGE: Ringkasan Bab & Stempel Identitas */}
            <div className="p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#F7F4EB] to-[#EFEAE0] border-b md:border-b-0 md:border-r border-stone-300/80 relative flex flex-col justify-between">
              {/* Spine highlight */}
              <div className="hidden md:block absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-stone-400/15 to-transparent pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xs font-black tracking-widest uppercase text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200/80">
                    Bab {currentChapter.num}
                  </span>
                  <span className="text-[11px] font-bold text-stone-500">PrediaBeat Journal</span>
                </div>

                <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-md mb-5">
                  <ChapterIcon className="w-7 h-7" />
                </div>

                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                  {currentChapter.title}
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {currentChapter.subtitle}
                </p>

                {/* Stamp Card: Ringkasan Pemilik Jurnal */}
                <div className="rounded-2xl bg-white/85 border border-stone-200/90 p-4 space-y-2.5 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black flex items-center justify-center uppercase">
                      {formatName(user?.username)[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 truncate">
                        {formatName(profile?.nama || user?.username)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || "-"}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-stone-400 block text-[10px] font-bold uppercase">Target Kalori</span>
                      <span className="font-extrabold text-slate-800">
                        {analysis?.target_kalori ? `${analysis.target_kalori} kkal` : "Belum dihitung"}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] font-bold uppercase">Diet Aktif</span>
                      <span className="font-extrabold text-emerald-700 truncate block">
                        {analysis?.active_diet_label || "Pola Seimbang 3J"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-300/60 flex items-center gap-2 text-xs text-stone-500 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Tersimpan aman &amp; langsung tersinkron ke Dr. Predi</span>
              </div>
            </div>

            {/* RIGHT PAGE: Form Aktif */}
            <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
              {activePage === 0 && (
                <form onSubmit={handleSaveIdentity} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Ubah Identitas Akun</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Perubahan nama, email, dan WhatsApp akan langsung tampil di Dashboard &amp; Dr. Predi.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="journal-nama" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Lengkap
                    </label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-nama"
                        type="text"
                        required
                        autoComplete="name"
                        value={nama}
                        onChange={(e) => setNama(e.target.value)}
                        placeholder="Masukkan nama Anda"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="journal-email" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Email
                    </label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-email"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="journal-wa" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nomor WhatsApp <span className="text-stone-400 font-normal lowercase">(opsional)</span>
                    </label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-wa"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingIdentity}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingIdentity ? "Menyimpan..." : "Simpan Identitas"}</span>
                  </button>
                </form>
              )}

              {activePage === 1 && (
                <form onSubmit={handleSavePassword} className="space-y-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Ganti Kata Sandi</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gunakan minimal 8 karakter kombinasi huruf dan angka demi keamanan akun medis Anda.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="journal-cur-pw" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password Saat Ini
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-cur-pw"
                        type={showCurrent ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Masukkan password saat ini"
                        className="w-full pl-10 pr-10 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent((v) => !v)}
                        aria-label="Tampilkan password saat ini"
                        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="journal-new-pw" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Password Baru
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-new-pw"
                        type={showNew ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 8 karakter"
                        className="w-full pl-10 pr-10 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew((v) => !v)}
                        aria-label="Tampilkan password baru"
                        className="absolute right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="journal-confirm-pw" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Konfirmasi Password Baru
                    </label>
                    <div className="relative flex items-center">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        id="journal-confirm-pw"
                        type={showNew ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    <Lock className="w-4 h-4" />
                    <span>{savingPassword ? "Memperbarui..." : "Perbarui Password"}</span>
                  </button>
                </form>
              )}

              {activePage === 2 && (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Frekuensi Makan &amp; Data Klinis</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih berapa kali Anda makan dalam sehari. Slot rencana makan di Dashboard akan otomatis menyesuaikan.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Frekuensi Makan Harian</span>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MEAL_FREQ_CHOICES.map((opt) => {
                        const selected = (analysis?.meal_frequency || "normal_3j") === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={savingFreq}
                            onClick={() => handleSelectMealFreq(opt.id)}
                            className={`text-left p-3.5 rounded-xl border transition cursor-pointer ${
                              selected
                                ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                                : "bg-white text-slate-800 border-stone-300 hover:border-emerald-500"
                            }`}
                          >
                            <div className="text-xs font-extrabold">{opt.title}</div>
                            <div className={`text-[11px] mt-0.5 ${selected ? "text-emerald-100" : "text-slate-500"}`}>
                              {opt.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-amber-700" />
                        <span>Data Fisik, Lab &amp; Pantangan Alergi</span>
                      </p>
                      <p className="text-xs text-amber-800/90 mt-1">
                        Berat badan, tinggi, hasil HbA1c/GDP, serta daftar alergen dapat diperbarui lengkap lewat Kuesioner Klinis.
                      </p>
                    </div>
                    <Link
                      to="/questionnaire"
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold text-center transition"
                    >
                      Buka Kuesioner Klinis
                    </Link>
                  </div>
                </div>
              )}

              {/* Bottom Page Flip Navigation */}
              <div className="mt-8 pt-5 border-t border-stone-200/80 flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={activePage === 0}
                  onClick={() => goToPage(activePage - 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-slate-700 hover:bg-stone-50 disabled:opacity-35 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Halaman Sebelumnya</span>
                </button>

                <div className="flex items-center gap-1.5">
                  {JOURNAL_CHAPTERS.map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      aria-label={`Ke halaman ${ch.id + 1}`}
                      onClick={() => goToPage(ch.id)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        ch.id === activePage ? "w-6 bg-emerald-700" : "w-2 bg-stone-300 hover:bg-stone-400"
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  disabled={activePage === JOURNAL_CHAPTERS.length - 1}
                  onClick={() => goToPage(activePage + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold disabled:opacity-35 cursor-pointer"
                >
                  <span>Halaman Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyframe animasi balik halaman jurnal */}
      <style>{`
        @keyframes journalSlideNext {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes journalSlidePrev {
          from { opacity: 0; transform: translateX(-18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
