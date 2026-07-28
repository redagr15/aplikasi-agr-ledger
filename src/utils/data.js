// Data awal (seed), migrasi data lama, dan perhitungan saldo/lembur
import { MONTHS } from "../constants";

const emptyYearData = (inheritedGaji = 0) => ({
  months: Object.fromEntries(
    MONTHS.map((m) => [
      m,
      { saldoAwal: 0, gaji: inheritedGaji, keterangan: "" },
    ])
  ),
});

const seedData = () => ({
  wallets: [
    { id: "w1", name: "Dompet Utama", balance: 0, color: "#D4FF3F" },
  ],
  primaryWalletId: "w1",
  transactions: [],
  budgetLimit: 500000,
  budgetPeriod: "monthly",
  goals: [
    { id: "g1", name: "Dana Darurat", target: 5000000, saved: 0 }
  ],
  budgetYears: { [new Date().getFullYear()]: emptyYearData(0) },
  activeYear: new Date().getFullYear(),
  wishlistCategories: [],
  overtimeRate: 4500000,
  overtimeEntries: [],
  spaylater: [],
  routineEntries: [],
  tasks: [],
  salaryEntries: [],
});

function migrateData(raw) {
  const seed = seedData();
  const merged = { ...seed, ...raw };
  if (!merged.budgetYears || Object.keys(merged.budgetYears).length === 0) {
    merged.budgetYears = seed.budgetYears;
    merged.activeYear = seed.activeYear;
  }
  if (!merged.activeYear || !merged.budgetYears[merged.activeYear]) {
    merged.activeYear = Object.keys(merged.budgetYears)[0];
  }
  if (merged.goal && !merged.goals) {
    merged.goals = [{ id: "g1", ...merged.goal }];
    delete merged.goal;
  }
  if (!merged.goals) merged.goals = seed.goals;

  if (!merged.primaryWalletId || !merged.wallets.some(w => w.id === merged.primaryWalletId)) {
    merged.primaryWalletId = merged.wallets[0]?.id || null;
  }
  
  if (merged.monthlyBudget !== undefined && merged.budgetLimit === undefined) {
    merged.budgetLimit = merged.monthlyBudget;
    delete merged.monthlyBudget;
  }
  if (merged.dailyBudget !== undefined && merged.budgetLimit === undefined) {
    merged.budgetLimit = merged.dailyBudget * 30;
    delete merged.dailyBudget;
  }
  if (typeof merged.budgetLimit !== "number") merged.budgetLimit = seed.budgetLimit;
  if (!merged.budgetPeriod) merged.budgetPeriod = "monthly";

  if (!merged.wishlistCategories) merged.wishlistCategories = [];
  else {
    merged.wishlistCategories = merged.wishlistCategories.map(cat => ({
      ...cat,
      goalId: cat.goalId || null,
      items: Array.isArray(cat.items) ? cat.items.map(i => ({ ...i, link: i.link || "" })) : []
    }));
  }

  if (typeof merged.overtimeRate !== "number") merged.overtimeRate = seed.overtimeRate;
  if (!Array.isArray(merged.overtimeEntries)) merged.overtimeEntries = [];
  if (!Array.isArray(merged.spaylater)) merged.spaylater = [];
  if (!Array.isArray(merged.routineEntries)) merged.routineEntries = [];
  if (!Array.isArray(merged.tasks)) merged.tasks = [];
  if (!Array.isArray(merged.salaryEntries)) merged.salaryEntries = [];

  const defaultWalletId = merged.primaryWalletId || merged.wallets?.[0]?.id || "w1";
  merged.salaryEntries = merged.salaryEntries.map(e => ({
    ...e,
    walletId: e.walletId || defaultWalletId,
  }));

  if (merged.salaryEntries.length === 0) {
    for (const y of Object.keys(merged.budgetYears)) {
      MONTHS.forEach((m, idx) => {
        const g = merged.budgetYears[y].months[m]?.gaji;
        if (g && g > 0) {
          merged.salaryEntries.push({
            id: crypto.randomUUID(),
            amount: g,
            date: `${y}-${String(idx + 1).padStart(2, "0")}-01`,
            walletId: defaultWalletId,
          });
        }
      });
    }
  }

  merged.spaylater = merged.spaylater.map(s => ({
    ...s,
    walletId: s.walletId || defaultWalletId,
  }));

  merged.tasks = merged.tasks.map(t => ({
    id: t.id || crypto.randomUUID(),
    title: t.title || "Tugas",
    description: t.description || "",
    priority: t.priority || "medium",
    dueDate: t.dueDate || "",
    done: !!t.done,
    createdAt: t.createdAt || Date.now(),
    recurring: !!t.recurring,
    recurDay: t.recurDay || null,
    subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(sub => ({
      id: sub.id || crypto.randomUUID(),
      text: sub.text || "",
      done: !!sub.done,
    })) : [],
  }));

  for (const y of Object.keys(merged.budgetYears)) {
    if (merged.budgetYears[y] && merged.budgetYears[y].months) {
      for (const m of Object.keys(merged.budgetYears[y].months)) {
        delete merged.budgetYears[y].months[m].rutin;
      }
    }
  }

  merged.routineEntries = merged.routineEntries.map(e => {
    let sIdx = e.startIndex !== undefined ? e.startIndex : 0;
    let stopIdx = e.stopIndex !== undefined ? e.stopIndex : 11;
    if (e.startMonth) {
      const parts = e.startMonth.split("-");
      if (parts.length === 2) sIdx = Number(parts[1]) - 1;
    }
    return {
      id: e.id || crypto.randomUUID(),
      name: e.name || "Rutin",
      amount: Number(e.amount) || 0,
      activeYear: e.activeYear || Number(merged.activeYear) || new Date().getFullYear(),
      startIndex: sIdx,
      stopIndex: stopIdx,
    };
  });

  return merged;
}

function computeAkhir(row, customSaldoAwal = null) {
  const sAwal = customSaldoAwal !== null ? customSaldoAwal : (row.saldoAwal || 0);
  return (
    sAwal +
    (row.gaji || 0) +
    (row.gajiTambahan || 0) -
    (row.rutin || 0) -
    (row.cicilan || 0) -
    (row.pengeluaran || 0)
  );
}

function computeOvertime(rate, jenis, jam) {
  const safeRate = Number(rate) || 0;
  const safeJam = Number(jam) || 0;
  const perHour = safeRate / 173;
  if (safeJam <= 0) return { amount: 0, hrs: 0 };
  
  let amount = 0, hrs = 0;
  
  if (jenis === "Biasa") {
    amount += perHour * 1.5;
    hrs += 1.5;
    for (let h = 2; h <= safeJam; h++) {
      amount += perHour * 2;
      hrs += 2;
    }
  } else {
    for (let h = 1; h <= safeJam; h++) {
      const mult = h <= 8 ? 2 : h === 9 ? 3 : 4;
      amount += perHour * mult;
      hrs += mult;
    }
  }
  
  return { amount: Math.round(amount), hrs: Number(hrs.toFixed(1)) };
}


export { emptyYearData, seedData, migrateData, computeAkhir, computeOvertime };
