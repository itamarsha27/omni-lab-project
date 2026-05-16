export * from "./types";

import type {
  Slide,
  LabContent,
  SlideElement,
  TextElement,
  EquationElement,
  ImageElement,
  VideoElement,
  QuizElement,
  QuizQuestion,
  DrawingElement,
  ShapeElement,
  ShapeKind,
  GroupElement,
} from "./types";

/**
 * Shape kinds that behave like arrows / vectors (have a `direction`, render as
 * a stroke from tail to head). Used by the editor to filter the kind dropdown
 * by "family" (arrow vs shape) and by the renderer to pick label positioning.
 */
export const ARROW_LIKE_KINDS: ReadonlySet<ShapeKind> = new Set([
  "arrow",
  "arrow-double",
  "arrow-curved",
  "vector",
  "line",
]);

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

/** Default freehand drawing element inserted by the toolbar pencil button.
 *  Empty `strokes` array — teacher selects the element and starts drawing
 *  inside the box. `currentColor`/`currentWidth` drive the *next* stroke;
 *  already-committed strokes carry their own settings. */
export function createDrawingElement(overrides?: Partial<DrawingElement>): DrawingElement {
  return {
    id: makeId(),
    type: "drawing",
    strokes: [],
    currentColor: "#111827", // near-black
    currentWidth: 6,
    x: 560,
    y: 290,
    width: 800,
    height: 500,
    zIndex: 1,
    ...overrides,
  };
}

/** Default shape element inserted by the toolbar shape button. Defaults to a
 *  rectangle; teacher switches kind in the sidebar. Black outline + transparent
 *  interior — the diagrams.net / physics-textbook convention, leaves background
 *  visible behind the shape. Fill can be added per-shape via the sidebar. */
export function createShapeElement(overrides?: Partial<ShapeElement>): ShapeElement {
  return {
    id: makeId(),
    type: "shape",
    shape: "rectangle",
    fill: "none",
    stroke: "#111827", // near-black
    strokeWidth: 4,
    strokeStyle: "solid",
    rotation: 0,
    label: "",
    x: 760,
    y: 440,
    width: 400,
    height: 200,
    zIndex: 1,
    ...overrides,
  };
}

/** Default arrow element inserted by the toolbar arrow button. A right-pointing
 *  horizontal arrow with a thin bounding box (arrows are typically long & thin).
 *  Same color defaults as shapes: black stroke, transparent fill. */
export function createArrowElement(overrides?: Partial<ShapeElement>): ShapeElement {
  return {
    id: makeId(),
    type: "shape",
    shape: "arrow",
    fill: "none",
    stroke: "#111827",
    strokeWidth: 4,
    strokeStyle: "solid",
    rotation: 0,
    label: "",
    x: 760,
    y: 510,
    width: 400,
    height: 80,
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

/**
 * Wrap a list of canvas-coord elements into a GroupElement. The group's bbox
 * is the axis-aligned union of the children, and each child's `x` / `y` is
 * rewritten relative to the group's origin so future moves/rotations of the
 * group can use a simple CSS transform.
 *
 * NOTE: the children's `width`, `height`, and own `rotation` are kept as-is.
 * If a child was rotated 30°, it stays at 30° relative to the group; the
 * group's rotation composes on top via CSS transform cascade.
 */
export function createGroupFromElements(elements: SlideElement[]): GroupElement {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  }
  const groupX = minX;
  const groupY = minY;
  const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
  return {
    id: makeId(),
    type: "group",
    x: groupX,
    y: groupY,
    width: maxX - minX,
    height: maxY - minY,
    zIndex: maxZ + 1,
    rotation: 0,
    children: elements.map((el) => ({
      ...el,
      x: el.x - groupX,
      y: el.y - groupY,
    })) as SlideElement[],
  };
}

/**
 * Expand a GroupElement back into top-level canvas-coord elements. If the
 * group has a non-zero rotation, that rotation is **baked** into the children
 * before ungrouping: each child's position is rotated around the group center,
 * and shape / nested-group children's own `rotation` field absorbs the group
 * rotation so the visual stays identical after ungrouping.
 */
export function ungroupElement(group: GroupElement): SlideElement[] {
  const R = group.rotation ?? 0;
  if (R === 0) {
    return group.children.map((child) => ({
      ...child,
      x: child.x + group.x,
      y: child.y + group.y,
    })) as SlideElement[];
  }
  const Rrad = (R * Math.PI) / 180;
  const cR = Math.cos(Rrad);
  const sR = Math.sin(Rrad);
  const gcx = group.width / 2;
  const gcy = group.height / 2;
  return group.children.map((child) => {
    // Rotate the child's CENTER around the group's center, then translate
    // back to a top-left.
    const cxLocal = child.x + child.width / 2;
    const cyLocal = child.y + child.height / 2;
    const offX = cxLocal - gcx;
    const offY = cyLocal - gcy;
    const newOffX = offX * cR - offY * sR;
    const newOffY = offX * sR + offY * cR;
    const newCx = group.x + gcx + newOffX;
    const newCy = group.y + gcy + newOffY;
    const newX = newCx - child.width / 2;
    const newY = newCy - child.height / 2;
    if (child.type === "shape" || child.type === "group") {
      return {
        ...child,
        x: newX,
        y: newY,
        rotation: (((child.rotation ?? 0) + R) % 360 + 360) % 360,
      };
    }
    // Non-rotatable element types: position is preserved, but their visual
    // rotation is lost. Acceptable v1 limitation — only happens if you group
    // text/image/video, rotate the group, then ungroup.
    return { ...child, x: newX, y: newY };
  }) as SlideElement[];
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
