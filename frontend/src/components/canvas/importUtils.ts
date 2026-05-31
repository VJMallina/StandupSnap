import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';
import { SlideData } from '../../types/canvasReport';

const CANVAS_W = 960;
const CANVAS_H = 540;
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// ── XML helpers ───────────────────────────────────────────────────────────────

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'text/xml');
}

// First descendant element with the given local name (depth-first)
function find(root: Element | Document, name: string): Element | null {
  const start: Element =
    root.nodeType === 9 ? (root as Document).documentElement! : (root as Element);
  const stack: Element[] = [start];
  while (stack.length) {
    const el = stack.pop()!;
    if (el.localName === name) return el;
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const n = el.childNodes[i];
      if (n.nodeType === 1) stack.push(n as Element);
    }
  }
  return null;
}

// All descendant elements with the given local name
function findAll(root: Element | Document, name: string): Element[] {
  const result: Element[] = [];
  const start: Element =
    root.nodeType === 9 ? (root as Document).documentElement! : (root as Element);
  const stack: Element[] = [start];
  while (stack.length) {
    const el = stack.pop()!;
    if (el.localName === name) result.push(el);
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const n = el.childNodes[i];
      if (n.nodeType === 1) stack.push(n as Element);
    }
  }
  return result;
}

// Direct child element with the given local name
function directChild(el: Element, name: string): Element | null {
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i];
    if (n.nodeType === 1 && (n as Element).localName === name) return n as Element;
  }
  return null;
}

// ── Color ─────────────────────────────────────────────────────────────────────

// Parse a <a:solidFill> element → '#RRGGBB' or null
function parseSolidFill(el: Element | null): string | null {
  if (!el) return null;
  for (let i = 0; i < el.childNodes.length; i++) {
    const n = el.childNodes[i];
    if (n.nodeType !== 1) continue;
    const c = n as Element;
    if (c.localName === 'srgbClr') {
      const v = c.getAttribute('val');
      return v ? '#' + v : null;
    }
    if (c.localName === 'sysClr') {
      const last = c.getAttribute('lastClr');
      return last ? '#' + last : '#000000';
    }
    if (c.localName === 'prstClr') return '#808080';
    // schemeClr = theme color; skip (would need theme.xml resolution)
  }
  return null;
}

// ── Shape property helpers ────────────────────────────────────────────────────

// Get fill color by inspecting direct children of <p:spPr>
function getFill(spPr: Element): string | null {
  for (let i = 0; i < spPr.childNodes.length; i++) {
    const n = spPr.childNodes[i];
    if (n.nodeType !== 1) continue;
    const el = n as Element;
    if (el.localName === 'solidFill') return parseSolidFill(el);
    if (el.localName === 'noFill') return 'transparent';
    if (el.localName === 'gradFill') return '#808080'; // gradient fallback
  }
  return null;
}

// Get stroke from <a:ln> direct child of <p:spPr>
function getStroke(spPr: Element): { color: string | null; width: number } {
  for (let i = 0; i < spPr.childNodes.length; i++) {
    const n = spPr.childNodes[i];
    if (n.nodeType !== 1) continue;
    const ln = n as Element;
    if (ln.localName !== 'ln') continue;

    if (directChild(ln, 'noFill')) return { color: null, width: 0 };

    const solidFill = find(ln, 'solidFill');
    const color = parseSolidFill(solidFill);
    const wAttr = ln.getAttribute('w');
    // PPTX line width in EMU: 1 pt = 12700 EMU → px at 96dpi
    const px = wAttr ? Math.max(1, Math.round((parseInt(wAttr) / 12700) * (96 / 72))) : 1;
    return { color: color ?? '#000000', width: px };
  }
  return { color: null, width: 0 };
}

// Parse <a:xfrm> inside <p:spPr> → canvas px position/size + rotation
function parseXfrm(
  spPr: Element,
  slideCx: number,
  slideCy: number,
): { left: number; top: number; width: number; height: number; angle: number; flipH: boolean; flipV: boolean } | null {
  const xfrm = find(spPr, 'xfrm');
  if (!xfrm) return null;
  const off = find(xfrm, 'off');
  const ext = find(xfrm, 'ext');
  if (!off || !ext) return null;

  const x = parseInt(off.getAttribute('x') ?? '0');
  const y = parseInt(off.getAttribute('y') ?? '0');
  const cx = parseInt(ext.getAttribute('cx') ?? '0');
  const cy = parseInt(ext.getAttribute('cy') ?? '0');
  const rot = parseInt(xfrm.getAttribute('rot') ?? '0');

  return {
    left: Math.round((x / slideCx) * CANVAS_W),
    top: Math.round((y / slideCy) * CANVAS_H),
    width: Math.round((cx / slideCx) * CANVAS_W),
    height: Math.round((cy / slideCy) * CANVAS_H),
    angle: rot / 60000, // 1/60000 degree → degrees
    flipH: xfrm.getAttribute('flipH') === '1',
    flipV: xfrm.getAttribute('flipV') === '1',
  };
}

// ── Text parsing ──────────────────────────────────────────────────────────────

interface TextData {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  textColor: string;
  textAlign: string;
}

function parseTextBody(txBody: Element): TextData | null {
  const paras = findAll(txBody, 'p');
  if (!paras.length) return null;

  let fontSize = 18;
  let fontFamily = 'Arial';
  let fontWeight = 'normal';
  let fontStyle = 'normal';
  let textColor = '#000000';
  let textAlign = 'left';
  let gotFmt = false;
  const lines: string[] = [];

  for (const para of paras) {
    const pPr = directChild(para, 'pPr');
    if (pPr && !gotFmt) {
      const algn = pPr.getAttribute('algn');
      if (algn) textAlign = algn === 'ctr' ? 'center' : algn === 'r' ? 'right' : 'left';
    }

    const parts: string[] = [];
    for (let i = 0; i < para.childNodes.length; i++) {
      const n = para.childNodes[i];
      if (n.nodeType !== 1) continue;
      const el = n as Element;

      if (el.localName === 'r') {
        const tEl = find(el, 't');
        if (tEl?.textContent) parts.push(tEl.textContent);

        if (!gotFmt) {
          const rPr = find(el, 'rPr');
          if (rPr) {
            const sz = rPr.getAttribute('sz');
            // sz is in hundredths of a point; convert to canvas px
            if (sz) fontSize = Math.max(10, Math.round((parseInt(sz) / 100) * (96 / 72)));
            const latin = find(rPr, 'latin');
            if (latin) fontFamily = latin.getAttribute('typeface') ?? 'Arial';
            if (rPr.getAttribute('b') === '1') fontWeight = 'bold';
            if (rPr.getAttribute('i') === '1') fontStyle = 'italic';
            const sf = find(rPr, 'solidFill');
            const c = parseSolidFill(sf);
            if (c) textColor = c;
            gotFmt = true;
          }
        }
      } else if (el.localName === 'br') {
        parts.push('\n');
      }
    }
    lines.push(parts.join(''));
  }

  const text = lines.join('\n').replace(/\n+$/, '').trim();
  if (!text) return null;

  return { text, fontSize, fontFamily, fontWeight, fontStyle, textColor, textAlign };
}

// ── Image map ─────────────────────────────────────────────────────────────────

type ImageMap = Record<string, string>; // rId → data URL

async function buildImageMap(zip: JSZip, slideRelsPath: string): Promise<ImageMap> {
  const map: ImageMap = {};
  const file = zip.file(slideRelsPath);
  if (!file) return map;

  const xml = await file.async('text');
  const doc = parseXml(xml);

  for (const rel of findAll(doc, 'Relationship')) {
    const type = rel.getAttribute('Type') ?? '';
    if (!type.includes('/image')) continue;

    const rId = rel.getAttribute('Id') ?? '';
    const target = rel.getAttribute('Target') ?? '';

    // Resolve path: target is relative to "ppt/slides/" (one level above "_rels/")
    const imagePath = target.startsWith('../')
      ? 'ppt/' + target.slice(3)
      : 'ppt/slides/' + target;

    const imgFile = zip.file(imagePath);
    if (!imgFile) continue;

    const bytes = await imgFile.async('uint8array');
    const ext = imagePath.split('.').pop()?.toLowerCase() ?? 'png';
    const mime =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
      ext === 'png' ? 'image/png' :
      ext === 'gif' ? 'image/gif' :
      ext === 'svg' ? 'image/svg+xml' :
      'image/png';

    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    map[rId] = `data:${mime};base64,${btoa(binary)}`;
  }
  return map;
}

// ── Slide content parser ──────────────────────────────────────────────────────

function parseSlideContent(
  slideDoc: Document,
  slideCx: number,
  slideCy: number,
  imageMap: ImageMap,
): { background: string; objects: any[] } {
  const objects: any[] = [];

  // Background
  let background = '#ffffff';
  const bgPr = find(slideDoc, 'bgPr');
  if (bgPr) {
    const sf = directChild(bgPr, 'solidFill') ?? find(bgPr, 'solidFill');
    const c = parseSolidFill(sf);
    if (c && c !== 'transparent') background = c;
  }

  const spTree = find(slideDoc, 'spTree');
  if (!spTree) return { background, objects };

  for (let i = 0; i < spTree.childNodes.length; i++) {
    const node = spTree.childNodes[i];
    if (node.nodeType !== 1) continue;
    const el = node as Element;

    // ── Regular shape or text box ────────────────────────────────────────────
    if (el.localName === 'sp') {
      const spPr = find(el, 'spPr');
      if (!spPr) continue;
      const dims = parseXfrm(spPr, slideCx, slideCy);
      if (!dims) continue;
      const { left, top, width, height, angle } = dims;
      if (width <= 0 || height <= 0) continue;

      const prstGeom = find(spPr, 'prstGeom');
      const prst = prstGeom?.getAttribute('prst') ?? 'rect';
      const fillColor = getFill(spPr);
      const stroke = getStroke(spPr);
      const hasFill = fillColor && fillColor !== 'transparent';
      const hasStroke = stroke.color && stroke.width > 0;

      if (hasFill || hasStroke) {
        if (prst === 'ellipse' || prst === 'oval') {
          objects.push({
            type: 'ellipse',
            left, top,
            rx: width / 2, ry: height / 2,
            fill: fillColor ?? 'transparent',
            stroke: stroke.color ?? '',
            strokeWidth: stroke.width,
            angle, scaleX: 1, scaleY: 1, opacity: 1,
            originX: 'left', originY: 'top',
          });
        } else {
          objects.push({
            type: 'rect',
            left, top, width, height,
            fill: fillColor ?? 'transparent',
            stroke: stroke.color ?? '',
            strokeWidth: stroke.width,
            rx: prst === 'roundRect' ? Math.round(Math.min(width, height) * 0.1) : 0,
            ry: prst === 'roundRect' ? Math.round(Math.min(width, height) * 0.1) : 0,
            angle, scaleX: 1, scaleY: 1, opacity: 1,
            originX: 'left', originY: 'top',
          });
        }
      }

      // Text overlay (separate Fabric textbox placed on top of the shape)
      const txBody = find(el, 'txBody');
      if (txBody) {
        const td = parseTextBody(txBody);
        if (td) {
          objects.push({
            type: 'textbox',
            left, top,
            width,
            height: Math.max(height, td.fontSize * 1.5),
            text: td.text,
            fontSize: td.fontSize,
            fontFamily: td.fontFamily,
            fontWeight: td.fontWeight,
            fontStyle: td.fontStyle,
            fill: td.textColor,
            textAlign: td.textAlign,
            angle, scaleX: 1, scaleY: 1, opacity: 1,
            originX: 'left', originY: 'top',
            editable: true,
          });
        }
      }

    // ── Image (p:pic) ────────────────────────────────────────────────────────
    } else if (el.localName === 'pic') {
      const spPr = find(el, 'spPr');
      if (!spPr) continue;
      const dims = parseXfrm(spPr, slideCx, slideCy);
      if (!dims) continue;
      const { left, top, width, height, angle } = dims;
      if (width <= 0 || height <= 0) continue;

      const blip = find(el, 'blip');
      if (!blip) continue;
      const rId =
        blip.getAttributeNS(R_NS, 'embed') ?? blip.getAttribute('r:embed');
      if (!rId) continue;

      const dataUrl = imageMap[rId];
      if (!dataUrl) continue;

      objects.push({
        type: 'image',
        left, top, width, height,
        scaleX: 1, scaleY: 1, angle, opacity: 1,
        src: dataUrl, crossOrigin: null, filters: [],
        originX: 'left', originY: 'top',
      });

    // ── Connector / Line (p:cxnSp) ───────────────────────────────────────────
    } else if (el.localName === 'cxnSp') {
      const spPr = find(el, 'spPr');
      if (!spPr) continue;
      const dims = parseXfrm(spPr, slideCx, slideCy);
      if (!dims) continue;
      const { left, top, width, height, angle, flipH, flipV } = dims;

      const stroke = getStroke(spPr);
      if (!stroke.color) continue;

      // Convert bounding box + flip flags → absolute endpoints
      let p1x = left, p1y = top;
      let p2x = left + width, p2y = top + height;
      if (flipH) [p1x, p2x] = [p2x, p1x];
      if (flipV) [p1y, p2y] = [p2y, p1y];

      // Fabric.js Line: left/top = bounding-box top-left; x1/y1/x2/y2 = center-relative
      const bboxLeft = Math.min(p1x, p2x);
      const bboxTop = Math.min(p1y, p2y);
      const cx = (p1x + p2x) / 2;
      const cy = (p1y + p2y) / 2;

      objects.push({
        type: 'line',
        left: bboxLeft, top: bboxTop,
        x1: p1x - cx, y1: p1y - cy,
        x2: p2x - cx, y2: p2y - cy,
        stroke: stroke.color,
        strokeWidth: stroke.width || 1,
        fill: '', angle,
        scaleX: 1, scaleY: 1, opacity: 1,
        originX: 'left', originY: 'top',
      });
    }
    // graphicFrame (charts, tables, SmartArt) and grpSp (groups) are skipped
  }

  return { background, objects };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parse a .pptx file into an array of SlideData objects ready to load into the canvas editor.
 * Handles: rectangles, ellipses, text boxes, images, and straight connectors.
 * Unsupported elements (charts, SmartArt, groups) are silently skipped.
 */
export async function importPptx(file: File): Promise<SlideData[]> {
  const buf = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buf);

  // Parse slide dimensions and ordered slide list from presentation.xml
  const presFile = zip.file('ppt/presentation.xml');
  if (!presFile) throw new Error('Invalid PPTX: missing ppt/presentation.xml');

  const presXml = await presFile.async('text');
  const presDoc = parseXml(presXml);

  const sldSz = find(presDoc, 'sldSz');
  const slideCx = parseInt(sldSz?.getAttribute('cx') ?? '9144000');
  const slideCy = parseInt(sldSz?.getAttribute('cy') ?? '5143500');

  // Build rId → file path map from presentation relationships
  const slideFiles: string[] = [];
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (presRelsFile) {
    const presRelsXml = await presRelsFile.async('text');
    const presRelsDoc = parseXml(presRelsXml);
    const relMap: Record<string, string> = {};
    for (const rel of findAll(presRelsDoc, 'Relationship')) {
      const type = rel.getAttribute('Type') ?? '';
      if (!type.endsWith('/slide')) continue;
      const rId = rel.getAttribute('Id') ?? '';
      const target = rel.getAttribute('Target') ?? '';
      relMap[rId] = 'ppt/' + target;
    }
    // Preserve slide order from sldIdLst
    for (const sldId of findAll(presDoc, 'sldId')) {
      const rId =
        sldId.getAttributeNS(R_NS, 'id') ?? sldId.getAttribute('r:id') ?? '';
      if (relMap[rId]) slideFiles.push(relMap[rId]);
    }
  }

  // Fallback: enumerate by filename
  if (!slideFiles.length) {
    Object.keys(zip.files)
      .filter((k) => /^ppt\/slides\/slide\d+\.xml$/.test(k))
      .sort((a, b) => {
        const n = (s: string) => parseInt(s.match(/slide(\d+)/)?.[1] ?? '0');
        return n(a) - n(b);
      })
      .forEach((k) => slideFiles.push(k));
  }

  // Parse each slide
  const slides: SlideData[] = [];
  for (let i = 0; i < slideFiles.length; i++) {
    const path = slideFiles[i];
    const slideFile = zip.file(path);
    if (!slideFile) continue;

    const slideXml = await slideFile.async('text');
    const slideDoc = parseXml(slideXml);

    const fileName = path.split('/').pop()!;
    const relsPath = `ppt/slides/_rels/${fileName}.rels`;
    const imageMap = await buildImageMap(zip, relsPath);

    const { background, objects } = parseSlideContent(slideDoc, slideCx, slideCy, imageMap);

    slides.push({
      id: uuidv4(),
      order: i,
      fabricJson: { version: '7.0.0', objects, background },
      thumbnail: '',
    });
  }

  return slides;
}
