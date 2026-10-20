import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";
import { initialUser, initialProfile, initialAnalysis } from "../services/mockData";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("prediabeat_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem("prediabeat_profile");
    return saved ? JSON.parse(saved) : null;
  });

  const [analysis, setAnalysis] = useState(() => {
    const saved = localStorage.getItem("prediabeat_analysis");
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem("prediabeat_token"));
  const [loading, setLoading] = useState(true);

  // Sync state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("prediabeat_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("prediabeat_user");
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem("prediabeat_profile", JSON.stringify(profile));
    } else {
      localStorage.removeItem("prediabeat_profile");
    }
  }, [profile]);

  useEffect(() => {
    if (analysis) {
      localStorage.setItem("prediabeat_analysis", JSON.stringify(analysis));
    } else {
      localStorage.removeItem("prediabeat_analysis");
    }
  }, [analysis]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("prediabeat_token", token);
    } else {
      localStorage.removeItem("prediabeat_token");
    }
  }, [token]);

  // Check auth session with backend on initial load
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem("prediabeat_token");
      if (storedToken) {
        try {
          const res = await api.getMe();
          if (res.success && res.data) {
            setUser(res.data.user);
            if (res.data.profile) setProfile(res.data.profile);
            if (res.data.analysis) setAnalysis(res.data.analysis);
          }
        } catch (err) {
          console.warn("Session check with backend failed:", err.message);
          // If 401 (token expired/invalid), clear session
          if (err.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    }

    verifySession();
  }, []);

  const login = async (username, password) => {
    const res = await api.login({ username, password });
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      if (res.data.profile) setProfile(res.data.profile);
      if (res.data.analysis) setAnalysis(res.data.analysis);
      return res;
    }
    throw new Error(res.message || "Gagal masuk.");
  };

  const register = async (username, email, password) => {
    const res = await api.register({ username, email, password });
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);
      return res;
    }
    throw new Error(res.message || "Gagal mendaftar.");
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    setAnalysis(null);
    localStorage.removeItem("prediabeat_token");
    localStorage.removeItem("prediabeat_user");
    localStorage.removeItem("prediabeat_profile");
    localStorage.removeItem("prediabeat_analysis");
  };

  const updateProfileAndAnalysis = async (newProfileData) => {
    try {
      const res = await api.submitQuestionnaire(newProfileData);
      if (res.success && res.data) {
        setProfile(res.data.profile);
        setAnalysis(res.data.analysis);
        return res;
      }
    } catch (err) {
      console.warn("Submitting questionnaire to backend failed, using local calculation fallback:", err);
      // Local fallback calculation if backend unreachable
      const tb = parseFloat(newProfileData.tinggi_badan) || 170;
      const bb = parseFloat(newProfileData.berat_badan) || 70;
      const usia = parseInt(newProfileData.usia, 10) || 40;
      const jk = newProfileData.jenis_kelamin || "Laki-laki";
      
      const bmiVal = bb / ((tb / 100) * (tb / 100));
      let statusBmi = "Normal";
      if (bmiVal < 18.5) statusBmi = "Berat Badan Kurang";
      else if (bmiVal >= 23 && bmiVal < 25) statusBmi = "Kelebihan Berat Badan (Overweight)";
      else if (bmiVal >= 25) statusBmi = "Obesitas";

      let bmr = 10 * bb + 6.25 * tb - 5 * usia + (jk === "Laki-laki" ? 5 : -161);
      const targetKalori = Math.round(bmr * 1.35);

      const updatedProfile = { ...profile, ...newProfileData };
      const updatedAnalysis = {
        ...analysis,
        bmi: parseFloat(bmiVal.toFixed(1)),
        kategori_bmi: statusBmi,
        target_kalori: targetKalori,
        target_karbo: Math.round((targetKalori * 0.5) / 4),
        target_protein: Math.round((targetKalori * 0.2) / 4),
        target_lemak: Math.round((targetKalori * 0.3) / 9),
      };

      setProfile(updatedProfile);
      setAnalysis(updatedAnalysis);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        analysis,
        token,
        loading,
        login,
        register,
        logout,
        setProfile,
        setAnalysis,
        updateProfileAndAnalysis,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
