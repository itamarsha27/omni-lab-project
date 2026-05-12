export * from "./types";

import type {
  Slide,
  LabContent,
  TextElement,
  EquationElement,
  ImageElement,
  VideoElement,
  QuizElement,
  QuizQuestion,
} from "./types";

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
    fontSize: 48, // ≈ "24" in the size picker (label is canvas-px ÷ 2)
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
    fontSize: 48, // matches default text element; user can scale up via the size picker
    ...overrides,
  };
}

/**
 * Default values shared by every QuizQuestion variant. Q29 locks defaults to
 * 100 pts + time-decayed scoring; teacher can override per-question in the
 * right-panel sidebar.
 */
const QUIZ_DEFAULT_POINTS = 100;
const QUIZ_DEFAULT_TIME_DECAY = true;

/** Build a fresh question shape for a given `kind` with sensible defaults. */
export function createQuizQuestion(kind: QuizQuestion["kind"]): QuizQuestion {
  const base = {
    id: makeId(),
    prompt: "",
    points: QUIZ_DEFAULT_POINTS,
    timeDecay: QUIZ_DEFAULT_TIME_DECAY,
  };
  switch (kind) {
    case "mc-single":
      return { ...base, kind: "mc-single", options: ["", ""], correctIndex: 0 };
    case "mc-multi":
      return { ...base, kind: "mc-multi", options: ["", ""], correctIndices: [] };
    case "short-text":
      return { ...base, kind: "short-text", correctAnswers: [""] };
    case "numeric":
      return { ...base, kind: "numeric", correctValue: "", tolerance: 0, checkUnit: false };
    case "true-false":
      return { ...base, kind: "true-false", correctAnswer: true };
  }
}

/** Default image element inserted by the toolbar image button. Empty `src`
 *  means the editor renders an empty-state placeholder until the teacher
 *  pastes a URL in the sidebar. S3-upload path comes in a later pass. */
export function createImageElement(overrides?: Partial<ImageElement>): ImageElement {
  return {
    id: makeId(),
    type: "image",
    src: "",
    alt: "",
    x: 560,
    y: 290,
    width: 800,
    height: 500,
    zIndex: 1,
    ...overrides,
  };
}

/** Default video element inserted by the toolbar video button. Empty `url`
 *  means the editor renders an empty-state placeholder. The editor only ever
 *  shows a static thumbnail + play overlay; actual iframe playback happens
 *  in preview/session mode (M3). */
export function createVideoElement(overrides?: Partial<VideoElement>): VideoElement {
  return {
    id: makeId(),
    type: "video",
    url: "",
    x: 560,
    y: 290,
    width: 800,
    height: 500,
    zIndex: 1,
    ...overrides,
  };
}

/** Default quiz element inserted by the toolbar ? button. */
export function createQuizElement(overrides?: Partial<QuizElement>): QuizElement {
  return {
    id: makeId(),
    type: "quiz",
    question: createQuizQuestion("mc-single"),
    x: 460,
    y: 290,
    width: 1000,
    height: 500,
    zIndex: 1,
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
