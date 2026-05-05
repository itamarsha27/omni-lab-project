"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Slide } from "@omnilab/lab-content";
import { SlideThumbnail } from "./slide-thumbnail";
import type { EditorAction } from "./lab-editor";

interface SlideFilmstripProps {
  slides: Slide[];
  selectedIndex: number;
  dispatch: React.Dispatch<EditorAction>;
}

export function SlideFilmstrip({
  slides,
  selectedIndex,
  dispatch,
}: SlideFilmstripProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const fromIndex = slides.findIndex((s) => s.id === active.id);
    const toIndex = slides.findIndex((s) => s.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;

    dispatch({ type: "REORDER_SLIDES", fromIndex, toIndex });
  }

  return (
    <aside className="flex w-44 flex-col border-r border-gray-200 bg-gray-50 overflow-y-auto overflow-x-hidden shrink-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 p-2 pt-3">
            {slides.map((slide, i) => (
              <SlideThumbnail
                key={slide.id}
                slide={slide}
                index={i}
                isSelected={i === selectedIndex}
                onSelect={() =>
                  dispatch({ type: "SELECT_SLIDE", index: i })
                }
                onDuplicate={() =>
                  dispatch({ type: "DUPLICATE_SLIDE", index: i })
                }
                onDelete={() =>
                  dispatch({ type: "DELETE_SLIDE", index: i })
                }
                canDelete={slides.length > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add slide button */}
      <button
        onClick={() =>
          dispatch({ type: "ADD_SLIDE", afterIndex: selectedIndex })
        }
        className="mx-2 mb-3 mt-1 flex items-center justify-center gap-1 rounded border border-dashed border-gray-300 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-indigo-400 hover:text-indigo-500"
      >
        <span className="text-base leading-none">+</span> Add slide
      </button>
    </aside>
  );
}
