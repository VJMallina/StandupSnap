import { useRef } from 'react';
import { CanvasEditorHandle } from './CanvasEditor';

interface Props {
  editorRef: React.RefObject<CanvasEditorHandle | null>;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  bgColor: string;
  onBgColorChange: (c: string) => void;
  snapEnabled: boolean;
  onToggleSnap: () => void;
}

const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

const ToolBtn = ({
  onClick,
  title,
  children,
  disabled = false,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    title={title}
    disabled={disabled}
    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
  >
    {children}
  </button>
);

export default function CanvasToolbar({
  editorRef,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  bgColor,
  onBgColorChange,
  snapEnabled,
  onToggleSnap,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-0.5 px-3 py-2 bg-white border-b border-gray-200 flex-wrap">
      {/* Undo / Redo */}
      <ToolBtn onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
        Undo
      </ToolBtn>
      <ToolBtn onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
        </svg>
        Redo
      </ToolBtn>

      <Divider />

      {/* Text tools */}
      <ToolBtn onClick={() => editorRef.current?.addHeading()} title="Add heading">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
        </svg>
        Heading
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.addText()} title="Add text box">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Text
      </ToolBtn>

      <Divider />

      {/* Shape tools */}
      <ToolBtn onClick={() => editorRef.current?.addRect()} title="Add rectangle">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} strokeLinecap="round" />
        </svg>
        Rect
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.addCircle()} title="Add circle">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth={2} />
        </svg>
        Circle
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.addLine()} title="Add divider line">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
        </svg>
        Line
      </ToolBtn>

      <Divider />

      {/* Image */}
      <ToolBtn onClick={() => fileInputRef.current?.click()} title="Insert image">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Image
      </ToolBtn>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) editorRef.current?.addImageFromFile(file);
          e.target.value = '';
        }}
      />

      <Divider />

      {/* Object actions */}
      <ToolBtn onClick={() => editorRef.current?.duplicateSelected()} title="Duplicate selected">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.bringForward()} title="Bring forward">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        Forward
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.sendBackward()} title="Send backward">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Back
      </ToolBtn>
      <ToolBtn onClick={() => editorRef.current?.deleteSelected()} title="Delete selected (Del)">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </ToolBtn>

      <Divider />

      {/* Snap toggle */}
      <button
        onClick={onToggleSnap}
        title={snapEnabled ? 'Smart snap ON — click to disable' : 'Smart snap OFF — click to enable'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
          snapEnabled
            ? 'bg-primary-50 text-primary-700 border border-primary-200'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Snap
      </button>

      <Divider />

      {/* Background color */}
      <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-sm transition-colors" title="Slide background color">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        BG
        <span
          className="w-5 h-5 rounded border border-gray-300"
          style={{ backgroundColor: bgColor }}
        />
        <input
          type="color"
          value={bgColor}
          onChange={(e) => onBgColorChange(e.target.value)}
          className="sr-only"
        />
      </label>
    </div>
  );
}
