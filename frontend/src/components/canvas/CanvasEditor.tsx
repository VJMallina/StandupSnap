import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import * as fabric from 'fabric';
import { SlideData, SelectedObjectProps } from '../../types/canvasReport';

export interface CanvasEditorHandle {
  addText: () => void;
  addHeading: () => void;
  addRect: () => void;
  addCircle: () => void;
  addLine: () => void;
  addImageFromFile: (file: File) => void;
  deleteSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  duplicateSelected: () => void;
  selectAll: () => void;
  nudge: (dx: number, dy: number) => void;
  setSnap: (enabled: boolean) => void;
  serializeSlide: () => Record<string, any>;
  undo: () => void;
  redo: () => void;
  setBackground: (color: string) => void;
  updateSelectedProp: (key: string, value: any) => void;
}

interface Props {
  slide: SlideData | null;
  onSlideChange: (fabricJson: Record<string, any>, thumbnail: string) => void;
  onSelectionChange: (props: SelectedObjectProps | null) => void;
}

const CANVAS_W = 960;
const CANVAS_H = 540;
const HISTORY_LIMIT = 50;

function extractProps(obj: fabric.FabricObject): SelectedObjectProps {
  const rawFill = obj.fill as unknown;
  const rawStroke = obj.stroke as unknown;
  const base: SelectedObjectProps = {
    type: obj.type ?? 'object',
    fill: typeof rawFill === 'string' ? rawFill : '#000000',
    stroke: typeof rawStroke === 'string' ? rawStroke : '',
    strokeWidth: obj.strokeWidth ?? 0,
    opacity: obj.opacity ?? 1,
    left: Math.round(obj.left ?? 0),
    top: Math.round(obj.top ?? 0),
    width: Math.round((obj.width ?? 0) * (obj.scaleX ?? 1)),
    height: Math.round((obj.height ?? 0) * (obj.scaleY ?? 1)),
  };
  if (obj instanceof fabric.IText || obj instanceof fabric.Textbox) {
    base.fontSize = obj.fontSize ?? 18;
    base.fontFamily = obj.fontFamily ?? 'Arial';
    base.fontWeight = obj.fontWeight as string ?? 'normal';
    base.fontStyle = obj.fontStyle as string ?? 'normal';
    base.underline = obj.underline ?? false;
    base.textAlign = obj.textAlign ?? 'left';
  }
  if (obj instanceof fabric.Rect) {
    base.rx = obj.rx ?? 0;
  }
  return base;
}

const CanvasEditor = forwardRef<CanvasEditorHandle, Props>(
  ({ slide, onSlideChange, onSelectionChange }, ref) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const fc = useRef<fabric.Canvas | null>(null);
    const historyUndo = useRef<string[]>([]);
    const historyRedo = useRef<string[]>([]);
    const suppressHistory = useRef(false);
    const activeSlideId = useRef<string | null>(null);
    const snapEnabled = useRef(false);
    const guideLines = useRef<{ type: 'v' | 'h'; pos: number }[]>([]);

    const snapshot = useCallback(() => {
      if (!fc.current) return;
      const json = JSON.stringify(fc.current.toJSON());
      if (historyUndo.current[historyUndo.current.length - 1] === json) return;
      historyUndo.current.push(json);
      if (historyUndo.current.length > HISTORY_LIMIT) historyUndo.current.shift();
      historyRedo.current = [];
    }, []);

    const emitChange = useCallback(() => {
      if (!fc.current) return;
      const json = fc.current.toJSON();
      const thumbnail = fc.current.toDataURL({ format: 'jpeg', quality: 0.3, multiplier: 0.25 });
      onSlideChange(json, thumbnail);
    }, [onSlideChange]);

    // Initialize canvas once
    useEffect(() => {
      if (!canvasElRef.current) return;
      const canvas = new fabric.Canvas(canvasElRef.current, {
        width: CANVAS_W,
        height: CANVAS_H,
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
      });
      fc.current = canvas;

      canvas.on('object:modified', () => { snapshot(); emitChange(); });
      canvas.on('object:added', () => { if (!suppressHistory.current) { snapshot(); emitChange(); } });
      canvas.on('object:removed', () => { snapshot(); emitChange(); });
      canvas.on('selection:created', (e) => onSelectionChange(extractProps(e.selected[0])));
      canvas.on('selection:updated', (e) => onSelectionChange(extractProps(e.selected[0])));
      canvas.on('selection:cleared', () => onSelectionChange(null));

      // ── Snap & alignment guides ──────────────────────────────────────────
      const SNAP_THRESHOLD = 6;

      canvas.on('object:moving', (e) => {
        guideLines.current = [];
        const obj = e.target;
        if (!obj || !snapEnabled.current) return;

        const objW = (obj.width ?? 0) * (obj.scaleX ?? 1);
        const objH = (obj.height ?? 0) * (obj.scaleY ?? 1);
        const ox = obj.left ?? 0;
        const oy = obj.top ?? 0;

        // Snap candidates: canvas edges/center + all other objects' edges/centers
        const vCands = [0, CANVAS_W / 2, CANVAS_W];
        const hCands = [0, CANVAS_H / 2, CANVAS_H];
        for (const other of canvas.getObjects()) {
          if (other === obj) continue;
          const ow = (other.width ?? 0) * (other.scaleX ?? 1);
          const oh = (other.height ?? 0) * (other.scaleY ?? 1);
          const ol = other.left ?? 0;
          const ot = other.top ?? 0;
          vCands.push(ol, ol + ow / 2, ol + ow);
          hCands.push(ot, ot + oh / 2, ot + oh);
        }

        // Moving object's snap edges (left, center, right) with their left-offsets
        const myV = [
          { edge: ox, offset: 0 },
          { edge: ox + objW / 2, offset: objW / 2 },
          { edge: ox + objW, offset: objW },
        ];
        const myH = [
          { edge: oy, offset: 0 },
          { edge: oy + objH / 2, offset: objH / 2 },
          { edge: oy + objH, offset: objH },
        ];

        let newLeft = ox;
        let newTop = oy;
        const vGuide: number[] = [];
        const hGuide: number[] = [];

        let minDX = SNAP_THRESHOLD;
        for (const cand of vCands) {
          for (const { edge, offset } of myV) {
            const d = Math.abs(edge - cand);
            if (d < minDX) { minDX = d; newLeft = cand - offset; vGuide.length = 0; vGuide.push(cand); }
          }
        }

        let minDY = SNAP_THRESHOLD;
        for (const cand of hCands) {
          for (const { edge, offset } of myH) {
            const d = Math.abs(edge - cand);
            if (d < minDY) { minDY = d; newTop = cand - offset; hGuide.length = 0; hGuide.push(cand); }
          }
        }

        guideLines.current = [
          ...vGuide.map((pos) => ({ type: 'v' as const, pos })),
          ...hGuide.map((pos) => ({ type: 'h' as const, pos })),
        ];
        obj.set({ left: newLeft, top: newTop });
      });

      // Draw guide lines on the lower canvas after each render
      canvas.on('after:render', (e: any) => {
        const lines = guideLines.current;
        if (!lines.length) return;
        const ctx: CanvasRenderingContext2D = e.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        for (const g of lines) {
          ctx.beginPath();
          if (g.type === 'v') { ctx.moveTo(g.pos, 0); ctx.lineTo(g.pos, CANVAS_H); }
          else { ctx.moveTo(0, g.pos); ctx.lineTo(CANVAS_W, g.pos); }
          ctx.stroke();
        }
        ctx.restore();
      });

      canvas.on('mouse:up', () => {
        if (guideLines.current.length) {
          guideLines.current = [];
          canvas.requestRenderAll();
        }
      });

      return () => { canvas.dispose(); fc.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load slide when it changes
    useEffect(() => {
      if (!fc.current || !slide) return;
      if (activeSlideId.current === slide.id) return;
      activeSlideId.current = slide.id;

      suppressHistory.current = true;
      historyUndo.current = [];
      historyRedo.current = [];

      if (slide.fabricJson && Object.keys(slide.fabricJson).length > 0) {
        fc.current.loadFromJSON(slide.fabricJson).then(() => {
          fc.current?.renderAll();
          suppressHistory.current = false;
          snapshot();
        });
      } else {
        fc.current.clear();
        fc.current.backgroundColor = '#ffffff';
        fc.current.renderAll();
        suppressHistory.current = false;
        snapshot();
      }
    }, [slide, snapshot]);

    useImperativeHandle(ref, () => ({
      serializeSlide: () => fc.current?.toJSON() ?? {},

      selectAll: () => {
        if (!fc.current) return;
        const objects = fc.current.getObjects();
        if (!objects.length) return;
        const sel = new fabric.ActiveSelection(objects);
        fc.current.setActiveObject(sel);
        fc.current.requestRenderAll();
      },

      nudge: (dx: number, dy: number) => {
        if (!fc.current) return;
        const obj = fc.current.getActiveObject();
        if (!obj) return;
        obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
        fc.current.requestRenderAll();
        emitChange();
      },

      setSnap: (enabled: boolean) => {
        snapEnabled.current = enabled;
        if (!enabled) {
          guideLines.current = [];
          fc.current?.requestRenderAll();
        }
      },

      addText: () => {
        if (!fc.current) return;
        const t = new fabric.IText('Double-click to edit', {
          left: 80, top: 80, fontSize: 20, fill: '#1f2937',
          fontFamily: 'Arial', width: 400,
        });
        fc.current.add(t);
        fc.current.setActiveObject(t);
        fc.current.renderAll();
      },

      addHeading: () => {
        if (!fc.current) return;
        const t = new fabric.Textbox('Slide Heading', {
          left: 60, top: 40, fontSize: 36, fontWeight: 'bold',
          fill: '#111827', width: 840, textAlign: 'left', fontFamily: 'Arial',
        });
        fc.current.add(t);
        fc.current.setActiveObject(t);
        fc.current.renderAll();
      },

      addRect: () => {
        if (!fc.current) return;
        const r = new fabric.Rect({
          left: 200, top: 160, width: 200, height: 120,
          fill: '#e0f2fe', stroke: '#0284c7', strokeWidth: 2, rx: 8,
        });
        fc.current.add(r);
        fc.current.setActiveObject(r);
        fc.current.renderAll();
      },

      addCircle: () => {
        if (!fc.current) return;
        const c = new fabric.Circle({
          left: 300, top: 180, radius: 70,
          fill: '#fef3c7', stroke: '#d97706', strokeWidth: 2,
        });
        fc.current.add(c);
        fc.current.setActiveObject(c);
        fc.current.renderAll();
      },

      addLine: () => {
        if (!fc.current) return;
        const l = new fabric.Line([80, 270, 880, 270], {
          stroke: '#6b7280', strokeWidth: 2,
        });
        fc.current.add(l);
        fc.current.setActiveObject(l);
        fc.current.renderAll();
      },

      addImageFromFile: (file: File) => {
        if (!fc.current) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          fabric.FabricImage.fromURL(dataUrl).then((img) => {
            const maxW = 400, maxH = 300;
            const scale = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1), 1);
            img.set({ left: 280, top: 120, scaleX: scale, scaleY: scale });
            fc.current?.add(img);
            fc.current?.setActiveObject(img);
            fc.current?.renderAll();
          });
        };
        reader.readAsDataURL(file);
      },

      deleteSelected: () => {
        if (!fc.current) return;
        const active = fc.current.getActiveObjects();
        active.forEach((o) => fc.current!.remove(o));
        fc.current.discardActiveObject();
        fc.current.renderAll();
      },

      bringForward: () => {
        const obj = fc.current?.getActiveObject();
        if (obj) { fc.current!.bringObjectForward(obj); fc.current!.renderAll(); emitChange(); }
      },

      sendBackward: () => {
        const obj = fc.current?.getActiveObject();
        if (obj) { fc.current!.sendObjectBackwards(obj); fc.current!.renderAll(); emitChange(); }
      },

      duplicateSelected: () => {
        if (!fc.current) return;
        const obj = fc.current.getActiveObject();
        if (!obj) return;
        obj.clone().then((clone: fabric.FabricObject) => {
          clone.set({ left: (clone.left ?? 0) + 20, top: (clone.top ?? 0) + 20 });
          fc.current!.add(clone);
          fc.current!.setActiveObject(clone);
          fc.current!.renderAll();
        });
      },

      undo: () => {
        if (!fc.current || historyUndo.current.length < 2) return;
        const current = historyUndo.current.pop()!;
        historyRedo.current.push(current);
        const prev = historyUndo.current[historyUndo.current.length - 1];
        suppressHistory.current = true;
        fc.current.loadFromJSON(JSON.parse(prev)).then(() => {
          fc.current?.renderAll();
          suppressHistory.current = false;
          emitChange();
        });
      },

      redo: () => {
        if (!fc.current || historyRedo.current.length === 0) return;
        const next = historyRedo.current.pop()!;
        historyUndo.current.push(next);
        suppressHistory.current = true;
        fc.current.loadFromJSON(JSON.parse(next)).then(() => {
          fc.current?.renderAll();
          suppressHistory.current = false;
          emitChange();
        });
      },

      setBackground: (color: string) => {
        if (!fc.current) return;
        fc.current.backgroundColor = color;
        fc.current.renderAll();
        emitChange();
      },

      updateSelectedProp: (key: string, value: any) => {
        if (!fc.current) return;
        const obj = fc.current.getActiveObject();
        if (!obj) return;
        obj.set(key as keyof fabric.FabricObject, value);
        fc.current.renderAll();
        emitChange();
        onSelectionChange(extractProps(obj));
      },
    }));

    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-200">
        <div
          className="shadow-2xl"
          style={{ width: CANVAS_W, height: CANVAS_H }}
        >
          <canvas ref={canvasElRef} />
        </div>
      </div>
    );
  },
);

CanvasEditor.displayName = 'CanvasEditor';
export default CanvasEditor;
