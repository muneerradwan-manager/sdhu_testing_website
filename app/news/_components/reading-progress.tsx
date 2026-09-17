"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";

export function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 });
  const glow = useTransform(scrollYProgress, [0, 0.95, 1], [0.4, 0.8, 1]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[75] h-1 bg-ink/5 print:hidden" aria-hidden>
      <motion.div
        className="h-full origin-right bg-gradient-to-l from-green-light via-gold to-maroon"
        style={{ scaleX, opacity: glow, boxShadow: "0 0 12px rgba(217,200,158,.8)" }}
      />
    </div>
  );
}
