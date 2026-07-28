// Konstanta yang dipakai di banyak tempat (kategori, prioritas, nama bulan, urutan tab)
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

const WALLET_COLORS = ["#D4FF3F", "#7CE3FF", "#FF8FD8", "#FFB84D", "#B39CFF", "#6EE7B7", "#F472B6"];

export { CATEGORIES, PRIORITIES, MONTHS, TAB_ORDER, WALLET_COLORS };
