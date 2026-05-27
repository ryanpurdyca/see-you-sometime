"use client";

import { animate, motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/design-system";
import {
  COVER_OPEN_ANGLE,
  NUM_PAGES,
  PAGE_BASE_PEEL_DEG,
  PAGE_FAN_SPREAD,
  PAGE_HOVER_PEEL_DEG,
  PAGE_Z_STEP,
} from "./constants";

type Props = {
  index: number;
  openness: MotionValue<number>;
  /**
   * null  → idle fan mode.
   * number → reading mode; pages with index < readingPage sit on the left
   *          stack (COVER_OPEN_ANGLE), others sit on the right stack (0°).
   */
  readingPage: number | null;
  /** True when this page should show the base reading-mode peel (always-on). */
  peeled: boolean;
  /** True when additionally hovered — adds extra peel on top of the base. */
  hovered: boolean;
};

export function Page({ index, openness, readingPage, peeled, hovered }: Props) {
  const fanFraction = (index + 1) / (NUM_PAGES + 1);
  const finalAngle = -PAGE_FAN_SPREAD * fanFraction;

  const opensAt = 0.1 + (1 - fanFraction) * 0.5;
  const idleRotateY = useTransform(openness, [opensAt, 1], [0, finalAngle], { clamp: true });

  const isEdgePage = index === NUM_PAGES - 1;

  // Base rotateY — driven by idle subscription or imperative spring (reading).
  const rotateY = useMotionValue(idleRotateY.get());

  useEffect(() => {
    if (readingPage === null) {
      rotateY.set(idleRotateY.get());
      return idleRotateY.on("change", (v) => rotateY.set(v));
    }
    const target = index < readingPage ? COVER_OPEN_ANGLE : 0;
    const controls = animate(rotateY, target, { type: "spring", stiffness: 140, damping: 24 });
    return () => controls.stop();
  }, [readingPage, index, idleRotateY, rotateY]);

  // Hover peel: small rotateY offset that makes the page look ready to flip,
  // hinging at the spine. Left-stack pages peel positive (toward 0°);
  // right-stack pages peel negative (away from 0°).
  const hoverPeel = useMotionValue(0);
  const combinedRotY = useTransform(
    [rotateY, hoverPeel],
    ([r, h]) => (r as number) + (h as number),
  );

  useEffect(() => {
    let target = 0;
    if (readingPage !== null && peeled) {
      const deg = hovered ? PAGE_HOVER_PEEL_DEG : PAGE_BASE_PEEL_DEG;
      target = index < readingPage ? deg : -deg;
    }
    const controls = animate(hoverPeel, target, { type: "spring", stiffness: 220, damping: 22 });
    return () => controls.stop();
  }, [peeled, hovered, readingPage, index, hoverPeel]);

  const translateZ = (index + 1) * PAGE_Z_STEP;

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
        rotateY: combinedRotY,
      }}
    >
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
