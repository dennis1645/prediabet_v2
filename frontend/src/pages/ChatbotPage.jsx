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
    content: `Halo ${name}! Selamat datang di ruang konsultasi PrediaBeat. 👋\n\nSaya **Dr. Predi**, dokter konsultan nutrisi klinis pribadi Anda. Ada yang ingin Anda konsultasikan seputar kandungan gizi makanan, takaran pola 3J ramah gula darah, atau rekomendasi menu sehat hari ini?`,
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
        const mapped = res.data.map((item) => ({
          role: item.role,
          content: item.content,
          source: item.metadata?.source || (item.role === "assistant" ? "PrediBeat Hybrid GraphRAG" : undefined),
          guardrail: item.metadata?.guardrail || (item.role === "assistant" ? "100% Bebas Alergen" : undefined),
          telemetry: item.metadata?.latency_ms
            ? {
                latency_ms: item.metadata.latency_ms,
                tokens_per_second: item.metadata.tokens_per_second,
                vllm_connected: item.metadata.vllm_connected,
              }
            : undefined,
          safe_foods: item.metadata?.safe_foods || [],
          created_at: item.created_at,
        }));
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

  // Kirim Pertanyaan
  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isTyping) return;

    // Tambahkan bubble user
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Panggil backend AI dengan menyertakan activeSessionId
      const res = await api.sendChatMessage(query, activeSessionId);
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
              <span className="flex items-center gap-1 font-medium text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data Terisolasi Per Pasien
              </span>
            </div>
          </aside>

          {/* RIGHT PANEL: Ruang Chat Utama */}
          <main className="flex-1 flex flex-col bg-white/85 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden">
            {/* Top Bar of Active Conversation */}
            <div className="px-5 py-3 border-b border-slate-100/90 flex items-center justify-between bg-white/60">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                  {activeSessionTitle}
                </h3>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span className="hidden sm:inline">Scope Guardrail Aktif</span>
                <span className="sm:hidden">Aman</span>
              </div>
            </div>

            {/* Chat Messages Area */}
            <div className="flex-grow p-4 sm:p-6 overflow-y-auto flex flex-col gap-5 bg-slate-50/20">
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
            <div className="px-4 py-2 bg-slate-50/50 border-t border-slate-100/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="text-[11px] font-bold text-slate-400 flex-shrink-0">Contoh:</span>
              {[
                "Berapa protein dada ayam?",
                "Apakah saya boleh makan nasi goreng?",
                "Resep tahu gejrot ramah diabetes",
                "Rekomendasi menu sarapan 3J",
              ].map((suggestion, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setInput(suggestion);
                    inputRef.current?.focus();
                  }}
                  className="flex-shrink-0 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-slate-600 border border-slate-200/80 rounded-xl px-3 py-1 font-medium text-[11px] transition shadow-2xs cursor-pointer"
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
    </div>
  );
}
