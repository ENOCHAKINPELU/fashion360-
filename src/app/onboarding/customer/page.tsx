import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CustomerProfileForm } from "@/features/customer-account/components/customer-profile-form";
import { FashionGoalPicker } from "@/features/personalization/components/fashion-goal-picker";

export default function CustomerOnboardingPage() {
  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Complete your Fashion Passport</CardTitle>
          <CardDescription>
            Tell us about your style so Fashion360 and the businesses you work with can serve you better. You can
            always update this later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomerProfileForm mode="onboarding" />
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardContent>
          <FashionGoalPicker />
        </CardContent>
      </Card>
    </div>
  );
}
