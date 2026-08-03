"use client";

import { Button } from "@/components/ui/button";
import { PenLine } from "lucide-react";
import { orderTypeOptions, orderPriorityOptions, deliveryMethodOptions } from "@/lib/validations/order";
import type { WizardState } from "./order-wizard";

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((opt) => opt.value === value)?.label ?? value;
}

function Section({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => onEdit(stepIndex)}>
          <PenLine className="size-3.5" /> Edit
        </Button>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

export function StepReview({
  state,
  onEditStep,
  onSubmit,
  submittingDraft,
  submittingConfirm,
}: {
  state: WizardState;
  onEditStep: (step: number) => void;
  onSubmit: (saveAsDraft: boolean) => void;
  submittingDraft: boolean;
  submittingConfirm: boolean;
}) {
  const subtotal =
    state.basePrice +
    state.pricing.fabricCost +
    state.pricing.customizationCost +
    state.pricing.additionalServicesCost;
  const totalValue = Math.max(0, subtotal + state.pricing.deliveryFee + state.pricing.tax - state.pricing.discount);

  const customizationEntries = Object.entries({
    Fabric: state.customization.fabricNameSnapshot,
    "Primary Colour": state.customization.primaryColor,
    "Secondary Colour": state.customization.secondaryColor,
    Pattern: state.customization.pattern,
    Sleeve: state.customization.sleeveStyle,
    Neckline: state.customization.neckline,
    Collar: state.customization.collarStyle,
    Length: state.customization.length,
    Buttons: state.customization.buttonStyle,
    Embroidery: state.customization.embroidery,
    Pocket: state.customization.pocketStyle,
    Cuff: state.customization.cuffStyle,
    Lining: state.customization.lining,
  }).filter(([, value]) => !!value);

  const submitting = submittingDraft || submittingConfirm;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">Review Order</h2>
        <p className="text-sm text-muted-foreground">Confirm every section before placing the order.</p>
      </div>

      <Section title="Customer" stepIndex={0} onEdit={onEditStep}>
        {state.selectedCustomer ? (
          <p>
            {state.selectedCustomer.firstName} {state.selectedCustomer.lastName} ·{" "}
            {state.selectedCustomer.phone ?? state.selectedCustomer.email ?? "N/A"}
          </p>
        ) : state.newCustomer ? (
          <p>
            {state.newCustomer.firstName} {state.newCustomer.lastName} (new customer) ·{" "}
            {state.newCustomer.phone || state.newCustomer.email || "N/A"}
          </p>
        ) : (
          <p>No customer selected</p>
        )}
      </Section>

      <Section title="Measurements" stepIndex={1} onEdit={onEditStep}>
        {state.selectedProfile ? (
          <p>
            {state.selectedProfile.name} {state.selectedProfile.isDefault ? "(Default)" : ""}
          </p>
        ) : (
          <p>No measurement profile attached</p>
        )}
      </Section>

      <Section title="Design" stepIndex={2} onEdit={onEditStep}>
        {state.isCustomDesign ? (
          <>
            <p>Custom design request</p>
            <p>{state.customDesignDescription || "No description provided"}</p>
            <p>Base price: ₦{state.basePrice.toLocaleString()}</p>
          </>
        ) : state.selectedDesign ? (
          <p>
            {state.selectedDesign.name} · {state.selectedDesign.category?.name ?? "Uncategorized"} · ₦
            {state.basePrice.toLocaleString()}
          </p>
        ) : (
          <p>No design selected</p>
        )}
      </Section>

      <Section title="Customization" stepIndex={3} onEdit={onEditStep}>
        {customizationEntries.length === 0 ? (
          <p>No customization details entered</p>
        ) : (
          <ul className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {customizationEntries.map(([label, value]) => (
              <li key={label}>
                <span className="text-foreground">{label}:</span> {value}
              </li>
            ))}
          </ul>
        )}
        {state.customization.accessories.length > 0 && (
          <p>Accessories: {state.customization.accessories.join(", ")}</p>
        )}
        {state.customization.customInstructions && <p>Notes: {state.customization.customInstructions}</p>}
        {state.customization.referenceImages.length > 0 && (
          <p>{state.customization.referenceImages.length} reference image(s) attached</p>
        )}
      </Section>

      <Section title="Order Details" stepIndex={4} onEdit={onEditStep}>
        <p>Type: {optionLabel(orderTypeOptions, state.orderType)}</p>
        <p>Priority: {optionLabel(orderPriorityOptions, state.priority)}</p>
        <p>Order date: {state.orderDate || "N/A"}</p>
        <p>Expected completion: {state.expectedCompletionDate || "N/A"}</p>
        <p>Event date: {state.eventDate || "N/A"}</p>
        <p>Occasion: {state.occasion || "N/A"}</p>
      </Section>

      <Section title="Delivery" stepIndex={4} onEdit={onEditStep}>
        <p>Method: {optionLabel(deliveryMethodOptions, state.deliveryMethod)}</p>
        {state.deliveryMethod === "DELIVERY" && <p>Address: {state.deliveryAddress || "N/A"}</p>}
      </Section>

      <Section title="Notes" stepIndex={4} onEdit={onEditStep}>
        <p>Customer notes: {state.customerNotes || "N/A"}</p>
        <p>Designer notes: {state.designerNotes || "N/A"}</p>
        <p>Private notes: {state.privateNotes || "N/A"}</p>
      </Section>

      <Section title="Price Summary" stepIndex={5} onEdit={onEditStep}>
        <p>Subtotal: ₦{subtotal.toLocaleString()}</p>
        <p className="font-medium text-foreground">Total Order Value: ₦{totalValue.toLocaleString()}</p>
        <p>Deposit Required: ₦{state.pricing.depositRequired.toLocaleString()}</p>
        <p>Outstanding Balance: ₦{totalValue.toLocaleString()}</p>
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={submitting}
          onClick={() => onSubmit(true)}
        >
          {submittingDraft ? "Saving..." : "Save as Draft"}
        </Button>
        <Button type="button" disabled={submitting} onClick={() => onSubmit(false)}>
          {submittingConfirm ? "Creating..." : "Confirm Order"}
        </Button>
      </div>
    </div>
  );
}
