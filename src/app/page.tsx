import { LandingHeader } from "@/features/landing/components/landing-header";
import { HeroSection } from "@/features/landing/components/hero-section";
import { ProblemSection } from "@/features/landing/components/problem-section";
import { SolutionSection } from "@/features/landing/components/solution-section";
import { CraftsmanshipSection } from "@/features/landing/components/craftsmanship-section";
import { VisualizationSection } from "@/features/landing/components/visualization-section";
import { ProductExperienceSection } from "@/features/landing/components/product-experience-section";
import { ProtectionSection } from "@/features/landing/components/protection-section";
import { ForCustomersSection } from "@/features/landing/components/for-customers-section";
import { ForDesignersSection } from "@/features/landing/components/for-designers-section";
import { ComingSoonSection } from "@/features/landing/components/coming-soon-section";
import { LandingFooter } from "@/features/landing/components/landing-footer";
import { WaitlistDialogProvider } from "@/features/landing/components/waitlist-dialog-provider";
import { ScrollProgress } from "@/shared/components/motion/scroll-progress";
import { Cursor } from "@/shared/components/motion/cursor";
import { AmbientCursorLight } from "@/shared/components/motion/ambient-cursor-light";

export default function Home() {
  return (
    <WaitlistDialogProvider>
      <ScrollProgress />
      <Cursor />
      <AmbientCursorLight />
      <div className="flex flex-1 flex-col">
        <LandingHeader />
        <main className="flex-1">
          <HeroSection />
          <ProblemSection />
          <SolutionSection />
          <CraftsmanshipSection />
          <VisualizationSection />
          <ProductExperienceSection />
          <ProtectionSection />
          <ForCustomersSection />
          <ForDesignersSection />
          <ComingSoonSection />
        </main>
        <LandingFooter />
      </div>
    </WaitlistDialogProvider>
  );
}
