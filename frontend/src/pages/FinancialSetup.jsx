import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { getUserSettings, saveUserSettings } from "../utils/api";

const empty = { income: "", fixedExpenses: "", subscriptions: "", payLater: "", foodPerDay: "", transport: "", otherExpenses: "" };

export default function FinancialSetup() {
  const { budget, updateBudget, user } = useApp();
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

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
    </div>
  );
}
