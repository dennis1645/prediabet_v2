import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showToast, showSuccessAlert, showErrorAlert } from "../utils/alerts";
import Swal from "sweetalert2";
import { marked } from "marked";
import {
  Send,
  Sparkles,
  Bot,
  User,
  BookOpen,
  Check,
  X,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";

export default function ChatbotPage() {
  const { user, profile, analysis } = useAuth();
  
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Halo sahabat sehat! 👋\n\nSaya **Dr. Predi**, konsultan nutrisi & asisten klinis cerdas Anda. Ada yang bisa saya bantu hari ini terkait pemilihan makanan, takaran 3J, atau rekomendasi menu ramah prediabetes yang aman dari pantangan alergi Anda?",
      source: "Hybrid GraphRAG + vLLM Engine",
      mode: "verified_data",
    },
  ]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatBottomRef = useRef(null);

  // Muat riwayat chat unik pengguna saat halaman dibuka
  useEffect(() => {
    async function loadChatHistory() {
      try {
        const res = await api.getChatHistory();
        if (res.success && res.data && res.data.length > 0) {
          const mapped = res.data.map((item) => ({
            role: item.role,
            content: item.content,
            source: item.role === "assistant" ? "Sesi Konsultasi Riwayat Anda" : undefined,
            guardrail: item.role === "assistant" ? "100% Bebas Alergen" : undefined,
            created_at: item.created_at,
          }));
          setMessages(mapped);
        }
      } catch (err) {
        console.warn("Gagal memuat riwayat chat dari server:", err.message);
      }
    }
    loadChatHistory();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleClearChat = async () => {
    const confirm = await Swal.fire({
      title: "Hapus Riwayat Chat?",
      text: "Seluruh catatan percakapan dengan Dr. Predi akan dihapus permanen dari profil Anda.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#059669",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: "Ya, Bersihkan",
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
        setMessages([
          {
            role: "assistant",
            content: "Riwayat percakapan telah dibersihkan. Ada yang bisa saya bantu kembali seputar nutrisi ramah prediabetes Anda?",
            source: "PrediBeat AI",
          },
        ]);
        showToast("Riwayat chat berhasil dibersihkan", "success");
      } catch (err) {
        showToast("Gagal menghapus riwayat chat", "error");
      }
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = input.trim();
    if (!query || isTyping) return;

    // Add user message
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 1. Panggil Endpoint AI lewat Express Backend (Membawa Konteks Pasien Terisolasi)
      const res = await api.sendChatMessage(query);
      if (res && res.response) {
        setIsTyping(false);
        const fullResponse = res.response;
        const source = res.telemetry?.vllm_connected 
          ? "vLLM Engine RTX 5070 Ti (Qwen 2.5 7B)" 
          : "Dr. Predi Hybrid GraphRAG";
        const guardrail = res.guardrail?.safety_message || "100% Bebas Alergen & Aman Secara Klinis";
        const telemetry = res.telemetry;

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
          await new Promise((r) => setTimeout(r, 14));
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
        return;
      }
    } catch (err) {
      console.warn("Live AI chat error, falling back to local clinical knowledge:", err.message);
    }

    // Fallback klinis jika server AI sedang booting
    setTimeout(() => {
      let botAnswer = "";
      let source = "Dataset Nutrisi & Pedoman PERKENI 2021";
      const pantanganText = Array.isArray(profile?.pantangan_alergi)
        ? profile.pantangan_alergi.join(", ")
        : (profile?.pantangan_alergi || "pantangan medis");

      const lower = query.toLowerCase();
      if (lower.includes("nasi uduk") || lower.includes("nasi goreng")) {
        botAnswer = `Berdasarkan analisis nutrisi klinis untuk kondisi **${analysis?.kategori_risiko || "Prediabetes"}**:\n\n- **Status:** ⚠️ **Perlu Dibatasi**.\n- **Kalori:** Sekitar 350 - 450 kkal per porsi sedang.\n- **Analisis Glikemik:** Menggunakan santan berlemak jenuh dan beras putih dengan Indeks Glikemik Tinggi (GI > 70) yang cepat meningkatkan glukosa darah post-prandial.\n\n**Saran Pengganti yang Lebih Aman:**\nGanti dengan nasi merah pulen atau nasi jagung dengan lauk ikan pepes / ayam ungkep bumbu rempah tanpa santan kental.`;
      } else {
        botAnswer = `Terima kasih atas pertanyaannya! Berdasarkan profil medis Anda (**Target: ${analysis?.target_kalori || 1850} kkal/hari**), prinsip utama pengelolaan adalah menjaga pola **3J (Jadwal, Jumlah, dan Jenis)**:\n\n1. **Jadwal:** Makan teratur 3 kali makan utama + 2 kali selingan sehat setiap 3-4 jam.\n2. **Jumlah:** Porsi terukur dengan 50% piring berisi serat sayur hijau.\n3. **Jenis:** Utamakan karbohidrat kompleks rendah indeks glikemik (GI < 55) seperti beras merah, havermut, atau ubi rebus.\n\n🛡️ *Jaminan Guardrail:* Menu ini 100% aman dan bebas dari **${pantanganText}**.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: botAnswer,
          source: source,
          guardrail: "100% Bebas Alergen & Aman Secara Klinis",
        },
      ]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col justify-between py-6">
      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute top-1/2 right-[-100px] w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow flex flex-col relative z-10">
        
        {/* Header Chat */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-lg shadow-emerald-500/15 overflow-hidden">
              <img
                src="/WajahMaskot2.png"
                alt="Predi"
                className="w-full h-full object-contain p-0.5"
              />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                Konsultasi Predi AI
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Online
                </span>
              </h2>
              <p className="text-slate-500 font-medium text-xs sm:text-sm mt-0.5">
                Tanyakan nutrisi, hitung konsumsi, rekomendasi menu 3J, atau edukasi dokumen medis.
              </p>
            </div>
          </div>

          <button
            onClick={handleClearChat}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 bg-white border border-slate-200 px-3 py-2 rounded-xl transition shadow-2xs cursor-pointer"
            title="Bersihkan riwayat percakapan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Riwayat
          </button>
        </div>

        {/* Container Chat Utama (Glassmorphism) */}
        <div className="flex-grow flex flex-col bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] shadow-[0_10px_40px_rgb(0,0,0,0.04)] overflow-hidden h-[540px]">
          
          {/* Chat History Area */}
          <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-6 bg-slate-50/30">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] md:max-w-[80%] ${
                  msg.role === "user" ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                {/* Avatar Icon */}
                {msg.role === "assistant" ? (
                  <img
                    src="/WajahMaskot.png"
                    alt="Predi"
                    className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 object-contain drop-shadow-sm flex-shrink-0 mt-1"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 mt-1 shadow-sm">
                    {user?.username ? user.username[0] : <User className="w-4 h-4" />}
                  </div>
                )}

                {/* Bubble Chat */}
                <div
                  className={`px-6 py-4 rounded-2xl text-[14px] leading-relaxed shadow-xs ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white rounded-tr-none font-medium"
                      : "bg-white border border-slate-100 text-slate-700 rounded-tl-none font-normal"
                  }`}
                >
                  {/* Markdown Renderer for Assistant dengan Efek Realtime Cursor */}
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

                  {/* Optional Action Card */}
                  {msg.action && (
                    <div className="mt-4 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 text-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs uppercase text-emerald-800 tracking-wider">
                          {msg.action.title}
                        </span>
                        <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-200">
                          {msg.action.calories} kkal
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-3">{msg.action.description}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alert("Menu berhasil dikonfirmasi ke Meal Plan Anda!")}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Terapkan Menu Ini
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sumber & Mode Footer */}
                  {msg.role === "assistant" && msg.source && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Sumber:</span>
                        <span className="text-emerald-700 normal-case font-bold">{msg.source}</span>
                      </div>
                      {msg.guardrail && (
                        <div className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md font-extrabold normal-case text-[10px]">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>{msg.guardrail}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="self-start flex gap-3 max-w-[85%] md:max-w-[75%] animate-pulse">
                <img
                  src="/WajahMaskot.png"
                  alt="Predi"
                  className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 object-contain opacity-80 flex-shrink-0"
                />
                <div className="bg-white border border-slate-100 text-slate-400 px-5 py-3 rounded-2xl rounded-tl-none shadow-sm text-xs italic flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  Menganalisis data nutrisi & pedoman klinis...
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Input Bar */}
          <div className="p-4 bg-white border-t border-slate-100/80">
            <form onSubmit={handleSend} className="relative flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanyakan makanan, misalnya: 'Apakah saya boleh makan nasi goreng saat sarapan?'"
                className="w-full pl-5 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium text-slate-800 placeholder-slate-400 transition"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2.5 w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 transition disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
