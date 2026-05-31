import { useState } from 'react';
import { SlideData } from '../../types/canvasReport';
import { v4 as uuidv4 } from 'uuid';

interface Props {
  slides: SlideData[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDuplicate: (index: number) => void;
  onDelete: (index: number) => void;
  onReorder: (slides: SlideData[]) => void;
}

export default function SlidePanel({
  slides,
  activeIndex,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onReorder,
}: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  };

  const closeContext = () => setContextMenu(null);

  const handleDragStart = (index: number) => setDragIndex(index);

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === targetIndex) return;
    const reordered = [...slides];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const renumbered = reordered.map((s, i) => ({ ...s, order: i }));
    onReorder(renumbered);
    setDragIndex(targetIndex);
  };

  const handleDragEnd = () => setDragIndex(null);

  return (
    <div
      className="w-48 bg-gray-50 border-r border-gray-200 flex flex-col h-full overflow-hidden"
      onClick={closeContext}
    >
      <div className="p-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Slides</span>
        <span className="text-xs text-gray-400">{slides.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-1.5 px-2">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(index)}
            onContextMenu={(e) => handleContextMenu(e, index)}
            className={`
              relative rounded-lg border-2 cursor-pointer group transition-all select-none
              ${activeIndex === index
                ? 'border-primary-500 shadow-md'
                : 'border-gray-200 hover:border-gray-300'}
              ${dragIndex === index ? 'opacity-50' : ''}
            `}
          >
            {/* Slide number badge */}
            <div className="absolute top-1 left-1 z-10 bg-black bg-opacity-50 text-white text-xs px-1.5 py-0.5 rounded font-medium">
              {index + 1}
            </div>

            {/* Thumbnail */}
            <div
              className="w-full rounded-md overflow-hidden"
              style={{ aspectRatio: '16/9', background: '#fff' }}
            >
              {slide.thumbnail ? (
                <img
                  src={slide.thumbnail}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white">
                  <span className="text-gray-300 text-xs">Empty</span>
                </div>
              )}
            </div>

            {/* Drag handle hint */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5h2v2H8V5zm0 4h2v2H8V9zm0 4h2v2H8v-2zm6-8h2v2h-2V5zm0 4h2v2h-2V9zm0 4h2v2h-2v-2z" />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Add slide button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Slide
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onDuplicate(contextMenu.index); closeContext(); }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Duplicate
          </button>
          <button
            onClick={() => { onDelete(contextMenu.index); closeContext(); }}
            disabled={slides.length <= 1}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function createBlankSlide(order: number): SlideData {
  return { id: uuidv4(), order, fabricJson: {}, thumbnail: undefined };
}
