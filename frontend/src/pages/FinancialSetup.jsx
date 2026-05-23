import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { getUserSettings, saveUserSettings, predictBurnout } from "../utils/api";

const empty = { income: "", fixedExpenses: "", subscriptions: "", payLater: "", foodPerDay: "", transport: "", otherExpenses: "" };

export default function FinancialSetup() {
  const { budget, updateBudget, user } = useApp();
  const navigate = useNavigate();

  const fileRef = useRef(null);
  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Burnout prediction state
  const [burnoutFiles, setBurnoutFiles] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [burnoutError, setBurnoutError] = useState(null);

  useEffect(() => {
    if (!user) return;
    getUserSettings(user.id).then((s) => {
      if (s && (s.income || s.raw)) {
        const r = s.raw || s;
        setForm({
          income: (r.monthly_income || s.income || "").toString(),
          fixedExpenses: (r.fixed_expenses || "").toString(),
          subscriptions: (r.subscriptions || "").toString(),
          payLater: (r.paylater_commitments || "").toString(),
          foodPerDay: (r.average_food_per_day || "").toString(),
          transport: (r.transport_cost || "").toString(),
          otherExpenses: (r.other_required_expenses || "").toString(),
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user?.id]);

  const set = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const income = +form.income || 2800;
    const fixed = (+form.fixedExpenses || 0) + (+form.subscriptions || 0) + (+form.payLater || 0);
    const variable = (+form.foodPerDay || 0) * 30 + (+form.transport || 0) + (+form.otherExpenses || 0);
    const required = fixed + variable;
    const leftover = income - required;
    const daily = Math.round(leftover / 30);

    const data = {
      income,
      fixed_expenses: +form.fixedExpenses || 0,
      subscriptions: +form.subscriptions || 0,
      paylater_commitments: +form.payLater || 0,
      average_food_per_day: +form.foodPerDay || 0,
      transport_cost: +form.transport || 0,
      other_required_expenses: +form.otherExpenses || 0,
    };

    // Save to context
    updateBudget({
      income,
      requiredExpenses: required,
      expectedLeftover: leftover,
      safeDailyLimit: Math.max(0, daily),
      healthScore: budget?.healthScore || 62,
    });

    // Save to API for this user
    if (user) {
      const result = await saveUserSettings(user.id, data);
      if (result) {
        updateBudget({
          income,
          requiredExpenses: required,
          expectedLeftover: leftover,
          safeDailyLimit: result.safeDailyLimit || Math.max(0, daily),
          healthScore: result.healthScore || 62,
        });
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBurnoutFiles = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      setBurnoutFiles((p) => [...p, ...selected]);
      setPrediction(null);
      setBurnoutError(null);
    }
  };

  const removeBurnoutFile = (i) => {
    setBurnoutFiles((p) => p.filter((_, idx) => idx !== i));
    setPrediction(null);
  };

  const analyzeSpending = async () => {
    if (burnoutFiles.length < 2 || !user) return;
    setAnalyzing(true);
    setBurnoutError(null);
    setPrediction(null);
    const result = await predictBurnout(user.id, burnoutFiles);
    setAnalyzing(false);
    if (result?.prediction) {
      setPrediction(result.prediction);
      if (result.months) {
        setPrediction((p) => ({ ...p, _months: result.months }));
      }
    } else {
      setBurnoutError("Analysis failed. Try different PDFs — make sure they're bank statements with visible transactions.");
    }
  };

  const inp = (name, placeholder) => (
    <input name={name} type="number" value={form[name]} onChange={set} placeholder={placeholder} required
      className="w-full px-3 py-2 text-sm" />
  );

  if (loading) {
    return <p className="text-center py-10 text-white/20 text-sm">Loading settings...</p>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">Settings</span>
        </div>
        <button onClick={() => navigate("/dashboard")}
          className="text-xs text-white/30 hover:text-white/50 transition-colors">
          ← Back
        </button>
      </div>
      <h1 className="text-xl font-bold text-white/90 mb-1">Your Monthly Budget</h1>
      <p className="text-sm text-white/35 mb-5">
        Set once, applies to all bank missions. AI uses this baseline to evaluate your spending.
      </p>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Monthly Income (RM)</span>
          {inp("income", "2800")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Fixed Expenses</span>{inp("fixedExpenses", "Rent, utilities")}</label>
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Subscriptions</span>{inp("subscriptions", "Netflix, Spotify")}</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">PayLater</span>{inp("payLater", "SPayLater")}</label>
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Food Per Day</span>{inp("foodPerDay", "Avg daily spending")}</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Transport</span>{inp("transport", "Grab, petrol, parking")}</label>
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Other Expenses</span>{inp("otherExpenses", "Everything else")}</label>
        </div>

        <button type="submit"
          className="w-full bg-amber-500 text-slate-900 font-semibold py-2.5 rounded-xl shadow-[0_2px_20px_rgba(245,158,11,0.15)] hover:bg-amber-400 hover:shadow-[0_4px_25px_rgba(245,158,11,0.25)] transition-all text-sm">
          {saved ? "✓ Saved!" : "Save Budget"}
        </button>
      </form>

      <p className="text-center text-[11px] text-white/15 mt-4">
        This budget is your personal baseline. All bank mission AI evaluations compare against it.
      </p>

      {/* ── Spending Burnout Prediction ── */}
      <div className="mt-10 pt-8 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Burnout Alert</span>
        </div>
        <h2 className="text-lg font-bold text-white/90 mb-1">Spending Burnout Prediction</h2>
        <p className="text-sm text-white/35 mb-5">
          Upload 2+ months of bank statements. AI analyzes patterns to predict when you're likely to overspend or run out of money.
        </p>

        {/* Upload area */}
        <div
          onDrop={(e) => {
            e.preventDefault();
            const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
            if (dropped.length > 0) {
              setBurnoutFiles((p) => [...p, ...dropped]);
              setPrediction(null);
              setBurnoutError(null);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border-2 border-dashed border-white/[0.10] p-8 text-center cursor-pointer hover:border-purple-500/30 hover:bg-purple-500/[0.04] transition-all duration-200"
        >
          <span className="text-3xl block mb-2 opacity-60">📊</span>
          <p className="font-semibold text-white/50 text-sm">Upload Bank Statement PDFs</p>
          <p className="text-xs text-white/25 mt-1.5">At least 2 months of statements for pattern detection</p>
          <p className="text-xs text-white/15 mt-1">Drag & drop or tap to browse</p>
          <input ref={fileRef} type="file" accept="application/pdf" multiple onChange={handleBurnoutFiles} className="hidden" />
        </div>

        {/* File list */}
        {burnoutFiles.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {burnoutFiles.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-white/[0.04] rounded-xl border border-white/[0.06] px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm opacity-60">📄</span>
                  <span className="text-xs text-white/60 truncate">{f.name}</span>
                  <span className="text-[10px] text-white/20">{(f.size / 1024).toFixed(0)} KB</span>
                </div>
                <button onClick={(e) => { e.stopPropagation(); removeBurnoutFile(i); }}
                  className="text-white/15 hover:text-red-400 text-xs transition-colors ml-2 shrink-0">✕</button>
              </div>
            ))}

            <button
              onClick={analyzeSpending}
              disabled={burnoutFiles.length < 2 || analyzing}
              className="w-full bg-purple-500 text-slate-900 font-semibold py-2.5 rounded-xl shadow-[0_2px_20px_rgba(168,85,247,0.15)] hover:bg-purple-400 hover:shadow-[0_4px_25px_rgba(168,85,247,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm mt-3"
            >
              {analyzing ? "AI is analyzing your spending patterns..." : burnoutFiles.length < 2 ? `Add ${2 - burnoutFiles.length} more file(s) to analyze` : "Analyze Spending Patterns"}
            </button>
          </div>
        )}

        {/* Loading */}
        {analyzing && (
          <div className="mt-4 text-center py-8">
            <div className="inline-block w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin mb-3" />
            <p className="text-sm text-white/30">AI is comparing your spending across months...</p>
          </div>
        )}

        {/* Error */}
        {burnoutError && (
          <div className="mt-4 bg-red-500/5 border border-red-500/15 rounded-xl p-4 text-center">
            <p className="text-sm text-red-400/80">{burnoutError}</p>
          </div>
        )}

        {/* Results */}
        {prediction && !analyzing && (
          <div className="mt-4 space-y-4">
            {/* Summary */}
            <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-5">
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-2">AI Analysis</p>
              <p className="text-sm text-white/70 leading-relaxed">{prediction.summary}</p>
            </div>

            {/* Burnout risk */}
            {prediction.burnoutRisk && (
              <div className="bg-red-500/[0.06] border border-red-500/15 rounded-xl p-4 flex items-start gap-3">
                <span className="text-lg shrink-0">⚠️</span>
                <div>
                  <p className="text-xs text-red-400/60 uppercase tracking-wider font-medium mb-0.5">Burnout Risk</p>
                  <p className="text-sm text-red-300/80">{prediction.burnoutRisk}</p>
                </div>
              </div>
            )}

            {/* High spend dates */}
            {prediction.highSpendDates?.length > 0 && (
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-3">High-Spend Periods</p>
                <div className="flex flex-wrap gap-2">
                  {prediction.highSpendDates.map((d, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300/80 font-medium">{d}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Category trends */}
            {prediction.categoryTrends?.length > 0 && (
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-3">Category Trends</p>
                <div className="space-y-2">
                  {prediction.categoryTrends.map((ct, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-white/60">{ct.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/30 text-xs">RM{ct.avgMonthly?.toFixed(0) || "?"}/mo</span>
                        <span className={`text-xs font-medium ${ct.trend === "up" ? "text-red-400" : ct.trend === "down" ? "text-emerald-400" : "text-white/30"}`}>
                          {ct.trend === "up" ? "↑" : ct.trend === "down" ? "↓" : "→"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {prediction.overallTrend && (
                  <p className="text-xs text-white/40 mt-3 pt-3 border-t border-white/[0.05]">{prediction.overallTrend}</p>
                )}
              </div>
            )}

            {/* Tips */}
            {prediction.tips?.length > 0 && (
              <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium mb-3">AI Recommendations</p>
                <ul className="space-y-2">
                  {prediction.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-white/60">
                      <span className="text-purple-400/60 font-medium shrink-0 mt-0.5">{i + 1}.</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Months summary */}
            {prediction._months && (
              <p className="text-center text-[11px] text-white/15">
                Analyzed {prediction._months.reduce((s, m) => s + m.transactionCount, 0)} transactions across {prediction._months.length} months
                ({prediction._months.map((m) => `${m.transactionCount} from ${m.label}`).join(", ")})
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
