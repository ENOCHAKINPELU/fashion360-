import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { FinancialPdfLineItem } from "@/lib/pdf/quotation-pdf";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 20, marginBottom: 2, fontWeight: 700 },
  subtitle: { fontSize: 11, color: "#6F7287" },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#E5F7EE",
    color: "#2BB673",
    fontSize: 10,
    fontWeight: 700,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  metaCol: { alignItems: "flex-end" },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginTop: 16, marginBottom: 6, color: "#6C3CF0" },
  metaRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ECEAF5", paddingVertical: 5 },
  metaLabel: { flex: 1, color: "#6F7287" },
  metaValue: { flex: 2, fontWeight: 700 },
  table: { marginTop: 6 },
  tableHeader: { flexDirection: "row", backgroundColor: "#F5F3FC", paddingVertical: 6, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#ECEAF5" },
  colName: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  th: { fontWeight: 700, color: "#6F7287", fontSize: 9 },
  summaryRow: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 3 },
  summaryLabel: { width: 140, color: "#6F7287" },
  summaryValue: { width: 90, textAlign: "right", fontWeight: 700 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: "#1A1A2E" },
  totalLabel: { width: 140, fontWeight: 700 },
  totalValue: { width: 90, textAlign: "right", fontWeight: 700, fontSize: 12 },
  balanceValue: { width: 90, textAlign: "right", fontWeight: 700, fontSize: 12, color: "#E5484D" },
  footer: { marginTop: 24, borderTopWidth: 1, borderTopColor: "#1A1A2E", paddingTop: 10 },
  footerText: { fontSize: 9, color: "#6F7287", marginBottom: 4 },
});

export interface InvoicePdfProps {
  businessName: string;
  businessContact?: string;
  customerName: string;
  customerContact?: string;
  invoiceNumber: string;
  status: string;
  issueDateLabel: string;
  dueDateLabel?: string;
  orderCode: string;
  items: FinancialPdfLineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  additionalCharges: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  paymentInstructions?: string;
  paymentTerms?: string;
}

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoicePdfDocument(props: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{props.businessName}</Text>
            {props.businessContact && <Text style={styles.subtitle}>{props.businessContact}</Text>}
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.badge}>{props.status}</Text>
            <Text style={[styles.subtitle, { marginTop: 6 }]}>{props.invoiceNumber}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Invoice Details</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Customer</Text>
          <Text style={styles.metaValue}>{props.customerName}</Text>
        </View>
        {props.customerContact && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Contact</Text>
            <Text style={styles.metaValue}>{props.customerContact}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Order</Text>
          <Text style={styles.metaValue}>{props.orderCode}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Issue Date</Text>
          <Text style={styles.metaValue}>{props.issueDateLabel}</Text>
        </View>
        {props.dueDateLabel && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Due Date</Text>
            <Text style={styles.metaValue}>{props.dueDateLabel}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colName, styles.th]}>Item</Text>
            <Text style={[styles.colQty, styles.th]}>Qty</Text>
            <Text style={[styles.colPrice, styles.th]}>Unit Price</Text>
            <Text style={[styles.colTotal, styles.th]}>Total</Text>
          </View>
          {props.items.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colName}>{item.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{money(item.unitPrice, props.currency)}</Text>
              <Text style={styles.colTotal}>{money(item.subtotal, props.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 10 }}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{money(props.subtotal, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>-{money(props.discount, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>{money(props.tax, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{money(props.deliveryFee, props.currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{money(props.total, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={styles.summaryValue}>{money(props.amountPaid, props.currency)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance Due</Text>
            <Text style={styles.balanceValue}>{money(props.balanceDue, props.currency)}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {props.paymentInstructions && <Text style={styles.footerText}>Payment Instructions: {props.paymentInstructions}</Text>}
          {props.paymentTerms && <Text style={styles.footerText}>Payment Terms: {props.paymentTerms}</Text>}
        </View>
      </Page>
    </Document>
  );
}
