import { useState } from "react";
import { X } from "lucide-react";
import { formatRupiahInput, parseRupiahInput } from "../../utils/format";

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

export default AddWishlistItemSheet;
