export default function FinancialScoreCard({ score }) {
  const colorClass = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex items-center gap-4 shadow-[0_2px_20px_rgba(0,0,0,0.15)]">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round"
            className={colorClass}
            style={{ strokeDasharray: circ, strokeDashoffset: circ - dash, transition: "stroke-dashoffset 1s ease-out" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-bold ${colorClass}`}>{score}</span>
          <span className="text-[10px] text-white/20">/100</span>
        </div>
      </div>
      <div>
        <p className="font-semibold text-white/80">Financial Health</p>
        <p className="text-xs text-white/30 mt-0.5">
          {score < 60 ? "Track expenses to improve" : score < 80 ? "On the right track" : "Great discipline"}
        </p>
      </div>
    </div>
  );
}
