import { Image as ImageIcon } from "lucide-react";
import { ModulePlaceholder } from "@/shared/components/module-placeholder";

export default function DesignGalleryPage() {
  return (
    <ModulePlaceholder
      icon={ImageIcon}
      title="Design Gallery"
      description="A digital catalogue of designs by category, with favorites and customer collections."
    />
  );
}
