"use client";

import { useCallback } from "react";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

const FRAME_PX = 10;
const DRAG_THRESHOLD = 4;
const BTN_SIZE = 24;
const BTN_GAP = 6;

interface Props {
  /** The elements that are currently multi-selected (always >= 2). */
  elements: SlideElement[];
  scale: number;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

/**
 * Renders a single combined bounding box around all multi-selected elements,
 * with frame strips for moving them as a unit and a "Group" button to
 * collapse the selection into a GroupElement.
 *
 * No resize handles in v1 (resizing a multi-selection meaningfully — scale
 * everything around the bbox center? — is a separate decision). Users group
 * first, then resize the group.
 */
export function MultiSelectHandles({ elements, scale, slideIndex, dispatch }: Props) {
  // Axis-aligned union of children's bboxes. Doesn't account for individual
  // child rotation (rotated shapes can extend past their own bbox); a v1
  // accepts this — the multi-bbox is a rough hit area, not a precise visual.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  const sx = minX * scale;
  const sy = minY * scale;
  const sw = (maxX - minX) * scale;
  const sh = (maxY - minY) * scale;
  const half = FRAME_PX / 2;

  // Move-all-selected drag handler. Captures each element's starting position
  // in the closure, then dispatches one MOVE_ELEMENTS_LIVE per frame with
  // target positions for the whole set. One drag = one undo step.
  const startMultiDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startPositions = elements.map((el) => ({
        id: el.id,
        startX: el.x,
        startY: el.y,
      }));
      let snapped = false;

      function onMove(ev: MouseEvent) {
        const screenDx = ev.clientX - startMouseX;
        const screenDy = ev.clientY - startMouseY;
        if (!snapped) {
          if (Math.abs(screenDx) < DRAG_THRESHOLD && Math.abs(screenDy) < DRAG_THRESHOLD) return;
          dispatch({ type: "SNAPSHOT" });
          snapped = true;
        }
        const dxCanvas = screenDx / scale;
        const dyCanvas = screenDy / scale;
        const updates = startPositions.map((p) => ({
          id: p.id,
          x: p.startX + dxCanvas,
          y: p.startY + dyCanvas,
        }));
        dispatch({ type: "MOVE_ELEMENTS_LIVE", slideIndex, updates });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [elements, scale, slideIndex, dispatch],
  );

  // Grouping is restricted to shapes / arrows (which are all `type: "shape"`).
  // If the selection contains any other element type, the Group button is
  // disabled with a tooltip explaining why — keeps groups as a "diagram parts"
  // primitive rather than a generic collection.
  const groupable = elements.every((el) => el.type === "shape");

  function handleGroup(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!groupable) return;
    dispatch({ type: "GROUP_SELECTED", slideIndex });
  }

  return (
    <div
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        width: sw,
        height: sh,
        pointerEvents: "none",
      }}
    >
      {/* Dashed outline — visually distinct from the solid single-select
          outline so the user can tell the two states apart at a glance. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "2px dashed #6366f1",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />

      {/* 4 draggable border strips — drag any to move the whole selection. */}
      {[
        { left: -half, top: -half, width: sw + FRAME_PX, height: FRAME_PX },
        { left: -half, top: sh - half, width: sw + FRAME_PX, height: FRAME_PX },
        { left: -half, top: -half, width: FRAME_PX, height: sh + FRAME_PX },
        { left: sw - half, top: -half, width: FRAME_PX, height: sh + FRAME_PX },
      ].map((s, i) => (
        <div
          key={`ms-frame-${i}`}
          onMouseDown={startMultiDrag}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            cursor: "move",
            pointerEvents: "auto",
            background: "transparent",
          }}
        />
      ))}

      {/* Group button — top-right of the multi-bbox. Disabled if the
          selection contains anything other than shapes/arrows. */}
      <button
        type="button"
        title={
          groupable
            ? `Group ${elements.length} elements (Ctrl+G)`
            : "Only shapes and arrows can be grouped — remove other element types from the selection"
        }
        aria-label="Group"
        disabled={!groupable}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={handleGroup}
        style={{
          position: "absolute",
          left: sw - 70,
          top: -BTN_SIZE - BTN_GAP,
          height: BTN_SIZE,
          padding: "0 10px",
          border: `1px solid ${groupable ? "#6366f1" : "#d1d5db"}`,
          borderRadius: 6,
          backgroundColor: "white",
          color: groupable ? "#4338ca" : "#9ca3af",
          fontSize: 12,
          fontWeight: 600,
          cursor: groupable ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          pointerEvents: "auto",
          opacity: groupable ? 1 : 0.65,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="3" width="8" height="8" />
          <rect x="13" y="13" width="8" height="8" />
          <path d="M11 7h2M11 17h2M7 11v2M17 11v2" strokeDasharray="2 2" />
        </svg>
        Group
      </button>
    </div>
  );
}
