"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useMemo, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// Request for the host editor (text-element) to open the equation popup,
// either to edit the existing inline equation or to confirm a new one.
export interface InlineEquationEditRequest {
  /** Position of the node inside the TipTap document. Use this with
   *  `editor.commands.updateInlineEquation(pos, ...)` after commit. */
  pos: number;
  latex: string;
  /** Explicit font-size in canvas-px, if set. Undefined = inherit from the
   *  surrounding text-element's font-size. */
  fontSize?: number;
  /** Live screen rect of the inline equation span — used to anchor the popup. */
  anchorRect: DOMRect;
}

export interface InlineEquationOptions {
  /** Fires when the user clicks an inline equation. The host opens the
   *  equation popup pre-filled with the current latex. */
  onEditRequest?: (req: InlineEquationEditRequest) => void;
}

interface InlineEquationAttrs {
  latex?: string;
  /** Explicit override of the inherited font-size, in canvas-px. */
  fontSize?: number | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    inlineEquation: {
      setInlineEquation: (attributes: InlineEquationAttrs) => ReturnType;
      updateInlineEquation: (pos: number, attributes: InlineEquationAttrs) => ReturnType;
    };
  }
}

export const InlineEquation = Node.create<InlineEquationOptions>({
  name: "inlineEquation",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return {
      onEditRequest: undefined,
    };
  },

  addAttributes() {
    return {
      latex: { default: "" },
      // null (not undefined) so TipTap/ProseMirror serializes the absence
      // explicitly; we treat null the same as "inherit from surroundings".
      fontSize: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-equation"]',
        getAttrs: (el) => {
          const raw = (el as HTMLElement).getAttribute("data-fontsize");
          const parsed = raw == null ? null : Number(raw);
          return {
            latex: (el as HTMLElement).getAttribute("data-latex") ?? "",
            fontSize: parsed != null && Number.isFinite(parsed) ? parsed : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // Serialized form for view mode: <span data-type="inline-equation"
    // data-latex="..." [data-fontsize="..."]> with the rendered KaTeX HTML
    // as inner content. KaTeX is embedded so view-mode (dangerouslySetInnerHTML
    // of the saved string) displays the equation without re-rendering. parseHTML
    // ignores inner content on round-trip — it rebuilds from data-latex.
    const latex = (node.attrs.latex as string) ?? "";
    const fontSize = node.attrs.fontSize as number | null;
    const span = document.createElement("span");
    const baseAttrs: Record<string, string> = {
      "data-type": "inline-equation",
      "data-latex": latex,
      class: "inline-equation",
    };
    if (fontSize != null) {
      baseAttrs["data-fontsize"] = String(fontSize);
      baseAttrs["style"] = `font-size: ${fontSize}px`;
    }
    const attrs = mergeAttributes(HTMLAttributes, baseAttrs);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v != null) span.setAttribute(k, String(v));
    });
    span.innerHTML = katex.renderToString(latex || "\\,", {
      throwOnError: false,
      displayMode: false,
    });
    return span;
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineEquationView);
  },

  addCommands() {
    return {
      setInlineEquation:
        (attributes) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: attributes,
          }),
      updateInlineEquation:
        (pos, attributes) =>
        ({ tr, dispatch }) => {
          const node = tr.doc.nodeAt(pos);
          if (!node || node.type.name !== this.name) return false;
          if (dispatch) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attributes });
          }
          return true;
        },
    };
  },
});

function InlineEquationView({ node, getPos, editor, selected }: NodeViewProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const latex = (node.attrs.latex as string) ?? "";
  const fontSize = node.attrs.fontSize as number | null;

  const html = useMemo(
    () =>
      katex.renderToString(latex || "\\,", {
        throwOnError: false,
        displayMode: false,
      }),
    [latex],
  );

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // getPos can return undefined if the node was unmounted mid-event; bail
    // rather than dispatch with a meaningless position.
    const pos = getPos?.();
    if (typeof pos !== "number") return;
    // Reach the extension's live options (set via .configure({ onEditRequest })).
    const ext = editor.extensionManager.extensions.find(
      (x) => x.name === "inlineEquation",
    );
    const opts = ext?.options as InlineEquationOptions | undefined;
    opts?.onEditRequest?.({
      pos,
      latex,
      fontSize: fontSize ?? undefined,
      anchorRect: rect,
    });
  }

  return (
    <NodeViewWrapper
      as="span"
      ref={ref}
      className="inline-equation"
      onClick={handleClick}
      contentEditable={false}
      data-selected={selected ? "true" : undefined}
      style={{
        display: "inline-block",
        cursor: "pointer",
        padding: "0 2px",
        margin: "0 1px",
        borderRadius: 3,
        verticalAlign: "middle",
        // Explicit fontSize overrides the inherited size from the paragraph;
        // when null, KaTeX inherits via em-based sizing (default behavior).
        fontSize: fontSize != null ? `${fontSize}px` : undefined,
        backgroundColor: selected ? "rgba(99, 102, 241, 0.15)" : "transparent",
        outline: selected ? "1px solid rgba(99, 102, 241, 0.6)" : "none",
      }}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
    </NodeViewWrapper>
  );
}
