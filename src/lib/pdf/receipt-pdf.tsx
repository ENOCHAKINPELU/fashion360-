import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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
  amountBlock: { marginTop: 16, alignItems: "center", paddingVertical: 16, backgroundColor: "#F5F3FC", borderRadius: 8 },
  amountLabel: { color: "#6F7287", marginBottom: 4 },
  amountValue: { fontSize: 24, fontWeight: 700, color: "#6C3CF0" },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#1A1A2E", paddingTop: 10 },
  footerText: { fontSize: 9, color: "#6F7287" },
});

export interface ReceiptPdfProps {
  businessName: string;
  receiptNumber: string;
  customerName: string;
  amount: number;
  currency: string;
  method: string;
  paymentDateLabel: string;
  invoiceNumber: string;
  orderCode: string;
  remainingBalance: number;
}

export function ReceiptPdfDocument(props: ReceiptPdfProps) {
  const money = (amount: number) =>
    `${props.currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.badge}>PAYMENT RECEIVED</Text>
        <Text style={styles.title}>{props.businessName}</Text>
        <Text style={styles.subtitle}>Payment Receipt</Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Receipt Number</Text>
          <Text style={styles.metaValue}>{props.receiptNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Customer</Text>
          <Text style={styles.metaValue}>{props.customerName}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Invoice</Text>
          <Text style={styles.metaValue}>{props.invoiceNumber}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Order</Text>
          <Text style={styles.metaValue}>{props.orderCode}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Payment Method</Text>
          <Text style={styles.metaValue}>{props.method}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Payment Date</Text>
          <Text style={styles.metaValue}>{props.paymentDateLabel}</Text>
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Amount Paid</Text>
          <Text style={styles.amountValue}>{money(props.amount)}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Remaining Balance</Text>
          <Text style={styles.metaValue}>{money(props.remainingBalance)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>This receipt confirms payment received directly by {props.businessName}.</Text>
        </View>
      </Page>
    </Document>
  );
}
