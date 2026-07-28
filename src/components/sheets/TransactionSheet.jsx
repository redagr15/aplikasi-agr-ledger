import { useState, useEffect, useMemo } from "react";
import { Check, X } from "lucide-react";
import { CATEGORIES } from "../../constants";
import { rupiah, formatRupiahInput, parseRupiahInput, todayKey } from "../../utils/format";

function TransactionSheet({ wallets, primaryWalletId, title, defaultType, initialData, routineEntries, onClose, onSubmit, onSalarySubmit }) {
  const [type, setType] = useState(initialData?.type || defaultType || "expense");
  const [amount, setAmount] = useState(initialData ? formatRupiahInput(initialData.amount) : "");
  const [category, setCategory] = useState(initialData?.category || CATEGORIES[0].id);
  const [note, setNote] = useState(initialData?.note || "");
  const [walletId, setWalletId] = useState(initialData?.walletId || primaryWalletId || wallets[0]?.id);
  const [fromWalletId, setFromWalletId] = useState(initialData?.fromWalletId || wallets[0]?.id);
  const [toWalletId, setToWalletId] = useState(initialData?.toWalletId || (wallets.length > 1 ? wallets[1].id : wallets[0]?.id));
  const [date, setDate] = useState(initialData?.date || todayKey());
  const [routineId, setRoutineId] = useState(initialData?.routineId || "");

  const canSubmit = parseRupiahInput(amount) > 0 && date && (type === "salary" ? true : type === "transfer" ? (fromWalletId && toWalletId && fromWalletId !== toWalletId) : walletId);

  const activeRoutineOptions = useMemo(() => {
    if (!Array.isArray(routineEntries) || !date) return [];
    const d = new Date(date.slice(0, 10) + "T00:00:00");
    if (isNaN(d.getTime())) return [];
    const y = d.getFullYear();
    const mIdx = d.getMonth();
    return routineEntries.filter((r) => {
      const startIdx = r.startIndex !== undefined ? Number(r.startIndex) : 0;
      const stopIdx = r.stopIndex !== undefined ? Number(r.stopIndex) : 11;
      return Number(r.activeYear) === y && mIdx >= startIdx && mIdx <= stopIdx;
    });
  }, [routineEntries, date]);

  const transportRoutineMatch = useMemo(
    () => activeRoutineOptions.find((r) => r.name === "Transport") || null,
    [activeRoutineOptions]
  );

  // Kategori "Transport" otomatis dikaitkan ke pos rutin bernama persis "Transport" (kalau ada),
  // tanpa perlu pilih manual — nominal yang diisi user langsung ikut menjadi bagian dari plafon rutin itu.
  useEffect(() => {
    if (type !== "expense") return;
    if (category === "transport") {
      if (transportRoutineMatch && routineId !== transportRoutineMatch.id) {
        setRoutineId(transportRoutineMatch.id);
      }
    } else if (routineId) {
      const current = activeRoutineOptions.find((r) => r.id === routineId);
      if (current && current.name === "Transport") {
        setRoutineId("");
      }
    }
  }, [type, category, transportRoutineMatch, activeRoutineOptions]);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">{title}</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>
        
        <div className="flex gap-1 bg-white/[0.04] rounded-lg p-1 mb-5 overflow-x-auto">
          {[
            { id: "expense", label: "Keluar" },
            { id: "income", label: "Masuk" },
            { id: "salary", label: "Gaji" },
            { id: "transfer", label: "Transfer" },
          ].map((t) => (
            <button key={t.id} onClick={() => setType(t.id)} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium whitespace-nowrap transition ${type === t.id ? "bg-lime text-black font-semibold" : "text-white/50 hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tanggal {type === "salary" ? "Gajian" : "Transaksi"}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-5 text-sm outline-none focus-lime text-white" />
        
        <label className="text-[11px] text-white/40 font-medium">{type === "salary" ? "Total Gaji (Rp)" : "Jumlah (Rp)"}</label>
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

            {category === "transport" ? (
              transportRoutineMatch ? (
                <p className="text-[10.5px] text-lime/70 mb-5 leading-relaxed flex items-start gap-1">
                  <Check size={12} className="shrink-0 mt-0.5" />
                  <span>Otomatis dikaitkan ke pos rutin "Transport" (plafon {rupiah(transportRoutineMatch.amount)}/bulan). Nominal di atas langsung menambah pemakaian bulan ini, tidak dihitung dobel di "Pengeluaran".</span>
                </p>
              ) : (
                <p className="text-[10.5px] text-white/35 mb-5 leading-relaxed">
                  Belum ada pos rutin bernama persis "Transport". Buat dulu lewat tab Rutin (mis. plafon Rp150.000/bulan) supaya transaksi berkategori Transport otomatis kepotong dari situ.
                </p>
              )
            ) : (
              activeRoutineOptions.length > 0 && (
                <>
                  <label className="text-[11px] text-white/40 font-medium">Kaitkan dengan Pengeluaran Rutin (opsional)</label>
                  <select
                    value={routineId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setRoutineId(newId);
                      if (newId) {
                        setCategory("lainnya");
                        if (!amount) {
                          const picked = activeRoutineOptions.find((r) => r.id === newId);
                          if (picked) setAmount(formatRupiahInput(String(picked.amount)));
                        }
                      }
                    }}
                    className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-2 text-sm outline-none focus-lime text-white"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" style={{ backgroundColor: "#1A1B1E", color: "#FFFFFF" }}>Bukan pengeluaran rutin</option>
                    {activeRoutineOptions.map((r) => (
                      <option key={r.id} value={r.id} style={{ backgroundColor: "#1A1B1E", color: "#FFFFFF" }}>{r.name} ({rupiah(r.amount)}/bulan)</option>
                    ))}
                  </select>
                  <p className="text-[10.5px] text-white/35 mb-5 leading-relaxed">
                    Kalau dikaitkan, nominal yang kamu isi di atas akan jadi nominal "Rutin" bulan ini (menggantikan nominal rencana) — dan tidak dihitung dobel di "Pengeluaran".
                  </p>
                </>
              )
            )}
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
        ) : type === "salary" ? null : (
          <>
            <label className="text-[11px] text-white/40 font-medium">Dompet</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1.5 mb-5">
              {wallets.map((w) => (
                <button key={w.id} onClick={() => setWalletId(w.id)} className={`truncate rounded-lg px-3 py-2 text-xs font-medium border ${walletId === w.id ? "bg-lime text-black border-lime" : "bg-white/[0.03] border-white/10 text-white/70"}`}>{w.name}</button>
              ))}
            </div>
          </>
        )}

        {type !== "salary" && (
          <>
            <label className="text-[11px] text-white/40 font-medium">Catatan (opsional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan transaksi" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-xs outline-none focus-lime" />
          </>
        )}

        <button 
          disabled={!canSubmit} 
          onClick={() => {
            if (type === "salary") {
              onSalarySubmit({ amount: parseRupiahInput(amount), date, walletId: primaryWalletId || wallets[0]?.id });
            } else {
              onSubmit({ amount: parseRupiahInput(amount), category, note, walletId, fromWalletId, toWalletId, type, date, routineId: (type === "expense" && activeRoutineOptions.some(r => r.id === routineId)) ? routineId : null });
            }
          }} 
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5 mt-2 text-xs"
        >
          Simpan {type === "salary" ? "Gaji" : "Transaksi"}
        </button>
      </div>
    </div>
  );
}

export default TransactionSheet;
