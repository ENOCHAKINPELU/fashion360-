import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 2, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#6F7287", marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 16 },
  meta: { fontSize: 9, color: "#6F7287" },
  categoryTitle: { fontSize: 12, fontWeight: 700, marginTop: 14, marginBottom: 6, color: "#6C3CF0" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ECEAF5", paddingVertical: 5 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1A1A2E", paddingBottom: 6, marginBottom: 2 },
  cell: { flex: 1 },
  headerCell: { flex: 1, fontWeight: 700 },
  notesBlock: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#ECEAF5", paddingTop: 10 },
});

export interface MeasurementSheetRow {
  category: string;
  label: string;
  value: number;
}

export function MeasurementSheetPdfDocument({
  businessName,
  customerName,
  profileName,
  date,
  unit,
  fitPreference,
  rows,
  notes,
}: {
  businessName: string;
  customerName: string;
  profileName: string;
  date: string;
  unit: string;
  fitPreference?: string;
  rows: MeasurementSheetRow[];
  notes?: string[];
}) {
  const categories = Array.from(new Set(rows.map((r) => r.category)));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>Measurement Sheet</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>Customer: {customerName}</Text>
          <Text style={styles.meta}>Profile: {profileName}</Text>
          <Text style={styles.meta}>Date: {date}</Text>
          <Text style={styles.meta}>Unit: {unit}</Text>
          {fitPreference && <Text style={styles.meta}>Fit: {fitPreference}</Text>}
        </View>

        {categories.map((category) => (
          <View key={category}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <View style={styles.headerRow}>
              <Text style={styles.headerCell}>Measurement</Text>
              <Text style={styles.headerCell}>Value</Text>
            </View>
            {rows
              .filter((r) => r.category === category)
              .map((row) => (
                <View style={styles.row} key={row.label}>
                  <Text style={styles.cell}>{row.label}</Text>
                  <Text style={styles.cell}>
                    {row.value} {unit === "METRIC" ? "cm" : "in"}
                  </Text>
                </View>
              ))}
          </View>
        ))}

        {notes && notes.length > 0 && (
          <View style={styles.notesBlock}>
            <Text style={{ fontWeight: 700, marginBottom: 4 }}>Notes</Text>
            {notes.map((note, i) => (
              <Text key={i} style={{ marginBottom: 2 }}>
                • {note}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export interface ComparisonColumn {
  label: string;
  values: Record<string, number>;
}

export function MeasurementComparisonPdfDocument({
  businessName,
  customerName,
  fieldLabels,
  columns,
}: {
  businessName: string;
  customerName: string;
  fieldLabels: { key: string; label: string }[];
  columns: ComparisonColumn[];
}) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>Measurement Comparison: {customerName}</Text>

        <View style={styles.headerRow}>
          <Text style={styles.headerCell}>Measurement</Text>
          {columns.map((col) => (
            <Text style={styles.headerCell} key={col.label}>
              {col.label}
            </Text>
          ))}
        </View>
        {fieldLabels.map((field) => (
          <View style={styles.row} key={field.key}>
            <Text style={styles.cell}>{field.label}</Text>
            {columns.map((col) => (
              <Text style={styles.cell} key={col.label}>
                {col.values[field.key] ?? "N/A"}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
