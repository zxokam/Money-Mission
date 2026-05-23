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
