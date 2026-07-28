import { useState } from "react";
import { formatRupiahInput, parseRupiahInput } from "../../utils/format";

function EditGoalCard({ goal, lockTarget, onSave, onCancel }) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(formatRupiahInput(goal.target));
  const [saved, setSaved] = useState(formatRupiahInput(goal.saved));
  const canSave = name.trim() && parseRupiahInput(target) > 0;

  return (
    <div className="bg-white/[0.03] border border-lime/30 rounded-xl p-4">
      <label className="text-[10px] text-white/40 font-medium">Nama target</label>
      <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.06] rounded-lg px-3 py-2 mt-1 mb-3 text-sm outline-none focus-lime" />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-white/40 font-medium">Target (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={target}
            disabled={lockTarget}
            onChange={(e) => setTarget(formatRupiahInput(e.target.value))}
            className="w-full bg-white/[0.06] rounded-lg px-3 py-2 mt-1 text-sm outline-none tabular focus-lime disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {lockTarget && <div className="text-[9.5px] text-white/30 mt-1">Otomatis dari total Wishlist</div>}
        </div>
        <div>
          <label className="text-[10px] text-white/40 font-medium">Terkumpul (Rp)</label>
          <input type="text" inputMode="numeric" value={saved} onChange={(e) => setSaved(formatRupiahInput(e.target.value))} className="w-full bg-white/[0.06] rounded-lg px-3 py-2 mt-1 text-sm outline-none tabular focus-lime" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={!canSave}
          onClick={() => onSave({ name: name.trim(), target: lockTarget ? goal.target : parseRupiahInput(target), saved: parseRupiahInput(saved) || 0 })}
          className="flex-1 bg-lime disabled:bg-white/10 disabled:text-white/30 text-black text-xs font-semibold rounded-lg py-2.5"
        >
          Simpan
        </button>
        <button onClick={onCancel} className="flex-1 bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium rounded-lg py-2.5">Batal</button>
      </div>
    </div>
  );
}

export default EditGoalCard;
