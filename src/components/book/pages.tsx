import type { ReactNode } from "react";
import { PageSurface } from "@/design-system";
import { PeopleCloud } from "./PeopleCloud";

/**
 * The book's content, authored as a flat list of pages.
 *
 * Each entry is one page-face. The book pairs them into physical sheets:
 * sheet 0 = { front: bookPages[0], back: bookPages[1] }, sheet 1 = { 2, 3 }, …
 * which matches reading order — flipping a sheet reveals its back on the left
 * and the next sheet's front on the right. An odd final page gets a blank back.
 *
 * The book's thickness is derived from this list (see NUM_PAGES in constants.ts),
 * so adding or removing pages here changes how many sheets the book renders.
 *
 * To customize: edit a component below, or add a new one and drop it into
 * `bookPages`. Every page inherits its frame (paper, border, padding) from
 * <PageSurface>; pass `className` to extend or override it.
 */

const caveat = { fontFamily: "var(--font-caveat)" } as const;

function PageHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-ink-subtle mb-4 font-mono text-xs tracking-widest uppercase">{children}</h2>
  );
}

function ChapterOpen() {
  return (
    <PageSurface className="pointer-events-none overflow-hidden p-0">
      <PeopleCloud />
    </PageSurface>
  );
}

function FirstDays() {
  return (
    <PageSurface>
      <PageHeading>The first days</PageHeading>
      <p className="text-ink leading-relaxed">
        Replace this with a memory. Each page is its own component — keep the
        <code className="bg-surface rounded px-1"> PageSurface </code>
        wrapper and put whatever you like inside.
      </p>
    </PageSurface>
  );
}

function APhoto() {
  return (
    <PageSurface className="items-center justify-center">
      <div className="border-ink/30 text-ink-subtle flex h-40 w-40 items-center justify-center rounded-lg border border-dashed text-xs">
        photo slot
      </div>
    </PageSurface>
  );
}

function AQuote() {
  return (
    <PageSurface className="items-center justify-center text-center">
      <p className="text-ink text-2xl leading-snug font-bold" style={caveat}>
        “A quote that mattered.”
      </p>
    </PageSurface>
  );
}

function PlaceholderPage({ n }: { n: number }) {
  return (
    <PageSurface className="items-center justify-center">
      <span className="text-ink-subtle font-mono text-sm">Page {n}</span>
    </PageSurface>
  );
}

export const bookPages: ReactNode[] = [
  <ChapterOpen key="chapter-open" />,
  <FirstDays key="first-days" />,
  <APhoto key="a-photo" />,
  <AQuote key="a-quote" />,
  ...Array.from({ length: 8 }, (_, i) => <PlaceholderPage key={`placeholder-${i}`} n={i + 5} />),
];
