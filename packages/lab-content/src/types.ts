// ============================================================================
// Top-level content shape — stored as Lab.content (JSONB) in Postgres
// ============================================================================

export interface LabContent {
  contentVersion: 1;
  slides: Slide[];
}

// ============================================================================
// Slide
// ============================================================================

export type SlideTransition = "none" | "fade" | "slide" | "zoom";

export interface Slide {
  id: string;
  background: string; // CSS color, default "#ffffff"
  elements: SlideElement[];
  notes: string; // speaker notes (teacher-only)
  transition: SlideTransition;
}

// ============================================================================
// Elements — discriminated union on `type`
// ============================================================================

export interface BaseElement {
  id: string;
  x: number; // px in 1920×1080 virtual space
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string; // HTML (rich text)
  /** Default font size in canvas px. Headings (h1/h2) scale relative to this. */
  fontSize?: number;
  /** CSS font-family stack. Stored as a full stack so absent fonts fall back gracefully. */
  fontFamily?: string;
}

export interface EquationElement extends BaseElement {
  type: "equation";
  latex: string;
  /** Font size in canvas px. Box width controls equation width (overflow:hidden). */
  fontSize?: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string; // S3 URL or external URL
  alt: string; // reserved for accessibility (Q44)
  assetId?: string; // set when uploaded via S3
}

export interface VideoElement extends BaseElement {
  type: "video";
  url: string; // YouTube or Vimeo URL
}

export interface QuizElement extends BaseElement {
  type: "quiz";
  question: QuizQuestion;
}

export interface DesmosElement extends BaseElement {
  type: "desmos";
  state: string; // Desmos calculator state JSON
  sliders: DesmosSlider[];
}

export interface DesmosSlider {
  parameterId: string;
  min: number;
  max: number;
  step: number;
}

export interface CodeElement extends BaseElement {
  type: "code";
  language: "python"; // only Python (Pyodide) in v1
  code: string;
}

export interface DrawingElement extends BaseElement {
  type: "drawing";
  strokes: DrawingStroke[];
  /** Pen color used for the *next* stroke. Sidebar updates this; each stroke
   *  bakes its own color/width so already-drawn strokes keep theirs. */
  currentColor: string;
  /** Pen width in element-local canvas px. */
  currentWidth: number;
}

export interface DrawingStroke {
  /** [x, y] pairs in **element-local** coordinates (0..element.width, 0..element.height).
   *  Resizing the element scales strokes proportionally via the SVG viewBox. */
  points: [number, number][];
  color: string;
  width: number;
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** Optional text label rendered on the shape. Critical for free body
   *  diagrams (labeling forces "F_g" / masses "m" / etc.). */
  label?: string;
  /** Stroke dash style. Default solid. */
  strokeStyle?: "solid" | "dashed" | "dotted";
  /** Rotation in degrees, CW positive (matches CSS transform). Default 0.
   *  Applied via CSS transform on the wrapper, so the SVG body, label, and
   *  any hit-test geometry all rotate together around the element's center.
   *  Replaces the older `direction` field — the sidebar's 4 cardinal buttons
   *  now just set rotation to 0/90/180/270. */
  rotation?: number;
}

export type ShapeKind =
  | "rectangle"
  | "circle"
  | "triangle"
  | "line"
  | "arrow"
  | "arrow-double"
  | "arrow-curved"
  | "vector"
  | "ground"
  | "spring";

export interface PhysicsElement extends BaseElement {
  type: "physics";
  config: Record<string, unknown>; // full spec in M2.8
}

export interface ChemistryElement extends BaseElement {
  type: "chemistry";
  kind: "periodic-table" | "reaction";
  config: Record<string, unknown>;
}

/**
 * A logical container that wraps multiple child elements so they move/rotate
 * as a single object. Children store their `x` / `y` *relative to the group's
 * origin*, so rotating the group is just a CSS transform on the wrapper and
 * descendants inherit. The type is recursive: groups can contain groups.
 *
 * Ungrouping is the inverse — children's coords are converted back to canvas
 * coords, and if the group had a non-zero rotation, that rotation is baked
 * into each child (position rotated around the group center, shape children's
 * own rotation is added on).
 */
export interface GroupElement extends BaseElement {
  type: "group";
  children: SlideElement[];
  /** Free rotation in degrees, CW positive. Applies via CSS transform on the
   *  group's wrapper, so descendants visually rotate as a unit. */
  rotation?: number;
}

export type SlideElement =
  | TextElement
  | EquationElement
  | ImageElement
  | VideoElement
  | QuizElement
  | DesmosElement
  | CodeElement
  | DrawingElement
  | ShapeElement
  | PhysicsElement
  | ChemistryElement
  | GroupElement;

// ============================================================================
// Quiz questions — discriminated union on `kind`
// ============================================================================

export interface BaseQuestion {
  id: string;
  prompt: string; // HTML or plain text
  points: number; // default 100
  timeDecay: boolean; // true = Kahoot-style time-scoring; false = fixed points
  explanation?: string; // worked solution shown after question closes (Q31)
  // hint?: string        — Q30, deferred post-v1; field reserved here
}

export interface MultipleChoiceSingleQuestion extends BaseQuestion {
  kind: "mc-single";
  options: string[];
  correctIndex: number;
}

export interface MultipleChoiceMultiQuestion extends BaseQuestion {
  kind: "mc-multi";
  options: string[];
  correctIndices: number[];
}

export interface ShortTextQuestion extends BaseQuestion {
  kind: "short-text";
  correctAnswers: string[]; // multiple acceptable answers
}

export interface NumericQuestion extends BaseQuestion {
  kind: "numeric";
  /**
   * Stored as a string so teachers can author either a pure number ("3.14")
   * or a symbolic expression with parameters ("2a", "g*sin(theta)"). The M3
   * grader picks the strategy: if both sides parse as pure numbers, apply
   * `tolerance`; otherwise compare symbolically with mathjs.
   */
  correctValue: string;
  tolerance: number; // absolute tolerance — only used when correctValue is pure-numeric
  checkUnit: boolean; // Q23: check value OR unit, not both simultaneously
  unit?: string; // expected unit string when checkUnit is true
}

export interface TrueFalseQuestion extends BaseQuestion {
  kind: "true-false";
  correctAnswer: boolean;
}

export type QuizQuestion =
  | MultipleChoiceSingleQuestion
  | MultipleChoiceMultiQuestion
  | ShortTextQuestion
  | NumericQuestion
  | TrueFalseQuestion;
