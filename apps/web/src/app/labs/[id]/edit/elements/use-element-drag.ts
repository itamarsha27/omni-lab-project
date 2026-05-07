"use client";

import { useCallback } from "react";
import { CANVAS_WIDTH } from "@omnilab/lab-content";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

const DRAG_THRESHOLD = 4; // screen pixels before a click becomes a drag
// Snap zone in canvas-px around each guide line. ~24px on a 1920 canvas equals
// ~1.25% of slide width — close enough that a "near miss" snaps cleanly,
// loose enough that you can place an element off-center if you want.
const SNAP_THRESHOLD = 24;

/** Snap an element's proposed x to slide left edge / horizontal center / right edge. */
function snapHorizontal(proposedX: number, width: number): number {
  const left = proposedX;
  const center = proposedX + width / 2;
  const right = proposedX + width;
  const slideCenter = CANVAS_WIDTH / 2;
  // Order matters: left/right edges win over center if both are in range, since
  // edge-flush placement is more visually crisp than center alignment.
  if (Math.abs(left) < SNAP_THRESHOLD) return 0;
  if (Math.abs(right - CANVAS_WIDTH) < SNAP_THRESHOLD) return CANVAS_WIDTH - width;
  if (Math.abs(center - slideCenter) < SNAP_THRESHOLD) return slideCenter - width / 2;
  return proposedX;
}

interface DragArgs {
  element: SlideElement;
  scale: number;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

/**
 * Returns a startDrag(mouseDownEvent) function that wires up window mousemove/up
 * to drag the element. Uses SNAPSHOT + MOVE_ELEMENT_LIVE so a single drag is
 * exactly one undo step.
 */
export function useElementDrag({ element, scale, slideIndex, dispatch }: DragArgs) {
  return useCallback(
    (e: React.MouseEvent) => {
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startElemX = element.x;
      const startElemY = element.y;
      let snapped = false;

      function onMove(ev: MouseEvent) {
        const screenDx = ev.clientX - startMouseX;
        const screenDy = ev.clientY - startMouseY;
        if (!snapped) {
          if (Math.abs(screenDx) < DRAG_THRESHOLD && Math.abs(screenDy) < DRAG_THRESHOLD) return;
          dispatch({ type: "SNAPSHOT" });
          snapped = true;
        }
        const proposedX = startElemX + screenDx / scale;
        const proposedY = startElemY + screenDy / scale;
        dispatch({
          type: "MOVE_ELEMENT_LIVE",
          slideIndex,
          element: {
            ...element,
            x: snapHorizontal(proposedX, element.width),
            y: proposedY,
          },
        });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element, scale, slideIndex, dispatch]
  );
}
