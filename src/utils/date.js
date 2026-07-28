// Fungsi bantu untuk perhitungan minggu & tanggal recurring
function getWeekRange(d = new Date()) {
  const day = d.getDay(); 
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function getWeeksInMonth(year, monthIdx) {
  const firstDay = new Date(year, monthIdx, 1);
  const lastDay = new Date(year, monthIdx + 1, 0);
  const { start: firstWeekStart } = getWeekRange(firstDay);
  const { start: lastWeekStart } = getWeekRange(lastDay);
  const diffWeeks = Math.round((lastWeekStart - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return diffWeeks;
}

function computeNextRecurDate(day, fromISO) {
  const from = fromISO ? new Date(fromISO + "T00:00:00") : new Date();
  let y = from.getFullYear();
  let m = from.getMonth();
  const clampDay = (yy, mm, d) => Math.min(d, new Date(yy, mm + 1, 0).getDate());

  let candidateDay = clampDay(y, m, day);
  let candidate = new Date(y, m, candidateDay);
  if (candidate < new Date(from.toDateString())) {
    m += 1;
    if (m > 11) { m = 0; y += 1; }
    candidateDay = clampDay(y, m, day);
    candidate = new Date(y, m, candidateDay);
  }
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(candidateDay).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export { getWeekRange, getWeeksInMonth, computeNextRecurDate };
