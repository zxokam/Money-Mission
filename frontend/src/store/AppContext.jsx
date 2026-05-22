import { createContext, useContext, useReducer, useState, useCallback, useEffect } from "react";
import { demoBaseline } from "../data/demoData";
import { getCurrentUser, logout as doLogout, loginWithUsername } from "../utils/supabaseClient";
import { getDashboard, cancelMissionApi } from "../utils/api";

const AppContext = createContext(null);

function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const initialState = {
  activeMissions: [],
  budget: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "ACCEPT_MISSION": {
      const alreadyAccepted = state.activeMissions.find((m) => m.id === action.mission.id);
      if (alreadyAccepted) return state;
      const today = fmtLocal(new Date());

      // Keep original mission dates — don't remap to today
      // Past dates naturally show as missed in the photo diary grid
      let startDate = action.mission.startDate || today;
      let endDate = action.mission.endDate;
      if (!endDate || new Date(endDate) <= new Date(startDate)) {
        const duration = action.mission.totalPhotosRequired || action.mission.daysLeft || 30;
        const end = new Date(startDate);
        end.setDate(end.getDate() + duration - 1);
        endDate = fmtLocal(end);
      }

      return {
        ...state,
        activeMissions: [
          ...state.activeMissions,
          {
            ...action.mission,
            participant: "You",
            acceptedAt: today,
            startDate,
            endDate,
          },
        ],
      };
    }
    case "LOAD_MY_MISSIONS":
      return { ...state, activeMissions: action.missions };
    case "CANCEL_MISSION":
      return { ...state, activeMissions: state.activeMissions.filter((m) => m.id !== action.missionId) };
    case "UPDATE_BUDGET":
      return { ...state, budget: action.budget };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => ({
    ...init,
    budget: demoBaseline,
  }));

  const [user, setUser] = useState(() => getCurrentUser());

  const loadUserData = useCallback(async (userId) => {
    const data = await getDashboard(userId).catch(() => ({ settings: null, my_missions: null }));
    const { settings, my_missions } = data;
    if (settings) {
      dispatch({
        type: "UPDATE_BUDGET",
        budget: {
          income: settings.income || 0,
          safeDailyLimit: settings.safeDailyLimit || 0,
          healthScore: settings.healthScore || 60,
        },
      });
    }
    dispatch({
      type: "LOAD_MY_MISSIONS",
      missions: my_missions ? my_missions.map((m) => ({
        id: m.id,
        title: m.title,
        sponsor: m.sponsor_name || m.sponsor_name,
        reward: m.reward_amount,
        difficulty: "Easy",
        category: "General",
        daysLeft: m.days_left || 0,
        rules: m.rules || "",
        verificationMethod: m.verification_method,
        startDate: m.start_date,
        endDate: m.end_date,
        participant: m.participant_name,
        photoSubject: m.photo_subject || "",
        photoFrequency: m.photo_frequency || "daily",
        totalPhotosRequired: m.total_photos_required || 0,
      })) : [],
    });
  }, []);

  // Load data on page load if user exists in localStorage
  useEffect(() => {
    if (user) {
      loadUserData(user.id);
    }
  }, []);

  const login = useCallback(async (username) => {
    dispatch({ type: "LOAD_MY_MISSIONS", missions: [] });
    dispatch({ type: "UPDATE_BUDGET", budget: demoBaseline });
    const u = await loginWithUsername(username);
    if (u) {
      setUser(u);
      loadUserData(u.id);
    }
  }, [loadUserData]);

  const logout = useCallback(() => {
    doLogout();
    dispatch({ type: "LOAD_MY_MISSIONS", missions: [] });
    dispatch({ type: "UPDATE_BUDGET", budget: demoBaseline });
    setUser(null);
  }, []);

  const acceptMission = (mission) => dispatch({ type: "ACCEPT_MISSION", mission });
  const loadMyMissions = (missions) => dispatch({ type: "LOAD_MY_MISSIONS", missions });
  const cancelMission = useCallback(async (missionId) => {
    if (user) {
      await cancelMissionApi(missionId, user.id).catch(() => {});
    }
    dispatch({ type: "CANCEL_MISSION", missionId });
  }, [user]);
  const updateBudget = (budget) => dispatch({ type: "UPDATE_BUDGET", budget });

  return (
    <AppContext.Provider value={{ ...state, user, login, logout, acceptMission, loadMyMissions, cancelMission, updateBudget }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
