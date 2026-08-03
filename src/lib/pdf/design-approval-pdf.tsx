import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E5F7EE",
    color: "#2BB673",
    fontSize: 10,
    fontWeight: 700,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  title: { fontSize: 20, marginBottom: 2, fontWeight: 700 },
  subtitle: { fontSize: 11, color: "#6F7287", marginBottom: 16 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6, color: "#6C3CF0" },
  metaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ECEAF5", paddingVertical: 5 },
  metaLabel: { flex: 1, color: "#6F7287" },
  metaValue: { flex: 2, fontWeight: 700 },
  previewImage: { width: 220, height: 260, objectFit: "cover", borderRadius: 6, marginTop: 8, marginBottom: 12 },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#1A1A2E", paddingTop: 10 },
  footerText: { fontSize: 9, color: "#6F7287" },
});

export interface DesignApprovalPdfProps {
  businessName: string;
  customerName: string;
  designerName: string;
  orderCode: string;
  designName: string;
  approvedVersionLabel: string;
  approvedAtLabel: string;
  previewImageUrl?: string;
  customizationRows: { label: string; value: string }[];
  measurementProfileName?: string;
  certificateId: string;
}

export function DesignApprovalPdfDocument({
  businessName,
  customerName,
  designerName,
  orderCode,
  designName,
  approvedVersionLabel,
  approvedAtLabel,
  previewImageUrl,
  customizationRows,
  measurementProfileName,
  certificateId,
}: DesignApprovalPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.badge}>APPROVED FOR PRODUCTION</Text>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>Design Approval Certificate</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Order</Text>
          <Text style={styles.metaValue}>{orderCode}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Design</Text>
          <Text style={styles.metaValue}>{designName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Customer</Text>
          <Text style={styles.metaValue}>{customerName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Designer</Text>
          <Text style={styles.metaValue}>{designerName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Approved Version</Text>
          <Text style={styles.metaValue}>{approvedVersionLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Approved On</Text>
          <Text style={styles.metaValue}>{approvedAtLabel}</Text>
        </View>
        {measurementProfileName && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Measurement Profile</Text>
            <Text style={styles.metaValue}>{measurementProfileName}</Text>
          </View>
        )}

        {previewImageUrl && <Image src={previewImageUrl} style={styles.previewImage} />}

        <Text style={styles.sectionTitle}>Customization Summary</Text>
        {customizationRows.map((row) => (
          <View style={styles.metaRow} key={row.label}>
            <Text style={styles.metaLabel}>{row.label}</Text>
            <Text style={styles.metaValue}>{row.value}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This certificate confirms the customer&apos;s explicit approval of the above design version for
            production. The approved version is locked and cannot be altered without creating a new design
            preview.
          </Text>
          <Text style={[styles.footerText, { marginTop: 6 }]}>Certificate ID: {certificateId}</Text>
        </View>
      </Page>
    </Document>
  );
}
