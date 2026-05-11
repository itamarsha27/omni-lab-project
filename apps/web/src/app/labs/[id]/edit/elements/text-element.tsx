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
import { Placeholder } from "@tiptap/extension-placeholder";
import type { TextElement as TextElementType } from "@omnilab/lab-content";
import type { EditorAction } from "../lab-editor";
import { useElementDrag } from "./use-element-drag";
import { FontSizeControl } from "./font-size-control";
import { FontFamilyControl } from "./font-family-control";
import { InlineEquation, type InlineEquationEditRequest } from "./inline-equation-node";
import { EquationPopup } from "./equation-popup";

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
  onInsertInlineEquation,
}: {
  editor: ReturnType<typeof useEditor>;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  // `element` is passed so this effect re-fires when the box moves/resizes
  // (drags don't emit scroll/resize events) — without it the toolbar lags.
  element: TextElementType;
  onChangeFontSize: (px: number) => void;
  onChangeFontFamily: (stack: string | undefined) => void;
  onInsertInlineEquation: () => void;
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
        <button
          className={btn(false)}
          onClick={onInsertInlineEquation}
          title="Insert inline equation"
        >
          <i>fx</i>
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
  // Inline equation popup state. `mode: "insert"` opens an empty math-field at
  // `pos` (the saved cursor position); `mode: "edit"` opens pre-filled and
  // replaces the inline equation node at `pos` on commit. anchorRect is a
  // captured rect (cursor coords for insert, span rect for edit) — fine as a
  // snapshot because the editor is inert while the popup's backdrop is up.
  // `fontSize: undefined` means "inherit from the text element"; user picking
  // an explicit size in the popup sets it to a number, which the inserted /
  // updated node persists as `data-fontsize`.
  const [eqPopup, setEqPopup] = useState<{
    mode: "insert" | "edit";
    pos: number;
    initialLatex: string;
    fontSize: number | undefined;
    anchorRect: DOMRect;
  } | null>(null);
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
  // The editor blurs as soon as the math-field popup steals focus — without
  // this guard, onBlur would tear down edit mode and unmount the editor while
  // the popup is still open. Refreshed every render so onBlur (captured once)
  // always sees the current popup state.
  const eqPopupRef = useRef(eqPopup);
  eqPopupRef.current = eqPopup;
  // Bridge for InlineEquation.configure({ onEditRequest }) — the extension
  // instance is created once in useEditor, but we want the handler to close
  // over the latest `editor` and state. Reassigned each render.
  const onInlineEditRequestRef = useRef<(req: InlineEquationEditRequest) => void>(() => {});

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
      // Adds `is-empty` class to ONLY the empty paragraph that contains the
      // cursor (showOnlyCurrent: true is the default). The `|` glyph is
      // hard-coded in CSS via `.is-empty::before` so we don't depend on the
      // extension setting the data-placeholder attribute. Result: the `|`
      // appears only on the line you're currently on.
      Placeholder.configure({
        placeholder: "",
        emptyEditorClass: "is-editor-empty",
        emptyNodeClass: "is-empty",
      }),
      InlineEquation.configure({
        onEditRequest: (req) => onInlineEditRequestRef.current(req),
      }),
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
      // Inline-equation popup steals focus from the editor; staying in edit
      // mode keeps the editor mounted so we can insert/replace into it once
      // the popup commits. Without this, the editor would unmount mid-edit
      // and the popup would dispatch into nothing.
      if (eqPopupRef.current) return;
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
      const lastChild = proseEl.lastElementChild as HTMLElement | null;
      if (!lastChild) return;
      // Can't use proseEl.scrollHeight: .ProseMirror has `height: 100%` so
      // when content fits, scrollHeight === clientHeight === wrapper height.
      // That hides shrink-room. Last child's `offsetTop + offsetHeight` gives
      // the content's true bottom in canvas-px coordinates regardless of the
      // wrapper's height.
      const BUFFER = 8;
      const target = lastChild.offsetTop + lastChild.offsetHeight + BUFFER;
      const el = elementRef.current;
      // Small tolerance prevents per-render bouncing from sub-pixel rounding.
      if (Math.abs(target - el.height) > 2) {
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

  // Open the popup empty at the current cursor position. The fx toolbar button
  // doesn't steal focus (toolbar wrapper preventDefaults mousedown), so the
  // editor's selection is intact and we use its head as the insertion point.
  function handleOpenInsertEquation() {
    if (!editor) return;
    const { from } = editor.state.selection;
    const coords = editor.view.coordsAtPos(from);
    const anchorRect = new DOMRect(
      coords.left,
      coords.top,
      0,
      coords.bottom - coords.top,
    );
    setEqPopup({
      mode: "insert",
      pos: from,
      initialLatex: "",
      fontSize: undefined,
      anchorRect,
    });
  }

  // Inline equation NodeView calls this via the configured onEditRequest.
  // Reassign every render so the latest editor/state is captured.
  onInlineEditRequestRef.current = (req) => {
    setEqPopup({
      mode: "edit",
      pos: req.pos,
      initialLatex: req.latex,
      fontSize: req.fontSize,
      anchorRect: req.anchorRect,
    });
  };

  // Font-size changes in the popup: in edit mode persist to the node live
  // (matches the standalone equation block's "live UPDATE_ELEMENT" pattern);
  // in insert mode stage the value in popup state for use on commit.
  function handlePopupFontSizeChange(px: number) {
    if (!eqPopup) return;
    setEqPopup({ ...eqPopup, fontSize: px });
    if (eqPopup.mode === "edit" && editor) {
      editor.chain().updateInlineEquation(eqPopup.pos, { fontSize: px }).run();
    }
  }

  function handlePopupCommit(latex: string) {
    if (!editor || !eqPopup) {
      setEqPopup(null);
      return;
    }
    const trimmed = latex.trim();
    if (eqPopup.mode === "insert") {
      if (trimmed) {
        // chain().focus() restores DOM focus AND restores the editor's stored
        // selection from before the popup stole focus; insertContent (no pos)
        // then inserts there, replacing any range selection.
        // fontSize is only included when the user picked one — otherwise the
        // node renders inheriting from the surrounding text.
        const attrs: { latex: string; fontSize?: number } = { latex };
        if (eqPopup.fontSize !== undefined) attrs.fontSize = eqPopup.fontSize;
        editor
          .chain()
          .focus()
          .insertContent({ type: "inlineEquation", attrs })
          .run();
      } else {
        editor.commands.focus();
      }
    } else {
      if (trimmed) {
        editor.chain().focus().updateInlineEquation(eqPopup.pos, { latex }).run();
      } else {
        // Cleared to empty — remove the node so we don't leave a stub.
        editor
          .chain()
          .focus()
          .setNodeSelection(eqPopup.pos)
          .deleteSelection()
          .run();
      }
    }
    setEqPopup(null);
  }

  function handlePopupCancel() {
    setEqPopup(null);
    editor?.commands.focus();
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
          onInsertInlineEquation={handleOpenInsertEquation}
        />
      )}

      {eqPopup && (
        <EquationPopup
          key={`${eqPopup.mode}-${eqPopup.pos}`}
          initialLatex={eqPopup.initialLatex}
          getAnchorRect={() => eqPopup.anchorRect}
          // When the node has no explicit fontSize, display the inherited
          // size from the surrounding text element (its fontSize, or the
          // text-element default if unset). Picking a value in the control
          // upgrades it to an explicit per-node fontSize.
          fontSize={eqPopup.fontSize ?? element.fontSize ?? BASE_FONT_PX}
          onFontSizeChange={handlePopupFontSizeChange}
          onCommit={handlePopupCommit}
          onCancel={handlePopupCancel}
        />
      )}
    </div>
  );
}
