"use client";

import { useRef } from "react";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

type ResizeDir = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

const HANDLE_PX = 8; // visual size in screen pixels
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
  const startRef = useRef<{
    mouseX: number; mouseY: number;
    elemX: number; elemY: number; elemW: number; elemH: number;
    snapped: boolean;
  } | null>(null);

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

  return (
    <>
      {/* Selection outline — rendered in screen space (outside scaled div) */}
      <div
        style={{
          position: "absolute",
          left: x * scale,
          top: y * scale,
          width: width * scale,
          height: height * scale,
          border: "2px solid #6366f1",
          pointerEvents: "none",
          boxSizing: "border-box",
          zIndex: 100,
        }}
      />

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
