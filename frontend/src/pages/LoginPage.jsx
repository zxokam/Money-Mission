import { useState } from "react";
import { useApp } from "../store/AppContext";

export default function LoginPage() {
  const { login } = useApp();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    setLoading(true);
    setError("");
    const u = await login(name);
    if (!u) {
      setError("Unable to connect. Is the backend online?");
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-2">
        <span className="text-white/90">Money</span>
        <span className="text-emerald-400">Mission</span>
      </h1>
      <p className="text-white/35 text-sm mb-6">Enter a username to get started.</p>

      <form onSubmit={submit} className="w-full max-w-[320px] space-y-3">
        <input
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your username"
          className="w-full h-12 px-4 text-sm rounded-lg bg-white/[0.06] border border-white/10 text-white/90 placeholder:text-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50"
        />
        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full h-12 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
        >
          {loading ? "Signing in..." : "Enter"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-white/15">
        No password needed. Your username creates an account automatically.
      </p>
    </div>
  );
}
