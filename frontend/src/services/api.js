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

  // Dashboard & Meal Plan
  getDashboard: () => request("/dashboard"),

  regenerateMealPlan: () =>
    request("/dashboard/regenerate-meal-plan", {
      method: "POST",
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
  getWeeklyProgress: () => request("/progress/summary/weekly"),

  // AI Chatbot Dr. Predi (Protected with JWT, Isolated Medical Context & Multi-Session)
  sendChatMessage: (message, sessionId) =>
    request("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, session_id: sessionId }),
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
  logFoodDirect: (data) =>
    request("/ai/log-food-direct", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export default api;
