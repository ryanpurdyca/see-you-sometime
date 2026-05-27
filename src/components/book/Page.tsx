"use client";

import { animate, motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/design-system";
import { COVER_OPEN_ANGLE, NUM_PAGES, PAGE_FAN_SPREAD, PAGE_Z_STEP } from "./constants";

type Props = {
  /** 0 = innermost page (against the back cover), NUM_PAGES-1 = outermost (just inside the front cover). */
  index: number;
  openness: MotionValue<number>;
  /**
   * null  → idle fan mode, rotateY tracks the openness spring.
   * number → reading mode; pages with index < readingPage spring to
   *          COVER_OPEN_ANGLE (left/read stack), others spring to 0° (right/unread).
   */
  readingPage: number | null;
};

/**
 * A single hinged page. Uses a persistent `rotateY` MotionValue that is
 * always in `style` — never swapped for an `animate` prop — so Framer Motion
 * always knows the true current angle and can spring from it cleanly when
 * switching between idle fan and reading-mode page-flip.
 */
export function Page({ index, openness, readingPage }: Props) {
  const fanFraction = (index + 1) / (NUM_PAGES + 1);
  const finalAngle = -PAGE_FAN_SPREAD * fanFraction;

  const opensAt = 0.1 + (1 - fanFraction) * 0.5;
  const idleRotateY = useTransform(openness, [opensAt, 1], [0, finalAngle], { clamp: true });

  const translateZ = (index + 1) * PAGE_Z_STEP;
  const isEdgePage = index === NUM_PAGES - 1;

  // Persistent MotionValue — stays in `style` at all times so we can drive
  // it either by subscribing to idleRotateY or by an imperative spring,
  // without Framer Motion losing track of the current position.
  const rotateY = useMotionValue(idleRotateY.get());

  useEffect(() => {
    if (readingPage === null) {
      // Idle: keep rotateY in sync with the fan spring.
      rotateY.set(idleRotateY.get());
      return idleRotateY.on("change", (v) => rotateY.set(v));
    } else {
      // Reading: spring-animate to the target angle from wherever we are now.
      const target = index < readingPage ? COVER_OPEN_ANGLE : 0;
      const controls = animate(rotateY, target, {
        type: "spring",
        stiffness: 140,
        damping: 24,
      });
      return () => controls.stop();
    }
  }, [readingPage, index, idleRotateY, rotateY]);

  return (
    <motion.div
      data-testid="book-page"
      data-index={index}
      className={cn(
        "bg-paper absolute inset-0",
        "rounded-l-[8px] rounded-r-[8px]",
        isEdgePage ? "border-accent/70 border" : "border-paper-edge border",
      )}
      style={{
        transformOrigin: "0% 50%",
        transformStyle: "preserve-3d",
        translateZ,
        rotateY,
      }}
    >
      {/* Subtle gradient hints at page curvature without using an image. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-l-[8px] rounded-r-[8px]"
        style={{
          background:
            "linear-gradient(to right, rgba(11,13,18,0.04) 0%, transparent 8%, transparent 92%, rgba(11,13,18,0.03) 100%)",
        }}
      />
    </motion.div>
  );
}
