import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import AppLayout from '../components/AppLayout';
import CanvasEditor, { CanvasEditorHandle } from '../components/canvas/CanvasEditor';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import SlidePanel, { createBlankSlide } from '../components/canvas/SlidePanel';
import PropertiesPanel from '../components/canvas/PropertiesPanel';
import { canvasReportsApi } from '../services/api/canvasReports';
import { CanvasReport, SlideData, SelectedObjectProps } from '../types/canvasReport';
import { exportToPdf, exportToPptx } from '../components/canvas/exportUtils';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';

export default function ReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editorRef = useRef<CanvasEditorHandle>(null);

  const [report, setReport] = useState<CanvasReport | null>(null);
  const [slides, setSlides] = useState<SlideData[]>([createBlankSlide(0)]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selected, setSelected] = useState<SelectedObjectProps | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [reportName, setReportName] = useState('Untitled Report');
  const [editingName, setEditingName] = useState(false);
  const [bgColor, setBgColor] = useState('#ffffff');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [canUndo] = useState(false);
  const [canRedo] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load or create report
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        if (id === 'new') {
          const projectId = searchParams.get('projectId') ?? '';
          const name = searchParams.get('name') ?? 'Untitled Report';
          const reportType = (searchParams.get('type') as any) ?? 'custom';
          const initialSlide = createBlankSlide(0);
          const created = await canvasReportsApi.create({
            name,
            projectId,
            reportType,
            slides: [initialSlide],
          });
          setReport(created);
          setSlides(created.slides.length ? created.slides : [initialSlide]);
          setReportName(created.name);
          navigate(`/reports/editor/${created.id}`, { replace: true });
        } else if (id) {
          const loaded = await canvasReportsApi.get(id);
          setReport(loaded);
          const loadedSlides = loaded.slides.length ? loaded.slides : [createBlankSlide(0)];
          setSlides(loadedSlides);
          setReportName(loaded.name);
        }
      } catch (e: any) {
        setError(e.message ?? 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleToggleSnap = () => {
    setSnapEnabled((prev) => {
      editorRef.current?.setSnap(!prev);
      return !prev;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); editorRef.current?.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); editorRef.current?.redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); editorRef.current?.selectAll(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); editorRef.current?.duplicateSelected(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (!editingName) editorRef.current?.deleteSelected(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        editorRef.current?.nudge(dx, dy);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingName, slides, activeIndex]);

  const triggerAutoSave = useCallback(() => {
    setSaveState('unsaved');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => handleSave(), 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSlideChange = useCallback(
    (fabricJson: Record<string, any>, thumbnail: string) => {
      setSlides((prev) => {
        const updated = [...prev];
        updated[activeIndex] = { ...updated[activeIndex], fabricJson, thumbnail };
        return updated;
      });
      triggerAutoSave();
    },
    [activeIndex, triggerAutoSave],
  );

  const handleSave = async () => {
    if (!report?.id && id === 'new') return;
    const reportId = report?.id ?? id!;
    setSaveState('saving');
    try {
      const current = editorRef.current?.serializeSlide() ?? {};
      const thumbnail = '';
      const finalSlides = slides.map((s, i) =>
        i === activeIndex ? { ...s, fabricJson: current, thumbnail } : s,
      );
      await canvasReportsApi.update(reportId, {
        name: reportName,
        slides: finalSlides,
      });
      setSlides(finalSlides);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  };

  const handleAddSlide = () => {
    const newSlide = createBlankSlide(slides.length);
    const updated = [...slides, newSlide];
    setSlides(updated);
    setActiveIndex(updated.length - 1);
    triggerAutoSave();
  };

  const handleDuplicateSlide = (index: number) => {
    const original = slides[index];
    const copy: SlideData = { ...original, id: uuidv4(), order: slides.length };
    const updated = [...slides];
    updated.splice(index + 1, 0, copy);
    const renumbered = updated.map((s, i) => ({ ...s, order: i }));
    setSlides(renumbered);
    setActiveIndex(index + 1);
    triggerAutoSave();
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }));
    setSlides(updated);
    setActiveIndex(Math.min(index, updated.length - 1));
    triggerAutoSave();
  };

  const handleBgChange = (color: string) => {
    setBgColor(color);
    editorRef.current?.setBackground(color);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const activeFabricJson = editorRef.current?.serializeSlide() ?? slides[activeIndex].fabricJson;
      await exportToPdf(slides, activeIndex, activeFabricJson, reportName);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPPTX = async () => {
    setExporting(true);
    try {
      const activeFabricJson = editorRef.current?.serializeSlide() ?? slides[activeIndex].fabricJson;
      await exportToPptx(slides, activeIndex, activeFabricJson, reportName);
    } finally {
      setExporting(false);
    }
  };

  const SaveBadge = () => {
    const configs = {
      saved: { color: 'text-emerald-600', label: 'Saved' },
      unsaved: { color: 'text-amber-600', label: 'Unsaved changes' },
      saving: { color: 'text-gray-500', label: 'Saving…' },
      error: { color: 'text-red-600', label: 'Save failed' },
    };
    const { color, label } = configs[saveState];
    return <span className={`text-xs font-medium ${color}`}>{label}</span>;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Back */}
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Reports
          </button>

          <div className="w-px h-5 bg-gray-200" />

          {/* Report name */}
          {editingName ? (
            <input
              autoFocus
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              onBlur={() => { setEditingName(false); triggerAutoSave(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { setEditingName(false); triggerAutoSave(); } }}
              className="text-sm font-semibold text-gray-800 border-b-2 border-primary-400 bg-transparent outline-none px-1"
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-semibold text-gray-800 hover:text-primary-600 transition-colors flex items-center gap-1"
              title="Click to rename"
            >
              {reportName}
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          <SaveBadge />

          <div className="flex-1" />

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          {/* Export dropdown */}
          <div className="relative group">
            <button
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {exporting ? 'Exporting…' : 'Export'}
              {!exporting && (
                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            {!exporting && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 hidden group-hover:block">
                <button onClick={handleExportPDF} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="text-red-500 font-bold text-xs">PDF</span> Export as PDF
                </button>
                <button onClick={handleExportPPTX} className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <span className="text-orange-500 font-bold text-xs">PPT</span> Export as PPTX
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <CanvasToolbar
          editorRef={editorRef}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={() => editorRef.current?.undo()}
          onRedo={() => editorRef.current?.redo()}
          bgColor={bgColor}
          onBgColorChange={handleBgChange}
          snapEnabled={snapEnabled}
          onToggleSnap={handleToggleSnap}
        />

        {/* Main editor area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Slide panel */}
          <SlidePanel
            slides={slides}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
            onAdd={handleAddSlide}
            onDuplicate={handleDuplicateSlide}
            onDelete={handleDeleteSlide}
            onReorder={setSlides}
          />

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-gray-200 flex items-center justify-center p-8">
            <div
              className="shadow-2xl"
              style={{
                width: 960,
                height: 540,
                flexShrink: 0,
                transform: 'scale(var(--canvas-scale, 1))',
                transformOrigin: 'center center',
              }}
            >
              <CanvasEditor
                ref={editorRef}
                slide={slides[activeIndex] ?? null}
                onSlideChange={handleSlideChange}
                onSelectionChange={setSelected}
              />
            </div>
          </div>

          {/* Properties panel */}
          <PropertiesPanel selected={selected} editorRef={editorRef} />
        </div>

        {/* Slide counter footer */}
        <div className="flex items-center justify-center py-1.5 bg-white border-t border-gray-200 text-xs text-gray-400 flex-shrink-0">
          Slide {activeIndex + 1} of {slides.length}
        </div>
      </div>
    </AppLayout>
  );
}
