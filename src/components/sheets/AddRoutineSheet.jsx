import { useState } from "react";
import { X } from "lucide-react";
import { MONTHS } from "../../constants";
import { formatRupiahInput, parseRupiahInput } from "../../utils/format";

function AddRoutineSheet({ initialData, onClose, onSubmit }) {
  const [name, setName] = useState(initialData?.name || "");
  const [amount, setAmount] = useState(initialData ? formatRupiahInput(initialData.amount) : "");
  const [startIndex, setStartIndex] = useState(initialData?.startIndex ?? new Date().getMonth());

  const canSubmit = name.trim() && parseRupiahInput(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{initialData ? "Edit Pengeluaran Rutin" : "Tambah Pengeluaran Rutin"}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Langganan Netflix" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />

        <label className="text-[11px] text-white/40 font-medium">Jumlah per Bulan (Rp)</label>
        <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-5 text-xl font-medium tabular outline-none focus:border-lime" />

        {!initialData && (
          <>
            <label className="text-[11px] text-white/40 font-medium">Mulai Bulan</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5 mb-6">
              {MONTHS.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setStartIndex(idx)}
                  className={`py-2 rounded-lg text-[11px] font-medium border transition ${startIndex === idx ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/60"}`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit(initialData ? { name: name.trim(), amount: parseRupiahInput(amount) } : { name: name.trim(), amount: parseRupiahInput(amount), startIndex })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5"
        >
          Simpan Rutin
        </button>
      </div>
    </div>
  );
}

export default AddRoutineSheet;
