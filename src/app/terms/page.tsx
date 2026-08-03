import { LandingHeader } from "@/features/landing/components/landing-header";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { WaitlistDialogProvider } from "@/features/landing/components/waitlist-dialog-provider";

// LandingHeader/LandingFooter both open the shared waitlist dialog, so any
// page reusing them (not just "/") needs this same provider.
export default function TermsPage() {
  return (
    <WaitlistDialogProvider>
      <div className="flex flex-1 flex-col">
        <LandingHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:py-20">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: placeholder, replace with your finalized terms before launch.</p>
          <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              These Terms of Service govern your use of Fashion360, a platform connecting fashion businesses and
              customers. By creating an account, you agree to these terms.
            </p>
            <p>
              This is placeholder content for the Phase 1 foundation. Replace it with your business&apos;s reviewed,
              legally-finalized Terms of Service before accepting real customer or business sign-ups in production.
            </p>
          </div>
        </main>
        <LandingFooter />
      </div>
    </WaitlistDialogProvider>
  );
}
