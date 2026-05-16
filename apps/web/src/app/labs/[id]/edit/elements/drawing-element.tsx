"use client";

import { useRef } from "react";
import type {
  DrawingElement as DrawingEl,
  DrawingStroke,
} from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

// Screen-px threshold before a pointerdown is treated as a stroke (mirrors
// `useElementDrag`). Below this, a press-release does nothing — so clicking
// the box to re-select doesn't accidentally drop a stray dot.
const DRAG_THRESHOLD = 4;

interface Props {
  element: DrawingEl;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function DrawingElement({
  element,
  isSelected,
  slideIndex,
  scale: _scale,
  dispatch,
  onContextMenu,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd-click toggles selection — no drawing, no drag.
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "TOGGLE_ELEMENT_SELECTION", id: element.id });
      return;
    }
    // First click on an unselected drawing box just selects it — drawing
    // requires a second gesture. This matches Google Slides' "click to select,
    // click again to interact" pattern and prevents the drop-and-immediately-
    // start-drawing flow from feeling chaotic.
    if (!isSelected) {
      e.preventDefault();
      e.stopPropagation();
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const svg = svgRef.current;
    if (!svg) return;

    // Compute element-local coords by dividing screen-px deltas against the
    // SVG's own rect — this auto-absorbs both the page-level canvas scale and
    // any further transforms above us. No need to know `scale` directly.
    const rect = svg.getBoundingClientRect();
    const sx = element.width / rect.width;
    const sy = element.height / rect.height;
    const toLocal = (cx: number, cy: number): [number, number] => [
      (cx - rect.left) * sx,
      (cy - rect.top) * sy,
    ];

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const baseStrokes = element.strokes;
    let workingStroke: DrawingStroke = {
      points: [toLocal(e.clientX, e.clientY)],
      color: element.currentColor,
      width: element.currentWidth,
    };
    let snapped = false;

    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers throw if the pointer is already captured elsewhere — fine
      // to ignore, listeners on window still receive moves.
    }

    function onMove(ev: PointerEvent) {
      const screenDx = ev.clientX - startMouseX;
      const screenDy = ev.clientY - startMouseY;
      if (!snapped) {
        if (Math.abs(screenDx) < DRAG_THRESHOLD && Math.abs(screenDy) < DRAG_THRESHOLD) return;
        // SNAPSHOT only on first real move, so a click-without-drag leaves
        // history clean (no SNAPSHOT, no MOVE_ELEMENT_LIVE).
        dispatch({ type: "SNAPSHOT" });
        snapped = true;
      }
      workingStroke = {
        ...workingStroke,
        points: [...workingStroke.points, toLocal(ev.clientX, ev.clientY)],
      };
      dispatch({
        type: "MOVE_ELEMENT_LIVE",
        slideIndex,
        element: { ...element, strokes: [...baseStrokes, workingStroke] },
      });
    }

    function onUp() {
      try {
        svg?.releasePointerCapture(e.pointerId);
      } catch {
        // ignore — capture may have been released by the browser already
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const isEmpty = element.strokes.length === 0;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        overflow: "hidden",
        userSelect: "none",
        // Subtle dashed border only when empty, so a freshly-dropped drawing
        // box is visually obvious. Disappears once any stroke exists.
        border: isEmpty ? "2px dashed #d1d5db" : "none",
        boxSizing: "border-box",
        borderRadius: 4,
      }}
      onContextMenu={onContextMenu}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${element.width} ${element.height}`}
        preserveAspectRatio="none"
        onPointerDown={handlePointerDown}
        style={{
          display: "block",
          // Without this, touch devices try to scroll while drawing.
          touchAction: "none",
          cursor: isSelected ? "crosshair" : "default",
          // The SVG container must capture clicks anywhere in its viewport,
          // even on empty/unpainted areas — otherwise the very first stroke
          // on a fresh box (with no polylines yet) wouldn't fire onPointerDown.
          pointerEvents: "all",
        }}
      >
        {/* Invisible backing rect: explicit capture target so the *interior*
            of an empty box gets pointerdown. The SVG `pointer-events: all`
            above mostly covers this on its own, but a transparent rect with
            an explicit fill is the safest cross-browser anchor. */}
        <rect
          x={0}
          y={0}
          width={element.width}
          height={element.height}
          fill="transparent"
        />
        {element.strokes.map((stroke, i) => (
          <polyline
            key={i}
            points={stroke.points.map(([x, y]) => `${x},${y}`).join(" ")}
            fill="none"
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      {isEmpty && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "#9ca3af",
            fontSize: 28,
            fontWeight: 500,
            textAlign: "center",
            padding: 16,
          }}
        >
          <span style={{ fontSize: 64, lineHeight: 1 }}>✎</span>
          <span>
            {isSelected ? "Click and drag inside to draw" : "Select to draw"}
          </span>
        </div>
      )}
    </div>
  );
}
