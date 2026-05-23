import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { demoMissionFeed, demoBaseline } from "../data/demoData";
import { getDashboard } from "../utils/api";

const diffColor = { Easy: "text-emerald-400", Medium: "text-amber-400", Hard: "text-red-400" };

function computeExpiresIn(createdAt, expireDays) {
  if (!createdAt) return 0;
  const age = Math.round((new Date() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  return Math.max(0, (expireDays || 15) - age);
}

export default function Dashboard() {
  const [filter, setFilter] = useState("All");
  const [availableFeed, setAvailableFeed] = useState([]);
  const [tick, setTick] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMissions, budget, cancelMission, user, loadMyMissions, updateBudget, burnoutPrediction } = useApp();
  const [dismissBurnout, setDismissBurnout] = useState(false);

  const handleCancel = async (missionId) => {
    await cancelMission(missionId);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    if (!user) return;
    getDashboard(user.id).then((data) => {
      const { settings, my_missions, available_missions } = data;
      if (settings) {
        updateBudget({
          income: settings.income || 0,
          safeDailyLimit: settings.safeDailyLimit || 0,
          healthScore: settings.healthScore || 60,
        });
      }
      const mapMission = (m) => ({
        id: m.id,
        title: m.title,
        sponsor: m.sponsor_name || m.sponsor_name,
        reward: m.reward_amount,
        difficulty: "Easy",
        category: "General",
        daysLeft: m.days_left || 0,
        expiresIn: computeExpiresIn(m.created_at, m.expire_days),
        participants: 1,
        rules: m.rules || "",
        verificationMethod: m.verification_method,
        startDate: m.start_date,
        endDate: m.end_date,
        participant: m.participant_name,
        photoSubject: m.photo_subject || "",
        photoFrequency: m.photo_frequency || "daily",
        totalPhotosRequired: m.total_photos_required || 0,
      });

      if (available_missions) {
        setAvailableFeed(available_missions.map(mapMission));
      } else if (availableFeed.length === 0) {
        setAvailableFeed(demoMissionFeed);
      }

      loadMyMissions(my_missions ? my_missions.map(mapMission) : []);
    }).catch(() => {
      if (availableFeed.length === 0) setAvailableFeed(demoMissionFeed);
    });
  }, [user?.id, location.key, tick]);

  const cats = ["All", ...new Set(availableFeed.map((m) => m.category))];
  const acceptedIds = new Set(activeMissions.map((m) => m.id));
  const liveFeed = availableFeed.filter((m) => m.expiresIn > 0 && !acceptedIds.has(m.id));
  const expiredMissions = availableFeed.filter((m) => m.expiresIn === 0);
  const filtered = filter === "All" ? liveFeed : liveFeed.filter((m) => m.category === filter);
  const budgetDisplay = budget || demoBaseline;

  // Burnout alert logic
  const today = new Date().getDate();
  const burnoutDay = burnoutPrediction?.burnoutDay;
  const daysUntilBurnout = burnoutDay ? (burnoutDay - today <= 0 ? burnoutDay + 30 - today : burnoutDay - today) : 99;
  const showBurnoutAlert = burnoutPrediction && daysUntilBurnout <= 5 && !dismissBurnout;

  return (
    <div className="space-y-4">
      {/* Burnout alert banner */}
      {showBurnoutAlert && (
        <div className="bg-amber-500/[0.08] border border-amber-500/25 rounded-2xl p-4 flex items-start gap-3 animate-in">
          <span className="text-xl shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Money running low soon</p>
            <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
              {daysUntilBurnout === 0
                ? "Your money typically runs out around today. Be extra careful with spending!"
                : daysUntilBurnout === 1
                ? "Your money typically runs out tomorrow. Stick to essentials only."
                : `Based on your spending patterns, you'll likely run out in ${daysUntilBurnout} days (around day ${burnoutDay}).`}
            </p>
            {burnoutPrediction.burnoutRisk && (
              <p className="text-[11px] text-amber-400/40 mt-1">{burnoutPrediction.burnoutRisk}</p>
            )}
          </div>
          <button
            onClick={() => setDismissBurnout(true)}
            className="text-amber-400/40 hover:text-amber-400 text-sm shrink-0 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active missions */}
      <div className="space-y-2">
        {activeMissions.length === 0 ? (
          <div className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-center">
            <p className="text-sm text-white/30">Accept a mission to get started</p>
            <p className="text-xs text-white/15 mt-1">Browse available missions below and accept one.</p>
          </div>
        ) : activeMissions.map((m, i) => {
          if (!m.verificationMethod) {
            return (
              <div key="empty" className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 text-center">
                <p className="text-sm text-white/30">{m.title}</p>
                <p className="text-xs text-white/15 mt-1">{m.description}</p>
              </div>
            );
          }
          const isPhoto = m.verificationMethod === "photo";
          const today = new Date();
          const end = new Date(m.endDate);
          const remainingDays = Math.max(0, Math.ceil((end - today) / (1000 * 60 * 60 * 24)));
          return (
            <div key={m.id || i}
              onClick={() => navigate(isPhoto ? "/photo-diary" : "/transactions")}
              className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 shadow-[0_2px_20px_rgba(16,185,129,0.06)] cursor-pointer hover:bg-emerald-500/15 hover:border-emerald-500/30 transition-all duration-200">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-emerald-400/70 font-medium uppercase tracking-wider">
                  {isPhoto ? "📸 Photo Mission" : "🏦 Bank Mission"}
                </p>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                  {remainingDays}d left
                </span>
              </div>
              <h3 className="font-semibold text-white/90 mt-1">{m.title}</h3>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-white/30">
                <span>Taken by <strong className="text-white/50">{m.participant || "You"}</strong></span>
                <span className="text-white/15">·</span>
                <span>Sponsored by <strong className="text-white/50">{m.sponsor}</strong></span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs">
                <span className="text-emerald-400 font-semibold">RM{m.reward}</span>
                <span className="text-white/25">
                  {isPhoto ? "Post daily updates" : `Evaluation on ${m.endDate}`}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleCancel(m.id); }}
                  className="ml-auto text-[10px] px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex gap-2 text-xs">
        <span className="bg-white/[0.04] backdrop-blur rounded-full px-3 py-1 border border-white/[0.08] text-white/35">
          Score {budgetDisplay.healthScore}
        </span>
        <span className="bg-white/[0.04] backdrop-blur rounded-full px-3 py-1 border border-white/[0.08] text-white/35">
          RM{budgetDisplay.safeDailyLimit}/day
        </span>
        <Link to="/settings"
          className="bg-white/[0.04] backdrop-blur rounded-full px-3 py-1 border border-white/[0.08] text-white/30 hover:text-white/50 no-underline text-xs transition-colors">
          ⚙ Budget
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white/80">Available Missions</h2>
        <button onClick={() => navigate("/create")}
          className="text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
          + Create
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {cats.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              filter === c
                ? "bg-white/10 text-white"
                : "bg-white/[0.03] text-white/35 border border-white/[0.06] hover:text-white/60 hover:border-white/[0.10]"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Mission list */}
      <div className="space-y-2">
        {filtered.map((m) => {
          const urgent = m.expiresIn <= 3;
          return (
            <div key={m.id} onClick={() => { sessionStorage.setItem("joinMission", JSON.stringify(m)); navigate(`/join?id=${m.id}`); }}
              className={`backdrop-blur-xl border rounded-2xl p-4 transition-all duration-200 cursor-pointer ${
                m.expiresIn <= 1
                  ? "bg-red-500/[0.04] border-red-500/15 hover:bg-red-500/[0.07] hover:border-red-500/25"
                  : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/[0.14] hover:-translate-y-[1px] hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
              }`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className={`font-semibold text-sm flex-1 ${m.expiresIn <= 1 ? "text-red-300" : "text-white/85"}`}>{m.title}</h3>
                <div className="flex items-center gap-1.5 shrink-0">
                  {m.verificationMethod && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                      m.verificationMethod === "photo"
                        ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {m.verificationMethod === "photo" ? "Photo" : "Bank"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-white/30">
                <span>{m.sponsor}</span>
                <span className="font-semibold text-emerald-400">RM{m.reward}</span>
                <span className={diffColor[m.difficulty]}>{m.difficulty}</span>
                <span className={`ml-auto font-medium ${
                  urgent ? "text-red-400" : m.expiresIn <= 5 ? "text-amber-400" : "text-white/25"
                }`}>
                  {urgent ? `⏳ ${m.expiresIn}d left` : `Expires in ${m.expiresIn}d`}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10 text-white/20 text-sm">No active missions in this category.</p>
      )}

      {expiredMissions.length > 0 && (
        <p className="text-center text-[11px] text-white/12 pt-2">
          {expiredMissions.length} mission{expiredMissions.length > 1 ? "s" : ""} expired and auto-removed
        </p>
      )}
    </div>
  );
}

