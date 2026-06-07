import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { standaloneMomApi } from '../services/api/standaloneMom';
import { StandaloneMom } from '../types/standaloneMom';

const TYPE_CONFIG: Record<string, { accent: string; badgeBg: string; badgeText: string }> = {
  'Planning':            { accent: 'border-blue-500',    badgeBg: 'bg-blue-50',    badgeText: 'text-blue-700' },
  'Grooming':            { accent: 'border-violet-500',  badgeBg: 'bg-violet-50',  badgeText: 'text-violet-700' },
  'Retrospective':       { accent: 'border-orange-500',  badgeBg: 'bg-orange-50',  badgeText: 'text-orange-700' },
  'Stakeholder Meeting': { accent: 'border-emerald-500', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700' },
  'General Meeting':     { accent: 'border-slate-400',   badgeBg: 'bg-slate-50',   badgeText: 'text-slate-600' },
  'Custom':              { accent: 'border-teal-500',    badgeBg: 'bg-teal-50',    badgeText: 'text-teal-700' },
  'Other':               { accent: 'border-teal-500',    badgeBg: 'bg-teal-50',    badgeText: 'text-teal-700' },
};

const getTypeConfig = (type: string) =>
  TYPE_CONFIG[type] ?? { accent: 'border-gray-400', badgeBg: 'bg-gray-50', badgeText: 'text-gray-600' };

// ── Action item helpers ────────────────────────────────────────────────────────
interface ActionItem {
  task: string;
  owner?: string;
  dueDate?: string;
}

const parseActionItems = (raw: unknown): ActionItem[] => {
  if (raw == null || raw === '') return [];
  // Already a parsed array
  if (Array.isArray(raw)) {
    return raw.map((i: any) => ({
      task: String(i.task || ''),
      owner: i.owner ? String(i.owner) : undefined,
      dueDate: i.dueDate ? String(i.dueDate) : undefined,
    })).filter((i) => i.task);
  }
  const str = String(raw);
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((i: any) => ({
        task: String(i.task || ''),
        owner: i.owner ? String(i.owner) : undefined,
        dueDate: i.dueDate ? String(i.dueDate) : undefined,
      })).filter((i) => i.task);
    }
  } catch {}
  return str.split('\n').filter((l) => l.trim()).map((l) => ({ task: l.trim() }));
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function StandaloneMomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mom, setMom] = useState<StandaloneMom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const downloadRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadMom(id);
  }, [id]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setDownloadOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadMom = async (momId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await standaloneMomApi.get(momId);
      setMom(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load MOM');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setMenuOpen(false);
    if (!window.confirm('Archive this MOM? You can restore it later.')) return;
    try {
      await standaloneMomApi.archive(id);
      navigate('/mom');
    } catch (err: any) {
      setActionError(err.message || 'Unable to archive. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setMenuOpen(false);
    if (!window.confirm('Permanently delete this MOM? This cannot be undone.')) return;
    try {
      await standaloneMomApi.remove(id);
      navigate('/mom');
    } catch (err: any) {
      setActionError(err.message || 'Unable to delete. Please try again.');
    }
  };

  const handleDownload = async (format: 'txt' | 'docx') => {
    if (!id) return;
    setDownloadOpen(false);
    try {
      await standaloneMomApi.download(id, format);
    } catch (err: any) {
      setActionError(err.message || 'Unable to generate file. Please try again.');
    }
  };

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-6 py-10 animate-pulse space-y-8">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-gray-200 rounded" />
            <div className="flex gap-2">
              <div className="h-9 w-16 bg-gray-200 rounded-lg" />
              <div className="h-9 w-28 bg-gray-200 rounded-lg" />
              <div className="h-9 w-9 bg-gray-200 rounded-lg" />
            </div>
          </div>
          <div className="border-l-4 border-gray-200 pl-5 space-y-3">
            <div className="h-5 w-20 bg-gray-200 rounded-md" />
            <div className="h-8 w-2/3 bg-gray-200 rounded" />
            <div className="h-4 w-1/2 bg-gray-100 rounded" />
          </div>
          <div className="space-y-10 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-3.5 w-24 bg-gray-200 rounded" />
                <div className="h-px bg-gray-100" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-100 rounded" />
                  <div className="h-3 w-5/6 bg-gray-100 rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error || !mom) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-6">
            <p className="font-semibold">{error || 'MOM not found'}</p>
            <button
              onClick={() => navigate('/mom')}
              className="mt-3 text-sm text-red-600 underline hover:text-red-800"
            >
              ← Back to list
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const typeLabel = mom.customMeetingType || mom.meetingType;
  const typeConfig = getTypeConfig(mom.meetingType);
  const creatorName = mom.createdBy?.name || mom.createdBy?.email || null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate('/mom')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to MOMs
          </button>

          <div className="flex items-center gap-2">
            {!mom.archived && (
              <button
                onClick={() => navigate(`/mom/${mom.id}/edit`)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}

            {/* Download dropdown */}
            <div className="relative" ref={downloadRef}>
              <button
                onClick={() => setDownloadOpen((v) => !v)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {downloadOpen && (
                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <button
                    onClick={() => handleDownload('txt')}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Download as .txt
                  </button>
                  <button
                    onClick={() => handleDownload('docx')}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Download as .docx
                  </button>
                </div>
              )}
            </div>

            {/* ⋯ overflow menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="More actions"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  {!mom.archived ? (
                    <button
                      onClick={handleArchive}
                      className="w-full text-left px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 font-medium flex items-center gap-2.5"
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      Archive
                    </button>
                  ) : (
                    <p className="px-4 py-2 text-xs text-gray-400 font-semibold uppercase tracking-wider">
                      Archived
                    </p>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleDelete}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium flex items-center gap-2.5"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete permanently
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-red-400 hover:text-red-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Archived banner */}
        {mom.archived && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            This MOM is archived and cannot be edited.
          </div>
        )}

        {/* Document header — left accent border + type badge + title + meta row */}
        <div className={`border-l-4 ${typeConfig.accent} pl-5 space-y-2.5`}>
          <span
            className={`inline-block px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-md ${typeConfig.badgeBg} ${typeConfig.badgeText}`}
          >
            {typeLabel}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug">{mom.title}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
            {mom.project && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {mom.project.name}
              </span>
            )}
            {mom.sprint && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {mom.sprint.name}
                </span>
              </>
            )}
            <span className="text-gray-300">·</span>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(mom.meetingDate)}
            </span>
            {creatorName && (
              <>
                <span className="text-gray-300">·</span>
                <span>by {creatorName}</span>
              </>
            )}
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-10 pt-2">
          <ContentSection
            title="Agenda"
            content={mom.agenda}
            sectionKey="agenda"
            copiedSection={copiedSection}
            onCopy={copyToClipboard}
            emptyLabel="No agenda recorded"
          />
          <ContentSection
            title="Discussion Summary"
            content={mom.discussionSummary}
            sectionKey="discussion"
            copiedSection={copiedSection}
            onCopy={copyToClipboard}
            emptyLabel="No discussion summary recorded"
          />
          <ContentSection
            title="Decisions"
            content={mom.decisions}
            sectionKey="decisions"
            copiedSection={copiedSection}
            onCopy={copyToClipboard}
            emptyLabel="No decisions recorded"
          />
          {/* Action items — rendered as a table */}
          <div className="group space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Action Items</h2>
              {mom.actionItems && (
                <button
                  onClick={() => copyToClipboard(mom.actionItems!, 'actions')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    copiedSection === 'actions'
                      ? 'opacity-100 text-emerald-600 bg-emerald-50'
                      : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {copiedSection === 'actions' ? (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="h-px bg-gray-100" />
            <ActionItemsTable items={parseActionItems(mom.actionItems)} />
          </div>
        </div>

        {/* Footer timestamps */}
        <div className="pt-6 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>Created {formatDate(mom.createdAt)}</span>
          <span>·</span>
          <span>Last updated {formatDate(mom.updatedAt)}</span>
        </div>

      </div>
    </AppLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActionItemsTable({ items }: { items: ActionItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">No action items</p>;
  }

  const hasOwner = items.some((i) => i.owner);
  const hasDueDate = items.some((i) => i.dueDate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider pb-2.5 pr-6">
              Task
            </th>
            {hasOwner && (
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider pb-2.5 pr-6 w-36">
                Owner
              </th>
            )}
            {hasDueDate && (
              <th className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider pb-2.5 w-32">
                Due Date
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {items.map((item, i) => (
            <tr key={i}>
              <td className="py-3 pr-6 text-gray-800 leading-snug">{item.task}</td>
              {hasOwner && (
                <td className="py-3 pr-6 text-gray-500">{item.owner || <span className="text-gray-300">—</span>}</td>
              )}
              {hasDueDate && (
                <td className="py-3 text-gray-500">{item.dueDate || <span className="text-gray-300">—</span>}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ContentSectionProps {
  title: string;
  content: string | null | undefined;
  sectionKey: string;
  copiedSection: string | null;
  onCopy: (text: string, sectionKey: string) => void;
  emptyLabel: string;
}

function ContentSection({
  title,
  content,
  sectionKey,
  copiedSection,
  onCopy,
  emptyLabel,
}: ContentSectionProps) {
  const isCopied = copiedSection === sectionKey;

  return (
    <div className="group space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h2>
        {content && (
          <button
            onClick={() => onCopy(content, sectionKey)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              isCopied
                ? 'opacity-100 text-emerald-600 bg-emerald-50'
                : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {isCopied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        )}
      </div>
      <div className="h-px bg-gray-100" />
      {content ? (
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">{content}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">{emptyLabel}</p>
      )}
    </div>
  );
}
