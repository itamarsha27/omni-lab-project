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

interface Props {
  element: TextElementType;
  isSelected: boolean;
  slideIndex: number;
  scale: number;
  dispatch: React.Dispatch<EditorAction>;
  onContextMenu: (e: React.MouseEvent) => void;
}

// Base font-size of a text-element box (in canvas px). Set on the outer wrapper
// so view-mode and edit-mode inherit the same starting size — without this the
// edit-mode <p> falls back to browser default 16px and the text "shrinks".
const BASE_FONT_PX = 48;

// ── Floating format toolbar (rendered via portal — outside the scaled canvas) ─
function FormatToolbarPortal({
  editor,
  anchorRef,
}: {
  editor: ReturnType<typeof useEditor>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
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
  }, [anchorRef]);

  if (!editor || !pos) return null;

  const btn = (active: boolean) =>
    `px-1.5 py-1 rounded text-xs font-medium transition-colors ${
      active ? "bg-indigo-100 text-indigo-700" : "text-gray-600 hover:bg-gray-100"
    }`;

  // Formatting commands apply to the whole text-box content (per product decision):
  // selectAll() before the command so alignment, color, headings, lists, etc. are
  // not limited to the cursor's current paragraph.
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
        <button className={btn(editor.isActive("bold"))} onClick={() => all().toggleBold().run()}>B</button>
        <button className={btn(editor.isActive("italic"))} onClick={() => all().toggleItalic().run()}>I</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => all().toggleHeading({ level: 1 }).run()}>H1</button>
        <button className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => all().toggleHeading({ level: 2 }).run()}>H2</button>
        <button className={btn(editor.isActive("paragraph"))} onClick={() => all().setParagraph().run()}>P</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive({ textAlign: "left" }))} onClick={() => all().setTextAlign("left").run()} title="Align left">≡L</button>
        <button className={btn(editor.isActive({ textAlign: "center" }))} onClick={() => all().setTextAlign("center").run()} title="Align center">≡C</button>
        <button className={btn(editor.isActive({ textAlign: "right" }))} onClick={() => all().setTextAlign("right").run()} title="Align right">≡R</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <button className={btn(editor.isActive("bulletList"))} onClick={() => all().toggleBulletList().run()} title="Bullet list">•—</button>
        <button className={btn(editor.isActive("orderedList"))} onClick={() => all().toggleOrderedList().run()} title="Numbered list">1—</button>
        <div className="mx-1 h-4 w-px bg-gray-200" />
        <label className="flex items-center gap-0.5 text-xs text-gray-600 cursor-pointer">
          <span>A</span>
          <input
            type="color"
            className="h-4 w-4 cursor-pointer rounded border-0 p-0"
            onChange={(e) => all().setColor(e.target.value).run()}
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

  useEffect(() => {
    if (!isSelected) setIsEditing(false);
  }, [isSelected]);

  const commitContent = useCallback(
    (html: string) => {
      if (html === element.content) return;
      dispatch({ type: "UPDATE_ELEMENT", slideIndex, element: { ...element, content: html } });
    },
    [dispatch, element, slideIndex]
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
    ],
    content: element.content,
    editorProps: {
      attributes: { class: "ProseMirror outline-none h-full w-full", style: "cursor: text" },
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
    setTimeout(() => editor?.commands.focus("end"), 0);
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
        fontSize: BASE_FONT_PX,
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
        <FormatToolbarPortal editor={editor} anchorRef={rootRef} />
      )}
    </div>
  );
}
