/**
 * Text that lives in the area the front cover occupies when fully open.
 * It sits behind the 3D book scene (rendered before <Book /> in DOM order)
 * so the swinging cover gradually conceals it as the book opens.
 *
 * Positioned at `calc(50vw - var(--book-width))` — the left boundary of the
 * open spread — with the same dimensions as the book itself so the cover
 * masks it perfectly at full openness.
 */
export function LeftPageText() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute flex items-center justify-center overflow-hidden py-8 pr-28 pl-4"
      style={{
        left: "calc(50vw - var(--book-width))",
        top: "calc(50vh - var(--book-height) / 2)",
        width: "var(--book-width)",
        height: "var(--book-height)",
      }}
    >
      <p className="font-handwritten text-ink-subtle text-center text-[2.1rem] leading-snug">
        Sed ut perspiciatis unde omnis iste natus error sit voluptatem santium remque totam rem
        aperiam
      </p>
    </div>
  );
}
