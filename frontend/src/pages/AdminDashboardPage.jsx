import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { showSuccessAlert, showErrorAlert } from "../utils/alerts";
import Swal from "sweetalert2";
import {
  Users,
  Shield,
  MessageSquare,
  Download,
  Trash2,
  KeyRound,
  Search,
  Eye,
  X,
  FileSpreadsheet,
  FileJson,
  UserCheck,
  RefreshCw,
} from "lucide-react";

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users: 0,
    total_admins: 0,
    users_with_profile: 0,
    total_messages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [downloading, setDownloading] = useState(false);

  // Chat preview modal
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [selectedUserChats, setSelectedUserChats] = useState({ user: null, logs: [] });
  const [loadingChats, setLoadingChats] = useState(false);

  // WhatsApp Baileys Bot Management (Admin)
  const [botStatus, setBotStatus] = useState({ status: "disconnected", connected: false, qr_data_url: null, connected_phone: null });
  const [botLoading, setBotLoading] = useState(false);
  const [testWaPhone, setTestWaPhone] = useState("");

  const fetchBotStatus = async () => {
    try {
      const res = await api.getWaBotStatus();
      if (res?.success && res.data) {
        setBotStatus(res.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchBotStatus();
    const timer = setInterval(fetchBotStatus, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleConnectBaileys = async (forceReset = false) => {
    setBotLoading(true);
    try {
      const res = await api.connectWaBot(forceReset);
      if (res?.success && res.data) setBotStatus(res.data);
      setTimeout(fetchBotStatus, 1200);
    } catch (err) {
      showErrorAlert("Gagal Memulai Bot WA", err.message || "Tidak dapat menghubungkan Baileys.");
    } finally {
      setBotLoading(false);
    }
  };

  const handleDisconnectBaileys = async () => {
    setBotLoading(true);
    try {
      const res = await api.disconnectWaBot();
      if (res?.success && res.data) setBotStatus(res.data);
      await showSuccessAlert("Diputuskan", "Koneksi Bot WhatsApp berhasil diputuskan.");
    } catch (err) {
      showErrorAlert("Gagal", err.message || "Gagal memutus koneksi.");
    } finally {
      setBotLoading(false);
    }
  };

  const handleTestWaSend = async () => {
    if (!testWaPhone.trim()) {
      showErrorAlert("Nomor Kosong", "Masukkan nomor WhatsApp tujuan uji coba.");
      return;
    }
    setBotLoading(true);
    try {
      const res = await api.testSendWaReminder(testWaPhone.trim());
      await showSuccessAlert("Terkirim!", res?.message || "Pesan uji coba terkirim.");
    } catch (err) {
      showErrorAlert("Gagal Mengirim", err.message || "Pastikan Bot WA terhubung dan nomor valid.");
    } finally {
      setBotLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.adminGetUsers();
      if (res.success && res.data) {
        setUsers(res.data.users || []);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      showErrorAlert("Gagal Memuat Data", err.message || "Tidak dapat mengambil daftar pengguna.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleRole = async (u) => {
    const nextRole = u.role === "admin" ? "user" : "admin";
    const result = await Swal.fire({
      title: "Ubah Role Pengguna?",
      text: `Ubah role "${u.username}" dari ${u.role} menjadi ${nextRole}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Ubah",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.adminUpdateUserRole(u.id, nextRole);
      await showSuccessAlert("Berhasil", res.message);
      loadUsers();
    } catch (err) {
      showErrorAlert("Gagal", err.message);
    }
  };

  const handleResetPassword = async (u) => {
    const { value: newPassword } = await Swal.fire({
      title: `Reset Password: ${u.username}`,
      input: "password",
      inputLabel: "Masukkan password baru (minimal 6 karakter)",
      inputPlaceholder: "Password baru...",
      showCancelButton: true,
      confirmButtonText: "Simpan Password",
      cancelButtonText: "Batal",
      confirmButtonColor: "#059669",
      inputValidator: (value) => {
        if (!value || value.length < 6) {
          return "Password minimal 6 karakter!";
        }
      },
    });

    if (!newPassword) return;

    try {
      const res = await api.adminResetPassword(u.id, newPassword);
      await showSuccessAlert("Berhasil", res.message);
    } catch (err) {
      showErrorAlert("Gagal", err.message);
    }
  };

  const handleDeleteUser = async (u) => {
    const result = await Swal.fire({
      title: "Hapus Pengguna?",
      text: `Seluruh data profil, progress, dan riwayat percakapan "${u.username}" akan dihapus permanen.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!result.isConfirmed) return;

    try {
      const res = await api.adminDeleteUser(u.id);
      await showSuccessAlert("Terhapus", res.message);
      loadUsers();
    } catch (err) {
      showErrorAlert("Gagal", err.message);
    }
  };

  const handleViewChats = async (u) => {
    setChatModalOpen(true);
    setLoadingChats(true);
    setSelectedUserChats({ user: u, logs: [] });
    try {
      const res = await api.adminGetUserChats(u.id);
      if (res.success && res.data) {
        setSelectedUserChats(res.data);
      }
    } catch (err) {
      showErrorAlert("Gagal Memuat Chat", err.message);
      setChatModalOpen(false);
    } finally {
      setLoadingChats(false);
    }
  };

  const handleDownload = async (format, userId = null) => {
    setDownloading(true);
    try {
      await api.adminDownloadChats(format, userId);
    } catch (err) {
      showErrorAlert("Gagal Mengunduh", err.message);
    } finally {
      setDownloading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.profile?.nama || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-extrabold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              Panel Evaluasi & Admin
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">
              Dashboard Admin PrediaBeat
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Kelola akun pengguna dan unduh log percakapan untuk bahan evaluasi testing awal Desember.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleDownload("csv", null)}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Download Semua Chat (CSV)
            </button>
            <button
              onClick={() => handleDownload("json", null)}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <FileJson className="w-4 h-4" />
              Download Semua (JSON)
            </button>
            <button
              onClick={loadUsers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-sm font-bold cursor-pointer"
              title="Muat ulang data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total Pengguna</span>
              <Users className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-slate-800">{stats.total_users}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Profil Klinis Lengkap</span>
              <UserCheck className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-3xl font-black text-slate-800">{stats.users_with_profile}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Total Pesan Chat</span>
              <MessageSquare className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-3xl font-black text-slate-800">{stats.total_messages}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
              <span>Akun Admin</span>
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-slate-800">{stats.total_admins}</div>
          </div>
        </div>

        {/* Panel Manajemen Bot WhatsApp Baileys (Admin) */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-800">Manajemen Bot WhatsApp (Baileys)</h2>
                <span
                  className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                    botStatus.connected
                      ? "bg-emerald-100 text-emerald-800"
                      : botStatus.status === "qr_ready"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {botStatus.connected
                    ? `Terhubung (${botStatus.connected_phone || "Aktif"})`
                    : botStatus.status === "qr_ready"
                    ? "Siap Scan Barcode QR"
                    : botStatus.status === "connecting"
                    ? "Menyiapkan QR..."
                    : "Belum Terhubung"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Scan barcode WhatsApp di bawah untuk mengaktifkan pengiriman pengingat cerdas (jam makan, minum obat, olahraga) & follow-up otomatis sampai pasien membalas konfirmasi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {!botStatus.connected ? (
                <button
                  type="button"
                  disabled={botLoading}
                  onClick={() => handleConnectBaileys(botStatus.status !== "qr_ready")}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                >
                  {botLoading ? "Memuat..." : botStatus.qr_data_url ? "Refresh Barcode QR" : "Tampilkan Barcode QR"}
                </button>
              ) : (
                <>
                  <input
                    type="tel"
                    value={testWaPhone}
                    onChange={(e) => setTestWaPhone(e.target.value)}
                    placeholder="No WA uji coba (08xxx)"
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={botLoading}
                    onClick={handleTestWaSend}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                  >
                    Tes Kirim WA
                  </button>
                  <button
                    type="button"
                    disabled={botLoading}
                    onClick={handleDisconnectBaileys}
                    className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-extrabold transition cursor-pointer disabled:opacity-50"
                  >
                    Putuskan
                  </button>
                </>
              )}
            </div>
          </div>

          {!botStatus.connected && botStatus.qr_data_url && (
            <div className="bg-emerald-50/50 rounded-2xl border border-emerald-200 p-4 flex flex-col sm:flex-row items-center gap-5">
              <img
                src={botStatus.qr_data_url}
                alt="QR Barcode WhatsApp Baileys"
                className="w-44 h-44 rounded-xl border border-slate-200 p-1.5 bg-white shadow-xs"
              />
              <div className="text-xs text-slate-700 space-y-1.5">
                <p className="font-black text-slate-900 text-sm">Panduan Scan Barcode Bot WhatsApp:</p>
                <p>1. Buka aplikasi <strong>WhatsApp</strong> di ponsel server/admin.</p>
                <p>2. Masuk ke <strong>Perangkat Tertaut (Linked Devices)</strong> &rarr; <strong>Tautkan Perangkat</strong>.</p>
                <p>3. Scan QR Code di samping. Setelah terhubung, scheduler otomatis akan mengirim pengingat dan memantau balasan pasien.</p>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold text-slate-800">Daftar Pengguna Terdaftar</h2>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari username, nama, atau email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-5">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Profil & Diet</th>
                  <th className="py-3.5 px-4">Aktivitas Chat</th>
                  <th className="py-3.5 px-5 text-right">Aksi & Ekspor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Memuat daftar pengguna...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      Tidak ada pengguna yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-800">
                            {u.profile?.nama || u.username}
                            {isSelf && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            @{u.username} • {u.email || "-"}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                              u.role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {u.has_profile ? (
                            <div>
                              <div className="text-xs font-bold text-emerald-700">
                                {u.analysis?.kategori_risiko || "Profil Terisi"}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Diet: {u.analysis?.active_diet_label || "Belum Dipilih"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum isi profil</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-slate-700">{u.total_messages} pesan</div>
                          <div className="text-[11px] text-slate-400">{u.total_sessions} sesi chat</div>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewChats(u)}
                              className="p-2 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer"
                              title="Lihat Riwayat Chat"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownload("csv", u.id)}
                              className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Download Chat User (CSV)"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isSelf}
                              className="p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer disabled:opacity-40"
                              title="Ubah Role (user/admin)"
                            >
                              <Shield className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleResetPassword(u)}
                              className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={isSelf}
                              className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-40"
                              title="Hapus User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredUsers.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                Menampilkan{" "}
                <span className="font-bold text-slate-700">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredUsers.length)}
                </span>{" "}
                dari <span className="font-bold text-slate-700">{filteredUsers.length}</span> pengguna
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg font-bold cursor-pointer ${
                      pageNum === safePage
                        ? "bg-emerald-600 text-white"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Preview Percakapan User */}
      {chatModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Riwayat Percakapan: @{selectedUserChats.user?.username}
                </h3>
                <p className="text-xs text-slate-500">
                  Total {selectedUserChats.logs?.length || 0} pesan terekam
                </p>
              </div>
              <div className="flex items-center gap-2">
                {selectedUserChats.user && (
                  <button
                    onClick={() => handleDownload("csv", selectedUserChats.user.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </button>
                )}
                <button
                  onClick={() => setChatModalOpen(false)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {loadingChats ? (
                <div className="text-center py-10 text-slate-400 text-sm">Memuat riwayat percakapan...</div>
              ) : selectedUserChats.logs.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">Pengguna ini belum memiliki percakapan.</div>
              ) : (
                selectedUserChats.logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-2xl text-sm ${
                      log.role === "user"
                        ? "bg-emerald-600 text-white ml-8"
                        : "bg-white border border-slate-200 text-slate-800 mr-8"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] opacity-75 mb-1 font-bold uppercase">
                      <span>{log.role === "user" ? "Pasien" : "Dr. Predi AI"}</span>
                      <span>{log.created_at}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{log.content}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
