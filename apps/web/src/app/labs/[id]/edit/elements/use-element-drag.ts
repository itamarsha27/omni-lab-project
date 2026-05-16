"use client";

import { useCallback } from "react";
import {
  CANVAS_WIDTH,
  ARROW_LIKE_KINDS,
  type SlideElement,
} from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";

const DRAG_THRESHOLD = 4; // screen pixels before a click becomes a drag
const SNAP_THRESHOLD = 24; // canvas-px; ~1.25% of slide width

/**
 * Visual tip of an arrow-like shape in **canvas coords**, accounting for
 * rotation. Arrows are drawn pointing right from (0, h/2) to (w, h/2) in
 * element-local coords, then the wrapper is rotated by `rotation` deg (CW
 * positive). This computes where the head ends up.
 */
function arrowTipCanvasPos(
  element: SlideElement & { type: "shape" },
  proposedX: number,
  proposedY: number,
): { x: number; y: number } {
  const w = element.width;
  const h = element.height;
  const cx = w / 2;
  const cy = h / 2;
  const rot = ((element.rotation ?? 0) * Math.PI) / 180;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  // Unrotated tip = (w, h/2). Offset from center = (w/2, 0).
  const dx = w - cx; // = w/2
  const dy = h / 2 - cy; // = 0
  const localX = cx + dx * c - dy * s;
  const localY = cy + dx * s + dy * c;
  return { x: proposedX + localX, y: proposedY + localY };
}

type Point = { x: number; y: number };
type Segment = { a: Point; b: Point };

/** Rotate a point in canvas coords around the element's CSS rotation center. */
function rotateAroundElementCenter(
  p: Point,
  element: SlideElement & { type: "shape" },
): Point {
  const rot = ((element.rotation ?? 0) * Math.PI) / 180;
  if (rot === 0) return p;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const dx = p.x - cx;
  const dy = p.y - cy;
  return { x: cx + dx * c - dy * s, y: cy + dx * s + dy * c };
}

/**
 * Line segments contributed by a sibling element — used for tip-to-edge
 * snapping. Triangles contribute their three edges (so an arrow tip sticks
 * *anywhere* along a slope, not just the corners). Ground contributes its
 * surface line. Each segment is returned in canvas coords with the target's
 * own rotation already applied.
 */
function snapSegmentsFor(o: SlideElement): Segment[] {
  if (o.type !== "shape") return [];
  let local: Segment[] = [];
  if (o.shape === "triangle") {
    const apex: Point = { x: o.x + o.width / 2, y: o.y };
    const bl: Point = { x: o.x, y: o.y + o.height };
    const br: Point = { x: o.x + o.width, y: o.y + o.height };
    local = [
      { a: apex, b: bl }, // left slope
      { a: apex, b: br }, // right slope
      { a: bl, b: br }, // base
    ];
  } else if (o.shape === "ground") {
    // Visible surface line sits at the top of the bbox (renderer change).
    local = [{ a: { x: o.x, y: o.y }, b: { x: o.x + o.width, y: o.y } }];
  }
  if (local.length === 0) return local;
  return local.map((seg) => ({
    a: rotateAroundElementCenter(seg.a, o),
    b: rotateAroundElementCenter(seg.b, o),
  }));
}

/** Closest point on segment [a, b] to point p, plus the distance. */
function closestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-6) return { point: a, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, dist: Math.hypot(p.x - point.x, p.y - point.y) };
}

/**
 * Compute a snapped position. Two layers:
 *   1. Axis-aligned anchor snap — bbox edges/centers of the dragging shape
 *      match against bbox edges/centers of siblings, plus slide edges, plus
 *      the ground surface line.
 *   2. 2D tip-to-point snap — only for arrow-like elements: the visual tip
 *      (with rotation applied) can stick to a sibling's 2D anchor point
 *      (currently triangle corners).
 * Closest match within `SNAP_THRESHOLD` wins per axis.
 */
function snapPosition(
  element: SlideElement,
  proposedX: number,
  proposedY: number,
  otherElements: readonly SlideElement[] | undefined,
): { x: number; y: number } {
  const w = element.width;
  const h = element.height;

  // ── Layer 1: axis-aligned anchor snap ────────────────────────────────────
  const xCandidates: number[] = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
  const yCandidates: number[] = [];
  if (element.type === "shape" && otherElements) {
    for (const o of otherElements) {
      xCandidates.push(o.x, o.x + o.width / 2, o.x + o.width);
      yCandidates.push(o.y, o.y + o.height / 2, o.y + o.height);
      // Ground's visible surface line is now at the top of its bbox (renderer
      // change), so the standard `o.y` candidate already does the right
      // thing — no extra entry needed.
    }
  }

  const xAnchors: Array<{ pos: number; offset: number }> = [
    { pos: proposedX, offset: 0 },
    { pos: proposedX + w / 2, offset: -w / 2 },
    { pos: proposedX + w, offset: -w },
  ];
  const yAnchors: Array<{ pos: number; offset: number }> = [
    { pos: proposedY, offset: 0 },
    { pos: proposedY + h / 2, offset: -h / 2 },
    { pos: proposedY + h, offset: -h },
  ];

  let bestDx = Infinity;
  let bestX = proposedX;
  for (const cand of xCandidates) {
    for (const a of xAnchors) {
      const d = Math.abs(a.pos - cand);
      if (d < SNAP_THRESHOLD && d < bestDx) {
        bestDx = d;
        bestX = cand + a.offset;
      }
    }
  }
  let bestDy = Infinity;
  let bestY = proposedY;
  for (const cand of yCandidates) {
    for (const a of yAnchors) {
      const d = Math.abs(a.pos - cand);
      if (d < SNAP_THRESHOLD && d < bestDy) {
        bestDy = d;
        bestY = cand + a.offset;
      }
    }
  }

  // ── Layer 2: 2D tip-to-segment snap (arrows only) ────────────────────────
  // Project the arrow's visual tip onto each sibling's snap segments
  // (triangle slopes, ground surface). Closest projection within threshold
  // wins, and the bbox is translated so the tip lands exactly on that point —
  // so the arrow visually "sticks" anywhere along the slope, not just at
  // corners.
  if (
    element.type === "shape" &&
    ARROW_LIKE_KINDS.has(element.shape) &&
    otherElements
  ) {
    const tip = arrowTipCanvasPos(element, bestX, bestY);
    let bestSnapDist = Infinity;
    let bestSnapPoint: Point | null = null;
    for (const o of otherElements) {
      for (const seg of snapSegmentsFor(o)) {
        const { point, dist } = closestPointOnSegment(tip, seg.a, seg.b);
        if (dist < SNAP_THRESHOLD && dist < bestSnapDist) {
          bestSnapDist = dist;
          bestSnapPoint = point;
        }
      }
    }
    if (bestSnapPoint) {
      bestX += bestSnapPoint.x - tip.x;
      bestY += bestSnapPoint.y - tip.y;
    }
  }

  return { x: bestX, y: bestY };
}

interface DragArgs {
  element: SlideElement;
  scale: number;
  slideIndex: number;
  dispatch: React.Dispatch<EditorAction>;
  otherElements?: readonly SlideElement[];
}

export function useElementDrag({
  element,
  scale,
  slideIndex,
  dispatch,
  otherElements,
}: DragArgs) {
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
        const { x, y } = snapPosition(element, proposedX, proposedY, otherElements);
        dispatch({
          type: "MOVE_ELEMENT_LIVE",
          slideIndex,
          element: { ...element, x, y },
        });
      }

      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element, scale, slideIndex, dispatch, otherElements],
  );
}
