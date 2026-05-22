import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import TransactionTable from "../components/TransactionTable";
import { submitTransactions, parseBankStatement } from "../utils/api";
import { useApp } from "../store/AppContext";

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export default function Transactions() {
  const { activeMissions } = useApp();
  const m = activeMissions.find((x) => x.verificationMethod !== "photo");

  const [file, setFile] = useState(null);
  const [txs, setTxs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);
  const fileRef = useRef(null);
  const navigate = useNavigate();

  const processPDF = async (f) => {
    setFile(f);
    setParseError(null);
    setParsing(true);

    const result = await parseBankStatement(f);
    setParsing(false);

    if (result?.transactions?.length > 0) {
      setTxs(result.transactions.map((tx) => ({ ...tx, id: randomId() })));
    } else {
      setParseError("AI could not extract transactions from this PDF. Make sure it's a text-based bank statement.");
    }
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") processPDF(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") processPDF(f);
  };

  const submit = async () => {
    if (!m) return;
    setSubmitting(true);
    await submitTransactions({ missionId: m.id, transactions: txs });
    sessionStorage.setItem("evalMissionId", m.id);
    setSubmitting(false);
    navigate("/evaluation");
  };

  if (!m) {
    return (
      <div className="text-center py-16">
        <p className="text-white/30 text-sm">No active bank mission.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const total = txs.reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">Submit</span>
      </div>
      <h1 className="text-xl font-bold text-white/90 mb-1">Submit Bank Statement</h1>
      <p className="text-sm text-white/35">Upload your bank statement PDF. AI will extract real transactions and compare against your budget.</p>

      {/* Upload area */}
      {!file ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="bg-white/[0.03] backdrop-blur-xl rounded-2xl border-2 border-dashed border-white/[0.10] p-10 text-center cursor-pointer hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all duration-200"
        >
          <span className="text-4xl block mb-3 opacity-60">📄</span>
          <p className="font-semibold text-white/60 text-sm">Upload Bank Statement PDF</p>
          <p className="text-xs text-white/25 mt-1.5">Drag & drop or tap to browse</p>
          <p className="text-xs text-white/15 mt-3">PDF only • Maybank, CIMB, RHB, etc.</p>
          <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <div className="bg-emerald-500/[0.06] backdrop-blur-xl rounded-2xl border border-emerald-500/15 p-4 flex items-center gap-3">
          <span className="text-2xl opacity-80">📄</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white/80 text-sm truncate">{file.name}</p>
            {parsing ? (
              <p className="text-xs text-amber-400/60 mt-0.5">AI is reading your bank statement...</p>
            ) : parseError ? (
              <p className="text-xs text-red-400/60 mt-0.5">{parseError}</p>
            ) : (
              <p className="text-xs text-white/30 mt-0.5">{(file.size / 1024).toFixed(0)} KB • AI extracted {txs.length} transactions</p>
            )}
          </div>
          <button onClick={() => { setFile(null); setTxs([]); setParseError(null); }}
            className="text-xs text-red-400 hover:text-red-300 font-medium shrink-0 transition-colors">
            Remove
          </button>
        </div>
      )}

      {/* Extracted transactions */}
      {txs.length > 0 && (
        <>
          <div className="flex justify-between items-center text-sm bg-white/[0.04] backdrop-blur-xl rounded-xl border border-white/[0.08] px-4 py-2.5">
            <span className="text-white/35 text-xs">{txs.length} transactions found</span>
            <span className="font-semibold text-white/60 text-xs">Total: RM{total.toFixed(2)}</span>
          </div>

          <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/[0.08] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-white/25 uppercase tracking-wider font-medium">AI-Extracted Transactions</p>
              <button onClick={() => setTxs((p) => p.filter((_, i) => i !== 0))}
                className="text-[10px] text-white/20 hover:text-white/40 transition-colors">
                Remove first
              </button>
            </div>
            <TransactionTable transactions={txs} onDelete={(id) => setTxs((p) => p.filter((tx) => tx.id !== id))} />
          </div>

          <button onClick={submit} disabled={submitting}
            className="w-full bg-teal-500 text-slate-900 font-semibold py-3 rounded-xl shadow-[0_2px_20px_rgba(20,184,166,0.15)] hover:bg-teal-400 hover:shadow-[0_4px_25px_rgba(20,184,166,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm">
            {submitting ? "AI is evaluating..." : "Submit for AI Evaluation"}
          </button>
        </>
      )}
    </div>
  );
}
