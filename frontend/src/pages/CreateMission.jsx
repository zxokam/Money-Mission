import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMission } from "../utils/api";

const empty = {
  title: "", sponsor: "", reward: "", targetImprovement: "0",
  startDate: "", endDate: "", duration: "", rules: "",
  verificationMethod: "bank", photoSubject: "", photoFrequency: "daily",
  expireDays: "15",
};

function calcDays(start, end) {
  if (!start || !end) return 0;
  const d = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24) + 1;
  return Math.max(0, Math.round(d));
}

function addDays(dateStr, days) {
  if (!dateStr || !days) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days - 1);
  return d.toISOString().slice(0, 10);
}

export default function CreateMission() {
  const [form, setForm] = useState(empty);
  const navigate = useNavigate();

  const set = (e) => {
    const { name, value } = e.target;
    setForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "duration" && value && next.startDate) {
        next.endDate = addDays(next.startDate, +value);
      }
      if (name === "startDate" && next.duration) {
        next.endDate = addDays(value, +next.duration);
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    const days = calcDays(form.startDate, form.endDate);
    const totalPhotos = form.verificationMethod === "photo"
      ? form.photoFrequency === "per-ride" ? days * 2 : days
      : 0;
    await createMission({
      ...form, reward: +form.reward, targetImprovement: +form.targetImprovement,
      totalPhotosRequired: totalPhotos, expireDays: +form.expireDays,
    });
    navigate("/dashboard");
  };

  const fill = () => setForm({
    title: "Cut wasteful spending by 10%", sponsor: "Ahmad",
    reward: "20", targetImprovement: "0", startDate: "2026-05-01", endDate: "2026-05-31",
    rules: "Reduce unnecessary shopping and food delivery.",
    verificationMethod: "bank", photoSubject: "", photoFrequency: "daily",
    expireDays: "15",
  });

  const fillPhoto = () => setForm({
    title: "Public transport only challenge", sponsor: "Hannah",
    reward: "30", targetImprovement: "0", startDate: "2026-05-01", endDate: "2026-05-14", duration: "14",
    rules: "No Grab, no e-hailing. Public transport or walk only. Take a photo of every ride.",
    verificationMethod: "photo", photoSubject: "Public transport ticket/bus/train", photoFrequency: "per-ride",
    expireDays: "21",
  });

  const inp = (name, placeholder, type = "text") => (
    <input name={name} type={type} value={form[name]} onChange={set} placeholder={placeholder} required
      className="w-full px-3 py-2 text-sm" />
  );

  const days = calcDays(form.startDate, form.endDate);
  const estPhotos = form.verificationMethod === "photo"
    ? form.photoFrequency === "per-ride" ? days * 2 : days
    : 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-white/90 mb-1">Create Mission</h1>
      <p className="text-sm text-white/35 mb-5">Sponsor a friend to improve their money habits.</p>

      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Mission Title</span>
          {inp("title", "e.g. Cut wasteful spending")}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Sponsor</span>{inp("sponsor", "Your name")}</label>
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Reward (RM)</span>{inp("reward", "20", "number")}</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Start</span>{inp("startDate", "", "date")}</label>
          {form.verificationMethod === "photo" ? (
            <label className="block">
              <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">End (auto)</span>
              <input name="endDate" value={form.endDate} readOnly
                className="w-full px-3 py-2 text-sm text-white/40 bg-white/[0.02] cursor-not-allowed" />
            </label>
          ) : (
            <label className="block"><span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">End</span>{inp("endDate", "", "date")}</label>
          )}
        </div>

        <label className="block">
          <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Auto-Expire</span>
          <select name="expireDays" value={form.expireDays} onChange={set}
            className="w-full px-3 py-2 text-sm bg-[#1a1a1d]">
            <option value="7">7 days if unclaimed</option>
            <option value="14">14 days if unclaimed</option>
            <option value="15">15 days if unclaimed</option>
            <option value="18">18 days if unclaimed</option>
            <option value="21">21 days if unclaimed</option>
            <option value="30">30 days if unclaimed</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Rules</span>
          <textarea name="rules" value={form.rules} onChange={set} rows={2} placeholder="Describe rules..."
            className="w-full px-3 py-2 text-sm resize-none" />
        </label>

        {/* Verification Method */}
        <div>
          <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium block mb-2">Verification Method</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setForm((p) => ({ ...p, verificationMethod: "photo" }))}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                form.verificationMethod === "photo"
                  ? "bg-teal-500/10 border-teal-500/30 shadow-[0_0_20px_rgba(45,212,191,0.06)]"
                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14]"
              }`}>
              <div className="text-base mb-0.5">📸</div>
              <div className="text-sm font-semibold text-white/80">Photo Proof</div>
              <div className="text-[10px] text-white/25">Take photos as evidence</div>
            </button>
            <button type="button" onClick={() => setForm((p) => ({ ...p, verificationMethod: "bank" }))}
              className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                form.verificationMethod === "bank"
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
                  : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.14]"
              }`}>
              <div className="text-base mb-0.5">🏦</div>
              <div className="text-sm font-semibold text-white/80">Bank Transactions</div>
              <div className="text-[10px] text-white/25">AI evaluates bank PDF</div>
            </button>
          </div>
        </div>

        {/* Photo options */}
        {form.verificationMethod === "photo" && (
          <div className="bg-teal-500/5 backdrop-blur-xl rounded-2xl border border-teal-500/15 p-4 space-y-3">
            <p className="text-sm font-semibold text-teal-400">Photo Proof Settings</p>

            <label className="block">
              <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Duration</span>
              <div className="grid grid-cols-2 gap-2">
                <select name="duration" value={form.duration && ["7","14","21","30"].includes(form.duration) ? form.duration : (form.duration ? "custom" : "")} onChange={(e) => {
                  if (e.target.value === "custom") return;
                  set(e);
                }}
                  className="w-full px-3 py-2 text-sm bg-[#1a1a1d]">
                  <option value="">Select duration...</option>
                  <option value="7">1 Week (7 days)</option>
                  <option value="14">2 Weeks (14 days)</option>
                  <option value="21">3 Weeks (21 days)</option>
                  <option value="30">1 Month (30 days)</option>
                  <option value="custom">Custom...</option>
                </select>
                <input name="duration" type="number" min="1" max="90" value={form.duration} onChange={set}
                  placeholder="Custom days"
                  className="w-full px-3 py-2 text-sm" />
              </div>
            </label>

            <label className="block">
              <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">What to photograph</span>
              <input name="photoSubject" value={form.photoSubject} onChange={set}
                placeholder="e.g. Public transport ticket, home-cooked meal"
                className="w-full px-3 py-2 text-sm" />
            </label>

            <label className="block">
              <span className="text-[11px] text-white/30 uppercase tracking-wider font-medium">Frequency</span>
              <select name="photoFrequency" value={form.photoFrequency} onChange={set}
                className="w-full px-3 py-2 text-sm bg-[#1a1a1d]">
                <option value="daily">Every day (1 photo/day)</option>
                <option value="per-ride">Every ride / transaction</option>
                <option value="weekly">Once per week</option>
              </select>
            </label>

            {days > 0 && (
              <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06]">
                <p className="text-[10px] text-white/25 uppercase tracking-wider">Est. Photos Required</p>
                <p className="text-2xl font-bold text-teal-400">{estPhotos}</p>
                <p className="text-[10px] text-white/20">over {days} days</p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit"
            className="flex-1 bg-emerald-500 text-slate-900 font-semibold py-2.5 rounded-xl shadow-[0_2px_20px_rgba(16,185,129,0.2)] hover:bg-emerald-400 hover:shadow-[0_4px_25px_rgba(16,185,129,0.3)] transition-all text-sm">
            Create Mission
          </button>
          <button type="button" onClick={fill}
            className="px-3 py-2.5 text-sm text-white/40 border border-white/[0.08] rounded-xl bg-white/[0.03] hover:bg-white/[0.06] hover:text-white/60 transition-all">
            Bank Demo
          </button>
          <button type="button" onClick={fillPhoto}
            className="px-3 py-2.5 text-sm text-teal-400/70 border border-teal-500/15 rounded-xl bg-teal-500/5 hover:bg-teal-500/10 hover:text-teal-400 transition-all">
            Photo Demo
          </button>
        </div>
      </form>
    </div>
  );
}
