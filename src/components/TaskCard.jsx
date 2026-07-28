import { Trash2, Edit2, Check } from "lucide-react";
import { PRIORITIES } from "../constants";
import { todayKey, formatDateID } from "../utils/format";

function TaskCard({ t, isExpanded, onToggleExpand, onToggleDone, onToggleSubtask, onEdit, onDelete }) {
  const prio = PRIORITIES.find((p) => p.id === t.priority) || PRIORITIES[1];
  const subDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s) => s.done).length : 0;
  const subTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
  const isOverdue = !t.done && t.dueDate && t.dueDate < todayKey();

  return (
    <div className={`bg-white/[0.03] border rounded-xl p-4 transition ${t.done ? "border-white/5 opacity-60" : isOverdue ? "border-coral/40" : "border-white/10"}`}>
      <div className="flex items-start gap-3">
        <button onClick={onToggleDone} className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${t.done ? "bg-lime border-lime" : "border-white/25 hover:border-lime"}`}>
          {t.done && <Check size={13} className="text-black" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className={`font-medium text-sm break-words ${t.done ? "line-through text-white/40" : ""}`}>{t.title}</span>
            <div className="flex items-center gap-1 shrink-0 mt-0.5">
              {t.recurring && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal/20 text-teal">🔁 Rutin</span>}
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: prio.color + "26", color: prio.color }}>{prio.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            {t.dueDate && <span className={isOverdue ? "text-coral font-medium" : ""}>{formatDateID(t.dueDate)}</span>}
            {subTotal > 0 && <span>{subDone}/{subTotal} sub-tugas</span>}
          </div>
          {subTotal > 0 && (
            <div className="h-[3px] bg-white/8 overflow-hidden rounded-full mt-2">
              <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${(subDone / subTotal) * 100}%` }} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="text-white/30 hover:text-white p-1.5"><Edit2 size={13} /></button>
          <button onClick={onDelete} className="text-white/30 hover:text-coral p-1.5"><Trash2 size={13} /></button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-white/5">
          {t.description && <p className="text-xs text-white/60 mb-3 leading-relaxed">{t.description}</p>}
          {Array.isArray(t.subtasks) && t.subtasks.length > 0 && (
            <div className="space-y-1.5">
              {t.subtasks.map((s) => (
                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={s.done} onChange={() => onToggleSubtask(s.id)} className="accent-lime w-3.5 h-3.5" />
                  <span className={`text-xs ${s.done ? "line-through text-white/30" : "text-white/70"}`}>{s.text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TaskCard;
