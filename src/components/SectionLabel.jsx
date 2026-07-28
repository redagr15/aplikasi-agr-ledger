function SectionLabel({ children, noMargin }) {
  return (
    <div className={`text-[11px] uppercase tracking-wider text-white/35 font-medium ${noMargin ? "" : "mb-3"}`}>
      {children}
    </div>
  );
}


export default SectionLabel;
