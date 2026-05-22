export default function MissionCard({ mission }) {
  const isPhoto = mission.verificationMethod === "photo";
  const expSoon = mission.expiresIn != null && mission.expiresIn <= 3;

  return (
    <div className={`backdrop-blur-xl border rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.15)] ${
      expSoon ? "bg-red-500/[0.04] border-red-500/15" : "bg-white/[0.04] border-white/[0.08]"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className={`font-semibold text-sm ${expSoon ? "text-red-300" : "text-white/90"}`}>{mission.title}</h3>
        <div className="flex items-center gap-1.5 shrink-0">
          {mission.expiresIn != null && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
              expSoon
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-white/[0.04] text-white/30 border-white/[0.08]"
            }`}>
              {expSoon ? `Expires in ${mission.expiresIn}d` : `${mission.expiresIn}d to join`}
            </span>
          )}
          <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
            isPhoto
              ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          }`}>
            {isPhoto ? "Photo" : "Bank"}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-white/35">
        <span>by {mission.sponsor}</span>
        <span className="font-semibold text-emerald-400">RM{mission.reward}</span>
        <span>{mission.daysLeft}d left</span>
      </div>
      {isPhoto && mission.photoSubject && (
        <p className="text-xs text-teal-400/70 mt-2 leading-relaxed">
          📸 {mission.photoSubject}
        </p>
      )}
      {mission.rules && (
        <p className="text-xs text-white/30 mt-2 leading-relaxed">{mission.rules}</p>
      )}
    </div>
  );
}
