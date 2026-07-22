import { supabase } from "./lib/supabaseClient";
import React, { useState, useEffect, useMemo, useRef } from "react";
import logoImg from "./assets/logo.png";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  RotateCcw,
  Filter,
  ListChecks,
  AlertCircle,
  ExternalLink,
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

const PRIORITIES = [
  { id: "high", label: "Tinggi", color: "#FF7A6B" },
  { id: "medium", label: "Sedang", color: "#FFB84D" },
  { id: "low", label: "Rendah", color: "#7CE3FF" },
];

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TAB_ORDER = ["home", "budget", "tasks", "wishlist", "lembur"];

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
      { saldoAwal: 0, gaji: inheritedGaji, keterangan: "" },
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
  routineEntries: [],
  tasks: [],
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

  if (!merged.wishlistCategories) merged.wishlistCategories = [];
  else {
    merged.wishlistCategories = merged.wishlistCategories.map(cat => ({
      ...cat,
      items: Array.isArray(cat.items) ? cat.items.map(i => ({ ...i, link: i.link || "" })) : []
    }));
  }

  if (typeof merged.overtimeRate !== "number") merged.overtimeRate = seed.overtimeRate;
  if (!Array.isArray(merged.overtimeEntries)) merged.overtimeEntries = [];
  if (!Array.isArray(merged.spaylater)) merged.spaylater = [];
  if (!Array.isArray(merged.routineEntries)) merged.routineEntries = [];
  if (!Array.isArray(merged.tasks)) merged.tasks = [];

  merged.tasks = merged.tasks.map(t => ({
    id: t.id || crypto.randomUUID(),
    title: t.title || "Tugas",
    description: t.description || "",
    priority: t.priority || "medium",
    dueDate: t.dueDate || "",
    done: !!t.done,
    createdAt: t.createdAt || Date.now(),
    subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(s => ({
      id: s.id || crypto.randomUUID(),
      text: s.text || "",
      done: !!s.done,
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
    { id: "tasks", label: "Tugas", icon: ListChecks },
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

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const ignoreSwipeRef = useRef(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("expense");
  const [editingTx, setEditingTx] = useState(null);
  const [error, setError] = useState("");
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [wishlistFilter, setWishlistFilter] = useState("all");
  const [txEditListMode, setTxEditListMode] = useState(false);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemCategory, setAddItemCategory] = useState(null);
  const [expandedWishlistId, setExpandedWishlistId] = useState(null);

  const [showAddOvertime, setShowAddOvertime] = useState(false);
  const [editingOvertime, setEditingOvertime] = useState(null);
  const [showAddSpaylater, setShowAddSpaylater] = useState(false);

  const [showAddRoutine, setShowAddRoutine] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [routineEditListMode, setRoutineEditListMode] = useState(false);
  const [routineStopTarget, setRoutineStopTarget] = useState(null);
  const [isRoutineCollapsed, setIsRoutineCollapsed] = useState(false);

  const [spaySearch, setSpaySearch] = useState("");
  const [spaySort, setSpaySort] = useState("default");

  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState("active");
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [topUpGoal, setTopUpGoal] = useState(null);

  const [isEditingMonthlyBudget, setIsEditingMonthlyBudget] = useState(false);
  const [tempMonthlyBudget, setTempMonthlyBudget] = useState("");

  const [editingWalletId, setEditingWalletId] = useState(null);
  const [editingWalletName, setEditingWalletName] = useState("");

  const [editingBalanceId, setEditingBalanceId] = useState(null);
  const [editingBalanceValue, setEditingBalanceValue] = useState("");

  const [calendarDate, setCalendarDate] = useState(new Date());

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedYearsToDelete, setSelectedYearsToDelete] = useState([]);

  const [confirmAction, setConfirmAction] = useState(null);
  const importInputRef = useRef(null);
  const [activePopup, setActivePopup] = useState(null);
  const [showSpaylaterHistory, setShowSpaylaterHistory] = useState(false);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    ignoreSwipeRef.current = !!e.target.closest(".swipe-ignore");
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;

    if (ignoreSwipeRef.current) return;

    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;

    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (dx < 0 && currentIndex < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    } else if (dx > 0 && currentIndex > 0) {
      setActiveTab(TAB_ORDER[currentIndex - 1]);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const { data: row, error } = await supabase
          .from("ledger_data")
          .select("data")
          .eq("id", 1)
          .single();
        if (error) throw error;
        setData(row?.data && Object.keys(row.data).length ? migrateData(row.data) : seedData());
      } catch {
        setData(seedData());
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    setActivePopup(null);
  }, [activeTab]);

  useEffect(() => {
    const handleScroll = () => {
      if (activePopup) setActivePopup(null);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activePopup]);

  useEffect(() => {
    if (!loaded || !data) return;
    const timeout = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("ledger_data")
          .upsert({ id: 1, data, updated_at: new Date().toISOString() });
        if (error) throw error;
      } catch (err) {
        showError("Gagal menyimpan data ke server.");
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [data, loaded]);

  function showError(msg) {
    setError(msg);
    setTimeout(() => setError(""), 6000);
  }

  function handleTogglePopup(e, monthLabel, breakdown, typeLabel) {
    e.stopPropagation();
    if (activePopup && activePopup.label === monthLabel && activePopup.typeLabel === typeLabel) {
      setActivePopup(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 288;
    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    
    let top = rect.bottom + 8;
    if (window.innerHeight - top < 250) {
      top = Math.max(12, rect.top - Math.min(300, window.innerHeight / 2) - 8);
    }
    
    setActivePopup({ left, top, label: monthLabel, breakdown, typeLabel });
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
        showError("File JSON rusak atau tidak valid.");
      }
    };
    reader.onerror = () => showError("Gagal membaca file.");
    reader.readAsText(file);
  }

  function handleImportFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      requestConfirm("Timpa Data?", "Mengimpor file ini akan mengganti seluruh data Ledger saat ini.", () => importDataFromFile(file));
    }
    e.target.value = "";
  }

  function adjustWalletBalance(id, newBalance) {
    setData((prev) => ({
      ...prev,
      wallets: prev.wallets.map((w) =>
        w.id === id ? { ...w, balance: newBalance } : w
      ),
    }));
  }

  function addTask({ title, description, priority, dueDate, subtasks }) {
    setData((prev) => ({
      ...prev,
      tasks: [
        {
          id: crypto.randomUUID(),
          title,
          description,
          priority,
          dueDate,
          done: false,
          createdAt: Date.now(),
          subtasks: subtasks.map((s) => ({ id: crypto.randomUUID(), text: s, done: false })),
        },
        ...prev.tasks,
      ],
    }));
  }

  function updateTask(id, updatedData) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...updatedData } : t)),
    }));
  }

  function deleteTask(id) {
    setData((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }

  function toggleTaskDone(id) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    }));
  }

  function toggleSubtask(taskId, subtaskId) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, subtasks: t.subtasks.map((s) => (s.id === subtaskId ? { ...s, done: !s.done } : s)) }
          : t
      ),
    }));
  }

  function addWishlistItem(catId, { name, price, link }) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name, price, link: link || "", bought: false }] } : c
      ),
    }));
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
    return CATEGORIES.map((c) => ({ ...c, total: map[c.id] || 0 })).sort((a, b) => b.total - a.total);
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
      let isHoliday = dayOfWeek === 0;

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
      const matchesSearch = !search || (t.note || "").toLowerCase().includes(search.toLowerCase()) || (cat?.label || "").toLowerCase().includes(search.toLowerCase());
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
          yearMonths[mName] = { ...yearMonths[mName], gaji: value };
        }
      } else {
        yearMonths[month] = { ...yearMonths[month], [field]: value };
      }

      return {
        ...prev,
        budgetYears: {
          ...prev.budgetYears,
          [year]: { ...prev.budgetYears[year], months: yearMonths },
        },
      };
    });
  }

  const spaylaterByMonth = useMemo(() => {
    const map = {};
    for (const item of data?.spaylater || []) {
      if (!item.purchaseDate) continue;
      const d = new Date(item.purchaseDate + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      
      const startMonthIndex = d.getMonth();
      const startYear = d.getFullYear();

      for (let i = 0; i < item.tenor; i++) {
        const absoluteMonthIndex = startMonthIndex + i;
        const targetYear = startYear + Math.floor(absoluteMonthIndex / 12);
        const mIdx = absoluteMonthIndex % 12;

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

  const pengeluaranByMonth = useMemo(() => {
    const map = {};
    for (const t of data?.transactions || []) {
      if (t.type !== "expense" || !t.date) continue;
      const d = new Date(t.date + "T00:00:00");
      if (isNaN(d.getTime())) continue;
      const y = d.getFullYear();
      const mIdx = d.getMonth();
      const key = `${y}-${mIdx}`;
      if (!map[key]) map[key] = [];
      const cat = CATEGORIES.find(c => c.id === t.category);
      map[key].push({
        id: t.id,
        name: t.note || cat?.label || "Pengeluaran",
        amount: t.amount,
      });
    }
    return map;
  }, [data]);

  const gajiTambahanByMonth = useMemo(() => {
    const map = {};
    const rawMap = {};

    if (Array.isArray(data?.transactions)) {
      data.transactions.forEach((item) => {
        if (item && item.type === "income" && item.date) {
          const d = new Date(item.date + "T00:00:00");
          if (isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!rawMap[key]) rawMap[key] = [];
          rawMap[key].push({ id: item.id, name: item.note || "Pemasukan", amount: item.amount || 0 });
        }
      });
    }

    Object.keys(rawMap).forEach(key => {
      map[key] = [];
      rawMap[key].forEach(o => map[key].push(o));
    });

    return map;
  }, [data]);

  const routineByMonth = useMemo(() => {
    const map = {};
    if (Array.isArray(data?.routineEntries)) {
      data.routineEntries.forEach((item) => {
        if (!item) return;
        const startIdx = item.startIndex !== undefined ? Number(item.startIndex) : 0;
        const stopIdx = item.stopIndex !== undefined ? Number(item.stopIndex) : 11;

        for (let mIdx = startIdx; mIdx <= stopIdx; mIdx++) {
          const key = `${item.activeYear}-${mIdx}`;
          if (!map[key]) map[key] = [];
          map[key].push({
            id: item.id,
            name: item.name,
            amount: item.amount,
            activeRange: `${MONTHS[startIdx]} - ${MONTHS[stopIdx]}`,
          });
        }
      });
    }
    return map;
  }, [data]);

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
      const spaylaterList = spaylaterByMonth[`${yearKey}-${idx}`] || [];
      const totalCicilanOtomatis = spaylaterList.reduce((s, i) => s + i.amount, 0);

      const expList = pengeluaranByMonth[`${yearKey}-${idx}`] || [];
      const totalPengeluaranOtomatis = expList.reduce((s, i) => s + i.amount, 0);

      const incList = gajiTambahanByMonth[`${yearKey}-${idx}`] || [];
      const totalGajiTambahanOtomatis = incList.reduce((s, i) => s + i.amount, 0);

      let totalRutinOtomatis = 0;
      if (Array.isArray(data?.routineEntries)) {
        data.routineEntries.forEach((item) => {
          const itemYear = Number(item.activeYear || yearKey);
          if (itemYear === Number(yearKey)) {
            const startIdx = item.startIndex !== undefined ? Number(item.startIndex) : 0;
            const stopIdx = item.stopIndex !== undefined ? Number(item.stopIndex) : 11;
            if (idx >= startIdx && idx <= stopIdx) {
              totalRutinOtomatis += Number(item.amount) || 0;
            }
          }
        });
      }

      const mRow = { 
        ...yearMonths[m], 
        gaji: resolvedGajiList[idx],
        cicilan: totalCicilanOtomatis,
        pengeluaran: totalPengeluaranOtomatis,
        gajiTambahan: totalGajiTambahanOtomatis,
        rutin: totalRutinOtomatis,
      };
      runningBal = computeAkhir(mRow, runningBal);
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
      if (rawGaji[i] > 0) currentVal = rawGaji[i];
      resolved.push(currentVal);
    }
    return resolved;
  }

  function addBudgetYear() {
    setData((prev) => {
      const sortedYears = Object.keys(prev.budgetYears).map(Number).sort((a, b) => a - b);
      const nextYear = sortedYears.length ? Math.max(...sortedYears) + 1 : new Date().getFullYear();
      const latestExistingYear = sortedYears.length ? String(sortedYears[sortedYears.length - 1]) : null;
      
      let inheritedJanSaldo = 0;
      let inheritedGaji = 0;

      if (latestExistingYear) {
        inheritedJanSaldo = computeYearEndBalance(latestExistingYear, prev.budgetYears);
        const latestYearMonths = prev.budgetYears[latestExistingYear].months;
        inheritedGaji = latestYearMonths[MONTHS[MONTHS.length - 1]].gaji || 0;
      }

      const newYearData = emptyYearData(inheritedGaji);
      newYearData.months[MONTHS[0]].saldoAwal = inheritedJanSaldo;

      const newRoutineEntries = [...(prev.routineEntries || [])];
      if (latestExistingYear) {
        const prevRoutines = (prev.routineEntries || []).filter(e => Number(e.activeYear) === Number(latestExistingYear) && Number(e.stopIndex) === 11);
        prevRoutines.forEach(r => {
          const exists = newRoutineEntries.some(e => Number(e.activeYear) === Number(nextYear) && e.name === r.name);
          if (!exists) {
            newRoutineEntries.push({
              id: crypto.randomUUID(),
              name: r.name,
              amount: r.amount,
              activeYear: nextYear,
              startIndex: 0,
              stopIndex: 11,
            });
          }
        });
      }

      return {
        ...prev,
        budgetYears: { ...prev.budgetYears, [nextYear]: newYearData },
        activeYear: nextYear,
        routineEntries: newRoutineEntries,
      };
    });
  }

  function executeDeleteSelectedYears() {
    setData((prev) => {
      const allYears = Object.keys(prev.budgetYears);
      if (allYears.length <= selectedYearsToDelete.length) {
          showError("Tidak bisa menghapus semua tahun.");
          return prev;
      }
      const updatedBudgetYears = { ...prev.budgetYears };
      selectedYearsToDelete.forEach((y) => delete updatedBudgetYears[y]);
      const remainingYears = Object.keys(updatedBudgetYears).sort();
      const newActive = selectedYearsToDelete.includes(String(prev.activeYear)) ? remainingYears[remainingYears.length - 1] : prev.activeYear;

      return { ...prev, budgetYears: updatedBudgetYears, activeYear: newActive };
    });
    setSelectedYearsToDelete([]);
    setIsDeleteMode(false);
  }

  function addRoutineEntry({ name, amount, startIndex }) {
    setData((prev) => {
      const activeY = Number(prev.activeYear);
      const sortedYears = Object.keys(prev.budgetYears).map(Number).sort((a, b) => a - b);
      const targetYears = sortedYears.filter(y => y >= activeY);
      
      const newEntries = [];
      targetYears.forEach(y => {
        newEntries.push({
          id: crypto.randomUUID(),
          name,
          amount: Number(amount),
          activeYear: y,
          startIndex: y === activeY ? Number(startIndex) : 0,
          stopIndex: 11
        });
      });

      return {
        ...prev,
        routineEntries: [
          ...newEntries,
          ...(prev.routineEntries || []),
        ],
      };
    });
  }

  function updateRoutineEntry(id, updatedData) {
    setData((prev) => {
      const targetEntry = prev.routineEntries.find(e => e.id === id);
      if (!targetEntry) return prev;
      
      const currentActiveYear = Number(targetEntry.activeYear);
      const isStopping = updatedData.stopIndex !== undefined;

      const newEntries = prev.routineEntries.map((e) => {
        if (e.id === id) {
          return { ...e, ...updatedData };
        }
        if (!isStopping && e.name === targetEntry.name && Number(e.activeYear) > currentActiveYear) {
          return { 
            ...e, 
            name: updatedData.name !== undefined ? updatedData.name : e.name, 
            amount: updatedData.amount !== undefined ? updatedData.amount : e.amount 
          };
        }
        return e;
      });

      let finalEntries = newEntries;
      if (isStopping && updatedData.stopIndex < 11) {
        finalEntries = finalEntries.filter(e => !(e.name === targetEntry.name && Number(e.activeYear) > currentActiveYear));
      }

      return { ...prev, routineEntries: finalEntries };
    });
  }

  function deleteRoutineEntry(id) {
    setData((prev) => {
      const targetEntry = prev.routineEntries.find(e => e.id === id);
      if (!targetEntry) return prev;
      
      return {
        ...prev,
        routineEntries: prev.routineEntries.filter((e) => 
          !(e.id === id || (e.name === targetEntry.name && Number(e.activeYear) > Number(targetEntry.activeYear)))
        ),
      };
    });
  }

  const wishlistTotal = useMemo(() => {
    if (!data) return 0;
    return data.wishlistCategories.reduce((sum, c) => sum + c.items.filter((i) => !i.bought).reduce((s, i) => s + i.price, 0), 0);
  }, [data]);

  function addWishlistCategory(name) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: [...prev.wishlistCategories, { id: crypto.randomUUID(), name, items: [] }],
    }));
  }

  function deleteWishlistCategory(catId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.filter((c) => c.id !== catId),
    }));
  }

  function toggleWishlistBought(catId, itemId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, bought: !i.bought } : i)) } : c
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
    setData((prev) => ({
      ...prev,
      spaylater: [
        {
          id: crypto.randomUUID(),
          name,
          totalAmount: Number(totalAmount),
          tenor: Number(tenor),
          purchaseDate,
          monthlyPayment: Math.round(Number(totalAmount) / Number(tenor)),
          isFinished: false,
          paidChecklist: Array(Number(tenor)).fill(false),
        },
        ...prev.spaylater,
      ],
    }));
  }

  function toggleSpaylaterPaid(id, index) {
    setData((prev) => ({
      ...prev,
      spaylater: prev.spaylater.map((item) => {
        if (item.id !== id) return item;
        const isPaid = item.paidChecklist[index];
        const newChecklist = item.paidChecklist.map((v, i) => isPaid ? (i >= index ? false : v) : (i <= index ? true : v));
        const allPaid = newChecklist.every(Boolean);
        return { ...item, paidChecklist: newChecklist, isFinished: allPaid };
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
          paidChecklist: nextFinished ? Array(item.tenor).fill(true) : item.paidChecklist,
        };
      }),
    }));
  }

  function deleteSpaylater(id) {
    setData((prev) => ({
      ...prev,
      spaylater: prev.spaylater.filter((s) => s.id !== id),
    }));
  }

  function updateOvertimeRate(v) {
    setData((prev) => ({ ...prev, overtimeRate: Number(v) || 0 }));
  }

  function addOvertimeEntry({ date, targetMonth, jenis, totalJam, paid }) {
    setData((prev) => ({
      ...prev,
      overtimeEntries: [
        { id: crypto.randomUUID(), date, targetMonth, jenis, totalJam: Number(totalJam), paid },
        ...(prev.overtimeEntries || []),
      ],
    }));
  }

  function updateOvertimeEntry(id, updatedData) {
    setData((prev) => ({
      ...prev,
      overtimeEntries: prev.overtimeEntries.map((e) => (e.id === id ? { ...e, ...updatedData } : e)),
    }));
  }

  function toggleOvertimePaid(id) {
    setData((prev) => ({
      ...prev,
      overtimeEntries: prev.overtimeEntries.map((e) => (e.id === id ? { ...e, paid: !e.paid } : e)),
    }));
  }

  function deleteOvertimeEntry(id) {
    setData((prev) => ({
      ...prev,
      overtimeEntries: (prev.overtimeEntries || []).filter((e) => e.id !== id),
    }));
  }

  function addTransaction({ amount, category, note, walletId, fromWalletId, toWalletId, type, date }) {
    setData((prev) => {
      const next = { ...prev };
      const txDate = date || todayKey();
      
      next.transactions = [
        { id: crypto.randomUUID(), amount, category, note, walletId, fromWalletId, toWalletId, type, date: txDate, ts: Date.now() },
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
          w.id === walletId ? { ...w, balance: w.balance + (type === "income" ? amount : -amount) } : w
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
      let nextWallets = next.wallets.map(w => ({...w}));
      
      if(oldTx.type === "transfer") {
         const fw = nextWallets.find(w => w.id === oldTx.fromWalletId);
         if(fw) fw.balance += oldTx.amount;
         const tw = nextWallets.find(w => w.id === oldTx.toWalletId);
         if(tw) tw.balance -= oldTx.amount;
      } else {
         const w = nextWallets.find(w => w.id === oldTx.walletId);
         if(w) w.balance -= (oldTx.type === "income" ? oldTx.amount : -oldTx.amount);
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

      next.wallets = nextWallets;
      next.transactions = next.transactions.map(t => t.id === id ? { ...t, ...updatedData, ts: Date.now() } : t);

      return next;
    });
  }

  function deleteTransaction(id) {
    setData((prev) => {
      const tx = prev.transactions.find((t) => t.id === id);
      if (!tx) return prev;

      let nextWallets = prev.wallets;
      if (tx.type === "transfer") {
         nextWallets = prev.wallets.map(w => {
            if (w.id === tx.fromWalletId) return { ...w, balance: w.balance + tx.amount };
            if (w.id === tx.toWalletId) return { ...w, balance: w.balance - tx.amount };
            return w;
         });
      } else {
         nextWallets = prev.wallets.map((w) =>
            w.id === tx.walletId ? { ...w, balance: w.balance - (tx.type === "income" ? tx.amount : -tx.amount) } : w
          );
      }

      return {
        ...prev,
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
        { id: crypto.randomUUID(), name, balance: 0, color: WALLET_COLORS[prev.wallets.length % WALLET_COLORS.length] },
      ],
    }));
  }

  function deleteWallet(id) {
    setData((prev) => {
      if (prev.wallets.length <= 1) return prev;
      return { ...prev, wallets: prev.wallets.filter((w) => w.id !== id) };
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
    setData((prev) => ({ ...prev, goals: [...prev.goals, { id: crypto.randomUUID(), ...goalData }] }));
  }

  function updateGoal(id, goalData) {
    setData((prev) => ({ ...prev, goals: prev.goals.map((g) => (g.id === id ? { ...g, ...goalData } : g)) }));
    setEditingGoalId(null);
  }

  function deleteGoal(id) {
    setData((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
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
      const spaylaterList = spaylaterByMonth[`${currentYearStr}-${index}`] || [];
      const totalCicilanOtomatis = spaylaterList.reduce((s, i) => s + i.amount, 0);

      const expList = pengeluaranByMonth[`${currentYearStr}-${index}`] || [];
      const totalPengeluaranOtomatis = expList.reduce((s, i) => s + i.amount, 0);

      const incList = gajiTambahanByMonth[`${currentYearStr}-${index}`] || [];
      const totalGajiTambahanOtomatis = incList.reduce((s, i) => s + i.amount, 0);

      const rutList = routineByMonth[`${currentYearStr}-${index}`] || [];
      const totalRutinOtomatis = rutList.reduce((s, i) => s + i.amount, 0);

      const row = {
        ...(rawMonths[m] || { saldoAwal: 0, keterangan: "" }),
        gaji: resolvedGajiList[index],
        cicilan: totalCicilanOtomatis,
        pengeluaran: totalPengeluaranOtomatis,
        gajiTambahan: totalGajiTambahanOtomatis,
        rutin: totalRutinOtomatis,
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
  }, [data, spaylaterByMonth, pengeluaranByMonth, gajiTambahanByMonth, routineByMonth]);

  const budgetTrendData = useMemo(() => {
    if (!resolvedMonthsData) return [];
    return MONTHS.map((m) => ({
      month: m.slice(0, 3),
      saldo: resolvedMonthsData[m]?.resolvedSaldoAkhir || 0,
    }));
  }, [resolvedMonthsData]);

  const groupedOvertime = useMemo(() => {
    if (!data || !Array.isArray(data.overtimeEntries)) return [];
    
    const groups = {};
    data.overtimeEntries.forEach((e) => {
      if (!e) return;
      const target = e.targetMonth || (e.date ? e.date.slice(0, 7) : todayKey().slice(0, 7));
      const [y, m] = target.split("-").map(Number);
      const key = `${y}-${m - 1}`;
      
      if (!groups[key]) {
        groups[key] = { year: y, monthIdx: m - 1, entries: [] };
      }
      groups[key].entries.push(e);
    });

    return Object.values(groups)
      .sort((a, b) => a.year - b.year || a.monthIdx - b.monthIdx)
      .map((g) => {
        let totalRp = 0, totalCair = 0, totalHrs = 0;
        const withCalc = g.entries.map((e) => {
          const { amount, hrs } = computeOvertime(data.overtimeRate || 0, e.jenis, e.totalJam || 0);
          totalRp += amount;
          if (e.paid) totalCair += amount;
          totalHrs += hrs;
          return { ...e, amount, hrs };
        });
        
        return { 
          label: `Penggajian ${MONTHS[g.monthIdx] || ""} ${g.year}`, 
          entries: withCalc, 
          totalRp, 
          totalCair, 
          totalHrs 
        };
      });
  }, [data]);

  const activeSpaylaterList = useMemo(() => {
    let list = [...(data?.spaylater?.filter(item => !item.isFinished) || [])];

    if (spaySearch) {
      list = list.filter(item => item.name.toLowerCase().includes(spaySearch.toLowerCase()));
    }

    list.sort((a, b) => {
      if (spaySort === "name_asc") return a.name.localeCompare(b.name);
      if (spaySort === "name_desc") return b.name.localeCompare(a.name);
      if (spaySort === "price_desc") return b.totalAmount - a.totalAmount;
      if (spaySort === "price_asc") return a.totalAmount - b.totalAmount;
      if (spaySort === "tenor_desc") return b.tenor - a.tenor;
      if (spaySort === "tenor_asc") return a.tenor - b.tenor;
      return 0;
    });

    return list;
  }, [data?.spaylater, spaySearch, spaySort]);

  const sortedFilteredTasks = useMemo(() => {
    if (!data || !Array.isArray(data.tasks)) return [];
    let list = [...data.tasks];
    if (taskFilter === "active") list = list.filter((t) => !t.done);
    if (taskFilter === "done") list = list.filter((t) => t.done);

    const priorityRank = { high: 0, medium: 1, low: 2 };
    list.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return priorityRank[a.priority] - priorityRank[b.priority];
    });
    return list;
  }, [data, taskFilter]);

  const taskStats = useMemo(() => {
    if (!data || !Array.isArray(data.tasks)) return { total: 0, done: 0, overdue: 0 };
    const today = todayKey();
    const total = data.tasks.length;
    const done = data.tasks.filter((t) => t.done).length;
    const overdue = data.tasks.filter((t) => !t.done && t.dueDate && t.dueDate < today).length;
    return { total, done, overdue };
  }, [data]);

  if (!loaded || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <div className="font-bold tracking-wide animate-pulse text-sm text-lime">Memuat AGR Ledger…</div>
      </div>
    );
  }

  const budgetYearsList = data ? Object.keys(data.budgetYears).sort() : [];
  const currentYearRoutineEntries = (data.routineEntries || []).filter(e => Number(e.activeYear || data.activeYear) === Number(data.activeYear));

  return (
    <div
      className="min-h-screen bg-ink text-white font-display"
      onClick={() => { if (activePopup) setActivePopup(null); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        .font-display { font-family: system-ui, -apple-system, sans-serif; }
        .tabular { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace; letter-spacing: -0.02em; }
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
        select { -webkit-appearance: none; -moz-appearance: none; appearance: none; }

        @keyframes tabFadeSlide {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .tab-content {
          animation: tabFadeSlide 0.25s ease-out;
        }
      `}</style>

      <div className="w-full max-w-md md:max-w-5xl mx-auto px-5 md:px-8 pt-7 pb-32">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-[10px] overflow-hidden bg-surface border border-white/10 flex items-center justify-center shrink-0">
            <img src={logoImg} alt="Logo AGR" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-[15px] leading-none tracking-tight">AGR Ledger</div>
            <div className="text-[11px] text-white/35 mt-1">Precision Financial Tracking</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={exportData} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-lime active:scale-90 transition" title="Ekspor data (.json)"><Download size={16} /></button>
            <button onClick={() => importInputRef.current?.click()} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-lime active:scale-90 transition" title="Impor data (.json)"><Upload size={16} /></button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFileChange} />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-xs text-black font-medium bg-red-400 border border-red-500 rounded-lg px-4 py-3 shadow-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-black/50 hover:text-black"><X size={15}/></button>
          </div>
        )}

        <TopTabs active={activeTab} onChange={setActiveTab} />

        <div key={activeTab} className="tab-content">
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
                          strokeDashoffset={2 * Math.PI * 52 * (1 - Math.min(1, remainingMonth / Math.max(1, data.monthlyBudget)))}
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
                        <div className="text-[11px] uppercase tracking-wider text-white/35 font-medium">Budget bulanan tersisa</div>
                        {!isEditingMonthlyBudget ? (
                          <button onClick={() => { setIsEditingMonthlyBudget(true); setTempMonthlyBudget(formatRupiahInput(data.monthlyBudget)); }} className="text-[10px] text-lime hover:underline flex items-center gap-1">
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
                          <button onClick={() => {
                            const val = parseRupiahInput(tempMonthlyBudget);
                            if (val > 0) setData((prev) => ({ ...prev, monthlyBudget: val }));
                            setIsEditingMonthlyBudget(false);
                          }} className="text-lime hover:scale-110 bg-lime/10 p-1.5 rounded"><Check size={14} /></button>
                        </div>
                      )}

                      <div className="text-[11px] text-white/40 mb-3">
                        Total Limit: <span className="text-white font-medium tabular">{rupiah(data.monthlyBudget)}</span>
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5"><TrendingUp size={11} className="text-teal" /> Masuk</div>
                          <div className="font-medium text-sm tabular">{rupiah(totals.income)}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5"><TrendingDown size={11} className="text-coral" /> Keluar</div>
                          <div className="font-medium text-sm tabular">{rupiah(totals.expense)}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-9 bg-surface border border-white/10 rounded-2xl p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-sm font-semibold">Aktivitas Bulan Ini</div>
                        <div className="text-[11px] text-white/40 uppercase tracking-wider mt-0.5">{MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={handlePrevMonth} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/75 transition"><ChevronLeft size={15} /></button>
                        <button onClick={() => setCalendarDate(new Date())} className="text-[10px] text-lime font-medium px-2.5 py-1 rounded-lg bg-lime/10 hover:bg-lime/20 transition">Hari Ini</button>
                        <button onClick={handleNextMonth} className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/75 transition"><ChevronRight size={15} /></button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-[10px] text-white/40 font-medium uppercase">
                      <div>Sen</div><div>Sel</div><div>Rab</div><div>Kam</div><div>Jum</div><div>Sab</div><div className="text-coral">Min</div>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarGridData.map((item) => {
                        if (item.empty) return <div key={item.id} className="h-16 md:h-20 rounded-xl bg-transparent" />;
                        const isToday = item.iso === todayKey();
                        const hasExpense = item.expense > 0;
                        const hasIncome = item.income > 0;

                        return (
                          <div key={item.iso} className={`h-16 md:h-20 rounded-xl p-1.5 flex flex-col justify-between transition border ${isToday ? "border-lime bg-white/[0.06]" : item.isHoliday ? "border-white/5 bg-coral/[0.08]" : "border-white/5 bg-white/[0.02]"}`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-[11px] font-medium ${isToday ? "text-lime font-bold" : item.isHoliday ? "text-coral font-bold" : "text-white/60"}`}>{item.dateNum}</span>
                            </div>
                            <div className="flex flex-col gap-0.5 text-right overflow-hidden">
                              {hasIncome && <span className="text-[9.5px] text-teal font-medium tabular truncate">+{item.income >= 1000000 ? (item.income / 1000000).toFixed(1) + "JT" : Math.round(item.income / 1000) + "RB"}</span>}
                              {hasExpense && <span className="text-[9.5px] text-coral font-medium tabular truncate">-{item.expense >= 1000000 ? (item.expense / 1000000).toFixed(1) + "JT" : Math.round(item.expense / 1000) + "RB"}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel noMargin>Target Tabungan</SectionLabel>
                    <button onClick={() => setShowAddGoal(true)} className="text-xs text-lime border border-lime/30 rounded-lg px-2.5 py-1 flex items-center gap-1 hover:bg-lime/5 transition"><Plus size={12} /> Tambah Target</button>
                  </div>
                  <div className="mb-9 space-y-4">
                    {(!data.goals || data.goals.length === 0) && <EmptyRow>Belum ada target tabungan.</EmptyRow>}
                    {data.goals?.map((goal) => {
                      if (editingGoalId === goal.id) {
                        return <EditGoalCard key={goal.id} goal={goal} onSave={(updated) => updateGoal(goal.id, updated)} onCancel={() => setEditingGoalId(null)} />;
                      }
                      return (
                        <div key={goal.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                          <div className="flex items-center gap-2.5 mb-2">
                            <PiggyBank size={15} className="text-lime shrink-0" />
                            <div className="text-sm font-medium truncate flex-1">{goal.name}</div>
                            <div className="text-[11px] text-white/40 tabular shrink-0">{rupiah(goal.saved)} / {rupiah(goal.target)}</div>
                            <div className="flex items-center gap-1 ml-2">
                              <button onClick={() => setTopUpGoal(goal)} className="text-black bg-lime hover:scale-105 p-1 rounded transition mr-1" title="Tambah tabungan"><Plus size={13} strokeWidth={2.5} /></button>
                              <button onClick={() => setEditingGoalId(goal.id)} className="text-white/30 hover:text-white p-1 transition"><Edit2 size={13} /></button>
                              <button onClick={() => requestConfirm("Hapus Target?", `Target "${goal.name}" akan dihapus.`, () => deleteGoal(goal.id))} className="text-white/30 hover:text-coral p-1 transition"><Trash2 size={13} /></button>
                            </div>
                          </div>
                          <div className="h-[4px] bg-white/10 overflow-hidden rounded-full">
                            <div className="h-full bg-lime transition-all rounded-full" style={{ width: `${Math.min(100, (goal.saved / Math.max(1, goal.target)) * 100)}%` }} />
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
                      const isEditingBalance = editingBalanceId === w.id;
                      const canDeleteWallet = data.wallets.length > 1;
                      return (
                        <div key={w.id} className="pl-3 pr-2 py-3 border-l-2 bg-white/[0.03] rounded-r-xl flex flex-col justify-between group" style={{ borderColor: w.color }}>
                          <div className="flex items-center justify-between mb-2">
                            {isEditing ? (
                              <div className="flex items-center gap-1 w-full">
                                <input autoFocus value={editingWalletName} onChange={(e) => setEditingWalletName(e.target.value)} className="w-full bg-white/10 text-xs px-1.5 py-0.5 rounded outline-none text-white" />
                                <button onClick={() => updateWalletName(w.id, editingWalletName)} className="text-lime hover:scale-110"><Check size={13} /></button>
                              </div>
                            ) : (
                              <div onClick={() => { setEditingWalletId(w.id); setEditingWalletName(w.name); }} className="text-[11px] text-white/60 hover:text-white truncate cursor-pointer flex items-center gap-1 group/name">
                                <span className="truncate">{w.name}</span>
                                <Edit2 size={10} className="opacity-0 group-hover/name:opacity-100 transition shrink-0" />
                              </div>
                            )}
                            {canDeleteWallet && (
                              <button onClick={() => requestConfirm("Hapus Dompet?", `Dompet "${w.name}" akan dihapus.`, () => deleteWallet(w.id))} className="text-white/0 group-hover:text-white/30 hover:text-coral transition p-0.5"><Trash2 size={11} /></button>
                            )}
                          </div>
                          {isEditingBalance ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                value={editingBalanceValue}
                                onChange={(e) => setEditingBalanceValue(formatRupiahInput(e.target.value))}
                                className="w-full bg-white/10 text-sm px-1.5 py-0.5 rounded outline-none tabular text-lime font-medium"
                              />
                              <button onClick={() => { adjustWalletBalance(w.id, parseRupiahInput(editingBalanceValue)); setEditingBalanceId(null); }} className="text-lime hover:scale-110"><Check size={13} /></button>
                            </div>
                          ) : (
                            <div onClick={() => { setEditingBalanceId(w.id); setEditingBalanceValue(formatRupiahInput(w.balance)); }} className="font-medium text-sm tabular cursor-pointer hover:text-lime transition" title="Klik untuk ubah saldo">
                              {rupiah(w.balance)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => setShowAddWallet(true)} className="min-h-[72px] flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 transition border-2 border-dashed border-white/15 rounded-xl">
                      <Plus size={15} />
                      <span className="text-[10px]">Dompet Baru</span>
                    </button>
                  </div>

                  <SectionLabel>Pengeluaran per kategori</SectionLabel>
                  <div className="mb-9">
                    {categorySpend.filter((c) => c.total > 0).length === 0 && <EmptyRow>Belum ada pengeluaran tercatat.</EmptyRow>}
                    {categorySpend.filter((c) => c.total > 0).map((c) => (
                      <button key={c.id} onClick={() => setFilterCat((prev) => (prev === c.id ? "all" : c.id))} className={`w-full text-left py-2.5 border-b border-white/5 transition ${filterCat === c.id ? "opacity-100" : "opacity-90 hover:opacity-100"}`}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] shrink-0" style={{ backgroundColor: c.color + "26" }}>{c.emoji}</span>
                            <span style={filterCat === c.id ? { color: c.color } : undefined}>{c.label}</span>
                          </span>
                          <span className="font-medium tabular text-sm">{rupiah(c.total)}</span>
                        </div>
                        <div className="h-[3px] bg-white/8 overflow-hidden rounded-full">
                          <div className="h-full rounded-full transition-all" style={{ width: `${(c.total / maxCat) * 100}%`, backgroundColor: c.color, opacity: filterCat === "all" || filterCat === c.id ? 1 : 0.35 }} />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-3">
                      <SectionLabel noMargin>{filterCat === "all" ? "Transaksi terbaru" : "Difilter"}</SectionLabel>
                      {filterCat !== "all" && <button onClick={() => setFilterCat("all")} className="text-[11px] text-lime font-medium">Hapus filter</button>}
                    </div>
                    <button onClick={() => setTxEditListMode(prev => !prev)} className={`text-xs border rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition ${txEditListMode ? "bg-white/10 text-white border-white/30" : "text-white/70 border-white/20 hover:bg-white/5"}`}>
                      <Edit2 size={12} /> {txEditListMode ? "Selesai Edit" : "Edit List"}
                    </button>
                  </div>
                  <div>
                    {filteredTransactions.length === 0 && <EmptyRow>Belum ada transaksi.</EmptyRow>}
                    {filteredTransactions.slice(0, 20).map((t) => {
                      const cat = CATEGORIES.find((c) => c.id === t.category);
                      const isTransfer = t.type === "transfer";
                      const fromW = data.wallets.find((w) => w.id === t.fromWalletId)?.name || "Dompet";
                      const toW = data.wallets.find((w) => w.id === t.toWalletId)?.name || "Dompet";

                      return (
                        <div key={t.id} className="group flex items-center justify-between py-3 border-b border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-base shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: isTransfer ? "#ffffff11" : t.type === "income" ? "#5EEAD733" : (cat?.color ? cat.color + "26" : "#ffffff11") }}>
                              {isTransfer ? <ArrowRightLeft size={14} className="text-white/70" /> : t.type === "income" ? "💰" : (cat?.emoji || "✨")}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">{t.note || (isTransfer ? "Transfer Saldo" : t.type === "income" ? "Pemasukan" : cat?.label)}</div>
                              <div className="text-[11px] text-white/35 truncate">{formatDateID(t.date)} • {isTransfer ? `${fromW} ➔ ${toW}` : t.type === "income" ? "Pemasukan" : cat?.label}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className={`font-medium text-sm tabular ${isTransfer ? "text-white/60" : t.type === "income" ? "text-teal" : "text-white"}`}>
                              {isTransfer ? "" : t.type === "income" ? "+" : "-"}{rupiah(t.amount)}
                            </div>
                            {txEditListMode && (
                              <div className="flex items-center gap-1.5 ml-2">
                                <button onClick={() => setEditingTx(t)} className="text-white/70 hover:text-white p-2 border border-white/15 rounded-lg bg-white/5 transition" title="Edit"><Edit2 size={13} /></button>
                                <button onClick={() => requestConfirm("Hapus Transaksi?", "Transaksi akan dihapus permanen.", () => deleteTransaction(t.id))} className="text-coral hover:text-red-400 p-2 border border-coral/30 rounded-lg bg-coral/10 transition" title="Hapus"><Trash2 size={13} /></button>
                              </div>
                            )}
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
                    <button onClick={addBudgetYear} className="px-3 py-1.5 rounded-lg text-[11px] border border-dashed border-white/30 text-lime hover:bg-lime/10 flex items-center gap-1 font-medium"><Plus size={12} /> Tahun Baru</button>
                    {budgetYearsList.length > 1 && (
                      <>
                        {!isDeleteMode ? (
                          <button onClick={() => { setIsDeleteMode(true); setSelectedYearsToDelete([]); }} className="px-3 py-1.5 rounded-lg text-[11px] border border-white/20 text-white bg-white/[0.06] flex items-center gap-1.5 font-medium"><Trash2 size={12} /> Hapus Tahun</button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button disabled={selectedYearsToDelete.length === 0} onClick={() => requestConfirm("Hapus Tahun?", "Tahun terpilih akan dihapus.", executeDeleteSelectedYears)} className="px-3 py-1.5 rounded-lg text-[11px] bg-coral text-black font-bold disabled:opacity-40">Hapus ({selectedYearsToDelete.length})</button>
                            <button onClick={() => { setIsDeleteMode(false); setSelectedYearsToDelete([]); }} className="px-3 py-1.5 rounded-lg text-[11px] bg-white/20 text-white font-medium">Batal</button>
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
                      <button key={y} onClick={() => { if (isDeleteMode) { setSelectedYearsToDelete(prev => isMarkedForDelete ? prev.filter(item => item !== y) : [...prev, y]); } else { setData((prev) => ({ ...prev, activeYear: y })); } }} className={`py-2 rounded-lg text-[11px] font-medium border transition flex items-center justify-center gap-1.5 ${isDeleteMode && isMarkedForDelete ? "bg-coral text-black border-coral font-bold" : isDeleteMode ? "bg-white/10 border-white/25 text-white" : isSelected ? "bg-lime text-black border-lime font-bold" : "border-white/10 text-white/70 bg-white/[0.03]"}`}>
                        {y}
                        {isDeleteMode && <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${isMarkedForDelete ? "bg-black text-coral font-bold" : "bg-white/20 text-white"}`}>{isMarkedForDelete ? "✓" : "+"}</span>}
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
                      <Tooltip cursor={{ stroke: "#ffffff20" }} contentStyle={{ background: "#1A1B1E", border: "1px solid #ffffff1a", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "#ffffff90" }} formatter={(v) => [rupiah(v), "Saldo Akhir"]} />
                      <Line type="monotone" dataKey="saldo" stroke="#C8FF4D" strokeWidth={2} dot={{ r: 3, fill: "#C8FF4D", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="overflow-x-auto no-scrollbar swipe-ignore -mx-5 px-5 md:mx-0 md:px-0 mb-10">
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
                    {resolvedMonthsData && MONTHS.map((m, index) => {
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
                                onChange={(e) => updateBudgetCell(data.activeYear, m, "saldoAwal", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                                placeholder="0"
                                className="w-24 bg-transparent text-right outline-none border-b border-transparent focus:border-lime tabular py-0.5"
                              />
                            ) : (
                              <span className="py-0.5 block">{row.resolvedSaldoAwal.toLocaleString("id-ID")}</span>
                            )}
                          </td>

                          {/* Gaji Pokok */}
                          <td className="py-1.5 pr-3">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={(row.gaji || 0) === 0 ? "" : (row.gaji || 0).toLocaleString("id-ID")}
                              onChange={(e) => updateBudgetCell(data.activeYear, m, "gaji", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                              placeholder="0"
                              className="w-24 bg-transparent text-right outline-none border-b border-transparent focus:border-lime tabular py-0.5"
                            />
                          </td>

                          {/* Gaji Tambahan */}
                          <td className="py-1.5 pr-3 text-right tabular text-teal">
                            {row.gajiTambahan > 0 ? (
                              <span 
                                className="cursor-pointer border-b border-dotted border-teal/50 inline-block py-0.5"
                                onClick={(e) => handleTogglePopup(e, m, gajiTambahanByMonth[`${data.activeYear}-${index}`] || [], "Gaji Tambahan")}
                              >
                                {row.gajiTambahan.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>

                          {/* Rutin */}
                          <td className="py-1.5 pr-3 text-right tabular text-white/80">
                            {row.rutin > 0 ? (
                              <span 
                                className="cursor-pointer border-b border-dotted border-white/30 inline-block py-0.5"
                                onClick={(e) => handleTogglePopup(e, m, routineByMonth[`${data.activeYear}-${index}`] || [], "Rutin")}
                              >
                                {row.rutin.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>

                          {/* Cicilan */}
                          <td className="py-1.5 pr-3 text-right tabular text-white/80">
                            {row.cicilan > 0 ? (
                              <span 
                                className="cursor-pointer border-b border-dotted border-white/30 inline-block py-0.5"
                                onClick={(e) => handleTogglePopup(e, m, spaylaterByMonth[`${data.activeYear}-${index}`] || [], "Cicilan")}
                              >
                                {row.cicilan.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>

                          {/* Pengeluaran */}
                          <td className="py-1.5 pr-3 text-right tabular text-coral">
                            {row.pengeluaran > 0 ? (
                              <span 
                                className="cursor-pointer border-b border-dotted border-coral/50 inline-block py-0.5"
                                onClick={(e) => handleTogglePopup(e, m, pengeluaranByMonth[`${data.activeYear}-${index}`] || [], "Pengeluaran")}
                              >
                                {row.pengeluaran.toLocaleString("id-ID")}
                              </span>
                            ) : (
                              <span>0</span>
                            )}
                          </td>

                          <td className="py-1.5 pr-3">
                            <input value={row.keterangan || ""} onChange={(e) => updateBudgetCell(data.activeYear, m, "keterangan", e.target.value)} placeholder="-" className="w-28 bg-transparent outline-none border-b border-transparent focus:border-lime py-0.5" />
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

              {/* List Pengeluaran Rutin */}
              <div className="pt-8 border-t border-white/10 mb-10">
                <div className="flex items-center justify-between mb-6">
                  <div 
                    className="flex items-center gap-2 cursor-pointer group hover:bg-white/5 px-2 py-1 -ml-2 rounded-lg transition"
                    onClick={() => setIsRoutineCollapsed(!isRoutineCollapsed)}
                  >
                    <SectionLabel noMargin>List Pengeluaran Rutin ({data.activeYear})</SectionLabel>
                    {isRoutineCollapsed ? (
                      <ChevronDown size={14} className="text-white/40 group-hover:text-white transition" />
                    ) : (
                      <ChevronUp size={14} className="text-white/40 group-hover:text-white transition" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRoutineEditListMode(prev => !prev)} className={`text-xs border rounded-lg px-3 py-2 flex items-center gap-1.5 transition ${routineEditListMode ? "bg-white/10 text-white border-white/30" : "text-white/70 border-white/20 hover:bg-white/5"}`}>
                      <Edit2 size={13} /> {routineEditListMode ? "Selesai" : "Edit List"}
                    </button>
                    <button onClick={() => setShowAddRoutine(true)} className="text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"><Plus size={13} /> Tambah</button>
                  </div>
                </div>

                {!isRoutineCollapsed && (
                  <>
                    {currentYearRoutineEntries.length === 0 && <EmptyRow>Belum ada pengeluaran rutin tahun ini.</EmptyRow>}
                    <div className="space-y-3">
                      {currentYearRoutineEntries.map((e) => {
                        const startIdx = e.startIndex !== undefined ? Number(e.startIndex) : 0;
                        const stopIdx = e.stopIndex !== undefined ? Number(e.stopIndex) : 11;
                        const statusText = stopIdx === 11 ? `Mulai ${MONTHS[startIdx]} (Aktif)` : `Aktif (${MONTHS[startIdx]} s.d ${MONTHS[stopIdx]})`;

                        return (
                          <div key={e.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-sm mb-1 truncate">{e.name}</div>
                              <div className="text-[11px] text-white/40 mb-1">{statusText}</div>
                              <div className="text-xs font-medium text-lime tabular">{rupiah(e.amount)} / bulan</div>
                            </div>
                            {routineEditListMode && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button onClick={() => setRoutineStopTarget(e)} className="text-yellow-400 hover:text-yellow-300 px-2.5 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 text-xs font-medium transition" title="Stop">Stop</button>
                                <button onClick={() => setEditingRoutine(e)} className="text-white/70 hover:text-white p-2 border border-white/15 rounded-lg bg-white/5 transition" title="Edit"><Edit2 size={14} /></button>
                                <button onClick={() => requestConfirm("Hapus Rutin?", "Pengeluaran rutin akan dihapus permanen.", () => deleteRoutineEntry(e.id))} className="text-coral hover:text-red-400 p-2 border border-coral/30 rounded-lg bg-coral/10 transition" title="Hapus"><Trash2 size={14} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <SectionLabel noMargin>Tracker Cicilan SPayLater</SectionLabel>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowSpaylaterHistory(true)} className="text-xs text-white/70 border border-white/20 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-white/5 transition"><History size={13} /> Riwayat</button>
                    <button onClick={() => setShowAddSpaylater(true)} className="text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"><Plus size={13} /> Catat</button>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2.5 mb-6">
                  <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                    <input
                      value={spaySearch}
                      onChange={(e) => setSpaySearch(e.target.value)}
                      placeholder="Cari nama cicilan..."
                      className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:border-lime placeholder:text-white/25 transition-colors text-white"
                    />
                  </div>
                  <div className="relative shrink-0 w-full md:w-auto">
                    <select
                      value={spaySort}
                      onChange={(e) => setSpaySort(e.target.value)}
                      className="w-full md:w-auto pl-9 pr-8 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs outline-none focus:border-lime text-white appearance-none cursor-pointer"
                    >
                      <option value="default" className="bg-surface">Urutan Default</option>
                      <option value="name_asc" className="bg-surface">Nama (A - Z)</option>
                      <option value="name_desc" className="bg-surface">Nama (Z - A)</option>
                      <option value="price_desc" className="bg-surface">Harga Tertinggi</option>
                      <option value="price_asc" className="bg-surface">Harga Terendah</option>
                      <option value="tenor_desc" className="bg-surface">Tenor Terlama</option>
                      <option value="tenor_asc" className="bg-surface">Tenor Tersingkat</option>
                    </select>
                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  </div>
                </div>

                {activeSpaylaterList.length === 0 && <EmptyRow>Belum ada tagihan SPayLater aktif / ditemukan.</EmptyRow>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSpaylaterList.map((item) => {
                    const monthlyPayment = item.totalAmount / item.tenor;
                    const paidMonthsCount = item.paidChecklist.filter(Boolean).length;
                    const remainingMonths = item.tenor - paidMonthsCount;

                    return (
                      <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-5 transition hover:bg-white/[0.05]">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="font-semibold text-sm mb-1">{item.name}</div>
                            <div className="text-[11px] text-white/40 tabular">Total: {rupiah(item.totalAmount)}</div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleSpaylaterFinished(item.id)} className="text-[10px] px-2.5 py-1 rounded-lg border bg-lime/10 border-lime/30 text-lime hover:bg-lime/20 font-medium">Finish</button>
                            <button onClick={() => requestConfirm("Hapus Cicilan?", "Cicilan akan dihapus dari daftar.", () => deleteSpaylater(item.id))} className="text-white/20 hover:text-coral p-1"><Trash2 size={15} /></button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end mb-5 border-b border-white/5 pb-4">
                          <div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Per Bulan</div>
                            <div className="font-medium text-lime text-base tabular">{rupiah(monthlyPayment)}</div>
                          </div>
                          <div className="text-right text-[11px] text-white/50">{remainingMonths} bulan lagi</div>
                        </div>
                        <div className="text-[11px] text-white/40 mb-2">Checklist Pembayaran:</div>
                        <div className="flex flex-wrap gap-2">
                          {item.paidChecklist.map((isPaid, idx) => (
                            <button key={idx} onClick={() => toggleSpaylaterPaid(item.id, idx)} className={`w-9 h-9 rounded-md flex items-center justify-center text-xs font-medium transition ${isPaid ? "bg-lime text-black font-bold" : "bg-white/5 border border-white/10 text-white/40 hover:border-lime/50"}`}>
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

          {activeTab === "tasks" && (
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div>
                  <SectionLabel noMargin>Total Tugas</SectionLabel>
                  <div className="font-semibold text-lg tabular mt-1">{taskStats.total}</div>
                </div>
                <div>
                  <SectionLabel noMargin>Selesai</SectionLabel>
                  <div className="font-semibold text-lg tabular mt-1 text-teal">{taskStats.done}</div>
                </div>
                {taskStats.overdue > 0 && (
                  <div>
                    <SectionLabel noMargin>Terlambat</SectionLabel>
                    <div className="font-semibold text-lg tabular mt-1 text-coral flex items-center gap-1">
                      <AlertCircle size={15} /> {taskStats.overdue}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="flex bg-white/[0.04] p-1 rounded-lg">
                  <button onClick={() => setTaskFilter('active')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${taskFilter === 'active' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Aktif</button>
                  <button onClick={() => setTaskFilter('done')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${taskFilter === 'done' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Selesai</button>
                  <button onClick={() => setTaskFilter('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${taskFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Semua</button>
                </div>
                <button onClick={() => setShowAddTask(true)} className="text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"><Plus size={13} /> Tugas Baru</button>
              </div>

              {sortedFilteredTasks.length === 0 && <EmptyRow>Tidak ada tugas di sini.</EmptyRow>}

              <div className="space-y-3">
                {sortedFilteredTasks.map((t) => {
                  const prio = PRIORITIES.find((p) => p.id === t.priority) || PRIORITIES[1];
                  const isExpanded = expandedTaskId === t.id;
                  const subDone = Array.isArray(t.subtasks) ? t.subtasks.filter((s) => s.done).length : 0;
                  const subTotal = Array.isArray(t.subtasks) ? t.subtasks.length : 0;
                  const isOverdue = !t.done && t.dueDate && t.dueDate < todayKey();

                  return (
                    <div key={t.id} className={`bg-white/[0.03] border rounded-xl p-4 transition ${t.done ? "border-white/5 opacity-60" : isOverdue ? "border-coral/40" : "border-white/10"}`}>
                      <div className="flex items-start gap-3">
                        <button onClick={() => toggleTaskDone(t.id)} className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${t.done ? "bg-lime border-lime" : "border-white/25 hover:border-lime"}`}>
                          {t.done && <Check size={13} className="text-black" strokeWidth={3} />}
                        </button>

                        <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : t.id)}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm truncate ${t.done ? "line-through text-white/40" : ""}`}>{t.title}</span>
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ backgroundColor: prio.color + "26", color: prio.color }}>{prio.label}</span>
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
                          <button onClick={() => setEditingTask(t)} className="text-white/30 hover:text-white p-1.5"><Edit2 size={13} /></button>
                          <button onClick={() => requestConfirm("Hapus Tugas?", `Tugas "${t.title}" akan dihapus.`, () => deleteTask(t.id))} className="text-white/30 hover:text-coral p-1.5"><Trash2 size={13} /></button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                          {t.description && <p className="text-xs text-white/60 mb-3 leading-relaxed">{t.description}</p>}
                          {Array.isArray(t.subtasks) && t.subtasks.length > 0 && (
                            <div className="space-y-1.5">
                              {t.subtasks.map((s) => (
                                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(t.id, s.id)} className="accent-lime w-3.5 h-3.5" />
                                  <span className={`text-xs ${s.done ? "line-through text-white/30" : "text-white/70"}`}>{s.text}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                  <button onClick={() => setWishlistFilter('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${wishlistFilter === 'all' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Semua</button>
                  <button onClick={() => setWishlistFilter('active')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${wishlistFilter === 'active' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Belum</button>
                  <button onClick={() => setWishlistFilter('bought')} className={`px-3 py-1.5 rounded-md text-[10px] font-medium ${wishlistFilter === 'bought' ? 'bg-white/10 text-white' : 'text-white/40'}`}>Sudah</button>
                </div>
              </div>

              <button onClick={() => setShowAddCategory(true)} className="mb-7 text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"><Plus size={13} /> Kategori Baru</button>

              {data.wishlistCategories.length === 0 && <EmptyRow>Belum ada wishlist.</EmptyRow>}

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
                        <button onClick={() => requestConfirm("Hapus Kategori?", "Kategori akan dihapus.", () => deleteWishlistCategory(cat.id))} className="text-white/20 hover:text-coral"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    {filteredItems.map((item) => {
                      const isItemExpanded = expandedWishlistId === item.id;
                      return (
                        <div key={item.id} className="border-b border-white/5 py-2.5">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={item.bought} onChange={() => toggleWishlistBought(cat.id, item.id)} className="accent-lime shrink-0 w-4 h-4" />
                            <div 
                              onClick={() => setExpandedWishlistId(isItemExpanded ? null : item.id)}
                              className={`flex-1 text-sm min-w-0 truncate cursor-pointer hover:text-lime transition ${item.bought ? "line-through text-white/30" : ""}`}
                            >
                              {item.name}
                            </div>
                            <div className={`text-sm tabular shrink-0 ${item.bought ? "text-white/30" : ""}`}>{rupiah(item.price)}</div>
                            <button onClick={() => requestConfirm("Hapus Barang?", "Barang akan dihapus.", () => deleteWishlistItem(cat.id, item.id))} className="text-white/15 hover:text-coral ml-1"><X size={13} /></button>
                          </div>
                          {isItemExpanded && (
                            <div className="mt-2.5 pl-7 flex items-center justify-between bg-white/[0.02] p-2 rounded-lg border border-white/10">
                              {item.link ? (
                                <a href={item.link.startsWith("http") ? item.link : `https://${item.link}`} target="_blank" rel="noopener noreferrer" className="text-xs text-teal hover:underline flex items-center gap-1.5 truncate mr-2">
                                  <ExternalLink size={13} /> Buka Link Marketplace
                                </a>
                              ) : (
                                <span className="text-[11px] text-white/30 italic">Belum ada link marketplace yang dimasukkan.</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={() => { setAddItemCategory(cat.id); setShowAddItem(true); }} className="mt-2.5 text-[11px] text-white/40 hover:text-lime flex items-center gap-1"><Plus size={11} /> Tambah barang</button>
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
                  <div className="font-semibold text-lime tabular text-sm">{rupiah(Number(data.overtimeRate || 0) / 173)}</div>
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

              <button onClick={() => setShowAddOvertime(true)} className="mb-7 text-xs text-lime border border-lime/30 rounded-lg px-3 py-2 flex items-center gap-1.5 hover:bg-lime/5 transition"><Plus size={13} /> Catat Lembur</button>

              {(!groupedOvertime || groupedOvertime.length === 0) && <EmptyRow>Belum ada catatan lembur.</EmptyRow>}

              {groupedOvertime?.map((g) => (
                <div key={g.label} className="mb-8">
                  <div className="text-sm font-semibold mb-2.5">{g.label}</div>
                  <div className="overflow-x-auto no-scrollbar swipe-ignore -mx-5 px-5 md:mx-0 md:px-0">
                    <table className="w-full text-xs min-w-[650px]">
                      <thead>
                        <tr className="text-white/40 text-left border-b border-white/10">
                          <th className="py-2 pr-2 font-normal">✓</th>
                          <th className="py-2 pr-2 font-normal">Jenis</th>
                          <th className="py-2 pr-2 font-normal">Tgl Lembur</th>
                          <th className="py-2 pr-2 font-normal text-right">Jam</th>
                          <th className="py-2 pr-2 font-normal text-right">Nominal</th>
                          <th className="py-2 pr-2 font-normal text-right">Terhitung</th>
                          <th className="py-2 pl-1 font-normal text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.entries?.map((e) => (
                          <tr key={e.id} className="border-b border-white/5">
                            <td className="py-2 pr-2">
                              <input type="checkbox" checked={e.paid} onChange={() => toggleOvertimePaid(e.id)} className="accent-lime w-4 h-4 cursor-pointer" />
                            </td>
                            <td className={`py-2 pr-2 ${e.jenis === "Libur" ? "text-coral" : "text-white/80"} ${!e.paid && "opacity-50"}`}>{e.jenis}</td>
                            <td className={`py-2 pr-2 tabular whitespace-nowrap ${e.paid ? "text-white/70" : "text-white/30"}`}>{formatDateID(e.date)}</td>
                            <td className={`py-2 pr-2 text-right tabular ${!e.paid && "opacity-50"}`}>{e.totalJam}</td>
                            <td className="py-2 pr-2 text-right tabular"><span className={e.paid ? "text-white" : "text-white/40"}>{rupiah(e.amount)}</span></td>
                            <td className={`py-2 pr-2 text-right tabular ${!e.paid && "opacity-50"}`}>{e.hrs}</td>
                            <td className="py-2 pl-1 text-right flex items-center justify-end gap-1">
                              <button onClick={() => setEditingOvertime(e)} className="text-white/30 hover:text-white p-1" title="Edit lembur"><Edit2 size={12} /></button>
                              <button onClick={() => requestConfirm("Hapus Lembur?", "Catatan lembur akan dihapus.", () => deleteOvertimeEntry(e.id))} className="text-white/20 hover:text-coral p-1" title="Hapus"><Trash2 size={12} /></button>
                            </td>
                          </tr>
                        ))}
                        <tr className="font-semibold">
                          <td colSpan={4} className="py-2 pr-2 pt-3">Total</td>
                          <td className="py-2 pr-2 pt-3 text-right tabular">
                            <div className="text-lime">{rupiah(g.totalCair)}</div>
                            {g.totalRp !== g.totalCair && <div className="text-[9px] text-white/40">dari {rupiah(g.totalRp)}</div>}
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
      </div>

      {activeTab === "home" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5 pointer-events-none">
          <button onClick={() => { setAddType("expense"); setShowAdd(true); }} className="bg-lime text-black font-semibold rounded-full px-6 py-3.5 flex items-center gap-2 cta-shadow active:scale-95 transition pointer-events-auto">
            <Plus size={17} strokeWidth={2.5} /> Catat Transaksi
          </button>
        </div>
      )}
      {activeTab === "lembur" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5 pointer-events-none">
          <button onClick={() => setShowAddOvertime(true)} className="bg-lime text-black font-semibold rounded-full px-6 py-3.5 flex items-center gap-2 cta-shadow active:scale-95 transition pointer-events-auto">
            <Plus size={17} strokeWidth={2.5} /> Catat Lembur
          </button>
        </div>
      )}
      {activeTab === "tasks" && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center px-5 pointer-events-none">
          <button onClick={() => setShowAddTask(true)} className="bg-lime text-black font-semibold rounded-full px-6 py-3.5 flex items-center gap-2 cta-shadow active:scale-95 transition pointer-events-auto">
            <Plus size={17} strokeWidth={2.5} /> Tugas Baru
          </button>
        </div>
      )}

      {routineStopTarget && (
        <RoutineStopSheet item={routineStopTarget} onClose={() => setRoutineStopTarget(null)} onStop={(stopIdx) => { updateRoutineEntry(routineStopTarget.id, { stopIndex: stopIdx }); setRoutineStopTarget(null); }} />
      )}

      {showSpaylaterHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md bg-surface rounded-2xl p-6 border border-white/10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-base flex items-center gap-2"><History size={16} className="text-lime" /> Riwayat Cicilan Selesai</div>
              <button onClick={() => setShowSpaylaterHistory(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {data.spaylater?.filter(item => item.isFinished).length === 0 ? (
                <div className="text-xs text-white/40 text-center py-8">Riwayat kosong</div>
              ) : (
                data.spaylater?.filter(item => item.isFinished).map((item) => (
                  <div key={item.id} className="bg-white/[0.03] border border-lime/30 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-semibold text-sm text-white truncate">{item.name}</div>
                        <span className="text-[10px] bg-lime/10 text-lime px-2 py-0.5 rounded-full font-medium">Lunas</span>
                      </div>
                      <div className="text-[11px] text-white/40">Mulai: {formatDateID(item.purchaseDate)} • Tenor: {item.tenor} Bln</div>
                      <div className="text-xs font-medium text-lime tabular mt-1">{rupiah(item.totalAmount)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => toggleSpaylaterFinished(item.id)} className="text-lime hover:bg-lime/10 p-2 rounded-lg transition" title="Batalkan status lunas (Cancel Finish)"><RotateCcw size={15} /></button>
                      <button onClick={() => requestConfirm("Hapus Riwayat?", "Riwayat akan dihapus.", () => deleteSpaylater(item.id))} className="text-white/30 hover:text-coral p-2"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setShowSpaylaterHistory(false)} className="mt-4 w-full bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg py-3 text-xs">Tutup</button>
          </div>
        </div>
      )}

      {activePopup && (
        <div className="fixed z-50 w-72 bg-surface border border-white/15 rounded-xl shadow-2xl p-4 text-left flex flex-col" style={{ left: activePopup.left, top: activePopup.top, maxHeight: '50vh' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Rincian {activePopup.typeLabel} {activePopup.label}</span>
            <button onClick={() => setActivePopup(null)} className="text-white/40 hover:text-white p-0.5"><X size={14} /></button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {activePopup.breakdown.map((b, idx) => (
              <div key={b.id || idx} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-white/70 truncate">{b.name}{b.installment ? <span className="text-white/30 ml-1">({b.installment}/{b.tenor})</span> : null}</span>
                <span className={`tabular shrink-0 ${b.paid ? "text-lime" : "text-white/80"}`}>{rupiah(b.amount)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs font-semibold mt-3 pt-2.5 border-t border-white/10 shrink-0">
            <span>Total</span><span className="tabular text-lime">{rupiah(activePopup.breakdown.reduce((s, b) => s + b.amount, 0))}</span>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-sm bg-surface rounded-2xl p-6 border border-white/10">
            <div className="font-semibold text-base mb-2">{confirmAction.title}</div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 bg-white/10 text-white font-semibold rounded-lg py-3 text-xs">Batal</button>
              <button onClick={confirmAction.onConfirm} className="flex-1 bg-coral text-black font-bold rounded-lg py-3 text-xs">Ya, Lanjutkan</button>
            </div>
          </div>
        </div>
      )}

      {topUpGoal && (
        <TopUpGoalSheet goal={topUpGoal} onClose={() => setTopUpGoal(null)} onSubmit={(amount) => { updateGoal(topUpGoal.id, { saved: topUpGoal.saved + amount }); setTopUpGoal(null); }} />
      )}

      {showAdd && (
        <TransactionSheet wallets={data.wallets} title="Catat Transaksi" defaultType={addType} onClose={() => setShowAdd(false)} onSubmit={(payload) => { addTransaction(payload); setShowAdd(false); }} />
      )}

      {editingTx && (
        <TransactionSheet wallets={data.wallets} title="Edit Transaksi" initialData={editingTx} onClose={() => setEditingTx(null)} onSubmit={(payload) => { updateTransaction(editingTx.id, payload); setEditingTx(null); }} />
      )}

      {showAddGoal && (
        <AddGoalSheet onClose={() => setShowAddGoal(false)} onSubmit={(payload) => { addGoal(payload); setShowAddGoal(false); }} />
      )}

      {showAddWallet && (
        <AddWalletSheet onClose={() => setShowAddWallet(false)} onSubmit={(name) => { addWallet(name); setShowAddWallet(false); }} />
      )}

      {showAddCategory && (
        <SingleFieldSheet title="Kategori Wishlist Baru" label="Nama kategori" placeholder="mis. Simulator Rig" submitLabel="Tambah Kategori" onClose={() => setShowAddCategory(false)} onSubmit={(name) => { addWishlistCategory(name); setShowAddCategory(false); }} />
      )}

      {showAddItem && (
        <AddWishlistItemSheet onClose={() => { setShowAddItem(false); setAddItemCategory(null); }} onSubmit={({ name, price, link }) => { addWishlistItem(addItemCategory, { name, price, link }); setShowAddItem(false); setAddItemCategory(null); }} />
      )}

      {showAddOvertime && (
        <AddOvertimeSheet onClose={() => setShowAddOvertime(false)} onSubmit={(payload) => { addOvertimeEntry(payload); setShowAddOvertime(false); }} />
      )}

      {editingOvertime && (
        <AddOvertimeSheet initialData={editingOvertime} onClose={() => setEditingOvertime(null)} onSubmit={(payload) => { updateOvertimeEntry(editingOvertime.id, payload); setEditingOvertime(null); }} />
      )}

      {showAddRoutine && (
        <AddRoutineSheet onClose={() => setShowAddRoutine(false)} onSubmit={(payload) => { addRoutineEntry(payload); setShowAddRoutine(false); }} />
      )}

      {editingRoutine && (
        <AddRoutineSheet initialData={editingRoutine} onClose={() => setEditingRoutine(null)} onSubmit={(payload) => { updateRoutineEntry(editingRoutine.id, payload); setEditingRoutine(null); }} />
      )}

      {showAddSpaylater && (
        <AddSpaylaterSheet onClose={() => setShowAddSpaylater(false)} onSubmit={(payload) => { addSpaylater(payload); setShowAddSpaylater(false); }} />
      )}

      {showAddTask && (
        <AddTaskSheet onClose={() => setShowAddTask(false)} onSubmit={(payload) => { addTask(payload); setShowAddTask(false); }} />
      )}

      {editingTask && (
        <AddTaskSheet
          initialData={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={(payload) => {
            updateTask(editingTask.id, {
              ...payload,
              subtasks: payload.subtasks.map((text, i) =>
                editingTask.subtasks[i]
                  ? { ...editingTask.subtasks[i], text }
                  : { id: crypto.randomUUID(), text, done: false }
              ),
            });
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

function AddWishlistItemSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [link, setLink] = useState("");
  const canSubmit = name.trim() && parseRupiahInput(price) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Barang Wishlist</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">Nama barang</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Shifter" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" autoFocus />
        
        <label className="text-[11px] text-white/40 font-medium">Harga</label>
        <input type="text" inputMode="numeric" value={price} onChange={(e) => setPrice(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-4 text-xl font-medium tabular outline-none focus:border-lime" />
        
        <label className="text-[11px] text-white/40 font-medium">Link Marketplace (Opsional)</label>
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://shopee.co.id/..." className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-xs outline-none focus-lime" />

        <button disabled={!canSubmit} onClick={() => onSubmit({ name: name.trim(), price: parseRupiahInput(price), link: link.trim() })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Tambah Barang</button>
      </div>
    </div>
  );
}

function AddTaskSheet({ onClose, onSubmit, initialData }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [priority, setPriority] = useState(initialData?.priority || "medium");
  const [dueDate, setDueDate] = useState(initialData?.dueDate || "");
  const [subtasks, setSubtasks] = useState(initialData?.subtasks?.map((s) => s.text) || []);
  const [subtaskInput, setSubtaskInput] = useState("");

  const canSubmit = title.trim();

  function addSubtaskDraft() {
    if (!subtaskInput.trim()) return;
    setSubtasks((prev) => [...prev, subtaskInput.trim()]);
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

        <label className="text-[11px] text-white/40 font-medium">Tenggat Waktu (opsional)</label>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime text-white" />

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
              <div key={idx} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-3 py-2">
                <span className="text-xs text-white/70 truncate">{s}</span>
                <button onClick={() => removeSubtaskDraft(idx)} className="text-white/30 hover:text-coral shrink-0 ml-2"><X size={13} /></button>
              </div>
            ))}
          </div>
        )}

        <button disabled={!canSubmit} onClick={() => onSubmit({ title: title.trim(), description: description.trim(), priority, dueDate, subtasks })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 mt-2">Simpan Tugas</button>
      </div>
    </div>
  );
}

function TopUpGoalSheet({ goal, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const canSubmit = parseRupiahInput(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Nabung: {goal.name}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <div className="text-[11px] text-white/40 mb-1">Terkumpul: {rupiah(goal.saved)}</div>
        <label className="text-[11px] text-white/40 font-medium">Nominal ditabung (Rp)</label>
        <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-xl font-medium tabular outline-none focus-lime" autoFocus />
        <button disabled={!canSubmit} onClick={() => onSubmit(parseRupiahInput(amount))} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 flex items-center justify-center gap-1.5">Tambah <ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

function AddRoutineSheet({ onClose, onSubmit, initialData }) {
  const [name, setName] = useState(initialData?.name || "");
  const [amount, setAmount] = useState(initialData ? formatRupiahInput(initialData.amount) : "");
  const [startIndex, setStartIndex] = useState(initialData?.startIndex !== undefined ? String(initialData.startIndex) : "0");

  const canSubmit = name.trim() && parseRupiahInput(amount) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{initialData ? "Edit Rutin" : "Tambah Pengeluaran Rutin"}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama Pengeluaran Rutin</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Wifi / Listrik" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />

        <label className="text-[11px] text-white/40 font-medium">Mulai Dari Bulan Berapa?</label>
        <select value={startIndex} onChange={(e) => setStartIndex(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime text-white">
          {MONTHS.map((m, idx) => (
            <option key={idx} value={String(idx)} className="bg-surface text-white">
              {m}
            </option>
          ))}
        </select>

        <label className="text-[11px] text-white/40 font-medium">Nominal Per Bulan (Rp)</label>
        <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-6 text-xl font-medium tabular outline-none focus:border-lime" />

        <button disabled={!canSubmit} onClick={() => onSubmit({ name: name.trim(), amount: parseRupiahInput(amount), startIndex: Number(startIndex) })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Simpan</button>
      </div>
    </div>
  );
}

function RoutineStopSheet({ item, onClose, onStop }) {
  const [stopIndex, setStopIndex] = useState(String(Math.max(item.startIndex || 0, new Date().getMonth())));

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold text-base">Stop Berlangganan: {item.name}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <p className="text-xs text-white/60 mb-4 leading-relaxed">Pilih bulan terakhir pengeluaran rutin ini aktif. Bulan-bulan sebelumnya di tabel anggaran akan tetap aman/tersimpan, namun mulai bulan berikutnya otomatis berhenti.</p>

        <label className="text-[11px] text-white/40 font-medium">Aktif Terakhir Sampai Bulan:</label>
        <select value={stopIndex} onChange={(e) => setStopIndex(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime text-white">
          {MONTHS.map((m, idx) => {
            if (idx < (item.startIndex || 0)) return null;
            return (
              <option key={idx} value={String(idx)} className="bg-surface text-white">
                {m}
              </option>
            );
          })}
        </select>

        <button onClick={() => onStop(Number(stopIndex))} className="w-full bg-coral text-black font-semibold rounded-lg py-3.5 text-xs">Terapkan Stop Berlangganan</button>
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
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Cicilan SPayLater</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">Nama Barang</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Checkout Shopee" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime" />
        <label className="text-[11px] text-white/40 font-medium">Tanggal Pembelian</label>
        <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime" />
        <label className="text-[11px] text-white/40 font-medium">Total Harga (Rp)</label>
        <input type="text" inputMode="numeric" value={totalAmount} onChange={(e) => setTotalAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-5 text-xl font-medium tabular outline-none focus:border-lime" />
        <label className="text-[11px] text-white/40 font-medium">Tenor (Bulan)</label>
        <div className="flex gap-2 mt-1.5 mb-6">
          {["1", "3", "6", "12"].map((t) => (
            <button key={t} onClick={() => setTenor(t)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border ${tenor === t ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/70"}`}>
              {t === "1" ? "1x" : `${t} Bln`}
            </button>
          ))}
        </div>
        <button disabled={!canSubmit} onClick={() => onSubmit({ name: name.trim(), totalAmount: parseRupiahInput(totalAmount), tenor: Number(tenor), purchaseDate })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Simpan Cicilan</button>
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

  const canSubmit = parseRupiahInput(amount) > 0 && date && (type === "transfer" ? (fromWalletId && toWalletId && fromWalletId !== toWalletId) : walletId);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <div className="flex bg-white/[0.04] rounded-lg p-1 mb-5">
          {["expense", "income", "transfer"].map((t) => (
            <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-md text-[13px] font-medium ${type === t ? "bg-lime text-black" : "text-white/50"}`}>
              {t === "expense" ? "Pengeluaran" : t === "income" ? "Pemasukan" : "Transfer"}
            </button>
          ))}
        </div>
        <label className="text-[11px] text-white/40 font-medium">Tanggal Transaksi</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime text-white" />
        <label className="text-[11px] text-white/40 font-medium">Jumlah</label>
        <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-5 text-xl font-medium tabular outline-none focus:border-lime" />

        {type === "expense" && (
          <>
            <label className="text-[11px] text-white/40 font-medium">Kategori</label>
            <div className="grid grid-cols-3 gap-2 mt-1.5 mb-5">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setCategory(c.id)} className="rounded-lg px-2 py-2.5 text-xs font-medium border transition" style={category === c.id ? { backgroundColor: c.color, borderColor: c.color, color: "#0C0D0F" } : { backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
                  <div className="text-base mb-0.5">{c.emoji}</div>{c.label}
                </button>
              ))}
            </div>
          </>
        )}

        {type === "transfer" ? (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-[11px] text-white/40 font-medium">Dari Dompet</label>
              <div className="flex flex-col gap-1.5 mt-1.5">
                {wallets.map((w) => (
                  <button key={w.id} onClick={() => setFromWalletId(w.id)} className={`truncate rounded-lg px-3 py-2.5 text-xs font-medium border ${fromWalletId === w.id ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/70"}`}>{w.name}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] text-white/40 font-medium">Ke Dompet</label>
              <div className="flex flex-col gap-1.5 mt-1.5">
                {wallets.map((w) => (
                  <button key={w.id} onClick={() => setToWalletId(w.id)} className={`truncate rounded-lg px-3 py-2.5 text-xs font-medium border ${toWalletId === w.id ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/70"}`}>{w.name}</button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <label className="text-[11px] text-white/40 font-medium">Dompet</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5 mb-5">
              {wallets.map((w) => (
                <button key={w.id} onClick={() => setWalletId(w.id)} className={`truncate rounded-lg px-3 py-2 text-xs font-medium border ${walletId === w.id ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/70"}`}>{w.name}</button>
              ))}
            </div>
          </>
        )}

        <label className="text-[11px] text-white/40 font-medium">Catatan (opsional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan transaksi" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime" />
        <button disabled={!canSubmit} onClick={() => onSubmit({ amount: parseRupiahInput(amount), category, note, walletId, fromWalletId, toWalletId, type, date })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Simpan</button>
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
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">Nama dompet</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Rekening BCA" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime" />
        <button disabled={!name.trim()} onClick={() => onSubmit(name.trim())} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Tambah Dompet</button>
      </div>
    </div>
  );
}

function SingleFieldSheet({ title, label, placeholder, submitLabel, onClose, onSubmit }) {
  const [value, setValue] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">{label}</label>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime" />
        <button disabled={!value.trim()} onClick={() => onSubmit(value.trim())} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">{submitLabel}</button>
      </div>
    </div>
  );
}

function AddOvertimeSheet({ onClose, onSubmit, initialData }) {
  const [date, setDate] = useState(initialData?.date || todayKey());
  const [jenis, setJenis] = useState(initialData?.jenis || "Biasa");
  const [totalJam, setTotalJam] = useState(initialData ? String(initialData.totalJam) : "");
  const [paid, setPaid] = useState(initialData ? initialData.paid : true);

  const getAvailableMonths = (dateStr) => {
    if (!dateStr) return [];
    const d = new Date(dateStr + "T00:00:00");
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

function AddGoalSheet({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const canSubmit = name.trim() && parseRupiahInput(target) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Target Tabungan</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        <label className="text-[11px] text-white/40 font-medium">Nama Target</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Dana Darurat" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div>
            <label className="text-[11px] text-white/40 font-medium">Target (Rp)</label>
            <input type="text" inputMode="numeric" value={target} onChange={(e) => setTarget(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-white/[0.04] rounded-lg px-3 py-3 mt-1.5 text-sm tabular outline-none focus-lime" />
          </div>
          <div>
            <label className="text-[11px] text-white/40 font-medium">Terkumpul (Rp)</label>
            <input type="text" inputMode="numeric" value={saved} onChange={(e) => setSaved(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-white/[0.04] rounded-lg px-3 py-3 mt-1.5 text-sm tabular outline-none focus-lime" />
          </div>
        </div>
        <button disabled={!canSubmit} onClick={() => onSubmit({ name: name.trim(), target: parseRupiahInput(target), saved: parseRupiahInput(saved) })} className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5">Simpan Target</button>
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
        <button onClick={onCancel} className="text-white/40 hover:text-white"><X size={15} /></button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/10 rounded px-2.5 py-2 text-xs mb-3 outline-none text-white" />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] text-white/40">Target (Rp)</label>
          <input type="text" inputMode="numeric" value={target} onChange={(e) => setTarget(formatRupiahInput(e.target.value))} className="w-full bg-white/10 rounded px-2 py-1.5 text-xs outline-none text-white tabular" />
        </div>
        <div>
          <label className="text-[10px] text-white/40">Terkumpul (Rp)</label>
          <input type="text" inputMode="numeric" value={saved} onChange={(e) => setSaved(formatRupiahInput(e.target.value))} className="w-full bg-white/10 rounded px-2 py-1.5 text-xs outline-none text-white tabular" />
        </div>
      </div>
      <button onClick={() => onSave({ name: name.trim(), target: parseRupiahInput(target), saved: parseRupiahInput(saved) })} className="w-full bg-lime text-black font-semibold rounded py-2 text-xs flex items-center justify-center gap-1">
        <Check size={14} /> Simpan Perubahan
      </button>
    </div>
  );
}
