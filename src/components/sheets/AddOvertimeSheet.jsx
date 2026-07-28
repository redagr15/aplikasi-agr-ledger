import { useState } from "react";
import { Check, X } from "lucide-react";
import { MONTHS } from "../../constants";
import { todayKey } from "../../utils/format";
import { computeOvertime } from "../../utils/data";

function AddOvertimeSheet({ onClose, onSubmit, initialData }) {
  const [date, setDate] = useState(initialData?.date || todayKey());
  const [jenis, setJenis] = useState(initialData?.jenis || "Biasa");
  const [totalJam, setTotalJam] = useState(initialData ? String(initialData.totalJam) : "");
  const [paid, setPaid] = useState(initialData ? initialData.paid : true);

  const getAvailableMonths = (dateStr) => {
    if (!dateStr) return [];
    const d = new Date(dateStr.slice(0,10) + "T00:00:00");
    const y = d.getFullYear();
    const mIdx = d.getMonth();

    const currentMonthVal = `${y}-${String(mIdx + 1).padStart(2, "0")}`;
    const currentLabel = `${MONTHS[mIdx]} ${y} (Bulan Berjalan)`;

    const nextMIdx = (mIdx + 1) % 12;
    const nextYear = mIdx === 11 ? y + 1 : y;
    const nextMonthVal = `${nextYear}-${String(nextMIdx + 1).padStart(2, "0")}`;
    const nextLabel = `${MONTHS[nextMIdx]} ${nextYear} (Bulan Berikutnya)`;

    return [
      { val: currentMonthVal, label: currentLabel },
      { val: nextMonthVal, label: nextLabel }
    ];
  };

  const [availableMonths, setAvailableMonths] = useState(getAvailableMonths(date));
  const [targetMonth, setTargetMonth] = useState(initialData?.targetMonth || (availableMonths[0]?.val || ""));

  const handleDateChange = (newDate) => {
    setDate(newDate);
    const months = getAvailableMonths(newDate);
    setAvailableMonths(months);
    if (!initialData) {
      setTargetMonth(months[0]?.val || "");
    }
  };

  const canSubmit = Number(totalJam) > 0 && !!date && !!targetMonth;
  const { hrs } = computeOvertime(0, jenis, Number(totalJam) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{initialData ? "Edit Lembur" : "Catat Lembur"}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tanggal Lembur Dilakukan</label>
        <input type="date" value={date} onChange={(e) => handleDateChange(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />

        <label className="text-[11px] text-white/40 font-medium">Masuk Slip Gaji Bulan Mana?</label>
        <div className="flex flex-col gap-2 mt-1.5 mb-5">
          {availableMonths.map((mOpt) => (
            <button
              key={mOpt.val}
              type="button"
              onClick={() => setTargetMonth(mOpt.val)}
              className={`py-3 px-4 rounded-lg text-xs font-medium text-left border transition flex items-center justify-between ${
                targetMonth === mOpt.val
                  ? "bg-lime text-black border-lime font-bold"
                  : "bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              <span>{mOpt.label}</span>
              {targetMonth === mOpt.val && <Check size={14} strokeWidth={2.5} />}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Jenis Lembur</label>
        <div className="flex bg-white/[0.04] rounded-lg p-1 mt-1.5 mb-5">
          {["Biasa", "Libur"].map((j) => (
            <button key={j} onClick={() => setJenis(j)} className={`flex-1 py-2 rounded-md text-sm font-medium transition ${jenis === j ? "bg-lime text-black" : "text-white/50"}`}>{j}</button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Total Jam</label>
        <input type="number" inputMode="numeric" value={totalJam} onChange={(e) => setTotalJam(e.target.value)} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-2 text-xl font-medium tabular outline-none focus:border-lime" />
        {Number(totalJam) > 0 && <div className="text-[11px] text-white/40 mb-5 tabular">≈ {hrs} jam terhitung</div>}

        <label className="flex items-center gap-2.5 mb-6 cursor-pointer">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="accent-lime w-4 h-4" />
          <span className="text-sm text-white/70">Sudah dibayar / masuk slip gaji</span>
        </label>

        <button disabled={!canSubmit} onClick={() => onSubmit({ date, targetMonth, jenis, totalJam: Number(totalJam), paid })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Simpan Lembur</button>
      </div>
    </div>
  );
}

export default AddOvertimeSheet;
