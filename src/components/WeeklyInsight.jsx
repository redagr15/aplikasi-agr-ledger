import { useMemo } from "react";
import { TrendingDown, TrendingUp, Sparkles, Info } from "lucide-react";
import { CATEGORIES } from "../constants";
import { rupiah } from "../utils/format";
import { getWeekRange } from "../utils/date";

// Bikin 1-3 kalimat insight otomatis: bandingin pengeluaran minggu ini vs minggu lalu,
// per kategori, tanpa perlu buka laporan manual.
function computeWeeklyInsights(data) {
  if (!data) return [];

  const { start, end } = getWeekRange();
  const lastStart = new Date(start);
  lastStart.setDate(start.getDate() - 7);
  const lastEnd = new Date(end);
  lastEnd.setDate(end.getDate() - 7);

  const thisWeekByCat = {};
  const lastWeekByCat = {};
  let totalThis = 0;
  let totalLast = 0;

  for (const t of data.transactions || []) {
    if (t.type !== "expense" || t.routineId || !t.date) continue;
    const d = new Date(t.date.slice(0, 10) + "T00:00:00");
    if (isNaN(d.getTime())) continue;

    if (d >= start && d <= end) {
      thisWeekByCat[t.category] = (thisWeekByCat[t.category] || 0) + t.amount;
      totalThis += t.amount;
    } else if (d >= lastStart && d <= lastEnd) {
      lastWeekByCat[t.category] = (lastWeekByCat[t.category] || 0) + t.amount;
      totalLast += t.amount;
    }
  }

  const insights = [];

  if (totalLast > 0) {
    const deltaPct = Math.round(((totalThis - totalLast) / totalLast) * 100);
    insights.push({
      type: deltaPct <= 0 ? "good" : "warn",
      text:
        deltaPct <= 0
          ? `Pengeluaran minggu ini ${rupiah(totalThis)}, turun ${Math.abs(deltaPct)}% dari minggu lalu (${rupiah(totalLast)}). Mantap!`
          : `Pengeluaran minggu ini ${rupiah(totalThis)}, naik ${deltaPct}% dari minggu lalu (${rupiah(totalLast)}).`,
    });
  } else if (totalThis > 0) {
    insights.push({
      type: "neutral",
      text: `Pengeluaran minggu ini ${rupiah(totalThis)}. Belum ada data minggu lalu untuk dibandingkan.`,
    });
  }

  const topCatEntry = Object.entries(thisWeekByCat).sort((a, b) => b[1] - a[1])[0];
  if (topCatEntry) {
    const cat = CATEGORIES.find((c) => c.id === topCatEntry[0]);
    insights.push({
      type: "info",
      text: `Paling banyak keluar buat ${cat?.emoji || "✨"} ${cat?.label || "Lainnya"}: ${rupiah(topCatEntry[1])} minggu ini.`,
    });
  }

  let biggestJump = null;
  for (const [catId, amt] of Object.entries(thisWeekByCat)) {
    const prevAmt = lastWeekByCat[catId] || 0;
    if (prevAmt > 0) {
      const pct = ((amt - prevAmt) / prevAmt) * 100;
      if (pct > 20 && (!biggestJump || pct > biggestJump.pct)) {
        biggestJump = { catId, pct: Math.round(pct) };
      }
    }
  }
  if (biggestJump) {
    const cat = CATEGORIES.find((c) => c.id === biggestJump.catId);
    insights.push({
      type: "warn",
      text: `Kategori ${cat?.emoji || "✨"} ${cat?.label || "Lainnya"} naik ${biggestJump.pct}% dari minggu lalu. Perlu direm dikit?`,
    });
  }

  if (totalThis === 0 && totalLast === 0) {
    insights.push({ type: "neutral", text: "Belum ada transaksi pengeluaran minggu ini." });
  }

  return insights.slice(0, 3);
}

const ICONS = {
  good: { Icon: TrendingDown, color: "#C8FF4D" },
  warn: { Icon: TrendingUp, color: "#FF7A6B" },
  info: { Icon: Sparkles, color: "#7CE3FF" },
  neutral: { Icon: Info, color: "#8a8a8a" },
};

function WeeklyInsight({ data }) {
  const insights = useMemo(() => computeWeeklyInsights(data), [data]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-9">
      <div className="text-[11px] uppercase tracking-wider text-white/35 font-medium mb-3">
        Insight Minggu Ini
      </div>
      <div className="space-y-2">
        {insights.map((ins, idx) => {
          const { Icon, color } = ICONS[ins.type] || ICONS.neutral;
          return (
            <div
              key={idx}
              className="flex items-start gap-2.5 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3"
            >
              <Icon size={14} className="shrink-0 mt-0.5" style={{ color }} />
              <span className="text-xs text-white/75 leading-relaxed">{ins.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyInsight;
