"use client";

import { useState } from "react";
import type { VideoElement as VideoElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";
import { parseVideoUrl, videoThumbnailUrl } from "./video-url";

interface Props {
  element: VideoElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function VideoElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const [thumbError, setThumbError] = useState(false);
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      dispatch({ type: "TOGGLE_ELEMENT_SELECTION", id: element.id });
      return;
    }
    if (!isSelected) {
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
    }
    startDrag(e);
  }

  const parsed = parseVideoUrl(element.url);
  const thumbSrc = parsed ? videoThumbnailUrl(parsed) : null;

  return (
    <div
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        cursor: "move",
        userSelect: "none",
        overflow: "hidden",
        borderRadius: 8,
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
    >
      {!element.url.trim() || !parsed ? (
        <Placeholder hasUrl={!!element.url.trim()} />
      ) : (
        <VideoPreview
          thumbSrc={thumbError ? null : thumbSrc}
          platform={parsed.platform}
          onThumbError={() => setThumbError(true)}
        />
      )}
    </div>
  );
}

function VideoPreview({
  thumbSrc,
  platform,
  onThumbError,
}: {
  thumbSrc: string | null;
  platform: "youtube" | "vimeo";
  onThumbError: () => void;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "#0b0f19",
      }}
    >
      {thumbSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbSrc}
          alt=""
          draggable={false}
          onError={onThumbError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
            userSelect: "none",
          }}
        />
      )}
      <PlayBadge />
      <PlatformBadge platform={platform} />
    </div>
  );
}

function PlayBadge() {
  // Big translucent play button centered over the thumbnail — same visual
  // language as YouTube/Vimeo embeds so teachers know "this will play live".
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
      >
        <div
          // CSS-only play triangle: a right-pointing arrow built from borders.
          style={{
            width: 0,
            height: 0,
            borderTop: "28px solid transparent",
            borderBottom: "28px solid transparent",
            borderLeft: "44px solid white",
            marginLeft: 10,
          }}
        />
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: "youtube" | "vimeo" }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 12,
        left: 12,
        padding: "4px 10px",
        borderRadius: 6,
        background: "rgba(0,0,0,0.7)",
        color: "white",
        fontSize: 22,
        fontWeight: 600,
        textTransform: "capitalize",
        letterSpacing: 0.5,
      }}
    >
      {platform}
    </div>
  );
}

function Placeholder({ hasUrl }: { hasUrl: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        background: "#f9fafb",
        border: "2px dashed #d1d5db",
        borderRadius: 8,
        color: "#9ca3af",
        fontSize: 32,
        fontWeight: 500,
        padding: 24,
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: 80, lineHeight: 1 }}>▶</span>
      <span>
        {hasUrl
          ? "Not a recognized YouTube or Vimeo URL."
          : "Paste a YouTube or Vimeo URL in the right sidebar."}
      </span>
    </div>
  );
}
