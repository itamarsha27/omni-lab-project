"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import { FontSizeControl } from "./font-size-control";

// React 19 / Next 15 resolves IntrinsicElements via React.JSX, not the global JSX
// namespace — module augmentation (not `declare global`) is what gets picked up.
declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        value?: string;
        "math-virtual-keyboard-policy"?: string;
      };
    }
  }
}

interface Props {
  /** LaTeX seeded into the math-field when the popup opens. */
  initialLatex: string;
  /** Called on mount and on every scroll/resize to read the current anchor
   *  rect. A callback (not a snapshot) lets the popup follow the anchor when
   *  the page scrolls or the element moves; returning null skips that tick. */
  getAnchorRect: () => DOMRect | null;
  /** Show the font-size row when present. Omit for inline equations — inline
   *  math inherits its size from the surrounding paragraph. */
  fontSize?: number;
  onFontSizeChange?: (px: number) => void;
  /** Fires on every math-field keystroke. Used by the standalone equation
   *  element to live-update its in-canvas KaTeX render; inline equations
   *  don't need this (no preview surface outside the popup itself). */
  onDraftChange?: (latex: string) => void;
  /** Click-outside, the Done button, and committing all funnel here with the
   *  math-field's current value. */
  onCommit: (latex: string) => void;
  onCancel: () => void;
}

export function EquationPopup({
  initialLatex,
  getAnchorRect,
  fontSize,
  onFontSizeChange,
  onDraftChange,
  onCommit,
  onCancel,
}: Props) {
  const [mathliveLoaded, setMathliveLoaded] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<HTMLElement>(null);
  // Math-field's DOM state is the source of truth. We mirror its current value
  // into a ref so click-outside (which runs without a fresh React render) can
  // commit the latest input.
  const latestLatexRef = useRef(initialLatex);
  // Stable bridge for getAnchorRect — keeps the scroll/resize effect from
  // tearing down its listeners every time the parent re-renders.
  const getAnchorRectRef = useRef(getAnchorRect);
  getAnchorRectRef.current = getAnchorRect;

  // Lazy-load mathlive on first mount.
  useEffect(() => {
    let cancelled = false;
    import("mathlive").then(() => {
      if (!cancelled) setMathliveLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Position popup near the live anchor rect, flipping above when there isn't
  // room below. Re-measures on scroll/resize and once more after the popup
  // has rendered (so we know its real height instead of the 360-px estimate).
  useLayoutEffect(() => {
    function update() {
      const anchorRect = getAnchorRectRef.current();
      if (!anchorRect) return;
      const margin = 8;
      const popupH = popupRef.current?.offsetHeight ?? 360;
      const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
      const spaceAbove = anchorRect.top - margin;
      const placeAbove = spaceBelow < popupH && spaceAbove > spaceBelow;
      const top = placeAbove
        ? Math.max(margin, anchorRect.top - popupH - margin)
        : anchorRect.bottom + margin;
      const width = Math.max(anchorRect.width, 480);
      const maxLeft = window.innerWidth - width - margin;
      const left = Math.min(Math.max(margin, anchorRect.left), Math.max(margin, maxLeft));
      setPopupPos({ top, left, width });
    }
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [mathliveLoaded]);

  // Seed the math-field with initialLatex once mathlive has upgraded the
  // custom element. Without the whenDefined gate, touching internals before
  // the upgrade throws "Cannot read properties of undefined (reading 'options')".
  useEffect(() => {
    if (!mathliveLoaded) return;
    let cancelled = false;
    customElements.whenDefined("math-field").then(() => {
      if (cancelled) return;
      const mf = mathfieldRef.current;
      if (!mf) return;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyMf = mf as any;
        if (typeof anyMf.setValue === "function") anyMf.setValue(initialLatex);
        else anyMf.value = initialLatex;
        anyMf.focus?.();
      } catch (err) {
        console.warn("[equation-popup] failed to seed math-field:", err);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mathliveLoaded, initialLatex]);

  function commit() {
    onCommit(latestLatexRef.current);
  }

  function insertLatex(latex: string) {
    const mf = mathfieldRef.current;
    if (!mf) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mf as any).insert?.(latex);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mf as any).focus?.();
  }

  if (!mathliveLoaded || !popupPos) return null;

  return createPortal(
    <>
      {/* Click-outside backdrop. mousedown (not click) so it fires before any
       *  subsequent focus shifts. Transparent + fixed-inset covers the screen
       *  so editor/canvas underneath don't receive the stray click. */}
      <div
        onMouseDown={commit}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "transparent",
        }}
      />
      <div
        ref={popupRef}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          top: popupPos.top,
          left: popupPos.left,
          width: popupPos.width,
          zIndex: 9999,
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          padding: 12,
        }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Edit equation</span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={commit}
              className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
            >
              Done
            </button>
          </div>
        </div>

        {fontSize !== undefined && onFontSizeChange && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-gray-500">Size</span>
            <FontSizeControl valuePx={fontSize} onChange={onFontSizeChange} />
          </div>
        )}

        {/* Quick-insert toolbar — Word-style template buttons */}
        <div className="mb-2 flex flex-wrap gap-1">
          {QUICK_INSERTS.map((q) => (
            <button
              key={q.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertLatex(q.latex)}
              title={q.label}
              className="flex h-7 min-w-7 items-center justify-center rounded border border-gray-200 bg-white px-2 text-sm text-gray-700 hover:bg-indigo-50 hover:border-indigo-300"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(q.preview, { throwOnError: false }),
              }}
            />
          ))}
        </div>

        <math-field
          ref={mathfieldRef as React.RefObject<HTMLElement>}
          math-virtual-keyboard-policy="manual"
          style={{
            width: "100%",
            minHeight: 64,
            fontSize: "1.6rem",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            padding: "8px 10px",
            background: "white",
          }}
          onInput={(e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const latex = (e.target as any).value ?? "";
            latestLatexRef.current = latex;
            onDraftChange?.(latex);
          }}
        />

        <p className="mt-2 text-[11px] text-gray-400">
          Tip: click the keyboard icon on the right of the field to open the on-screen math keyboard.
          Click outside this box or press <kbd>Done</kbd> to save.
        </p>
      </div>
    </>,
    document.body,
  );
}

// Common math templates surfaced as one-click buttons (Word-style).
const QUICK_INSERTS: { label: string; latex: string; preview: string }[] = [
  { label: "Fraction", latex: "\\frac{#0}{#0}", preview: "\\frac{a}{b}" },
  { label: "Square root", latex: "\\sqrt{#0}", preview: "\\sqrt{x}" },
  { label: "n-th root", latex: "\\sqrt[#?]{#0}", preview: "\\sqrt[n]{x}" },
  { label: "Power", latex: "#@^{#0}", preview: "x^{n}" },
  { label: "Subscript", latex: "#@_{#0}", preview: "x_{n}" },
  { label: "Sum", latex: "\\sum_{#0}^{#0}", preview: "\\sum" },
  { label: "Integral", latex: "\\int_{#0}^{#0}", preview: "\\int" },
  { label: "Limit", latex: "\\lim_{#0}", preview: "\\lim" },
  { label: "Greek pi", latex: "\\pi", preview: "\\pi" },
  { label: "Greek theta", latex: "\\theta", preview: "\\theta" },
  { label: "Infinity", latex: "\\infty", preview: "\\infty" },
  { label: "≤", latex: "\\le", preview: "\\le" },
  { label: "≥", latex: "\\ge", preview: "\\ge" },
  { label: "≠", latex: "\\ne", preview: "\\ne" },
  { label: "± plus-minus", latex: "\\pm", preview: "\\pm" },
];
