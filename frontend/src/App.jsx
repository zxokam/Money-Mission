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
  const { user } = useApp();

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
