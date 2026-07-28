import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./lib/supabaseClient";
import logoImg from "./assets/logo.png";
import { pdf } from "@react-pdf/renderer";
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
  Edit2,
  Check,
  Download,
  Upload,
  ArrowRightLeft,
  History,
  RotateCcw,
  Filter,
  AlertCircle,
  ExternalLink,
  Star,
  FileText
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

import { CATEGORIES, MONTHS, TAB_ORDER, WALLET_COLORS } from "./constants";
import {
  rupiah,
  formatRupiahInput,
  parseRupiahInput,
  toLocalISODate,
  todayKey,
  formatDateID,
} from "./utils/format";
import { getWeekRange, getWeeksInMonth, computeNextRecurDate } from "./utils/date";
import {
  emptyYearData,
  seedData,
  migrateData,
  computeAkhir,
  computeOvertime,
} from "./utils/data";

import FinancialHealthScore from "./components/FinancialHealthScore";
import WeeklyInsight from "./components/WeeklyInsight";
import SectionLabel from "./components/SectionLabel";
import EmptyRow from "./components/EmptyRow";
import TopTabs from "./components/TopTabs";
import TaskCard from "./components/TaskCard";
import MonthlyReportDocument from "./components/MonthlyReportDocument";
import ReportPickerSheet from "./components/ReportPickerSheet";

import TransactionSheet from "./components/sheets/TransactionSheet";
import AddWishlistItemSheet from "./components/sheets/AddWishlistItemSheet";
import SingleFieldSheet from "./components/sheets/SingleFieldSheet";
import AddGoalSheet from "./components/sheets/AddGoalSheet";
import TopUpGoalSheet from "./components/sheets/TopUpGoalSheet";
import EditGoalCard from "./components/sheets/EditGoalCard";
import AddSpaylaterSheet from "./components/sheets/AddSpaylaterSheet";
import AddTaskSheet from "./components/sheets/AddTaskSheet";
import AddWalletSheet from "./components/sheets/AddWalletSheet";
import AddOvertimeSheet from "./components/sheets/AddOvertimeSheet";
import AddRoutineSheet from "./components/sheets/AddRoutineSheet";
import RoutineStopSheet from "./components/sheets/RoutineStopSheet";

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
  const [showAllTx, setShowAllTx] = useState(false);

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
  const [walletEditListMode, setWalletEditListMode] = useState(false);
  const [routineStopTarget, setRoutineStopTarget] = useState(null);
  const [isRoutineCollapsed, setIsRoutineCollapsed] = useState(true);

  const [spaySearch, setSpaySearch] = useState("");
  const [spaySort, setSpaySort] = useState("default");

  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFilter, setTaskFilter] = useState("active");
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [showAddGoal, setShowAddGoal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [topUpGoal, setTopUpGoal] = useState(null);

  const [isEditingBudgetLimit, setIsEditingBudgetLimit] = useState(false);
  const [tempBudgetLimit, setTempBudgetLimit] = useState("");

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
  const [showSalaryHistory, setShowSalaryHistory] = useState(false);

  const [showReportPicker, setShowReportPicker] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);

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
    setShowAllTx(false);
  }, [filterCat]);

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

  function setPrimaryWallet(id) {
    setData((prev) => ({ ...prev, primaryWalletId: id }));
  }

  function addTask({ title, description, priority, dueDate, subtasks, recurring, recurDay }) {
    setData((prev) => ({
      ...prev,
      tasks: [
        {
          id: crypto.randomUUID(),
          title,
          description,
          priority,
          dueDate: recurring ? computeNextRecurDate(recurDay) : dueDate,
          done: false,
          createdAt: Date.now(),
          recurring: !!recurring,
          recurDay: recurring ? Number(recurDay) : null,
          subtasks: subtasks.map((s) => ({ id: s.id || crypto.randomUUID(), text: s.text, done: !!s.done })),
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
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        if (t.recurring) {
          const nextDue = computeNextRecurDate(t.recurDay, t.dueDate);
          return {
            ...t,
            done: false,
            dueDate: nextDue,
            subtasks: t.subtasks.map((s) => ({ ...s, done: false })),
          };
        }
        const newDone = !t.done;
        const newSubtasks = t.subtasks.map((s) => ({ ...s, done: newDone }));
        return { ...t, done: newDone, subtasks: newSubtasks };
      }),
    }));
  }

  function toggleSubtask(taskId, subtaskId) {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newSubtasks = t.subtasks.map((s) =>
          s.id === subtaskId ? { ...s, done: !s.done } : s
        );
        const allDone = newSubtasks.length > 0 && newSubtasks.every((s) => s.done);
        return { ...t, subtasks: newSubtasks, done: allDone };
      }),
    }));
  }

  // Kalau kategori wishlist ini terhubung ke sebuah Target Tabungan (goalId), samakan nominal
  // target-nya dengan total sisa keperluan (barang yang belum dibeli) di kategori itu.
  function recalcGoalForCategory(state, catId) {
    const cat = state.wishlistCategories.find((c) => c.id === catId);
    if (!cat || !cat.goalId) return state;
    const total = cat.items.filter((i) => !i.bought).reduce((s, i) => s + i.price, 0);
    return {
      ...state,
      goals: state.goals.map((g) => (g.id === cat.goalId ? { ...g, target: total } : g)),
    };
  }

  function addWishlistItem(catId, { name, price, link }) {
    setData((prev) => {
      const wishlistCategories = prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: [...c.items, { id: crypto.randomUUID(), name, price, link: link || "", bought: false }] } : c
      );
      return recalcGoalForCategory({ ...prev, wishlistCategories }, catId);
    });
  }

  const totals = useMemo(() => {
    if (!data) return { income: 0, expense: 0, balance: 0, monthSpent: 0, weekSpent: 0, monthIncome: 0, weekIncome: 0, weeksInCurrentMonth: 0 };
    
    const today = new Date();
    const currentMonthPrefix = toLocalISODate(today).slice(0, 7);
    const { start, end } = getWeekRange();

    let income = 0, expense = 0, monthSpent = 0, weekSpent = 0, monthIncome = 0, weekIncome = 0;

    for (const t of data.transactions) {
      if (t.type === "transfer") continue;
      
      if (t.type === "income") income += t.amount;
      else expense += t.amount;

      if (t.date) {
        const safeDate = t.date.slice(0, 10);
        const txDate = new Date(safeDate + "T00:00:00");
        const monthKey = safeDate.slice(0, 7);
        
        const isThisMonth = monthKey === currentMonthPrefix;
        const isThisWeek = txDate >= start && txDate <= end;

        if (t.type === "expense") {
          if (!t.routineId) { // pengeluaran rutin (biasanya nominal besar & tetap) tidak masuk plafon mingguan/bulanan
            if (isThisMonth) monthSpent += t.amount;
            if (isThisWeek) weekSpent += t.amount;
          }
        } else if (t.type === "income") {
          if (isThisMonth) monthIncome += t.amount;
          if (isThisWeek) weekIncome += t.amount;
        }
      }
    }

    // Budget selalu reset tiap periode (mingguan/bulanan) - tidak ada carry-over dari periode sebelumnya.
    const weeksInCurrentMonth = getWeeksInMonth(today.getFullYear(), today.getMonth());

    const balance = data.wallets.reduce((s, w) => s + w.balance, 0);
    return { income, expense, balance, monthSpent, weekSpent, monthIncome, weekIncome, weeksInCurrentMonth };
  }, [data]);

  const isWeekly = data?.budgetPeriod === "weekly";
  const currentSpent = isWeekly ? totals.weekSpent : totals.monthSpent;
  const currentIncome = isWeekly ? totals.weekIncome : totals.monthIncome;

  // data.budgetLimit selalu berarti limit MINGGUAN. Limit bulanan = limit mingguan x jumlah minggu di bulan berjalan.
  const weeklyLimit = data?.budgetLimit || 0;
  const weeksInCurrentMonth = totals.weeksInCurrentMonth || 0;
  const monthlyLimit = weeklyLimit * weeksInCurrentMonth;
  const effectiveBudget = isWeekly ? weeklyLimit : monthlyLimit;

  const remainingBudget = effectiveBudget - currentSpent;
  const budgetRatio = effectiveBudget > 0 ? Math.max(0, Math.min(1, remainingBudget / effectiveBudget)) : 0;

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
        const safeDate = t.date ? t.date.slice(0, 10) : "";
        if (!safeDate) continue;

        if (!txMap[safeDate]) txMap[safeDate] = { expense: 0, income: 0 };
        txMap[safeDate][t.type] += t.amount;
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
    return data.transactions
      .filter((t) => {
        const cat = CATEGORIES.find((c) => c.id === t.category);
        const matchesSearch = !search || (t.note || "").toLowerCase().includes(search.toLowerCase()) || (cat?.label || "").toLowerCase().includes(search.toLowerCase());
        if (filterCat === "all") return matchesSearch;
        return matchesSearch && t.type === "expense" && t.category === filterCat;
      })
      .sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA); 
        }
        return (b.ts || 0) - (a.ts || 0); 
      });
  }, [data, search, filterCat]);

  function updateBudgetCell(year, month, field, value) {
    setData((prev) => {
      const yearMonths = { ...prev.budgetYears[year].months };
      yearMonths[month] = { ...yearMonths[month], [field]: value };
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
      const d = new Date(item.purchaseDate.slice(0,10) + "T00:00:00");
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
      if (t.routineId) continue; // sudah dihitung di 'Rutin' pakai nominal aslinya, jangan dihitung lagi di sini
      const safeDate = t.date.slice(0,10);
      const d = new Date(safeDate + "T00:00:00");
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
          const safeDate = item.date.slice(0,10);
          const d = new Date(safeDate + "T00:00:00");
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

  const salaryByMonth = useMemo(() => {
    const map = {};
    (data?.salaryEntries || []).forEach((item) => {
      if (!item?.date) return;
      const safeDate = item.date.slice(0,10);
      const d = new Date(safeDate + "T00:00:00");
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map[key]) map[key] = [];
      map[key].push({ id: item.id, name: formatDateID(item.date), amount: item.amount });
    });
    return map;
  }, [data]);

  const overtimeAmountByMonth = useMemo(() => {
    const map = {};
    if (Array.isArray(data?.overtimeEntries)) {
      data.overtimeEntries.forEach((item) => {
        if (!item || !item.paid) return;
        const target = item.targetMonth || (item.date ? item.date.slice(0, 7) : todayKey().slice(0, 7));
        const [y, m] = target.split("-").map(Number);
        const key = `${y}-${m - 1}`;
        const { amount } = computeOvertime(data.overtimeRate || 0, item.jenis, item.totalJam || 0);
        map[key] = (map[key] || 0) + amount;
      });
    }
    return map;
  }, [data]);

  const routineByMonth = useMemo(() => {
    const map = {};
    if (Array.isArray(data?.routineEntries)) {
      // Kalau sebuah item rutin sudah dikaitkan ke transaksi nyata di bulan tertentu, pakai nominal
      // ASLI dari transaksi itu (bisa beda dari rencana) sebagai nominal Rutin bulan itu — bukan Rp0
      // dan bukan juga nominal rencana. Transaksinya sendiri dikecualikan dari 'Pengeluaran' (lihat
      // pengeluaranByMonth) supaya tidak dihitung dua kali.
      const linkedAmountByRoutineMonth = {};
      if (Array.isArray(data?.transactions)) {
        data.transactions.forEach((t) => {
          if (t.type === "expense" && t.routineId && t.date) {
            const d = new Date(t.date.slice(0, 10) + "T00:00:00");
            if (!isNaN(d.getTime())) {
              const linkKey = `${t.routineId}|${d.getFullYear()}-${d.getMonth()}`;
              linkedAmountByRoutineMonth[linkKey] = (linkedAmountByRoutineMonth[linkKey] || 0) + (t.amount || 0);
            }
          }
        });
      }

      data.routineEntries.forEach((item) => {
        if (!item) return;
        const startIdx = item.startIndex !== undefined ? Number(item.startIndex) : 0;
        const stopIdx = item.stopIndex !== undefined ? Number(item.stopIndex) : 11;

        for (let mIdx = startIdx; mIdx <= stopIdx; mIdx++) {
          const key = `${item.activeYear}-${mIdx}`;
          const linkKey = `${item.id}|${key}`;
          const isLinked = Object.prototype.hasOwnProperty.call(linkedAmountByRoutineMonth, linkKey);
          if (!map[key]) map[key] = [];
          map[key].push({
            id: item.id,
            name: item.name,
            amount: isLinked ? linkedAmountByRoutineMonth[linkKey] : item.amount,
            plannedAmount: item.amount,
            linked: isLinked,
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

    MONTHS.forEach((m, idx) => {
      const spaylaterList = spaylaterByMonth[`${yearKey}-${idx}`] || [];
      const totalCicilanOtomatis = spaylaterList.reduce((s, i) => s + i.amount, 0);

      const expList = pengeluaranByMonth[`${yearKey}-${idx}`] || [];
      const totalPengeluaranOtomatis = expList.reduce((s, i) => s + i.amount, 0);

      const incList = gajiTambahanByMonth[`${yearKey}-${idx}`] || [];
      const totalGajiTambahanOtomatis = incList.reduce((s, i) => s + i.amount, 0);

      const totalLemburBulanIni = overtimeAmountByMonth[`${yearKey}-${idx}`] || 0;

      let totalRutinOtomatis = 0;
      const rutListYE = routineByMonth[`${yearKey}-${idx}`] || [];
      totalRutinOtomatis = rutListYE.reduce((s, i) => s + i.amount, 0);

      const salList = salaryByMonth[`${yearKey}-${idx}`] || [];
      const rawGajiKotor = salList.reduce((s, i) => s + i.amount, 0);
      
      let finalGaji = 0;
      if (rawGajiKotor > 0) {
        finalGaji = Math.max(0, rawGajiKotor - totalLemburBulanIni);
      } else {
        finalGaji = yearMonths[m]?.gaji || 0;
      }

      const mRow = { 
        ...yearMonths[m], 
        gaji: finalGaji,
        cicilan: totalCicilanOtomatis,
        pengeluaran: totalPengeluaranOtomatis,
        gajiTambahan: totalGajiTambahanOtomatis + totalLemburBulanIni,
        rutin: totalRutinOtomatis,
      };
      runningBal = computeAkhir(mRow, runningBal);
    });

    return runningBal;
  }

  function computeMonthDetail(year, monthIndex) {
    const yearStr = String(year);
    if (!data.budgetYears[yearStr]) return null;
  
    const sortedYears = Object.keys(data.budgetYears).map(Number).sort((a, b) => a - b);
    const yIdx = sortedYears.indexOf(Number(yearStr));
  
    let baseJanSaldo = 0;
    if (yIdx > 0) {
      baseJanSaldo = computeYearEndBalance(String(sortedYears[yIdx - 1]), data.budgetYears);
    } else {
      baseJanSaldo = data.budgetYears[yearStr].months[MONTHS[0]]?.saldoAwal || 0;
    }
  
    const rawMonths = data.budgetYears[yearStr].months;
    let runningBalance = baseJanSaldo;
    let targetRow = null;
  
    for (let idx = 0; idx <= monthIndex; idx++) {
      const m = MONTHS[idx];
      const spaylaterList = spaylaterByMonth[`${yearStr}-${idx}`] || [];
      const totalCicilan = spaylaterList.reduce((s, i) => s + i.amount, 0);
      const expList = pengeluaranByMonth[`${yearStr}-${idx}`] || [];
      const totalPengeluaran = expList.reduce((s, i) => s + i.amount, 0);
      const incList = gajiTambahanByMonth[`${yearStr}-${idx}`] || [];
      const totalGajiTambahan = incList.reduce((s, i) => s + i.amount, 0);
      const totalLembur = overtimeAmountByMonth[`${yearStr}-${idx}`] || 0;
      const rutList = routineByMonth[`${yearStr}-${idx}`] || [];
      const totalRutin = rutList.reduce((s, i) => s + i.amount, 0);
      const salList = salaryByMonth[`${yearStr}-${idx}`] || [];
      const rawGajiKotor = salList.reduce((s, i) => s + i.amount, 0);
      const finalGaji = rawGajiKotor > 0 ? Math.max(0, rawGajiKotor - totalLembur) : (rawMonths[m]?.gaji || 0);
  
      const row = {
        ...(rawMonths[m] || { saldoAwal: 0, keterangan: "" }),
        gaji: finalGaji,
        cicilan: totalCicilan,
        pengeluaran: totalPengeluaran,
        gajiTambahan: totalGajiTambahan + totalLembur,
        rutin: totalRutin,
      };
      const saldoAwalRow = idx === 0 ? baseJanSaldo : runningBalance;
      const akhir = computeAkhir(row, saldoAwalRow);
  
      if (idx === monthIndex) {
        targetRow = {
          ...row,
          resolvedSaldoAwal: saldoAwalRow,
          resolvedSaldoAkhir: akhir,
          cicilanList: spaylaterList,
          pengeluaranList: expList,
          gajiTambahanList: [
            ...incList,
            ...(totalLembur > 0 ? [{ id: "lembur", name: "Lembur", amount: totalLembur }] : []),
          ],
          rutinList: rutList,
          salaryList: salList,
        };
      }
      runningBalance = akhir;
    }
  
    return targetRow;
  }

  async function handleGenerateReport(year, monthIndex) {
    setReportGenerating(true);
    try {
      const detail = computeMonthDetail(year, monthIndex);
      if (!detail) {
        showError("Data bulan ini tidak ditemukan.");
        return;
      }
      const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
      const monthTx = data.transactions.filter((t) => t.date && t.date.startsWith(prefix));
  
      const blob = await pdf(
        <MonthlyReportDocument year={year} monthIndex={monthIndex} detail={detail} transactions={monthTx} wallets={data.wallets} />
      ).toBlob();
  
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AGR-Ledger-Laporan-${MONTHS[monthIndex]}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setShowReportPicker(false);
    } catch (err) {
      showError("Gagal membuat laporan PDF.");
    } finally {
      setReportGenerating(false);
    }
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
    setData((prev) => {
      const goalId = crypto.randomUUID();
      return {
        ...prev,
        wishlistCategories: [...prev.wishlistCategories, { id: crypto.randomUUID(), name, items: [], goalId }],
        goals: [...prev.goals, { id: goalId, name, target: 0, saved: 0 }],
      };
    });
  }

  function deleteWishlistCategory(catId) {
    setData((prev) => ({
      ...prev,
      wishlistCategories: prev.wishlistCategories.filter((c) => c.id !== catId),
      // Target Tabungan yang tadinya terhubung TIDAK ikut terhapus — jadi tetap ada, cuma
      // berhenti sinkron otomatis (uang yang sudah ditabung ke situ tidak hilang).
    }));
  }

  function toggleWishlistBought(catId, itemId) {
    setData((prev) => {
      const wishlistCategories = prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, bought: !i.bought } : i)) } : c
      );
      return recalcGoalForCategory({ ...prev, wishlistCategories }, catId);
    });
  }

  function deleteWishlistItem(catId, itemId) {
    setData((prev) => {
      const wishlistCategories = prev.wishlistCategories.map((c) =>
        c.id === catId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
      );
      return recalcGoalForCategory({ ...prev, wishlistCategories }, catId);
    });
  }

  function addSpaylater({ name, totalAmount, tenor, purchaseDate, walletId }) {
    setData((prev) => ({
      ...prev,
      spaylater: [
        {
          id: crypto.randomUUID(),
          name,
          totalAmount: Number(totalAmount),
          tenor: Number(tenor),
          purchaseDate,
          walletId,
          monthlyPayment: Math.round(Number(totalAmount) / Number(tenor)),
          isFinished: false,
          paidChecklist: Array(Number(tenor)).fill(false),
        },
        ...prev.spaylater,
      ],
    }));
  }

  function toggleSpaylaterPaid(id, index) {
    setData((prev) => {
      const item = prev.spaylater.find((s) => s.id === id);
      if (!item) return prev;

      const isPaid = item.paidChecklist[index];
      const newChecklist = item.paidChecklist.map((v, i) => isPaid ? (i >= index ? false : v) : (i <= index ? true : v));
      const allPaid = newChecklist.every(Boolean);

      let delta = 0;
      newChecklist.forEach((v, i) => {
        const old = item.paidChecklist[i];
        if (v && !old) delta += item.monthlyPayment;
        if (!v && old) delta -= item.monthlyPayment;
      });

      const wallets = item.walletId
        ? prev.wallets.map((w) => w.id === item.walletId ? { ...w, balance: w.balance - delta } : w)
        : prev.wallets;

      return {
        ...prev,
        spaylater: prev.spaylater.map((s) => s.id === id ? { ...s, paidChecklist: newChecklist, isFinished: allPaid } : s),
        wallets,
      };
    });
  }

  function toggleSpaylaterFinished(id) {
    setData((prev) => {
      const item = prev.spaylater.find((s) => s.id === id);
      if (!item) return prev;

      const nextFinished = !item.isFinished;
      const newChecklist = nextFinished ? Array(item.tenor).fill(true) : item.paidChecklist;

      let delta = 0;
      newChecklist.forEach((v, i) => {
        const old = item.paidChecklist[i];
        if (v && !old) delta += item.monthlyPayment;
      });

      const wallets = item.walletId && delta > 0
        ? prev.wallets.map((w) => w.id === item.walletId ? { ...w, balance: w.balance - delta } : w)
        : prev.wallets;

      return {
        ...prev,
        spaylater: prev.spaylater.map((s) => s.id === id ? { ...s, isFinished: nextFinished, paidChecklist: newChecklist } : s),
        wallets,
      };
    });
  }

  function deleteSpaylater(id) {
    setData((prev) => {
      const item = prev.spaylater.find((s) => s.id === id);
      if (!item) return prev;

      const paidCount = item.paidChecklist.filter(Boolean).length;
      const refund = paidCount * item.monthlyPayment;

      const wallets = item.walletId && refund > 0
        ? prev.wallets.map((w) => w.id === item.walletId ? { ...w, balance: w.balance + refund } : w)
        : prev.wallets;

      return {
        ...prev,
        spaylater: prev.spaylater.filter((s) => s.id !== id),
        wallets,
      };
    });
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

  function addTransaction({ amount, category, note, walletId, fromWalletId, toWalletId, type, date, routineId }) {
    setData((prev) => {
      const next = { ...prev };
      const txDate = date || todayKey();
      
      next.transactions = [
        { id: crypto.randomUUID(), amount, category, note, walletId, fromWalletId, toWalletId, type, date: txDate, ts: Date.now(), routineId: routineId || null },
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


  function addSalaryEntry({ amount, date, walletId }) {
    if (!date || !amount || !walletId) return;
    setData((prev) => ({
      ...prev,
      salaryEntries: [
        { id: crypto.randomUUID(), amount: Number(amount) || 0, date, walletId },
        ...(prev.salaryEntries || []),
      ],
      wallets: prev.wallets.map((w) =>
        w.id === walletId ? { ...w, balance: w.balance + (Number(amount) || 0) } : w
      ),
    }));
  }

  function deleteSalaryEntry(id) {
    setData((prev) => {
      const entry = (prev.salaryEntries || []).find((e) => e.id === id);
      if (!entry) return prev;
      return {
        ...prev,
        salaryEntries: prev.salaryEntries.filter((e) => e.id !== id),
        wallets: prev.wallets.map((w) =>
          w.id === entry.walletId ? { ...w, balance: w.balance - entry.amount } : w
        ),
      };
    });
  }

  function clearAllSalaryEntries() {
    setData((prev) => {
      const wallets = prev.wallets.map((w) => ({ ...w }));
      (prev.salaryEntries || []).forEach((entry) => {
        const w = wallets.find((w) => w.id === entry.walletId);
        if (w) w.balance -= entry.amount;
      });
      return { ...prev, salaryEntries: [], wallets };
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
      const remaining = prev.wallets.filter((w) => w.id !== id);
      return {
        ...prev,
        wallets: remaining,
        primaryWalletId: prev.primaryWalletId === id ? remaining[0]?.id : prev.primaryWalletId,
        // Bersihkan semua referensi ke dompet yang dihapus supaya tidak ada data "yatim"
        transactions: prev.transactions.filter((t) =>
          t.type === "transfer"
            ? t.fromWalletId !== id && t.toWalletId !== id
            : t.walletId !== id
        ),
        salaryEntries: (prev.salaryEntries || []).filter((e) => e.walletId !== id),
        // Cicilan spaylater tidak dihapus, cukup diputus tautannya ke dompet
        // (rencana cicilannya tetap ada, tapi tidak lagi otomatis potong dompet manapun)
        spaylater: (prev.spaylater || []).map((s) =>
          s.walletId === id ? { ...s, walletId: null } : s
        ),
      };
    });
  }

  function getWalletDeletionImpact(id) {
    if (!data) return { txCount: 0, salaryCount: 0, spaylaterCount: 0, balance: 0 };
    const txCount = data.transactions.filter((t) =>
      t.type === "transfer" ? t.fromWalletId === id || t.toWalletId === id : t.walletId === id
    ).length;
    const salaryCount = (data.salaryEntries || []).filter((e) => e.walletId === id).length;
    const spaylaterCount = (data.spaylater || []).filter((s) => s.walletId === id).length;
    const wallet = data.wallets.find((w) => w.id === id);
    return { txCount, salaryCount, spaylaterCount, balance: wallet?.balance || 0 };
  }

  function moveWallet(id, direction) {
    setData((prev) => {
      const idx = prev.wallets.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "left" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.wallets.length) return prev;
      const wallets = [...prev.wallets];
      [wallets[idx], wallets[newIdx]] = [wallets[newIdx], wallets[idx]];
      return { ...prev, wallets };
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
    setData((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
      wishlistCategories: prev.wishlistCategories.map((c) => (c.goalId === id ? { ...c, goalId: null } : c)),
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
    const computedMonths = {};
    let runningBalance = baseJanSaldo;

    MONTHS.forEach((m, index) => {
      const spaylaterList = spaylaterByMonth[`${currentYearStr}-${index}`] || [];
      const totalCicilanOtomatis = spaylaterList.reduce((s, i) => s + i.amount, 0);

      const expList = pengeluaranByMonth[`${currentYearStr}-${index}`] || [];
      const totalPengeluaranOtomatis = expList.reduce((s, i) => s + i.amount, 0);

      const incList = gajiTambahanByMonth[`${currentYearStr}-${index}`] || [];
      const totalGajiTambahanOtomatis = incList.reduce((s, i) => s + i.amount, 0);

      const totalLemburBulanIni = overtimeAmountByMonth[`${currentYearStr}-${index}`] || 0;

      const rutList = routineByMonth[`${currentYearStr}-${index}`] || [];
      const totalRutinOtomatis = rutList.reduce((s, i) => s + i.amount, 0);

      const salList = salaryByMonth[`${currentYearStr}-${index}`] || [];
      const rawGajiKotor = salList.reduce((s, i) => s + i.amount, 0);

      let finalGaji = 0;
      if (rawGajiKotor > 0) {
        finalGaji = Math.max(0, rawGajiKotor - totalLemburBulanIni);
      } else {
        finalGaji = rawMonths[m]?.gaji || 0;
      }

      const row = {
        ...(rawMonths[m] || { saldoAwal: 0, keterangan: "" }),
        gaji: finalGaji,
        cicilan: totalCicilanOtomatis,
        pengeluaran: totalPengeluaranOtomatis,
        gajiTambahan: totalGajiTambahanOtomatis + totalLemburBulanIni,
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
  }, [data, spaylaterByMonth, pengeluaranByMonth, gajiTambahanByMonth, routineByMonth, overtimeAmountByMonth, salaryByMonth]);

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
    if (!data || !Array.isArray(data.tasks)) return { recurring: [], regular: [] };
    let list = [...data.tasks];
    if (taskFilter === "active") list = list.filter((t) => !t.done);
    if (taskFilter === "done") list = list.filter((t) => t.done);

    const priorityRank = { high: 0, medium: 1, low: 2 };
    const sortFn = (a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      return priorityRank[a.priority] - priorityRank[b.priority];
    };

    const recurring = list.filter((t) => t.recurring).sort(sortFn);
    const regular = list.filter((t) => !t.recurring).sort(sortFn);

    return { recurring, regular };
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
            <button onClick={() => setShowReportPicker(true)} className="w-8 h-8 flex items-center justify-center text-white/40 hover:text-lime active:scale-90 transition" title="Cetak laporan bulanan (PDF)"><FileText size={16} /></button>
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
                          stroke={remainingBudget < 0 ? "#FF7A6B" : "#C8FF4D"}
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - budgetRatio)}
                          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.3s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {remainingBudget < 0 ? (
                          <AlertCircle size={13} className="text-coral mb-1" />
                        ) : (
                          <Sparkles size={13} className="text-lime mb-1" />
                        )}
                        <div className="text-[10px] text-white/40 uppercase tracking-wider">Sisa</div>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] uppercase tracking-wider text-white/35 font-medium">Budget tersisa</span>
                          <button
                            onClick={() => setData(prev => ({ ...prev, budgetPeriod: isWeekly ? "monthly" : "weekly" }))}
                            className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70 hover:bg-white/20 transition flex items-center gap-1 cursor-pointer"
                          >
                            {isWeekly ? "MINGGUAN" : "BULANAN"} <ArrowRightLeft size={9} />
                          </button>
                        </div>
                        {!isEditingBudgetLimit ? (
                          <button onClick={() => { setIsEditingBudgetLimit(true); setTempBudgetLimit(formatRupiahInput(data.budgetLimit)); }} className="text-[10px] text-lime hover:underline flex items-center gap-1 shrink-0">
                            <Edit2 size={10} /> Ubah
                          </button>
                        ) : null}
                      </div>

                      {!isEditingBudgetLimit ? (
                        <div className={`font-semibold text-[32px] leading-none tabular tracking-tight mb-2 truncate ${remainingBudget < 0 ? "text-coral" : ""}`}>
                          {rupiah(remainingBudget)}
                        </div>
                      ) : (
                        <div className="mb-2">
                          <div className="flex items-center gap-1">
                            <input
                              autoFocus
                              type="text"
                              inputMode="numeric"
                              value={tempBudgetLimit}
                              onChange={(e) => setTempBudgetLimit(formatRupiahInput(e.target.value))}
                              className="w-full bg-white/10 text-sm px-2 py-1 rounded outline-none text-lime font-semibold tabular"
                            />
                            <button onClick={() => {
                              const val = parseRupiahInput(tempBudgetLimit);
                              if (val > 0) setData((prev) => ({ ...prev, budgetLimit: val }));
                              setIsEditingBudgetLimit(false);
                            }} className="text-lime hover:scale-110 bg-lime/10 p-1.5 rounded"><Check size={14} /></button>
                          </div>
                          <div className="text-[10px] text-white/30 mt-1">Ini limit per minggu (limit bulanan otomatis dihitung dari sini)</div>
                        </div>
                      )}

                      <div className="text-[11px] text-white/40 mb-3 flex flex-col gap-0.5">
                        <span>
                          Total Limit: <span className="text-white font-medium tabular">{rupiah(effectiveBudget)}</span>
                        </span>
                        {!isWeekly && (
                          <span className="text-white/30">
                            {rupiah(weeklyLimit)}/minggu × {weeksInCurrentMonth} minggu bulan ini
                          </span>
                        )}
                      </div>

                      <div className="flex gap-4">
                        <div>
                          <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5"><TrendingUp size={11} className="text-teal" /> Masuk</div>
                          <div className="font-medium text-sm tabular">{rupiah(currentIncome)}</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 text-[11px] text-white/40 mb-0.5"><TrendingDown size={11} className="text-coral" /> Keluar</div>
                          <div className="font-medium text-sm tabular">{rupiah(currentSpent)}</div>
                        </div>
                      </div>
                      <div className="text-[10px] text-white/25 mt-2">Pengeluaran yang dikaitkan ke pos Rutin tidak dihitung di sini.</div>

                      <button onClick={() => setShowSalaryHistory(true)} className="mt-3 text-[10px] text-lime hover:underline flex items-center gap-1">
                        <History size={10} /> Riwayat Gaji Kotor
                      </button>
                    </div>
                  </div>

                  <FinancialHealthScore data={data} budgetRatio={budgetRatio} totals={totals} />
                  <WeeklyInsight data={data} />

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
                      const linkedCat = data.wishlistCategories.find((c) => c.goalId === goal.id);
                      if (editingGoalId === goal.id) {
                        return <EditGoalCard key={goal.id} goal={goal} lockTarget={!!linkedCat} onSave={(updated) => updateGoal(goal.id, updated)} onCancel={() => setEditingGoalId(null)} />;
                      }
                      return (
                        <div key={goal.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                          <div className="flex items-center gap-2.5 mb-2">
                            <PiggyBank size={15} className="text-lime shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{goal.name}</div>
                              {linkedCat && (
                                <div className="text-[10px] text-teal/80 flex items-center gap-1 mt-0.5">
                                  <ExternalLink size={9} /> Tersambung ke Wishlist "{linkedCat.name}"
                                </div>
                              )}
                            </div>
                            <div className="text-[11px] text-white/40 tabular shrink-0">{rupiah(goal.saved)} / {rupiah(goal.target)}</div>
                            <div className="flex items-center gap-1 ml-2">
                              <button onClick={() => setTopUpGoal(goal)} className="text-black bg-lime hover:scale-105 p-1 rounded transition mr-1" title="Tambah tabungan"><Plus size={13} strokeWidth={2.5} /></button>
                              {!linkedCat && (
                                <button onClick={() => setEditingGoalId(goal.id)} className="text-white/30 hover:text-white p-1 transition"><Edit2 size={13} /></button>
                              )}
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
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] text-white/35 tabular">{rupiah(totals.balance)} total</div>
                      <button onClick={() => setWalletEditListMode(prev => !prev)} className={`text-[11px] border rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition ${walletEditListMode ? "bg-white/10 text-white border-white/30" : "text-white/70 border-white/20 hover:bg-white/5"}`}>
                        <Edit2 size={12} /> {walletEditListMode ? "Selesai" : "Edit List"}
                      </button>
                    </div>
                  </div>

                  {!walletEditListMode ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-9">
                      {data.wallets.map((w) => (
                        <div key={w.id} className="pl-3 pr-2.5 py-3 border-l-2 bg-white/[0.03] rounded-r-xl" style={{ borderColor: w.color }}>
                          <div className="text-[11px] text-white/60 truncate flex items-center gap-1 mb-1.5">
                            {data.primaryWalletId === w.id && <Star size={10} className="text-lime shrink-0" fill="#C8FF4D" />}
                            <span className="truncate">{w.name}</span>
                          </div>
                          <div className="font-medium text-sm tabular truncate">{rupiah(w.balance)}</div>
                        </div>
                      ))}
                      <button onClick={() => setShowAddWallet(true)} className="min-h-[72px] flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 transition border-2 border-dashed border-white/15 rounded-xl">
                        <Plus size={15} />
                        <span className="text-[10px]">Dompet Baru</span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 mb-9">
                      {data.wallets.map((w) => {
                        const isEditing = editingWalletId === w.id;
                        const isEditingBalance = editingBalanceId === w.id;
                        const canDeleteWallet = data.wallets.length > 1;
                        const walletIdx = data.wallets.findIndex((x) => x.id === w.id);
                        return (
                          <div key={w.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                            <div className="mb-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 mb-2">
                                  <input autoFocus value={editingWalletName} onChange={(e) => setEditingWalletName(e.target.value)} className="w-full bg-white/10 text-sm px-2.5 py-1.5 rounded-lg outline-none text-white" />
                                  <button onClick={() => updateWalletName(w.id, editingWalletName)} className="text-lime hover:scale-110 shrink-0 p-1"><Check size={16} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  {data.primaryWalletId === w.id && <Star size={11} className="text-lime shrink-0" fill="#C8FF4D" />}
                                  <span className="text-sm font-semibold truncate">{w.name}</span>
                                </div>
                              )}
                              {isEditingBalance ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    value={editingBalanceValue}
                                    onChange={(e) => setEditingBalanceValue(formatRupiahInput(e.target.value))}
                                    className="w-full bg-white/10 text-sm px-2.5 py-1.5 rounded-lg outline-none tabular text-lime font-medium"
                                  />
                                  <button onClick={() => { adjustWalletBalance(w.id, parseRupiahInput(editingBalanceValue)); setEditingBalanceId(null); }} className="text-lime hover:scale-110 shrink-0 p-1"><Check size={16} /></button>
                                </div>
                              ) : (
                                !isEditing && <div className="text-xs text-white/45 tabular">{rupiah(w.balance)}</div>
                              )}
                            </div>

                            <div className="flex items-center flex-wrap gap-1.5">
                              {!isEditing && (
                                <button onClick={() => { setEditingWalletId(w.id); setEditingWalletName(w.name); }} className="text-white/70 hover:text-white text-xs border border-white/15 bg-white/5 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition">
                                  <Edit2 size={12} /> Nama
                                </button>
                              )}
                              {!isEditingBalance && (
                                <button onClick={() => { setEditingBalanceId(w.id); setEditingBalanceValue(formatRupiahInput(w.balance)); }} className="text-white/70 hover:text-white text-xs border border-white/15 bg-white/5 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition">
                                  Saldo
                                </button>
                              )}
                              <button
                                onClick={() => moveWallet(w.id, "left")}
                                disabled={walletIdx === 0}
                                className="text-white/70 hover:text-white border border-white/15 bg-white/5 rounded-lg p-1.5 transition disabled:opacity-25 disabled:cursor-default"
                                title="Geser ke kiri"
                              >
                                <ChevronLeft size={14} />
                              </button>
                              <button
                                onClick={() => moveWallet(w.id, "right")}
                                disabled={walletIdx === data.wallets.length - 1}
                                className="text-white/70 hover:text-white border border-white/15 bg-white/5 rounded-lg p-1.5 transition disabled:opacity-25 disabled:cursor-default"
                                title="Geser ke kanan"
                              >
                                <ChevronRight size={14} />
                              </button>
                              {data.primaryWalletId !== w.id && (
                                <button onClick={() => setPrimaryWallet(w.id)} className="text-yellow-400 hover:text-yellow-300 border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-1.5 transition" title="Jadikan Dompet Utama">
                                  <Star size={14} />
                                </button>
                              )}
                              {canDeleteWallet && (
                                <button
                                  onClick={() => {
                                    const impact = getWalletDeletionImpact(w.id);
                                    const parts = [];
                                    if (impact.balance !== 0) parts.push(`saldo ${rupiah(impact.balance)}`);
                                    if (impact.txCount > 0) parts.push(`${impact.txCount} transaksi`);
                                    if (impact.salaryCount > 0) parts.push(`${impact.salaryCount} entry gaji`);
                                    if (impact.spaylaterCount > 0) parts.push(`${impact.spaylaterCount} cicilan spaylater (akan diputus tautannya)`);
                                    const detail = parts.length
                                      ? ` Dompet ini masih punya ${parts.join(", ")}. Data transaksi & gaji yang terkait akan ikut terhapus permanen.`
                                      : "";
                                    requestConfirm("Hapus Dompet?", `Dompet "${w.name}" akan dihapus.${detail}`, () => deleteWallet(w.id));
                                  }}
                                  className="text-coral hover:text-red-400 border border-coral/30 bg-coral/10 rounded-lg p-1.5 transition"
                                  title="Hapus"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <button onClick={() => setShowAddWallet(true)} className="w-full py-3 flex items-center justify-center gap-1.5 text-white/40 hover:text-white/70 transition border-2 border-dashed border-white/15 rounded-xl text-xs">
                        <Plus size={14} /> Dompet Baru
                      </button>
                    </div>
                  )}

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
                    {(showAllTx ? filteredTransactions : filteredTransactions.slice(0, 20)).map((t) => {
                      const cat = CATEGORIES.find((c) => c.id === t.category);
                      const isTransfer = t.type === "transfer";
                      const fromW = data.wallets.find((w) => w.id === t.fromWalletId)?.name || "Dompet";
                      const toW = data.wallets.find((w) => w.id === t.toWalletId)?.name || "Dompet";
                      const routineRef = t.routineId ? (data.routineEntries || []).find((r) => r.id === t.routineId) : null;

                      return (
                        <div key={t.id} className="group flex items-center justify-between py-3 border-b border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-base shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: isTransfer ? "#ffffff11" : t.type === "income" ? "#5EEAD733" : (cat?.color ? cat.color + "26" : "#ffffff11") }}>
                              {isTransfer ? <ArrowRightLeft size={14} className="text-white/70" /> : t.type === "income" ? "💰" : (cat?.emoji || "✨")}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                <span className="truncate">{t.note || (isTransfer ? "Transfer Saldo" : t.type === "income" ? "Pemasukan" : cat?.label)}</span>
                                {routineRef && <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-teal/20 text-teal">🔁 Rutin</span>}
                              </div>
                              <div className="text-[11px] text-white/35 truncate">
                                {formatDateID(t.date)} • {isTransfer ? `${fromW} ➔ ${toW}` : t.type === "income" ? "Pemasukan" : cat?.label}
                                {routineRef && <> • Rutin: {routineRef.name}</>}
                              </div>
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
                    {filteredTransactions.length > 20 && (
                      <button
                        onClick={() => setShowAllTx((prev) => !prev)}
                        className="w-full mt-3 py-2.5 text-xs font-medium text-white/60 hover:text-white border border-white/10 hover:bg-white/[0.04] rounded-lg transition flex items-center justify-center gap-1.5"
                      >
                        {showAllTx ? (
                          <>Sembunyikan <ChevronUp size={13} /></>
                        ) : (
                          <>Lihat semua ({filteredTransactions.length}) <ChevronDown size={13} /></>
                        )}
                      </button>
                    )}
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
                      const lemburBulanIni = overtimeAmountByMonth[`${data.activeYear}-${index}`] || 0;

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

                          <td className="py-1.5 pr-3 text-right">
                            {(() => {
                              const salList = salaryByMonth[`${data.activeYear}-${index}`] || [];
                              const rawGajiKotor = salList.reduce((s, i) => s + i.amount, 0);
                              const hasSalaryRecord = rawGajiKotor > 0;

                              if (!hasSalaryRecord) {
                                return (
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={(data.budgetYears[String(data.activeYear)].months[m].gaji || 0) === 0 ? "" : (data.budgetYears[String(data.activeYear)].months[m].gaji || 0).toLocaleString("id-ID")}
                                    onChange={(e) => updateBudgetCell(data.activeYear, m, "gaji", Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                                    placeholder="0"
                                    className="w-24 bg-transparent text-right outline-none border-b border-transparent focus:border-lime tabular py-0.5 text-white"
                                  />
                                );
                              } else {
                                return (
                                  <span
                                    className="cursor-pointer border-b border-dotted border-lime/50 inline-block py-0.5 tabular text-white"
                                    onClick={(e) => handleTogglePopup(e, m, salList, "Gaji")}
                                  >
                                    {row.gaji.toLocaleString("id-ID")}
                                  </span>
                                );
                              }
                            })()}
                          </td>

                          <td className="py-1.5 pr-3 text-right tabular text-teal">
                            {(() => {
                              const incList = gajiTambahanByMonth[`${data.activeYear}-${index}`] || [];
                              const totalIncome = incList.reduce((s, i) => s + i.amount, 0);
                              const totalCombined = totalIncome + lemburBulanIni;
                              if (totalCombined <= 0) return <span>0</span>;
                              return (
                                <span
                                  className="cursor-pointer border-b border-dotted border-teal/50 inline-block py-0.5"
                                  onClick={(e) => handleTogglePopup(e, m, [
                                    ...incList,
                                    ...(lemburBulanIni > 0 ? [{ id: `lembur-${index}`, name: "Lembur", amount: lemburBulanIni }] : [])
                                  ], "Gaji Tambahan")}
                                >
                                  {totalCombined.toLocaleString("id-ID")}
                                </span>
                              );
                            })()}
                          </td>

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
                            <div className="text-[10px] text-teal mt-0.5">Potong dari: {data.wallets.find(w => w.id === item.walletId)?.name || "Dompet"}</div>
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

              {sortedFilteredTasks.recurring.length === 0 && sortedFilteredTasks.regular.length === 0 && (
                <EmptyRow>Tidak ada tugas di sini.</EmptyRow>
              )}

              {sortedFilteredTasks.recurring.length > 0 && (
                <div className="mb-6">
                  <SectionLabel>🔁 Tugas Rutin</SectionLabel>
                  <div className="space-y-3">
                    {sortedFilteredTasks.recurring.map((t) => (
                      <TaskCard
                        key={t.id}
                        t={t}
                        isExpanded={expandedTaskId === t.id}
                        onToggleExpand={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                        onToggleDone={() => toggleTaskDone(t.id)}
                        onToggleSubtask={(sid) => toggleSubtask(t.id, sid)}
                        onEdit={() => setEditingTask(t)}
                        onDelete={() => requestConfirm("Hapus Tugas?", `Tugas "${t.title}" akan dihapus.`, () => deleteTask(t.id))}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sortedFilteredTasks.recurring.length > 0 && sortedFilteredTasks.regular.length > 0 && (
                <div className="border-t border-white/10 mb-6" />
              )}

              {sortedFilteredTasks.regular.length > 0 && (
                <div>
                  <SectionLabel>Tenggat Waktu</SectionLabel>
                  <div className="space-y-3">
                    {sortedFilteredTasks.regular.map((t) => (
                      <TaskCard
                        key={t.id}
                        t={t}
                        isExpanded={expandedTaskId === t.id}
                        onToggleExpand={() => setExpandedTaskId(expandedTaskId === t.id ? null : t.id)}
                        onToggleDone={() => toggleTaskDone(t.id)}
                        onToggleSubtask={(sid) => toggleSubtask(t.id, sid)}
                        onEdit={() => setEditingTask(t)}
                        onDelete={() => requestConfirm("Hapus Tugas?", `Tugas "${t.title}" akan dihapus.`, () => deleteTask(t.id))}
                      />
                    ))}
                  </div>
                </div>
              )}
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

      {showSalaryHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md bg-surface rounded-2xl p-6 border border-white/10 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-base flex items-center gap-2"><History size={16} className="text-lime" /> Riwayat Gaji Kotor</div>
              <button onClick={() => setShowSalaryHistory(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {(!data.salaryEntries || data.salaryEntries.length === 0) ? (
                <div className="text-xs text-white/40 text-center py-8">Belum ada riwayat gaji</div>
              ) : (
                [...data.salaryEntries].sort((a, b) => b.date.localeCompare(a.date)).map((item) => (
                  <div key={item.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm text-white truncate">{formatDateID(item.date)}</div>
                      <div className="text-[11px] text-white/40 mt-0.5">{data.wallets.find(w => w.id === item.walletId)?.name || "Dompet dihapus"}</div>
                      <div className="text-xs font-medium text-lime tabular mt-1">{rupiah(item.amount)}</div>
                    </div>
                    <button onClick={() => requestConfirm("Hapus Riwayat Gaji?", "Entri gaji kotor ini akan dihapus.", () => deleteSalaryEntry(item.id))} className="text-white/30 hover:text-coral p-2"><Trash2 size={15} /></button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {data.salaryEntries && data.salaryEntries.length > 0 && (
                <button 
                  onClick={() => requestConfirm("Hapus Semua Riwayat Gaji?", "Seluruh data riwayat gaji kotor akan dihapus permanen.", () => clearAllSalaryEntries())} 
                  className="flex-1 bg-coral/10 border border-coral/30 hover:bg-coral/20 text-coral font-semibold rounded-lg py-3 text-xs transition"
                >
                  Hapus Semua
                </button>
              )}
              <button onClick={() => setShowSalaryHistory(false)} className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg py-3 text-xs transition">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {showReportPicker && (
        <ReportPickerSheet
          years={budgetYearsList}
          defaultYear={data.activeYear}
          defaultMonthIndex={new Date().getMonth()}
          generating={reportGenerating}
          onClose={() => setShowReportPicker(false)}
          onGenerate={handleGenerateReport}
        />
      )}

      {activePopup && (
        <div className="fixed z-50 w-72 bg-surface border border-white/15 rounded-xl shadow-2xl p-4 text-left flex flex-col" style={{ left: activePopup.left, top: activePopup.top, maxHeight: '50vh' }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Rincian {activePopup.typeLabel} {activePopup.label}</span>
            <button onClick={() => setActivePopup(null)} className="text-white/40 hover:text-white p-0.5"><X size={14} /></button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {activePopup.breakdown.map((b, idx) => (
              <div key={b.id || idx} className="flex flex-col gap-0.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/70 truncate min-w-0 flex-1">
                    {b.name}{b.installment ? <span className="text-white/30 ml-1">({b.installment}/{b.tenor})</span> : null}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className={`tabular ${b.paid || b.linked ? "text-lime" : "text-white/80"}`}>
                      {b.linked && b.plannedAmount !== undefined
                        ? `${rupiah(b.amount)} / ${rupiah(b.plannedAmount)}`
                        : rupiah(b.amount)}
                    </span>
                    {activePopup.typeLabel === "Gaji" && !String(b.id).startsWith("lembur") && (
                      <button onClick={() => { deleteSalaryEntry(b.id); setActivePopup(null); }} className="text-white/30 hover:text-coral"><Trash2 size={12} /></button>
                    )}
                  </span>
                </div>
                {b.linked && <span className="text-lime/70 text-[10px]">✓ tercatat via transaksi</span>}
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
        <TransactionSheet wallets={data.wallets} primaryWalletId={data.primaryWalletId} routineEntries={data.routineEntries} title="Catat Transaksi" defaultType={addType} onClose={() => setShowAdd(false)} onSubmit={(payload) => { addTransaction(payload); setShowAdd(false); }} onSalarySubmit={(payload) => { addSalaryEntry({ ...payload, walletId: data.primaryWalletId || data.wallets[0]?.id }); setShowAdd(false); }} />
      )}

      {editingTx && (
        <TransactionSheet wallets={data.wallets} primaryWalletId={data.primaryWalletId} routineEntries={data.routineEntries} title="Edit Transaksi" initialData={editingTx} onClose={() => setEditingTx(null)} onSubmit={(payload) => { updateTransaction(editingTx.id, payload); setEditingTx(null); }} />
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
        <AddSpaylaterSheet wallets={data.wallets} primaryWalletId={data.primaryWalletId} onClose={() => setShowAddSpaylater(false)} onSubmit={(payload) => { addSpaylater(payload); setShowAddSpaylater(false); }} />
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
              title: payload.title,
              description: payload.description,
              priority: payload.priority,
              dueDate: payload.dueDate,
              subtasks: payload.subtasks,
              recurring: payload.recurring,
              recurDay: payload.recurDay,
            });
            setEditingTask(null);
          }}
        />
      )}
    </div>
  );
}

