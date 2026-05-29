"use client";

import { animate, motion, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import {
  COVER_OPEN_ANGLE,
  NUM_PAGES,
  PAGE_BASE_PEEL_LEFT_DEG,
  PAGE_BASE_PEEL_RIGHT_DEG,
  PAGE_FAN_FAR_DEG,
  PAGE_FAN_NEAR_DEG,
  PAGE_HOVER_BOOST_DEG,
  PAGE_SUB_PEEL_DEG,
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
  /** True when this page is directly behind the about-to-flip page — gets a
   *  smaller peel so it visibly peeks out from behind. */
  subPeeled: boolean;
  /** True when additionally hovered — adds extra peel on top of the base. */
  hovered: boolean;
  /** Content shown on the front (recto) face — visible on the right stack. */
  front: ReactNode;
  /** Content shown on the back (verso) face — visible on the left stack after a flip. */
  back: ReactNode;
};

export function Page({
  index,
  openness,
  readingPage,
  peeled,
  subPeeled,
  hovered,
  front,
  back,
}: Props) {
  // Full-spread idle fan (see §5 2026-05-29). `depth` runs 0 → 1 from sheet 0
  // (page 1) to the last sheet. The sheets fill the whole open book at evenly-
  // spaced angles: page 1 trails farthest behind the cover (PAGE_FAN_FAR_DEG)
  // and each deeper sheet steps uniformly toward the closed right edge (down to
  // PAGE_FAN_NEAR_DEG), monotonic in index so the fan reads in reading order
  // left → right. A mid-book sheet lands near 90° (edge-on) — accepted for an
  // even riffle.
  const depth = NUM_PAGES > 1 ? index / (NUM_PAGES - 1) : 0;
  const finalAngle = -(PAGE_FAN_FAR_DEG - (PAGE_FAN_FAR_DEG - PAGE_FAN_NEAR_DEG) * depth);

  // Pages cascade out behind the cover: page 1 starts spreading first (just
  // after the cover begins to swing), deeper sheets follow in turn.
  const opensAt = 0.1 + depth * 0.5;
  const idleRotateY = useTransform(openness, [opensAt, 1], [0, finalAngle], { clamp: true });

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
    if (readingPage !== null) {
      const isLeft = index < readingPage;
      let deg = 0;
      if (peeled) deg = isLeft ? PAGE_BASE_PEEL_LEFT_DEG : PAGE_BASE_PEEL_RIGHT_DEG;
      else if (subPeeled) deg = PAGE_SUB_PEEL_DEG;
      if (deg !== 0 && hovered) deg += PAGE_HOVER_BOOST_DEG;
      target = isLeft ? deg : -deg;
    }
    const controls = animate(hoverPeel, target, { type: "spring", stiffness: 220, damping: 22 });
    return () => controls.stop();
  }, [peeled, subPeeled, hovered, readingPage, index, hoverPeel]);

  // Z-ordering.
  //  - Reading mode, right stack: reversed so readingPage sits on top
  //    (otherwise its peel hides behind the pages above it).
  //  - Reading mode, left stack: natural order (most-recently-flipped on top).
  //  - Idle: descending so sheet 0 (page 1) is on top — same order the right
  //    stack uses at readingPage 0. Matching them means the reading→idle switch
  //    at the end of a close doesn't flip the stack; without this, sheets snap
  //    to ascending order and a lower sheet (e.g. page 3) flashes through page 1
  //    in the instant before the closing cover seats flat.
  let translateZ: number;
  if (readingPage !== null) {
    translateZ =
      index >= readingPage
        ? (NUM_PAGES - (index - readingPage)) * PAGE_Z_STEP
        : (index + 1) * PAGE_Z_STEP;
  } else {
    translateZ = (NUM_PAGES - index) * PAGE_Z_STEP;
  }

  return (
    <motion.div
      data-testid="book-page"
      data-index={index}
      className="absolute inset-0"
      style={{
        transformOrigin: "0% 50%",
        transformStyle: "preserve-3d",
        translateZ,
        rotateY: combinedRotY,
      }}
    >
      {/* Front face — faces the viewer when the sheet sits on the right stack. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backfaceVisibility: "hidden" }}
      >
        {front}
      </div>
      {/* Back face — pre-rotated 180° so it reads correctly once the sheet flips
          onto the left stack. translateZ avoids z-fighting with the front face. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ transform: "rotateY(180deg) translateZ(1px)", backfaceVisibility: "hidden" }}
      >
        {back}
      </div>
    </motion.div>
  );
}
