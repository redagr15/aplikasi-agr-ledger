import { useState } from "react";
import { X } from "lucide-react";
import { formatRupiahInput, parseRupiahInput, todayKey } from "../../utils/format";

function AddSpaylaterSheet({ wallets, primaryWalletId, onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [tenor, setTenor] = useState("3");
  const [purchaseDate, setPurchaseDate] = useState(todayKey());
  const [walletId, setWalletId] = useState(primaryWalletId || wallets[0]?.id);

  const canSubmit = name.trim() && parseRupiahInput(totalAmount) > 0 && Number(tenor) > 0 && purchaseDate && walletId;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70">
      <div className="w-full max-w-md bg-surface rounded-t-2xl md:rounded-2xl p-5 pb-8 border-t md:border border-white/10 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-5">
          <div className="font-semibold text-base">Tambah Spaylater</div>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={19} /></button>
        </div>

        <label className="text-[11px] text-white/40 font-medium">Nama barang/transaksi</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Kredivo - Laptop" className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime" />

        <label className="text-[11px] text-white/40 font-medium">Total Tagihan (Rp)</label>
        <input type="text" inputMode="numeric" value={totalAmount} onChange={(e) => setTotalAmount(formatRupiahInput(e.target.value))} placeholder="0" className="w-full bg-transparent border-b border-white/10 py-2.5 mt-1.5 mb-4 text-xl font-medium tabular outline-none focus:border-lime" />

        <label className="text-[11px] text-white/40 font-medium">Tenor</label>
        <div className="grid grid-cols-4 gap-2 mt-1.5 mb-4">
          {[1, 3, 6, 12].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTenor(String(t))}
              className={`rounded-lg py-2.5 text-xs font-medium border transition ${Number(tenor) === t ? "bg-lime border-lime text-black font-semibold" : "bg-white/[0.03] border-white/10 text-white/70 hover:border-lime/50"}`}
            >
              {t} bln
            </button>
          ))}
        </div>

        <label className="text-[11px] text-white/40 font-medium">Tanggal Pembelian</label>
        <input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-4 text-sm outline-none focus-lime text-white" />

        <label className="text-[11px] text-white/40 font-medium">Dompet</label>
        <select value={walletId} onChange={(e) => setWalletId(e.target.value)} className="w-full bg-white/[0.04] rounded-lg px-3.5 py-3 mt-1.5 mb-6 text-sm outline-none focus-lime text-white" style={{ colorScheme: "dark" }}>
          {wallets.map((w) => (
            <option key={w.id} value={w.id} style={{ backgroundColor: "#1A1B1E", color: "#FFFFFF" }}>{w.name}</option>
          ))}
        </select>

        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ name: name.trim(), totalAmount: parseRupiahInput(totalAmount), tenor: Number(tenor), purchaseDate, walletId })}
          className="w-full bg-lime disabled:bg-white/10 disabled:text-white/30 text-black font-semibold rounded-lg py-3.5"
        >
          Tambah Spaylater
        </button>
      </div>
    </div>
  );
}

export default AddSpaylaterSheet;
