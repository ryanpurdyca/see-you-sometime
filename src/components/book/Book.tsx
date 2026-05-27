"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Cover } from "./Cover";
import { Page } from "./Page";
import { BackCover } from "./BackCover";
import { BookButtons, type BookMode } from "./BookButtons";
import {
  BOOK_WIDTH_PX,
  NUM_PAGES,
  OPEN_CENTRE_OFFSET,
  OPENNESS_SPRING,
  READING_SCENE_TILT_X,
  SCENE_PERSPECTIVE_PX,
  SCENE_TILT_X_DEG,
  SCENE_TILT_Z_DEG,
} from "./constants";

/**
 * Interactive 3D book. Pointer X drives `openness` (0 = closed, 1 = open)
 * while in idle mode. In reading mode the book is pinned open and Next/Back
 * flip individual pages via imperative spring animations.
 *
 * The outer div is `absolute inset-0` so that BookButtons — which lives
 * outside the perspective container — can use viewport-relative positioning
 * without being affected by 3D transforms.
 */
export function Book() {
  const openness = useMotionValue(0);
  const smoothOpenness = useSpring(openness, OPENNESS_SPRING);

  // Scene tilt interpolates from the design tilt → 0° as the book opens.
  const tiltX = useTransform(smoothOpenness, [0, 1], [SCENE_TILT_X_DEG, 0]);
  const tiltZ = useTransform(smoothOpenness, [0, 1], [SCENE_TILT_Z_DEG, 0]);

  // Additional tilt applied in reading mode to give pages subtle depth.
  const readingTiltX = useMotionValue(0);
  const combinedTiltX = useTransform(
    [tiltX, readingTiltX],
    ([a, b]) => (a as number) + (b as number),
  );

  const [mode, setMode] = useState<BookMode>("idle");
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);

  // Ref mirrors mode so the pointer-event handler always sees the current
  // value without needing to re-register the listener on every mode change.
  const modeRef = useRef<BookMode>("idle");

  const setModeSync = (m: BookMode) => {
    modeRef.current = m;
    setMode(m);
  };

  useEffect(() => {
    const setFromClientX = (clientX: number) => {
      if (modeRef.current === "reading") return; // book is pinned open
      const w = window.innerWidth || 1;
      const spineX = w / 2;
      const closeAt = spineX + BOOK_WIDTH_PX;
      const openAt = spineX - BOOK_WIDTH_PX;
      const clamped = Math.max(openAt, Math.min(closeAt, clientX));
      openness.set(1 - (clamped - openAt) / (closeAt - openAt));
    };

    const onPointerMove = (e: PointerEvent) => setFromClientX(e.clientX);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) setFromClientX(t.clientX);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, [openness]);

  const handleRead = () => {
    openness.set(1);
    setCurrentPage(0);
    setModeSync("reading");
    animate(readingTiltX, READING_SCENE_TILT_X, { type: "spring", stiffness: 120, damping: 20 });
  };

  const handleCancel = () => {
    setModeSync("idle");
    setHoveredSide(null);
    animate(readingTiltX, 0, { type: "spring", stiffness: 120, damping: 20 });
  };

  const handleNext = () => {
    setCurrentPage((p) => Math.min(p + 1, NUM_PAGES - 1));
  };

  const handleBack = () => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  };

  const handleClose = () => {
    setModeSync("idle");
    setCurrentPage(0);
    setHoveredSide(null);
    animate(readingTiltX, 0, { type: "spring", stiffness: 120, damping: 20 });
    openness.set(0);
  };

  const readingPage = mode === "reading" ? currentPage : null;

  return (
    <div data-testid="book-root" className="absolute inset-0">
      {/* 3D scene — centred within the viewport-filling wrapper */}
      <div
        className="flex h-full items-center justify-center"
        style={{
          perspective: `${SCENE_PERSPECTIVE_PX}px`,
          perspectiveOrigin: "50% 45%",
        }}
      >
        <motion.div
          className="relative"
          style={{
            width: "var(--book-width)",
            height: "var(--book-height)",
            left: OPEN_CENTRE_OFFSET,
            transformStyle: "preserve-3d",
            rotateX: combinedTiltX,
            rotateZ: tiltZ,
          }}
        >
          <BackCover />
          {Array.from({ length: NUM_PAGES }, (_, i) => (
            <Page
              key={i}
              index={i}
              openness={smoothOpenness}
              readingPage={readingPage}
              peeled={
                readingPage !== null &&
                ((i === readingPage - 1 && readingPage > 0) || i === readingPage)
              }
              hovered={
                readingPage !== null &&
                ((i === readingPage - 1 && readingPage > 0 && hoveredSide === "left") ||
                  (i === readingPage && hoveredSide === "right"))
              }
            />
          ))}
          <Cover openness={smoothOpenness} />
        </motion.div>
      </div>

      {/* Transparent click/hover regions in reading mode — outside the
          perspective container so hit-testing is in flat screen space. */}
      {mode === "reading" && (
        <>
          {/* Left page — navigates Back */}
          <div
            className="absolute cursor-pointer"
            style={{
              left: "calc(50vw - var(--book-width))",
              top: "calc(50vh - var(--book-height) / 2)",
              width: "var(--book-width)",
              height: "var(--book-height)",
            }}
            onClick={currentPage > 0 ? handleBack : undefined}
            onMouseEnter={() => setHoveredSide("left")}
            onMouseLeave={() => setHoveredSide(null)}
          />
          {/* Right page — navigates Next */}
          <div
            className="absolute cursor-pointer"
            style={{
              left: "50vw",
              top: "calc(50vh - var(--book-height) / 2)",
              width: "var(--book-width)",
              height: "var(--book-height)",
            }}
            onClick={currentPage < NUM_PAGES - 1 ? handleNext : undefined}
            onMouseEnter={() => setHoveredSide("right")}
            onMouseLeave={() => setHoveredSide(null)}
          />
        </>
      )}

      {/* 2D button overlay — outside the perspective container so it isn't
          affected by 3D transforms. Absolutely positioned using vw/vh so it
          aligns with the open book spread regardless of viewport size. */}
      <BookButtons
        openness={smoothOpenness}
        mode={mode}
        currentPage={currentPage}
        onRead={handleRead}
        onCancel={handleCancel}
        onNext={handleNext}
        onBack={handleBack}
        onClose={handleClose}
      />
    </div>
  );
}
