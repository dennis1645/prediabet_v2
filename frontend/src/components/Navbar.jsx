import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Home,
  Utensils,
  Sprout,
  TrendingUp,
  UserCheck,
  LogOut,
  ChevronDown,
  Sparkles,
} from "lucide-react";

export default function Navbar() {
  const { user, profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentPath = location.pathname;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-xl border-b border-slate-200/70 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto_1fr_auto] items-center h-16 md:h-20 gap-3 md:gap-5">
          
          {/* Kiri: Logo & Nama Aplikasi */}
          <Link
            to={user ? (profile ? "/dashboard" : "/questionnaire") : "/"}
            className="flex-shrink-0 flex items-center gap-3 cursor-pointer group hover:opacity-90 transition-opacity"
          >
            <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center bg-transparent group-hover:scale-105 transition-transform">
              <img
                src="/WajahMaskot2.png"
                alt="Maskot Predi"
                className="w-full h-full object-contain bg-transparent"
              />
            </div>
            <span className="font-extrabold text-xl md:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 tracking-tight hidden sm:inline">
              Prediabeat
            </span>
          </Link>

          {/* Tengah: Menu Utama (Sesuai base.html) */}
          {user ? (
            <nav className="hidden md:flex justify-center">
              {!profile ? (
                <Link
                  to="/questionnaire"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs lg:text-sm font-extrabold shadow-md shadow-emerald-500/25 transition-all animate-pulse"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Lengkapi Kuesioner Profil Kesehatan</span>
                </Link>
              ) : (
                <div className="inline-flex items-center justify-center gap-1 sm:gap-2">
                  <Link
                    to="/dashboard"
                    className={`inline-flex items-center justify-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                      currentPath === "/dashboard"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700"
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    Dashboard
                  </Link>

                  <Link
                    to="/menu"
                    className={`inline-flex items-center justify-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                      currentPath.startsWith("/menu")
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700"
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    Daftar Menu
                  </Link>

                  <Link
                    to="/diet"
                    className={`inline-flex items-center justify-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                      currentPath.startsWith("/diet")
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700"
                    }`}
                  >
                    <Sprout className="w-4 h-4" />
                    Program Diet
                  </Link>

                  <Link
                    to="/progress"
                    className={`inline-flex items-center justify-center gap-2 px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-bold transition-all ${
                      currentPath.startsWith("/progress")
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:bg-slate-100 hover:text-emerald-700"
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Progress
                  </Link>
                </div>
              )}
            </nav>
          ) : (
            <div></div>
          )}

          {/* Kanan: Info User + Dropdown Profil (Sesuai base.html) */}
          {user ? (
            <div className="relative flex items-center justify-end gap-3 md:gap-5" ref={dropdownRef}>
              {/* Teks Sapaan */}
              <div className="hidden lg:flex flex-col items-end justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                  User
                </span>
                <span className="text-sm font-bold text-slate-700 leading-none max-w-[140px] truncate">
                  {user.username}
                </span>
              </div>

              {/* Avatar klik dropdown */}
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="group flex items-center gap-2 rounded-2xl bg-white border border-emerald-100 p-1.5 pr-2 md:pr-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold uppercase shadow-sm shadow-emerald-500/20">
                  {user.username ? user.username[0] : "U"}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-14 md:top-16 w-72 rounded-3xl bg-white border border-slate-100 shadow-2xl shadow-slate-900/10 p-3 z-[60] animate-fade-in">
                  <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 mb-2">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-extrabold uppercase shadow-sm">
                      {user.username ? user.username[0] : "U"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-slate-800 truncate">
                        {user.username}
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold truncate">
                        Kelola profil & akun
                      </p>
                    </div>
                  </div>

                  {/* Mobile Navigation inside dropdown */}
                  <div className="md:hidden border-b border-slate-100 pb-2 mb-2">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <Home className="w-4 h-4" />
                      </span>
                      Dashboard
                    </Link>
                    <Link
                      to="/menu"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <Utensils className="w-4 h-4" />
                      </span>
                      Daftar Menu
                    </Link>
                    <Link
                      to="/diet"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <Sprout className="w-4 h-4" />
                      </span>
                      Program Diet
                    </Link>
                    <Link
                      to="/progress"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      <span className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      Progress
                    </Link>
                  </div>

                  <Link
                    to="/questionnaire"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <UserCheck className="w-4 h-4" />
                    </span>
                    Edit Profil
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-extrabold text-red-500 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                  >
                    <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </span>
                    Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div></div>
          )}

        </div>
      </div>
    </header>
  );
}
