import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import ChatbotPage from "./pages/ChatbotPage";
import MenuListPage from "./pages/MenuListPage";
import DietListPage from "./pages/DietListPage";
import ProgressTrackerPage from "./pages/ProgressTrackerPage";

export default function App() {
  const location = useLocation();

  // In Web_Pradiabet_Local:
  // 1. LandingPage ('/') has its own dedicated landing nav & dark footer.
  // 2. Auth pages ('/login', '/register') are standalone full-screen centered cards without top navbar.
  // 3. Only authenticated pages ('/dashboard', '/menu', '/diet', '/progress', '/questionnaire', '/chatbot') show base Navbar.
  const isLandingPage = location.pathname === "/";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  const showNavbar = !isLandingPage && !isAuthPage;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar: only shown for authenticated/in-app pages (Dashboard, Menu, Diet, Progress, Questionnaire, Chatbot) */}
      {showNavbar && <Navbar />}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/questionnaire" element={<QuestionnairePage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/menu" element={<MenuListPage />} />
          <Route path="/diet" element={<DietListPage />} />
          <Route path="/progress" element={<ProgressTrackerPage />} />
          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
