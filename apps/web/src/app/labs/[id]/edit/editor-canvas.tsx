"use client";

import { useEffect, useRef, useState } from "react";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@omnilab/lab-content";
import type { Slide } from "@omnilab/lab-content";

interface EditorCanvasProps {
  slide: Slide;
}

export function EditorCanvas({ slide }: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width } = entry.contentRect;
      setScale(width / CANVAS_WIDTH);
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    // Outer div defines display size — aspect-ratio sets the height from the width.
    // overflow-hidden + relative keep the scaled inner div clipped to this box.
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
    >
      {/* Inner div is always 1920×1080 and CSS-scaled to fit.
          position:absolute takes it out of flow so it doesn't stretch the outer div. */}
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
      >
        {/* Element renderers will be added here in M2.2+ */}
      </div>
    </div>
  );
}
