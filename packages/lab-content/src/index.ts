export * from "./types";

import type { Slide, LabContent, TextElement, EquationElement } from "./types";

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

/** Default text element inserted by the toolbar T button. */
export function createTextElement(overrides?: Partial<TextElement>): TextElement {
  return {
    id: makeId(),
    type: "text",
    // Font sizing is applied by the editor (text-element wrapper), not inline,
    // so view-mode and TipTap edit-mode stay visually identical.
    content: "<p>Text</p>",
    x: 560,
    y: 460,
    width: 800,
    height: 160,
    zIndex: 1,
    ...overrides,
  };
}

/** Default equation element inserted by the toolbar ∑ button. */
export function createEquationElement(overrides?: Partial<EquationElement>): EquationElement {
  return {
    id: makeId(),
    type: "equation",
    latex: "x^2",
    x: 660,
    y: 480,
    width: 600,
    height: 120,
    zIndex: 1,
    fontSize: 64, // ≈ "32" in the UI selector (we double the user-facing label for canvas px)
    ...overrides,
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
