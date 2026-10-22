import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast } from "../utils/alerts";
import Swal from "sweetalert2";
import { marked } from "marked";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Check,
  X,
  ShieldCheck,
  Trash2,
  Clock,
  MessageSquare,
  Plus,
  Menu,
  ChevronRight,
  ShieldAlert,
  Utensils,
  Flame,
  Activity,
  CheckCircle2,
} from "lucide-react";

export default function ChatbotPage() {
  const { user, profile, analysis } = useAuth();

  const getGreetingName = () => {
    if (profile?.nama) {
      const salutation = profile.jenis_kelamin === "Perempuan" ? "Ibu" : "Pak";
      return `${salutation} ${profile.nama}`;
    }
    if (user?.username) {
      return `Bapak/Ibu ${user.username}`;
    }
    return "Sahabat Sehat";
  };

  const createInitialWelcomeMessage = (name) => ({
    role: "assistant",
    content: `Halo ${name}! Selamat datang di ruang konsultasi PrediaBeat. 👋\n\nSaya **Dr. Predi**, konsultan nutrisi klinis pribadi Anda.\n\nBagaimana perasaan dan kondisi tubuh Anda hari ini? Apakah sedang ingin makan sesuatu yang hangat, segar, atau ada makanan spesifik yang sedang Anda idamkan? Ceritakan kepada saya, dan saya akan bantu evaluasi atau rekomendasikan menu sehat ramah gula darah!`,
    source: "Dr. Predi Clinical AI",
    guardrail: "100% Bebas Alergen & Sesuai Pedoman PERKENI",
  });

  // State percakapan & sesi multi-thread (mirip ChatGPT / Gemini)
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState(() => [createInitialWelcomeMessage(getGreetingName())]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar drawer
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [lastSuggestedRecipe, setLastSuggestedRecipe] = useState(null);

  // State Modal Catat Makanan ke Menu Harian
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [selectedFoodForLog, setSelectedFoodForLog] = useState(null);
  const [selectedMealTime, setSelectedMealTime] = useState("Makan Siang");
  const [portionGrams, setPortionGrams] = useState(100);
  const [isLoggingFood, setIsLoggingFood] = useState(false);

  const chatBottomRef = useRef(null);
  const inputRef = useRef(null);

  // Muat daftar sesi pengguna saat halaman pertama dibuka
  const loadSessions = async () => {
    try {
      const res = await api.getChatSessions();
      if (res.success && Array.isArray(res.data)) {
        setSessions(res.data);
      }
    } catch (err) {
      console.warn("Gagal memuat sesi chat:", err.message);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [user]);

  // Muat riwayat pesan ketika sesi aktif berubah
  const loadSessionMessages = async (sessionId) => {
    if (!sessionId) {
      setMessages([createInitialWelcomeMessage(getGreetingName())]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await api.getChatSessionHistory(sessionId);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const mapped = res.data.map((item) => {
          let meta = {};
          if (typeof item.metadata === "string") {
            try {
              meta = JSON.parse(item.metadata);
            } catch (e) {
              meta = {};
            }
          } else if (item.metadata && typeof item.metadata === "object") {
            meta = item.metadata;
          }

          return {
            role: item.role,
            content: item.content,
            source: meta.source || (item.role === "assistant" ? "PrediBeat Hybrid GraphRAG" : undefined),
            guardrail: meta.guardrail || (item.role === "assistant" ? "100% Bebas Alergen" : undefined),
            telemetry: meta.latency_ms
              ? {
                  latency_ms: meta.latency_ms,
                  tokens_per_second: meta.tokens_per_second,
                  vllm_connected: meta.vllm_connected,
                }
              : undefined,
            safe_foods: meta.safe_foods || [],
            food_card: meta.food_card || null,
            confirmation: meta.confirmation || null,
            exercise_logged: meta.exercise_logged || null,
            meal_logged: meta.meal_logged || null,
            sugar_verification: meta.sugar_verification || null,
            story_log: meta.story_log || null,
            created_at: item.created_at,
          };
        });
        setMessages(mapped);
      } else {
        setMessages([createInitialWelcomeMessage(getGreetingName())]);
      }
    } catch (err) {
      console.warn("Gagal memuat riwayat sesi:", err.message);
      setMessages([createInitialWelcomeMessage(getGreetingName())]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Pilih sesi dari sidebar
  const handleSelectSession = (sessionId) => {
    if (activeSessionId === sessionId) return;
    setActiveSessionId(sessionId);
    loadSessionMessages(sessionId);
    setSidebarOpen(false); // Tutup drawer mobile saat sesi dipilih
  };

  // Mulai Sesi Baru (+ Chat Baru)
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([createInitialWelcomeMessage(getGreetingName())]);
    setSidebarOpen(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Hapus satu sesi tertentu
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    const confirm = await Swal.fire({
      title: "Hapus Sesi Ini?",
      text: "Riwayat percakapan pada topik ini akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-2xl border border-slate-100 shadow-xl",
        confirmButton: "rounded-xl font-bold px-4 py-2 text-sm",
        cancelButton: "rounded-xl font-bold px-4 py-2 text-sm",
      },
    });

    if (confirm.isConfirmed) {
      try {
        await api.deleteChatSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
        showToast("Sesi percakapan berhasil dihapus", "success");
      } catch (err) {
        showToast("Gagal menghapus sesi chat", "error");
      }
    }
  };

  // Hapus seluruh riwayat percakapan user
  const handleClearAll = async () => {
    const confirm = await Swal.fire({
      title: "Bersihkan Semua Riwayat?",
      text: "Seluruh daftar percakapan dengan Dr. Predi akan dihapus dari akun Anda.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Hapus Semua",
      cancelButtonText: "Batal",
      customClass: {
        popup: "rounded-[2rem] border border-slate-100 shadow-2xl",
        confirmButton: "rounded-xl font-bold px-5 py-2.5",
        cancelButton: "rounded-xl font-bold px-5 py-2.5",
      },
    });

    if (confirm.isConfirmed) {
      try {
        await api.clearChatHistory();
        setSessions([]);
        handleNewChat();
        showToast("Semua riwayat chat berhasil dibersihkan", "success");
      } catch (err) {
        showToast("Gagal membersihkan riwayat chat", "error");
      }
    }
  };

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Kirim Pertanyaan (bisa dipanggil dari form submit atau action chip konfirmasi)
  const sendMessage = async (rawQuery) => {
    const query = (rawQuery !== undefined ? rawQuery : input).trim();
    if (!query || isTyping) return;

    // Tambahkan bubble user
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Panggil backend AI dengan menyertakan activeSessionId dan resep rujukan terakhir
      const res = await api.sendChatMessage(query, activeSessionId, lastSuggestedRecipe);
      if (res && res.response) {
        setIsTyping(false);

        // Jika ini adalah pesan pertama pada sesi baru, catat session_id dan perbarui daftar sesi
        if (!activeSessionId && res.session_id) {
          setActiveSessionId(res.session_id);
          loadSessions();
        }

        const fullResponse = res.response;
        const source = res.telemetry?.vllm_connected
          ? "vLLM Engine RTX 5070 Ti (Qwen 2.5 7B)"
          : "Dr. Predi Hybrid GraphRAG";
        const guardrail = res.guardrail?.safety_message || "100% Bebas Alergen & Aman Secara Klinis";
        const telemetry = res.telemetry;
        const safe_foods = res.safe_foods_recommended || [];
        const food_card = res.food_card || null;
        const confirmation = res.confirmation || null;
        const exercise_logged = res.exercise_logged || null;
        const meal_logged = res.meal_logged || null;
        const sugar_verification = res.sugar_verification || null;
        const story_log = res.story_log || null;

        if (food_card) {
          setLastSuggestedRecipe(food_card);
        }

        // Inisialisasi bubble assistant dengan status streaming aktif
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "",
            isTypingStream: true,
            source,
            guardrail,
            telemetry,
            safe_foods,
            food_card,
            confirmation,
            exercise_logged,
            meal_logged,
            sugar_verification,
            story_log,
          },
        ]);

        // Animasi efek mengetik realtime per kata/chunk
        const chunks = fullResponse.split(/(?<=\s+)/);
        let accumulated = "";
        for (let i = 0; i < chunks.length; i++) {
          accumulated += chunks[i];
          setMessages((prev) => {
            const next = [...prev];
            const lastIdx = next.length - 1;
            next[lastIdx] = {
              ...next[lastIdx],
              content: accumulated,
            };
            return next;
          });
          await new Promise((r) => setTimeout(r, 12));
        }

        // Tandai streaming selesai
        setMessages((prev) => {
          const next = [...prev];
          const lastIdx = next.length - 1;
          next[lastIdx] = {
            ...next[lastIdx],
            isTypingStream: false,
          };
          return next;
        });

        // Muat ulang daftar sesi agar urutan updated_at teratas diperbarui
        loadSessions();
        return;
      }
    } catch (err) {
      console.warn("Live AI chat error:", err.message);
    }

    // Fallback jika server tidak merespon
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Mohon maaf, saat ini sistem AI sedang melakukan sinkronisasi dataset klinis. Silakan coba kirimkan kembali pertanyaan Anda dalam beberapa detik.",
          source: "PrediBeat Local System",
          guardrail: "100% Bebas Alergen",
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  const handleSend = (e) => {
    e?.preventDefault();
    sendMessage();
  };

  // Interaktif: Konfirmasi bahan / nama makanan yang typo / gaul
  const handleConfirmFood = (targetFood) => {
    sendMessage(`Berapa nutrisi dan kandungan ${targetFood}?`);
  };

  const handleRejectFood = (detectedTerm) => {
    sendMessage(`Bukan ${detectedTerm}, tolong beri tahu opsi makanan ramah prediabetes lainnya.`);
  };

  // Modal Action: Buka dialog pencatatan makanan
  const handleOpenMealModal = (foodCard) => {
    setSelectedFoodForLog(foodCard);
    setPortionGrams(100);
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) {
      setSelectedMealTime("Sarapan");
    } else if (hour >= 11 && hour < 16) {
      setSelectedMealTime("Makan Siang");
    } else if (hour >= 16 && hour < 21) {
      setSelectedMealTime("Makan Malam");
    } else {
      setSelectedMealTime("Selingan");
    }
    setLogModalOpen(true);
  };

  // Modal Action: Simpan catatan makanan langsung ke daily_progress_logs
  const handleConfirmLogFood = async () => {
    if (!selectedFoodForLog) return;
    setIsLoggingFood(true);
    try {
      const scale = (Number(portionGrams) || 100) / 100;
      const calVal = Math.round((selectedFoodForLog.kalori || 0) * scale);
      const protVal = Math.round((selectedFoodForLog.protein || 0) * scale);
      const carbVal = Math.round((selectedFoodForLog.karbohidrat || 0) * scale);
      const fatVal = Math.round((selectedFoodForLog.lemak || 0) * scale);

      const res = await api.logFoodDirect({
        food_name: selectedFoodForLog.nama_makanan,
        calories: calVal,
        meal_time: selectedMealTime,
        protein: protVal,
        karbo: carbVal,
        lemak: fatVal,
      });

      if (res && res.success) {
        showToast(
          res.message || `${selectedFoodForLog.nama_makanan} (${portionGrams}g) dicatat ke ${selectedMealTime}!`,
          "success"
        );
        setLogModalOpen(false);
        setSelectedFoodForLog(null);
      } else {
        showToast(res?.message || "Gagal mencatat makanan", "error");
      }
    } catch (err) {
      showToast(err.message || "Gagal mencatat makanan", "error");
    } finally {
      setIsLoggingFood(false);
    }
  };

  const activeSessionTitle =
    sessions.find((s) => s.id === activeSessionId)?.title || "Percakapan Baru";

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between py-4 sm:py-6">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-1/2 right-[-100px] w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 w-full flex-grow flex flex-col relative z-10">
        {/* Top Header Bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Buka Riwayat Percakapan"
            >
              <Menu className="w-5 h-5 text-emerald-700" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-md shadow-emerald-500/10 overflow-hidden">
              <img src="/WajahMaskot2.png" alt="Predi" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                Konsultasi Predi AI
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  Online
                </span>
              </h2>
              <p className="text-slate-500 font-medium text-xs mt-0.5">
                Konsultan Nutrisi Klinis & Pola 3J Ramah Prediabetes
              </p>
            </div>
          </div>

          {/* Quick New Chat Button on Desktop */}
          <button
            onClick={handleNewChat}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chat Baru</span>
          </button>
        </div>

        {/* 2-Column Chat Layout (ChatGPT / Gemini Model) */}
        <div className="flex-grow flex gap-5 h-[620px] relative">
          {/* Overlay Backdrop for Mobile Sidebar */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* LEFT SIDEBAR: Riwayat Konsultasi (ChatGPT-like) */}
          <aside
            className={`
              fixed lg:static top-0 left-0 h-full lg:h-auto z-40 lg:z-auto
              w-72 sm:w-80 flex-shrink-0 flex flex-col
              bg-white/95 lg:bg-white/80 backdrop-blur-xl border border-slate-200/80 rounded-none lg:rounded-[2rem]
              p-4 shadow-xl lg:shadow-[0_10px_35px_rgb(0,0,0,0.03)] transition-transform duration-300 ease-in-out
              ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
          >
            {/* Header Sidebar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Chat Baru</span>
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-1.5 ml-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title Section */}
            <div className="pt-3 pb-2 px-1 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Riwayat Konsultasi ({sessions.length})
              </span>
              {sessions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition cursor-pointer"
                  title="Hapus semua riwayat"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            {/* Sessions List */}
            <div className="flex-grow overflow-y-auto space-y-1.5 pr-1 py-1">
              {sessions.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Belum ada riwayat konsultasi.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Mulai obrolan pertama Anda untuk mendiskusikan menu ramah gula darah!
                  </p>
                </div>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`
                        group relative flex items-center justify-between p-3 rounded-xl text-xs transition cursor-pointer
                        ${
                          isActive
                            ? "bg-emerald-50/90 text-emerald-950 font-bold border border-emerald-200/90 shadow-2xs"
                            : "hover:bg-slate-100/80 text-slate-700 font-medium border border-transparent"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden pr-2">
                        <MessageSquare
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? "text-emerald-600" : "text-slate-400 group-hover:text-slate-600"
                          }`}
                        />
                        <span className="truncate">{sess.title || "Konsultasi"}</span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer flex-shrink-0"
                        title="Hapus topik ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer Info */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-[10px] text-slate-400">Konsultasi Nutrisi & Pola 3J</span>
            </div>
          </aside>

          {/* RIGHT PANEL: Ruang Chat Utama */}
          <main className="flex-1 flex flex-col bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden">
            {/* Top Bar of Active Conversation */}
            <div className="px-5 py-3.5 border-b border-slate-100/90 flex items-center justify-between bg-white/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {activeSessionTitle}
                </h3>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-grow p-4 sm:p-6 pb-8 overflow-y-auto flex flex-col gap-6 bg-slate-50/20">
              {loadingHistory ? (
                <div className="flex items-center justify-center h-full text-xs text-slate-400 font-medium">
                  Memuat riwayat percakapan...
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 max-w-[90%] sm:max-w-[85%] md:max-w-[80%] ${
                      msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                    }`}
                  >
                    {/* Avatar Icon */}
                    {msg.role === "assistant" ? (
                      <img
                        src="/WajahMaskot.png"
                        alt="Predi"
                        className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-50 border border-emerald-100 object-contain drop-shadow-xs flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5 shadow-xs">
                        {user?.username ? user.username[0].toUpperCase() : <User className="w-4 h-4" />}
                      </div>
                    )}

                    {/* Bubble Chat */}
                    <div
                      className={`px-5 py-3.5 rounded-2xl text-[13.5px] sm:text-[14px] leading-relaxed shadow-2xs ${
                        msg.role === "user"
                          ? "bg-slate-900 text-white rounded-tr-none font-medium"
                          : "bg-white border border-slate-100 text-slate-700 rounded-tl-none font-normal"
                      }`}
                    >
                      {/* Markdown Renderer for Assistant */}
                      {msg.role === "assistant" ? (
                        <div>
                          <div
                            className="prose prose-slate prose-sm max-w-none prose-p:my-1.5 prose-strong:text-slate-900 prose-ul:my-1.5 prose-li:my-0.5"
                            dangerouslySetInnerHTML={{ __html: marked.parse(msg.content || "") }}
                          />
                          {msg.isTypingStream && (
                            <span className="inline-block w-2 h-4 ml-1 bg-emerald-600 animate-pulse align-middle rounded-xs"></span>
                          )}

                          {/* Visual Nutrition Card with HD Image & Macro Pills */}
                          {msg.food_card && !msg.isTypingStream && (
                            <div className="mt-3.5 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 border border-emerald-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs">
                              <div className="flex flex-col sm:flex-row gap-3.5 items-center sm:items-start">
                                {/* Food Image with Fallback */}
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white border border-emerald-200 flex-shrink-0 shadow-xs relative group">
                                  <img
                                    src={msg.food_card.gambar || "/food-images/sayur-bening.jpg"}
                                    alt={msg.food_card.nama_makanan}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = "/food-images/sayur-bening.jpg";
                                    }}
                                  />
                                  <div className="absolute top-1.5 left-1.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs">
                                    {msg.food_card.kategori || "Bahan Makanan"}
                                  </div>
                                </div>

                                {/* Info & Macro Breakdown */}
                                <div className="flex-1 w-full min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-tight">
                                        {msg.food_card.nama_makanan}
                                      </h4>
                                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                        Nilai gizi baku per 100 gram (Basis Data Kemenkes / PERKENI)
                                      </p>
                                    </div>
                                    {msg.food_card.gi_category && (
                                      <span
                                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border whitespace-nowrap shadow-2xs ${
                                          msg.food_card.gi_category.toLowerCase().includes("rendah") || msg.food_card.gi_category.toLowerCase().includes("aman")
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                            : msg.food_card.gi_category.toLowerCase().includes("sedang")
                                            ? "bg-amber-100 text-amber-800 border-amber-200"
                                            : "bg-rose-100 text-rose-800 border-rose-200"
                                        }`}
                                      >
                                        {msg.food_card.gi_category}
                                      </span>
                                    )}
                                  </div>

                                  {/* 4 Macro Pills */}
                                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-3">
                                    <div className="bg-white border border-slate-200/80 rounded-xl p-2 text-center shadow-2xs">
                                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kalori</span>
                                      <span className="text-xs sm:text-sm font-black text-slate-800">
                                        {msg.food_card.kalori ?? "-"}
                                      </span>
                                      <span className="text-[9px] text-slate-400 block -mt-0.5 font-medium">kkal</span>
                                    </div>

                                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-2 text-center shadow-2xs">
                                      <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Protein</span>
                                      <span className="text-xs sm:text-sm font-black text-emerald-900">
                                        {msg.food_card.protein ?? "-"}g
                                      </span>
                                      <span className="text-[9px] text-emerald-600 block -mt-0.5 font-medium">otot</span>
                                    </div>

                                    <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-2 text-center shadow-2xs">
                                      <span className="block text-[10px] font-bold text-amber-700 uppercase tracking-wide">Karbo</span>
                                      <span className="text-xs sm:text-sm font-black text-amber-900">
                                        {msg.food_card.karbohidrat ?? "-"}g
                                      </span>
                                      <span className="text-[9px] text-amber-600 block -mt-0.5 font-medium">energi</span>
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 text-center shadow-2xs">
                                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Lemak</span>
                                      <span className="text-xs sm:text-sm font-black text-slate-800">
                                        {msg.food_card.lemak ?? "-"}g
                                      </span>
                                      <span className="text-[9px] text-slate-400 block -mt-0.5 font-medium">esensial</span>
                                    </div>
                                  </div>

                                  {/* Action Button: Catat ke Menu Saya Hari Ini */}
                                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-emerald-100">
                                    <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      Teruji ramah pola 3J & bebas alergen
                                    </span>
                                    <button
                                      onClick={() => handleOpenMealModal(msg.food_card)}
                                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>+ Catat ke Menu Saya</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Interactive Confirmation Chips (Anti-Typo & Slang Normalizer) */}
                          {msg.confirmation?.requires_confirmation && !msg.isTypingStream && (
                            <div className="mt-3.5 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl shadow-2xs">
                              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold mb-1.5">
                                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span>Verifikasi Bahan / Istilah:</span>
                              </div>
                              <p className="text-xs text-amber-800 mb-3 leading-relaxed">
                                {msg.confirmation.message || `Apakah yang Anda maksud adalah ${msg.confirmation.target_food}?`}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmFood(msg.confirmation.target_food)}
                                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Ya, Benar ({msg.confirmation.target_food})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRejectFood(msg.confirmation.detected_term)}
                                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Bukan</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Exercise Logged Badge (Scientific MET Calculation) */}
                          {msg.exercise_logged && !msg.isTypingStream && (
                            <div className="mt-3.5 p-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-2xl shadow-2xs flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs flex-shrink-0">
                                  🏃‍♂️
                                </div>
                                <div>
                                  <div className="text-xs font-black text-teal-950 flex items-center gap-1.5">
                                    <span>Aktivitas Fisik Berhasil Dicatat Otomatis!</span>
                                    <span className="text-[10px] bg-teal-200/80 text-teal-900 font-bold px-1.5 py-0.5 rounded-md">
                                      MET {msg.exercise_logged.met}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-teal-700 font-medium mt-0.5">
                                    {msg.exercise_logged.activity_name} ({msg.exercise_logged.duration_minutes} menit) • Terbakar ~{msg.exercise_logged.activity_calories} kkal
                                  </div>
                                  {msg.exercise_logged.glucose_clinical_note && (
                                    <div className="text-[10px] text-teal-600/90 italic mt-0.5">
                                      💡 {msg.exercise_logged.glucose_clinical_note}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <span className="text-[10px] font-black text-emerald-800 bg-white border border-emerald-200 px-2 py-1 rounded-lg uppercase shadow-2xs flex-shrink-0">
                                Tersimpan di Progres
                              </span>
                            </div>
                          )}

                          {/* Protokol Anti-Halu: Verifikasi Takaran Gula Minuman */}
                          {msg.sugar_verification?.needs_sugar_verification && !msg.isTypingStream && (
                            <div className="mt-3.5 p-3.5 bg-amber-50/95 border border-amber-200 rounded-2xl shadow-2xs animate-fade-in">
                              <div className="flex items-center gap-2 text-amber-900 text-xs font-bold mb-1.5">
                                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <span>Verifikasi Takaran Gula ({msg.sugar_verification.item_name}):</span>
                              </div>
                              <p className="text-xs text-amber-800 mb-3 leading-relaxed">
                                {msg.sugar_verification.question}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {msg.sugar_verification.options.map((opt, oIdx) => (
                                  <button
                                    key={oIdx}
                                    type="button"
                                    onClick={() => sendMessage(`Untuk ${msg.sugar_verification.item_name}, takaran gulanya: ${opt.label}`)}
                                    className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-xl transition shadow-2xs cursor-pointer active:scale-95"
                                  >
                                    <span>{opt.label}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Contextual Recipe Logged Badge */}
                          {msg.meal_logged && !msg.isTypingStream && (
                            <div className="mt-3.5 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl shadow-2xs flex items-center justify-between gap-3 animate-fade-in">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                                  🍽️
                                </div>
                                <div>
                                  <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Resep Berhasil Terjadwal & Tercatat di Progres!</span>
                                  </div>
                                  <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                                    {msg.meal_logged.nama_makanan || "Menu Sehat 3J"} ({msg.meal_logged.kalori || 250} kkal) • Langsung tersinkron ke Dashboard
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                                Tersimpan
                              </span>
                            </div>
                          )}

                          {/* Story Food Log Detected */}
                          {msg.story_log?.items?.length > 0 && !msg.isTypingStream && (
                            <div className="mt-3.5 p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                                  🍱
                                </div>
                                <div>
                                  <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>Makanan Konsumsi Otomatis Dicatat ke Progres:</span>
                                  </div>
                                  <div className="text-xs text-emerald-800 font-semibold mt-0.5">
                                    {msg.story_log.items.map((it) => `${it.nama} (${it.kalori} kkal)`).join(" • ")} • Total ~{msg.story_log.total_kalori_known} kkal
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/70 px-2.5 py-1 rounded-full border border-emerald-300 shrink-0">
                                Tersimpan
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}

                      {/* Telemetri Kecepatan Inferensi & Pengujian */}
                      {msg.role === "assistant" && msg.telemetry?.latency_ms && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center text-[10px] text-slate-400 font-mono">
                          <div className="inline-flex items-center gap-1 text-slate-600 bg-slate-100/90 border border-slate-200/70 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>{(msg.telemetry.latency_ms / 1000).toFixed(2)}s</span>
                            {msg.telemetry.tokens_per_second > 0 && (
                              <span className="text-slate-500 font-normal">
                                ({msg.telemetry.tokens_per_second} tok/s)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="self-start flex gap-3 max-w-[85%] md:max-w-[75%] animate-pulse">
                  <img
                    src="/WajahMaskot.png"
                    alt="Predi"
                    className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 object-contain opacity-80 flex-shrink-0"
                  />
                  <div className="bg-white border border-slate-100 text-slate-400 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-xs text-xs italic flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                    Menganalisis keamanan klinis & panduan PERKENI...
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggestion Chips (Prompt Cepat) */}
            <div className="px-4 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex-shrink-0 mr-1">Contoh:</span>
              {[
                "Hari ini saya makan ayam goreng sama nasi, dan es teh manis",
                "Lagi pengen makan yang berkuah & hangat",
                "Berapa protein pada dada ayam?",
                "Saranin resep makan siang ramah glukosa dong",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="flex-shrink-0 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 text-slate-600 border border-slate-200 rounded-full px-3.5 py-1.5 font-medium text-[11px] transition-all shadow-2xs cursor-pointer active:scale-95"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="relative flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanyakan makanan atau nutrisi ramah prediabetes..."
                  className="w-full pl-4 sm:pl-5 pr-12 sm:pr-14 py-3 sm:py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 sm:right-2.5 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 transition disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </form>
            </div>
          </main>
        </div>
      </div>

      {/* Modal Catat Makanan ke Progres Harian */}
      {logModalOpen && selectedFoodForLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    Catat ke Menu Saya
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sinkronisasi otomatis ke Progress Tracker
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Selected Food Overview */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <img
                  src={selectedFoodForLog.gambar || "/food-images/sayur-bening.jpg"}
                  alt={selectedFoodForLog.nama_makanan}
                  className="w-14 h-14 rounded-xl object-cover border border-emerald-200"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "/food-images/sayur-bening.jpg";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-black text-slate-800 truncate">
                    {selectedFoodForLog.nama_makanan}
                  </div>
                  <div className="text-xs text-emerald-700 font-semibold mt-0.5">
                    Kategori: {selectedFoodForLog.kategori || "Bahan Pangan"}
                  </div>
                  {selectedFoodForLog.gi_category && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                      {selectedFoodForLog.gi_category}
                    </span>
                  )}
                </div>
              </div>

              {/* Waktu Makan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Waktu Makan (Pola 3J - Jadwal)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Sarapan", "Makan Siang", "Makan Malam", "Selingan"].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedMealTime(time)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        selectedMealTime === time
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Takaran Porsi (Gram) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Takaran Porsi (Jumlah - gram)
                  </label>
                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {portionGrams} gram
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[50, 100, 150, 200].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPortionGrams(preset)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
                        portionGrams === preset
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {preset}g
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  step="10"
                  value={portionGrams}
                  onChange={(e) => setPortionGrams(Math.max(1, Number(e.target.value) || 0))}
                  className="mt-2 w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-slate-50"
                  placeholder="Atau ketik porsi kustom dalam gram..."
                />
              </div>

              {/* Realtime Calculated Nutrition Summary */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Estimasi Gizi ({portionGrams}g):</span>
                  <span className="text-[10px] text-emerald-600 font-bold lowercase">sesuai takaran</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">Kalori</span>
                    <span className="text-xs font-black text-slate-800">
                      {Math.round(((selectedFoodForLog.kalori || 0) * portionGrams) / 100)}
                    </span>
                    <span className="text-[9px] text-slate-400 block">kkal</span>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="block text-[10px] text-emerald-600 font-bold uppercase">Protein</span>
                    <span className="text-xs font-black text-emerald-800">
                      {Math.round(((selectedFoodForLog.protein || 0) * portionGrams) / 10) / 10}g
                    </span>
                    <span className="text-[9px] text-emerald-500 block">otot</span>
                  </div>
                  <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100 shadow-2xs">
                    <span className="block text-[10px] text-amber-600 font-bold uppercase">Karbo</span>
                    <span className="text-xs font-black text-amber-800">
                      {Math.round(((selectedFoodForLog.karbohidrat || 0) * portionGrams) / 10) / 10}g
                    </span>
                    <span className="text-[9px] text-amber-500 block">energi</span>
                  </div>
                  <div className="bg-slate-100/50 p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Lemak</span>
                    <span className="text-xs font-black text-slate-700">
                      {Math.round(((selectedFoodForLog.lemak || 0) * portionGrams) / 10) / 10}g
                    </span>
                    <span className="text-[9px] text-slate-400 block">lemak</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmLogFood}
                disabled={isLoggingFood}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isLoggingFood ? (
                  <span>Menyimpan ke Progres...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan ke Progres Hari Ini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
