import { cn } from "../cn";

type Props = {
  label: string;
  /** Center X in the positioning parent's coordinate space (px). */
  x: number;
  /** Center Y in the positioning parent's coordinate space (px). */
  y: number;
  visible: boolean;
  /** `fixed` for viewport coords (e.g. portaled tooltips); default `absolute`. */
  position?: "absolute" | "fixed";
  /** Gap between the anchor point and the bottom of the tooltip (px). */
  gapPx?: number;
  className?: string;
};

/**
 * Presentational label tooltip. Does not capture pointer events so it never
 * interferes with hit targets or layout simulations beneath it.
 */
export function Tooltip({
  label,
  x,
  y,
  visible,
  position = "absolute",
  gapPx = 12,
  className,
}: Props) {
  return (
    <div
      role="tooltip"
      aria-hidden={!visible}
      className={cn(
        "bg-ink pointer-events-none z-50 rounded px-2 py-1 font-mono text-xs whitespace-nowrap text-white transition-opacity duration-150",
        position === "fixed" ? "fixed" : "absolute",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      style={{
        left: x,
        top: y,
        transform: `translate(-50%, calc(-100% - ${gapPx}px))`,
      }}
    >
      {label}
    </div>
  );
}
