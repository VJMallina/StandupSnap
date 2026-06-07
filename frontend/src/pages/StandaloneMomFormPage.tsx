import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { projectsApi } from '../services/api/projects';
import { sprintsApi } from '../services/api/sprints';
import { standaloneMomApi } from '../services/api/standaloneMom';
import { Project } from '../types/project';
import { Sprint } from '../types/sprint';
import { StandaloneMeetingType } from '../types/standaloneMom';
import { useProjectSelection } from '../context/ProjectSelectionContext';

const meetingTypes: StandaloneMeetingType[] = [
  'Planning', 'Grooming', 'Retrospective', 'Stakeholder Meeting', 'General Meeting', 'Other', 'Custom',
];

const TYPE_STYLE: Record<string, { dot: string; activeBg: string; activeText: string }> = {
  'Planning':            { dot: 'bg-blue-500',    activeBg: 'bg-blue-50',    activeText: 'text-blue-700' },
  'Grooming':            { dot: 'bg-violet-500',  activeBg: 'bg-violet-50',  activeText: 'text-violet-700' },
  'Retrospective':       { dot: 'bg-orange-500',  activeBg: 'bg-orange-50',  activeText: 'text-orange-700' },
  'Stakeholder Meeting': { dot: 'bg-emerald-500', activeBg: 'bg-emerald-50', activeText: 'text-emerald-700' },
  'General Meeting':     { dot: 'bg-slate-400',   activeBg: 'bg-slate-50',   activeText: 'text-slate-600' },
  'Custom':              { dot: 'bg-teal-500',    activeBg: 'bg-teal-50',    activeText: 'text-teal-700' },
  'Other':               { dot: 'bg-teal-500',    activeBg: 'bg-teal-50',    activeText: 'text-teal-700' },
};

const getTypeStyle = (type: string) =>
  TYPE_STYLE[type] ?? { dot: 'bg-gray-400', activeBg: 'bg-gray-50', activeText: 'text-gray-600' };

// ── Action item helpers ────────────────────────────────────────────────────────
interface ActionItem {
  task: string;
  owner: string;
  dueDate: string;
}

const parseActionItems = (raw: unknown): ActionItem[] => {
  if (raw == null || raw === '') return [];
  // Already a parsed array (e.g. from API response before JSON stringification)
  if (Array.isArray(raw)) {
    return raw.map((i: any) => ({
      task: String(i.task || ''),
      owner: String(i.owner || ''),
      dueDate: String(i.dueDate || ''),
    })).filter((i) => i.task);
  }
  const str = String(raw);
  try {
    const parsed = JSON.parse(str);
    if (Array.isArray(parsed)) {
      return parsed.map((i: any) => ({
        task: String(i.task || ''),
        owner: String(i.owner || ''),
        dueDate: String(i.dueDate || ''),
      })).filter((i) => i.task);
    }
  } catch {}
  // Fallback: treat each non-empty line as a task row
  return str.split('\n').filter((l) => l.trim()).map((l) => ({ task: l.trim(), owner: '', dueDate: '' }));
};

const serializeActionItems = (items: ActionItem[]): string | undefined => {
  const valid = items.filter((i) => i.task.trim());
  return valid.length ? JSON.stringify(valid) : undefined;
};

export default function StandaloneMomFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { selectedProjectId, setSelectedProjectId } = useProjectSelection();

  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  const [title, setTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [meetingType, setMeetingType] = useState<StandaloneMeetingType>('General Meeting');
  const [customMeetingType, setCustomMeetingType] = useState('');
  const [projectId, setProjectId] = useState(selectedProjectId || '');
  const [sprintId, setSprintId] = useState<string | undefined>();
  const [rawNotes, setRawNotes] = useState('');
  const [agenda, setAgenda] = useState('');
  const [discussionSummary, setDiscussionSummary] = useState('');
  const [decisions, setDecisions] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);

  useEffect(() => { loadProjects(); }, []);

  useEffect(() => { if (projectId) loadSprints(projectId); }, [projectId]);

  useEffect(() => { if (id) loadMom(id); }, [id]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
      if (!projectId && data.length > 0) {
        setProjectId(data[0].id);
        setSelectedProjectId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    }
  };

  const loadSprints = async (projId: string) => {
    try {
      const data = await sprintsApi.getAll({ projectId: projId });
      setSprints(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load sprints');
    }
  };

  const loadMom = async (momId: string) => {
    setLoading(true);
    try {
      const mom = await standaloneMomApi.get(momId);
      setTitle(mom.title);
      setMeetingDate(mom.meetingDate);
      setMeetingType(mom.meetingType);
      setCustomMeetingType(mom.customMeetingType || '');
      setProjectId(mom.project?.id || projectId);
      setSprintId(mom.sprint?.id || undefined);
      setRawNotes(mom.rawNotes || '');
      setAgenda(mom.agenda || '');
      setDiscussionSummary(mom.discussionSummary || '');
      setDecisions(mom.decisions || '');
      setActionItems(parseActionItems(mom.actionItems));
      if (mom.project?.id) setSelectedProjectId(mom.project.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load MOM');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setAiError(null);
    if (!rawNotes.trim()) { setAiError('Enter notes or upload a transcript first.'); return; }
    setGenerateLoading(true);
    try {
      const result = await standaloneMomApi.generate(rawNotes);
      setAgenda(result.agenda || '');
      setDiscussionSummary(result.discussionSummary || '');
      setDecisions(result.decisions || '');
      setActionItems(parseActionItems(result.actionItems));
    } catch (err: any) {
      setAiError(err.message || 'AI could not process the text. You can edit manually.');
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setAiError(null);
    try {
      const { text } = await standaloneMomApi.extractTranscript(file);
      setRawNotes(text);
      setAutoGenerating(true);
      setGenerateLoading(true);
      const result = await standaloneMomApi.generate(text);
      setAgenda(result.agenda || '');
      setDiscussionSummary(result.discussionSummary || '');
      setDecisions(result.decisions || '');
      setActionItems(parseActionItems(result.actionItems));
    } catch (err: any) {
      setAiError(err.message || 'Could not extract content from file.');
    } finally {
      setAutoGenerating(false);
      setGenerateLoading(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!String(title || '').trim()) { setError('Title is required'); return; }
    if (!projectId) { setError('Please select a project'); return; }
    setSaving(true);
    try {
      // Convert any value to a safe string, then return undefined if empty
      // so @IsOptional() fields are omitted from JSON and @IsString() never fires on null
      const optional = (v: unknown): string | undefined => {
        const s = v == null ? '' : String(v);
        return s.trim() || undefined;
      };

      const payload = {
        projectId,
        sprintId: sprintId || undefined,
        title: String(title || '').trim(),
        meetingDate,
        meetingType,
        customMeetingType: meetingType === 'Custom' || meetingType === 'Other'
          ? optional(customMeetingType)
          : undefined,
        rawNotes: optional(rawNotes),
        agenda: optional(agenda),
        discussionSummary: optional(discussionSummary),
        decisions: optional(decisions),
        actionItems: serializeActionItems(actionItems),
      };
      if (isEdit && id) {
        await standaloneMomApi.update(id, payload);
        navigate(`/mom/${id}`);
      } else {
        const created = await standaloneMomApi.create(payload);
        navigate(`/mom/${created.id}`);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && isEdit) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 truncate">
              {isEdit ? 'Edit Meeting Minutes' : 'New Meeting Minutes'}
            </h1>
            <p className="text-xs text-gray-400">
              {isEdit ? 'Update and save your changes' : 'Fill in the details and generate with AI'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => navigate('/mom')}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 text-sm font-semibold transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create MOM'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center justify-between gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-10 space-y-8 lg:space-y-0">

          {/* ── Left sidebar ─────────────────────────────────────── */}
          <aside className="lg:sticky lg:top-[57px] lg:max-h-[calc(100vh-57px)] lg:overflow-y-auto pb-8 space-y-6">

            <SidebarField label="Project *">
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setSelectedProjectId(e.target.value);
                  setSprintId(undefined);
                }}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">Select project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </SidebarField>

            <SidebarField label="Sprint">
              <select
                value={sprintId || ''}
                onChange={(e) => setSprintId(e.target.value || undefined)}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              >
                <option value="">No sprint</option>
                {sprints.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </SidebarField>

            <SidebarField label="Meeting Date *">
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full bg-white border border-gray-200 text-gray-700 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
              />
            </SidebarField>

            {/* Meeting type — vertical radio list */}
            <SidebarField label="Meeting Type *">
              <div className="space-y-0.5">
                {meetingTypes.map((type) => {
                  const style = getTypeStyle(type);
                  const isSelected = meetingType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMeetingType(type)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                        isSelected
                          ? `${style.activeBg} ${style.activeText} font-semibold`
                          : 'text-gray-600 hover:bg-gray-50 font-medium'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-all ${
                          isSelected ? style.dot : 'bg-gray-200'
                        }`}
                      />
                      {type}
                    </button>
                  );
                })}
              </div>
              {(meetingType === 'Other' || meetingType === 'Custom') && (
                <input
                  type="text"
                  value={customMeetingType}
                  onChange={(e) => setCustomMeetingType(e.target.value)}
                  placeholder="Specify type..."
                  className="mt-2 w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400"
                />
              )}
            </SidebarField>
          </aside>

          {/* ── Main content ──────────────────────────────────────── */}
          <main className="space-y-6">

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                Meeting Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Sprint 4 Planning, Q3 Stakeholder Review..."
                className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-semibold text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all placeholder-gray-400 placeholder:font-normal"
              />
            </div>

            {/* AI generation zone */}
            <div className="rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/40 p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm font-bold text-primary-900">AI-Assisted Generation</p>
                  </div>
                  <p className="text-xs text-primary-600 pl-6">
                    Paste notes or upload a file → click Generate to fill all sections below
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-primary-200 text-primary-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-primary-50 transition-all active:scale-95">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    {uploading ? 'Uploading...' : 'Upload File'}
                    <input
                      type="file"
                      accept=".txt,application/pdf,.docx"
                      onChange={(e) => handleUpload(e.target.files?.[0])}
                      className="hidden"
                    />
                  </label>
                  <button
                    onClick={handleGenerate}
                    disabled={generateLoading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-sm active:scale-95 disabled:active:scale-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {generateLoading
                      ? (autoGenerating ? 'Processing...' : 'Generating...')
                      : 'Generate with AI'}
                  </button>
                </div>
              </div>

              {aiError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {aiError}
                </p>
              )}

              <textarea
                rows={5}
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Paste your raw meeting notes or transcript here..."
                className="w-full bg-white border border-primary-200 text-gray-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all resize-none"
              />
            </div>

            {/* Content sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <ContentField
                label="Agenda"
                value={agenda}
                onChange={setAgenda}
                placeholder="Topics to be covered in the meeting..."
              />
              <ContentField
                label="Discussion Summary"
                value={discussionSummary}
                onChange={setDiscussionSummary}
                placeholder="Key points discussed during the meeting..."
              />
              <ContentField
                label="Decisions"
                value={decisions}
                onChange={setDecisions}
                placeholder="Decisions made and their rationale..."
              />
            </div>

            {/* Action items table */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">
                Action Items
              </label>
              <ActionItemsEditor items={actionItems} onChange={setActionItems} />
            </div>
          </main>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ActionItemsEditor({ items, onChange }: { items: ActionItem[]; onChange: (items: ActionItem[]) => void }) {
  const add = () => onChange([...items, { task: '', owner: '', dueDate: '' }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ActionItem, value: string) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2.5">Task</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-40">Owner</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider px-4 py-2.5 w-40">Due Date</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => (
                <tr key={i} className="group">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.task}
                      onChange={(e) => update(i, 'task', e.target.value)}
                      placeholder="Describe the action..."
                      className="w-full bg-transparent border-0 text-gray-900 text-sm placeholder-gray-400 focus:ring-0 focus:outline-none py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.owner}
                      onChange={(e) => update(i, 'owner', e.target.value)}
                      placeholder="Owner"
                      className="w-full bg-transparent border-0 text-gray-700 text-sm placeholder-gray-400 focus:ring-0 focus:outline-none py-0.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => update(i, 'dueDate', e.target.value)}
                      className="w-full bg-transparent border-0 text-gray-700 text-sm focus:ring-0 focus:outline-none py-0.5"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={items.length > 0 ? 'border-t border-gray-100' : ''}>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50/50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Add action item
        </button>
      </div>
    </div>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function ContentField({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      <textarea
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all resize-none"
      />
    </div>
  );
}
