import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../store/AppContext";
import { listPhotoEntries, addPhotoEntry, removePhotoEntry } from "../utils/api";
import { supabase } from "../utils/supabaseClient";

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildDiary(startDate, endDate) {
  const days = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  let d = 1;
  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1), d++) {
    days.push({ day: d, date: fmtLocal(cur), uploaded: false, photoUrl: null, note: "" });
  }
  return days;
}

function loadSavedPhotos(missionId) {
  try {
    const raw = sessionStorage.getItem(`photoDiary_${missionId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePhotos(missionId, diary) {
  const toSave = diary
    .filter((d) => d.uploaded && d.photoUrl && d.photoUrl.startsWith("http"))
    .map((d) => ({ date: d.date, photoUrl: d.photoUrl }));
  sessionStorage.setItem(`photoDiary_${missionId}`, JSON.stringify(toSave));
}

export default function PhotoDiary() {
  const { activeMissions } = useApp();
  const m = activeMissions.find((x) => x.verificationMethod === "photo");
  const [tick, setTick] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  // Diary is fully derived — always consistent with sessionStorage
  const diary = useMemo(() => {
    if (!m) return [];
    const base = buildDiary(m.startDate, m.endDate);
    const saved = loadSavedPhotos(m.id);
    if (saved.length === 0) return base;
    return base.map((day) => {
      const match = saved.find((s) => s.date === day.date);
      return match ? { ...day, uploaded: true, photoUrl: match.photoUrl } : day;
    });
  }, [m?.id, m?.startDate, m?.endDate, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Load photo entries from database on mount
  useEffect(() => {
    if (!m) return;
    listPhotoEntries(m.id).then((entries) => {
      if (entries && entries.length > 0) {
        const mapped = entries.map((e) => ({ date: e.photo_date, photoUrl: e.photo_url }));
        sessionStorage.setItem(`photoDiary_${m.id}`, JSON.stringify(mapped));
        refresh();
      }
    });
  }, [m?.id]);

  if (!m) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">No active photo mission.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const activeDays = diary.filter((d) => d.date >= m.startDate);
  const uploaded = activeDays.filter((d) => d.uploaded).length;
  const total = activeDays.length;
  const pct = total > 0 ? Math.round((uploaded / total) * 100) : 0;
  const missionStart = m.startDate;
  const today = fmtLocal(new Date());

  const handleUpload = (dayIdx) => {
    const day = diary[dayIdx];
    if (!day || day.date < missionStart) return;
    fileRef.current._dayIdx = dayIdx;
    fileRef.current.click();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    const idx = fileRef.current._dayIdx;
    if (file == null || idx === undefined) return;
    setUploading(true);

    let url = URL.createObjectURL(file);
    if (supabase) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${randomId()}.${ext}`;
      const { data: uploadData, error } = await supabase.storage
        .from("photos")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (!error && uploadData?.path) {
        const { data: publicData } = supabase.storage.from("photos").getPublicUrl(uploadData.path);
        if (publicData?.publicUrl) url = publicData.publicUrl;
      }
    }

    // Update diary via sessionStorage + re-render
    const base = buildDiary(m.startDate, m.endDate);
    const date = base[idx]?.date;
    if (!date) return;
    const saved = loadSavedPhotos(m.id);
    saved.push({ date, photoUrl: url });
    sessionStorage.setItem(`photoDiary_${m.id}`, JSON.stringify(saved));

    // Persist to database
    if (url.startsWith("http")) {
      addPhotoEntry(m.id, date, url).catch(() => {});
    }

    // Clean up blob URL
    if (url.startsWith("blob:")) {
      const blobUrl = url;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    }

    setUploading(false);
    setSelectedDay(null);
    refresh();
  };

  const handleRemovePhoto = (idx) => {
    const base = buildDiary(m.startDate, m.endDate);
    const date = base[idx]?.date;
    if (!date) return;
    const saved = loadSavedPhotos(m.id).filter((s) => s.date !== date);
    sessionStorage.setItem(`photoDiary_${m.id}`, JSON.stringify(saved));
    removePhotoEntry(m.id, date).catch(() => {});
    refresh();
  };

  const getStatusClass = (day) => {
    if (day.date < missionStart) return "bg-white/[0.01] border-white/[0.03] opacity-30";
    if (day.uploaded) return "bg-emerald-500/10 border-emerald-500/30";
    if (day.date < today) return "bg-red-500/5 border-red-500/20";
    if (day.date === today) return "bg-amber-500/10 border-amber-500/30";
    return "bg-white/[0.02] border-white/[0.06]";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
          Photo Mission
        </span>
      </div>
      <h1 className="text-xl font-bold text-white/90">{m.title}</h1>
      <p className="text-sm text-white/40 leading-relaxed">
        Take a photo of <strong className="text-teal-400">{m.photoSubject}</strong>
        {" "}&mdash;{" "}
        {m.photoFrequency === "daily" ? "every day" : m.photoFrequency === "per-ride" ? "every ride" : "once per week"}
      </p>

      {/* Progress */}
      <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_2px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-white/70">Progress</span>
          <span className="text-sm font-bold text-teal-400">{uploaded}/{total} photos</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-white/25 mt-2">
          {pct === 100
            ? "All photos submitted! Ready for AI evaluation."
            : `${total - uploaded} photo${total - uploaded > 1 ? "s" : ""} remaining`}
        </p>
        {uploading && <p className="text-xs text-amber-400/60 mt-1">Uploading photo...</p>}
      </div>

      {/* Photo Grid */}
      <div>
        <p className="text-xs text-white/25 uppercase tracking-wider font-medium mb-3">
          Photo Diary ({m.startDate} → {m.endDate})
        </p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
          {diary.map((day, i) => {
            const beforeStart = day.date < missionStart;
            return (
            <div key={day.day}>
              <button
                type="button"
                onClick={() => {
                  if (beforeStart) return;
                  day.uploaded ? setSelectedDay(i) : handleUpload(i);
                }}
                className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center transition-all duration-200 ${
                  beforeStart ? "" : "hover:scale-[1.04] cursor-pointer"
                } ${getStatusClass(day)}`}
              >
                {beforeStart ? (
                  <span className="text-[10px] font-medium text-white/10">{day.day}</span>
                ) : day.uploaded ? (
                  <img src={day.photoUrl} alt={`Day ${day.day}`} className="w-full h-full object-cover rounded-[10px]" />
                ) : (
                  <>
                    <span className="text-lg text-white/20">+</span>
                    <span className="text-[10px] font-medium text-white/25 mt-0.5">{day.day}</span>
                  </>
                )}
              </button>
              <span className="block text-center text-[9px] text-white/20 mt-1">
                {new Date(day.date).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
              </span>
            </div>
            );
          })}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay !== null && diary[selectedDay]?.uploaded && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-[#1a1a1d] border border-white/[0.10] rounded-2xl p-5 max-w-sm w-full shadow-[0_20px_60px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
            <img src={diary[selectedDay].photoUrl} alt={`Day ${diary[selectedDay].day}`}
              className="w-full rounded-xl object-cover aspect-square mb-3" />
            <p className="font-semibold text-white/80">Day {diary[selectedDay].day}</p>
            <p className="text-sm text-white/35">{diary[selectedDay].date}</p>
            {diary[selectedDay].note && (
              <p className="text-xs text-white/25 mt-1">{diary[selectedDay].note}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => { handleRemovePhoto(selectedDay); setSelectedDay(null); }}
                className="flex-1 py-2 text-sm font-medium text-red-400 border border-red-500/20 rounded-xl bg-red-500/5 hover:bg-red-500/10 transition-all">
                Remove
              </button>
              <button onClick={() => setSelectedDay(null)}
                className="flex-1 py-2 text-sm font-medium text-white/50 border border-white/[0.08] rounded-xl hover:bg-white/[0.04] transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />

      {/* Submit */}
      <button
        onClick={async () => {
          const missedDays = diary
            .filter((d) => d.date < today && d.date >= missionStart && !d.uploaded)
            .map((d) => d.date);
          const photoDiary = {
            subject: m.photoSubject,
            frequency: m.photoFrequency,
            total,
            uploaded,
            compliance_pct: pct,
            missed_dates: missedDays,
            passed: pct === 100,
          };
          sessionStorage.setItem("evalMissionId", m.id);
          sessionStorage.setItem("photoDiary", JSON.stringify(photoDiary));
          sessionStorage.removeItem(`photoDiary_${m.id}`);
          navigate("/evaluation");
        }}
        disabled={pct < 100}
        className="w-full bg-teal-500 text-slate-900 font-semibold py-3 rounded-xl shadow-[0_2px_20px_rgba(20,184,166,0.15)] hover:bg-teal-400 hover:shadow-[0_4px_25px_rgba(20,184,166,0.25)] disabled:opacity-30 disabled:cursor-not-allowed transition-all text-sm">
        {pct === 100 ? "Submit for AI Evaluation" : `Need ${total - uploaded} more photo${total - uploaded > 1 ? "s" : ""}`}
      </button>

      <p className="text-center text-[11px] text-white/15 pb-4">
        AI will verify your photos against the mission rules.
      </p>
    </div>
  );
}
