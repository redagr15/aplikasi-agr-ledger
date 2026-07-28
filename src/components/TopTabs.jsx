import { Home, Calendar, Heart, Clock, ListChecks } from "lucide-react";

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


export default TopTabs;
