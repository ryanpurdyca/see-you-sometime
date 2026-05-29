<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This repo is on Next.js 16 (App Router, React 19, Tailwind v4). APIs, conventions, and file structure may differ from training data. Before writing Next.js / React / Tailwind code, read the relevant guide in `node_modules/next/dist/docs/` and heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Agent Operating Guide — `see-you-sometime`

> **You are reading a living document.** This file is the canonical context for any agent (human or LLM) working in this repo. The pre-commit hook (`scripts/agents-reminder.mjs`) will refuse a commit whose staged files change product code without also updating this file. That is intentional. Read this top-to-bottom on every new session, and update the relevant section before you stage your final commit.

## 0. The auto-update workflow (read this first)

When you make a change, ask:

1. **Did I add/remove a technology or dependency?** → update [§3 Technologies](#3-technologies).
2. **Did I add/move/rename a directory or top-level concept?** → update [§4 Project structure](#4-project-structure).
3. **Did I make an architectural choice with trade-offs?** → append to [§5 Decisions & trade-offs](#5-decisions--trade-offs) as a new dated entry. Don't rewrite history — append.
4. **Did I introduce a new design-system primitive or token?** → update [§6 Design system](#6-design-system).
5. **Did I learn something non-obvious that will save the next agent time?** → add it to [§7 Gotchas & lore](#7-gotchas--lore).

If none of the above apply, the change is probably trivial enough that the pre-commit reminder is wrong — bypass with `SKIP_AGENTS_CHECK=1 git commit ...`. Use sparingly; if you find yourself bypassing often, something is probably worth recording.

## 1. Product

A single-page experience: on load, the user sees a 3D book built with CSS 3D transforms, inline SVG (e.g. halftone), and static SVG cover artwork (`public/images/vitally-*.svg`) — no raster textures. The book opens and closes following pointer X; at the right edge it closes, at the left it opens fully. The cover and inner pages animate; pages fan out as the book opens. A dotted frame and gutter surround the scene; a “Change Log” label sits at the bottom-right of the frame.

Future direction is intentionally open; this is the canvas for an exploration whose product shape will emerge over time.

## 2. Architecture

```
Browser
  └─ Next.js 16 App Router
       └─ src/app/layout.tsx        Root layout (Geist, Instrument Serif, Caveat → CSS vars)
            └─ src/app/page.tsx     Server — Stage + frame chrome + book scene
                 └─ Stage           Full-viewport canvas (design system primitive)
                      ├─ LeftPageText   Caveat copy behind the open-cover footprint
                      ├─ Book           Client — pointer-driven 3D scene + reading state
                      │    ├─ BackCover, Page[], Cover
                      │    ├─ BookButtons (Open|Next, Close, Back)
                      │    ├─ CursorFollower (“Open” pill, idle only)
                      │    └─ flat overlays (idle click-to-open, reading L/R page regions)
                      ├─ gutter frame     28px `border-gutter` inset
                      ├─ dotted rules     4 edges at 28px (`--color-rule` repeating gradients)
                      └─ “Change Log”     `text-ink-subtle` label, bottom-right of rule corner
```

- **Rendering boundary:** `page.tsx` is a server component. `Book` and its interactive children are `"use client"` (pointer events, Framer Motion). Keep the boundary as deep into the tree as possible.
- **Animation model:** Pointer X is captured by `Book.tsx` and written into a single `MotionValue` called `openness` (0 = closed, 1 = open). A spring (`useSpring`) smooths it. In _idle mode_ every page and the cover derive their `rotateY` from this source via `useTransform`. In _reading mode_ the book is pinned open and each `Page` switches to Framer Motion's `animate` prop, targeting either 0° (unread, right stack) or `COVER_OPEN_ANGLE` (read, left stack) — producing a single-page-turn effect on Next/Back.
- **Book mode state machine:** `idle` → (Open clicked — button, idle overlay, or keyboard) → `reading` → (Close clicked) → `idle`. A `modeRef` mirrors React state so handlers registered once in `useEffect` always see the current mode.
- **3D model:** The scene has CSS `perspective` on the outer container. The book root has `transform-style: preserve-3d` and a static `rotateX/rotateZ` tilt. Every hinged element has `transform-origin: 0% 50%` (left edge) so they rotate around the spine. Small `translateZ` offsets prevent z-fighting when closed.

## 3. Technologies

| Layer             | Choice                                                                   | Notes                                                            |
| ----------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Framework         | Next.js 16 (App Router)                                                  | React 19. See `node_modules/next/dist/docs/` for current APIs.   |
| Language          | TypeScript (strict)                                                      | `tsconfig.json` is the source of truth.                          |
| Styling           | Tailwind CSS v4                                                          | Tokens defined in `src/design-system/tokens.css`.                |
| Animation         | Framer Motion                                                            | `useMotionValue` + `useSpring` + `useTransform`.                 |
| Class composition | `clsx` + `tailwind-merge` via `cn()`                                     | Always use `cn()` over template strings for conditional classes. |
| Lint              | ESLint 9 (flat config) + `eslint-config-next` + `eslint-config-prettier` |                                                                  |
| Format            | Prettier 3 + `prettier-plugin-tailwindcss`                               |                                                                  |
| Unit/component    | Vitest + React Testing Library + jsdom                                   |                                                                  |
| E2E               | Playwright (chromium)                                                    | `e2e/` folder. `npm run test:e2e`.                               |
| Git hooks         | Husky + lint-staged + AGENTS.md guard                                    | `.husky/pre-commit`.                                             |
| Package manager   | npm                                                                      | Lockfile is `package-lock.json`.                                 |

## 4. Project structure

```
src/
  app/                       Next.js App Router routes
    layout.tsx               Root layout — fonts + globals.css + <html>/<body>
    page.tsx                 Home — Stage, gutter, dotted rules, Change Log, Book
    globals.css              Tailwind + tokens; @utility font helpers for next/font vars
    layout.tsx               Geist (`--font-sans`), Instrument Serif (`--font-handwritten`), Caveat (`--font-caveat`)
  design-system/             Reusable, app-agnostic primitives
    tokens.css               THE source of truth for color/radius/motion/dims
    cn.ts                    Class merger
    index.ts                 Public barrel — import from here, not deep paths
    components/
      Stage.tsx              Full-viewport centered surface
      Button.tsx             primary | secondary | supporting variants
      PageSurface.tsx        Paper-card frame every book page inherits
      HalftoneSquare.tsx     Pure-SVG halftone fill
      HalftoneSquare.test.tsx
  components/                Feature compositions (not reusable primitives)
    book/
      Book.tsx               Top-level scene + reading mode state machine
      Cover.tsx              Black cover face: Vitally SVGs, centred Caveat title
      Page.tsx               Single hinged sheet (idle fan or reading-flip); renders front + back faces
      pages.tsx              Flat list of authored page components (the book's content)
      BackCover.tsx          Static back cover
      BookButtons.tsx        Fade-in Open|Next/Close/Back button pair
      CursorFollower.tsx     Custom cursor pill ("Open"); fades in near fully-open
      LeftPageText.tsx       Handwritten text behind the open cover (DOM-layered)
      constants.ts           All tunable layout/motion constants
      index.ts               Public barrel for the book feature
      Book.test.tsx
e2e/
  book.spec.ts               Playwright smoke test of the rendered book
scripts/
  agents-reminder.mjs        Pre-commit guard that nudges AGENTS.md updates
public/                      Static assets (`images/vitally-01.svg`, `vitally-02.svg` on book cover)
```

**Conventions:**

- **No raw hex / rgba in components.** All color values live in `tokens.css` and are consumed via Tailwind utilities like `bg-canvas`, `text-ink`, `bg-cover`, `text-cover-ink`, `border-ink`. If you need a new color, add a token first.
- **Design-system primitives first.** Before authoring a new visual atom inline, check `src/design-system/`. If you create a new reusable atom, place it there and export it from `index.ts`. Feature-specific composites live under `src/components/<feature>/`.
- **Tunables in `constants.ts`.** Per-feature numerical constants (angles, counts, springs) live next to the feature. Avoid hard-coding tuning numbers inside JSX.
- **Imports use the `@/*` alias.** Do not use relative paths that climb out of a feature directory.

## 5. Decisions & trade-offs

Append new entries at the bottom. Use the format: `### YYYY-MM-DD — Title`.

### 2026-05-27 — Project scaffold + book MVP

- **Next.js 16 + React 19 + Tailwind v4** chosen as the latest stable stack at project inception. Trade-off: training data for these versions is thin; agents must consult `node_modules/next/dist/docs/` rather than relying on memory.
- **Framer Motion over GSAP / pure CSS** for the book animation. Trade-off: pulls in a runtime dependency, but `useTransform` + `useSpring` lets a single `openness` motion value drive 14+ derived rotations declaratively, which is much harder to express in CSS keyframes.
- **CSS 3D (`preserve-3d` + `perspective`) over `react-three-fiber` / WebGL.** Trade-off: limited to flat-card-style geometry (no curved page sag, no shaders), but ships ~0 KB of extra runtime, renders instantly, and is fully accessible to dev tools. Sufficient for the brief.
- **No raster textures.** Per product requirement, the book is drawn — borders, gradients, and an inline SVG halftone. Trade-off: less photoreal than a textured render, but matches the wireframe-y aesthetic of the reference.
- **`openness` is derived from pointer X only**, not pointer Y. Trade-off: simpler model, but the book doesn't tilt with vertical pointer position. Future enhancement candidate.
- **AGENTS.md auto-update enforced via pre-commit.** Trade-off: occasional friction on trivial commits (mitigated by `SKIP_AGENTS_CHECK=1`), but guarantees this document doesn't rot.

### 2026-05-27 — Open-centred layout + pointer edge margins

- **`position: relative; left: calc(var(--book-width) / 2)`** on the book container offsets it so the spine sits at screen centre. When fully open the spread is symmetric around centre; when closed the cover shifts right-of-centre. Implemented via a CSS `left` offset (rather than `translateX` on the 3D element) so it doesn't interact with the `preserve-3d` transform stack.
- **`POINTER_EDGE_MARGIN_PX = 100`** clamps the active pointer range to [100px, viewportWidth−100px]. This means the user reaches full open/closed before the cursor hits the very edge of the screen, which is more ergonomic and avoids accidental max-state at the screen boundary. The usable range maps linearly to openness [0, 1].

### 2026-05-27 — Pointer range anchored to book geometry, spine rounding, left-page text

- **Pointer range anchored to book edges.** `closeAt = spineX + BOOK_WIDTH_PX` (right edge of closed book) and `openAt = spineX - BOOK_WIDTH_PX` (left edge of the open spread). Replaces the 100px screen-edge margin with semantically meaningful positions that adapt to viewport width automatically.
- **Spine rounding.** All four book pieces (Cover, BackCover, Page, CoverInside) now use `rounded-l-[8px]` on the spine edge to match the right-side corner radius.
- **`LeftPageText` component** (`src/components/book/LeftPageText.tsx`). Displays handwritten placeholder text centred in the area the front cover occupies when fully open. Positioned at `left: calc(50vw - var(--book-width))` so it aligns exactly with the open cover's footprint. Rendered before `<Book />` in DOM order so the 3D scene (including the swinging cover) paints over it. Uses Caveat via `--font-caveat` (inline `fontFamily` style). Asymmetric padding (`pl-8 pr-16`) and `overflow-hidden` keep copy covered when the cover is open.
- **Cover occlusion fix.** `backfaceVisibility: "hidden"` must NOT be placed on the outer `preserve-3d` container of `Cover.tsx`. Doing so hides the _entire subtree_ — including `CoverInside` — once the container's backface faces the viewer (past −90°). Each child (`CoverFace`, `CoverInside`) carries its own `backfaceVisibility: "hidden"` to control visibility independently.
- **Cover accent border uses inset box-shadow, not CSS border.** A `border` straddles the element's outer edge and anti-aliases against the surroundings, which reads as the accent line "bleeding" past the cover's rounded corners in 3D. Switching to `shadow-[inset_0_0_0_2px_var(--color-accent),…]` keeps the visible line strictly inside the cover's box (and combines with the existing drop shadow in a single token).

### 2026-05-27 — Reading mode, page-flip, BookButtons

- **Reading mode** adds a `mode: 'idle' | 'reading'` state to `Book.tsx`. In reading mode the pointer handler is bypassed (via `modeRef`) and `openness` is pinned at 1.
- **Page flip animation**: `Page.tsx` accepts a `readingPage: number | null` prop. When null, `rotateY` is driven by the `useTransform` MotionValue (fan). When set, `rotateY` is removed from `style` and Framer Motion's `animate` prop takes over — pages with `index < readingPage` target `COVER_OPEN_ANGLE`, others target 0°. Removing the MotionValue from `style` is required; leaving it alongside `animate` causes conflicts in Framer Motion.
- **`BookButtons`** (`src/components/book/BookButtons.tsx`) is a flat 2D overlay positioned outside the perspective container. Opacity is driven directly by the `smoothOpenness` MotionValue. `pointerEvents` toggles via React state updated with `useMotionValueEvent` above a 0.15 threshold so invisible buttons aren't clickable. Button labels and handlers derive from `mode` + `currentPage`.
- **`Book` outer div is `absolute inset-0`**: changed from a flex child to a full-viewport absolute element so `BookButtons` can use `left: calc(50vw...)` positioning without being offset by the perspective container or the book's own dimensions.

### 2026-05-27 — Tilt-to-zero on open; animated Read transition

- **Scene tilt reduces to 0° as book opens.** `tiltX` and `tiltZ` are `useTransform` MotionValues derived from `smoothOpenness` (`[0,1] → [SCENE_TILT_X_DEG, 0]` and `[SCENE_TILT_Z_DEG, 0]`). The book inner div is now a `motion.div` with `style={{ rotateX: tiltX, rotateZ: tiltZ }}` instead of a static `transform` string.
- **Persistent `rotateY` MotionValue in `Page`.** Previously, switching between idle and reading modes swapped between `style.rotateY` (MotionValue) and `animate.rotateY` (declarative), causing Framer Motion to lose the current position and snap. Fix: a single `rotateY = useMotionValue(...)` always lives in `style`. A `useEffect` drives it in two ways: in idle mode it subscribes to `idleRotateY` changes; in reading mode it calls the imperative `animate(rotateY, target, spring)` which correctly springs FROM the current position. This gives a smooth fan-to-flat collapse on Read and clean page flips on Next/Back.

### 2026-05-27 — Reading-mode raised pages, hover lift, clickable page regions

- **Reading tilt (`READING_SCENE_TILT_X = 6°`)**: When Read is clicked, an additional `rotateX` is animated onto the scene via a `readingTiltX` MotionValue (springs in; springs back to 0 on Close/Cancel). `combinedTiltX = useTransform([tiltX, readingTiltX], ([a, b]) => a + b)` merges both signals cleanly without nesting springs.
- **Per-page peel**: `Page.tsx` accepts `peeled` (about-to-flip page), `subPeeled` (page directly behind on the right), and `hovered` (extra peel boost). The base peel is **per-side** because the geometry is asymmetric — cos() is steeper near 90° than near 0° or 180°, so the LEFT (folding from −174° toward 0°) needs a smaller angle than the RIGHT (folding from 0° toward −180°) to expose the same amount of page behind. Uses `PAGE_BASE_PEEL_LEFT_DEG (20°)` and `PAGE_BASE_PEEL_RIGHT_DEG (25°)`. Sub-peel (`PAGE_SUB_PEEL_DEG = 12°`) applies only on the right; the left gets its cascade for free from the back stack at COVER_OPEN_ANGLE. Hover is **additive** (`PAGE_HOVER_BOOST_DEG = 6°` on top of base), so hovering always increases the peel rather than replacing it.
- **Right-stack Z reversal in reading mode**: In idle/fan mode all pages use `(index + 1) * PAGE_Z_STEP` so outermost pages sit on top. In reading mode the right stack is reversed: `readingPage` gets the highest Z (`NUM_PAGES * PAGE_Z_STEP`) and higher-indexed pages get progressively lower Z. Without this, `readingPage` sits at the bottom of the visual stack and its peel disappears behind the pages above it. The left stack keeps the natural ordering (readingPage − 1 already has the highest Z there).
- **Transparent click overlay regions**: In reading mode, two `<div>` elements are rendered outside the perspective container (flat screen space, no 3D transform) covering the left and right page footprints (`left: calc(50vw - var(--book-width))` and `left: 50vw`). Left region: onClick → handleBack (no-op when on page 0), onMouseEnter/Leave → setHoveredSide. Right region: onClick → handleNext (no-op on last page), hover handlers same pattern. This keeps hit-testing simple and avoids raycasting through the 3D scene.
- **`hoveredSide` state** (`'left' | 'right' | null`) drives the extra hover peel on the single about-to-flip page (`i === readingPage - 1` for left, `i === readingPage` for right). The base `peeled` peel applies automatically to those same pages without hover. Both are disabled on the left side when `readingPage === 0` (cover is flat, nothing to flip back to). Cleared on mode exit to prevent stale peel.

### 2026-05-28 — Tilt system, sequential close, animated page label

- **Idle tilt grows with openness**: `baseTiltX = useTransform(smoothOpenness, [0,1], [0, 12])`. Reading mode pins total tilt at 0° by springing `readingTiltX` to −12 on Read (exactly cancels `baseTiltX` at openness=1). Both use the same `OPENNESS_SPRING` so they track together.
- **Sequential close animation**: `handleClose` decrements `currentPage` by 1 every 90ms (most-recently-flipped first), then waits 200ms before closing the cover. Mode flips to `idle` only once `smoothOpenness < 0.01`, preventing a fan-burst from pages snapping to their idle positions mid-animation.
- **`isClosing` flag**: Set true at the start of `handleClose`, false in `finishClose` and `handleRead`. While true, `peeled` and `subPeeled` are suppressed so the peel springs to 0° immediately — prevents a "stuck tilted page" artefact during close.
- **`BackCover` fades in**: opacity driven by `useTransform(openness, [0.55, 1], [0, 1])` so it only appears once the cover is substantially open.
- **Keyboard navigation**: Arrow-right → Next, Arrow-left → Back (or Close when on page 0). Handler registered once; reads `modeRef` and `currentPageRef` to avoid stale closures.
- **`currentPageRef`**: Mirrors `currentPage` state (same `setCurrentPageSync` pattern as `modeRef`) so the recursive `flipNext` timeout callback always reads the latest page without capturing a stale closure.
- **Animated page label**: Monospace blue label below the book shows "Page 1" / "Pages N–M". Only changed digits animate — unchanged digits stay static. Each digit has its own `overflow-hidden` clip container so numbers roll in/out like a slot machine. Direction (Next = roll up, Back = roll down) is tracked with a render-phase state update (`prevPage`/`dir` state pair). The right-hand number starts its stagger 60ms after the left (`staggerOffset`). **Do not use refs for this**: ESLint's `react-hooks/refs` rule rejects ref reads/writes during render — use render-phase `useState` updates instead.

### 2026-05-27 — Border/radius polish, idle click-to-read, BookButtons redesign

- **Unified corner radii**: All book pieces (Cover, BackCover, Page, CoverInside) now use `rounded-[10px]` uniformly. Previous asymmetric `rounded-l-[8px]` on the spine edge is removed.
- **Page borders**: Pages use `border border-accent` (1px outer). The per-page inner gradient shadow div is removed — the border alone provides sufficient edge definition.
- **Cover double-border**: Cover uses `border border-accent` (outer) plus an `aria-hidden` inset child `div` at `inset-[3px] rounded-[7px] border border-accent` to give a two-line frame effect without fighting 3D anti-aliasing.
- **Mouse range inset**: `closeAt = spineX + BOOK_WIDTH_PX - 100` and `openAt = spineX - BOOK_WIDTH_PX + 100`. Full open/close is reached 100px before the book's physical edge, which is more ergonomic.
- **Idle click-to-read**: A transparent `<div>` overlay spanning the full book footprint (`calc(var(--book-width) * 2)`) is rendered in idle mode; clicking it fires `handleRead`. This is outside the perspective container so hit-testing is flat.
- **Button row spacing**: `top: calc(50vh + var(--book-height) / 2 + 32px)` — 32px fixed gap below the book bottom edge.
- **BookButtons layout**: Redesigned from two edge-aligned buttons to a left group + right single. In reading mode the left group holds "Next" always and "Back" which fades in (`AnimatePresence`, opacity-only, 150ms) once `currentPage > 0`. "Close" sits on the right in both modes. In idle mode the primary button shows "Open" (was "Read"); the right shows "Close".

### 2026-05-28 — Cover branding: black face, Vitally artwork, Caveat labels

- **Cover face** (`Cover.tsx`): black `bg-cover`, white inset frame (`cover-border-inner`), two Vitally SVGs in corners, centred Caveat title (`text-3xl`) via `style={{ fontFamily: "var(--font-caveat)" }}` — same pattern as `LeftPageText`.
- **`page.tsx` frame label**: “Change Log” in `text-ink-subtle` mono, offset from the bottom-right dotted-rule corner (`bottom: 44px`, `right: 52px` = rule inset 28px + 16px / 24px).
- **`cover-ink` token** for white typography on the black cover.

### 2026-05-28 — CursorFollower, Button design system component, visual polish

- **`CursorFollower`** (`src/components/book/CursorFollower.tsx`). A custom cursor pill ("Open") rendered as a `position: fixed` element with `top: 0; left: 0` so it anchors to the viewport (without explicit insets, a `fixed` element's natural position is its document-flow position, which is off-screen at the bottom of a tall component tree). `x`/`y` are spring-smoothed (`stiffness: 250, damping: 25`) MotionValues tracking `pointermove`; the first move snaps to cursor position via `x.set()` directly on the spring to avoid an initial sweep from (0, 0). Opacity is a `useTransform` over `[openness, modeScale, hoverScale]` — three independent gates: (1) proximity gate ramps from 0→1 as openness goes 0.65→0.95; (2) `modeScale` fades to 0 in reading mode; (3) `hoverScale` gates on `onMouseEnter`/`onMouseLeave` of the idle book overlay in `Book.tsx`. All three must be non-zero for the pill to appear.
- **`Button` design-system component** (`src/design-system/components/Button.tsx`). Generic button with `variant` prop (`primary`, `secondary`, `supporting`). All book UI buttons now use this component.
- **Visual polish** (see also Cover branding entry — cover title reverted to Caveat): black `border-ink` on book pieces, dotted rules inset 28px (`--color-rule`), `border-gutter` frame, metadata labels ("Ryan Purdy" / "Spring 2026") in reading mode, canvas background `#f7f5f1`, scene tilts zeroed in idle.
- **Fonts**: Geist → `--font-sans` (body). Instrument Serif → `--font-handwritten` (available via `@utility font-handwritten`; not used on cover). Caveat → `--font-caveat` for `LeftPageText` and cover title — prefer inline `style={{ fontFamily: "var(--font-caveat)" }}` over `@utility font-caveat` when reliability matters (see §7).

### 2026-05-28 — Open affordances and Button interaction states

- **Labels**: `CursorFollower` and idle primary `BookButtons` action say **“Open”** (not “Read Book” / “Read”). In reading mode the primary button says **“Next”**.
- **Button variants** (current): `primary` — `hover:bg-ink/85`, `active:bg-ink/75`; `secondary` — hover fills ink + white text, `active:bg-ink/75` + white text; `supporting` — hover `border-ink` only (no fill), `active:border-ink active:bg-ink/5`.

### 2026-05-28 — Canonical current state (read this when older §5 entries conflict)

Historical entries below remain for context; **this list is the source of truth** for the design-system branch:

| Topic                | Current behavior                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Book piece borders   | `border-ink` on Cover, Page, BackCover (not `border-accent`)                                                                                                               |
| Cover face           | Black `bg-cover`, outer `border-ink`, white inset `border-cover-border-inner`, corner Vitally SVGs, centred Caveat title “Memories from / my time at Vitally” (`text-3xl`) |
| Cover fonts          | Caveat via `--font-caveat` inline style — **not** Instrument Serif                                                                                                         |
| Page chrome          | `page.tsx`: 28px gutter, dotted rules at `top/bottom/left/right-7`, “Change Log” at `bottom: 44px`, `right: 52px`                                                          |
| Button row           | `top: calc(50vh + var(--book-height) / 2 + 52px)`                                                                                                                          |
| Page label (reading) | `text-ink-subtle` mono between buttons — not accent blue                                                                                                                   |
| LeftPageText font    | `--font-caveat` inline style                                                                                                                                               |
| Static assets        | `public/images/vitally-01.svg`, `vitally-02.svg` on cover only                                                                                                             |

### 2026-05-28 — Customizable pages (two-faced leaves + content list)

- **Page content is data, authored in `src/components/book/pages.tsx`** as a flat `bookPages: ReactNode[]`. Each entry is one page-face; the book pairs them into sheets (front = `bookPages[2i]`, back = `bookPages[2i+1]`), which matches reading order. Trade-off chosen over an explicit `{front, back}[]` shape: a flat list reads as "as many pages as I create" and an odd final page simply gets a blank back. Add/remove entries to change content and thickness.
- **One leaf owns both faces.** `Page.tsx` (the hinged sheet) renders two absolutely-positioned face `<div>`s: front at `rotateY(0)`, back at `rotateY(180deg) translateZ(1px)`, each with `backfaceVisibility: "hidden"`. Splitting front/back into two components was rejected — a sheet is one rigid element in CSS 3D; two elements would have to share rotation/peel/z. The back's pre-rotation makes its content read correctly (un-mirrored) once the sheet flips to the left stack. Same pattern as `Cover`'s `CoverFace`/`CoverInside`.
- **Leaf no longer carries the paper look.** The `bg-paper rounded border-ink` styling moved off the leaf div into the new `PageSurface` primitive (§6); the leaf div is now a transparent `preserve-3d` positioner. Authored pages wrap content in `PageSurface` and inherit the frame; missing faces fall back to a blank `<PageSurface />` in `Book.tsx` so the back still looks like paper.
- **`NUM_PAGES` is now derived, not hardcoded.** `constants.ts` computes `NUM_PAGES = Math.ceil(bookPages.length / 2)` (sheet count) by importing `pages.tsx`. The import direction is constants → pages (pages imports only `PageSurface`), so there's no cycle. `Book`/`Page`/`Cover` geometry that keyed off `NUM_PAGES` adapts automatically.

### 2026-05-28 — Idle fan order fix (page 1 always leads, spread capped below 90°)

- **Bug:** the page on top while moving the mouse (idle fan) was not the page reading mode opened to. **Root cause is geometric, not z-index/DOM order:** a leaf hinged at the left spine and rotated by a negative `rotateY` swings its right edge tens of px toward the viewer, which completely dominates the ~0.4px `PAGE_Z_STEP` `translateZ` offsets. So for these intersecting rotated planes the frontmost sheet is whichever is _most rotated_, regardless of `translateZ` or DOM paint order. Two earlier fixes that only touched `translateZ` and DOM order were verified ineffective and reverted.
- **Fix part 1 — reverse the fan.** `Page.tsx`: `fanFraction = (NUM_PAGES - index) / (NUM_PAGES + 1)` (was `(index + 1) / …`). Sheet 0 (page 1) now gets the _largest_ tilt, so it leans most toward the viewer and stays on top; deeper sheets tilt progressively less. `opensAt` (per-sheet open threshold) keys off the same fraction so page 1 also opens first.
- **Fix part 2 — cap the spread below 90°.** `PAGE_FAN_SPREAD` 158 → **46**. A symmetric fan that crosses 90° inevitably promotes whichever sheet passes ~90° to the front (its right edge is then nearest the viewer), which would re-break the order. Keeping every tilt under 90° guarantees the most-tilted sheet (page 1) always wins and stays readable. Trade-off: the dramatic wide card-spread becomes a subtler gentle fan — accepted by the user ("Gentle fan, always correct").
- **Verified:** partial-open idle, full-open idle, and reading mode all show page 1 ("Chapter One") on top; Next still flips correctly to Pages 2–3.

### 2026-05-28 — Cover iridescence (pointer-tracking sheen)

- **Effect.** `Cover.tsx` renders a screen-blended overlay on `CoverFace`: three large, low-contrast pastel radial washes (cool blue, warm pink, green→gold) anchored at fixed points across the cover, plus a faint pointer-following bloom. The goal is the soft pearlescent sheen of an _iridescent sticker_ — the whole cover holds gentle colour, no localized blob and no hard centre. `mixBlendMode: "screen"` means it only adds light over the black `bg-cover` (and brightens the white type/Vitally artwork it passes over) — it never darkens.
- **Two rejected variants (don't reintroduce).** (1) A linear "shiny sweep" specular stripe — too high-contrast/literal. (2) A pointer-centred conic rainbow for shimmer — created a harsh pinwheel/starburst convergence point ("too extreme"). The anchored-washes approach replaced both.
- **Shimmer animation.** A `shimmer` MotionValue is animated `0 → 2π` over 9s, `ease: "linear"`, `repeat: Infinity` via `animate()` in a `useEffect` (controls stopped on unmount). Each wash's centre orbits its anchor by `SHEEN_DRIFT` (≈7%) at a phase offset (`useTransform` with `Math.cos/sin`), so the overlap shifts continuously for a subtle shimmer even when the pointer is still. Runs continuously but only visible while the hover-gated `sheenOpacity` is non-zero.
- **Why a window listener, not element hover.** The cover can't receive its own pointer events — the perspective container sets `pointerEvents: "none"` (see §7). So `Cover` subscribes to `window` `pointermove`, measures `CoverFace`'s projected `getBoundingClientRect()`, and derives a local 0–1 position. A `hover` MotionValue (0/1, spring-smoothed) gates opacity off whenever the cursor leaves the cover's footprint, so the sheen only appears while hovering the book.
- **Springs.** Position (`sheenX/Y`) and opacity (`hover`) are smoothed with `COVER_SHEEN_SPRING` (looser than `OPENNESS_SPRING`) so the sheen glides behind the cursor like a reflection. Built into a `background` string with `useMotionTemplate`.
- **Trade-off.** Uses `getBoundingClientRect()` on each `pointermove`; cheap for one element and the read is per-move only. Mapping is screen-space, so on the rotated/open cover the sheen isn't perspective-corrected — acceptable since the cover faces away once open and the effect is meant to read as a loose reflection.

### 2026-05-29 — Idle fan reworked to an in-plane "deck" fan (supersedes the rotateY fan)

- **What changed.** The idle preview fan no longer opens the sheets like a book (per-sheet `rotateY`). Instead every sheet shares one open tilt and is splayed **in-plane** (`rotateZ`), so the pages fan out like a riffled deck above the top page. Replaces the "reverse rotateY fan" of the 2026-05-28 _Idle fan order fix_ entry (and the wide-fan/cross-spine experiments tried on the way) — those are gone.
- **Why.** Requirement: pages must **always read in the correct order** (page 1 leading), and the fan should spread fully so the pages are visibly fanned. A `rotateY` fan can't do both: co-hinged sheets are occluded by whichever is most-rotated, so keeping page 1 on top forces it to be the most-tilted sheet, which then _covers_ the others (they only peek as slivers); and any sheet crossing ~90° jumps to the front (the documented order bug) and a spread across the spine produces a central "bowtie" of edge-on sheets. The user confirmed this is a **light, for-fun preview** before opening the book proper — readability of the fanned sheets doesn't matter, order does.
- **How order is guaranteed.** With a shared `rotateY` (`PAGE_OPEN_TILT_DEG`) all sheets are **parallel planes**, so front-to-back order is set purely by `translateZ`, not by rotation/occlusion. Idle `translateZ = (NUM_PAGES - index) * PAGE_FAN_Z_STEP` puts sheet 0 (page 1) on top, every deeper sheet strictly behind it — order can never break no matter how wide the splay. `PAGE_FAN_Z_STEP` (1.6px) is larger than the closed-state `PAGE_Z_STEP` (0.4px) because the near-coincident deck planes z-fight near the spine at the smaller step.
- **The splay.** `idleRotateZ = -PAGE_FAN_SPLAY_DEG * depth` where `depth = index/(NUM_PAGES-1)`. Page 1 stays flat (0°); each deeper sheet fans farther, up to `PAGE_FAN_SPLAY_DEG` (30°) for the last. **Negative on purpose** — `rotateZ` is clockwise in CSS, so negative fans the deck _upward_ into open space rather than down over the Open/Close buttons. `opensAt = 0.12 + depth*0.42` keeps the cascade (page 1 fans first as the book opens, deeper sheets follow).
- **`Page` now drives two rotations.** A `rotateZ` `MotionValue` lives in `style` alongside `rotateY` (same pattern as the persistent-rotateY fix): in idle it subscribes to `idleRotateZ`; in reading mode an imperative `animate(rotateZ, 0, …)` flattens the deck so the page-flip is a pure `rotateY` turn. Both unsubscribe/stop on cleanup.
- **Trade-off.** The deck fans up-and-right on the right page, not literally across to the left "behind the cover" — a true left spread is the impossible case above. A faint sheet-edge sliver shows at the spine where the splayed planes meet; acceptable for a light preview. Tunables: `PAGE_OPEN_TILT_DEG`, `PAGE_FAN_SPLAY_DEG`, `PAGE_FAN_Z_STEP` in `constants.ts`.

### 2026-05-29 — Idle fan reworked AGAIN to a full left-to-right `rotateY` spread (supersedes the deck fan)

- **What changed.** The idle fan is back to a 3D book-opening (`rotateY`) hinge fan, but now it spreads the sheets **EVENLY across the entire open book — right to left — following behind the cover**, instead of the right-only deck/sub-90° fans. Supersedes both the in-plane deck fan and the short-lived lead/tail (`PAGE_FAN_LEAD_DEG`/`PAGE_FAN_TAIL_DEG`) WIP; those constants are gone. New tunables in `constants.ts`: `PAGE_FAN_NEAR_DEG` (12), `PAGE_FAN_FAR_DEG` (165).
- **Why.** The user wanted the pages to fan fully across the whole book (not just crack open on the right) as a fun content preview, in correct reading order; readability of the fanned pages explicitly does **not** matter ("that's what opening the book is for").
- **The mapping (`Page.tsx`).** `depth = index/(NUM_PAGES-1)`; `finalAngle = -(FAR - (FAR-NEAR)*depth)`. Sheet 0 (page 1) rests at the FAR angle (`-165°`, flat on the left, tucked just inside the open cover at `-174°`); the last sheet rests at NEAR (`-12°`, flat on the right); every sheet between is evenly spaced. The angle is **monotonic in index**, so scanning the fan left → right reads page 1, 2, 3 … N in order. `opensAt = 0.1 + depth*0.5` cascades the sheets out behind the cover (which itself finishes opening at openness 0.55) so page 1 leads and deeper sheets follow.
- **The edge-on tradeoff (decided, don't "fix" it).** A uniform spread across the arc necessarily parks a mid-book sheet near 90°, which goes edge-on and, under the scene perspective, projects a downward wedge ("bowtie") below the book and leans most toward the viewer (so a mid page like 6/7 reads forward-most). An earlier dead-zone variant (`PAGE_FAN_DEADZONE_DEG`, skipping ±30° around 90°) removed the wedge by splitting the fan into clean left/right groups — but the user explicitly rejected it: it made the two innermost pages dominate with a gap behind them, and they preferred the **even** riffle even at the cost of readability and the wedge. So the dead-zone is gone; the wedge is accepted.
- **Order.** Guaranteed by the **monotonic angle**: scanning left → right is always reading order, even though the near-90° mid sheet sits forward-most.
- **Idle z-order must match reading-page-0 (close-peek fix).** Idle `translateZ` is `(NUM_PAGES - index) * PAGE_Z_STEP` (descending — sheet 0 on top), **not** the old `(index + 1)` (ascending). This is identical to the right-stack order at `readingPage === 0`, so the reading→idle switch at the end of a close (fired at `smoothOpenness < 0.01`, when the cover is still ~3° ajar) doesn't reorder the stack. With the old ascending idle order the sheets flipped at that instant and a lower sheet (page 3) flashed through page 1 before the cover seated — and only when closing from page 0 (flipping pages first changed the settle timing enough to hide it). The fan itself is rotation-dominated, so the z-order change is invisible there. Reading-mode z-order (right reversed, left natural) is unchanged.
- **Reading mode untouched.** The fan only drives the `readingPage === null` path; the persistent-`rotateY` page-flip and peel logic are unchanged. Verified: full-open idle spread, mid-open cascade, Open → "Chapter One"/Page 1 page-flip, and close-from-page-0 (no peek) all render correctly.

### 2026-05-29 — `PAGE_Z_STEP` raised for coplanar close stability

- **`PAGE_Z_STEP` 0.4 → 1.5.** The idle z-order fix above stopped the stack from _reordering_ at the reading→idle switch, but closing from page 0 with every sheet at `rotateY: 0` still left six coplanar planes. At 0.4px the depth gaps fell below renderer precision after the perspective divide, so the sort went unstable as the cover seated and a lower sheet (e.g. page 3) flickered through page 1. Flipping pages first hid it because sheets were still mid-spring at varied angles. The fan is rotation-dominated and closed/reading stacks share one outline, so the larger step is invisible except killing that flicker.

## 6. Design system

**Tokens** (`src/design-system/tokens.css`):

- Colors: `canvas`, `surface`, `surface-raised`, `ink`, `ink-muted`, `ink-subtle`, `accent`, `accent-strong`, `accent-soft`, `paper`, `paper-edge`, `cover` (black), `cover-border-inner` (white), `cover-ink` (white), `rule` (`#cfccc6` dotted frame), `gutter` (frame fill).
- Radii: `radius-xs`, `-sm`, `-md`, `-lg`.
- Book geometry: `--book-width`, `--book-height`, `--book-spine`.
- Motion: `--ease-out-soft`, `--ease-page`, `--duration-fast|base|slow`.

**Primitives** (`src/design-system/components/`):

- `Stage` — Full-viewport centered surface for top-level scenes.
- `HalftoneSquare` — Pure-SVG dot grid. Color-controlled via `currentColor`.
- `Button` — Generic button with `variant` prop: `primary` (filled ink, hover/active opacity), `secondary` (outlined ink; hover fills ink/white text; active matches primary `bg-ink/75`), `supporting` (ghost; hover 2px ink border, no fill; active light ink tint). Always use this over raw `<button>` elements.
- `PageSurface` — The "paper card" frame for every book page (paper bg, ink border, `rounded-[10px]`, `p-8`, `flex flex-col`). Fills its parent (a leaf's 3D face wrapper) via `absolute inset-0`; owns no 3D transform. Authored pages in `book/pages.tsx` wrap content in this and extend it via `className`. Accepts all `div` props.

**Utilities:**

- `cn(...inputs)` — class merger combining `clsx` and `tailwind-merge`. Use for every conditional className.

When you add a primitive or token, update this section and add it to the design-system barrel export.

## 7. Gotchas & lore

- **`.claude/launch.json`** defines the dev server for the Claude Code preview tool (`preview_start "next-dev"`). It uses `npm --prefix see-you-sometime run dev` so it works from the parent `Development/` session root as well as from the project root directly.
- **Next.js 16 strict ESLint** — the flat config in `eslint.config.mjs` chains `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`, then applies `eslint-config-prettier` last to disable conflicting stylistic rules.
- **Framer Motion in Server Components** — Framer Motion components are client-only. The Book and its parts have `"use client"` directives; do not import them from a server component without that boundary.
- **`transform-style: preserve-3d` is fragile** — if any ancestor sets `overflow: hidden` and doesn't also have `preserve-3d`, child rotations may clip. Stage uses `overflow-hidden` for layout; the perspective wrapper inside `Book.tsx` re-establishes the 3D context for the book itself.
- **Pointer events with `passive: true`** — we register `pointermove` and `touchmove` as passive listeners since we never call `preventDefault`; this avoids the scroll-jank warning on touch devices.
- **`next/font` variables need `@utility`, not `@theme inline`** — `@theme inline` resolves `var()` references at build time. Color tokens work because they're defined statically in `tokens.css`. Font variables injected by `next/font` at runtime are invisible to Tailwind's build step, so `@theme inline { --font-handwritten: var(--font-handwritten) }` generates no utility. Fix: use `@utility font-handwritten { font-family: var(--font-handwritten); }` in `globals.css` instead — this emits the rule directly and lets the CSS variable resolve at runtime from the `html` element.
- **`@utility` font helpers can silently fail for some `next/font` variables** — even a correctly declared `@utility font-caveat { font-family: var(--font-caveat); }` may not apply if Tailwind's class scanner misses the utility or the CSS variable resolves before `next/font` injects it. Reliable fallback: use an inline `style={{ fontFamily: "var(--font-caveat)" }}` directly on the element — this bypasses Tailwind entirely and resolves the CSS variable at runtime from the `html` element.
- **`useSpring` tracking stalls when source jumps from its initial value** — In Framer Motion 12, `useSpring(source)` tracks changes to `source` via subscription. If `source` was never animated (sits at its initial value 0 since mount) and then `source.set(1)` is called, the spring's internal animation scheduler sometimes fails to start, leaving the spring dormant at 0. Workaround: after `source.set(newValue)`, also call `animate(smoothValue, newValue, ...)` directly to bypass the tracking. This is why `handleRead` calls `animate(smoothOpenness, 1, { stiffness: 400, damping: 40 })` alongside `openness.set(1)`.
- **`preserve-3d` perspective container must have `pointerEvents: "none"`** — 3D-transformed children are hit-tested in screen space, so visually overlapping 3D book elements capture pointer events before flat overlay `<div>`s behind them in the DOM. Setting `pointerEvents: "none"` on the perspective container delegates all interaction to the purpose-built flat overlays (idle click region, reading-mode left/right regions) which are rendered outside the perspective container as siblings.
- **Cover and left-page Caveat** — use `style={{ fontFamily: "var(--font-caveat)" }}` on cover title and `LeftPageText`; do not use `--font-handwritten` for those surfaces.
- **§5 history vs current** — entries before “Canonical current state” may describe superseded accent borders, Instrument Serif on the cover, or “Read” labelling; trust the canonical table and §1–§4 over older decision bullets.

## 8. Quality gates

| Command                | What it checks                                            |
| ---------------------- | --------------------------------------------------------- |
| `npm run typecheck`    | TypeScript across the repo with `--noEmit`.               |
| `npm run lint`         | ESLint (flat config).                                     |
| `npm run format:check` | Prettier in check mode.                                   |
| `npm run test:run`     | Vitest unit/component tests.                              |
| `npm run test:e2e`     | Playwright E2E suite (starts dev server automatically).   |
| `npm run check`        | Runs typecheck + lint + format:check + test:run together. |

`npm run check` is the green-light bar before opening a PR. The pre-commit hook does not run the full check (too slow); it runs lint-staged on touched files and the AGENTS.md guard.
