import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import { useAuth } from "./context/AuthContext";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import QuestionnairePage from "./pages/QuestionnairePage";
import ChatbotPage from "./pages/ChatbotPage";
import MenuListPage from "./pages/MenuListPage";
import DietListPage from "./pages/DietListPage";
import ProgressTrackerPage from "./pages/ProgressTrackerPage";

function RequireAuth({ children }) {
  const { user, token, loading } = useAuth();
  if (loading) return null;
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequireQuestionnaireCompleted({ children }) {
  const { user, token, profile, loading } = useAuth();
  if (loading) return null;
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (!profile) {
    return <Navigate to="/questionnaire" replace />;
  }
  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, token, profile, loading } = useAuth();
  if (loading) return null;
  if (token && user) {
    return <Navigate to={profile ? "/dashboard" : "/questionnaire"} replace />;
  }
  return children;
}

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
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* Halaman Kuesioner (Wajib login, dapat diakses sebelum maupun sesudah isi profil) */}
          <Route path="/questionnaire" element={<RequireAuth><QuestionnairePage /></RequireAuth>} />

          {/* Halaman Fitur Utama: Mensyaratkan Kuesioner Profil Kesehatan Sudah Lengkap */}
          <Route path="/dashboard" element={<RequireQuestionnaireCompleted><DashboardPage /></RequireQuestionnaireCompleted>} />
          <Route path="/chatbot" element={<RequireQuestionnaireCompleted><ChatbotPage /></RequireQuestionnaireCompleted>} />
          <Route path="/menu" element={<RequireQuestionnaireCompleted><MenuListPage /></RequireQuestionnaireCompleted>} />
          <Route path="/diet" element={<RequireQuestionnaireCompleted><DietListPage /></RequireQuestionnaireCompleted>} />
          <Route path="/progress" element={<RequireQuestionnaireCompleted><ProgressTrackerPage /></RequireQuestionnaireCompleted>} />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
