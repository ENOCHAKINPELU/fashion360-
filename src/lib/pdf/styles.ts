import { StyleSheet } from "@react-pdf/renderer";

export const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1c1917" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  businessName: { fontSize: 18, marginBottom: 4 },
  muted: { color: "#78716c" },
  docTitle: { fontSize: 14, textAlign: "right" },
  section: { marginBottom: 20 },
  label: { fontSize: 8, textTransform: "uppercase", color: "#78716c", marginBottom: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  table: { marginTop: 12, borderTop: "1 solid #e7e0d6" },
  tableRow: { flexDirection: "row", paddingVertical: 8, borderBottom: "1 solid #e7e0d6" },
  tableCellLeft: { flex: 3 },
  tableCellRight: { flex: 1, textAlign: "right" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalsLabel: { color: "#78716c" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, fontSize: 8, color: "#78716c", textAlign: "center" },
});
