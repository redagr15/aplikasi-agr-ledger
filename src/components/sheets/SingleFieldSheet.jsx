import { useState } from "react";
import { X } from "lucide-react";

function SingleFieldSheet({ title, label, placeholder, submitLabel, initialValue, onClose, onSubmit }) {
  const [value, setValue] = useState(initialValue || "");
  const canSubmit = value.trim().length > 0;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">{label}</label>
        <input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter" && canSubmit) onSubmit(value.trim()); }} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime" />
        <button disabled={!canSubmit} onClick={() => onSubmit(value.trim())} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">{submitLabel || "Simpan"}</button>
      </div>
    </div>
  );
}

export default SingleFieldSheet;
