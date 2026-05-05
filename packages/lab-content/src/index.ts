export * from "./types";

import type { Slide, LabContent } from "./types";

// Virtual canvas dimensions — elements are positioned in this coordinate space
// and scaled to fit the display container via CSS transform.
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

function makeId(): string {
  // crypto.randomUUID is available in Node 20+ and all modern browsers
  return crypto.randomUUID();
}

/** First slide seeded when a new lab is created — "Title + Content" template. */
export function createDefaultSlide(): Slide {
  return {
    id: makeId(),
    background: "#ffffff",
    transition: "none",
    notes: "",
    elements: [
      {
        id: makeId(),
        type: "text",
        content: "<h1 style=\"text-align:center\">Slide Title</h1>",
        x: 160,
        y: 200,
        width: 1600,
        height: 220,
        zIndex: 1,
      },
      {
        id: makeId(),
        type: "text",
        content: "<p style=\"text-align:center;color:#9ca3af\">Click to add content</p>",
        x: 160,
        y: 480,
        width: 1600,
        height: 400,
        zIndex: 1,
      },
    ],
  };
}

/** Blank white slide added for every subsequent "Add slide" action. */
export function createBlankSlide(): Slide {
  return {
    id: makeId(),
    background: "#ffffff",
    transition: "none",
    notes: "",
    elements: [],
  };
}

/** Ensure a raw JSON value from Prisma conforms to LabContent, with a fallback. */
export function parseLabContent(raw: unknown): LabContent {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "slides" in raw &&
    Array.isArray((raw as Record<string, unknown>).slides)
  ) {
    return raw as LabContent;
  }
  // Malformed or legacy empty content — return a single default slide
  return { contentVersion: 1, slides: [createDefaultSlide()] };
}
