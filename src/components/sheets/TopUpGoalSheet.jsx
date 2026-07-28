import { useState } from "react";
import { X } from "lucide-react";
import { rupiah, formatRupiahInput, parseRupiahInput } from "../../utils/format";

function TopUpGoalSheet({ goal, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const canSubmit = parseRupiahInput(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Tabungan</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <div className="text-xs text-white/40 mb-4">
          {goal.name} · sudah terkumpul <span className="text-white/70 tabular">{rupiah(goal.saved)}</span> dari {rupiah(goal.target)}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nominal ditambahkan (Rp)</label>
        <input autoFocus type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-6 text-xl font-medium tabular outline-none focus:border-lime" />

        <button disabled={!canSubmit} onClick={() => onSubmit(parseRupiahInput(amount))} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Tambah</button>
      </div>
    </div>
  );
}

export default TopUpGoalSheet;
