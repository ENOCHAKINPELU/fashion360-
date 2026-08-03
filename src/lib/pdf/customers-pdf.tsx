import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#6F7287", marginBottom: 16 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ECEAF5", paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1A1A2E", paddingBottom: 6, marginBottom: 2 },
  cell: { flex: 1 },
  headerCell: { flex: 1, fontWeight: 700 },
});

export interface CustomerPdfRow {
  customerCode: string;
  name: string;
  phone: string;
  email: string;
  status: string;
}

export function CustomersPdfDocument({
  businessName,
  rows,
}: {
  businessName: string;
  rows: CustomerPdfRow[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{businessName}: Customers</Text>
        <Text style={styles.subtitle}>
          Exported {new Date().toLocaleDateString()} · {rows.length} customers
        </Text>
        <View style={styles.headerRow}>
          <Text style={styles.headerCell}>Customer ID</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Name</Text>
          <Text style={styles.headerCell}>Phone</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>Email</Text>
          <Text style={styles.headerCell}>Status</Text>
        </View>
        {rows.map((row) => (
          <View style={styles.row} key={row.customerCode}>
            <Text style={styles.cell}>{row.customerCode}</Text>
            <Text style={[styles.cell, { flex: 1.5 }]}>{row.name}</Text>
            <Text style={styles.cell}>{row.phone}</Text>
            <Text style={[styles.cell, { flex: 1.5 }]}>{row.email}</Text>
            <Text style={styles.cell}>{row.status}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
