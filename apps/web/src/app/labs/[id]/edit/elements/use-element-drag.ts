"use client";

import { useCallback } from "react";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

const DRAG_THRESHOLD = 4; // screen pixels before a click becomes a drag

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
        dispatch({
          type: "MOVE_ELEMENT_LIVE",
          slideIndex,
          element: {
            ...element,
            x: startElemX + screenDx / scale,
            y: startElemY + screenDy / scale,
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
