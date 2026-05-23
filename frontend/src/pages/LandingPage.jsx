import { Link } from "react-router-dom";
import { useApp } from "../store/AppContext";

export default function LandingPage() {
  const ctx = useApp();
  const { burnoutPrediction } = ctx;

  const today = new Date().getDate();
  const burnoutDay = burnoutPrediction?.burnoutDay;
  const daysUntilBurnout = burnoutDay ? (burnoutDay - today <= 0 ? burnoutDay + 30 - today : burnoutDay - today) : 99;
  const urgent = burnoutPrediction && daysUntilBurnout <= 5;
  const hasPrediction = !!burnoutPrediction;

  const steps = [
    {
      num: 1,
      title: "Set budget",
      desc: "Tell us your income & expenses so AI can evaluate your spending.",
      link: "/settings",
      label: "Set Budget",
      done: ctx.budget?.income > 0 || ctx.budget?.safeDailyLimit > 0,
    },
    {
      num: 2,
      title: "Browse missions",
      desc: "Pick a challenge — bank missions track spending, photo missions track habits.",
      link: "/dashboard",
      label: "Browse",
      done: ctx.activeMissions?.length > 0,
    },
    {
      num: 3,
      title: "Challenge a friend",
      desc: "Set a reward and let AI verify their progress.",
      link: "/create",
      label: "Create",
      done: () => false,
    },
  ];

  return (
    <div className="flex flex-col items-center text-center pt-10 pb-12">
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg mb-4">
        $
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1.5">
        <span className="text-white">Money</span>
        <span className="text-emerald-400">Mission</span>
      </h1>
      <p className="text-white/35 text-xs mb-6">
        Create missions. Prove progress. AI verifies.
      </p>

      <div className="w-full max-w-xs space-y-2">
        {steps.map((s) => {
          const completed = typeof s.done === "function" ? s.done(ctx) : s.done;
          return (
            <div
              key={s.num}
              className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                completed
                  ? "bg-emerald-500/[0.04] border-emerald-500/15"
                  : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    completed
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {completed ? "✓" : s.num}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs font-semibold ${completed ? "text-emerald-400/70" : "text-white/70"}`}>
                      {s.title}
                    </span>
                    {completed && (
                      <span className="text-[9px] text-emerald-500/50 bg-emerald-500/10 px-1 py-px rounded-full">Done</span>
                    )}
                    {!completed && (
                      <Link to={s.link} className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 ml-auto">
                        {s.label} →
                      </Link>
                    )}
                  </div>
                  <p className="text-[10px] text-white/25 mt-0.5">{s.desc}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Burnout risk step */}
        <div
          className={`rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
            urgent
              ? "bg-amber-500/[0.08] border-amber-500/25"
              : hasPrediction
              ? "bg-emerald-500/[0.04] border-emerald-500/15"
              : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                urgent
                  ? "bg-amber-500/20 text-amber-400"
                  : hasPrediction
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {urgent ? "⚠" : hasPrediction ? "✓" : "4"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${
                  urgent ? "text-amber-300" : hasPrediction ? "text-emerald-400/70" : "text-white/70"
                }`}>
                  {urgent ? "Burnout alert" : "Check burnout risk"}
                </span>
                {hasPrediction && !urgent && (
                  <span className="text-[9px] text-emerald-500/50 bg-emerald-500/10 px-1 py-px rounded-full">Done</span>
                )}
                {!hasPrediction && (
                  <Link to="/settings" className="text-[10px] font-medium text-emerald-400 hover:text-emerald-300 ml-auto">
                    Analyze →
                  </Link>
                )}
                {urgent && (
                  <Link to="/settings" className="text-[10px] font-medium text-amber-400 hover:text-amber-300 ml-auto">
                    View →
                  </Link>
                )}
              </div>
              {urgent ? (
                <p className="text-[10px] text-amber-400/60 mt-0.5 leading-relaxed">
                  {daysUntilBurnout === 0
                    ? "Your money typically runs out today. Be extra careful with spending!"
                    : daysUntilBurnout === 1
                    ? "You'll likely run out tomorrow. Stick to essentials only."
                    : `You'll likely run out in ${daysUntilBurnout} days (around day ${burnoutDay}).`}
                </p>
              ) : (
                <p className="text-[10px] text-white/25 mt-0.5">
                  {hasPrediction
                    ? `AI analyzed your spending. Next burnout risk: day ${burnoutDay}.`
                    : "Upload 2+ bank statements so AI predicts when you'll run out of money."}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health Card */}
      {ctx.budget && (() => {
        const baseScore = ctx.budget?.healthScore || 60;
        const penalty = urgent ? 25 : daysUntilBurnout <= 10 ? 10 : 0;
        const score = Math.max(0, baseScore - penalty);
        const status = score >= 80 ? "Strong" : score >= 55 ? "Stable" : score >= 30 ? "Tight" : "Critical";
        const statusColors = score >= 80
          ? { text: "text-emerald-400", ring: "#00e68a", bar: "bg-emerald-500", glow: "rgba(0,230,138,0.45)" }
          : score >= 55
          ? { text: "text-blue-400", ring: "#3b82f6", bar: "bg-blue-500", glow: "rgba(59,130,246,0.45)" }
          : score >= 30
          ? { text: "text-amber-400", ring: "#f59e0b", bar: "bg-amber-500", glow: "rgba(245,158,11,0.45)" }
          : { text: "text-red-400", ring: "#ef4444", bar: "bg-red-500", glow: "rgba(239,68,68,0.45)" };
        const degrees = (score / 100) * 360;
        const desc = score >= 80 ? "Great job! Your financial health is excellent."
          : score >= 55 ? "Doing okay. A few tweaks and you'll be set."
          : score >= 30 ? "Getting tight. Watch your spending closely."
          : "Critical. Cut non-essentials immediately.";

        return (
          <div className="w-full max-w-xs mt-4 bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-5 text-left shadow-[0_12px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-xs font-semibold text-white/50 tracking-widest uppercase mb-4">Financial Health</h3>

            {/* Score ring + status */}
            <div className="flex items-center gap-5 mb-5">
              {/* Score ring */}
              <div className="shrink-0 relative w-[100px] h-[100px] flex items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: `conic-gradient(${statusColors.ring} 0deg ${degrees}deg, rgba(255,255,255,0.06) ${degrees}deg 360deg)`, boxShadow: `0 0 25px ${statusColors.glow}` }}
                />
                <div className="absolute inset-[14px] rounded-full bg-[#0a0f0e] border border-white/[0.04]" />
                <div className="relative z-10 text-center leading-none">
                  <span className="text-[28px] font-extrabold text-white block">{score}</span>
                  <span className="text-[10px] text-white/30 font-medium mt-0.5 block">/100</span>
                </div>
              </div>

              {/* Status + progress */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-base font-bold ${statusColors.text}`} style={{ textShadow: `0 0 12px ${statusColors.glow}` }}>{status}</span>
                  {urgent && <span className="text-[9px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full">⚠ At risk</span>}
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed mb-2.5">{desc}</p>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${statusColors.bar}`} style={{ width: `${score}%`, boxShadow: `0 0 10px ${statusColors.glow}` }} />
                </div>
                <div className="text-right mt-1.5 text-[10px] font-semibold text-white/30">
                  <span className={statusColors.text}>{score}</span>/100
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05]">
                <span className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Budget</span>
                <span className="text-sm font-bold text-white/80">RM{ctx.budget?.income || 0}<span className="text-[10px] text-white/25 font-normal">/mo</span></span>
              </div>
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05]">
                <span className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Last Balance</span>
                <span className="text-sm font-bold text-white/80">
                  {burnoutPrediction?.lastBalance ? `RM${Number(burnoutPrediction.lastBalance).toFixed(0)}` : "—"}
                </span>
              </div>
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05]">
                <span className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Daily Limit</span>
                <span className="text-sm font-bold text-white/80">RM{(ctx.budget?.safeDailyLimit || 0).toFixed(2)}<span className="text-[10px] text-white/25 font-normal">/day</span></span>
              </div>
              <div className="bg-white/[0.03] rounded-2xl p-3 border border-white/[0.05]">
                <span className="text-[9px] text-white/30 uppercase tracking-wider block mb-1">Burnout Risk</span>
                <span className={`text-sm font-bold ${urgent ? "text-amber-400" : "text-white/80"}`}>
                  {burnoutDay ? `Day ${burnoutDay}` : "—"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Notification banner when urgent */}
      {urgent && (
        <div className="w-full max-w-xs mt-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-2xl p-4 text-left animate-pulse">
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">🔔</span>
            <div>
              <p className="text-sm font-semibold text-amber-300">Spending burnout warning</p>
              <p className="text-xs text-amber-400/70 mt-1 leading-relaxed">
                {burnoutPrediction.burnoutRisk || `Based on your patterns, you're approaching your burnout day.`}
              </p>
              <Link to="/settings" className="inline-block mt-2 text-[10px] font-medium text-amber-400 hover:text-amber-300">
                See full analysis →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
