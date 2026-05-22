const colors = {
  brand: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  accent: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/10 text-red-400 border-red-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function StatCard({ icon, label, value, color = "brand" }) {
  return (
    <div className={`${colors[color]} backdrop-blur-xl rounded-xl border p-3`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{icon} {label}</span>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
