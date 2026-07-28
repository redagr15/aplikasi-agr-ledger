import { useState } from "react";
import { X } from "lucide-react";
import { MONTHS } from "../../constants";

function RoutineStopSheet({ item, onClose, onStop }) {
  const startIdx = item.startIndex !== undefined ? Number(item.startIndex) : 0;
  const [stopIndex, setStopIndex] = useState(Math.max(startIdx, new Date().getMonth()));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Stop "{item.name}"</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <p className="text-xs text-white/50 mb-4 leading-relaxed">
          Pilih bulan terakhir pengeluaran ini masih aktif. Setelah bulan itu, pos rutin ini tidak akan lagi dihitung — termasuk di tahun-tahun berikutnya.
        </p>

        <label className="text-[11px] text-white/40 font-medium">Aktif Sampai Bulan</label>
        <div className="grid grid-cols-3 gap-2 mt-1.5 mb-6">
          {MONTHS.map((m, idx) => {
            const disabled = idx < startIdx;
            return (
              <button
                key={m}
                disabled={disabled}
                onClick={() => setStopIndex(idx)}
                className={`py-2 rounded-lg text-[11px] font-medium border transition ${
                  disabled
                    ? "opacity-25 cursor-not-allowed bg-white/[0.02] border-white/5 text-white/30"
                    : stopIndex === idx
                    ? "bg-coral text-black border-coral font-bold"
                    : "bg-white/[0.03] border-white/10 text-white/60"
                }`}
              >
                {m.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <button onClick={() => onStop(stopIndex)} className="w-full bg-coral text-black font-bold rounded-lg py-3.5">
          Konfirmasi Stop di {MONTHS[stopIndex]}
        </button>
      </div>
    </div>
  );
}

export default RoutineStopSheet;
