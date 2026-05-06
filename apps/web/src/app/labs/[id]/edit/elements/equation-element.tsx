"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { EquationElement as EquationElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

declare global {
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
  element: EquationElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Font-size selector options. UI labels are user-facing point-like values;
// stored canvas-px is doubled so they render at a sensible size on the 1920×1080 slide.
const SIZE_OPTIONS: { label: number; value: number }[] = [
  { label: 12, value: 24 },
  { label: 14, value: 28 },
  { label: 16, value: 32 },
  { label: 18, value: 36 },
  { label: 24, value: 48 },
  { label: 32, value: 64 },
];
const DEFAULT_FONT_PX = 64;

export function EquationElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [mathliveLoaded, setMathliveLoaded] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [draftLatex, setDraftLatex] = useState(element.latex);
  const rootRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<HTMLElement>(null);
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  useEffect(() => {
    if (!isSelected) setIsEditing(false);
  }, [isSelected]);

  // Sync draft when the underlying element changes (e.g. undo/redo).
  useEffect(() => {
    setDraftLatex(element.latex);
  }, [element.latex]);

  // Lazy-load mathlive the first time the user opens the editor.
  useEffect(() => {
    if (isEditing && !mathliveLoaded) {
      import("mathlive").then(() => setMathliveLoaded(true));
    }
  }, [isEditing, mathliveLoaded]);

  // Position popup just below the equation element on screen, keeping it pinned
  // there as the page scrolls or window resizes.
  useLayoutEffect(() => {
    if (!isEditing) {
      setPopupPos(null);
      return;
    }
    function update() {
      if (rootRef.current) {
        const r = rootRef.current.getBoundingClientRect();
        setPopupPos({ top: r.bottom + 8, left: r.left, width: Math.max(r.width, 480) });
      }
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isEditing]);

  // Focus the math-field once it mounts.
  useEffect(() => {
    if (isEditing && mathliveLoaded && mathfieldRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mf = mathfieldRef.current as any;
      mf.value = element.latex; // ensure it has the current latex on (re)open
      mf.focus?.();
    }
  }, [isEditing, mathliveLoaded, element.latex]);

  function commit() {
    setIsEditing(false);
    if (draftLatex === element.latex) return;
    dispatch({ type: "UPDATE_ELEMENT", slideIndex, element: { ...element, latex: draftLatex } });
  }

  function cancel() {
    setIsEditing(false);
    setDraftLatex(element.latex);
  }

  // Insert raw LaTeX at the cursor.
  function insertLatex(latex: string) {
    const mf = mathfieldRef.current;
    if (!mf) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mf as any).insert?.(latex);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mf as any).focus?.();
  }

  function setFontSize(value: number) {
    if (value === (element.fontSize ?? DEFAULT_FONT_PX)) return;
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, fontSize: value },
    });
  }

  const renderedLatex = isEditing ? draftLatex : element.latex;
  const renderedHtml = katex.renderToString(renderedLatex || "\\,", {
    throwOnError: false,
    displayMode: true,
  });

  function handleMouseDown(e: React.MouseEvent) {
    if (isEditing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isSelected) {
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
    }
    startDrag(e);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
  }

  return (
    <>
      <div
        ref={rootRef}
        style={{
          position: "absolute",
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          zIndex: element.zIndex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isEditing ? "default" : "move",
          userSelect: "none",
          fontSize: element.fontSize ?? DEFAULT_FONT_PX,
          overflow: "hidden",
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={onContextMenu}
      >
        <div
          dangerouslySetInnerHTML={{ __html: renderedHtml }}
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* Popup editor — Word-style: math-field at native screen size with toolbar */}
      {isEditing && mathliveLoaded && popupPos &&
        createPortal(
          <>
            {/* Click-outside backdrop closes the editor */}
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
                    onClick={cancel}
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

              {/* Font size selector */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[11px] font-medium text-gray-500">Size</span>
                <div className="flex items-center gap-0.5 rounded border border-gray-200 p-0.5">
                  {SIZE_OPTIONS.map((s) => {
                    const active = (element.fontSize ?? DEFAULT_FONT_PX) === s.value;
                    return (
                      <button
                        key={s.label}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setFontSize(s.value)}
                        className={`min-w-[28px] rounded px-1.5 py-0.5 text-xs font-medium transition-colors ${
                          active
                            ? "bg-indigo-600 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  setDraftLatex((e.target as any).value ?? "");
                }}
              />

              <p className="mt-2 text-[11px] text-gray-400">
                Tip: click the keyboard icon on the right of the field to open the on-screen math keyboard.
                Click outside this box or press <kbd>Done</kbd> to save.
              </p>
            </div>
          </>,
          document.body
        )}
    </>
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
