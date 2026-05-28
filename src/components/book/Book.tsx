"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Cover } from "./Cover";
import { Page } from "./Page";
import { BackCover } from "./BackCover";
import { BookButtons, type BookMode } from "./BookButtons";
import { CursorFollower } from "./CursorFollower";
import {
  BOOK_WIDTH_PX,
  NUM_PAGES,
  OPEN_CENTRE_OFFSET,
  OPENNESS_SPRING,
  READING_SCENE_TILT_X,
  SCENE_PERSPECTIVE_PX,
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

  const baseTiltX = useTransform(smoothOpenness, [0, 1], [0, 0]);
  const tiltZ = useTransform(smoothOpenness, [0, 1], [0, 0]);
  // Snaps to -12 when entering reading mode to cancel baseTiltX, giving 0° total.
  const readingTiltX = useMotionValue(0);
  const tiltX = useTransform([baseTiltX, readingTiltX], ([b, r]) => (b as number) + (r as number));

  const [mode, setMode] = useState<BookMode>("idle");
  const [currentPage, setCurrentPage] = useState(0);
  const [hoveredSide, setHoveredSide] = useState<"left" | "right" | null>(null);
  const [hoveringBook, setHoveringBook] = useState(false);
  // True while the close sequence is running. Suppresses page peel so the
  // "about-to-flip" page doesn't stay tilted at -25° throughout the close and
  // then snap back to flat once mode finally flips to idle.
  const [isClosing, setIsClosing] = useState(false);

  // Refs mirror state so event handlers registered once always see current values.
  const modeRef = useRef<BookMode>("idle");
  const currentPageRef = useRef(0);

  const setModeSync = (m: BookMode) => {
    modeRef.current = m;
    setMode(m);
  };

  const setCurrentPageSync = (p: number) => {
    currentPageRef.current = p;
    setCurrentPage(p);
  };

  useEffect(() => {
    const setFromClientX = (clientX: number) => {
      if (modeRef.current === "reading") return; // book is pinned open
      const w = window.innerWidth || 1;
      const spineX = w / 2;
      const closeAt = spineX + BOOK_WIDTH_PX - 100;
      const openAt = spineX - BOOK_WIDTH_PX + 100;
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
    // Directly drive smoothOpenness: useSpring tracking stalls when source jumps from 0.
    animate(smoothOpenness, 1, { type: "spring", stiffness: 400, damping: 40 });
    setCurrentPageSync(0);
    setIsClosing(false);
    setHoveringBook(false);
    setModeSync("reading");
    animate(readingTiltX, 0, { type: "spring", ...OPENNESS_SPRING });
  };

  const handleCancel = () => {
    setModeSync("idle");
    setHoveredSide(null);
    animate(readingTiltX, 0, { type: "spring", ...OPENNESS_SPRING });
  };

  const handleNext = () => {
    setCurrentPageSync(Math.min(currentPageRef.current + 1, NUM_PAGES - 1));
  };

  const handleBack = () => {
    setCurrentPageSync(Math.max(currentPageRef.current - 1, 0));
  };

  const handleClose = () => {
    setIsClosing(true);
    setHoveredSide(null);
    animate(readingTiltX, 0, { type: "spring", ...OPENNESS_SPRING });

    const finishClose = () => {
      setModeSync("idle");
      setIsClosing(false);
    };

    const closeCover = () => {
      openness.set(0);
      // Defer the idle-mode switch until smoothOpenness has fully closed.
      // Switching modes prematurely would make every page snap to its idle
      // (fan) position. Once smoothOpenness reaches 0, idleRotateY for every
      // page is 0, so the subscription that runs after mode=idle does not
      // move anything.
      if (smoothOpenness.get() < 0.01) {
        finishClose();
      } else {
        const unsub = smoothOpenness.on("change", (v) => {
          if (v < 0.01) {
            unsub();
            finishClose();
          }
        });
      }
    };

    // Sequentially flip left-stack pages back to the right stack — most
    // recently flipped first — so each page closes in order. After the last
    // page flip has started, pause briefly, then close the cover last. This
    // avoids the cover sweeping over still-open pages mid-rotation.
    const STEP_MS = 90;
    const COVER_DELAY_MS = 200;

    const flipNext = () => {
      const current = currentPageRef.current;
      if (current === 0) {
        setTimeout(closeCover, COVER_DELAY_MS);
        return;
      }
      setCurrentPageSync(current - 1);
      setTimeout(flipNext, STEP_MS);
    };

    flipNext();
  };

  // Keyboard navigation — only active in reading mode.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modeRef.current !== "reading") return;
      if (e.key === "ArrowRight") {
        setCurrentPageSync(Math.min(currentPageRef.current + 1, NUM_PAGES - 1));
      } else if (e.key === "ArrowLeft") {
        if (currentPageRef.current === 0) {
          handleClose();
        } else {
          setCurrentPageSync(currentPageRef.current - 1);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const readingPage = mode === "reading" ? currentPage : null;

  return (
    <div data-testid="book-root" className="absolute inset-0">
      {/* 3D scene — centred within the viewport-filling wrapper */}
      <div
        className="flex h-full items-center justify-center"
        style={{
          perspective: `${SCENE_PERSPECTIVE_PX}px`,
          perspectiveOrigin: "50% 45%",
          pointerEvents: "none",
        }}
      >
        <motion.div
          className="relative"
          style={{
            width: "var(--book-width)",
            height: "var(--book-height)",
            left: OPEN_CENTRE_OFFSET,
            transformStyle: "preserve-3d",
            rotateX: tiltX,
            rotateZ: tiltZ,
          }}
        >
          <BackCover openness={smoothOpenness} />
          {Array.from({ length: NUM_PAGES }, (_, i) => (
            <Page
              key={i}
              index={i}
              openness={smoothOpenness}
              readingPage={readingPage}
              peeled={
                !isClosing &&
                readingPage !== null &&
                ((i === readingPage - 1 && readingPage > 0) || i === readingPage)
              }
              subPeeled={
                !isClosing && readingPage !== null && i === readingPage + 1 && i < NUM_PAGES
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

      {/* Idle-mode click region — clicking anywhere on the book triggers Read */}
      {mode === "idle" && (
        <div
          className="absolute cursor-pointer"
          style={{
            left: "calc(50vw - var(--book-width))",
            top: "calc(50vh - var(--book-height) / 2)",
            width: "calc(var(--book-width) * 2)",
            height: "var(--book-height)",
          }}
          onClick={handleRead}
          onMouseEnter={() => setHoveringBook(true)}
          onMouseLeave={() => setHoveringBook(false)}
        />
      )}

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

      <CursorFollower openness={smoothOpenness} mode={mode} hoveringBook={hoveringBook} />
    </div>
  );
}
