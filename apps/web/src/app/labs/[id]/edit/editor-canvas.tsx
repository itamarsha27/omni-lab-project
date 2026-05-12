"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@omnilab/lab-content";
import type { Slide, SlideElement } from "@omnilab/lab-content";
import type { EditorAction } from "./lab-editor";
import { TextElement } from "./elements/text-element";
import { EquationElement } from "./elements/equation-element";
import { ImageElement } from "./elements/image-element";
import { VideoElement } from "./elements/video-element";
import { QuizElement } from "./elements/quiz-element";
import { ElementHandles } from "./elements/element-handles";
import { ContextMenu, type ContextMenuItem } from "./context-menu";

interface EditorCanvasProps {
  slide: Slide;
  slideIndex: number;
  selectedElementId: string | null;
  dispatch: React.Dispatch<EditorAction>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDropTarget: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  elementId: string;
}

export function EditorCanvas({
  slide,
  slideIndex,
  selectedElementId,
  dispatch,
  containerRef,
  isDropTarget,
}: EditorCanvasProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Forward the parent-provided ref to the same element we observe.
  useEffect(() => {
    if (containerRef && internalRef.current) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = internalRef.current;
    }
  }, [containerRef]);

  useEffect(() => {
    const container = internalRef.current;
    if (!container) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setScale(entry.contentRect.width / CANVAS_WIDTH);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  function handleCanvasClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      dispatch({ type: "SELECT_ELEMENT", id: null });
    }
    setContextMenu(null);
  }

  function handleElementContextMenu(e: React.MouseEvent, el: SlideElement) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: "SELECT_ELEMENT", id: el.id });
    setContextMenu({ x: e.clientX, y: e.clientY, elementId: el.id });
  }

  const sorted = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex);
  const selectedEl = slide.elements.find((el) => el.id === selectedElementId) ?? null;

  function renderElement(el: SlideElement) {
    const isSelected = el.id === selectedElementId;
    const common = {
      isSelected,
      slideIndex,
      scale,
      dispatch,
      onContextMenu: (e: React.MouseEvent) => handleElementContextMenu(e, el),
    };
    switch (el.type) {
      case "text":
        return <TextElement key={el.id} element={el} {...common} />;
      case "equation":
        return <EquationElement key={el.id} element={el} {...common} />;
      case "image":
        return <ImageElement key={el.id} element={el} {...common} />;
      case "video":
        return <VideoElement key={el.id} element={el} {...common} />;
      case "quiz":
        return <QuizElement key={el.id} element={el} {...common} />;
      default:
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: el.x,
              top: el.y,
              width: el.width,
              height: el.height,
              zIndex: el.zIndex,
              border: "2px dashed #d1d5db",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
              fontSize: 28,
            }}
          >
            {el.type}
          </div>
        );
    }
  }

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? [
        {
          label: "Bring to front",
          onClick: () =>
            dispatch({ type: "BRING_TO_FRONT", slideIndex, elementId: contextMenu.elementId }),
        },
        {
          label: "Send to back",
          onClick: () =>
            dispatch({ type: "SEND_TO_BACK", slideIndex, elementId: contextMenu.elementId }),
        },
      ]
    : [];

  return (
    <div
      ref={internalRef}
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        outline: isDropTarget ? "3px solid #6366f1" : "none",
        outlineOffset: -3,
        transition: "outline-color 80ms",
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          backgroundColor: slide.background,
          position: "absolute",
          top: 0,
          left: 0,
        }}
        onClick={handleCanvasClick}
      >
        {sorted.map(renderElement)}
      </div>

      {selectedEl && (
        <ElementHandles
          element={selectedEl}
          scale={scale}
          slideIndex={slideIndex}
          dispatch={dispatch}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
