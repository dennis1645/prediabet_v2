const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== "undefined" && window.location.port === "5173"
    ? "http://localhost:5000/api"
    : "/api");

function getAuthHeader() {
  const token = localStorage.getItem("prediabeat_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "Permintaan ke server gagal.");
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      const netError = new Error("Gagal terhubung ke server backend (localhost:5000). Pastikan server backend sedang aktif.");
      netError.status = 503;
      throw netError;
    }
    throw error;
  }
}

export const api = {
  // Authentication
  login: (credentials) =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  getMe: () => request("/auth/me"),

  updateAccountProfile: (payload) =>
    request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  uploadAvatar: (image_base64) =>
    request("/auth/avatar", {
      method: "POST",
      body: JSON.stringify({ image_base64 }),
    }),

  // Dashboard & Meal Plan
  getDashboard: () => request("/dashboard"),

  regenerateMealPlan: () =>
    request("/dashboard/regenerate-meal-plan", {
      method: "POST",
    }),

  updateMealFrequency: (payload) =>
    request("/dashboard/meal-frequency", {
      method: "PUT",
      body: JSON.stringify(typeof payload === "string" ? { frequency: payload } : payload),
    }),

  // Questionnaire
  getQuestionnaireDraft: () => request("/questionnaire/draft"),

  saveQuestionnaireDraft: (draftData, lastSection) =>
    request("/questionnaire/draft", {
      method: "POST",
      body: JSON.stringify({ draftData, lastSection }),
    }),

  submitQuestionnaire: (profileData) =>
    request("/questionnaire/submit", {
      method: "POST",
      body: JSON.stringify(profileData),
    }),

  // Diets
  getDiets: () => request("/diet"),
  getDietDetail: (slug) => request(`/diet/${slug}`),
  activateDiet: (dietId) =>
    request("/diet/activate", {
      method: "POST",
      body: JSON.stringify({ dietId }),
    }),
  deactivateDiet: () =>
    request("/diet/deactivate", {
      method: "POST",
    }),

  // Foods & Activities
  getFoods: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/foods${query ? `?${query}` : ""}`);
  },
  getActivities: () => request("/activities"),

  // Progress Tracker
  getDailyLog: (date) => request(`/progress/${date || ""}`),
  saveDailyLog: (logData) =>
    request("/progress/log", {
      method: "POST",
      body: JSON.stringify(logData),
    }),
  resetProgress: () =>
    request("/progress/reset", {
      method: "DELETE",
    }),
  getWeeklyProgress: () => request("/progress/summary/weekly"),

  // Conversational Onboarding Interview
  getOnboardingState: () => request("/onboarding/state"),
  answerOnboarding: (answer, message) =>
    request("/onboarding/answer", {
      method: "POST",
      body: JSON.stringify({ answer, message }),
    }),
  resetOnboarding: () =>
    request("/onboarding/reset", {
      method: "POST",
    }),

  // AI Chatbot Dr. Predi (Protected with JWT, Isolated Medical Context & Multi-Session)
  sendChatMessage: (message, sessionId, lastSuggestedRecipe) =>
    request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: sessionId,
        last_suggested_recipe: lastSuggestedRecipe || null,
      }),
    }),
  getChatSessions: () => request("/ai/sessions"),
  createChatSession: (title) =>
    request("/ai/sessions", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  getChatSessionHistory: (sessionId) => request(`/ai/sessions/${sessionId}/history`),
  deleteChatSession: (sessionId) =>
    request(`/ai/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  getChatHistory: (sessionId) =>
    request(sessionId ? `/ai/history?session_id=${sessionId}` : "/ai/history"),
  clearChatHistory: () =>
    request("/ai/history", {
      method: "DELETE",
    }),
  getAIContext: () => request("/ai/context"),
  getWaReminders: () => request("/auth/wa-reminders"),
  saveWaReminders: (data) =>
    request("/auth/wa-reminders", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  getWaBotStatus: () => request("/auth/wa-bot/status"),
  connectWaBot: (forceReset = false) =>
    request("/auth/wa-bot/connect", {
      method: "POST",
      body: JSON.stringify({ forceReset }),
    }),
  disconnectWaBot: () =>
    request("/auth/wa-bot/disconnect", {
      method: "POST",
    }),
  testSendWaReminder: (phone_number) =>
    request("/auth/wa-bot/test-send", {
      method: "POST",
      body: JSON.stringify({ phone_number }),
    }),
  logFoodDirect: (data) =>
    request("/ai/log-food-direct", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Admin Dashboard (Evaluasi & Manajemen User)
  adminGetUsers: () => request("/admin/users"),
  adminUpdateUserRole: (id, role) =>
    request(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),
  adminResetPassword: (id, newPassword) =>
    request(`/admin/users/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
  adminDeleteUser: (id) =>
    request(`/admin/users/${id}`, {
      method: "DELETE",
    }),
  adminGetUserChats: (id) => request(`/admin/users/${id}/chats`),
  adminDownloadChats: async (format = "csv", userId = null) => {
    const query = `format=${encodeURIComponent(format)}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`;
    const response = await fetch(`${API_BASE_URL}/admin/chats/export?${query}`, {
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      throw new Error("Gagal mengunduh file percakapan.");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateStamp = new Date().toISOString().split("T")[0];
    a.download = `prediabeat_chats_${userId ? `user_${userId}` : "all_users"}_${dateStamp}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;
