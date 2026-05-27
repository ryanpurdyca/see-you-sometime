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

A single-page experience: on load, the user sees a 3D book rendered entirely with CSS/SVG (no textures or imported imagery). The book opens and closes following the user's mouse X position — pointer at the right edge closes it, pointer at the left edge opens it fully. The cover and the inner pages each animate; the pages fan out as the book opens.

Future direction is intentionally open; this is the canvas for an exploration whose product shape will emerge over time.

## 2. Architecture

```
Browser
  └─ Next.js 16 App Router
       └─ src/app/layout.tsx        Root layout (fonts, globals.css)
            └─ src/app/page.tsx     Server component, renders <Stage><Book /></Stage>
                 ├─ Stage           Full-viewport canvas (design system primitive)
                 └─ Book            Client component — pointer-driven 3D scene + reading state
                      ├─ BackCover
                      ├─ Page[]     One per page; hinges on spine; fan or reading-flip animation
                      ├─ Cover      Front cover; opens first, leads the fan
                      └─ BookButtons Fades in with openness; Read/Cancel → Close/Next/Back
```

- **Rendering boundary:** `page.tsx` is a server component. The `Book` component is `"use client"` (it needs pointer events and Framer Motion springs). Keep the boundary as deep into the tree as possible — only what genuinely needs interactivity should be client.
- **Animation model:** Pointer X is captured by `Book.tsx` and written into a single `MotionValue` called `openness` (0 = closed, 1 = open). A spring (`useSpring`) smooths it. In _idle mode_ every page and the cover derive their `rotateY` from this source via `useTransform`. In _reading mode_ the book is pinned open and each `Page` switches to Framer Motion's `animate` prop, targeting either 0° (unread, right stack) or `COVER_OPEN_ANGLE` (read, left stack) — producing a single-page-turn effect on Next/Back.
- **Book mode state machine:** `idle` → (Read clicked) → `reading` → (Close clicked) → `idle`. A `modeRef` mirrors the React state so the pointer-move event handler (registered once in `useEffect`) always sees the current mode without needing to re-register.
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
    page.tsx                 Home route, renders <Stage><Book /></Stage>
    globals.css              Imports Tailwind + tokens; minimal element resets
  design-system/             Reusable, app-agnostic primitives
    tokens.css               THE source of truth for color/radius/motion/dims
    cn.ts                    Class merger
    index.ts                 Public barrel — import from here, not deep paths
    components/
      Stage.tsx              Full-viewport centered surface
      HalftoneSquare.tsx     Pure-SVG halftone fill
      HalftoneSquare.test.tsx
  components/                Feature compositions (not reusable primitives)
    book/
      Book.tsx               Top-level scene + reading mode state machine
      Cover.tsx              Hinged front cover with face + inside surfaces
      Page.tsx               Single hinged page (idle fan or reading-flip)
      BackCover.tsx          Static back cover
      BookButtons.tsx        Fade-in Read/Cancel/Close/Next/Back button pair
      LeftPageText.tsx       Handwritten text behind the open cover (DOM-layered)
      constants.ts           All tunable layout/motion constants
      index.ts               Public barrel for the book feature
      Book.test.tsx
e2e/
  book.spec.ts               Playwright smoke test of the rendered book
scripts/
  agents-reminder.mjs        Pre-commit guard that nudges AGENTS.md updates
public/                      Static assets (currently empty)
```

**Conventions:**

- **No raw hex / rgba in components.** All color values live in `tokens.css` and are consumed via Tailwind utilities like `bg-canvas`, `text-ink`, `border-accent`. If you need a new color, add a token first.
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
- **`LeftPageText` component** (`src/components/book/LeftPageText.tsx`). Displays handwritten placeholder text centred in the area the front cover occupies when fully open. Positioned at `left: calc(50vw - var(--book-width))` so it aligns exactly with the open cover's footprint. Rendered before `<Book />` in DOM order so the 3D scene (including the swinging cover) paints over it. Uses `Caveat` Google Font via `next/font/google` (`variable: "--font-handwritten"`). Text is shifted left within the container via asymmetric padding (`pl-4 pr-28`) — `overflow-hidden` on the container guarantees it remains fully covered when open regardless of horizontal position.
- **Cover occlusion fix.** `backfaceVisibility: "hidden"` must NOT be placed on the outer `preserve-3d` container of `Cover.tsx`. Doing so hides the _entire subtree_ — including `CoverInside` — once the container's backface faces the viewer (past −90°). Each child (`CoverFace`, `CoverInside`) carries its own `backfaceVisibility: "hidden"` to control visibility independently.

### 2026-05-27 — Reading mode, page-flip, BookButtons

- **Reading mode** adds a `mode: 'idle' | 'reading'` state to `Book.tsx`. In reading mode the pointer handler is bypassed (via `modeRef`) and `openness` is pinned at 1.
- **Page flip animation**: `Page.tsx` accepts a `readingPage: number | null` prop. When null, `rotateY` is driven by the `useTransform` MotionValue (fan). When set, `rotateY` is removed from `style` and Framer Motion's `animate` prop takes over — pages with `index < readingPage` target `COVER_OPEN_ANGLE`, others target 0°. Removing the MotionValue from `style` is required; leaving it alongside `animate` causes conflicts in Framer Motion.
- **`BookButtons`** (`src/components/book/BookButtons.tsx`) is a flat 2D overlay positioned outside the perspective container. Opacity is driven directly by the `smoothOpenness` MotionValue. `pointerEvents` toggles via React state updated with `useMotionValueEvent` above a 0.15 threshold so invisible buttons aren't clickable. Button labels and handlers derive from `mode` + `currentPage`.
- **`Book` outer div is `absolute inset-0`**: changed from a flex child to a full-viewport absolute element so `BookButtons` can use `left: calc(50vw...)` positioning without being offset by the perspective container or the book's own dimensions.

### 2026-05-27 — Tilt-to-zero on open; animated Read transition

- **Scene tilt reduces to 0° as book opens.** `tiltX` and `tiltZ` are `useTransform` MotionValues derived from `smoothOpenness` (`[0,1] → [SCENE_TILT_X_DEG, 0]` and `[SCENE_TILT_Z_DEG, 0]`). The book inner div is now a `motion.div` with `style={{ rotateX: tiltX, rotateZ: tiltZ }}` instead of a static `transform` string.
- **Persistent `rotateY` MotionValue in `Page`.** Previously, switching between idle and reading modes swapped between `style.rotateY` (MotionValue) and `animate.rotateY` (declarative), causing Framer Motion to lose the current position and snap. Fix: a single `rotateY = useMotionValue(...)` always lives in `style`. A `useEffect` drives it in two ways: in idle mode it subscribes to `idleRotateY` changes; in reading mode it calls the imperative `animate(rotateY, target, spring)` which correctly springs FROM the current position. This gives a smooth fan-to-flat collapse on Read and clean page flips on Next/Back.

## 6. Design system

**Tokens** (`src/design-system/tokens.css`):

- Colors: `canvas`, `surface`, `surface-raised`, `ink`, `ink-muted`, `ink-subtle`, `accent`, `accent-strong`, `accent-soft`, `paper`, `paper-edge`.
- Radii: `radius-xs`, `-sm`, `-md`, `-lg`.
- Book geometry: `--book-width`, `--book-height`, `--book-spine`.
- Motion: `--ease-out-soft`, `--ease-page`, `--duration-fast|base|slow`.

**Primitives** (`src/design-system/components/`):

- `Stage` — Full-viewport centered surface for top-level scenes.
- `HalftoneSquare` — Pure-SVG dot grid. Color-controlled via `currentColor`.

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
