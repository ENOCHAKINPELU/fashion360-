import { Star } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function ReviewsPage() {
  return (
    <ModulePlaceholder
      icon={Star}
      title="Reviews"
      description="Customer ratings, written reviews, and finished-outfit photos."
    />
  );
}
