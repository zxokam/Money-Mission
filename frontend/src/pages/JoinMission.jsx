import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MissionCard from "../components/MissionCard";
import { useApp } from "../store/AppContext";
import { demoMissionFeed } from "../data/demoData";
import { acceptMissionApi } from "../utils/api";

function getMission(missionId) {
  const stored = sessionStorage.getItem("joinMission");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (String(parsed.id) === String(missionId)) return parsed;
    } catch {}
  }
  return demoMissionFeed.find((x) => String(x.id) === String(missionId)) || demoMissionFeed[0];
}

export default function JoinMission() {
  const [searchParams] = useSearchParams();
  const missionId = searchParams.get("id");
  const navigate = useNavigate();
  const { acceptMission, user } = useApp();

  const m = getMission(missionId);
  const isPhoto = m.verificationMethod === "photo";

  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const accept = async () => {
    setError("");
    if (user) {
      const result = await acceptMissionApi(m.id, user.id);
      if (!result) {
        setError("This mission may already be claimed by someone else.");
        return;
      }
    }
    setAccepted(true);
    acceptMission(m);
    setTimeout(() => navigate("/dashboard"), 800);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white/90 mb-1">Join Mission</h1>
      <p className="text-sm text-white/35 mb-4">
        {accepted
          ? "Mission accepted! Heading to your dashboard."
          : `Review and accept ${m.sponsor}'s challenge.`}
      </p>

      <MissionCard mission={m} />

      {/* Expiry warning */}
      {!accepted && m.expiresIn != null && m.expiresIn <= 3 && (
        <div className="mt-3 bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
          <span className="text-sm">⏳</span>
          <div>
            <p className="text-xs font-semibold text-red-400">This mission expires soon</p>
            <p className="text-[11px] text-red-400/60">
              Only {m.expiresIn} day{m.expiresIn > 1 ? "s" : ""} left to accept before it's auto-removed.
            </p>
          </div>
        </div>
      )}

      {/* Accepted state */}
      {accepted ? (
        <div className="mt-4 space-y-3">
          <div className="bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-4 text-center">
            <span className="text-2xl block mb-1">🤝</span>
            <p className="text-sm font-semibold text-emerald-400">Mission Taken!</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">
              <strong>You</strong> accepted <strong>{m.sponsor}'s</strong> challenge
            </p>
            <p className="text-xs text-white/30 mt-1">RM{m.reward} reward at stake</p>
          </div>

          <div className={`backdrop-blur-xl rounded-2xl border p-4 ${
            isPhoto ? "bg-teal-500/5 border-teal-500/15" : "bg-amber-500/5 border-amber-500/15"
          }`}>
            <p className={`text-sm font-semibold ${isPhoto ? "text-teal-400" : "text-amber-400"}`}>
              {isPhoto ? "📸 Your Daily Mission" : "🏦 Your Tracking Mission"}
            </p>
            {isPhoto ? (
              <ul className="text-xs text-teal-400/60 mt-2 space-y-1.5">
                <li><strong className="text-teal-400/80">Post a photo every day</strong><br /><span className="text-teal-400/40">of {m.photoSubject || "your progress"}</span></li>
                <li><strong className="text-teal-400/80">AI reviews each submission</strong><br /><span className="text-teal-400/40">verifying authenticity daily</span></li>
                <li><strong className="text-teal-400/80">Final verdict at end date</strong><br /><span className="text-teal-400/40">{m.endDate} — AI accepts or rejects</span></li>
              </ul>
            ) : (
              <ul className="text-xs text-amber-400/60 mt-2 space-y-1.5">
                <li><strong className="text-amber-400/80">Upload bank statement at end date</strong><br /><span className="text-amber-400/40">{m.endDate} — submit your transaction PDF</span></li>
                <li><strong className="text-amber-400/80">AI cross-references with your budget</strong><br /><span className="text-amber-400/40">configured in Settings ⚙</span></li>
                <li><strong className="text-amber-400/80">Verdict: accepted if rules followed</strong><br /><span className="text-amber-400/40">rejected if AI detects violations</span></li>
              </ul>
            )}
          </div>

          <div className="w-full mt-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium py-3 rounded-xl text-center text-sm">
            Added to your dashboard — redirecting...
          </div>
        </div>
      ) : (
        <>
          <div className={`mt-4 backdrop-blur-xl rounded-2xl border p-4 ${
            isPhoto ? "bg-teal-500/5 border-teal-500/15" : "bg-amber-500/5 border-amber-500/15"
          }`}>
            <p className={`text-sm font-semibold ${isPhoto ? "text-teal-400" : "text-amber-400"}`}>What You'll Need To Do</p>
            {isPhoto ? (
              <ul className="text-xs text-teal-400/60 mt-1.5 space-y-1">
                <li>• Take a photo of: <strong className="text-teal-400/80">{m.photoSubject || "your progress"}</strong></li>
                <li>• Frequency: <strong className="text-teal-400/80">{m.photoFrequency === "daily" ? "Every day" : m.photoFrequency === "per-ride" ? "Every ride" : "Once per week"}</strong></li>
                <li>• AI checks every photo — <strong className="text-red-400/80">rejected</strong> if you miss or fake it</li>
              </ul>
            ) : (
              <ul className="text-xs text-amber-400/60 mt-1.5 space-y-1">
                <li>• Log every expense honestly</li>
                <li>• Stay within your safe daily limit</li>
                <li>• AI cross-checks bank PDF — <strong className="text-red-400/80">rejected</strong> if rules broken</li>
              </ul>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">{error}</p>
          )}
          <button onClick={accept}
            className="w-full mt-4 bg-emerald-500 text-slate-900 font-semibold py-3 rounded-xl shadow-[0_2px_20px_rgba(16,185,129,0.2)] hover:bg-emerald-400 hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] transition-all text-sm">
            Accept Mission
          </button>
        </>
      )}
    </div>
  );
}
