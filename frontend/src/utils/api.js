import { demoMission, demoBaseline, demoTransactions, demoEvaluation } from "../data/demoData";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function req(url, opts = {}) {
  try {
    const r = await fetch(`${BASE}${url}`, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.warn(`API ${url} failed:`, r.status, err.detail || "");
      return null;
    }
    return r.json();
  } catch (e) {
    console.warn(`API ${url} unreachable, using demo data.`);
    return null;
  }
}

// Auth
export const loginUser = (username) =>
  req("/api/users/login", { method: "POST", body: JSON.stringify({ username }) });

// User settings
export const getUserSettings = (userId) =>
  req(`/api/users/${userId}/settings`).then((r) => r || { income: 0, safeDailyLimit: 0, healthScore: 60 });

export const getDashboard = (userId) =>
  req(`/api/users/${userId}/dashboard`).then((r) => r || { settings: {}, my_missions: [], available_missions: [] });

export const saveUserSettings = (userId, data) =>
  req(`/api/users/${userId}/settings`, { method: "POST", body: JSON.stringify(data) });

// Missions
export const createMission = (d) =>
  req("/api/missions", { method: "POST", body: JSON.stringify(d) }).then((r) => r || { ...demoMission, ...d });

export const listAvailableMissions = () =>
  req("/api/missions/available").then((r) => r || []);

export const listMyMissions = (userId) =>
  req(`/api/missions?user_id=${userId}`).then((r) => r || []);

export const acceptMissionApi = (missionId, userId) =>
  req(`/api/missions/${missionId}/accept`, { method: "POST", body: JSON.stringify({ user_id: userId }) });

export const cancelMissionApi = (missionId, userId) =>
  req(`/api/missions/${missionId}/cancel`, { method: "POST", body: JSON.stringify({ user_id: userId }) });

export const deleteMission = (missionId) =>
  req(`/api/missions/${missionId}`, { method: "DELETE" });

export const getMission = (id) =>
  req(`/api/missions/${id}`).then((r) => r || demoMission);

export const listMissions = () =>
  req("/api/missions").then((r) => r || []);

// Financial setup
export const submitFinancialSetup = (d) =>
  req("/api/missions/1/financial-setup", { method: "POST", body: JSON.stringify(d) }).then((r) => r || demoBaseline);

export const getFinancialSetup = (id) =>
  req(`/api/missions/${id}/financial-setup`).then((r) => r || demoBaseline);

// Transactions
export const submitTransactions = (d) =>
  req(`/api/missions/${d.missionId}/transactions`, {
    method: "POST",
    body: JSON.stringify(d.transactions),
  }).then((r) => r || { success: true });

export const getTransactions = (id) =>
  req(`/api/missions/${id}/transactions`).then((r) => r || demoTransactions);

// Evaluation
export const evaluateMission = (id, body = null) =>
  req(`/api/missions/${id}/evaluate`, {
    method: "POST",
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then((r) => r || demoEvaluation);

export const getEvaluation = (id) =>
  req(`/api/missions/${id}/evaluation`).then((r) => r || demoEvaluation);

// Upload receipt
// Photo diary entries
export const listPhotoEntries = (missionId) =>
  req(`/api/missions/${missionId}/photo-entries`).then((r) => r || []);

export const addPhotoEntry = (missionId, photoDate, photoUrl) =>
  req(`/api/missions/${missionId}/photo-entries`, {
    method: "POST",
    body: JSON.stringify({ photo_date: photoDate, photo_url: photoUrl }),
  });

export const removePhotoEntry = (missionId, photoDate) =>
  req(`/api/missions/${missionId}/photo-entries/${photoDate}`, { method: "DELETE" });

export const parseBankStatement = async (file) => {
  try {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/api/uploads/bank-statement`, { method: "POST", body: form });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
};

export const uploadReceipt = async (file) => {
  try {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`${BASE}/api/uploads/receipt`, { method: "POST", body: form });
    if (!r.ok) return null;
    return r.json();
  } catch {
    return null;
  }
};
