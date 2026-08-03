"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useMotionTemplate,
  type Transition,
} from "framer-motion";
import { Search, Box, Truck, Shirt, Star, Sparkle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/shared/components/logo";
import { FashionImage } from "@/shared/components/fashion-image";
import { useWaitlistDialog } from "@/features/landing/components/waitlist-dialog-provider";
import { useMagnetic } from "@/hooks/use-magnetic";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const HERO_IMAGE_SRC = "/images/fashion360/hero/hero-campaign.png";

const MOCKUP_FEATURES = [
  { icon: Search, label: "Discover Designers" },
  { icon: Box, label: "3D Design Preview" },
  { icon: Truck, label: "Order Tracking" },
  { icon: Shirt, label: "Digital Wardrobe" },
];

function UiMockupCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[min(280px,80vw)] rounded-2xl border border-white/50 bg-white/80 p-4 shadow-xl backdrop-blur-md",
        className
      )}
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-foreground">
        Your Fashion Journey
        <Sparkle className="size-3 text-warning" strokeWidth={2} />
      </p>
      <div className="mt-3 space-y-2">
        {MOCKUP_FEATURES.map((f) => (
          <div key={f.label} className="flex items-center gap-2.5 rounded-lg bg-white/70 px-2.5 py-1.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-primary">
              <f.icon className="size-3.5" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-medium text-foreground">{f.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Preview of the Fashion360 product experience</p>
    </div>
  );
}

export function HeroSection() {
  const reduceMotion = useReducedMotion();
  const canHover = useMediaQuery("(hover: hover) and (pointer: fine)");
  const enableParallax = canHover && !reduceMotion;
  const sectionRef = useRef<HTMLElement>(null);
  const magneticRef = useRef<HTMLButtonElement>(null);
  const openWaitlist = useWaitlistDialog();
  const magnetic = useMagnetic(magneticRef, 0.25, 7, 2);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 0.96]);
  const scrollOpacity = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : 0.85]);

  // Layered mouse-parallax depth: background moves least, the image moves
  // more, the floating UI card moves the most — each its own spring so they
  // trail the cursor at slightly different rates rather than snapping.
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const bgX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), spring);
  const bgY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-6, 6]), spring);
  const imgX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), spring);
  const imgY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-10, 10]), spring);
  const uiX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-16, 16]), spring);
  const uiY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-16, 16]), spring);
  const lightX = useTransform(mouseX, [-0.5, 0.5], ["15%", "85%"]);
  const lightY = useTransform(mouseY, [-0.5, 0.5], ["15%", "85%"]);
  const lightBackground = useMotionTemplate`radial-gradient(circle at ${lightX} ${lightY}, rgba(255,255,255,0.16), transparent 45%)`;

  function onMouseMove(e: React.MouseEvent<HTMLElement>) {
    if (!enableParallax) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function onMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const stagger = (index: number): { transition: Transition } => ({
    transition: reduceMotion
      ? { duration: 0.15, delay: 0 }
      : { duration: 0.7, delay: 0.15 * index, ease: "easeOut" },
  });

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative overflow-hidden"
      style={{ backgroundColor: "var(--campaign-cream)" }}
    >
      {/* Decorative elements — subtle, never competing with the model/headline */}
      <motion.div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ x: bgX, y: bgY }}>
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-gradient-to-br from-secondary/15 to-primary/10 blur-3xl" />
        <svg className="absolute top-1/3 left-[6%] size-40 text-primary/15 sm:size-56" viewBox="0 0 200 200" fill="none">
          <path d="M10 180 Q 100 20 190 100" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <Star className="absolute top-[18%] left-[38%] size-3 fill-warning/60 text-warning/60" />
        <Star className="absolute top-[62%] left-[8%] size-2.5 fill-warning/50 text-warning/50" />
      </motion.div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-14 sm:py-16 lg:min-h-screen lg:grid-cols-2 lg:gap-0 lg:px-0 lg:py-0">
        {/* Text column — first at every breakpoint (mobile: text before
            image, per spec; desktop: text on the left) */}
        <motion.div
          style={{ opacity: scrollOpacity }}
          className="order-1 px-0 lg:px-12 xl:px-20"
        >
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} {...stagger(0)} className="mb-6 lg:hidden">
            <Logo mark />
          </motion.div>

          <motion.span
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            {...stagger(1)}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold tracking-[0.15em] text-primary uppercase"
          >
            <span className="size-1.5 animate-pulse rounded-full bg-warning" />
            Fashion360 Is Coming
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            {...stagger(2)}
            className="mt-6 font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            <span className="block text-foreground">
              Your <span className="text-primary">Style</span>.
            </span>
            <span className="block text-foreground">
              Your <span className="text-primary">Designer</span>.
            </span>
            <span className="block text-foreground">Your Fashion Journey.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            {...stagger(3)}
            className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Fashion360 is building a new way to discover fashion designers, collaborate on your perfect
            design, visualize your outfit before it&apos;s made, and manage your fashion journey, all
            in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            {...stagger(4)}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            {/* asChild so the magnetic motion.button still gets every real
                Button class (focus ring, disabled state, etc.) via Slot —
                only the interaction layer is custom, not the base styling. */}
            <Button asChild size="lg" className="group w-full px-7 shadow-sm transition-shadow hover:shadow-lg sm:w-auto">
              <motion.button
                ref={magneticRef}
                onMouseMove={magnetic.onMouseMove}
                onMouseEnter={magnetic.onMouseEnter}
                onMouseLeave={magnetic.onMouseLeave}
                onClick={() => openWaitlist("CUSTOMER")}
                style={magnetic.style}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                Join the Customer Waitlist
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full border-primary/40 px-7 text-primary hover:bg-primary/5 sm:w-auto"
              onClick={() => openWaitlist("DESIGNER")}
            >
              I&apos;m a Fashion Designer
            </Button>
          </motion.div>
        </motion.div>

        {/* Image column — second at every breakpoint (mobile: below the
            text; desktop: on the right) */}
        <motion.div
          style={{ scale: scrollScale, opacity: scrollOpacity }}
          className="order-2 lg:relative lg:h-full lg:min-h-[70vh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            {...stagger(2)}
            style={{ x: imgX, y: imgY }}
            whileHover={enableParallax ? { scale: 1.02, filter: "brightness(1.03)" } : undefined}
            className="relative lg:h-full"
          >
            <FashionImage
              category="hero"
              alt="A Fashion360 customer wearing a sophisticated custom-designed purple and cream gown"
              aspect="4/5"
              className="lg:hidden"
              src={HERO_IMAGE_SRC}
              objectPosition="70% 8%"
              sizes="100vw"
              priority
            />
            <FashionImage
              category="hero"
              alt="A Fashion360 customer wearing a sophisticated custom-designed purple and cream gown"
              aspect="fill"
              className="hidden rounded-none lg:block"
              src={HERO_IMAGE_SRC}
              objectPosition="78% 10%"
              sizes="50vw"
              priority
            />

            {/* Soft light reflection following the cursor — desktop only, very subtle */}
            {enableParallax && (
              <motion.div className="pointer-events-none absolute inset-0" style={{ background: lightBackground }} />
            )}

            {/* UI mockup — floats over the lower-right of the image on desktop.
                Parallax offset (outer) is separate from the idle float
                animation (inner) so the two transforms don't fight. */}
            <motion.div className="absolute right-6 bottom-6 z-10 hidden lg:block" style={{ x: uiX, y: uiY }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
                transition={
                  reduceMotion
                    ? { duration: 0.2, delay: 0 }
                    : { opacity: { duration: 0.6, delay: 0.9 }, y: { duration: 4, delay: 1.2, repeat: Infinity, ease: "easeInOut" } }
                }
              >
                <UiMockupCard />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Mobile: mockup sits below the image, never overlapping it */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            {...stagger(5)}
            className="mt-4 flex justify-center lg:hidden"
          >
            <UiMockupCard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
