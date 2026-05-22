import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AIResultCard from "../components/AIResultCard";
import DollarLoading from "../components/DollarLoading";
import { evaluateMission } from "../utils/api";

export default function EvaluationResult() {
  const [evaluation, setEvaluation] = useState(null);

  useEffect(() => {
    const missionId = sessionStorage.getItem("evalMissionId") || "mission_001";
    const photoDiary = sessionStorage.getItem("photoDiary");
    const body = photoDiary ? { photo_diary: JSON.parse(photoDiary) } : null;
    evaluateMission(missionId, body).then((r) => {
      if (r) setEvaluation(r);
    });
    sessionStorage.removeItem("evalMissionId");
    sessionStorage.removeItem("photoDiary");
  }, []);

  if (!evaluation) {
    return <DollarLoading />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white/90 text-center">AI Evaluation</h1>

      <AIResultCard evaluation={evaluation} />

      <div className="flex gap-2 pt-2">
        <Link to="/dashboard"
          className="flex-1 bg-white/[0.04] text-white/50 font-medium py-2.5 rounded-xl border border-white/[0.08] text-center no-underline text-sm hover:bg-white/[0.08] hover:text-white/70 transition-all">
          Dashboard
        </Link>
        <Link to="/create"
          className="flex-1 bg-emerald-500 text-slate-900 font-semibold py-2.5 rounded-xl shadow-[0_2px_20px_rgba(16,185,129,0.2)] text-center no-underline text-sm hover:bg-emerald-400 hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] transition-all">
          New Mission
        </Link>
      </div>
    </div>
  );
}
