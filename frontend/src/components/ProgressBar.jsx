const bars = {
  brand: "bg-emerald-500",
  accent: "bg-teal-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
};

export default function ProgressBar({ value, max = 100, label, color = "brand" }) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-white/35">{label}</span>
          <span className="font-semibold text-white/50">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bars[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
