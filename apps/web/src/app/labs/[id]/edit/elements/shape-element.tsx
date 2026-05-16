"use client";

import { useMemo } from "react";
import katex from "katex";
import {
  ARROW_LIKE_KINDS,
  type ShapeElement as ShapeEl,
  type ShapeKind,
  type SlideElement,
} from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";

interface Props {
  element: ShapeEl;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
  otherElements?: readonly SlideElement[];
}

function strokeDashArray(
  style: "solid" | "dashed" | "dotted" | undefined,
  strokeWidth: number,
): string | undefined {
  if (!style || style === "solid") return undefined;
  if (style === "dashed") return `${strokeWidth * 3} ${strokeWidth * 2}`;
  return `${strokeWidth} ${strokeWidth * 1.5}`;
}

/**
 * Label position in element-local coords (CSS rotation later moves it
 * visually). For arrows, sit near the **tip** (right edge of the unrotated
 * box) with a perpendicular offset so the label doesn't overlap the arrow.
 * For ground, sit in the lower half (below the surface line). Everything
 * else: centered.
 */
function labelPosFor(element: ShapeEl) {
  const { width: w, height: h, shape } = element;
  if (ARROW_LIKE_KINDS.has(shape)) {
    // Label sits PAST the tip in the arrow's pointing direction. In
    // element-local space the arrow always points +X (it's drawn from
    // (0, h/2) to (w, h/2)), so the label at (w + offset, h/2) is "past
    // the tip" in arrow-local coords. The wrapper's CSS rotation then
    // carries this to "past the visual tip in the visual pointing
    // direction" at any angle:
    //   • up-arrow    → label appears above the visual tip
    //   • right-arrow → to the right of the visual tip
    //   • down-arrow  → below the visual tip
    //   • 45°         → 45° past the tip
    // The label HTML's counter-rotation (`rotate(-rotation)`) keeps the
    // text upright on screen regardless of how the wrapper is rotated.
    return { x: w + labelFontSizeFor(element), y: h / 2 };
  }
  if (shape === "ground") return { x: w / 2, y: h * 0.7 };
  return { x: w / 2, y: h / 2 };
}

function labelFontSizeFor(element: ShapeEl) {
  return Math.max(18, Math.min(Math.max(element.width, element.height) * 0.12, 36));
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-level component
// ─────────────────────────────────────────────────────────────────────────────

export function ShapeElement({
  element,
  isSelected: _isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
  otherElements,
}: Props) {
  const startDrag = useElementDrag({
    element,
    scale,
    slideIndex,
    dispatch,
    otherElements,
  });

  function handleSvgMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      dispatch({ type: "TOGGLE_ELEMENT_SELECTION", id: element.id });
      return;
    }
    dispatch({ type: "SELECT_ELEMENT", id: element.id });
    startDrag(e);
  }

  const rotation = element.rotation ?? 0;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        userSelect: "none",
        pointerEvents: "none",
        // CSS rotation around the box center rotates the SVG body AND the
        // label overlay together. Hit-testing on the SVG body uses the
        // post-transform geometry, so clicks on the visibly rotated stroke
        // still capture correctly.
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
      }}
    >
      <ShapeSvg
        element={element}
        onMouseDown={handleSvgMouseDown}
        onContextMenu={onContextMenu}
      />
      <ShapeLabel element={element} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG body
// ─────────────────────────────────────────────────────────────────────────────

export function ShapeSvg({
  element,
  onMouseDown,
  onContextMenu,
}: {
  element: ShapeEl;
  onMouseDown?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const { width: w, height: h } = element;
  const dashArray = strokeDashArray(element.strokeStyle, element.strokeWidth);
  const interactive = !!onMouseDown;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      onMouseDown={onMouseDown}
      onContextMenu={onContextMenu}
      style={{
        display: "block",
        overflow: "visible",
        pointerEvents: interactive ? "visiblePainted" : "none",
        cursor: interactive ? "move" : "default",
      }}
    >
      <ShapeBody element={element} dashArray={dashArray} />
    </svg>
  );
}

/**
 * HTML overlay so labels can use KaTeX. Rotation behavior: the parent wrapper
 * rotates by `element.rotation`. We counter-rotate the label by `-rotation`
 * so the *text* stays upright while still sitting at the rotated tip
 * position (diagrams.net convention).
 */
export function ShapeLabel({ element }: { element: ShapeEl }) {
  const label = element.label?.trim();
  const html = useMemo(() => {
    if (!label) return "";
    try {
      return katex.renderToString(label, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return "";
    }
  }, [label]);
  if (!label || !html) return null;
  const pos = labelPosFor(element);
  const fontSize = labelFontSizeFor(element);
  const rotation = element.rotation ?? 0;
  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: `translate(-50%, -50%) rotate(${-rotation}deg)`,
        fontSize,
        lineHeight: 1,
        whiteSpace: "nowrap",
        color: "#111827",
        pointerEvents: "none",
        userSelect: "none",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-kind SVG bodies — all drawn in their "natural" orientation
// (horizontal for arrows / springs / ground). Rotation handled by wrapper.
// ─────────────────────────────────────────────────────────────────────────────

function ShapeBody({
  element,
  dashArray,
}: {
  element: ShapeEl;
  dashArray: string | undefined;
}) {
  const {
    width: w,
    height: h,
    shape,
    fill,
    stroke,
    strokeWidth,
  } = element;
  const sw = strokeWidth;

  switch (shape) {
    case "rectangle":
      return (
        <rect
          x={sw / 2}
          y={sw / 2}
          width={Math.max(0, w - sw)}
          height={Math.max(0, h - sw)}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray}
        />
      );

    case "circle": {
      // True circle (not ellipse) — radius from the smaller box dimension so
      // a non-square box still renders a round ball, just centered. Combined
      // with aspect-lock during resize, the box should normally stay square
      // anyway.
      const r = Math.max(0, Math.min(w, h) / 2 - sw / 2);
      return (
        <circle
          cx={w / 2}
          cy={h / 2}
          r={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray}
        />
      );
    }

    case "triangle":
      return (
        <polygon
          points={`${w / 2},${sw / 2} ${w - sw / 2},${h - sw / 2} ${sw / 2},${h - sw / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray}
          strokeLinejoin="round"
        />
      );

    case "ground":
      return (
        <GroundShape w={w} h={h} stroke={stroke} strokeWidth={sw} dashArray={dashArray} />
      );

    case "spring":
      return <SpringShape w={w} h={h} stroke={stroke} strokeWidth={sw} />;

    case "line":
      return (
        <line
          x1={0}
          y1={h / 2}
          x2={w}
          y2={h / 2}
          stroke={stroke}
          strokeWidth={sw}
          strokeDasharray={dashArray}
          strokeLinecap="round"
        />
      );

    case "arrow":
      return (
        <ArrowBody
          sx={0}
          sy={h / 2}
          ex={w}
          ey={h / 2}
          stroke={stroke}
          strokeWidth={sw}
          dashArray={dashArray}
          headScale={4}
        />
      );

    case "arrow-double":
      return (
        <ArrowDoubleBody
          sx={0}
          sy={h / 2}
          ex={w}
          ey={h / 2}
          stroke={stroke}
          strokeWidth={sw}
          dashArray={dashArray}
        />
      );

    case "arrow-curved":
      return (
        <ArrowCurvedBody
          sx={0}
          sy={h / 2}
          ex={w}
          ey={h / 2}
          stroke={stroke}
          strokeWidth={sw}
          dashArray={dashArray}
        />
      );

    case "vector":
      return (
        <ArrowBody
          sx={0}
          sy={h / 2}
          ex={w}
          ey={h / 2}
          stroke={stroke}
          strokeWidth={sw * 1.25}
          dashArray={undefined}
          headScale={5}
        />
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable arrow geometry — all parametrized by start/end points
// ─────────────────────────────────────────────────────────────────────────────

function ArrowBody({
  sx,
  sy,
  ex,
  ey,
  stroke,
  strokeWidth,
  dashArray,
  headScale,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
  headScale: number;
}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(strokeWidth * headScale, len * 0.3);
  const halfH = Math.min(strokeWidth * (headScale * 0.65), len * 0.12);
  const baseX = ex - ux * head;
  const baseY = ey - uy * head;
  const px = -uy;
  const py = ux;
  return (
    <>
      <line
        x1={sx}
        y1={sy}
        x2={baseX}
        y2={baseY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      <polygon
        points={`${ex},${ey} ${baseX + px * halfH},${baseY + py * halfH} ${baseX - px * halfH},${baseY - py * halfH}`}
        fill={stroke}
        stroke="none"
      />
    </>
  );
}

function ArrowDoubleBody({
  sx,
  sy,
  ex,
  ey,
  stroke,
  strokeWidth,
  dashArray,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(strokeWidth * 4, len * 0.2);
  const halfH = Math.min(strokeWidth * 2.5, len * 0.1);
  const startBaseX = sx + ux * head;
  const startBaseY = sy + uy * head;
  const endBaseX = ex - ux * head;
  const endBaseY = ey - uy * head;
  const px = -uy;
  const py = ux;
  return (
    <>
      <line
        x1={startBaseX}
        y1={startBaseY}
        x2={endBaseX}
        y2={endBaseY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      <polygon
        points={`${ex},${ey} ${endBaseX + px * halfH},${endBaseY + py * halfH} ${endBaseX - px * halfH},${endBaseY - py * halfH}`}
        fill={stroke}
        stroke="none"
      />
      <polygon
        points={`${sx},${sy} ${startBaseX + px * halfH},${startBaseY + py * halfH} ${startBaseX - px * halfH},${startBaseY - py * halfH}`}
        fill={stroke}
        stroke="none"
      />
    </>
  );
}

function ArrowCurvedBody({
  sx,
  sy,
  ex,
  ey,
  stroke,
  strokeWidth,
  dashArray,
}: {
  sx: number;
  sy: number;
  ex: number;
  ey: number;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
}) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const ux = dx / len;
  const uy = dy / len;
  const px = uy;
  const py = -ux;
  const midX = (sx + ex) / 2;
  const midY = (sy + ey) / 2;
  const arc = len * 0.35;
  const ctrlX = midX + px * arc;
  const ctrlY = midY + py * arc;

  const tx = ex - ctrlX;
  const ty = ey - ctrlY;
  const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
  const tux = tx / tlen;
  const tuy = ty / tlen;
  const head = Math.min(strokeWidth * 4, len * 0.2);
  const halfH = Math.min(strokeWidth * 2.5, len * 0.1);
  const baseX = ex - tux * head;
  const baseY = ey - tuy * head;
  const hpx = -tuy;
  const hpy = tux;
  return (
    <>
      <path
        d={`M ${sx} ${sy} Q ${ctrlX} ${ctrlY} ${ex} ${ey}`}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      <polygon
        points={`${ex},${ey} ${baseX + hpx * halfH},${baseY + hpy * halfH} ${baseX - hpx * halfH},${baseY - hpy * halfH}`}
        fill={stroke}
        stroke="none"
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Physics-specific shapes — drawn in canonical orientation; rotation comes
// from the wrapper's CSS transform (so a "wall" is just ground with
// rotation: 90, "ceiling" is rotation: 180).
// ─────────────────────────────────────────────────────────────────────────────

function GroundShape({
  w,
  h,
  stroke,
  strokeWidth,
  dashArray,
}: {
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
  dashArray?: string;
}) {
  // Surface line sits just inside the top edge; hatches fill the rest of the
  // box down to just inside the bottom. The bbox now matches the visible
  // content, so clicking "above" the ground no longer accidentally hits the
  // ground's bbox.
  const surfaceY = strokeWidth / 2;
  const hatchTop = surfaceY;
  const hatchBottom = h - strokeWidth / 2;
  const hatchLen = hatchBottom - hatchTop;
  const count = Math.max(4, Math.min(20, Math.floor(w / 40)));
  const step = w / count;
  const lines: React.ReactElement[] = [];
  for (let i = 0; i <= count; i++) {
    const x1 = i * step;
    const y1 = hatchTop;
    const x2 = x1 - hatchLen;
    const y2 = y1 + hatchLen;
    lines.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={stroke}
        strokeWidth={Math.max(1, strokeWidth * 0.6)}
        strokeLinecap="round"
      />,
    );
  }
  const clipId = `gnd-clip-${w}-${h}`;
  return (
    <g>
      <clipPath id={clipId}>
        <rect x={0} y={surfaceY} width={w} height={Math.max(0, h - surfaceY)} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>{lines}</g>
      <line
        x1={0}
        y1={surfaceY}
        x2={w}
        y2={surfaceY}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
    </g>
  );
}

function SpringShape({
  w,
  h,
  stroke,
  strokeWidth,
}: {
  w: number;
  h: number;
  stroke: string;
  strokeWidth: number;
}) {
  // Always drawn horizontally; rotate via the wrapper for a vertical spring.
  const cy = h / 2;
  const leadLen = w * 0.1;
  const zigStart = leadLen;
  const zigEnd = w - leadLen;
  const zigSpan = zigEnd - zigStart;
  const peaks = 10;
  const peakStep = zigSpan / peaks;
  const peakH = h * 0.35;
  let path = `M 0 ${cy} L ${zigStart} ${cy}`;
  for (let i = 0; i < peaks; i++) {
    const xMid = zigStart + peakStep * (i + 0.5);
    const xEnd = zigStart + peakStep * (i + 1);
    const yMid = i % 2 === 0 ? cy - peakH : cy + peakH;
    path += ` L ${xMid} ${yMid} L ${xEnd} ${cy}`;
  }
  path += ` L ${w} ${cy}`;
  return (
    <path
      d={path}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  );
}
