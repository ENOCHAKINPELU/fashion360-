import { LoadingState } from "@/shared/components/loading-state";

// Next's own loading.tsx convention — shown for any /admin/* page while its
// server component is still fetching data. Reuses the same LoadingState
// every other loading state in the app already uses (customer panels,
// messaging), rather than introducing a second, admin-only loading look.
export default function AdminLoading() {
  return <LoadingState />;
}
