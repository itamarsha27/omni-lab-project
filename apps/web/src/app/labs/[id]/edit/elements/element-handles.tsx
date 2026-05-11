"use client";

import { useRef } from "react";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

type ResizeDir = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

const HANDLE_PX = 8; // visual size in screen pixels
const FRAME_PX = 10; // draggable border-strip width (screen px)
const MIN_W = 40;
const MIN_H = 20;
const DRAG_THRESHOLD = 4; // screen px before a click becomes a drag

interface Props {
  element: SlideElement;
  scale: number;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

function handlePositions(el: SlideElement, scale: number): [number, number, string, ResizeDir][] {
  const l = el.x * scale;
  const t = el.y * scale;
  const r = (el.x + el.width) * scale;
  const b = (el.y + el.height) * scale;
  const cx = l + (el.width * scale) / 2;
  const cy = t + (el.height * scale) / 2;
  return [
    [l, t, "nw-resize", "nw"],
    [cx, t, "n-resize", "n"],
    [r, t, "ne-resize", "ne"],
    [l, cy, "w-resize", "w"],
    [r, cy, "e-resize", "e"],
    [l, b, "sw-resize", "sw"],
    [cx, b, "s-resize", "s"],
    [r, b, "se-resize", "se"],
  ];
}

function applyResize(
  dir: ResizeDir,
  start: { x: number; y: number; w: number; h: number },
  dx: number,
  dy: number
): { x: number; y: number; width: number; height: number } {
  let { x, y, w, h } = start;
  if (dir.includes("e")) w = Math.max(MIN_W, w + dx);
  if (dir.includes("s")) h = Math.max(MIN_H, h + dy);
  if (dir.includes("w")) { const nw = Math.max(MIN_W, w - dx); x += w - nw; w = nw; }
  if (dir.includes("n")) { const nh = Math.max(MIN_H, h - dy); y += h - nh; h = nh; }
  return { x, y, width: w, height: h };
}

export function ElementHandles({ element, scale, slideIndex, dispatch }: Props) {
  const { x, y, width, height } = element;
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });
  const startRef = useRef<{
    mouseX: number; mouseY: number;
    elemX: number; elemY: number; elemW: number; elemH: number;
    snapped: boolean;
  } | null>(null);

  // Mousedown on a border-frame strip → start a move drag (works even while the
  // element's content is in edit mode, since the strips sit outside the editable area).
  function handleFrameMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e);
  }

  function startResize(dir: ResizeDir, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startRef.current = {
      mouseX: e.clientX, mouseY: e.clientY,
      elemX: element.x, elemY: element.y,
      elemW: element.width, elemH: element.height,
      snapped: false,
    };

    function onMove(ev: MouseEvent) {
      const s = startRef.current!;
      const screenDx = ev.clientX - s.mouseX;
      const screenDy = ev.clientY - s.mouseY;

      if (!s.snapped) {
        if (Math.abs(screenDx) < DRAG_THRESHOLD && Math.abs(screenDy) < DRAG_THRESHOLD) return;
        dispatch({ type: "SNAPSHOT" });
        s.snapped = true;
      }

      const dx = screenDx / scale;
      const dy = screenDy / scale;
      const bounds = applyResize(dir, { x: s.elemX, y: s.elemY, w: s.elemW, h: s.elemH }, dx, dy);
      dispatch({ type: "MOVE_ELEMENT_LIVE", slideIndex, element: { ...element, ...bounds } });
    }

    function onUp() {
      startRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const handles = handlePositions(element, scale);

  // Frame strips are centered on the element's border so clicking on/near the
  // border drags, but clicking deep inside the element passes through to the
  // text editor / equation content.
  const sx = x * scale;
  const sy = y * scale;
  const sw = width * scale;
  const sh = height * scale;
  const half = FRAME_PX / 2;

  const DEL_SIZE = 24;
  const DEL_GAP = 6;
  // If there isn't room above the frame, tuck the button just inside the
  // top-right corner so it stays visible for elements near the top edge.
  const delAbove = sy >= DEL_SIZE + DEL_GAP;
  const delTop = delAbove ? sy - DEL_SIZE - DEL_GAP : sy + DEL_GAP;
  const delLeft = sx + sw - DEL_SIZE - (delAbove ? 0 : DEL_GAP);

  return (
    <>
      {/* Selection outline — visual only; pointer events go to the frame strips below */}
      <div
        style={{
          position: "absolute",
          left: sx,
          top: sy,
          width: sw,
          height: sh,
          border: "2px solid #6366f1",
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: 100,
        }}
      />

      {/* 4 draggable border strips — let the user move the box from its frame
          even while the inside is being edited (text edit mode, etc.) */}
      {[
        { left: sx - half, top: sy - half, width: sw + FRAME_PX, height: FRAME_PX }, // top
        { left: sx - half, top: sy + sh - half, width: sw + FRAME_PX, height: FRAME_PX }, // bottom
        { left: sx - half, top: sy - half, width: FRAME_PX, height: sh + FRAME_PX }, // left
        { left: sx + sw - half, top: sy - half, width: FRAME_PX, height: sh + FRAME_PX }, // right
      ].map((s, i) => (
        <div
          key={`frame-${i}`}
          onMouseDown={handleFrameMouseDown}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.width,
            height: s.height,
            cursor: "move",
            zIndex: 100, // below resize handles (101) so corners still resize
            background: "transparent",
          }}
        />
      ))}

      {/* Delete button — top-right of selection */}
      <button
        type="button"
        title="Delete"
        aria-label="Delete"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          dispatch({ type: "DELETE_ELEMENT", slideIndex, elementId: element.id });
        }}
        style={{
          position: "absolute",
          left: delLeft,
          top: delTop,
          width: DEL_SIZE,
          height: DEL_SIZE,
          padding: 0,
          border: "1px solid #e5e7eb",
          borderRadius: 6,
          backgroundColor: "white",
          color: "#dc2626",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
          zIndex: 102,
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>

      {/* 8 resize handles */}
      {handles.map(([hx, hy, cursor, dir]) => (
        <div
          key={dir}
          onMouseDown={(e) => startResize(dir, e)}
          style={{
            position: "absolute",
            left: hx - HANDLE_PX / 2,
            top: hy - HANDLE_PX / 2,
            width: HANDLE_PX,
            height: HANDLE_PX,
            backgroundColor: "white",
            border: "2px solid #6366f1",
            borderRadius: 2,
            cursor,
            zIndex: 101,
          }}
        />
      ))}
    </>
  );
}
