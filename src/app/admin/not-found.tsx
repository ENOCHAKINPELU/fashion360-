import { NotFoundState } from "@/shared/components/not-found-state";

export default function AdminNotFound() {
  return <NotFoundState message="This admin page doesn't exist." homeHref="/admin" homeLabel="Back to dashboard" />;
}
