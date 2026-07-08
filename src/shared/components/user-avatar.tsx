import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-9", className)}>
      {image && <AvatarImage src={image} alt={name ?? "User"} />}
      <AvatarFallback className="bg-primary/10 font-medium text-primary">
        {name ? initials(name) : "?"}
      </AvatarFallback>
    </Avatar>
  );
}
