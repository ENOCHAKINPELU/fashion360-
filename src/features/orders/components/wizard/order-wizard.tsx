"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { WizardStepper, WIZARD_STEPS } from "./wizard-stepper";
import { StepCustomer, type WizardCustomer } from "./step-customer";
import { StepMeasurements } from "./step-measurements";
import { StepDesign } from "./step-design";
import { StepCustomization } from "./step-customization";
import { StepDetails, type DetailsState } from "./step-details";
import { StepPricing } from "./step-pricing";
import { StepReview } from "./step-review";
import type {
  OrderDesignOption,
  OrderMeasurementProfileOption,
  OrderCustomizationData,
} from "@/features/orders/types";
import type { OrderPricingInput } from "@/lib/validations/order";

interface NewCustomerDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const EMPTY_CUSTOMIZATION: OrderCustomizationData = {
  fabricId: null,
  fabricNameSnapshot: null,
  primaryColor: null,
  secondaryColor: null,
  pattern: null,
  sleeveStyle: null,
  neckline: null,
  collarStyle: null,
  length: null,
  buttonStyle: null,
  embroidery: null,
  pocketStyle: null,
  cuffStyle: null,
  lining: null,
  accessories: [],
  customInstructions: null,
  referenceImages: [],
};

const EMPTY_PRICING: OrderPricingInput = {
  fabricCost: 0,
  customizationCost: 0,
  additionalServicesCost: 0,
  deliveryFee: 0,
  discount: 0,
  tax: 0,
  depositRequired: 0,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export interface WizardState {
  customerId?: string;
  selectedCustomer: WizardCustomer | null;
  newCustomer?: NewCustomerDraft;

  measurementProfileId?: string;
  selectedProfile: OrderMeasurementProfileOption | null;
  measurementSnapshot?: Record<string, number>;

  designId?: string;
  selectedDesign: OrderDesignOption | null;
  isCustomDesign: boolean;
  customDesignDescription: string;
  basePrice: number;

  customization: OrderCustomizationData;

  orderType: string;
  priority: string;
  orderDate: string;
  expectedCompletionDate: string;
  eventDate: string;
  occasion: string;
  deliveryMethod: string;
  deliveryAddress: string;
  customerNotes: string;
  designerNotes: string;
  privateNotes: string;
  assignedDesignerId: string;

  pricing: OrderPricingInput;

  reorderedFromId?: string;
}

const INITIAL_STATE: WizardState = {
  customerId: undefined,
  selectedCustomer: null,
  newCustomer: undefined,

  measurementProfileId: undefined,
  selectedProfile: null,
  measurementSnapshot: undefined,

  designId: undefined,
  selectedDesign: null,
  isCustomDesign: false,
  customDesignDescription: "",
  basePrice: 0,

  customization: EMPTY_CUSTOMIZATION,

  orderType: "BESPOKE",
  priority: "NORMAL",
  orderDate: todayISO(),
  expectedCompletionDate: "",
  eventDate: "",
  occasion: "",
  deliveryMethod: "PICKUP",
  deliveryAddress: "",
  customerNotes: "",
  designerNotes: "",
  privateNotes: "",
  assignedDesignerId: "",

  pricing: EMPTY_PRICING,

  reorderedFromId: undefined,
};

export function OrderWizard({
  businessId,
  initialCustomerId,
  reorderFrom,
}: {
  businessId: string;
  initialCustomerId?: string;
  reorderFrom?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [maxReachedStep, setMaxReachedStep] = useState(0);
  const [state, setState] = useState<WizardState>({ ...INITIAL_STATE, customerId: initialCustomerId });
  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  function patch(update: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...update }));
  }

  // Prefill from reorder flow, if requested.
  useEffect(() => {
    if (!reorderFrom) return;
    fetch(`/api/orders/${reorderFrom}/reorder`)
      .then((res) => res.json())
      .then((data) => {
        const prefill = data.prefill;
        if (!prefill) return;
        setState((prev) => ({
          ...prev,
          reorderedFromId: prefill.reorderedFromId,
          customerId: prefill.customerId ?? prev.customerId,
          selectedCustomer: prefill.customer ?? prev.selectedCustomer,
          measurementProfileId: prefill.measurementProfileId ?? undefined,
          orderType: prefill.orderType ?? prev.orderType,
          occasion: prefill.occasion ?? "",
          deliveryMethod: prefill.deliveryMethod ?? prev.deliveryMethod,
          deliveryAddress: prefill.deliveryAddress ?? "",
          customerNotes: prefill.customerNotes ?? "",
          designId: prefill.item?.designId ?? undefined,
          selectedDesign: prefill.item?.designId
            ? {
                id: prefill.item.designId,
                designCode: "",
                name: prefill.item.designNameSnapshot ?? "",
                mainImageUrl: prefill.item.designImageSnapshot ?? null,
                basePrice: prefill.item.basePrice ?? null,
                category: prefill.item.designCategorySnapshot
                  ? { id: "", name: prefill.item.designCategorySnapshot }
                  : null,
                collection: null,
                description: null,
              }
            : null,
          isCustomDesign: prefill.item?.isCustomDesign ?? false,
          customDesignDescription: prefill.item?.customDesignDescription ?? "",
          basePrice: prefill.item?.basePrice ?? prev.basePrice,
          customization: prefill.item?.customization
            ? { ...EMPTY_CUSTOMIZATION, ...prefill.item.customization }
            : prev.customization,
        }));
      })
      .catch(() => toast.error("Could not load reorder details"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reorderFrom]);

  const detailsState: DetailsState = useMemo(
    () => ({
      orderType: state.orderType,
      priority: state.priority,
      orderDate: state.orderDate,
      expectedCompletionDate: state.expectedCompletionDate,
      eventDate: state.eventDate,
      occasion: state.occasion,
      deliveryMethod: state.deliveryMethod,
      deliveryAddress: state.deliveryAddress,
      customerNotes: state.customerNotes,
      designerNotes: state.designerNotes,
      privateNotes: state.privateNotes,
      assignedDesignerId: state.assignedDesignerId,
    }),
    [state]
  );

  const stepValidity = useMemo(() => {
    const hasCustomer = !!state.customerId || !!(state.newCustomer?.firstName && state.newCustomer?.lastName);
    const hasDesign = state.isCustomDesign
      ? state.customDesignDescription.trim().length > 0 && state.basePrice > 0
      : !!state.designId;
    const detailsValid =
      !!state.orderType &&
      !!state.priority &&
      !!state.orderDate &&
      (state.deliveryMethod !== "DELIVERY" || state.deliveryAddress.trim().length > 0) &&
      (!state.expectedCompletionDate || state.expectedCompletionDate >= state.orderDate) &&
      (!state.eventDate || state.eventDate >= state.orderDate);

    return [
      hasCustomer, // 0 Customer
      true, // 1 Measurements (optional)
      hasDesign, // 2 Design
      true, // 3 Customize (all optional)
      detailsValid, // 4 Details
      true, // 5 Pricing (defaults valid)
      true, // 6 Review
    ];
  }, [state]);

  function goToStep(index: number) {
    setStep(index);
    setMaxReachedStep((prev) => Math.max(prev, index));
  }

  function next() {
    if (!stepValidity[step]) return;
    const target = Math.min(step + 1, WIZARD_STEPS.length - 1);
    goToStep(target);
  }

  function back() {
    setStep((prev) => Math.max(0, prev - 1));
  }

  async function submit(saveAsDraft: boolean) {
    if (saveAsDraft) setSubmittingDraft(true);
    else setSubmittingConfirm(true);

    try {
      const body = {
        customerId: state.customerId,
        newCustomer: !state.customerId && state.newCustomer ? {
          firstName: state.newCustomer.firstName,
          lastName: state.newCustomer.lastName,
          email: state.newCustomer.email || undefined,
          phone: state.newCustomer.phone || undefined,
        } : undefined,
        measurementProfileId: state.measurementProfileId || undefined,
        measurementSnapshot: state.measurementSnapshot,
        item: {
          designId: state.isCustomDesign ? undefined : state.designId,
          isCustomDesign: state.isCustomDesign,
          customDesignDescription: state.isCustomDesign ? state.customDesignDescription : undefined,
          basePrice: state.basePrice,
          customization: {
            fabricId: state.customization.fabricId || undefined,
            fabricNameSnapshot: state.customization.fabricNameSnapshot || undefined,
            primaryColor: state.customization.primaryColor || undefined,
            secondaryColor: state.customization.secondaryColor || undefined,
            pattern: state.customization.pattern || undefined,
            sleeveStyle: state.customization.sleeveStyle || undefined,
            neckline: state.customization.neckline || undefined,
            collarStyle: state.customization.collarStyle || undefined,
            length: state.customization.length || undefined,
            buttonStyle: state.customization.buttonStyle || undefined,
            embroidery: state.customization.embroidery || undefined,
            pocketStyle: state.customization.pocketStyle || undefined,
            cuffStyle: state.customization.cuffStyle || undefined,
            lining: state.customization.lining || undefined,
            accessories: state.customization.accessories,
            customInstructions: state.customization.customInstructions || undefined,
            referenceImages: state.customization.referenceImages,
          },
        },
        orderType: state.orderType,
        priority: state.priority,
        orderDate: state.orderDate,
        expectedCompletionDate: state.expectedCompletionDate || undefined,
        eventDate: state.eventDate || undefined,
        occasion: state.occasion || undefined,
        deliveryMethod: state.deliveryMethod,
        deliveryAddress: state.deliveryAddress || undefined,
        customerNotes: state.customerNotes || undefined,
        designerNotes: state.designerNotes || undefined,
        privateNotes: state.privateNotes || undefined,
        pricing: state.pricing,
        saveAsDraft,
        assignedDesignerId: state.assignedDesignerId || undefined,
        reorderedFromId: state.reorderedFromId,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create order");

      toast.success(saveAsDraft ? "Order saved as draft" : "Order created");
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create order");
    } finally {
      setSubmittingDraft(false);
      setSubmittingConfirm(false);
    }
  }

  return (
    <div className="space-y-6" data-business-id={businessId}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Order</h1>
        <p className="text-sm text-muted-foreground">Walk through each step to place a new custom order.</p>
      </div>

      <Card>
        <CardContent className="space-y-6">
          <WizardStepper currentStep={step} maxReachedStep={maxReachedStep} onStepClick={goToStep} />

          <div>
            {step === 0 && (
              <StepCustomer
                customerId={state.customerId}
                selectedCustomer={state.selectedCustomer}
                newCustomer={state.newCustomer}
                onSelectCustomer={(customer) =>
                  patch({ customerId: customer?.id, selectedCustomer: customer ?? null })
                }
                onNewCustomerChange={(draft) => patch({ newCustomer: draft, customerId: undefined, selectedCustomer: null })}
              />
            )}
            {step === 1 && (
              <StepMeasurements
                customerId={state.customerId}
                measurementProfileId={state.measurementProfileId}
                onSelect={(profile) =>
                  patch({
                    measurementProfileId: profile?.id,
                    selectedProfile: profile,
                    measurementSnapshot: profile?.latestMeasurement?.values,
                  })
                }
              />
            )}
            {step === 2 && (
              <StepDesign
                designId={state.designId}
                selectedDesign={state.selectedDesign}
                isCustomDesign={state.isCustomDesign}
                customDesignDescription={state.customDesignDescription}
                basePrice={state.basePrice}
                onSelectDesign={(design) =>
                  patch({
                    designId: design.id,
                    selectedDesign: design,
                    basePrice: design.basePrice ?? state.basePrice,
                  })
                }
                onCustomDesignChange={(p) => patch(p)}
                onModeChange={(isCustom) =>
                  patch({
                    isCustomDesign: isCustom,
                    designId: isCustom ? undefined : state.designId,
                    selectedDesign: isCustom ? null : state.selectedDesign,
                  })
                }
              />
            )}
            {step === 3 && (
              <StepCustomization
                customization={state.customization}
                onChange={(p) => patch({ customization: { ...state.customization, ...p } })}
              />
            )}
            {step === 4 && <StepDetails state={detailsState} onChange={(p) => patch(p)} />}
            {step === 5 && (
              <StepPricing
                pricing={state.pricing}
                basePrice={state.basePrice}
                onChange={(p) => patch({ pricing: { ...state.pricing, ...p } })}
              />
            )}
            {step === 6 && (
              <StepReview
                state={state}
                onEditStep={goToStep}
                onSubmit={submit}
                submittingDraft={submittingDraft}
                submittingConfirm={submittingConfirm}
              />
            )}
          </div>

          {step < WIZARD_STEPS.length - 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={back} disabled={step === 0} className="gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button type="button" onClick={next} disabled={!stepValidity[step]} className="gap-1.5">
                Next <ArrowRight className="size-4" />
              </Button>
            </div>
          )}

          {step === WIZARD_STEPS.length - 1 && (
            <div className="flex items-center justify-start border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={back} className="gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
