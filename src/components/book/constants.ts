/**
 * Book layout & motion constants. Centralized so the page-fan animation can
 * be tuned in one place without hunting through components.
 *
 * Geometry assumes the spine lives at the LEFT edge of the book root; the
 * cover and every page hinge on that edge (transform-origin: 0% 50%).
 */

import { bookPages } from "./pages";

/**
 * Number of physical sheets (leaves) in the book. Each sheet has two faces
 * (front + back), so the sheet count is derived from the authored page list:
 * two pages per sheet, rounding up for an odd final page. Add/remove entries
 * in `pages.tsx` to change the book's thickness — nothing here needs editing.
 */
export const NUM_PAGES = Math.ceil(bookPages.length / 2);

/** Maximum opening angle for the front cover (degrees, negative = swings left). */
export const COVER_OPEN_ANGLE = -174;

/**
 * Idle fan spread (see §5 2026-05-29 — full-spread rework). A book-opening
 * (rotateY) fan that splays the sheets EVENLY across the WHOLE open book, from
 * near the closed right edge (PAGE_FAN_NEAR_DEG) all the way left to just behind
 * the open cover (PAGE_FAN_FAR_DEG). Sheet 0 (page 1) trails farthest behind the
 * cover at the FAR angle; each deeper sheet rests at an evenly-spaced shallower
 * angle down to the last sheet at NEAR — so scanning the fan left → right passes
 * page 1, 2, 3 … N in reading order (the angle is monotonic in sheet index).
 *
 * The spacing is deliberately uniform: pages aren't meant to be readable here
 * (that's what opening the book is for), so we favour an even riffle over a
 * cleaner-but-lopsided look. This means a mid-book sheet sits near 90° (edge-on)
 * and leans most toward the viewer — accepted as the natural look of a fanned
 * book.
 *
 * FAR stays shy of the cover's COVER_OPEN_ANGLE (−174°) so the open cover
 * always sits outermost on the left and the fan tucks behind it.
 */
export const PAGE_FAN_NEAR_DEG = 12;
export const PAGE_FAN_FAR_DEG = 165;

/**
 * Static scene tilt — gives the book the slight three-quarter perspective
 * shown in the reference images without forcing the user to move their mouse.
 */
export const SCENE_TILT_X_DEG = 8;
export const SCENE_TILT_Z_DEG = -2;

/** Perspective depth applied to the scene container. Smaller = more dramatic. */
export const SCENE_PERSPECTIVE_PX = 2400;

/**
 * Spring tuning for openness → rendered angle. Soft enough that the book
 * doesn't snap; firm enough to feel responsive to mouse moves.
 */
export const OPENNESS_SPRING = {
  stiffness: 90,
  damping: 18,
  mass: 0.6,
} as const;

/**
 * Z-offset between stacked pages (px). Separates the parallel page planes in
 * depth so the 3D sort is stable.
 *
 * Must be comfortably large: when the book closes with no pages flipped, every
 * sheet sits at exactly `rotateY: 0` — six perfectly coplanar planes. At the
 * old 0.4px the depth gaps fell below the renderer's precision after the
 * perspective divide, so the sort went unstable as the cover seated and a lower
 * sheet (e.g. page 3) flickered through page 1. (Flipping pages first hid it:
 * the sheets were still mid-spring at varied angles, so not coplanar.) The fan
 * is rotation-dominated and the closed/reading stacks share one outline, so a
 * larger step is invisible everywhere except killing that flicker.
 */
export const PAGE_Z_STEP = 1.5;

/**
 * Must equal the `--book-width` CSS token in tokens.css (320px).
 * Used in JS to derive dynamic pointer range thresholds that align with the
 * book's rendered edges — no hard-coded pixel margins needed.
 */
export const BOOK_WIDTH_PX = 320;

/**
 * Horizontal offset applied to the book container so the open state (spread
 * evenly around the spine) appears visually centred on screen. Equal to half
 * the book width: when open, the spine is at screen centre; when closed, the
 * cover is shifted to the right of centre by the same amount.
 */
export const OPEN_CENTRE_OFFSET = "calc(var(--book-width) / 2)";

/** Additional rotateX applied to the scene in reading mode to give pages subtle depth. */
export const READING_SCENE_TILT_X = -12;

/**
 * Base rotateY peel for the about-to-flip page in reading mode. Different
 * per side because the geometry is asymmetric: the LEFT page folds from
 * COVER_OPEN_ANGLE (−174°) toward 0°, the RIGHT folds from 0° toward −180°,
 * and cos() is steeper near 90° than near 0° or 180°. To expose the same
 * ~30 units of "page behind" on each side, the right needs a larger angle.
 */
export const PAGE_BASE_PEEL_LEFT_DEG = 20;
export const PAGE_BASE_PEEL_RIGHT_DEG = 25;

/** Smaller peel applied to the page directly behind the about-to-flip page on
 *  the right side, creating a visible two-layer cascade that mirrors the
 *  cover-behind-page effect the left side gets for free from its fully-folded
 *  back stack at COVER_OPEN_ANGLE. */
export const PAGE_SUB_PEEL_DEG = 12;

/** Additional rotateY peel added on top of the base peel when the user hovers,
 *  giving a stronger "ready to flip" signal. */
export const PAGE_HOVER_BOOST_DEG = 6;

/**
 * Spring for the cover's iridescent sheen as it tracks the pointer. Looser than
 * OPENNESS_SPRING so the sheen glides languidly behind the cursor rather than
 * snapping to it — reads as a reflection, not a follower.
 */
export const COVER_SHEEN_SPRING = {
  stiffness: 120,
  damping: 26,
  mass: 0.8,
} as const;
