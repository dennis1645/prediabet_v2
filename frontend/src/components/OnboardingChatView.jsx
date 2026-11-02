import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../utils/alerts";
import Swal from "sweetalert2";
import { marked } from "marked";
import {
  Send,
  Sparkles,
  Check,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  User,
  Activity,
  Flame,
  Heart,
  ArrowRight,
  Award,
  CheckCircle2,
  Info,
  Calendar,
  Utensils,
  Moon,
  Smile,
  Zap,
} from "lucide-react";

const SECTION_ICONS = {
  "IDENTITAS RESPONDEN": User,
  "DATA TUBUH (ANTROPOMETRI)": Activity,
  "RIWAYAT KESEHATAN": Heart,
  "POLA MAKAN": Utensils,
  "AKTIVITAS FISIK": Zap,
  "POLA TIDUR": Moon,
  "STRES & KESEHATAN MENTAL": Smile,
  "KEBIASAAN SEHARI-HARI": Calendar,
  "TUJUAN": Award,
  "LITERASI KESEHATAN": Info,
};

const SECTIONS_LIST = [
  "IDENTITAS RESPONDEN",
  "DATA TUBUH (ANTROPOMETRI)",
  "RIWAYAT KESEHATAN",
  "POLA MAKAN",
  "AKTIVITAS FISIK",
  "POLA TIDUR",
  "STRES & KESEHATAN MENTAL",
  "KEBIASAAN SEHARI-HARI",
  "TUJUAN",
  "LITERASI KESEHATAN",
];

export default function OnboardingChatView({ onFinished, allowBack = false, onBackToChat }) {
  const { user, profile, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [onboardingState, setOnboardingState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedMulti, setSelectedMulti] = useState([]);
  const [assessmentResult, setAssessmentResult] = useState(null);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, submitting]);

  // Load state on mount
  useEffect(() => {
    loadCurrentState();
  }, []);

  const loadCurrentState = async () => {
    setLoading(true);
    try {
      const res = await api.getOnboardingState();
      if (res.success && res.data) {
        setOnboardingState(res.data);

        if (res.data.is_completed) {
          // If already completed in db
          setAssessmentResult({
            is_completed: true,
            answers: res.data.answers,
          });
        } else {
          // Inisialisasi bubble sambutan / pertanyaan aktif
          const hasPriorAnswers = Object.keys(res.data.answers || {}).length > 0;
          const introContent = hasPriorAnswers
            ? `Halo lagi, **${user?.username || "Sobat Predi"}**! 👋 Senang kamu kembali.\n\nYuk kita lanjutin sesi wawancara intake medis awal kamu. Sedikit lagi selesai kok!\n\n**${res.data.genz_prompt}**`
            : `Halo **${user?.username || "Sobat Predi"}**! Selamat datang di **PrediaBeat V2.0**! 🌟\n\nGue **Dr. Predi**, asisten nutrisi klinis & pencegahan prediabetes pribadi lo.\n\nBiar rekomendasi menu harian dan program pencegahan prediabetes lo beneran akurat dan pas di tubuh lo, kita ngobrol santai dulu ya buat bikin **Rekam Medis Awal** lo.\n\nGak usah tegang, jawab santai & jujur aja ya! Yuk mulai dari pertanyaan pertama:\n\n**${res.data.genz_prompt}**`;

          setMessages([
            {
              role: "assistant",
              content: introContent,
              source: "Dr. Predi Intake AI Engine",
              guardrail: "Standar Klinis PERKENI 2021 & Kemenkes RI",
            },
          ]);
        }
      }
    } catch (err) {
      console.error("Gagal load onboarding state:", err);
      showToast("Gagal memuat sesi wawancara intake.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Kirim jawaban
  const handleAnswer = async (answerValue, messageLabel) => {
    if (submitting) return;
    const userDisplay = messageLabel || String(answerValue);
    if (!userDisplay.trim()) return;

    // Tambahkan pesan user ke thread chat
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userDisplay,
      },
    ]);

    setInputText("");
    setSelectedMulti([]);
    setSubmitting(true);

    try {
      const res = await api.answerOnboarding(answerValue, userDisplay);
      if (res.success && res.data) {
        const data = res.data;

        // 1. Kasus Guardrail: Reaksi Khusus (Defensif, Lupa, Terima Kasih)
        if (data.is_special_reaction) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.bot_reaction,
              source: "Dr. Predi Guardrail AI",
              guardrail: "Empati & Verifikasi Medis",
            },
          ]);
          setSubmitting(false);
          setTimeout(() => inputRef.current?.focus(), 100);
          return;
        }

        // 2. Kasus Selesai (Completed!)
        if (data.is_completed) {
          setAssessmentResult(data);
          setOnboardingState((prev) => ({
            ...prev,
            is_completed: true,
            progress_percent: 100,
          }));

          const celebrationMsg =
            data.message ||
            "Horeee! 🎉 Sesi wawancara intake medis kamu berhasil selesai!\n\nRekam medis klinis awal kamu telah terbentuk rapi di sistem. Sekarang seluruh fitur PrediaBeat (Dashboard, Menu Harian, Diet 3J, dan Progress Tracker) sudah terbuka penuh buat kamu!";

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: celebrationMsg,
              source: "Dr. Predi Clinical Evaluator",
              guardrail: "Pedoman Tata Laksana Prediabetes PERKENI 2021",
            },
          ]);

          // Update context
          if (data.profile && data.analysis) {
            completeOnboarding(data.profile, data.analysis);
            if (onFinished) {
              onFinished(data.profile, data.analysis);
            }
          }

          Swal.fire({
            title: "🎉 Rekam Medis Selesai!",
            text: "Profil nutrisi dan hasil evaluasi klinis kamu telah berhasil disimpan.",
            icon: "success",
            confirmButtonColor: "#059669",
            confirmButtonText: "Lihat Hasil Evaluasi",
            customClass: {
              popup: "rounded-[2rem]",
              confirmButton: "rounded-xl font-bold px-5 py-2.5",
            },
          });

          setSubmitting(false);
          return;
        }

        // 3. Kasus Maju ke Pertanyaan Berikutnya
        const nextState = data.next_state;
        setOnboardingState(nextState);

        const botReply = `${data.bot_feedback || "Keren, jawaban lo udah Predi catet! 👍"}\n\n**${nextState.genz_prompt}**`;

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: botReply,
            source: "Dr. Predi Intake AI Engine",
            guardrail: "Standar Klinis PERKENI 2021",
          },
        ]);
      }
    } catch (err) {
      console.error("Error submit answer:", err);
      showToast(err.message || "Gagal mengirim jawaban.", "error");
    } finally {
      setSubmitting(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Toggle multi-choice option
  const toggleMultiOption = (opt) => {
    setSelectedMulti((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    );
  };

  // Submit multi-choice
  const submitMultiChoice = () => {
    if (selectedMulti.length === 0) {
      showToast("Pilih minimal satu jawaban, atau lewati jika tidak relevan.", "warning");
      return;
    }
    const combined = selectedMulti.join(", ");
    handleAnswer(combined, combined);
  };

  // Reset Onboarding dari Awal
  const handleReset = async () => {
    const confirm = await Swal.fire({
      title: "Ulangi Wawancara Intake?",
      text: "Seluruh jawaban wawancara sebelumnya akan direset dan dimulai kembali dari pertanyaan pertama.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Ulangi dari Awal",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-[2rem]",
        confirmButton: "rounded-xl font-bold px-4 py-2",
        cancelButton: "rounded-xl font-bold px-4 py-2",
      },
    });

    if (confirm.isConfirmed) {
      try {
        setLoading(true);
        const res = await api.resetOnboarding();
        if (res.success && res.data) {
          setOnboardingState(res.data);
          setAssessmentResult(null);
          setMessages([
            {
              role: "assistant",
              content: `Sip! Kita ulangi sesi wawancara dari awal ya **${user?.username || "Sobat"}**.\n\nPertanyaan pertama:\n\n**${res.data.genz_prompt}**`,
              source: "Dr. Predi Intake AI Engine",
              guardrail: "Standar Klinis PERKENI 2021",
            },
          ]);
          showToast("Sesi wawancara berhasil diulang.", "success");
        }
      } catch (err) {
        showToast("Gagal mengulang wawancara.", "error");
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 animate-bounce mb-4 shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-base font-extrabold text-slate-800">
          Menyiapkan Wawancara Intake Medis...
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Menghubungkan ke Dr. Predi Clinical AI Engine untuk analisis prediabetes personal.
        </p>
      </div>
    );
  }

  // Jika Selesai: Tampilkan Kartu Evaluasi Rekam Medis Lengkap
  if (assessmentResult && assessmentResult.is_completed) {
    const analysis = assessmentResult.analysis || {};
    const profileData = assessmentResult.profile || assessmentResult.answers || {};

    return (
      <div className="max-w-4xl mx-auto py-6 px-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-[2.5rem] border border-emerald-100 p-6 sm:p-10 shadow-[0_20px_60px_rgb(0,0,0,0.06)] relative overflow-hidden">
          {/* Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

          {/* Top Badge */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-md shadow-emerald-600/10 overflow-hidden">
                <img src="/WajahMaskot2.png" alt="Dr. Predi" className="w-full h-full object-contain p-1" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Rekam Medis Terverifikasi
                  </span>
                  <span className="text-xs text-slate-400">PrediaBeat V2.0</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  Hasil Evaluasi Klinis & Nutrisi Awal
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Atas Nama: <strong className="text-slate-800">{profileData.nama || user?.username}</strong> • Standar PERKENI 2021 & Kemenkes RI
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 px-3.5 py-2 rounded-xl transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Perbarui Data Kuesioner</span>
            </button>
          </div>

          {/* 4 Highlight Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
            {/* BMI Card */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border border-emerald-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                  Indeks Massa Tubuh
                </span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-2">
                {analysis.bmi || "-"}
              </div>
              <div className="mt-1">
                <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md">
                  {analysis.kategori_bmi || analysis.bmi_category || "Normal (Asia-Pasifik)"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                BB: {profileData.berat_badan || "-"} kg • TB: {profileData.tinggi_badan || "-"} cm
              </p>
            </div>

            {/* Prediabetes Risk Card */}
            <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/40 border border-amber-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  Skor Risiko Prediabetes
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-950 mt-2">
                {analysis.skor_risiko ?? 0} <span className="text-xs font-normal text-amber-700">poin</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                  {analysis.kategori_risiko || "Risiko Rendah / Terkendali"}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Berdasarkan 61 parameter klinis & gaya hidup
              </p>
            </div>

            {/* Daily Calorie Target Card */}
            <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border border-blue-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-800">
                  Target Kalori Harian
                </span>
                <Flame className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-950 mt-2">
                {analysis.target_kalori || 2000} <span className="text-xs font-normal text-blue-700">kkal</span>
              </div>
              <div className="mt-1">
                <span className="text-xs font-extrabold text-blue-900 bg-blue-100 px-2 py-0.5 rounded-md">
                  TDEE & BMR Disesuaikan
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Aktivitas: {profileData.hari_olahraga_seminggu || "Cukup aktif"}
              </p>
            </div>

            {/* 3J Diet Plan Card */}
            <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/40 border border-purple-200 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-800">
                  Rekomendasi Pola Diet
                </span>
                <Award className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-lg font-black text-purple-950 mt-2 truncate">
                {analysis.active_diet_label || analysis.active_diet || "Diet Gizi Seimbang 3J"}
              </div>
              <div className="mt-1">
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md">
                  Jadwal • Jumlah • Jenis
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Ramah toleransi glukosa mahasiswa
              </p>
            </div>
          </div>

          {/* Clinical Insights & Explanation */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 mb-6">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Catatan Evaluasi Klinis Dr. Predi:
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Halo <strong>{profileData.nama || user?.username}</strong>! Berdasarkan data yang lo berikan, sistem PrediaBeat V2 telah mengalibrasi target nutrisi harian kamu. Profil kamu kini tersimpan di database dan dijadikan pedoman utama bagi chatbot konsultasi, rekomendasi resep otomatis, serta pemantauan gula darah berkala.
            </p>
            {profileData.phone_number && (
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                <span>📱 Nomor WhatsApp Terhubung:</span>
                <strong className="font-mono">{profileData.phone_number}</strong>
                <span className="text-[10px] text-emerald-600 font-normal">(Siap untuk fitur notifikasi & pengingat jadwal makan)</span>
              </div>
            )}
          </div>

          {/* Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {allowBack && onBackToChat && (
              <button
                onClick={onBackToChat}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-2xl transition cursor-pointer"
              >
                <span>Mulai Konsultasi Menu Harian</span>
              </button>
            )}
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm px-7 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition cursor-pointer active:scale-95"
            >
              <span>Buka Dashboard Utama Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Question Data
  const currentSection = onboardingState?.section || "IDENTITAS RESPONDEN";
  const progressPercent = onboardingState?.progress_percent || 0;
  const currentStep = onboardingState?.current_step || 1;
  const totalSteps = onboardingState?.total_steps || 61;
  const options = onboardingState?.options || [];
  const isMulti = onboardingState?.is_multi || false;
  const isOptional =
    !onboardingState?.required ||
    ["lingkar_pinggang", "tekanan_darah_sistol", "tekanan_darah_diastol", "etnis", "phone_number"].includes(
      onboardingState?.field_key
    );

  const CurrentSectionIcon = SECTION_ICONS[currentSection] || Activity;

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between py-3 sm:py-6">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" />
        <div className="absolute top-1/2 right-[-100px] w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30" />
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex-grow flex flex-col relative z-10">
        {/* Onboarding Header Banner */}
        <div className="mb-4 bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs flex-shrink-0">
              <img src="/WajahMaskot2.png" alt="Dr. Predi" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Gerbang Onboarding Klinis
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  Langkah {currentStep} dari {totalSteps}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                Wawancara Rekam Medis Bersama Dr. Predi
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Tahap Aktif: <strong className="text-emerald-700">{currentSection}</strong>
              </p>
            </div>
          </div>

          {/* Progress Bar Container & Optional Back */}
          <div className="w-full md:w-80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600">Progres Rekam Medis</span>
              <div className="flex items-center gap-2">
                {allowBack && onBackToChat && (
                  <button
                    onClick={onBackToChat}
                    className="text-[11px] font-bold text-slate-500 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-0.5 rounded-lg transition"
                  >
                    Batal / Chat Biasa
                  </button>
                )}
                <span className="text-emerald-700 font-mono font-black">{progressPercent}%</span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/80">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Sidebar Roadmap & Main Chat Intake */}
        <div className="flex-grow flex gap-5 h-[620px] relative">
          {/* LEFT SIDEBAR: Roadmap Tahapan Wawancara (10 Bagian) */}
          <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-[2rem] p-4 shadow-[0_10px_35px_rgb(0,0,0,0.03)] overflow-hidden">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Tahapan Rekam Medis
              </span>
              <button
                onClick={handleReset}
                className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition cursor-pointer flex items-center gap-1"
                title="Ulangi dari awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 py-2">
              {SECTIONS_LIST.map((sec, idx) => {
                const IconComponent = SECTION_ICONS[sec] || Activity;
                const isCurrent = sec === currentSection;
                const currentIdx = SECTIONS_LIST.indexOf(currentSection);
                const isPast = currentIdx > idx;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs transition ${
                      isCurrent
                        ? "bg-emerald-50 text-emerald-950 font-black border border-emerald-200 shadow-2xs"
                        : isPast
                        ? "text-slate-600 font-semibold bg-slate-50/70"
                        : "text-slate-400 font-medium"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${
                        isCurrent
                          ? "bg-emerald-600 text-white"
                          : isPast
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <span className="truncate text-[11px] leading-tight">{sec}</span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 leading-tight">
              🔒 Data Anda dienkripsi aman untuk keperluan evaluasi nutrisi klinis.
            </div>
          </aside>

          {/* RIGHT PANEL: Chatbot Interactive Conversation */}
          <main className="flex-1 flex flex-col bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden">
            {/* Top Bar of Active Conversation */}
            <div className="px-5 py-3.5 border-b border-slate-100/90 flex items-center justify-between bg-white/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate flex items-center gap-2">
                  <CurrentSectionIcon className="w-4 h-4 text-emerald-600" />
                  <span>Sesi Wawancara Intake Medis Awal</span>
                </h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Gen Z Conversational Mode
              </span>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-grow p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 bg-slate-50/20">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 max-w-[92%] sm:max-w-[85%] ${
                    msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {/* Avatar */}
                  {msg.role === "assistant" ? (
                    <img
                      src="/WajahMaskot.png"
                      alt="Dr. Predi"
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 border border-emerald-100 object-contain drop-shadow-xs flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-xs">
                      {user?.username ? user.username[0].toUpperCase() : <User className="w-4 h-4" />}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className={`px-5 py-3.5 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed shadow-2xs ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-tr-none font-medium"
                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-none font-normal"
                    }`}
                  >
                    <div
                      className="prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-strong:text-slate-900"
                      dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || "") }}
                    />

                    {msg.source && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>{msg.guardrail || msg.source}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {submitting && (
                <div className="flex gap-3 self-start items-center text-xs text-slate-400 font-medium">
                  <img
                    src="/WajahMaskot.png"
                    alt="Dr. Predi"
                    className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 object-contain"
                  />
                  <div className="bg-white border border-slate-100 px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-2xs">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1 text-slate-500 font-semibold text-[11px]">Dr. Predi sedang mencatat...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* CLICKABLE OPTION CHIPS AREA */}
            {options.length > 0 && !submitting && (
              <div className="px-4 py-3 bg-emerald-50/40 border-t border-emerald-100/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {isMulti
                      ? "Pilih Jawaban (Bisa pilih lebih dari satu):"
                      : "Pilih Jawaban Kamu:"}
                  </span>
                  {isMulti && selectedMulti.length > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 font-mono">
                      {selectedMulti.length} opsi terpilih
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {options.map((opt, i) => {
                    const isSelected = selectedMulti.includes(opt);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (isMulti) {
                            toggleMultiOption(opt);
                          } else {
                            handleAnswer(opt, opt);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                          isMulti
                            ? isSelected
                              ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs"
                              : "bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200"
                            : "bg-white hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 hover:border-emerald-600"
                        }`}
                      >
                        {isMulti && (
                          <span
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                              isSelected ? "bg-white text-emerald-700" : "border border-slate-300"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                        )}
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Confirm Multi Choice or Skip Button */}
                <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-emerald-100/60">
                  {isOptional ? (
                    <button
                      type="button"
                      onClick={() => handleAnswer("skip", "Lewati pertanyaan ini (belum ada data)")}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer underline"
                    >
                      Lewati Pertanyaan Ini (Opsional)
                    </button>
                  ) : <div />}

                  {isMulti && (
                    <button
                      type="button"
                      onClick={submitMultiChoice}
                      disabled={selectedMulti.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition shadow-sm cursor-pointer disabled:opacity-40"
                    >
                      <span>Kirim Pilihan ({selectedMulti.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Input Box for Text / Numbers / Conversation */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inputText.trim()) {
                    handleAnswer(inputText.trim(), inputText.trim());
                  }
                }}
                className="relative flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    options.length > 0
                      ? "Pilih opsi di atas, atau ketik jawaban / tanya Dr. Predi..."
                      : isOptional
                      ? "Ketik jawabanmu, atau ketik 'skip' jika belum tahu..."
                      : "Ketik jawabanmu di sini (contoh: 65, atau ketik bebas)..."
                  }
                  className="w-full pl-4 sm:pl-5 pr-12 sm:pr-14 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 transition"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || submitting}
                  className="absolute right-2 sm:right-2.5 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
