"use client";

import type { GroupElement as GroupEl, SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";
import { ShapeSvg, ShapeLabel } from "./shape-element";

interface Props {
  element: GroupEl;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
  otherElements?: readonly SlideElement[];
}

/**
 * Renders a group as a single positioned + rotated wrapper containing static
 * renderings of its children, plus a transparent hit-test overlay on top.
 * Clicking anywhere in the group's bbox selects the group as a unit — children
 * inside are *not* individually interactive (this is the simplest correct
 * behavior; to edit a child the user ungroups first).
 *
 * Child coords are stored relative to the group's origin, so positioning is
 * automatic via CSS `position: absolute` inside the rotated wrapper.
 * Rotations cascade: the wrapper's `transform: rotate(R)` rotates all
 * descendants visually, and any per-shape rotation on a child composes on top.
 */
export function GroupElement({
  element,
  isSelected: _isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
  otherElements,
}: Props) {
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch, otherElements });
  const rotation = element.rotation ?? 0;

  function handleMouseDown(e: React.MouseEvent) {
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

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: "center center",
        // Wrapper itself doesn't capture pointer events — the hit-test
        // overlay below does. This lets the user click anywhere in the
        // group's bbox to select it, even on the "empty" parts between
        // children, without children intercepting clicks.
        pointerEvents: "none",
      }}
      onContextMenu={onContextMenu}
    >
      {/* Children, rendered statically (no interaction). Each child is
          positioned relative to the group's origin (its x/y are local). */}
      {[...element.children]
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((child) => (
          <StaticChild key={child.id} element={child} />
        ))}

      {/* Hit-test overlay: catches all clicks within the group bbox. Rendered
          last so it stacks above the children in DOM order, intercepting
          their clicks before they can reach the children's own handlers. */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          inset: 0,
          cursor: "move",
          pointerEvents: "auto",
          background: "transparent",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Static (non-interactive) renderers for group children
// ─────────────────────────────────────────────────────────────────────────────

/** A view-only render of an element used inside a group. No handlers, no
 *  state, no drag. We rebuild minimal versions of each element type here
 *  rather than reusing the interactive renderers — the interactive ones
 *  would attach their own handlers and dispatch actions that would be
 *  meaningless for grouped children (they aren't in `slide.elements`). */
function StaticChild({ element }: { element: SlideElement }) {
  const boxed: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
    overflow: "hidden",
    pointerEvents: "none",
  };

  if (element.type === "shape") {
    const rot = element.rotation ?? 0;
    return (
      <div
        style={{
          ...boxed,
          overflow: "visible",
          transform: rot !== 0 ? `rotate(${rot}deg)` : undefined,
          transformOrigin: "center center",
        }}
      >
        <ShapeSvg element={element} />
        <ShapeLabel element={element} />
      </div>
    );
  }

  if (element.type === "text") {
    return (
      <div
        style={{
          ...boxed,
          fontSize: element.fontSize ?? 48,
          fontFamily: element.fontFamily ?? "var(--font-sans)",
        }}
      >
        <div
          className="tiptap-content"
          dangerouslySetInnerHTML={{ __html: element.content }}
        />
      </div>
    );
  }

  if (element.type === "image") {
    if (!element.src.trim()) {
      return (
        <div
          style={{
            ...boxed,
            background: "#f9fafb",
            border: "2px dashed #d1d5db",
            borderRadius: 8,
          }}
        />
      );
    }
    return (
      <div style={boxed}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={element.src}
          alt={element.alt}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
            userSelect: "none",
          }}
          draggable={false}
        />
      </div>
    );
  }

  if (element.type === "drawing") {
    return (
      <div style={boxed}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${element.width} ${element.height}`}
          preserveAspectRatio="none"
          style={{ display: "block", pointerEvents: "none" }}
        >
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
      </div>
    );
  }

  // Recursive: groups inside groups
  if (element.type === "group") {
    const rot = element.rotation ?? 0;
    return (
      <div
        style={{
          ...boxed,
          overflow: "visible",
          transform: rot !== 0 ? `rotate(${rot}deg)` : undefined,
          transformOrigin: "center center",
        }}
      >
        {[...element.children]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((child) => (
            <StaticChild key={child.id} element={child} />
          ))}
      </div>
    );
  }

  // Fallback for types we don't yet have static renderers for (video, quiz,
  // equation, etc.) — a subtle placeholder so users see *something*. The
  // common cases (shapes, text, images, drawings, groups) cover free body
  // diagrams which is the immediate use case.
  return (
    <div
      style={{
        ...boxed,
        background: "rgba(99, 102, 241, 0.08)",
        border: "1px dashed #c7d2fe",
      }}
    />
  );
}
