import { useState } from "react";
import { X } from "lucide-react";
import { PRIORITIES } from "../../constants";

function AddTaskSheet({ onClose, onSubmit, initialData }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [recurring, setRecurring] = useState(!!initialData?.recurring);
  const [recurDay, setRecurDay] = useState(initialData?.recurDay || new Date().getDate());
  const [subtasks, setSubtasks] = useState(
    initialData?.subtasks?.map((s) => ({ ...s })) || []
  );
  const [subtaskInput, setSubtaskInput] = useState("");

  const canSubmit = title.trim();

  function addSubtaskDraft() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: subtaskInput.trim(), done: false }
    ]);
    setSubtaskInput("");
  }

  function removeSubtaskDraft(idx) {
    setSubtasks((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{initialData ? "Edit Tugas" : "Tugas Baru"}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Judul Tugas</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Bayar tagihan listrik" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" autoFocus />

        <label className="text-[11px] text-white/40 font-medium">Deskripsi (opsional)</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detail tambahan..." rows={2} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime resize-none" />

        <label className="text-[11px] text-white/40 font-medium">Prioritas</label>
        <div className="flex gap-2 mt-1.5 mb-4">
          {PRIORITIES.map((p) => (
            <button key={p.id} onClick={() => setPriority(p.id)} className="flex-1 py-2.5 rounded-lg text-xs font-medium border transition" style={priority === p.id ? { backgroundColor: p.color, borderColor: p.color, color: "#0C0D0F" } : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              {p.label}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium flex items-center justify-between mb-1.5">
          <span>Tugas Rutin Bulanan?</span>
          <button
            type="button"
            onClick={() => setRecurring((v) => !v)}
            className={`w-9 h-5 rounded-full transition relative ${recurring ? "bg-lime" : "bg-white/15"}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${recurring ? "left-4" : "left-0.5"}`} />
          </button>
        </label>

        {recurring ? (
          <div className="mt-1.5 mb-4">
            <div className="text-[11px] text-white/40 mb-1.5">Setiap tanggal berapa?</div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setRecurDay(d)}
                  className={`py-2 rounded-md text-[10px] font-medium border ${recurDay === d ? "bg-lime text-black border-lime font-bold" : "bg-white/[0.03] border-white/10 text-white/60"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <label className="text-[11px] text-white/40 font-medium">Tenggat Waktu (opsional)</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime text-white" />
          </>
        )}

        <label className="text-[11px] text-white/40 font-medium">Sub-Tugas / Checklist (opsional)</label>
        <div className="flex gap-2 mt-1.5 mb-2">
          <input
            value={subtaskInput}
            onChange={(e) => setSubtaskInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtaskDraft(); } }}
            placeholder="mis. Cek nominal tagihan"
            className="flex-1 bg-white/[0.04] rounded-lg px-3 py-2.5 text-xs outline-none focus-lime"
          />
          <button onClick={addSubtaskDraft} className="bg-white/10 text-white px-3 rounded-lg text-xs font-medium">Tambah</button>
        </div>
        {subtasks.length > 0 && (
          <div className="space-y-1.5 mb-6">
            {subtasks.map((s, idx) => (
              <div key={s.id || idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                <span className={`text-xs truncate ${s.done ? "line-through text-white/30" : "text-white/70"}`}>{s.text}</span>
                <button onClick={() => removeSubtaskDraft(idx)} className="text-white/30 hover:text-coral shrink-0 ml-2"><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ title: title.trim(), description: description.trim(), priority, dueDate, subtasks, recurring, recurDay })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 mt-2"
        >
          Simpan Tugas
        </button>
      </div>
    </div>
  );
}

export default AddTaskSheet;
