import { SelectedObjectProps } from '../../types/canvasReport';
import { CanvasEditorHandle } from './CanvasEditor';

interface Props {
  selected: SelectedObjectProps | null;
  editorRef: React.RefObject<CanvasEditorHandle | null>;
}

const FONT_FAMILIES = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact'];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72];

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{children}</span>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="px-3 py-2 border-b border-gray-100">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{title}</p>
    <div className="space-y-2">{children}</div>
  </div>
);

const ColorInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) => (
  <div className="flex items-center justify-between">
    <Label>{label}</Label>
    <label className="flex items-center gap-1.5 cursor-pointer">
      <span
        className="w-6 h-6 rounded border border-gray-300"
        style={{ backgroundColor: value || '#000000' }}
      />
      <span className="text-xs text-gray-600 font-mono">{value || 'none'}</span>
      <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="sr-only" />
    </label>
  </div>
);

const NumberInput = ({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) => (
  <div className="flex items-center justify-between gap-2">
    <Label>{label}</Label>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-20 text-xs px-2 py-1 border border-gray-200 rounded-md text-right focus:outline-none focus:ring-1 focus:ring-primary-400"
    />
  </div>
);

export default function PropertiesPanel({ selected, editorRef }: Props) {
  const set = (key: string, value: any) => editorRef.current?.updateSelectedProp(key, value);

  const isText = selected && (selected.type === 'i-text' || selected.type === 'textbox');
  const isShape = selected && (selected.type === 'rect' || selected.type === 'circle');

  if (!selected) {
    return (
      <div className="w-52 bg-white border-l border-gray-200 flex flex-col h-full">
        <div className="p-3 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Properties</p>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-gray-400 text-center">Select an element to edit its properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-52 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
      <div className="p-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Properties</p>
        <p className="text-xs text-gray-500 capitalize mt-0.5">{selected.type}</p>
      </div>

      {/* Position & Size */}
      <Section title="Position">
        <NumberInput label="X" value={selected.left ?? 0} onChange={(v) => set('left', v)} />
        <NumberInput label="Y" value={selected.top ?? 0} onChange={(v) => set('top', v)} />
        <NumberInput label="W" value={selected.width ?? 0} min={1} onChange={(v) => set('width', v)} />
        <NumberInput label="H" value={selected.height ?? 0} min={1} onChange={(v) => set('height', v)} />
      </Section>

      {/* Appearance */}
      <Section title="Appearance">
        {isShape && (
          <ColorInput
            label="Fill"
            value={selected.fill ?? '#ffffff'}
            onChange={(v) => set('fill', v)}
          />
        )}
        <ColorInput
          label="Stroke"
          value={selected.stroke ?? ''}
          onChange={(v) => set('stroke', v)}
        />
        <NumberInput
          label="Stroke W"
          value={selected.strokeWidth ?? 0}
          min={0}
          max={20}
          onChange={(v) => set('strokeWidth', v)}
        />
        <NumberInput
          label="Opacity"
          value={Math.round((selected.opacity ?? 1) * 100)}
          min={0}
          max={100}
          onChange={(v) => set('opacity', v / 100)}
        />
        {selected.type === 'rect' && (
          <NumberInput
            label="Radius"
            value={selected.rx ?? 0}
            min={0}
            max={100}
            onChange={(v) => { set('rx', v); set('ry', v); }}
          />
        )}
      </Section>

      {/* Text properties */}
      {isText && (
        <Section title="Text">
          <ColorInput
            label="Color"
            value={selected.fill ?? '#000000'}
            onChange={(v) => set('fill', v)}
          />

          <div className="flex items-center justify-between gap-2">
            <Label>Size</Label>
            <select
              value={selected.fontSize ?? 18}
              onChange={(e) => set('fontSize', Number(e.target.value))}
              className="w-20 text-xs px-1.5 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Font</Label>
            <select
              value={selected.fontFamily ?? 'Arial'}
              onChange={(e) => set('fontFamily', e.target.value)}
              className="mt-1 w-full text-xs px-1.5 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-400"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            {/* Bold */}
            <button
              onClick={() => set('fontWeight', selected.fontWeight === 'bold' ? 'normal' : 'bold')}
              className={`flex-1 py-1 rounded text-xs font-bold border transition-colors ${selected.fontWeight === 'bold' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >B</button>
            {/* Italic */}
            <button
              onClick={() => set('fontStyle', selected.fontStyle === 'italic' ? 'normal' : 'italic')}
              className={`flex-1 py-1 rounded text-xs italic border transition-colors ${selected.fontStyle === 'italic' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >I</button>
            {/* Underline */}
            <button
              onClick={() => set('underline', !selected.underline)}
              className={`flex-1 py-1 rounded text-xs underline border transition-colors ${selected.underline ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >U</button>
          </div>

          <div className="flex items-center gap-1">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => set('textAlign', align)}
                title={`Align ${align}`}
                className={`flex-1 py-1 rounded border transition-colors ${selected.textAlign === align ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                <svg className="w-3.5 h-3.5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h10M4 14h16M4 18h10" />}
                  {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 10h10M4 14h16M7 18h10" />}
                  {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 10h10M4 14h16M10 18h10" />}
                </svg>
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
