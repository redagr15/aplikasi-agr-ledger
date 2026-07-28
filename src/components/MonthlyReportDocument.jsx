import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { CATEGORIES, MONTHS } from "../constants";
import { rupiah, formatDateID } from "../utils/format";

const pdfStyles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, borderBottom: "2 solid #C8FF4D", paddingBottom: 12 },
  brand: { fontSize: 16, fontWeight: 700 },
  brandSub: { fontSize: 8, color: "#666", marginTop: 2 },
  periodBox: { textAlign: "right" },
  periodLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", letterSpacing: 1 },
  periodValue: { fontSize: 13, fontWeight: 700, marginTop: 2 },
  summaryGrid: { flexDirection: "row", gap: 8, marginBottom: 20 },
  summaryCard: { flex: 1, backgroundColor: "#f4f6f0", padding: 10, borderRadius: 4, borderLeft: "3 solid #8BB828" },
  summaryLabel: { fontSize: 7, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 12, fontWeight: 700 },
  sectionTitle: { fontSize: 10, fontWeight: 700, marginTop: 14, marginBottom: 6 },
  table: { borderTop: "1 solid #ddd", borderLeft: "1 solid #ddd" },
  tr: { flexDirection: "row", borderBottom: "1 solid #ddd" },
  thCell: { flex: 1, padding: 5, backgroundColor: "#111", color: "#fff", fontSize: 8, fontWeight: 700, borderRight: "1 solid #ddd" },
  tdCell: { flex: 1, padding: 5, fontSize: 8, borderRight: "1 solid #ddd" },
  tdCellRight: { flex: 1, padding: 5, fontSize: 8, borderRight: "1 solid #ddd", textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#f4f6f0", fontWeight: 700 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: "#999", borderTop: "1 solid #eee", paddingTop: 6 },
});

function MonthlyReportDocument({ year, monthIndex, detail, transactions, wallets }) {
  const monthName = MONTHS[monthIndex];
  const totalIncome = (detail.gaji || 0) + (detail.gajiTambahan || 0);
  const totalExpense = (detail.rutin || 0) + (detail.cicilan || 0) + (detail.pengeluaran || 0);

  const categoryBreakdown = CATEGORIES.map((c) => ({
    ...c,
    total: transactions.filter((t) => t.type === "expense" && !t.routineId && t.category === c.id).reduce((s, t) => s + t.amount, 0),
  })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);

  const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date) || a.ts - b.ts);

  return (
    <Document title={`Laporan AGR Ledger ${monthName} ${year}`}>
      <Page size="A4" style={pdfStyles.page} wrap>
        <View style={pdfStyles.headerRow}>
          <View>
            <Text style={pdfStyles.brand}>AGR Ledger</Text>
            <Text style={pdfStyles.brandSub}>Laporan Keuangan Bulanan</Text>
          </View>
          <View style={pdfStyles.periodBox}>
            <Text style={pdfStyles.periodLabel}>Periode</Text>
            <Text style={pdfStyles.periodValue}>{monthName} {year}</Text>
          </View>
        </View>

        <View style={pdfStyles.summaryGrid}>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Saldo Awal</Text>
            <Text style={pdfStyles.summaryValue}>{rupiah(detail.resolvedSaldoAwal)}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Pemasukan</Text>
            <Text style={pdfStyles.summaryValue}>{rupiah(totalIncome)}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Total Pengeluaran</Text>
            <Text style={pdfStyles.summaryValue}>{rupiah(totalExpense)}</Text>
          </View>
          <View style={pdfStyles.summaryCard}>
            <Text style={pdfStyles.summaryLabel}>Saldo Akhir</Text>
            <Text style={pdfStyles.summaryValue}>{rupiah(detail.resolvedSaldoAkhir)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>Rincian Pemasukan</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tr}>
            <Text style={pdfStyles.thCell}>Keterangan</Text>
            <Text style={[pdfStyles.thCell, { textAlign: "right", flex: 0.6 }]}>Jumlah</Text>
          </View>
          <View style={pdfStyles.tr}>
            <Text style={pdfStyles.tdCell}>Gaji Pokok</Text>
            <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(detail.gaji)}</Text>
          </View>
          {(detail.gajiTambahanList || []).map((item, idx) => (
            <View style={pdfStyles.tr} key={idx}>
              <Text style={pdfStyles.tdCell}>{item.name}</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(item.amount)}</Text>
            </View>
          ))}
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.tdCell}>Total Pemasukan</Text>
            <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(totalIncome)}</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>Rutin & Cicilan</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tr}>
            <Text style={pdfStyles.thCell}>Keterangan</Text>
            <Text style={[pdfStyles.thCell, { textAlign: "right", flex: 0.6 }]}>Jumlah</Text>
          </View>
          {(detail.rutinList || []).map((item, idx) => (
            <View style={pdfStyles.tr} key={"r" + idx}>
              <Text style={pdfStyles.tdCell}>{item.name} (Rutin)</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(item.amount)}</Text>
            </View>
          ))}
          {(detail.cicilanList || []).map((item, idx) => (
            <View style={pdfStyles.tr} key={"c" + idx}>
              <Text style={pdfStyles.tdCell}>{item.name} (Cicilan {item.installment}/{item.tenor})</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(item.amount)}</Text>
            </View>
          ))}
          {(detail.rutinList || []).length === 0 && (detail.cicilanList || []).length === 0 && (
            <View style={pdfStyles.tr}><Text style={[pdfStyles.tdCell, { flex: 1.6 }]}>Tidak ada pos rutin/cicilan bulan ini.</Text></View>
          )}
        </View>

        <Text style={pdfStyles.sectionTitle}>Pengeluaran per Kategori</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tr}>
            <Text style={pdfStyles.thCell}>Kategori</Text>
            <Text style={[pdfStyles.thCell, { textAlign: "right", flex: 0.6 }]}>Jumlah</Text>
            <Text style={[pdfStyles.thCell, { textAlign: "right", flex: 0.4 }]}>%</Text>
          </View>
          {categoryBreakdown.map((c) => (
            <View style={pdfStyles.tr} key={c.id}>
              <Text style={pdfStyles.tdCell}>{c.emoji} {c.label}</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(c.total)}</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.4 }]}>{detail.pengeluaran > 0 ? ((c.total / detail.pengeluaran) * 100).toFixed(1) + "%" : "0%"}</Text>
            </View>
          ))}
          {categoryBreakdown.length === 0 && (
            <View style={pdfStyles.tr}><Text style={[pdfStyles.tdCell, { flex: 2 }]}>Tidak ada pengeluaran tercatat bulan ini.</Text></View>
          )}
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.tdCell}>Total Pengeluaran Variabel</Text>
            <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(detail.pengeluaran)}</Text>
            <Text style={[pdfStyles.tdCellRight, { flex: 0.4 }]}></Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionTitle}>Detail Transaksi ({sortedTx.length})</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tr}>
            <Text style={[pdfStyles.thCell, { flex: 0.5 }]}>Tanggal</Text>
            <Text style={[pdfStyles.thCell, { flex: 1.3 }]}>Keterangan</Text>
            <Text style={[pdfStyles.thCell, { flex: 0.7 }]}>Tipe</Text>
            <Text style={[pdfStyles.thCell, { flex: 0.7, textAlign: "right" }]}>Jumlah</Text>
          </View>
          {sortedTx.map((t) => {
            const cat = CATEGORIES.find((c) => c.id === t.category);
            const label = t.type === "transfer" ? "Transfer" : t.type === "income" ? (t.note || "Pemasukan") : (t.note || cat?.label || "Pengeluaran");
            const typeLabel = t.type === "transfer" ? "Transfer" : t.type === "income" ? "Masuk" : (cat?.label || "Keluar");
            const sign = t.type === "transfer" ? "" : t.type === "income" ? "+" : "-";
            return (
              <View style={pdfStyles.tr} key={t.id}>
                <Text style={[pdfStyles.tdCell, { flex: 0.5 }]}>{formatDateID(t.date)}</Text>
                <Text style={[pdfStyles.tdCell, { flex: 1.3 }]}>{label}</Text>
                <Text style={[pdfStyles.tdCell, { flex: 0.7 }]}>{typeLabel}</Text>
                <Text style={[pdfStyles.tdCellRight, { flex: 0.7 }]}>{sign}{rupiah(t.amount)}</Text>
              </View>
            );
          })}
          {sortedTx.length === 0 && (
            <View style={pdfStyles.tr}><Text style={[pdfStyles.tdCell, { flex: 3.2 }]}>Tidak ada transaksi tercatat bulan ini.</Text></View>
          )}
        </View>

        <Text style={pdfStyles.sectionTitle}>Saldo Dompet (Saat Laporan Dibuat)</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tr}>
            <Text style={pdfStyles.thCell}>Dompet</Text>
            <Text style={[pdfStyles.thCell, { textAlign: "right", flex: 0.6 }]}>Saldo</Text>
          </View>
          {wallets.map((w) => (
            <View style={pdfStyles.tr} key={w.id}>
              <Text style={pdfStyles.tdCell}>{w.name}</Text>
              <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(w.balance)}</Text>
            </View>
          ))}
          <View style={pdfStyles.totalRow}>
            <Text style={pdfStyles.tdCell}>Total Saldo</Text>
            <Text style={[pdfStyles.tdCellRight, { flex: 0.6 }]}>{rupiah(wallets.reduce((s, w) => s + w.balance, 0))}</Text>
          </View>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text>Dibuat otomatis oleh AGR Ledger • {new Date().toLocaleString("id-ID")}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}


export default MonthlyReportDocument;
