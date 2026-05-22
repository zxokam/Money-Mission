import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../store/AppContext";

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Missions" },
  { to: "/create", label: "Create" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user, login, logout } = useApp();
  const [username, setUsername] = useState("");
  const [showLogin, setShowLogin] = useState(false);

  const doLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      login(username.trim());
      setUsername("");
      setShowLogin(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-[rgba(9,9,11,0.8)] backdrop-blur-xl border-b border-white/5">
      <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-center">

        <div className="flex items-center gap-2">
          {(() => {
            const visible = links.filter((l) => l.to !== pathname);
            if (visible.length === 0) return null;
            return (
              <div className="flex gap-0.5 bg-white/[0.04] rounded-xl p-0.5 border border-white/5">
                {visible.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="px-3.5 py-1.5 rounded-[10px] text-sm font-medium no-underline text-white/45 hover:text-white/80 transition-all duration-150"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            );
          })()}

          <Link
            to="/settings"
            className={`w-8 h-8 rounded-[10px] flex items-center justify-center text-sm no-underline transition-all duration-150 ${
              pathname === "/settings" || pathname === "/financial-setup"
                ? "bg-white/10 text-white"
                : "text-white/30 hover:text-white/60"
            }`}
            title="Budget Settings"
          >
            ⚙
          </Link>

          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-white/10">
            {user ? (
              <>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-medium">
                  {user.username}
                </span>
                <button
                  onClick={logout}
                  className="text-xs px-2.5 py-1 rounded-lg bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : showLogin ? (
              <form onSubmit={doLogin} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-24 px-2 py-1 text-xs rounded-lg bg-white/[0.06] border border-white/10 text-white/90 placeholder:text-white/25 focus:outline-none focus:border-emerald-500/40"
                />
                <button
                  type="submit"
                  className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors font-medium"
                >
                  Go
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-colors font-medium"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
