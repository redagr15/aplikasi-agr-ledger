import React, { useState, useEffect, useMemo, useRef } from "react";
import logoImg from "./assets/logo.png";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Trash2,
  Target,
  Search,
  PiggyBank,
  Home,
  Calendar,
  Heart,
  Clock,
  Edit2,
  Check,
  Download,
  Upload,
  ArrowRightLeft,
  History,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const CATEGORIES = [
  { id: "makan", label: "Makan & Minum", emoji: "🍜", color: "#FFB84D" },
  { id: "transport", label: "Transport", emoji: "🛵", color: "#7CE3FF" },
  { id: "belanja", label: "Belanja", emoji: "🛍️", color: "#FF8FD8" },
  { id: "tagihan", label: "Tagihan", emoji: "🧾", color: "#FF7A6B" },
  { id: "hiburan", label: "Hiburan", emoji: "🎮", color: "#B39CFF" },
  { id: "lainnya", label: "Lainnya", emoji: "✨", color: "#6EE7B7" },
];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const rupiah = (n) =>
  "Rp" + Math.round(n || 0).toLocaleString("id-ID");

const formatRupiahInput = (val) => {
  const raw = String(val || "").replace(/[^0-9]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("id-ID");
};

const parseRupiahInput = (val) => {
  const raw = String(val || "").replace(/[^0-9]/g, "");
  return Number(raw) || 0;
};

const todayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateID = (iso) => {
  if (!iso) return "-";
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const WALLET_COLORS = ["#D4FF3F", "#7CE3FF", "#FF8FD8", "#FFB84D", "#B39CFF", "#6EE7B7", "#F472B6"];

const emptyYearData = (inheritedGaji = 0) => ({
  months: Object.fromEntries(
    MONTHS.map((m) => [
      m,
      { saldoAwal: 0, gaji: inheritedGaji, gajiTambahan: 0, rutin: 0, cicilan: 0, pengeluaran: 0, keterangan: "" },
    ])
  ),
});

const seedData = () => ({
  wallets: [
    { id: "w1", name: "Dompet Utama", balance: 0, color: "#D4FF3F" },
  ],
  transactions: [],
  monthlyBudget: 500000,
  goals: [
    { id: "g1", name: "Dana Darurat", target: 5000000, saved: 0 }
  ],
  budgetYears: { [new Date().getFullYear()]: emptyYearData(0) },
  activeYear: new Date().getFullYear(),
  wishlistCategories: [],
  overtimeRate: 4500000,
  overtimeEntries: [],
  spaylater: [],
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
  
  if (merged.dailyBudget !== undefined && merged.monthlyBudget === undefined) {
    merged.monthlyBudget = merged.dailyBudget * 30;
    delete merged.dailyBudget;
  }
  if (typeof merged.monthlyBudget !== "number") merged.monthlyBudget = seed.monthlyBudget;

  Object.keys(merged.budgetYears).forEach((y) => {
    Object.keys(merged.budgetYears[y].months).forEach((m) => {
      const monthObj = merged.budgetYears[y].months[m];
      if (monthObj.takTerduga !== undefined && monthObj.pengeluaran === undefined) {
        monthObj.pengeluaran = monthObj.takTerduga;
        delete monthObj.takTerduga;
      }
      if (monthObj.pengeluaran === undefined) {
        monthObj.pengeluaran = 0;
      }
    });
  });

  if (!merged.wishlistCategories) merged.wishlistCategories = [];
  if (typeof merged.overtimeRate !== "number") merged.overtimeRate = seed.overtimeRate;
  if (!Array.isArray(merged.overtimeEntries)) merged.overtimeEntries = [];
  if (!merged.spaylater) merged.spaylater = [];
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

function SectionLabel({ children, noMargin }) {
  return (
    <div className={`text-[11px] uppercase tracking-wider text-white/35 font-medium ${noMargin ? "" : "mb-3"}`}>
      {children}
    </div>
  );
}

function EmptyRow({ children }) {
  return (
    <div className="text-xs text-white/30 border border-dashed border-white/10 px-4 py-6 text-center rounded-xl">
      {children}
    </div>
  );
}

function TopTabs({ active, onChange }) {
  const tabs = [
    { id: "home", label: "Beranda", icon: Home },
    { id: "budget", label: "Budget", icon: Calendar },
    { id: "wishlist", label: "Wishlist", icon: Heart },
    { id: "lembur", label: "Lembur", icon: Clock },
  ];
  return (
    <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 mb-6">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 py-2 rounded-md text-[10.5px] font-medium flex flex-col items-center gap-1 transition ${
              isActive ? "bg-lime text-black" : "text-white/45 hover:text-white/70"
            }`}
          >
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AgrLedgerApp() {
  const [data, setData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("expense");
  const [editingTx, setEditingTx] = useState(null);
  const [error, setError] = useState("");
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [wishlistFilter, setWishlistFilter] = useState("all");

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState(null);

  const [showAddOvertime, setShowAddOvertime] = useState(false);
  const [showAddSpaylater, setShowAddSpaylater] = useState(false);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [topUpGoal, setTopUpGoal] = useState(null);

  const [isEditingMonthlyBudget, setIsEditingMonthlyBudget] = useState(false);
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState("");

  const [editingWalletId, setEditingWalletId] = useState(null);
  const [editingWalletName, setEditingWalletName] = useState("");

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedYearsToDelete, setSelectedYearsToDelete] = useState([]);

  const [confirmAction, setConfirmAction] = useState(null);
  const importInputRef = useRef(null);
  const [breakdownTooltip, setBreakdownTooltip] = useState(null);
  const [showSpaylaterHistory, setShowSpaylaterHistory] = useState(false);

  useEffect(() => {
    try {
      const res = localStorage.getItem("agr_ledger_data");
      setData(res ? migrateData(JSON.parse(res)) : seedData());
    } catch {
      setData(seedData());
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    setBreakdownTooltip(null);
  }, [activeTab]);

  useEffect(() => {
    if (!loaded || !data) return;
    try {
      localStorage.setItem("agr_ledger_data", JSON.stringify(data));
    } catch (err) {
      showError("Gagal menyimpan data ke sistem perangkat.");
    }
  }, [data, loaded]);

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  }

  function showBreakdownTooltip(e, monthLabel, breakdown, typeLabel) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 240;
    const estHeight = 84 + Math.min(breakdown.length, 6) * 22;
    let left = rect.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    if (top + estHeight > window.innerHeight - 8) {
      top = rect.top - estHeight - 8;
      if (top < 8) top = 8;
    }
    setBreakdownTooltip({ left, top, label: monthLabel, breakdown, typeLabel });
  }

  function hideBreakdownTooltip() {
    setBreakdownTooltip(null);
  }

  function requestConfirm(title, message, onConfirm) {
    setConfirmAction({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmAction(null);
      },
    });
  }

  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agr-ledger-backup-${todayKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showError("Gagal mengekspor data.");
    }
  }

  function importDataFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.wallets) {
          throw new Error("Invalid structure");
        }
        setData(migrateData(parsed));
        setError("");
      } catch {
        showError("File JSON rusak atau tidak valid. Gagal mengimpor data AGR Ledger.");
      }
    };
    reader.onerror = () => showError("Gagal membaca file sistem.");
    reader.readAsText(file);
  }

  function handleImportFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    requestConfirm(
      "Timpa Data Saat Ini?",
      "Mengimpor file ini akan mengganti seluruh data AGR Ledger yang tersimpan sekarang (transaksi, budget bulanan, wishlist, lembur, cicilan). Pastikan file backup yang dipilih sudah benar.",
      () => importDataFromFile(file)
    );
  }

  const totals = useMemo(() => {
    if (!data) return { income: 0, expense: 0, balance: 0, monthSpent: 0 };
    const currentMonthPrefix = new Date().toISOString().slice(0, 7);
    let income = 0, expense = 0, monthSpent = 0;
    for (const t of data.transactions) {
      if (t.type === "transfer") continue;
      if (t.type === "income") income += t.amount;
      else expense += t.amount;
      if (t.date && t.date.startsWith(currentMonthPrefix) && t.type === "expense") monthSpent += t.amount;
    }
    const balance = data.wallets.reduce((s, w) => s + w.balance, 0);
    return { income, expense, balance, monthSpent };
  }, [data]);

  const remainingMonth = data ? Math.max(data.monthlyBudget - totals.monthSpent, 0) : 0;

  const categorySpend = useMemo(() => {
    if (!data) return [];
    const map = {};
    for (const t of data.transactions) {
      if (t.type !== "expense") continue;
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
    return CATEGORIES.map((c) => ({ ...c, total: map[c.id] || 0 })).sort(
      (a, b) => b.total - a.total
    );
  }, [data]);

  const maxCat = Math.max(1, ...categorySpend.map((c) => c.total));

  const calendarGridData = useMemo(() => {
    if (!data) return [];
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const txMap = {};
    for (const t of data.transactions) {
      if (t.type === "expense" || t.type === "income") {
        if (!txMap[t.date]) txMap[t.date] = { expense: 0, income: 0 };
        txMap[t.date][t.type] += t.amount;
      }
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push({ empty: true, id: `empty-pre-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(year, month, d);
      const isoStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      const dayOfWeek = currentDate.getDay(); 
      let isHoliday = false;

      if (dayOfWeek === 0) {
        isHoliday = true;
      } else if (dayOfWeek === 6) {
        const diffTime = currentDate.getTime() - new Date(2026, 7, 1).getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const diffWeeks = Math.floor(diffDays / 7);
        if (diffDays >= 0 && diffWeeks % 2 === 0) {
          isHoliday = true;
        } else if (diffDays < 0) {
          const backWeeks = Math.ceil(Math.abs(diffDays) / 7);
          if (backWeeks % 2 === 0) {
            isHoliday = true;
          }
        }
      }

      days.push({
        empty: false,
        dateNum: d,
        iso: isoStr,
        expense: txMap[isoStr]?.expense || 0,
        income: txMap[isoStr]?.income || 0,
        isHoliday,
        dayOfWeek,
      });
    }

    return days;
  }, [data, calendarDate]);

  function handlePrevMonth() {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }

  function handleNextMonth() {
    setCalendarDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const cat = CATEGORIES.find((c) => c.id === t.category);
      const matchesSearch =
        !search ||
        (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
        (cat?.label || "").toLowerCase().includes(search.toLowerCase());
      if (filterCat === "all") return matchesSearch;
      return matchesSearch && t.type === "expense" && t.category === filterCat;
    });
  }, [data, search, filterCat]);

  function updateBudgetCell(year, month, field, value) {
    setData((prev) => {
      const yearMonths = { ...prev.budgetYears[year].months };
      const monthIndex = MONTHS.indexOf(month);

      if (field === "gaji") {
        for (let i = monthIndex; i < MONTHS.length; i++) {
          const mName = MONTHS[i];
          yearMonths[mName] = {
            ...yearMonths[mName],
            gaji: value,
          };
        }
      } else {
        yearMonths[month] = {
          ...yearMonths[month],
          [field]: value,
        };
      }

      return {
        ...prev,
        budgetYears: {
          ...prev.budgetYears,
          [year]: {
            ...prev.budgetYears[year],
            months: yearMonths,
          },
        },
      };
    });
  }

  function computeYearEndBalance(yearKey, allBudgetYears) {
    if (!allBudgetYears[yearKey]) return 0;
    
    const sortedExistingYears = Object.keys(allBudgetYears).map(Number).sort((a, b) => a - b);
    const currIdx = sortedExistingYears.indexOf(Number(yearKey));
    
    let runningBal = 0;
    if (currIdx > 0) {
      const prevYearKey = String(sortedExistingYears[currIdx - 1]);
      runningBal = computeYearEndBalance(prevYearKey, allBudgetYears);
    } else {
      runningBal = allBudgetYears[yearKey].months[MONTHS[0]].saldoAwal || 0;
    }

    const yearMonths = allBudgetYears[yearKey].months;
    const resolvedGajiList = getResolvedGajiForYear(yearKey, allBudgetYears);

    MONTHS.forEach((m, idx) => {
      const mRow = { ...yearMonths[m], gaji: resolvedGajiList[idx] };
      const mStart = runningBal;
      runningBal = computeAkhir(mRow, mStart);
    });

    return runningBal;
  }

  function getResolvedGajiForYear(yearKey, allBudgetYears) {
    if (!allBudgetYears[yearKey]) return Array(12).fill(0);
    const yearMonths = allBudgetYears[yearKey].months;
    const rawGaji = MONTHS.map((m) => yearMonths[m].gaji || 0);

    const sortedExistingYears = Object.keys(allBudgetYears).map(Number).sort((a, b) => a - b);
    const currIdx = sortedExistingYears.indexOf(Number(yearKey));

    let inheritedBase = 0;
    if (currIdx > 0) {
      const prevYearKey = String(sortedExistingYears[currIdx - 1]);
      const prevResolvedGaji = getResolvedGajiForYear(prevYearKey, allBudgetYears);
      inheritedBase = prevResolvedGaji[prevResolvedGaji.length - 1];
    }

    const resolved = [];
    let currentVal = inheritedBase;
    for (let i = 0; i < 12; i++) {
      if (rawGaji[i] > 0) {
        currentVal = rawGaji[i];
      }
      resolved.push(currentVal);
    }
    return resolved;
  }

  function addBudgetYear() {
    setData((prev) => {
      const sortedYears = Object.keys(prev.budgetYears).map(Number).sort((a, b) => a - b);
      const nextYear = sortedYears.length ? Math.max(...sortedYears) + 1 : new Date().getFullYear();
      
      let inheritedJanSaldo = 0;
      let inheritedGaji = 0;

      if (sortedYears.length > 0) {
        const latestExistingYear = String(sortedYears[sortedYears.length - 1]);
        inheritedJanSaldo = computeYearEndBalance(latestExistingYear, prev.budgetYears);
        
        const latestYearMonths = prev.budgetYears[latestExistingYear].months;
        inheritedGaji = latestYearMonths[MONTHS[MONTHS.length - 1]].gaji || 0;
      }

      const newYearData = emptyYearData(inheritedGaji);
      newYearData.months[MONTHS[0]].saldoAwal = inheritedJanSaldo;

      return {
        ...prev,
        budgetYears: { ...prev.budgetYears, [nextYear]: newYearData },
        activeYear: nextYear,
      };
    });
  }

  function executeDeleteSelectedYears() {
    setData((prev) => {
      const allYears = Object.keys(prev.budgetYears);
      if (allYears.length <= selectedYearsToDelete.length) {
          showError("Tidak bisa menghapus semua tahun. Harus tersisa minimal 1 tahun.");
          return prev;
      }

      const updatedBudgetYears = { ...prev.budgetYears };
      selectedYearsToDelete.forEach((y) => {
        delete updatedBudgetYears[y];
      });

      const remainingYears = Object.keys(updatedBudgetYears).sort();
      const newActive = selectedYearsToDelete.includes(String(prev.activeYear))
        ? remainingYears[remainingYears.length - 1]
        : prev.activeYear;

      return {
        ...prev,
        budgetYears: updatedBudgetYears,
        activeYear: newActive,
      };
    });
    setSelectedYearsToDelete([]);
    setIsDeleteMode(false);
  }

  const wishlistTotal = useMemo(() => {
    if (!data) return 0;
    return data.wishlistCategories.reduce(
      (sum, c) => sum + c.items.filter((i) => !i.bought).reduce((s, i) => s + i.price, 0),
      0
    );
  }, [data]);

  function addWishlistCategory(name) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: [
        ...prev.wishlistCategories,
        { id: crypto.randomUUID(), name, items: [] },
      ],
    }));
  }

  function deleteWishlistCategory(catId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.filter((c) => c.id !== catId),
    }));
  }

  function addWishlistItem(catId, { name, price }) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.map((c) =>
        c.id === catId
          ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name, price, bought: false }] }
          : c
      ),
    }));
  }

  function toggleWishlistBought(catId, itemId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.map((c) =>
        c.id === catId
          ? {
              ...c,
              items: c.items.map((i) => (i.id === itemId ? { ...i, bought: !i.bought } : i)),
            }
          : c
      ),
    }));
  }

  function deleteWishlistItem(catId, itemId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      ),
    }));
  }

  function addSpaylater({ name, totalAmount, tenor, purchaseDate }) {
    setData((prev) => {
      const id = crypto.randomUUID();
      const monthlyPayment = Math.round(Number(totalAmount) / Number(tenor));
      
      const d = new Date(purchaseDate + "T00:00:00");
      const startMonth = d.getMonth() + 1;
      const startYear = d.getFullYear();

      let updatedBudget = { ...prev.budgetYears };

      for (let i = 0; i < tenor; i++) {
        const mIdx = (startMonth + i) % 12;
        const yOffset = Math.floor((startMonth + i) / 12);
        const targetYear = startYear + yOffset;
        const targetMonthStr = MONTHS[mIdx];

        if (!updatedBudget[targetYear]) {
          updatedBudget[targetYear] = emptyYearData(0);
        }

        const currentCicilan = updatedBudget[targetYear].months[targetMonthStr].cicilan || 0;
        
        updatedBudget = {
          ...updatedBudget,
          [targetYear]: {
            ...updatedBudget[targetYear],
            months: {
              ...updatedBudget[targetYear].months,
              [targetMonthStr]: {
                ...updatedBudget[targetYear].months[targetMonthStr],
                cicilan: currentCicilan + monthlyPayment,
              }
            }
          }
        };
      }

      return {
        ...prev,
        budgetYears: updatedBudget,
        spaylater: [
          {
            id,
            name,
            totalAmount: Number(totalAmount),
            tenor: Number(tenor),
            purchaseDate,
            monthlyPayment,
            isFinished: false,
            paidChecklist: Array(Number(tenor)).fill(false),
          },
          ...prev.spaylater,
        ],
      };
    });
  }

  function toggleSpaylaterPaid(id, index) {
    setData((prev) => ({
      ...prev,
      spaylater: prev.spaylater.map((item) => {
        if (item.id !== id) return item;
        const isPaid = item.paidChecklist[index];
        const newChecklist = item.paidChecklist.map((v, i) =>
          isPaid ? (i >= index ? false : v) : (i <= index ? true : v)
        );
        const allPaid = newChecklist.every(Boolean);
        return {
          ...item,
          paidChecklist: newChecklist,
          isFinished: allPaid,
        };
      }),
    }));
  }

  function toggleSpaylaterFinished(id) {
    setData((prev) => ({
      ...prev,
      spaylater: prev.spaylater.map((item) => {
        if (item.id !== id) return item;
        const nextFinished = !item.isFinished;
        return {
          ...item,
          isFinished: nextFinished,
          paidChecklist: nextFinished 
            ? Array(item.tenor).fill(true) 
            : item.paidChecklist.map((v, i) => (i === item.tenor - 1 ? false : v)),
        };
      }),
    }));
  }

  function deleteSpaylater(id) {
    setData((prev) => {
      const item = prev.spaylater.find(s => s.id === id);
      if (!item) return prev;

      let updatedBudget = JSON.parse(JSON.stringify(prev.budgetYears));
      const d = new Date(item.purchaseDate + "T00:00:00");
      const startMonth = d.getMonth() + 1;
      const startYear = d.getFullYear();

      for (let i = 0; i < item.tenor; i++) {
        const mIdx = (startMonth + i) % 12;
        const yOffset = Math.floor((startMonth + i) / 12);
        const targetYear = startYear + yOffset;
        const targetMonthStr = MONTHS[mIdx];

        if (updatedBudget[targetYear] && updatedBudget[targetYear].months[targetMonthStr]) {
          const currentCicilan = updatedBudget[targetYear].months[targetMonthStr].cicilan || 0;
          updatedBudget[targetYear].months[targetMonthStr].cicilan = Math.max(0, currentCicilan - item.monthlyPayment);
        }
      }

      return {
        ...prev,
        spaylater: prev.spaylater.filter((s) => s.id !== id),
        budgetYears: updatedBudget
      };
    });
  }

  function updateOvertimeRate(v) {
    setData((prev) => ({ ...prev, overtimeRate: Number(v) || 0 }));
  }

  function addOvertimeEntry({ date, jenis, totalJam, paid }) {
    setData((prev) => {
      const { amount } = computeOvertime(prev.overtimeRate, jenis, Number(totalJam));
      const d = new Date(date + "T00:00:00");
      const y = d.getFullYear();
      const m = MONTHS[d.getMonth()];

      const budgetYears = { ...prev.budgetYears };
      if (!budgetYears[y]) budgetYears[y] = emptyYearData(0);
      
      const currentGajiTambahan = budgetYears[y].months[m].gajiTambahan || 0;

      return {
        ...prev,
        overtimeEntries: [
          { id: crypto.randomUUID(), date, jenis, totalJam: Number(totalJam), paid },
          ...(prev.overtimeEntries || []),
        ],
        budgetYears: {
          ...budgetYears,
          [y]: {
            ...budgetYears[y],
            months: {
              ...budgetYears[y].months,
              [m]: {
                ...budgetYears[y].months[m],
                gajiTambahan: paid ? currentGajiTambahan + amount : currentGajiTambahan,
              }
            }
          }
        }
      };
    });
  }

  function toggleOvertimePaid(id) {
    setData((prev) => {
      const entry = (prev.overtimeEntries || []).find((e) => e.id === id);
      if (!entry) return prev;

      const { amount } = computeOvertime(prev.overtimeRate, entry.jenis, entry.totalJam);
      const d = new Date((entry.date || todayKey()) + "T00:00:00");
      const y = d.getFullYear();
      const m = MONTHS[d.getMonth()];

      let updatedBudget = JSON.parse(JSON.stringify(prev.budgetYears || {}));
      if (!updatedBudget[y]) {
        updatedBudget[y] = emptyYearData(0);
      }

      const isNowPaid = !entry.paid;
      
      if (updatedBudget[y] && updatedBudget[y].months && updatedBudget[y].months[m]) {
         const currentGajiTambahan = updatedBudget[y].months[m].gajiTambahan || 0;
         updatedBudget[y].months[m].gajiTambahan = Math.max(0, currentGajiTambahan + (isNowPaid ? amount : -amount));
      }

      return {
        ...prev,
        overtimeEntries: prev.overtimeEntries.map((e) =>
          e.id === id ? { ...e, paid: isNowPaid } : e
        ),
        budgetYears: updatedBudget
      };
    });
  }

  function deleteOvertimeEntry(id) {
    setData((prev) => {
      const entry = (prev.overtimeEntries || []).find(e => e.id === id);
      if (!entry) return prev;

      const { amount } = computeOvertime(prev.overtimeRate, entry.jenis, entry.totalJam);
      const d = new Date((entry.date || todayKey()) + "T00:00:00");
      const y = d.getFullYear();
      const m = MONTHS[d.getMonth()];

      let updatedBudget = JSON.parse(JSON.stringify(prev.budgetYears || {}));
      
      if (entry.paid && updatedBudget[y] && updatedBudget[y].months && updatedBudget[y].months[m]) {
         const currentGajiTambahan = updatedBudget[y].months[m].gajiTambahan || 0;
         updatedBudget[y].months[m].gajiTambahan = Math.max(0, currentGajiTambahan - amount);
      }

      return {
        ...prev,
        overtimeEntries: (prev.overtimeEntries || []).filter((e) => e.id !== id),
        budgetYears: updatedBudget
      };
    });
  }

  function addTransaction({ amount, category, note, walletId, fromWalletId, toWalletId, type, date }) {
    setData((prev) => {
      const next = { ...prev };
      const txDate = date || todayKey();
      
      const d = new Date(txDate + "T00:00:00");
      const y = d.getFullYear();
      const m = MONTHS[d.getMonth()];

      let updatedBudget = { ...next.budgetYears };
      if (!updatedBudget[y]) {
        updatedBudget[y] = emptyYearData(0);
      }

      if (type === "expense") {
        const currentPengeluaran = updatedBudget[y].months[m].pengeluaran || 0;
        updatedBudget[y] = {
          ...updatedBudget[y],
          months: {
            ...updatedBudget[y].months,
            [m]: {
              ...updatedBudget[y].months[m],
              pengeluaran: currentPengeluaran + amount,
            }
          }
        };
      } else if (type === "income") {
        const currentGajiTambahan = updatedBudget[y].months[m].gajiTambahan || 0;
        updatedBudget[y] = {
          ...updatedBudget[y],
          months: {
            ...updatedBudget[y].months,
            [m]: {
              ...updatedBudget[y].months[m],
              gajiTambahan: currentGajiTambahan + amount,
            }
          }
        };
      }

      next.budgetYears = updatedBudget;
      next.transactions = [
        {
          id: crypto.randomUUID(),
          amount,
          category,
          note,
          walletId,
          fromWalletId,
          toWalletId,
          type,
          date: txDate,
          ts: Date.now(),
        },
        ...prev.transactions,
      ];
      
      if (type === "transfer") {
        next.wallets = prev.wallets.map((w) => {
          if (w.id === fromWalletId) return { ...w, balance: w.balance - amount };
          if (w.id === toWalletId) return { ...w, balance: w.balance + amount };
          return w;
        });
      } else {
        next.wallets = prev.wallets.map((w) =>
          w.id === walletId
            ? { ...w, balance: w.balance + (type === "income" ? amount : -amount) }
            : w
        );
      }

      return next;
    });
  }

  function updateTransaction(id, updatedData) {
    setData((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === id);
      if (!oldTx) return prev;

      let next = { ...prev };
      let updatedBudget = JSON.parse(JSON.stringify(next.budgetYears));
      let nextWallets = next.wallets.map(w => ({...w}));

      const oldD = new Date((oldTx.date || todayKey()) + "T00:00:00");
      const oldY = oldD.getFullYear();
      const oldM = MONTHS[oldD.getMonth()];
      
      if(updatedBudget[oldY] && updatedBudget[oldY].months && updatedBudget[oldY].months[oldM]) {
         if(oldTx.type === "expense") updatedBudget[oldY].months[oldM].pengeluaran = Math.max(0, (updatedBudget[oldY].months[oldM].pengeluaran || 0) - oldTx.amount);
         if(oldTx.type === "income") updatedBudget[oldY].months[oldM].gajiTambahan = Math.max(0, (updatedBudget[oldY].months[oldM].gajiTambahan || 0) - oldTx.amount);
      }
      
      if(oldTx.type === "transfer") {
         const fw = nextWallets.find(w => w.id === oldTx.fromWalletId);
         if(fw) fw.balance += oldTx.amount;
         const tw = nextWallets.find(w => w.id === oldTx.toWalletId);
         if(tw) tw.balance -= oldTx.amount;
      } else {
         const w = nextWallets.find(w => w.id === oldTx.walletId);
         if(w) w.balance -= (oldTx.type === "income" ? oldTx.amount : -oldTx.amount);
      }

      const txDate = updatedData.date || todayKey();
      const newD = new Date(txDate + "T00:00:00");
      const newY = newD.getFullYear();
      const newM = MONTHS[newD.getMonth()];

      if (!updatedBudget[newY]) {
        updatedBudget[newY] = emptyYearData(0);
      }

      if (updatedData.type === "expense") {
        updatedBudget[newY].months[newM].pengeluaran = (updatedBudget[newY].months[newM].pengeluaran || 0) + updatedData.amount;
      } else if (updatedData.type === "income") {
        updatedBudget[newY].months[newM].gajiTambahan = (updatedBudget[newY].months[newM].gajiTambahan || 0) + updatedData.amount;
      }

      if(updatedData.type === "transfer") {
         const fw = nextWallets.find(w => w.id === updatedData.fromWalletId);
         if(fw) fw.balance -= updatedData.amount;
         const tw = nextWallets.find(w => w.id === updatedData.toWalletId);
         if(tw) tw.balance += updatedData.amount;
      } else {
         const w = nextWallets.find(w => w.id === updatedData.walletId);
         if(w) w.balance += (updatedData.type === "income" ? updatedData.amount : -updatedData.amount);
      }

      next.budgetYears = updatedBudget;
      next.wallets = nextWallets;
      next.transactions = next.transactions.map(t => t.id === id ? { ...t, ...updatedData, ts: Date.now() } : t);

      return next;
    });
  }

  function deleteTransaction(id) {
    setData((prev) => {
      const tx = prev.transactions.find((t) => t.id === id);
      if (!tx) return prev;

      let updatedBudget = JSON.parse(JSON.stringify(prev.budgetYears));
      const d = new Date((tx.date || todayKey()) + "T00:00:00");
      const y = d.getFullYear();
      const m = MONTHS[d.getMonth()];

      if (tx.type === "expense" && updatedBudget[y] && updatedBudget[y].months && updatedBudget[y].months[m]) {
        const curr = updatedBudget[y].months[m].pengeluaran || 0;
        updatedBudget[y].months[m].pengeluaran = Math.max(0, curr - tx.amount);
      } else if (tx.type === "income" && updatedBudget[y] && updatedBudget[y].months && updatedBudget[y].months[m]) {
        const curr = updatedBudget[y].months[m].gajiTambahan || 0;
        updatedBudget[y].months[m].gajiTambahan = Math.max(0, curr - tx.amount);
      }

      let nextWallets = prev.wallets;
      if (tx.type === "transfer") {
         nextWallets = prev.wallets.map(w => {
            if (w.id === tx.fromWalletId) return { ...w, balance: w.balance + tx.amount };
            if (w.id === tx.toWalletId) return { ...w, balance: w.balance - tx.amount };
            return w;
         });
      } else {
         nextWallets = prev.wallets.map((w) =>
            w.id === tx.walletId
              ? { ...w, balance: w.balance - (tx.type === "income" ? tx.amount : -tx.amount) }
              : w
          );
      }

      return {
        ...prev,
        budgetYears: updatedBudget,
        transactions: prev.transactions.filter((t) => t.id !== id),
        wallets: nextWallets,
      };
    });
  }

  function addWallet(name) {
    setData((prev) => ({
      ...prev,
      wallets: [
        ...prev.wallets,
        {
          id: crypto.randomUUID(),
          name,
          balance: 0,
          color: WALLET_COLORS[prev.wallets.length % WALLET_COLORS.length],
        },
      ],
    }));
  }

  function deleteWallet(id) {
    setData((prev) => {
      if (prev.wallets.length <= 1) return prev;
      return {
        ...prev,
        wallets: prev.wallets.filter((w) => w.id !== id),
      };
    });
  }

  function updateWalletName(id, newName) {
    if (!newName.trim()) return;
    setData((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w) => (w.id === id ? { ...w, name: newName.trim() } : w)),
    }));
    setEditingWalletId(null);
  }

  function addGoal(goalData) {
    setData((prev) => ({
      ...prev,
      goals: [...prev.goals, { id: crypto.randomUUID(), ...goalData }]
    }));
  }

  function updateGoal(id, goalData) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...goalData } : g))
    }));
    setEditingGoalId(null);
  }

  function deleteGoal(id) {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id)
    }));
  }

  const resolvedMonthsData = useMemo(() => {
    if (!data || !data.budgetYears[data.activeYear]) return null;

    const currentYearStr = String(data.activeYear);
    const sortedYears = Object.keys(data.budgetYears).map(Number).sort((a, b) => a - b);
    const yearIndex = sortedYears.indexOf(Number(currentYearStr));

    let baseJanSaldo = 0;
    if (yearIndex > 0) {
      const prevYearStr = String(sortedYears[yearIndex - 1]);
      baseJanSaldo = computeYearEndBalance(prevYearStr, data.budgetYears);
    } else {
      baseJanSaldo = data.budgetYears[currentYearStr].months[MONTHS[0]]?.saldoAwal || 0;
    }

    const rawMonths = data.budgetYears[currentYearStr].months;
    const resolvedGajiList = getResolvedGajiForYear(currentYearStr, data.budgetYears);
    const computedMonths = {};
    let runningBalance = baseJanSaldo;

    MONTHS.forEach((m, index) => {
      const row = {
        ...(rawMonths[m] || { saldoAwal: 0, gajiTambahan: 0, rutin: 0, cicilan: 0, pengeluaran: 0, keterangan: "" }),
        gaji: resolvedGajiList[index],
      };
      
      let currentSaldoAwal = index === 0 ? baseJanSaldo : runningBalance;
      const akhir = computeAkhir(row, currentSaldoAwal);
      
      computedMonths[m] = {
        ...row,
        resolvedSaldoAwal: currentSaldoAwal,
        resolvedSaldoAkhir: akhir,
      };
      runningBalance = akhir;
    });

    return computedMonths;
  }, [data]);

  const budgetTrendData = useMemo(() => {
    if (!resolvedMonthsData) return [];
    return MONTHS.map((m) => ({
      month: m.slice(0, 3),
      saldo: resolvedMonthsData[m]?.resolvedSaldoAkhir || 0,
    }));
  }, [resolvedMonthsData]);

  const spaylaterByMonth = useMemo(() => {
    const map = {};
    for (const item of data?.spaylater || []) {
      if (!item.purchaseDate) continue;
      const d = new Date(item.purchaseDate + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      
      const startMonth = d.getMonth() + 1;
      const startYear = d.getFullYear();
      for (let i = 0; i < item.tenor; i++) {
        const mIdx = (startMonth + i) % 12;
        const yOffset = Math.floor((startMonth + i) / 12);
        const targetYear = startYear + yOffset;
        const key = `${targetYear}-${mIdx}`;
        if (!map[key]) map[key] = [];
        map[key].push({
          id: item.id,
          name: item.name,
          amount: item.monthlyPayment,
          installment: i + 1,
          tenor: item.tenor,
          paid: item.paidChecklist ? !!item.paidChecklist[i] : false,
        });
      }
    }
    return map;
  }, [data]);

  const groupedOvertime = useMemo(() => {
    if (!data || !Array.isArray(data.overtimeEntries)) return [];
    
    const groups = {};
    data.overtimeEntries.forEach((e) => {
      if (!e || !e.date) return;
      const d = new Date(e.date + "T00:00:00");
      if (isNaN(d.getTime())) return;
      
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!groups[key]) {
        groups[key] = { year: d.getFullYear(), monthIdx: d.getMonth(), entries: [] };
      }
      groups[key].entries.push(e);
    });

    return Object.values(groups)
      .sort((a, b) => a.year - b.year || a.monthIdx - b.monthIdx)
      .map((g) => {
        const entries = [...g.entries].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        let totalRp = 0, totalCair = 0, totalHrs = 0;
        
        const withCalc = entries.map((e) => {
          const { amount, hrs } = computeOvertime(data.overtimeRate || 0, e.jenis, e.totalJam || 0);
          totalRp += amount;
          if (e.paid) totalCair += amount;
          totalHrs += hrs;
          return { ...e, amount, hrs };
        });
        
        return { 
          label: `Bulan ${MONTHS[g.monthIdx] || ""} ${g.year}`, 
          entries: withCalc, 
          totalRp, 
          totalCair, 
          totalHrs 
        };
      });
  }, [data]);

  const gajiTambahanBreakdown = useMemo(() => {
    const map = {};
    
    if (Array.isArray(data?.overtimeEntries)) {
      data.overtimeEntries.forEach((item) => {
        if (!item || !item.date || !item.paid) return; 
        
        const d = new Date(item.date + "T00:00:00");
        if (isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!map[key]) map[key] = { lemburTotal: 0, incomes: [] };
        
        const { amount } = computeOvertime(data.overtimeRate || 0, item.jenis, item.totalJam || 0);
        map[key].lemburTotal += amount;
      });
    }

    if (Array.isArray(data?.transactions)) {
      data.transactions.forEach((item) => {
        if (item && item.type === "income" && item.date) {
          const d = new Date(item.date + "T00:00:00");
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!map[key]) map[key] = { lemburTotal: 0, incomes: [] };
          map[key].incomes.push({
            id: item.id,
            name: item.note || "Pemasukan",
            amount: item.amount || 0,
            paid: true
          });
        }
      });
    }

    const finalMap = {};
    for (const [key, val] of Object.entries(map)) {
      const arr = [];
      if (val.lemburTotal > 0) {
        arr.push({ id: `lembur-${key}`, name: "Lembur", amount: val.lemburTotal, paid: true });
      }
      val.incomes.forEach(inc => arr.push(inc));
      finalMap[key] = arr;
    }
    return finalMap;
  }, [data]);

  if (!loaded || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="font-bold tracking-wide animate-pulse text-sm text-lime">Memuat AGR Ledger…</div>
      </div>
    );
  }

  const budgetYearsList = data ? Object.keys(data.budgetYears).sort() : [];

  return (
    <div className="min-h-screen bg-ink text-white font-display">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-display { font-family: system-ui, -apple-system, sans-serif; }
        .tabular { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace; letter-spacing: -0.02em; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .bg-ink { background: #0C0D0F; }
        .bg-surface { background: #141518; }
        .text-lime { color: #C8FF4D; }
        .bg-lime { background: #C8FF4D; }
        .text-teal { color: #5EEAD4; }
        .text-coral { color: #FF7A6B; }
        .bg-coral { background: #FF7A6B; }
        .border-lime { border-color: #C8FF4D; }
        .fill-lime { fill: #C8FF4D; }
        .focus-lime:focus { outline: none; box-shadow: 0 0 0 1.5px #C8FF4D; }
        .cta-shadow { box-shadow: 0 8px 30px -8px rgba(200,255,77,0.5); }
        input[type=checkbox].accent-lime { accent-color: #C8FF4D; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
      `}</style>

      <div className="w-full max-w-md md:max-w-5xl mx-auto px-5 md:px-8 pt-7 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-surface border border-white/10 flex items-center justify-center shrink-0">
            <img 
              src={logoImg} 
              alt="Logo AGR" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[15px] leading-none tracking-tight">AGR Ledger</div>
            <div className="text-[11px] text-white/35 mt-1">Precision Financial Tracking</div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={exportData}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-lime active:scale-90 transition"
              aria-label="Ekspor data"
              title="Ekspor data (backup .json)"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-lime active:scale-90 transition"
              aria-label="Impor data"
              title="Impor data (pulihkan dari backup .json)"
            >
              <Upload size={16} />
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleImportFileChange}
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-black font-medium bg-red-400 border border-red-500 rounded-lg px-4 py-3 shadow-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-black/50 hover:text-black"><X size={15}/></button>
          </div>
        )}

        <TopTabs active={activeTab} onChange={setActiveTab} />

        {activeTab === "home" && (
          <>
            <div className="relative mb-8 md:max-w-md">
              <Search size={14} className="absolute left-0 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari transaksi"
                className="w-full bg-transparent border-b border-white/10 pl-6 pr-2 py-2 text-sm outline-none focus:border-lime placeholder:text-white/25 transition-colors"
              />
            </div>

            <div className="md:grid md:grid-cols-2 md:gap-x-14">
              <div>
                <div className="flex items-center gap-6 mb-9">
                  <div className="relative w-28 h-28 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="#ffffff0F" strokeWidth="10" />
                      <circle
                        cx="60"
                        cy="60"
                        r="52"
                        fill="none"
                        stroke="#C8FF4D"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 52}
                        strokeDashoffset={
                          2 * Math.PI * 52 * (1 - Math.min(1, remainingMonth / Math.max(1, data.monthlyBudget)))
                        }
                        style={{ transition: "stroke-dashoffset 0.5s ease" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Sparkles size={13} className="text-lime mb-1" />
                      <div className="text-[10px] text-white/40 uppercase tracking-wider">Sisa</div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="text-[11px] uppercase tracking-wider text-white/35 font-medium">
                        Budget bulanan tersisa
                      </div>
                      {!isEditingMonthlyBudget ? (
                        <button
                          onClick={() => {
                            setIsEditingMonthlyBudget(true);
                            setTempMonthlyBudget(formatRupiahInput(data.monthlyBudget));
                          }}
                          className="text-[10px] text-lime hover:underline flex items-center gap-1"
                        >
                          <Edit2 size={10} /> Ubah
                        </button>
                      ) : null}
                    </div>

                    {!isEditingMonthlyBudget ? (
                      <div className="font-semibold text-[32px] leading-none tabular tracking-tight mb-2 truncate">
                        {rupiah(remainingMonth)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mb-2">
                        <input
                          autoFocus
                          type="text"
                          inputMode="numeric"
                          value={tempMonthlyBudget}
                          onChange={(e) => setTempMonthlyBudget(formatRupiahInput(e.target.value))}
                          className="w-full bg-white/10 text-sm px-2 py-1 rounded outline-none text-lime font-semibold tabular"
                        />
                        <button
                          onClick={() => {
                            const val = parseRupiahInput(tempMonthlyBudget);
                            if (val > 0) {
                              setData((prev) => ({ ...prev, monthlyBudget: val }));
                            }
                            setIsEditingMonthlyBudget(false);
                          }}
                          className="text-lime hover:scale-110 bg-lime/10 p-1.5 rounded"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    )}

                    <div className="text-[11px] text-white/40 mb-3">
                      Total Limit: <span className="text-white font-medium tabular">{rupiah(data.monthlyBudget)}</span>
                    </div>

                    <div className="flex gap-4">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5">
                          <TrendingUp size={11} className="text-teal" /> Masuk
                        </div>
                        <div className="font-medium text-sm tabular">{rupiah(totals.income)}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5">
                          <TrendingDown size={11} className="text-coral" /> Keluar
                        </div>
                        <div className="font-medium text-sm tabular">{rupiah(totals.expense)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-9 bg-surface border border-white/10 rounded-2xl p-4 md:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-semibold">Aktivitas Bulan Ini</div>
                      <div className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">
                        {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handlePrevMonth}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition"
                        title="Bulan sebelumnya"
                      >
                        <ChevronLeft size={15} />
                      </button>
                      <button
                        onClick={() => setCalendarDate(new Date())}
                        className="text-[10px] text-lime font-medium px-2.5 py-1 rounded-lg bg-lime/10 hover:bg-lime/20 transition"
                        title="Kembali ke bulan ini"
                      >
                        Hari Ini
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition"
                        title="Bulan berikutnya"
                      >
                        <ChevronRight size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] text-white/40 font-medium uppercase">
                    <div>Sen</div>
                    <div>Sel</div>
                    <div>Rab</div>
                    <div>Kam</div>
                    <div>Jum</div>
                    <div>Sab</div>
                    <div className="text-coral">Min</div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5">
                    {calendarGridData.map((item) => {
                      if (item.empty) {
                        return <div key={item.id} className="h-16 md:h-20 rounded-xl bg-transparent" />;
                      }

                      const isToday = item.iso === todayKey();
                      const hasExpense = item.expense > 0;
                      const hasIncome = item.income > 0;

                      return (
                        <div
                          key={item.iso}
                          className={`h-16 md:h-20 rounded-xl p-1.5 flex flex-col justify-between transition border ${
                            isToday ? "border-lime bg-white/[0.06]" : item.isHoliday ? "border-white/5 bg-coral/[0.08]" : "border-white/5 bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-medium ${isToday ? "text-lime font-bold" : item.isHoliday ? "text-coral font-bold" : "text-white/60"}`}>
                              {item.dateNum}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-right overflow-hidden">
                            {hasIncome && (
                              <span className="text-[9.5px] md:text-[10px] text-teal font-medium tabular truncate">
                                +{item.income >= 1000000 ? (item.income / 1000000).toFixed(1) + "JT" : item.income >= 1000 ? Math.round(item.income / 1000) + "RB" : item.income}
                              </span>
                            )}
                            {hasExpense && (
                              <span className="text-[9.5px] md:text-[10px] text-coral font-medium tabular truncate">
                                -{item.expense >= 1000000 ? (item.expense / 1000000).toFixed(1) + "JT" : item.expense >= 1000 ? Math.round(item.expense / 1000) + "RB" : item.expense}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <SectionLabel noMargin>Target Tabungan</SectionLabel>
                  <button
                    onClick={() => setShowAddGoal(true)}
                    className="text-xs text-lime border border-lime/30 rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-lime/5 transition"
                  >
                    <Plus size={12} /> Tambah Target
                  </button>
                </div>
                <div className="mb-9 space-y-4">
                  {(!data.goals || data.goals.length === 0) && (
                    <EmptyRow>Belum ada target tabungan.</EmptyRow>
                  )}
                  {data.goals?.map((goal) => {
                    const isEditing = editingGoalId === goal.id;
                    if (isEditing) {
                      return (
                        <EditGoalCard 
                          key={goal.id} 
                          goal={goal} 
                          onSave={(updated) => updateGoal(goal.id, updated)} 
                          onCancel={() => setEditingGoalId(null)} 
                        />
                      );
                    }
                    return (
                      <div key={goal.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2.5 mb-2">
                          <PiggyBank size={15} className="text-lime shrink-0" />
                          <div className="text-sm font-medium truncate flex-1">{goal.name}</div>
                          <div className="text-[11px] text-white/40 tabular shrink-0">
                            {rupiah(goal.saved)} / {rupiah(goal.target)}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              onClick={() => setTopUpGoal(goal)}
                              className="text-black bg-lime hover:scale-105 p-1 rounded transition mr-1"
                              title="Tambah saldo tabungan"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                            </button>
                            <button
                              onClick={() => setEditingGoalId(goal.id)}
                              className="text-white/30 hover:text-white p-1 transition"
                              title="Edit target"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() =>
                                requestConfirm(
                                  "Hapus Target Tabungan?",
                                  `Target "${goal.name}" akan dihapus permanen.`,
                                  () => deleteGoal(goal.id)
                                )
                              }
                              className="text-white/30 hover:text-coral p-1 transition"
                              title="Hapus target"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="h-[4px] bg-white/10 overflow-hidden rounded-full">
                          <div
                            className="h-full bg-lime transition-all rounded-full"
                            style={{ width: `${Math.min(100, (goal.saved / Math.max(1, goal.target)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionLabel noMargin>Dompet</SectionLabel>
                  <div className="text-[11px] text-white/35 tabular">{rupiah(totals.balance)} total</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-9">
                  {data.wallets.map((w) => {
                    const isEditing = editingWalletId === w.id;
                    const canDeleteWallet = data.wallets.length > 1;
                    return (
                      <div key={w.id} className="pl-3 pr-2 py-3 border-l-2 bg-white/[0.03] rounded-r-xl flex flex-col justify-between group" style={{ borderColor: w.color }}>
                        <div className="flex items-center justify-between mb-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1 w-full">
                              <input
                                autoFocus
                                value={editingWalletName}
                                onChange={(e) => setEditingWalletName(e.target.value)}
                                className="w-full bg-white/10 text-xs px-1.5 py-0.5 rounded outline-none text-white"
                              />
                              <button onClick={() => updateWalletName(w.id, editingWalletName)} className="text-lime hover:scale-110">
                                <Check size={13} />
                              </button>
                            </div>
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingWalletId(w.id);
                                setEditingWalletName(w.name);
                              }}
                              className="text-[11px] text-white/60 hover:text-white truncate cursor-pointer flex items-center gap-1 group/name"
                              title="Klik untuk ubah nama dompet"
                            >
                              <span className="truncate">{w.name}</span>
                              <Edit2 size={10} className="opacity-0 group-hover/name:opacity-100 transition shrink-0" />
                            </div>
                          )}
                          {canDeleteWallet && (
                            <button
                              onClick={() =>
                                requestConfirm(
                                  "Hapus Dompet?",
                                  `Dompet "${w.name}" akan dihapus.`,
                                  () => deleteWallet(w.id)
                                )
                              }
                              className="text-white/0 group-hover:text-white/30 hover:text-coral transition p-0.5"
                              title="Hapus dompet"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <div className="font-medium text-sm tabular">{rupiah(w.balance)}</div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => setShowAddWallet(true)}
                    className="min-h-[72px] flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 active:scale-95 transition border-2 border-dashed border-white/15 rounded-xl"
                  >
                    <Plus size={15} />
                    <span className="text-[10px]">Dompet Baru</span>
                  </button>
                </div>

                <SectionLabel>Pengeluaran per kategori</SectionLabel>
                <div className="mb-9">
                  {categorySpend.filter((c) => c.total > 0).length === 0 && (
                    <EmptyRow>Belum ada pengeluaran tercatat.</EmptyRow>
                  )}
                  {categorySpend
                    .filter((c) => c.total > 0)
                    .map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setFilterCat((prev) => (prev === c.id ? "all" : c.id))}
                        className={`w-full text-left py-2.5 border-b border-white/5 transition ${
                          filterCat === c.id ? "opacity-100" : "opacity-90 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0"
                              style={{ backgroundColor: c.color + "26" }}
                            >
                              {c.emoji}
                            </span>
                            <span style={filterCat === c.id ? { color: c.color } : undefined}>{c.label}</span>
                          </span>
                          <span className="font-medium tabular text-sm">{rupiah(c.total)}</span>
                        </div>
                        <div className="h-[3px] bg-white/8 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${(c.total / maxCat) * 100}%`, backgroundColor: c.color, opacity: filterCat === "all" || filterCat === c.id ? 1 : 0.35 }}
                          />
                        </div>
                      </button>
                    ))}
                </div>

                <div className="flex items-center justify-between mb-1">
                  <SectionLabel noMargin>{filterCat === "all" ? "Transaksi terbaru" : "Difilter"}</SectionLabel>
                  {filterCat !== "all" && (
                    <button onClick={() => setFilterCat("all")} className="text-[11px] text-lime font-medium">
                      Hapus filter
                    </button>
                  )}
                </div>
                <div>
                  {filteredTransactions.length === 0 && (
                    <EmptyRow>
                      {data.transactions.length === 0
                        ? "Belum ada transaksi. Tap tombol di bawah untuk mulai catat."
                        : "Nggak ada transaksi yang cocok."}
                    </EmptyRow>
                  )}
                  {filteredTransactions.slice(0, 20).map((t) => {
                    const cat = CATEGORIES.find((c) => c.id === t.category);
                    const isTransfer = t.type === "transfer";
                    const fromW = data.wallets.find((w) => w.id === t.fromWalletId)?.name || "Dompet";
                    const toW = data.wallets.find((w) => w.id === t.toWalletId)?.name || "Dompet";

                    return (
                      <div key={t.id} className="group flex items-center justify-between py-3 border-b border-white/5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="text-base shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: isTransfer
                                ? "#ffffff11"
                                : t.type === "income"
                                ? "#5EEAD733"
                                : cat?.color
                                ? cat.color + "26"
                                : "#ffffff11",
                            }}
                          >
                            {isTransfer ? (
                              <ArrowRightLeft size={14} className="text-white/70" />
                            ) : t.type === "income" ? (
                              "💰"
                            ) : (
                              cat?.emoji || "✨"
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {t.note || (isTransfer ? "Transfer Saldo" : t.type === "income" ? "Pemasukan" : cat?.label)}
                            </div>
                            <div className="text-[11px] text-white/35 truncate">
                              {formatDateID(t.date)} •{" "}
                              {isTransfer ? `${fromW} ➔ ${toW}` : t.type === "income" ? "Pemasukan" : cat?.label}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div
                            className={`font-medium text-sm tabular mr-1 ${
                              isTransfer ? "text-white/60" : t.type === "income" ? "text-teal" : "text-white"
                            }`}
                          >
                            {isTransfer ? "" : t.type === "income" ? "+" : "-"}
                            {rupiah(t.amount)}
                          </div>
                          <button
                            onClick={() => setEditingTx(t)}
                            className="text-white/0 group-hover:text-white/30 hover:text-white transition p-1"
                            aria-label="Edit transaksi"
                            title="Edit transaksi"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() =>
                              requestConfirm(
                                "Hapus Transaksi?",
                                `Transaksi ini akan dihapus permanen dan saldo dompet disesuaikan kembali.`,
                                () => deleteTransaction(t.id)
                              )
                            }
                            className="text-white/0 group-hover:text-white/30 hover:text-coral active:scale-90 transition p-1"
                            aria-label="Hapus transaksi"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === "budget" && (
          <div>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <SectionLabel noMargin>Tahun Anggaran</SectionLabel>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={addBudgetYear}
                    className="px-3 py-1.5 rounded-lg text-[11px] border border-dashed border-white/30 text-lime hover:bg-lime/10 flex items-center gap-1 transition font-medium"
                  >
                    <Plus size={12} /> Tahun Baru
                  </button>
                  {budgetYearsList.length > 1 && (
                    <>
                      {!isDeleteMode ? (
                        <button
                          onClick={() => {
                            setIsDeleteMode(true);
                            setSelectedYearsToDelete([]);
                          }}
                          className="px-3 py-1.5 rounded-lg text-[11px] border border-white/20 text-white hover:text-white bg-white/[0.06] transition flex items-center gap-1.5 font-medium"
                        >
                          <Trash2 size={12} /> Hapus Tahun
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={selectedYearsToDelete.length === 0}
                            onClick={() =>
                              requestConfirm(
                                "Hapus Tahun?",
                                `Anda yakin ingin menghapus ${selectedYearsToDelete.length} tahun terpilih? Semua data bulan di dalamnya akan hilang permanen.`,
                                executeDeleteSelectedYears
                              )
                            }
                            className="px-3 py-1.5 rounded-lg text-[11px] bg-coral text-black font-bold disabled:opacity-40 transition shadow"
                          >
                            Hapus ({selectedYearsToDelete.length})
                          </button>
                          <button
                            onClick={() => {
                              setIsDeleteMode(false);
                              setSelectedYearsToDelete([]);
                            }}
                            className="px-3 py-1.5 rounded-lg text-[11px] bg-white/20 text-white font-medium transition hover:bg-white/30"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {budgetYearsList.map((y) => {
                  const isSelected = String(data.activeYear) === String(y);
                  const isMarkedForDelete = selectedYearsToDelete.includes(y);

                  return (
                    <button
                      key={y}
                      onClick={() => {
                        if (isDeleteMode) {
                          if (isMarkedForDelete) {
                            setSelectedYearsToDelete(prev => prev.filter(item => item !== y));
                          } else {
                            setSelectedYearsToDelete(prev => [...prev, y]);
                          }
                        } else {
                          setData((prev) => ({ ...prev, activeYear: y }));
                        }
                      }}
                      className={`py-2 rounded-lg text-[11px] font-medium border transition flex items-center justify-center gap-1.5 ${
                        isDeleteMode && isMarkedForDelete
                          ? "bg-coral text-black border-coral font-bold"
                          : isDeleteMode
                          ? "bg-white/10 border-white/25 text-white hover:bg-white/15"
                          : isSelected
                          ? "bg-lime text-black border-lime font-bold"
                          : "border-white/10 text-white/70 hover:text-white bg-white/[0.03]"
                      }`}
                    >
                      {y}
                      {isDeleteMode && (
                        <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${isMarkedForDelete ? "bg-black text-coral font-bold" : "bg-white/20 text-white"}`}>
                          {isMarkedForDelete ? "✓" : "+"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-8 bg-surface border border-white/10 rounded-2xl p-4 md:p-5">
              <div className="text-sm font-semibold mb-1">Tren Saldo Akhir</div>
              <div className="text-[11px] text-white/40 mb-4">Tahun {data.activeYear}</div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={budgetTrendData} margin={{ top: 5, right: 8, left: 12, bottom: 0 }}>
                    <CartesianGrid stroke="#ffffff0d" vertical={false} />
                    <XAxis dataKey="month" stroke="#ffffff35" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      cursor={{ stroke: "#ffffff20" }}
                      contentStyle={{ background: "#1A1B1E", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#ffffff90" }}
                      formatter={(v) => [rupiah(v), "Saldo Akhir"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="saldo"
                      stroke="#C8FF4D"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#C8FF4D", strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0 mb-10">
              <table className="w-full text-xs min-w-[780px]">
                <thead>
                  <tr className="text-white/40 text-left border-b border-white/10">
                    <th className="py-2 pr-3 font-normal">Bulan</th>
                    <th className="py-2 pr-3 font-normal text-right">Saldo Awal</th>
                    <th className="py-2 pr-3 font-normal text-right">Gaji</th>
                    <th className="py-2 pr-3 font-normal text-right">Gaji Tambahan</th>
                    <th className="py-2 pr-3 font-normal text-right">Rutin</th>
                    <th className="py-2 pr-3 font-normal text-right">Cicilan</th>
                    <th className="py-2 pr-3 font-normal text-right">Pengeluaran</th>
                    <th className="py-2 pr-3 font-normal">Keterangan</th>
                    <th className="py-2 pr-3 font-normal text-right">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedMonthsData &&
                    MONTHS.map((m, index) => {
                      const row = resolvedMonthsData[m];
                      const isFirstMonth = index === 0;

                      const currentYearStr = String(data.activeYear);
                      const sortedYears = Object.keys(data.budgetYears).map(Number).sort((a, b) => a - b);
                      const isFirstYear = sortedYears[0] === Number(currentYearStr);

                      return (
                        <tr key={m} className="border-b border-white/5">
                          <td className="py-1.5 pr-3 whitespace-nowrap text-white/70">{m}</td>
                          
                          <td className="py-1.5 pr-3 text-right tabular text-white/70">
                            {isFirstMonth && isFirstYear ? (
                              <input
                                type="text"
                                inputMode="numeric"
                                value={(data.budgetYears[currentYearStr].months[m].saldoAwal || 0) === 0 ? "" : (data.budgetYears[currentYearStr].months[m].saldoAwal || 0).toLocaleString("id-ID")}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/[^0-9]/g, "");
                                  updateBudgetCell(data.activeYear, m, "saldoAwal", Number(raw) || 0);
                                }}
                                placeholder="0"
                                className="w-24 bg-transparent text-right outline-none border-b border-transparent focus:border-lime tabular py-0.5"
                              />
                            ) : (
                              <span className="py-0.5 block">{row.resolvedSaldoAwal.toLocaleString("id-ID")}</span>
                            )}
                          </td>

                          {["gaji", "gajiTambahan", "rutin", "cicilan", "pengeluaran"].map((field) => {
                            const val = row[field] || 0;
                            const displayVal = val === 0 ? "" : val.toLocaleString("id-ID");
                            
                            const isCicilan = field === "cicilan";
                            const isLembur = field === "gajiTambahan";
                            
                            let breakdown = [];
                            let typeLabel = "";
                            
                            if (isCicilan) {
                              breakdown = spaylaterByMonth[`${data.activeYear}-${index}`] || [];
                              typeLabel = "Cicilan";
                            } else if (isLembur) {
                              breakdown = gajiTambahanBreakdown[`${data.activeYear}-${index}`] || [];
                              typeLabel = "Gaji Tambahan";
                            }
                            
                            const hasBreakdown = breakdown.length > 0;

                            return (
                              <td key={field} className="py-1.5 pr-3">
                                <div
                                  className={hasBreakdown ? "relative inline-block" : ""}
                                  onMouseEnter={hasBreakdown ? (e) => showBreakdownTooltip(e, m, breakdown, typeLabel) : undefined}
                                  onMouseLeave={hasBreakdown ? hideBreakdownTooltip : undefined}
                                >
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={displayVal}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9]/g, "");
                                      updateBudgetCell(data.activeYear, m, field, Number(raw) || 0);
                                    }}
                                    placeholder="0"
                                    className={`w-24 bg-transparent text-right outline-none border-b tabular py-0.5 ${
                                      hasBreakdown ? "border-dotted border-lime/50 cursor-help" : "border-transparent focus:border-lime"
                                    }`}
                                  />
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-1.5 pr-3">
                            <input
                              value={row.keterangan || ""}
                              onChange={(e) => updateBudgetCell(data.activeYear, m, "keterangan", e.target.value)}
                              placeholder="-"
                              className="w-28 bg-transparent outline-none border-b border-transparent focus:border-lime py-0.5"
                            />
                          </td>
                          <td className={`py-1.5 pr-3 text-right tabular font-medium ${row.resolvedSaldoAkhir < 0 ? "text-coral" : "text-lime"}`}>
                            {rupiah(row.resolvedSaldoAkhir)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="pt-8 border-t border-white/10">
              <div className="flex items-center justify-between mb-6">
                <SectionLabel noMargin>Tracker Cicilan SPayLater</SectionLabel>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSpaylaterHistory(true)}
                    className="text-xs text-white/70 border border-white/20 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-white/5 transition"
                  >
                    <History size={13} /> Lihat Riwayat Selesai
                  </button>
                  <button
                    onClick={() => setShowAddSpaylater(true)}
                    className="text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"
                  >
                    <Plus size={13} /> Catat Cicilan
                  </button>
                </div>
              </div>

              {(!data.spaylater || data.spaylater.filter(i => !i.isFinished).length === 0) && (
                <EmptyRow>Belum ada tagihan SPayLater aktif. Keuangan aman!</EmptyRow>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.spaylater?.filter(item => !item.isFinished).map((item) => {
                  const monthlyPayment = item.totalAmount / item.tenor;
                  const paidMonthsCount = item.paidChecklist.filter(Boolean).length;
                  const remainingMonths = item.tenor - paidMonthsCount;

                  return (
                    <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 transition">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-semibold text-sm">{item.name}</div>
                          </div>
                          <div className="text-[11px] text-white/40 tabular">Total Pembelanjaan: {rupiah(item.totalAmount)}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleSpaylaterFinished(item.id)}
                            className="text-[10px] px-2.5 py-1 rounded-lg border bg-lime/10 border-lime/30 text-lime hover:bg-lime/20 transition"
                            title="Tandai selesai"
                          >
                            Finish
                          </button>
                          <button
                            onClick={() =>
                              requestConfirm(
                                "Hapus Cicilan?",
                                `Cicilan "${item.name}" akan dihapus dan seluruh tagihan bulanannya dikembalikan/dikurangi dari budget bulan-bulan terkait.`,
                                () => deleteSpaylater(item.id)
                              )
                            }
                            className="text-white/20 hover:text-coral transition p-1"
                            aria-label="Hapus cicilan"
                            title="Hapus dan kembalikan saldo budget"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-end mb-5 border-b border-white/5 pb-4">
                        <div>
                          <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Tagihan Per Bulan</div>
                          <div className="font-medium text-lime text-base tabular">{rupiah(monthlyPayment)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-white/50">{remainingMonths} bulan lagi lunas</div>
                        </div>
                      </div>

                      <div className="text-[11px] text-white/40 mb-2">Checklist Pembayaran:</div>
                      <div className="flex flex-wrap gap-2">
                        {item.paidChecklist.map((isPaid, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleSpaylaterPaid(item.id, idx)}
                            className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium transition ${
                              isPaid
                                ? "bg-lime text-black font-bold"
                                : "bg-white/5 border border-white/10 text-white/40 hover:border-lime/50"
                            }`}
                          >
                            {idx + 1}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {activeTab === "wishlist" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <SectionLabel noMargin>Total sisa keperluan</SectionLabel>
                <div className="font-semibold text-lime tabular mt-1">{rupiah(wishlistTotal)}</div>
              </div>
              <div className="flex bg-white/[0.04] p-1 rounded-lg">
                <button onClick={() => setWishlistFilter('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition ${wishlistFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Semua</button>
                <button onClick={() => setWishlistFilter('active')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition ${wishlistFilter === 'active' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Belum</button>
                <button onClick={() => setWishlistFilter('bought')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition ${wishlistFilter === 'bought' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>Sudah</button>
              </div>
            </div>

            <button
              onClick={() => setShowAddCategory(true)}
              className="mb-7 text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"
            >
              <Plus size={13} /> Kategori Baru
            </button>

            {data.wishlistCategories.length === 0 && (
              <EmptyRow>Belum ada wishlist. Tambah kategori dulu, mis. "Simulator Rig Racing".</EmptyRow>
            )}

            {data.wishlistCategories.map((cat) => {
              const catTotal = cat.items.filter((i) => !i.bought).reduce((s, i) => s + i.price, 0);
              const filteredItems = cat.items.filter(i => {
                if(wishlistFilter === 'active') return !i.bought;
                if(wishlistFilter === 'bought') return i.bought;
                return true;
              });

              if (wishlistFilter !== 'all' && filteredItems.length === 0) return null;

              return (
                <div key={cat.id} className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-semibold text-sm">{cat.name}</div>
                    <div className="flex items-center gap-3">
                      <div className="text-[11px] text-white/40 tabular">{rupiah(catTotal)}</div>
                      <button
                        onClick={() =>
                          requestConfirm(
                            "Hapus Kategori?",
                            `Kategori "${cat.name}" beserta ${cat.items.length} barang di dalamnya akan dihapus permanen.`,
                            () => deleteWishlistCategory(cat.id)
                          )
                        }
                        className="text-white/20 hover:text-coral transition"
                        aria-label="Hapus kategori"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {filteredItems.length === 0 && wishlistFilter === 'all' && <EmptyRow>Belum ada barang.</EmptyRow>}
                  {filteredItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2.5 border-b border-white/5">
                      <input
                        type="checkbox"
                        checked={item.bought}
                        onChange={() => toggleWishlistBought(cat.id, item.id)}
                        className="accent-lime shrink-0 w-4 h-4"
                      />
                      <div className={`flex-1 text-sm min-w-0 truncate ${item.bought ? "line-through text-white/30" : ""}`}>
                        {item.name}
                      </div>
                      <div className={`text-sm tabular shrink-0 ${item.bought ? "text-white/30" : ""}`}>
                        {rupiah(item.price)}
                      </div>
                      <button
                        onClick={() =>
                          requestConfirm(
                            "Hapus Barang?",
                            `"${item.name}" akan dihapus dari wishlist.`,
                            () => deleteWishlistItem(cat.id, item.id)
                          )
                        }
                        className="text-white/15 hover:text-coral transition shrink-0"
                        aria-label="Hapus barang"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setAddItemCategory(cat.id);
                      setShowAddItem(true);
                    }}
                    className="mt-2.5 text-[11px] text-white/40 hover:text-lime flex items-center gap-1 transition"
                  >
                    <Plus size={11} /> Tambah barang
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "lembur" && (
          <div>
            <SectionLabel>Pengaturan Lembur</SectionLabel>
            <div className="mb-7 flex items-center gap-3 bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3.5">
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white/40 mb-1">Gaji Pokok Bulanan</div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatRupiahInput(data.overtimeRate)}
                  onChange={(e) => updateOvertimeRate(parseRupiahInput(e.target.value))}
                  className="w-full bg-transparent outline-none border-b border-white/10 focus:border-lime pb-1 text-sm font-medium tabular"
                />
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-white/40 mb-1">Rate / Jam</div>
                <div className="font-semibold text-lime tabular text-sm">
                  {rupiah(Number(data.overtimeRate || 0) / 173)}
                </div>
              </div>
            </div>

            <div className="mb-7 text-xs border border-white/10 rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-white/10">
                <div className="p-3.5">
                  <div className="text-white/40 mb-2 uppercase tracking-wider text-[10px]">Hari Kerja</div>
                  <div className="flex justify-between text-white/70 mb-1"><span>1 jam</span><span>x1.5</span></div>
                  <div className="flex justify-between text-white/70"><span>2 dst.</span><span>x2</span></div>
                </div>
                <div className="p-3.5">
                  <div className="text-white/40 mb-2 uppercase tracking-wider text-[10px]">Hari Libur</div>
                  <div className="flex justify-between text-white/70 mb-1"><span>1-8 jam</span><span>x2</span></div>
                  <div className="flex justify-between text-white/70 mb-1"><span>9 jam</span><span>x3</span></div>
                  <div className="flex justify-between text-white/70"><span>10 dst.</span><span>x4</span></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowAddOvertime(true)}
              className="mb-7 text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"
            >
              <Plus size={13} /> Catat Lembur
            </button>

            {(!groupedOvertime || groupedOvertime.length === 0) && <EmptyRow>Belum ada catatan lembur.</EmptyRow>}

            {groupedOvertime?.map((g) => (
              <div key={g.label} className="mb-8">
                <div className="text-sm font-semibold mb-2.5">{g.label}</div>
                <div className="overflow-x-auto no-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
                  <table className="w-full text-xs min-w-[600px]">
                    <thead>
                      <tr className="text-white/40 text-left border-b border-white/10">
                        <th className="py-2 pr-2 font-normal">✓</th>
                        <th className="py-2 pr-2 font-normal">Jenis</th>
                        <th className="py-2 pr-2 font-normal">Tanggal</th>
                        <th className="py-2 pr-2 font-normal text-right">Jam</th>
                        <th className="py-2 pr-2 font-normal text-right">Nominal</th>
                        <th className="py-2 pr-2 font-normal text-right">Jam Terhitung</th>
                        <th className="py-2 pl-1 font-normal"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.entries?.map((e) => (
                        <tr key={e.id} className="border-b border-white/5">
                          <td className="py-2 pr-2">
                            <input
                              type="checkbox"
                              checked={e.paid}
                              onChange={() => toggleOvertimePaid(e.id)}
                              className="accent-lime w-4 h-4 cursor-pointer"
                              title="Tandai jika sudah dibayar"
                            />
                          </td>
                          <td className={`py-2 pr-2 ${e.jenis === "Libur" ? "text-coral" : "text-white/80"} ${!e.paid && "opacity-50"}`}>{e.jenis}</td>
                          <td className={`py-2 pr-2 tabular whitespace-nowrap ${e.paid ? "text-white/70" : "text-white/30"}`}>{formatDateID(e.date)}</td>
                          <td className={`py-2 pr-2 text-right tabular ${!e.paid && "opacity-50"}`}>{e.totalJam}</td>
                          <td className="py-2 pr-2 text-right tabular">
                            <span className={e.paid ? "text-white" : "text-white/40"}>{rupiah(e.amount)}</span>
                          </td>
                          <td className={`py-2 pr-2 text-right tabular ${!e.paid && "opacity-50"}`}>{e.hrs}</td>
                          <td className="py-2 pl-1 text-right">
                            <button
                              onClick={() =>
                                requestConfirm(
                                  "Hapus Catatan Lembur?",
                                  `Catatan lembur tanggal ${formatDateID(e.date)} (${e.totalJam} jam) akan dihapus${e.paid ? " dan Gaji Tambahan bulan terkait disesuaikan kembali" : ""}.`,
                                  () => deleteOvertimeEntry(e.id)
                                )
                              }
                              className="text-white/20 hover:text-coral transition"
                              aria-label="Hapus catatan lembur"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td colSpan={4} className="py-2 pr-2 pt-3">Total</td>
                        <td className="py-2 pr-2 pt-3 text-right tabular">
                          <div className="text-lime">{rupiah(g.totalCair)}</div>
                          {g.totalRp !== g.totalCair && (
                            <div className="text-[9px] text-white/40 font-medium tracking-wide">dari {rupiah(g.totalRp)}</div>
                          )}
                        </td>
                        <td className="py-2 pr-2 pt-3 text-right tabular">{g.totalHrs}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {activeTab === "home" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5">
          <button
            onClick={() => {
              setAddType("expense");
              setShowAdd(true);
            }}
            className="bg-lime text-black font-semibold rounded-full px-6 py-3.5 flex items-center gap-2 cta-shadow active:scale-95 transition"
          >
            <Plus size={17} strokeWidth={2.5} /> Catat Transaksi
          </button>
        </div>
      )}
      {activeTab === "lembur" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5">
          <button
            onClick={() => setShowAddOvertime(true)}
            className="bg-lime text-black font-semibold rounded-full px-6 py-3.5 flex items-center gap-2 cta-shadow active:scale-95 transition"
          >
            <Plus size={17} strokeWidth={2.5} /> Catat Lembur
          </button>
        </div>
      )}

      {showSpaylaterHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md bg-surface rounded-2xl p-6 border border-white/10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-base flex items-center gap-2">
                <History size={16} className="text-lime" /> Riwayat Cicilan Selesai
              </div>
              <button onClick={() => setShowSpaylaterHistory(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto no-scrollbar flex-1 pr-1">
              {data.spaylater?.filter(item => item.isFinished).length === 0 ? (
                <div className="text-xs text-white/40 text-center py-8">Riwayat kosong</div>
              ) : (
                data.spaylater?.filter(item => item.isFinished).map((item) => (
                  <div key={item.id} className="bg-white/[0.03] border border-lime/30 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-semibold text-sm text-white truncate">{item.name}</div>
                        <span className="text-[10px] bg-lime/10 text-lime px-2 py-0.5 rounded-full font-medium shrink-0">Lunas</span>
                      </div>
                      <div className="text-[11px] text-white/40">Mulai: {formatDateID(item.purchaseDate)} • Tenor: {item.tenor} Bln</div>
                      <div className="text-xs font-medium text-lime tabular mt-1">{rupiah(item.totalAmount)}</div>
                    </div>
                    <button
                      onClick={() =>
                        requestConfirm(
                          "Hapus Riwayat Cicilan?",
                          `Riwayat cicilan "${item.name}" akan dihapus permanen.`,
                          () => deleteSpaylater(item.id)
                        )
                      }
                      className="text-white/30 hover:text-coral transition p-2 shrink-0"
                      title="Hapus riwayat"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowSpaylaterHistory(false)}
              className="mt-4 w-full bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg py-3 text-xs transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {breakdownTooltip && (
        <div
          className="fixed z-50 w-64 bg-surface border border-white/15 rounded-lg shadow-2xl p-3 text-left pointer-events-none"
          style={{ left: breakdownTooltip.left, top: breakdownTooltip.top }}
        >
          <div className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
            Rincian {breakdownTooltip.typeLabel} {breakdownTooltip.label}
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
            {breakdownTooltip.breakdown.map((b, idx) => (
              <div key={b.id || idx} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-white/70 truncate">
                  {b.name}
                  {b.installment ? <span className="text-white/30 ml-1">({b.installment}/{b.tenor})</span> : null}
                </span>
                <span className={`tabular shrink-0 ${b.paid ? "text-lime" : "text-white/60"}`}>
                  {rupiah(b.amount)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold mt-2 pt-2 border-t border-white/10">
            <span>Total</span>
            <span className="tabular text-lime">
              {rupiah(breakdownTooltip.breakdown.reduce((s, b) => s + b.amount, 0))}
            </span>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-sm bg-surface rounded-2xl p-6 border border-white/10">
            <div className="font-semibold text-base mb-2">{confirmAction.title}</div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg py-3 text-xs transition"
              >
                Batal
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 bg-coral text-black font-bold rounded-lg py-3 text-xs transition hover:opacity-90"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {topUpGoal && (
        <TopUpGoalSheet
          goal={topUpGoal}
          onClose={() => setTopUpGoal(null)}
          onSubmit={(amount) => {
            updateGoal(topUpGoal.id, { saved: topUpGoal.saved + amount });
            setTopUpGoal(null);
          }}
        />
      )}

      {showAdd && (
        <TransactionSheet
          wallets={data.wallets}
          title="Catat Transaksi"
          defaultType={addType}
          onClose={() => setShowAdd(false)}
          onSubmit={(payload) => {
            addTransaction(payload);
            setShowAdd(false);
          }}
        />
      )}

      {editingTx && (
        <TransactionSheet
          wallets={data.wallets}
          title="Edit Transaksi"
          initialData={editingTx}
          onClose={() => setEditingTx(null)}
          onSubmit={(payload) => {
            updateTransaction(editingTx.id, payload);
            setEditingTx(null);
          }}
        />
      )}

      {showAddGoal && (
        <AddGoalSheet
          onClose={() => setShowAddGoal(false)}
          onSubmit={(payload) => {
            addGoal(payload);
            setShowAddGoal(false);
          }}
        />
      )}

      {showAddWallet && (
        <AddWalletSheet
          onClose={() => setShowAddWallet(false)}
          onSubmit={(name) => {
            addWallet(name);
            setShowAddWallet(false);
          }}
        />
      )}

      {showAddCategory && (
        <SingleFieldSheet
          title="Kategori Wishlist Baru"
          label="Nama kategori"
          placeholder="mis. Simulator Rig Racing"
          submitLabel="Tambah Kategori"
          onClose={() => setShowAddCategory(false)}
          onSubmit={(name) => {
            addWishlistCategory(name);
            setShowAddCategory(false);
          }}
        />
      )}

      {showAddItem && (
        <AddWishlistItemSheet
          onClose={() => {
            setShowAddItem(false);
            setAddItemCategory(null);
          }}
          onSubmit={({ name, price }) => {
            addWishlistItem(addItemCategory, { name, price });
            setShowAddItem(false);
            setAddItemCategory(null);
          }}
        />
      )}

      {showAddOvertime && (
        <AddOvertimeSheet
          onClose={() => setShowAddOvertime(false)}
          onSubmit={(payload) => {
            addOvertimeEntry(payload);
            setShowAddOvertime(false);
          }}
        />
      )}

      {showAddSpaylater && (
        <AddSpaylaterSheet
          onClose={() => setShowAddSpaylater(false)}
          onSubmit={(payload) => {
            addSpaylater(payload);
            setShowAddSpaylater(false);
          }}
        />
      )}
    </div>
  );
}

function TopUpGoalSheet({ goal, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const canSubmit = parseRupiahInput(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Nabung: {goal.name}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <div className="text-[11px] text-white/40 mb-1">Terkumpul saat ini: {rupiah(goal.saved)}</div>
        
        <label className="text-[11px] text-white/40 font-medium">Nominal ditabung (Rp)</label>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(formatRupiahInput(e.target.value))}
          placeholder="0"
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-xl font-medium tabular outline-none focus-lime"
          autoFocus
        />

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit(parseRupiahInput(amount))}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Tambah ke Tabungan <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function AddSpaylaterSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [tenor, setTenor] = useState("3");
  
  const today = new Date();
  const defaultDate = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const [purchaseDate, setPurchaseDate] = useState(defaultDate);

  const canSubmit = name.trim() && parseRupiahInput(totalAmount) > 0 && Number(tenor) > 0 && purchaseDate;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Cicilan SPayLater</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama Barang / Pembelanjaan</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Checkout Shopee"
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <label className="text-[11px] text-white/40 font-medium">Tanggal Pembelian</label>
        <input
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime"
        />

        <label className="text-[11px] text-white/40 font-medium">Total Harga / Hutang (Rp)</label>
        <input
          type="text"
          inputMode="numeric"
          value={totalAmount}
          onChange={(e) => setTotalAmount(formatRupiahInput(e.target.value))}
          placeholder="0"
          className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-5 text-xl font-medium tabular outline-none focus:border-lime"
        />

        <label className="text-[11px] text-white/40 font-medium">Pilih Tenor (Bulan)</label>
        <div className="flex gap-2 mt-1.5 mb-6 overflow-x-auto no-scrollbar">
          {["3", "6", "12", "24"].map((t) => (
            <button
              key={t}
              onClick={() => setTenor(t)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                tenor === t
                  ? "bg-lime text-black border-lime"
                  : "bg-white/[0.03] border-white/10 text-white/70"
              }`}
            >
              {t} Bln
            </button>
          ))}
        </div>

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name: name.trim(), totalAmount: parseRupiahInput(totalAmount), tenor: Number(tenor), purchaseDate })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Simpan Cicilan
        </button>
      </div>
    </div>
  );
}

function TransactionSheet({ wallets, title, defaultType, initialData, onClose, onSubmit }) {
  const [type, setType] = useState(initialData?.type || defaultType || "expense");
  const [amount, setAmount] = useState(initialData ? formatRupiahInput(initialData.amount) : "");
  const [category, setCategory] = useState(initialData?.category || CATEGORIES[0].id);
  const [note, setNote] = useState(initialData?.note || "");
  const [walletId, setWalletId] = useState(initialData?.walletId || wallets[0]?.id);
  const [fromWalletId, setFromWalletId] = useState(initialData?.fromWalletId || wallets[0]?.id);
  const [toWalletId, setToWalletId] = useState(initialData?.toWalletId || (wallets.length > 1 ? wallets[1].id : wallets[0]?.id));
  const [date, setDate] = useState(initialData?.date || todayKey());

  const canSubmit = parseRupiahInput(amount) > 0 && date &&
    (type === "transfer" ? (fromWalletId && toWalletId && fromWalletId !== toWalletId) : walletId);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <div className="flex bg-white/[0.04] rounded-lg p-1 mb-5">
          {["expense", "income", "transfer"].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-md text-[13px] font-medium transition ${
                type === t ? "bg-lime text-black" : "text-white/50 hover:text-white/80"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : t === "income" ? "Pemasukan" : "Transfer"}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tanggal Transaksi</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime text-white"
        />

        <label className="text-[11px] text-white/40 font-medium">Jumlah</label>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(formatRupiahInput(e.target.value))}
          placeholder="0"
          className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-5 text-xl font-medium tabular outline-none focus:border-lime"
        />

        {type === "expense" && (
          <>
            <label className="text-[11px] text-white/40 font-medium">Kategori</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5 mb-5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className="rounded-lg px-2 py-2.5 text-xs font-medium border transition"
                  style={
                    category === c.id
                      ? { backgroundColor: c.color, borderColor: c.color, color: "#0C0D0F" }
                      : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }
                  }
                >
                  <div className="text-base mb-0.5">{c.emoji}</div>
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        {type === "transfer" ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label className="text-[11px] text-white/40 font-medium">Dari Dompet</label>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setFromWalletId(w.id)}
                      className={`truncate rounded-lg px-3 py-2.5 text-xs font-medium border transition ${
                        fromWalletId === w.id
                          ? "bg-lime text-black border-lime"
                          : "bg-white/[0.03] border-white/10 text-white/70"
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-white/40 font-medium">Ke Dompet</label>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setToWalletId(w.id)}
                      className={`truncate rounded-lg px-3 py-2.5 text-xs font-medium border transition ${
                        toWalletId === w.id
                          ? "bg-lime text-black border-lime"
                          : "bg-white/[0.03] border-white/10 text-white/70"
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <label className="text-[11px] text-white/40 font-medium">Dompet</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5 mb-5">
              {wallets.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setWalletId(w.id)}
                  className={`truncate rounded-lg px-3 py-2 text-xs font-medium border transition ${
                    walletId === w.id
                      ? "bg-lime text-black border-lime"
                      : "bg-white/[0.03] border-white/10 text-white/70"
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="text-[11px] text-white/40 font-medium">Catatan (opsional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={type === "transfer" ? "mis. mindahin tabungan" : "mis. makan siang"}
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ amount: parseRupiahInput(amount), category, note, walletId, fromWalletId, toWalletId, type, date })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Simpan <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function AddWalletSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Dompet</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama dompet</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Rekening BCA, E-wallet"
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <button
          disabled={!name.trim()}
          onClick={() => onSubmit(name.trim())}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Tambah Dompet <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function SingleFieldSheet({ title, label, placeholder, submitLabel, onClose, onSubmit }) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">{label}</label>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <button
          disabled={!value.trim()}
          onClick={() => onSubmit(value.trim())}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          {submitLabel} <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function AddWishlistItemSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const canSubmit = name.trim() && parseRupiahInput(price) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Barang</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama barang</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. MOZA Racing HGP Shifter"
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <label className="text-[11px] text-white/40 font-medium">Harga</label>
        <input
          type="text"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(formatRupiahInput(e.target.value))}
          placeholder="0"
          className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-6 text-xl font-medium tabular outline-none focus:border-lime"
        />

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name: name.trim(), price: parseRupiahInput(price) })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Tambah Barang <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function AddOvertimeSheet({ onClose, onSubmit }) {
  const [date, setDate] = useState(todayKey());
  const [jenis, setJenis] = useState("Biasa");
  const [totalJam, setTotalJam] = useState("");
  const [paid, setPaid] = useState(true);

  const canSubmit = Number(totalJam) > 0 && !!date;
  const { hrs } = computeOvertime(0, jenis, Number(totalJam) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Catat Lembur</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tanggal</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime"
        />

        <label className="text-[11px] text-white/40 font-medium">Jenis</label>
        <div className="flex bg-white/[0.04] rounded-lg p-1 mt-1.5 mb-5">
          {["Biasa", "Libur"].map((j) => (
            <button
              key={j}
              onClick={() => setJenis(j)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                jenis === j ? "bg-lime text-black" : "text-white/50"
              }`}
            >
              {j}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Total jam</label>
        <input
          type="number"
          inputMode="numeric"
          value={totalJam}
          onChange={(e) => setTotalJam(e.target.value)}
          placeholder="0"
          className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-2 text-xl font-medium tabular outline-none focus:border-lime"
        />
        {Number(totalJam) > 0 && (
          <div className="text-[11px] text-white/40 mb-5 tabular">≈ {hrs} jam terhitung</div>
        )}

        <label className="flex items-center gap-2.5 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="accent-lime w-4 h-4"
          />
          <span className="text-sm text-white/70">Sudah dibayar</span>
        </label>

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ date, jenis, totalJam: Number(totalJam), paid })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Simpan <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function AddGoalSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");

  const canSubmit = name.trim() && parseRupiahInput(target) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Target Tabungan</div>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={19} />
          </button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama Target</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Dana Darurat / Beli Moza R9"
          className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime placeholder:text-white/25"
        />

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="text-[11px] text-white/40 font-medium">Target (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(formatRupiahInput(e.target.value))}
              placeholder="0"
              className="w-full bg-white/[0.04] rounded-lg px-3 py-3 mt-1.5 text-sm font-medium tabular outline-none focus-lime"
            />
          </div>
          <div>
            <label className="text-[11px] text-white/40 font-medium">Terkumpul (Rp)</label>
            <input
              type="text"
              inputMode="numeric"
              value={saved}
              onChange={(e) => setSaved(formatRupiahInput(e.target.value))}
              placeholder="0"
              className="w-full bg-white/[0.04] rounded-lg px-3 py-3 mt-1.5 text-sm font-medium tabular outline-none focus-lime"
            />
          </div>
        </div>

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name: name.trim(), target: parseRupiahInput(target), saved: parseRupiahInput(saved) })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5 transition"
        >
          Simpan Target <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

function EditGoalCard({ goal, onSave, onCancel }) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(formatRupiahInput(goal.target));
  const [saved, setSaved] = useState(formatRupiahInput(goal.saved));

  return (
    <div className="bg-surface border border-lime/40 rounded-xl p-4">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-lime">Edit Target Tabungan</span>
        <button onClick={onCancel} className="text-white/40 hover:text-white">
          <X size={15} />
        </button>
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-white/10 rounded px-2.5 py-2 text-xs mb-3 outline-none text-white"
        placeholder="Nama target"
      />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-white/40">Target (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(formatRupiahInput(e.target.value))}
            className="w-full bg-white/10 rounded px-2 py-1.5 text-xs outline-none text-white tabular"
          />
        </div>
        <div>
          <label className="text-[10px] text-white/40">Terkumpul (Rp)</label>
          <input
            type="text"
            inputMode="numeric"
            value={saved}
            onChange={(e) => setSaved(formatRupiahInput(e.target.value))}
            className="w-full bg-white/10 rounded px-2 py-1.5 text-xs outline-none text-white tabular"
          />
        </div>
      </div>
      <button
        onClick={() => onSave({ name: name.trim(), target: parseRupiahInput(target), saved: parseRupiahInput(saved) })}
        className="w-full bg-lime text-black font-semibold rounded py-2 text-xs flex items-center justify-center gap-1"
      >
        <Check size={14} /> Simpan Perubahan
      </button>
    </div>
  );
}