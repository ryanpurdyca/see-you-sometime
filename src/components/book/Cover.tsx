"use client";

import { motion, type MotionValue, useTransform } from "framer-motion";
import { cn } from "@/design-system";
import { COVER_OPEN_ANGLE, NUM_PAGES, PAGE_Z_STEP } from "./constants";

const coverTextStyle = { fontFamily: "var(--font-caveat)" } as const;

const coverDateClass = cn("text-cover-ink absolute text-lg leading-snug font-bold");

const coverTitleClass = cn("text-cover-ink absolute text-2xl leading-snug font-bold");

type Props = {
  openness: MotionValue<number>;
};

/**
 * Front cover of the book. Hinges on its left edge; rotates from 0° (closed)
 * to COVER_OPEN_ANGLE (fully swung open to the left of the spine) as the
 * book's `openness` motion value travels [0 → 1].
 *
 * The cover opens during the first half of the openness range so the inner
 * pages can fan during the second half — see {@link Page} and constants.ts.
 */
export function Cover({ openness }: Props) {
  const rotateY = useTransform(openness, [0, 0.55], [0, COVER_OPEN_ANGLE], { clamp: true });

  // Translate forward so the cover sits above the page stack when closed.
  const translateZ = (NUM_PAGES + 1) * PAGE_Z_STEP;

  return (
    <motion.div
      data-testid="book-cover"
      className={cn(
        "absolute inset-0 bg-cover",
        "rounded-[10px]",
        "border-ink border",
        "shadow-[0_4px_12px_rgba(11,13,18,0.06),_0_20px_48px_rgba(11,13,18,0.12)]",
      )}
      style={{
        transformOrigin: "0% 50%",
        transformStyle: "preserve-3d",
        translateZ,
        rotateY,
      }}
    >
      <div
        aria-hidden
        className="border-cover-border-inner pointer-events-none absolute inset-[3px] rounded-[7px] border"
      />
      <CoverFace />
      <CoverInside />
    </motion.div>
  );
}

function CoverFace() {
  return (
    <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
      <img
        src="/images/vitally-01.svg"
        alt=""
        width={166}
        height={216}
        className="absolute top-[7%] left-[9%] h-auto w-[26%] max-w-[94px] -rotate-6 select-none"
        draggable={false}
      />
      <img
        src="/images/vitally-02.svg"
        alt=""
        width={216}
        height={155}
        className="absolute right-[7%] bottom-[8%] h-auto w-[42%] max-w-[138px] rotate-[7deg] select-none"
        draggable={false}
      />
      <p className={cn(coverTitleClass, "top-[10%] left-[42%] max-w-[48%]")} style={coverTextStyle}>
        Memories from
        <br />
        my time at Vitally
      </p>
      <p
        className={cn(coverDateClass, "bottom-[14%] left-[13%] max-w-[38%]")}
        style={coverTextStyle}
      >
        Fall 2022 to Summer 2026
      </p>
    </div>
  );
}

function CoverInside() {
  return (
    <div
      className="bg-surface-raised absolute inset-0 rounded-[10px]"
      style={{
        transform: "rotateY(180deg) translateZ(1px)",
        backfaceVisibility: "hidden",
      }}
    />
  );
}
