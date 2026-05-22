import { Link } from "react-router-dom";
import { useApp } from "../store/AppContext";

const steps = [
  {
    num: 1,
    title: "Set budget",
    desc: "Tell us your income & expenses so AI can evaluate your spending.",
    link: "/settings",
    label: "Set Budget",
    done: (ctx) => ctx.budget?.income > 0 || ctx.budget?.safeDailyLimit > 0,
  },
  {
    num: 2,
    title: "Browse missions",
    desc: "Pick a challenge — bank missions track spending, photo missions track habits.",
    link: "/dashboard",
    label: "Browse",
    done: (ctx) => ctx.activeMissions?.length > 0,
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

export default function LandingPage() {
  const ctx = useApp();

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
          const completed = s.done(ctx);
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
      </div>
    </div>
  );
}
