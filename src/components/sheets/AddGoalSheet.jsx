import { useState } from "react";
import { X } from "lucide-react";
import { formatRupiahInput, parseRupiahInput } from "../../utils/format";

function AddGoalSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const canSubmit = name.trim() && parseRupiahInput(target) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Target Tabungan</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama target</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Dana Darurat" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />

        <label className="text-[11px] text-white/40 font-medium">Target Nominal (Rp)</label>
        <input type="text" inputMode="numeric" value={target} onChange={(e) => setTarget(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-4 text-xl font-medium tabular outline-none focus:border-lime" />

        <label className="text-[11px] text-white/40 font-medium">Sudah Terkumpul (Opsional)</label>
        <input type="text" inputMode="numeric" value={saved} onChange={(e) => setSaved(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime" />

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name: name.trim(), target: parseRupiahInput(target), saved: parseRupiahInput(saved) || 0 })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5"
        >
          Tambah Target
        </button>
      </div>
    </div>
  );
}

export default AddGoalSheet;
