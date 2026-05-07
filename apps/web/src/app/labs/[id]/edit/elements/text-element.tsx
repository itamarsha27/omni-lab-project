"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { TextAlign } from "@tiptap/extension-text-align";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import type { TextElement as TextElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";
import { FontSizeControl } from "./font-size-control";
import { FontFamilyControl } from "./font-family-control";

interface Props {
  element: TextElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Default font-size of a text-element box (in canvas px), used when the element
// has no `fontSize` field set. Headings (h1/h2) scale relative to this via em.
const BASE_FONT_PX = 48;

// ── Floating format toolbar (rendered via portal — outside the scaled canvas) ─
function FormatToolbarPortal({
  editor,
  anchorRef,
  element,
  onChangeFontSize,
  onChangeFontFamily,
}: {
  editor: ReturnType<typeof useEditor>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  // `element` is passed so this effect re-fires when the box moves/resizes
  // (drags don't emit scroll/resize events) — without it the toolbar lags.
  element: TextElementType;
  onChangeFontSize: (px: number) => void;
  onChangeFontFamily: (stack: string | undefined) => void;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    function update() {
      if (anchorRef.current) {
        const r = anchorRef.current.getBoundingClientRect();
        setPos({ top: r.top, left: r.left });
      }
    }
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchorRef, element.x, element.y, element.width, element.height]);

  if (!editor || !pos) return null;

  const btn = (active: boolean) =>
    `px-1.5 py-1 rounded text-xs font-medium transition-colors ${
      active ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
    }`;

  // Inline / block commands act on the user's selection (or current block) —
  // standard rich-text behavior. Only alignment is whole-box (see `all()` below):
  // alignment is per-paragraph in TipTap, but for our slide-style boxes a single
  // align setting per box matches user intent.
  const sel = () => editor.chain().focus();
  const all = () => editor.chain().focus().selectAll();

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: pos.top - 8,
        left: pos.left,
        transform: "translateY(-100%)",
        zIndex: 9999,
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white px-1.5 py-1 shadow-md">
        <FontFamilyControl
          value={element.fontFamily}
          onChange={onChangeFontFamily}
        />
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <FontSizeControl
          valuePx={element.fontSize ?? BASE_FONT_PX}
          onChange={onChangeFontSize}
          size="sm"
        />
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive("bold"))} onClick={() => sel().toggleBold().run()}>B</button>
        <button className={btn(editor.isActive("italic"))} onClick={() => sel().toggleItalic().run()}>I</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => sel().toggleHeading({ level: 1 }).run()}>H1</button>
        <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => sel().toggleHeading({ level: 2 }).run()}>H2</button>
        <button className={btn(editor.isActive("paragraph"))} onClick={() => sel().setParagraph().run()}>P</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => all().setTextAlign("left").run()} title="Align left">≡L</button>
        <button className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => all().setTextAlign("center").run()} title="Align center">≡C</button>
        <button className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => all().setTextAlign("right").run()} title="Align right">≡R</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive("bulletList"))} onClick={() => sel().toggleBulletList().run()} title="Bullet list">•—</button>
        <button className={btn(editor.isActive("orderedList"))} onClick={() => sel().toggleOrderedList().run()} title="Numbered list">1—</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <label className="flex items-center gap-0.5 text-xs text-gray-600 cursor-pointer">
          <span>A</span>
          <input
            type="color"
            className="h-4 w-4 cursor-pointer rounded border-0 p-0"
            onChange={(e) => sel().setColor(e.target.value).run()}
          />
        </label>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button
          className={btn(false)}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert table"
        >
          ⊞
        </button>
      </div>
    </div>,
    document.body
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function TextElement({
  element,
  isSelected,
  slideIndex,
  scale,
  dispatch,
  onContextMenu,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const startDrag = useElementDrag({ element, scale, slideIndex, dispatch });

  // Always-current refs for callbacks captured by useEditor (its onBlur closure
  // is created once and doesn't see prop updates). Without these, auto-grown
  // height from MOVE_ELEMENT_LIVE would be discarded when blur dispatches the
  // final UPDATE_ELEMENT with a stale `element`.
  const elementRef = useRef(element);
  elementRef.current = element;
  const slideIndexRef = useRef(slideIndex);
  slideIndexRef.current = slideIndex;

  useEffect(() => {
    if (!isSelected) setIsEditing(false);
  }, [isSelected]);

  const commitContent = useCallback(
    (html: string) => {
      const el = elementRef.current;
      if (html === el.content) return;
      dispatch({ type: "UPDATE_ELEMENT", slideIndex: slideIndexRef.current, element: { ...el, content: html } });
    },
    [dispatch]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      // Empty-line `|` placeholder is handled in pure CSS via the
      // `<br class="ProseMirror-trailingBreak">` ProseMirror inserts into every
      // empty paragraph — see globals.css. Avoids the Placeholder extension's
      // decoration timing issues in our scaled-canvas setup.
    ],
    content: element.content,
    editorProps: {
      attributes: { class: "ProseMirror outline-none h-full w-full", style: "cursor: text" },
      // Suppress ProseMirror's auto scroll-into-view on every transaction.
      // Without this, pressing Enter (or any edit that moves the cursor) makes
      // the editor try to scroll the cursor into view; combined with our scaled
      // canvas + overflow:hidden ancestors, the scroll math goes wrong and the
      // text content gets shifted out of the visible box. Returning `true`
      // tells ProseMirror "the scroll has been handled" — i.e. do nothing.
      handleScrollToSelection: () => true,
    },
    onBlur: ({ editor }) => {
      setIsEditing(false);
      commitContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !isEditing && editor.getHTML() !== element.content) {
      editor.commands.setContent(element.content, { emitUpdate: false });
    }
  }, [editor, element.content, isEditing]);

  // ── Auto-fit: track box height to content height (grows AND shrinks) ─────
  // While editing, watch ProseMirror's `scrollHeight` (true content height,
  // ignoring overflow:hidden). On every change, resize the box to fit content
  // exactly — grows when typing past the bottom, shrinks when deleting lines.
  // Uses MOVE_ELEMENT_LIVE so per-keystroke fits don't pollute history; the
  // final height lands in history on blur via commitContent (reads elementRef
  // so it sees the latest auto-fit value).
  useEffect(() => {
    if (!isEditing || !editor) return;

    function measureAndFit() {
      const proseEl = rootRef.current?.querySelector<HTMLElement>(".ProseMirror");
      if (!proseEl) return;
      // Buffer keeps the cursor's line off the overflow:hidden boundary and
      // gives the box a small visual margin below the last line.
      const BUFFER = 8;
      const target = proseEl.scrollHeight + BUFFER;
      const el = elementRef.current;
      if (target !== el.height) {
        dispatch({
          type: "MOVE_ELEMENT_LIVE",
          slideIndex: slideIndexRef.current,
          element: { ...el, height: target },
        });
      }
    }

    // Initial measure (in case existing content already differs from box height).
    const id = setTimeout(measureAndFit, 0);
    editor.on("update", measureAndFit);
    return () => {
      clearTimeout(id);
      editor.off("update", measureAndFit);
    };
  }, [isEditing, editor, dispatch]);

  function handleMouseDown(e: React.MouseEvent) {
    if (isEditing) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (!isSelected) {
      dispatch({ type: "SELECT_ELEMENT", id: element.id });
    }
    startDrag(e);
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    setIsEditing(true);
    // `scrollIntoView: false` is critical — without it, ProseMirror's focus
    // bubbles a scrollIntoView to ancestors. Combined with the canvas's CSS
    // transform + overflow:hidden, the scroll math goes wrong and shifts the
    // visible text out of the box (it appears to vanish until you resize).
    setTimeout(() => editor?.commands.focus("end", { scrollIntoView: false }), 0);
  }

  function handleChangeFontSize(px: number) {
    if (px === (element.fontSize ?? BASE_FONT_PX)) return;
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, fontSize: px },
    });
  }

  function handleChangeFontFamily(stack: string | undefined) {
    if (stack === element.fontFamily) return;
    dispatch({
      type: "UPDATE_ELEMENT",
      slideIndex,
      element: { ...element, fontFamily: stack },
    });
  }

  return (
    <div
      ref={rootRef}
      style={{
        position: "absolute",
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        zIndex: element.zIndex,
        fontSize: element.fontSize ?? BASE_FONT_PX,
        fontFamily: element.fontFamily ?? "var(--font-sans)",
        cursor: isEditing ? "text" : "move",
        userSelect: isEditing ? "text" : "none",
        overflow: "hidden",
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={onContextMenu}
    >
      {isEditing ? (
        <EditorContent editor={editor} style={{ width: "100%", height: "100%" }} />
      ) : (
        <div
          className="tiptap-content"
          style={{ pointerEvents: "none" }}
          dangerouslySetInnerHTML={{ __html: element.content }}
        />
      )}

      {isSelected && isEditing && editor && (
        <FormatToolbarPortal
          editor={editor}
          anchorRef={rootRef}
          element={element}
          onChangeFontSize={handleChangeFontSize}
          onChangeFontFamily={handleChangeFontFamily}
        />
      )}
    </div>
  );
}
