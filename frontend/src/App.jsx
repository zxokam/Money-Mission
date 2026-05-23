import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./store/AppContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CreateMission from "./pages/CreateMission";
import JoinMission from "./pages/JoinMission";
import FinancialSetup from "./pages/FinancialSetup";
import Transactions from "./pages/Transactions";
import PhotoDiary from "./pages/PhotoDiary";
import EvaluationResult from "./pages/EvaluationResult";

function AppRoutes() {
  const { user, burnoutPrediction } = useApp();
  const [dismissed, setDismissed] = useState(false);

  const today = new Date().getDate();
  const burnoutDay = burnoutPrediction?.burnoutDay;
  const daysUntilBurnout = burnoutDay ? (burnoutDay - today <= 0 ? burnoutDay + 30 - today : burnoutDay - today) : 99;
  const showBanner = burnoutPrediction && daysUntilBurnout <= 5 && !dismissed;

  if (!user) {
    return (
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-2xl px-4 py-6">
          <LoginPage />
        </div>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      {showBanner && (
        <div className="fixed top-14 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <div className="pointer-events-auto mx-4 mt-3 w-full max-w-lg bg-amber-500/[0.12] backdrop-blur-2xl border border-amber-500/30 rounded-2xl p-4 shadow-[0_8px_40px_rgba(245,158,11,0.15)] animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🔔</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300">Spending burnout warning</p>
                <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
                  {daysUntilBurnout === 0
                    ? "Your money typically runs out today. Be extra careful with spending!"
                    : daysUntilBurnout === 1
                    ? "You'll likely run out tomorrow. Stick to essentials only."
                    : `Based on your spending patterns, you'll likely run out in ${daysUntilBurnout} days (around day ${burnoutDay}).`}
                </p>
                {burnoutPrediction.burnoutRisk && (
                  <p className="text-[11px] text-amber-400/40 mt-1">{burnoutPrediction.burnoutRisk}</p>
                )}
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="text-amber-400/50 hover:text-amber-300 text-base shrink-0 transition-colors leading-none"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="flex-1 flex justify-center">
        <div className="w-full max-w-2xl px-4 py-6">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateMission />} />
            <Route path="/join" element={<JoinMission />} />
            <Route path="/settings" element={<FinancialSetup />} />
            <Route path="/financial-setup" element={<FinancialSetup />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/photo-diary" element={<PhotoDiary />} />
            <Route path="/evaluation" element={<EvaluationResult />} />
          </Routes>
        </div>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <div className="flex min-h-screen flex-col">
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}
