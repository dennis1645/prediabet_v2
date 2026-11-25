import React, { useState, useRef, useEffect } from "react";
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
  ShieldAlert,
  Clock,
  Activity,
  FileText,
  Save,
  Plus,
  X,
  Check,
  Minus,
  Bell,
  Copy,
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
    tab: "Frekuensi Makan 3J",
    title: "Preferensi Jadwal Makan",
    subtitle: "Bebas atur jumlah makan utama (1–3x) dan selingan (0–3x) sesuai ritme harian Anda.",
    icon: Clock,
  },
  {
    id: 3,
    num: "04",
    tab: "Alergi & Komorbid",
    title: "Alergi & Kondisi Klinis",
    subtitle: "Catat pantangan alergi dan riwayat penyakit penyerta agar Dr. Predi & Meal Plan 100% aman.",
    icon: ShieldAlert,
  },
  {
    id: 4,
    num: "05",
    tab: "Pengingat WhatsApp",
    title: "Notifikasi & Bot WhatsApp",
    subtitle: "Atur jadwal pengingat jam makan, minum obat, dan olahraga otomatis via Bot WhatsApp.",
    icon: Bell,
  },
];

const PRESET_PANTANGAN = [
  { label: "Tidak Ada", value: "Tidak Ada" },
  { label: "Kacang-kacangan", value: "Kacang" },
  { label: "Seafood & Udang", value: "Seafood" },
  { label: "Telur", value: "Telur" },
  { label: "Susu & Laktosa", value: "Susu" },
  { label: "Daging Sapi", value: "Daging Sapi" },
  { label: "Santan", value: "Santan" },
  { label: "Gluten / Terigu", value: "Gluten" },
  { label: "Gorengan", value: "Gorengan" },
];

const PRESET_KOMORBID = [
  { label: "Tidak Ada", value: "Tidak Ada" },
  { label: "Hipertensi", value: "Hipertensi" },
  { label: "Kolesterol Tinggi", value: "Kolesterol" },
  { label: "Asam Urat", value: "Asam Urat" },
  { label: "PCOS", value: "PCOS" },
  { label: "Penyakit Jantung", value: "Jantung" },
  { label: "Fatty Liver", value: "Fatty Liver" },
];

const parseList = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((s) => String(s).trim()).filter(Boolean);
  return String(val).split(",").map((s) => s.trim()).filter(Boolean);
};

export default function ProfileJournalPage() {
  const { user, profile, analysis, setAnalysis, setProfile, updateAccount, updateProfileAndAnalysis } = useAuth();

  const [activePage, setActivePage] = useState(0);
  const [slideDir, setSlideDir] = useState("next");
  const touchStartX = useRef(null);

  // Bab 1: Identitas
  const [nama, setNama] = useState(profile?.nama || user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || profile?.phone_number || "");
  const [savingIdentity, setSavingIdentity] = useState(false);

  // Bab 2: Keamanan & Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Bab 3: Frekuensi Makan Fleksibel (1-3 makan utama, 0-3 selingan)
  const parseInitialFreq = () => {
    const f = analysis?.meal_frequency || profile?.meal_frequency || "normal_3j";
    if (typeof f === "string" && f.startsWith("custom_")) {
      const parts = f.split("_");
      return {
        main: Math.max(1, Math.min(3, parseInt(parts[1], 10) || 3)),
        snacks: Math.max(0, Math.min(3, parseInt(parts[2], 10) ?? 2)),
      };
    }
    if (f === "3_kali") return { main: 3, snacks: 0 };
    if (f === "2_kali") return { main: 2, snacks: 1 };
    if (f === "2_kali_ketat") return { main: 2, snacks: 0 };
    return { main: 3, snacks: 2 };
  };
  const initFreq = parseInitialFreq();
  const [mainMeals, setMainMeals] = useState(initFreq.main);
  const [snacks, setSnacks] = useState(initFreq.snacks);
  const [savingFreq, setSavingFreq] = useState(false);

  // Bab 4: Alergi & Komorbiditas
  const [selectedPantangan, setSelectedPantangan] = useState(() => parseList(profile?.pantangan_alergi || profile?.pantangan_makanan));
  const [selectedKomorbid, setSelectedKomorbid] = useState(() => parseList(profile?.komorbiditas || profile?.riwayat_kondisi_kesehatan));
  const [customPantangan, setCustomPantangan] = useState("");
  const [customKomorbid, setCustomKomorbid] = useState("");
  const [savingClinical, setSavingClinical] = useState(false);

  // Bab 5: Pengingat & Bot WhatsApp
  const [waSettings, setWaSettings] = useState({
    phone_number: user?.phone_number || profile?.phone_number || "",
    enabled: false,
    breakfast_time: "07:00",
    snack_time: "15:30",
    lunch_time: "12:30",
    dinner_time: "18:30",
    medicine_enabled: false,
    medicine_time: "08:00",
    medicine_note: "Obat / Suplemen Harian",
    exercise_enabled: false,
    exercise_time: "17:00",
    bot_linked: false,
    link_code: "",
  });
  const [savingWa, setSavingWa] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.getWaReminders()
      .then((res) => {
        if (mounted && res?.success && res.data) {
          setWaSettings((prev) => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveWaReminders = async (e) => {
    e.preventDefault();
    setSavingWa(true);
    try {
      const res = await api.saveWaReminders(waSettings);
      if (res?.success && res.data) {
        setWaSettings((prev) => ({ ...prev, ...res.data }));
      }
      await showSuccessAlert("Pengingat Tersimpan", res?.message || "Jadwal pengingat WhatsApp berhasil disimpan.");
    } catch (err) {
      showErrorAlert("Gagal Menyimpan", err.message || "Tidak dapat menyimpan pengaturan pengingat WhatsApp.");
    } finally {
      setSavingWa(false);
    }
  };

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

  const handleSaveMealFreq = async () => {
    setSavingFreq(true);
    try {
      const res = await api.updateMealFrequency({ mainMeals, snacks });
      if (res.success && res.data?.analysis) {
        setAnalysis(res.data.analysis);
        if (res.data.profile) setProfile(res.data.profile);
        await showSuccessAlert(
          "Jadwal Makan Diperbarui",
          `Pola makan Anda diatur ke ${mainMeals}x makan utama + ${snacks}x selingan dan meal plan Dashboard telah disesuaikan.`
        );
      }
    } catch (err) {
      showErrorAlert("Gagal Menyimpan", err.message || "Gagal memperbarui frekuensi makan.");
    } finally {
      setSavingFreq(false);
    }
  };

  const toggleChip = (val, currentList, setter) => {
    if (val === "Tidak Ada") {
      setter(["Tidak Ada"]);
      return;
    }
    const filtered = currentList.filter((item) => item !== "Tidak Ada");
    if (filtered.includes(val)) {
      setter(filtered.filter((item) => item !== val));
    } else {
      setter([...filtered, val]);
    }
  };

  const handleAddCustomPantangan = (e) => {
    if (e) e.preventDefault();
    const clean = customPantangan.trim();
    if (clean && !selectedPantangan.includes(clean)) {
      setSelectedPantangan((prev) => [...prev.filter((p) => p !== "Tidak Ada"), clean]);
      setCustomPantangan("");
    }
  };

  const handleAddCustomKomorbid = (e) => {
    if (e) e.preventDefault();
    const clean = customKomorbid.trim();
    if (clean && !selectedKomorbid.includes(clean)) {
      setSelectedKomorbid((prev) => [...prev.filter((k) => k !== "Tidak Ada"), clean]);
      setCustomKomorbid("");
    }
  };

  const handleSaveClinicalLists = async () => {
    setSavingClinical(true);
    try {
      const cleanPantangan = selectedPantangan.filter((p) => p !== "Tidak Ada");
      const cleanKomorbid = selectedKomorbid.filter((k) => k !== "Tidak Ada");
      const updatedPayload = {
        ...(profile || {}),
        pantangan_alergi: cleanPantangan,
        komorbiditas: cleanKomorbid,
      };
      await updateProfileAndAnalysis(updatedPayload);
      await showSuccessAlert(
        "Catatan Klinis Tersimpan!",
        "Alergi/pantangan dan komorbiditas Anda berhasil diperbarui. Dr. Predi dan Meal Plan langsung menyesuaikannya."
      );
    } catch (err) {
      showErrorAlert("Gagal Menyimpan", err.message || "Gagal menyimpan alergi & komorbiditas.");
    } finally {
      setSavingClinical(false);
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
              Geser halaman atau pilih pembatas buku di bawah untuk memperbarui identitas, sandi, jadwal makan, serta alergi &amp; komorbiditas Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 bg-white/80 px-3.5 py-2 rounded-2xl border border-stone-200 shadow-2xs self-start sm:self-auto">
            <span>Halaman {activePage + 1} / {JOURNAL_CHAPTERS.length}</span>
          </div>
        </div>

        {/* Bookmark Tabs */}
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
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-2xl rounded-b-lg text-xs sm:text-sm font-extrabold transition-all cursor-pointer border ${
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
          <div
            key={activePage}
            className="grid grid-cols-1 md:grid-cols-[0.86fr_1.14fr] min-h-[490px]"
            style={{
              animation: `${slideDir === "next" ? "journalSlideNext" : "journalSlidePrev"} 240ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          >
            {/* LEFT PAGE */}
            <div className="p-6 sm:p-8 lg:p-10 bg-gradient-to-br from-[#F7F4EB] to-[#EFEAE0] border-b md:border-b-0 md:border-r border-stone-300/80 relative flex flex-col justify-between">
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
                      <span className="text-stone-400 block text-[10px] font-bold uppercase">Alergi Aktif</span>
                      <span className="font-extrabold text-rose-700 truncate block">
                        {selectedPantangan.filter((p) => p !== "Tidak Ada").length > 0
                          ? selectedPantangan.filter((p) => p !== "Tidak Ada").join(", ")
                          : "Tidak ada"}
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

            {/* RIGHT PAGE */}
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
                    <h3 className="text-lg font-extrabold text-slate-900">Atur Frekuensi Makan Bebas</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Minimal <strong>1x makan utama &amp; 0x selingan</strong>, maksimal <strong>3x makan utama &amp; 3x selingan</strong>. Kalori harian akan dibagi otomatis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-stone-300 space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Makan Utama / Hari
                      </span>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setMainMeals((m) => Math.max(1, m - 1))}
                          disabled={mainMeals <= 1}
                          aria-label="Kurangi makan utama"
                          className="w-10 h-10 rounded-xl border border-stone-300 flex items-center justify-center text-slate-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                          <div className="text-2xl font-black text-emerald-800">{mainMeals}x</div>
                          <div className="text-[11px] text-slate-500">Min 1 · Max 3</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMainMeals((m) => Math.min(3, m + 1))}
                          disabled={mainMeals >= 3}
                          aria-label="Tambah makan utama"
                          className="w-10 h-10 rounded-xl border border-stone-300 flex items-center justify-center text-slate-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-stone-300 space-y-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                        Selingan / Camilan
                      </span>
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSnacks((s) => Math.max(0, s - 1))}
                          disabled={snacks <= 0}
                          aria-label="Kurangi selingan"
                          className="w-10 h-10 rounded-xl border border-stone-300 flex items-center justify-center text-slate-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center">
                          <div className="text-2xl font-black text-teal-700">{snacks}x</div>
                          <div className="text-[11px] text-slate-500">Min 0 · Max 3</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSnacks((s) => Math.min(3, s + 1))}
                          disabled={snacks >= 3}
                          aria-label="Tambah selingan"
                          className="w-10 h-10 rounded-xl border border-stone-300 flex items-center justify-center text-slate-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-900">
                    Ringkasan Jadwal: {mainMeals}x Makan Utama + {snacks}x Selingan ({mainMeals + snacks} slot waktu makan di Dashboard)
                  </div>

                  <button
                    type="button"
                    disabled={savingFreq}
                    onClick={handleSaveMealFreq}
                    className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingFreq ? "Menyimpan..." : "Simpan Frekuensi Makan"}</span>
                  </button>
                </div>
              )}

              {activePage === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">Alergi &amp; Penyakit Komorbiditas</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ubah pantangan alergi atau riwayat penyakit penyerta kapan saja. Dr. Predi otomatis memblokir makanan pemicu.
                    </p>
                  </div>

                  {/* Alergi / Pantangan */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Pantangan &amp; Alergi Makanan
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_PANTANGAN.map((item) => {
                        const active = selectedPantangan.includes(item.value);
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => toggleChip(item.value, selectedPantangan, setSelectedPantangan)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                              active
                                ? "bg-rose-600 text-white border-rose-600"
                                : "bg-white text-slate-700 border-stone-300 hover:bg-rose-50"
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPantangan}
                        onChange={(e) => setCustomPantangan(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCustomPantangan(e)}
                        placeholder="Tambah alergi lain (misal: Kerang, Udang)..."
                        className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPantangan}
                        className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                    {selectedPantangan.filter((p) => !PRESET_PANTANGAN.some((pr) => pr.value === p)).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedPantangan
                          .filter((p) => !PRESET_PANTANGAN.some((pr) => pr.value === p))
                          .map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 text-xs font-bold"
                            >
                              {p}
                              <button
                                type="button"
                                onClick={() => setSelectedPantangan((prev) => prev.filter((x) => x !== p))}
                                className="cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Komorbiditas */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Riwayat Penyakit Penyerta (Komorbiditas)
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {PRESET_KOMORBID.map((item) => {
                        const active = selectedKomorbid.includes(item.value);
                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => toggleChip(item.value, selectedKomorbid, setSelectedKomorbid)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1 ${
                              active
                                ? "bg-teal-700 text-white border-teal-700"
                                : "bg-white text-slate-700 border-stone-300 hover:bg-teal-50"
                            }`}
                          >
                            {active && <Check className="w-3 h-3" />}
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customKomorbid}
                        onChange={(e) => setCustomKomorbid(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddCustomKomorbid(e)}
                        placeholder="Tambah kondisi lain (misal: GERD, Maag)..."
                        className="flex-1 px-3 py-2 bg-white border border-stone-300 rounded-xl text-xs font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomKomorbid}
                        className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      disabled={savingClinical}
                      onClick={handleSaveClinicalLists}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-4 h-4" />
                      <span>{savingClinical ? "Menyimpan..." : "Simpan Alergi & Komorbid"}</span>
                    </button>

                    <Link
                      to="/questionnaire"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-extrabold transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Edit Data Fisik &amp; Lab</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* BAB 05: PENGINGAT & BOT WHATSAPP */}
              {activePage === 4 && (
                <form onSubmit={handleSaveWaReminders} className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <div>
                      <p className="text-xs font-black text-emerald-900 uppercase tracking-wider">Aktifkan Pengingat WhatsApp</p>
                      <p className="text-[11px] text-emerald-800 mt-0.5">Kirim pengingat jam makan, obat, dan olahraga otomatis ke WA Anda.</p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={waSettings.enabled}
                        onChange={(e) => setWaSettings((p) => ({ ...p, enabled: e.target.checked }))}
                        className="w-5 h-5 accent-emerald-600 rounded cursor-pointer"
                      />
                      <span className="text-xs font-extrabold text-emerald-900">
                        {waSettings.enabled ? "Aktif" : "Nonaktif"}
                      </span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Nomor WhatsApp Tujuan
                    </label>
                    <input
                      type="tel"
                      value={waSettings.phone_number}
                      onChange={(e) => setWaSettings((p) => ({ ...p, phone_number: e.target.value }))}
                      placeholder="08xxxxxxxxxx / 628xxxxxxxxxx"
                      className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-semibold text-slate-800"
                    />
                  </div>

                  {/* Jadwal Jam Makan */}
                  <div className="p-4 rounded-2xl bg-white border border-stone-200">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Jadwal Pengingat Jam Makan (WIB)</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sarapan</label>
                        <input
                          type="time"
                          value={waSettings.breakfast_time}
                          onChange={(e) => setWaSettings((p) => ({ ...p, breakfast_time: e.target.value }))}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Makan Siang</label>
                        <input
                          type="time"
                          value={waSettings.lunch_time}
                          onChange={(e) => setWaSettings((p) => ({ ...p, lunch_time: e.target.value }))}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selingan</label>
                        <input
                          type="time"
                          value={waSettings.snack_time}
                          onChange={(e) => setWaSettings((p) => ({ ...p, snack_time: e.target.value }))}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Makan Malam</label>
                        <input
                          type="time"
                          value={waSettings.dinner_time}
                          onChange={(e) => setWaSettings((p) => ({ ...p, dinner_time: e.target.value }))}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pengingat Obat & Olahraga */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Pengingat Minum Obat</span>
                        <input
                          type="checkbox"
                          checked={waSettings.medicine_enabled}
                          onChange={(e) => setWaSettings((p) => ({ ...p, medicine_enabled: e.target.checked }))}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="time"
                        value={waSettings.medicine_time}
                        onChange={(e) => setWaSettings((p) => ({ ...p, medicine_time: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                      <input
                        type="text"
                        value={waSettings.medicine_note}
                        onChange={(e) => setWaSettings((p) => ({ ...p, medicine_note: e.target.value }))}
                        placeholder="Nama obat / vitamin..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-stone-200 rounded-xl text-xs font-semibold"
                      />
                    </div>

                    <div className="p-4 rounded-2xl bg-white border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">Pengingat Olahraga</span>
                        <input
                          type="checkbox"
                          checked={waSettings.exercise_enabled}
                          onChange={(e) => setWaSettings((p) => ({ ...p, exercise_enabled: e.target.checked }))}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                        />
                      </div>
                      <input
                        type="time"
                        value={waSettings.exercise_time}
                        onChange={(e) => setWaSettings((p) => ({ ...p, exercise_time: e.target.value }))}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-stone-200 rounded-xl text-xs font-bold"
                      />
                      <p className="text-[11px] text-slate-500">Pengingat harian jalan santai / olahraga ringan 20–30 menit.</p>
                    </div>
                  </div>

                  {/* Integrasi Bot WhatsApp (WAHA / Baileys) */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-950">Koneksi Bot WhatsApp (WAHA / Baileys)</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${waSettings.bot_linked ? "bg-emerald-100 text-emerald-800" : "bg-amber-200 text-amber-900"}`}>
                          {waSettings.bot_linked ? "Terhubung" : "Menunggu Tautan"}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900 mt-1">
                        Kirim pesan <code className="bg-white px-1.5 py-0.5 rounded font-bold">LINK {waSettings.link_code || "PB-..."}</code> ke Bot WhatsApp PrediaBeat untuk verifikasi nomor Anda.
                      </p>
                    </div>
                    {waSettings.link_code && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`LINK ${waSettings.link_code}`);
                          showToast("Kode tautan WhatsApp disalin!", "success");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-extrabold hover:bg-amber-100 transition cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={savingWa}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm shadow-sm transition cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingWa ? "Menyimpan..." : "Simpan Pengaturan Pengingat WA"}</span>
                  </button>
                </form>
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
