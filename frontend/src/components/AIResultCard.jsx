export default function AIResultCard({ evaluation }) {
  const { ai_verdict, reward_unlocked, reward, reason, observed, ai_explanation } = evaluation;
  const accepted = ai_verdict === "accepted";

  return (
    <div className="text-center space-y-5">
      {/* Verdict */}
      <div>
        <h2 className={`text-lg font-bold ${accepted ? "text-emerald-400" : "text-red-400"}`}>
          AI {accepted ? "Approved" : "Rejected"}
        </h2>
        {reason && (
          <p className="text-xs text-white/40 mt-1">{reason}</p>
        )}
      </div>

      {/* Observed */}
      {observed && (
        <p className="text-sm text-white/50 leading-relaxed">{observed}</p>
      )}

      {/* AI Comment */}
      {ai_explanation && (
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-xl p-4 text-left">
          <p className="text-xs text-white/25 uppercase tracking-wider font-medium mb-2">AI Comment</p>
          <p className="text-sm text-white/70 leading-relaxed">{ai_explanation}</p>
        </div>
      )}

      {/* Reward */}
      <div className={`inline-block rounded-xl px-5 py-2.5 border ${
        reward_unlocked
          ? "bg-amber-500/10 border-amber-500/20"
          : "bg-white/[0.03] border-white/[0.06]"
      }`}>
        <p className={`text-sm font-semibold ${reward_unlocked ? "text-amber-400" : "text-white/25"}`}>
          {reward_unlocked ? `Reward: RM${reward}` : "No Reward"}
        </p>
      </div>
    </div>
  );
}
