import { useMemo, useState } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { todayKey } from "../utils/format";

// Skor kesehatan finansial 0-100, dihitung murni dari data yang sudah ada:
// - Disiplin budget (35 poin)   -> sisa budget periode berjalan
// - Progress tabungan (25 poin) -> rata-rata progress semua target tabungan
// - Beban cicilan (25 poin)     -> total cicilan aktif dibanding pemasukan bulan ini
// - Tugas keuangan (15 poin)    -> jumlah tugas yang sudah lewat tenggat (overdue)
function computeHealthScore({ data, budgetRatio, totals }) {
  const budgetScore = Math.max(0, Math.min(1, budgetRatio || 0)) * 35;

  const goals = data.goals || [];
  let goalsScore = 0;
  if (goals.length > 0) {
    const avgProgress =
      goals.reduce((s, g) => s + Math.max(0, Math.min(1, g.target > 0 ? g.saved / g.target : 0)), 0) /
      goals.length;
    goalsScore = avgProgress * 25;
  }

  const unpaidMonthly = (data.spaylater || [])
    .filter((s) => !s.isFinished)
    .reduce((s, item) => s + (item.monthlyPayment || 0), 0);
  const monthIncome = totals?.monthIncome || 0;
  const burdenRatio = monthIncome > 0 ? unpaidMonthly / monthIncome : unpaidMonthly > 0 ? 1 : 0;
  const debtScore = Math.max(0, 1 - Math.min(1, burdenRatio / 0.4)) * 25;

  const today = todayKey();
  const overdueTasks = (data.tasks || []).filter((t) => !t.done && t.dueDate && t.dueDate < today).length;
  const tasksScore = Math.max(0, 1 - Math.min(1, overdueTasks / 5)) * 15;

  const total = Math.round(budgetScore + goalsScore + debtScore + tasksScore);

  return {
    total: Math.max(0, Math.min(100, total)),
    breakdown: [
      { label: "Disiplin Budget", score: Math.round(budgetScore), max: 35 },
      { label: "Progress Tabungan", score: Math.round(goalsScore), max: 25 },
      { label: "Beban Cicilan", score: Math.round(debtScore), max: 25 },
      { label: "Tugas Keuangan", score: Math.round(tasksScore), max: 15 },
    ],
  };
}

function getScoreMeta(total) {
  if (total >= 80) return { label: "Sehat Banget", emoji: "💪", color: "#C8FF4D" };
  if (total >= 60) return { label: "Lumayan Aman", emoji: "🙂", color: "#7CE3FF" };
  if (total >= 40) return { label: "Perlu Diperhatikan", emoji: "⚠️", color: "#FFB84D" };
  return { label: "Butuh Perhatian Serius", emoji: "🚨", color: "#FF7A6B" };
}

function FinancialHealthScore({ data, budgetRatio, totals }) {
  const [expanded, setExpanded] = useState(false);

  const { total, breakdown } = useMemo(
    () => computeHealthScore({ data, budgetRatio, totals }),
    [data, budgetRatio, totals]
  );
  const meta = getScoreMeta(total);

  return (
    <div className="mb-9 bg-surface border border-white/10 rounded-2xl p-4 md:p-5">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 font-bold text-base tabular"
            style={{ backgroundColor: meta.color + "22", color: meta.color }}
          >
            {total}
          </div>
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-white/35 font-medium">
              <Activity size={11} /> Skor Kesehatan Finansial
            </div>
            <div className="text-sm font-semibold truncate mt-0.5">
              {meta.emoji} {meta.label}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-white/40 shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
          {breakdown.map((b) => (
            <div key={b.label}>
              <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
                <span>{b.label}</span>
                <span className="tabular">{b.score}/{b.max}</span>
              </div>
              <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(b.score / b.max) * 100}%`, backgroundColor: meta.color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FinancialHealthScore;
