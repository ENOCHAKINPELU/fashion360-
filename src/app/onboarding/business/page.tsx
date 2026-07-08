import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BusinessDetailsForm } from "@/features/business/components/business-details-form";

export default function BusinessOnboardingPage() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Set up your business</CardTitle>
        <CardDescription>
          Tell us about your fashion business so we can tailor Fashion360 to how you work.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <BusinessDetailsForm mode="create" />
      </CardContent>
    </Card>
  );
}
