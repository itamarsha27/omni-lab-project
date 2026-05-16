"use client";

import { useRef } from "react";
import type { SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

type ResizeDir = "nw" | "n" | "ne" | "w" | "e" | "sw" | "s" | "se";

const HANDLE_PX = 8;
const FRAME_PX = 10;
const MIN_W = 40;
const MIN_H = 20;
const DRAG_THRESHOLD = 4;
const DEL_SIZE = 24;
const DEL_GAP = 6;
const ROT_HANDLE_SIZE = 22;
const ROT_HANDLE_GAP = 28; // distance from top edge to handle (screen-px)
// Rotation snaps to multiples of this many degrees, mirroring the
// position-snap convention (slide left/center/right edges). The threshold
// determines how close to a snap point the rotation has to be before it sticks.
// Hold Shift to bypass the snap for free rotation.
const ROTATE_SNAP_STEP = 45;
const ROTATE_SNAP_THRESHOLD = 5; // degrees within a snap point to lock

interface Props {
  element: SlideElement;
  scale: number;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
  otherElements?: readonly SlideElement[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function rotationFor(element: SlideElement): number {
  if (element.type === "shape" || element.type === "group") return element.rotation ?? 0;
  return 0;
}

function shouldLockAspect(element: SlideElement): boolean {
  return element.type === "shape" && element.shape === "circle";
}

function supportsRotationField(element: SlideElement): boolean {
  return element.type === "shape" || element.type === "group";
}

/** The anchor (in element-local coords) opposite to the dragged handle. This
 *  is the point we keep fixed in canvas space during resize. */
function anchorPointLocal(dir: ResizeDir, w: number, h: number): { x: number; y: number } {
  let ax = w / 2;
  let ay = h / 2;
  if (dir.includes("e")) ax = 0; // dragging E → anchor on W
  else if (dir.includes("w")) ax = w; // dragging W → anchor on E
  if (dir.includes("s")) ay = 0; // dragging S → anchor on N
  else if (dir.includes("n")) ay = h; // dragging N → anchor on S
  return { x: ax, y: ay };
}

/** Rotate (x, y) by R degrees (CW positive in screen coords). */
function rotate(x: number, y: number, deg: number): { x: number; y: number } {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: x * c - y * s, y: x * s + y * c };
}

/** Visual position (canvas coords) of an element-local point, given rotation. */
function localToCanvas(
  px: number,
  py: number,
  el: { x: number; y: number; width: number; height: number },
  rotation: number,
): { x: number; y: number } {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const off = rotate(px - el.width / 2, py - el.height / 2, rotation);
  return { x: cx + off.x, y: cy + off.y };
}

/** Resize within element-local space (rotation-free). Identical to the prior
 *  non-rotated implementation; rotation is handled by the caller, which
 *  inverse-rotates the screen delta before passing it here. */
function applyResizeLocal(
  dir: ResizeDir,
  start: { x: number; y: number; w: number; h: number },
  dx: number,
  dy: number,
  lockAspect: boolean,
): { x: number; y: number; width: number; height: number } {
  if (lockAspect) {
    let signedDelta: number;
    if (dir === "se") signedDelta = Math.max(dx, dy);
    else if (dir === "ne") signedDelta = Math.max(dx, -dy);
    else if (dir === "sw") signedDelta = Math.max(-dx, dy);
    else if (dir === "nw") signedDelta = Math.max(-dx, -dy);
    else if (dir === "e") signedDelta = dx;
    else if (dir === "w") signedDelta = -dx;
    else if (dir === "s") signedDelta = dy;
    else signedDelta = -dy;
    const startSize = Math.min(start.w, start.h);
    const newSize = Math.max(MIN_W, startSize + signedDelta);
    const x = dir.includes("w") ? start.x + start.w - newSize : start.x;
    const y = dir.includes("n") ? start.y + start.h - newSize : start.y;
    return { x, y, width: newSize, height: newSize };
  }
  let { x, y, w, h } = start;
  if (dir.includes("e")) w = Math.max(MIN_W, w + dx);
  if (dir.includes("s")) h = Math.max(MIN_H, h + dy);
  if (dir.includes("w")) {
    const nw = Math.max(MIN_W, w - dx);
    x += w - nw;
    w = nw;
  }
  if (dir.includes("n")) {
    const nh = Math.max(MIN_H, h - dy);
    y += h - nh;
    h = nh;
  }
  return { x, y, width: w, height: h };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ElementHandles({
  element,
  scale,
  slideIndex,
  dispatch,
  otherElements,
}: Props) {
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch, otherElements });
  const wrapperRef = useRef<HTMLDivElement>(null);

  const rotation = rotationFor(element);
  const supportsRotation = supportsRotationField(element);

  // Wrapper position (axis-aligned, in screen-px) — the CSS transform on the
  // wrapper rotates everything inside around its center so the visible
  // selection box, handles, delete button, and rotation handle all follow
  // the rotated shape.
  const sx = element.x * scale;
  const sy = element.y * scale;
  const sw = element.width * scale;
  const sh = element.height * scale;
  const half = FRAME_PX / 2;

  // ── Move (frame strip) handlers ──────────────────────────────────────────
  function handleFrameMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    startDrag(e);
  }

  // ── Resize handler with rotation-aware math ──────────────────────────────
  function startResize(dir: ResizeDir, e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startElem = {
      x: element.x,
      y: element.y,
      w: element.width,
      h: element.height,
    };
    const R = rotation;
    const Rrad = (R * Math.PI) / 180;
    const cR = Math.cos(Rrad);
    const sR = Math.sin(Rrad);
    const lock = shouldLockAspect(element);

    // Pin the canvas-coord position of the visual anchor (the corner/edge
    // opposite to the dragged handle, after rotation). The new x/y will be
    // computed each frame to keep this point fixed.
    const anchorLocal = anchorPointLocal(dir, startElem.w, startElem.h);
    const anchorCanvas = localToCanvas(
      anchorLocal.x,
      anchorLocal.y,
      { x: startElem.x, y: startElem.y, width: startElem.w, height: startElem.h },
      R,
    );

    let snapped = false;

    function onMove(ev: MouseEvent) {
      const screenDx = ev.clientX - startMouseX;
      const screenDy = ev.clientY - startMouseY;
      if (!snapped) {
        if (Math.abs(screenDx) < DRAG_THRESHOLD && Math.abs(screenDy) < DRAG_THRESHOLD) return;
        dispatch({ type: "SNAPSHOT" });
        snapped = true;
      }

      // Convert screen-pixel delta to element-local-canvas-pixel delta by
      // inverse-rotating, then de-scaling. This way "dragging the SE handle
      // outward" always grows the box along its local +X/+Y, regardless of
      // how the box is currently rotated on screen.
      const dxCanvas = screenDx / scale;
      const dyCanvas = screenDy / scale;
      const localDx = dxCanvas * cR + dyCanvas * sR;
      const localDy = -dxCanvas * sR + dyCanvas * cR;

      const bounds = applyResizeLocal(dir, startElem, localDx, localDy, lock);

      // Pin the visual anchor: pick new x/y such that, after rotation around
      // the new center, the rotated anchor-local position lands at
      // anchorCanvas. Without this, a rotated box would visually drift when
      // resized because the rotation center moves with x+w/2, y+h/2.
      const newAnchorLocal = anchorPointLocal(dir, bounds.width, bounds.height);
      const newAnchorOffset = rotate(
        newAnchorLocal.x - bounds.width / 2,
        newAnchorLocal.y - bounds.height / 2,
        R,
      );
      const newCenterX = anchorCanvas.x - newAnchorOffset.x;
      const newCenterY = anchorCanvas.y - newAnchorOffset.y;
      const finalX = newCenterX - bounds.width / 2;
      const finalY = newCenterY - bounds.height / 2;

      dispatch({
        type: "MOVE_ELEMENT_LIVE",
        slideIndex,
        element: {
          ...element,
          x: finalX,
          y: finalY,
          width: bounds.width,
          height: bounds.height,
        },
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Rotation handle ──────────────────────────────────────────────────────
  function startRotate(e: React.MouseEvent) {
    if (e.button !== 0) return;
    // Only shapes and groups carry a rotation field — the handle isn't
    // rendered for other types, but this guard narrows the type for TS.
    if (element.type !== "shape" && element.type !== "group") return;
    const rotatableEl = element;
    e.preventDefault();
    e.stopPropagation();
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;

    // The wrapper's bbox in screen coords. Its CENTER is the rotation center
    // for any rotation around `transform-origin: center center`.
    const rect = wrapperEl.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const startRotation = rotationFor(element);
    // Angle from box center to mouse at the start. We treat this as the
    // "zero point" — any subsequent angular delta is added to the original
    // rotation. This makes drag feel natural no matter where you grabbed the
    // handle from.
    const startAngle =
      (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI;

    let snapped = false;

    function onMove(ev: MouseEvent) {
      if (!snapped) {
        const dx = ev.clientX - e.clientX;
        const dy = ev.clientY - e.clientY;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        dispatch({ type: "SNAPSHOT" });
        snapped = true;
      }
      const currentAngle =
        (Math.atan2(ev.clientY - centerY, ev.clientX - centerX) * 180) / Math.PI;
      let newRotation = startRotation + (currentAngle - startAngle);
      newRotation = ((newRotation % 360) + 360) % 360;
      // Snap to multiples of ROTATE_SNAP_STEP within a small threshold —
      // mirrors how position snap pulls to slide left/center/right when close.
      // Shift bypasses for free rotation.
      if (!ev.shiftKey) {
        const nearest = Math.round(newRotation / ROTATE_SNAP_STEP) * ROTATE_SNAP_STEP;
        if (Math.abs(newRotation - nearest) < ROTATE_SNAP_THRESHOLD) {
          newRotation = nearest % 360;
        }
      }
      dispatch({
        type: "MOVE_ELEMENT_LIVE",
        slideIndex,
        element: { ...rotatableEl, rotation: newRotation },
      });
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Handle positions inside the (un-rotated) wrapper frame ───────────────
  // The wrapper is at (sx, sy) with size (sw, sh); CSS rotation makes
  // children visually follow the shape. Inside the wrapper we use local
  // coords starting from (0, 0).
  const handles: [number, number, string, ResizeDir][] = [
    [0, 0, "nw-resize", "nw"],
    [sw / 2, 0, "n-resize", "n"],
    [sw, 0, "ne-resize", "ne"],
    [0, sh / 2, "w-resize", "w"],
    [sw, sh / 2, "e-resize", "e"],
    [0, sh, "sw-resize", "sw"],
    [sw / 2, sh, "s-resize", "s"],
    [sw, sh, "se-resize", "se"],
  ];

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "absolute",
        left: sx,
        top: sy,
        width: sw,
        height: sh,
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
        pointerEvents: "none",
      }}
    >
      {/* Selection outline — pure visual; pointer events go to the strips */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: sw,
          height: sh,
          border: "2px solid #6366f1",
          pointerEvents: "none",
          boxSizing: "border-box",
        }}
      />

      {/* 4 draggable border strips — move the box from its frame */}
      {[
        { left: -half, top: -half, width: sw + FRAME_PX, height: FRAME_PX },
        { left: -half, top: sh - half, width: sw + FRAME_PX, height: FRAME_PX },
        { left: -half, top: -half, width: FRAME_PX, height: sh + FRAME_PX },
        { left: sw - half, top: -half, width: FRAME_PX, height: sh + FRAME_PX },
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
            pointerEvents: "auto",
            background: "transparent",
          }}
        />
      ))}

      {/* Ungroup button (only for group elements) — sits to the LEFT of the
          delete button. Click expands the group's children back to the slide,
          baking the group's rotation into them if any. */}
      {element.type === "group" && (
        <button
          type="button"
          title="Ungroup (Ctrl+Shift+G)"
          aria-label="Ungroup"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dispatch({ type: "UNGROUP_ELEMENT", slideIndex, elementId: element.id });
          }}
          style={{
            position: "absolute",
            left: sw - DEL_SIZE * 2 - DEL_GAP,
            top: -DEL_SIZE - DEL_GAP,
            width: DEL_SIZE,
            height: DEL_SIZE,
            padding: 0,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            backgroundColor: "white",
            color: "#4338ca",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            pointerEvents: "auto",
          }}
        >
          {/* Two squares pulling apart — "ungroup" iconography */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="2" y="2" width="8" height="8" />
            <rect x="14" y="14" width="8" height="8" />
            <path d="M10 6h-4M18 14v-4" strokeDasharray="2 2" />
          </svg>
        </button>
      )}

      {/* Delete — at the top-right corner of the (rotated) selection */}
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
          // The delete button used to flip below when near the top of the
          // canvas; now that it rotates with the box, just keep it above the
          // top-right of the local frame. If the rotated visual ends up
          // off-screen at the top, the user can scroll/resize the canvas.
          left: sw - DEL_SIZE,
          top: -DEL_SIZE - DEL_GAP,
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
          pointerEvents: "auto",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
      </button>

      {/* PowerPoint-style rotation handle — only for shapes that have a
          rotation field. Sits above the top-center of the (rotated) box,
          connected by a short stem. Drag to rotate; hold Shift for 15° snap. */}
      {supportsRotation && (
        <>
          <div
            style={{
              position: "absolute",
              left: sw / 2 - 0.5,
              top: -ROT_HANDLE_GAP,
              width: 1,
              height: ROT_HANDLE_GAP,
              background: "#6366f1",
              pointerEvents: "none",
            }}
          />
          <div
            role="button"
            aria-label="Rotate"
            title="Drag to rotate — snaps to 45° increments. Hold Shift for free rotation."
            onMouseDown={startRotate}
            style={{
              position: "absolute",
              left: sw / 2 - ROT_HANDLE_SIZE / 2,
              top: -ROT_HANDLE_GAP - ROT_HANDLE_SIZE,
              width: ROT_HANDLE_SIZE,
              height: ROT_HANDLE_SIZE,
              borderRadius: "50%",
              background: "white",
              border: "1.5px solid #6366f1",
              cursor: "grab",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
              pointerEvents: "auto",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </div>
        </>
      )}

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
            pointerEvents: "auto",
          }}
        />
      ))}
    </div>
  );
}
