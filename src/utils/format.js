// Fungsi bantu untuk format angka rupiah & tanggal
const rupiah = (n) => {
  const val = Math.round(n || 0);
  return val < 0 ? "-Rp" + Math.abs(val).toLocaleString("id-ID") : "Rp" + val.toLocaleString("id-ID");
};

const formatRupiahInput = (val) => {
  const raw = String(val || "").replace(/[^0-9]/g, "");
  if (!raw) return "";
  return Number(raw).toLocaleString("id-ID");
};

const parseRupiahInput = (val) => {
  const raw = String(val || "").replace(/[^0-9]/g, "");
  return Number(raw) || 0;
};

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const todayKey = () => toLocalISODate(new Date());

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

export { rupiah, formatRupiahInput, parseRupiahInput, toLocalISODate, todayKey, formatDateID };
