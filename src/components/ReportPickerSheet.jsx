import { useState } from "react";
import { FileText, X } from "lucide-react";
import { MONTHS } from "../constants";

function ReportPickerSheet({ years, defaultYear, defaultMonthIndex, generating, onClose, onGenerate }) {
  const [year, setYear] = useState(defaultYear);
  const [monthIndex, setMonthIndex] = useState(defaultMonthIndex);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Cetak Laporan Bulanan</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tahun</label>
        <div className="grid grid-cols-4 gap-2 mt-1.5 mb-5">
          {years.map((y) => (
            <button key={y} onClick={() => setYear(y)} className={`py-2 rounded-lg text-xs font-medium border transition ${String(year) === String(y) ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/60"}`}>
              {y}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Bulan</label>
        <div className="grid grid-cols-3 gap-2 mt-1.5 mb-6">
          {MONTHS.map((m, idx) => (
            <button key={m} onClick={() => setMonthIndex(idx)} className={`py-2 rounded-lg text-[11px] font-medium border transition ${monthIndex === idx ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/60"}`}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>

        <button disabled={generating} onClick={() => onGenerate(Number(year), monthIndex)} className="w-full bg-lime disabled:opacity-50 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-2">
          {generating ? "Membuat PDF..." : (<><FileText size={15} /> Buat & Unduh PDF</>)}
        </button>
      </div>
    </div>
  );
}


export default ReportPickerSheet;
