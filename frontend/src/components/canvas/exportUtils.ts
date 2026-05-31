import * as fabric from 'fabric';
import jsPDF from 'jspdf';
import PptxGenJS from 'pptxgenjs';
import { SlideData } from '../../types/canvasReport';

const CANVAS_W = 960;
const CANVAS_H = 540;
const PX_TO_IN = 10 / CANVAS_W;  // 960px → 10 inches
const PX_TO_PT = 72 / 96;        // screen px → presentation points

function pxToIn(px: number): number {
  return px * PX_TO_IN;
}

function pxToPt(px: number): number {
  return Math.round(px * PX_TO_PT);
}

// Strip '#', return uppercase 6-char hex or null for transparent/none
function toHex(color: string | null | undefined): string | null {
  if (!color || color === 'transparent' || color === 'none' || color === '') return null;
  const stripped = color.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(stripped)) return stripped.toUpperCase();
  // 3-char shorthand
  if (/^[0-9a-fA-F]{3}$/.test(stripped)) {
    return stripped.split('').map((c) => c + c).join('').toUpperCase();
  }
  return null;
}

// Fabric opacity (0–1) → pptxgenjs transparency (0–100)
function opacityToTransparency(opacity: number | undefined): number {
  return Math.round((1 - (opacity ?? 1)) * 100);
}

/**
 * Renders a Fabric.js slide JSON to a PNG data URL using an off-screen StaticCanvas.
 * multiplier=2 gives a 1920×1080 output for crisp PDF/PPTX embeds.
 */
export async function renderSlideOffscreen(
  fabricJson: Record<string, any>,
  multiplier = 2,
): Promise<string> {
  const el = document.createElement('canvas');
  const offscreen = new fabric.StaticCanvas(el, {
    width: CANVAS_W,
    height: CANVAS_H,
    enableRetinaScaling: false,
  });

  if (fabricJson && Object.keys(fabricJson).length > 0) {
    await offscreen.loadFromJSON(fabricJson);
  }
  offscreen.renderAll();

  const dataUrl = offscreen.toDataURL({ format: 'png', multiplier });
  offscreen.dispose();
  return dataUrl;
}

/**
 * Exports all slides as a PDF, rendering each slide off-screen at 2× for crisp output.
 * The active slide uses the live canvas JSON rather than the potentially-stale stored JSON.
 */
export async function exportToPdf(
  slides: SlideData[],
  activeIndex: number,
  activeFabricJson: Record<string, any>,
  reportName: string,
): Promise<void> {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CANVAS_W, CANVAS_H] });

  for (let i = 0; i < slides.length; i++) {
    if (i > 0) pdf.addPage([CANVAS_W, CANVAS_H], 'landscape');
    const fabricJson = i === activeIndex ? activeFabricJson : slides[i].fabricJson;
    const dataUrl = await renderSlideOffscreen(fabricJson, 2);
    pdf.addImage(dataUrl, 'PNG', 0, 0, CANVAS_W, CANVAS_H);
  }

  pdf.save(`${reportName}.pdf`);
}

// Maps a single Fabric.js object to a native pptxgenjs shape/text/image
function addObjectToSlide(slide: any, obj: Record<string, any>): void {
  const { type, left = 0, top = 0, scaleX = 1, scaleY = 1, opacity, angle = 0 } = obj;
  const rotate = Math.round(angle);
  const transparency = opacityToTransparency(opacity);

  const fillHex = toHex(obj.fill);
  const strokeHex = toHex(obj.stroke);
  const strokeWidth: number = obj.strokeWidth ?? 0;

  const fill: any = fillHex ? { type: 'solid', color: fillHex, transparency } : { type: 'none' };
  const line: any =
    strokeHex && strokeWidth > 0 ? { color: strokeHex, width: strokeWidth } : { type: 'none' };

  if (type === 'rect') {
    const w = (obj.width ?? 0) * scaleX;
    const h = (obj.height ?? 0) * scaleY;
    slide.addShape('rect', {
      x: pxToIn(left),
      y: pxToIn(top),
      w: pxToIn(w),
      h: pxToIn(h),
      fill,
      line,
      rotate,
    });
  } else if (type === 'circle') {
    const d = (obj.radius ?? 0) * 2;
    slide.addShape('ellipse', {
      x: pxToIn(left),
      y: pxToIn(top),
      w: pxToIn(d * scaleX),
      h: pxToIn(d * scaleY),
      fill,
      line,
      rotate,
    });
  } else if (type === 'ellipse') {
    slide.addShape('ellipse', {
      x: pxToIn(left),
      y: pxToIn(top),
      w: pxToIn((obj.rx ?? 0) * 2 * scaleX),
      h: pxToIn((obj.ry ?? 0) * 2 * scaleY),
      fill,
      line,
      rotate,
    });
  } else if (type === 'line') {
    // x1/y1/x2/y2 in Fabric JSON are relative to the line's bounding-box center
    const { x1 = 0, y1 = 0, x2 = 0, y2 = 0 } = obj;
    const dxAbs = Math.abs((x2 - x1) * scaleX);
    const dyAbs = Math.abs((y2 - y1) * scaleY);
    const cx = left + dxAbs / 2;
    const cy = top + dyAbs / 2;
    const p1x = cx + x1 * scaleX;
    const p1y = cy + y1 * scaleY;
    const p2x = cx + x2 * scaleX;
    const p2y = cy + y2 * scaleY;
    slide.addShape('line', {
      x: pxToIn(Math.min(p1x, p2x)),
      y: pxToIn(Math.min(p1y, p2y)),
      w: pxToIn(Math.abs(p2x - p1x)),
      h: pxToIn(Math.abs(p2y - p1y)),
      line: strokeHex ? { color: strokeHex, width: strokeWidth } : { color: '000000', width: 1 },
    });
  } else if (type === 'i-text' || type === 'textbox') {
    const colorHex = toHex(obj.fill) ?? '000000';
    const w = Math.max(0.1, pxToIn((obj.width ?? 200) * scaleX));
    const h = Math.max(0.1, pxToIn((obj.height ?? 40) * scaleY));
    const textOpts: any = {
      x: pxToIn(left),
      y: pxToIn(top),
      w,
      h,
      fontSize: pxToPt(obj.fontSize ?? 18),
      fontFace: obj.fontFamily ?? 'Arial',
      bold: obj.fontWeight === 'bold',
      italic: obj.fontStyle === 'italic',
      color: colorHex,
      align: obj.textAlign ?? 'left',
      valign: 'top',
      wrap: true,
      rotate,
      transparency,
    };
    if (obj.underline) {
      textOpts.underline = { props: { u: 'sng' } };
    }
    slide.addText(obj.text ?? '', textOpts);
  } else if (type === 'image') {
    const src: string | undefined = obj.src ?? obj._element?.src;
    if (!src) return;
    const w = Math.max(0.01, pxToIn((obj.width ?? 100) * scaleX));
    const h = Math.max(0.01, pxToIn((obj.height ?? 100) * scaleY));
    slide.addImage({
      data: src,
      x: pxToIn(left),
      y: pxToIn(top),
      w,
      h,
      rotate,
      transparency,
    });
  }
  // groups and other types are intentionally skipped — use PDF for full fidelity
}

/**
 * Exports all slides as a PPTX using native pptxgenjs shapes.
 * Text, shapes, and images are mapped to editable PowerPoint objects.
 * The active slide uses the live canvas JSON to capture unsaved changes.
 */
export async function exportToPptx(
  slides: SlideData[],
  activeIndex: number,
  activeFabricJson: Record<string, any>,
  reportName: string,
): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  pptx.layout = 'WIDE';

  for (let i = 0; i < slides.length; i++) {
    const fabricJson = i === activeIndex ? activeFabricJson : slides[i].fabricJson;
    const s = pptx.addSlide();

    const bgHex = toHex(fabricJson?.background);
    if (bgHex) s.background = { color: bgHex };

    const objects: Record<string, any>[] = fabricJson?.objects ?? [];
    for (const obj of objects) {
      addObjectToSlide(s, obj);
    }
  }

  await pptx.writeFile({ fileName: `${reportName}.pptx` });
}
