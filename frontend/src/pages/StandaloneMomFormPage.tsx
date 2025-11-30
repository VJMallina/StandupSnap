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
  'Planning',
  'Grooming',
  'Retrospective',
  'Stakeholder Meeting',
  'General Meeting',
  'Other',
  'Custom',
];

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
  const [actionItems, setActionItems] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (projectId) {
      loadSprints(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (id) {
      loadMom(id);
    }
  }, [id]);

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
      setActionItems(mom.actionItems || '');
      if (mom.project?.id) setSelectedProjectId(mom.project.id);
    } catch (err: any) {
      setError(err.message || 'Failed to load MOM');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setAiError(null);
    if (!rawNotes.trim()) {
      setAiError('Enter notes or upload a transcript.');
      return;
    }
    setGenerateLoading(true);
    try {
      const result = await standaloneMomApi.generate(rawNotes);
      setAgenda(result.agenda || '');
      setDiscussionSummary(result.discussionSummary || '');
      setDecisions(result.decisions || '');
      setActionItems(result.actionItems || '');
    } catch (err: any) {
      setAiError(err.message || 'AI could not process text. You may edit manually.');
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
      setActionItems(result.actionItems || '');
    } catch (err: any) {
      setAiError(err.message || 'Could not extract content from file. Try uploading a different file.');
    } finally {
      setAutoGenerating(false);
      setGenerateLoading(false);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setError('Title is mandatory');
      return;
    }
    if (!projectId) {
      setError('Select a project');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        projectId,
        sprintId,
        title,
        meetingDate,
        meetingType,
        customMeetingType: meetingType === 'Custom' || meetingType === 'Other' ? customMeetingType : undefined,
        rawNotes,
        agenda,
        discussionSummary,
        decisions,
        actionItems,
      };
      if (isEdit && id) {
        await standaloneMomApi.update(id, payload);
      } else {
        const created = await standaloneMomApi.create(payload);
        navigate(`/mom/${created.id}`);
        return;
      }
      navigate(`/mom/${id}`);
    } catch (err: any) {
      setError(err.message || 'Unable to save MOM. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && isEdit) {
    return (
      <AppLayout>
        <div className="p-6 text-gray-200">Loading MOM...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-300">Standalone MOM</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{isEdit ? 'Edit MOM' : 'Create MOM'}</h1>
            <p className="text-gray-400 text-sm">Title required; meeting date cannot be in the future.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/mom')} className="text-gray-300 hover:text-white text-sm px-3 py-2">
              Back to list
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg font-semibold shadow-sm disabled:opacity-60 hover:bg-teal-700"
            >
              {saving ? 'Saving...' : 'Save MOM'}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-950/40 border border-red-700 text-red-200 p-3 rounded-lg text-sm">{error}</div>}

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Project *">
              <select
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setSelectedProjectId(e.target.value);
                  setSprintId(undefined);
                }}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Sprint (optional)">
              <select
                value={sprintId || ''}
                onChange={(e) => setSprintId(e.target.value || undefined)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              >
                <option value="">No sprint</option>
                {sprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Meeting Title *">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Meeting Date *">
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Meeting Type *">
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as StandaloneMeetingType)}
                className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              >
                {meetingTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            {(meetingType === 'Other' || meetingType === 'Custom') && (
              <Field label="Custom Meeting Type">
                <input
                  type="text"
                  value={customMeetingType}
                  onChange={(e) => setCustomMeetingType(e.target.value)}
                  className="bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
                />
              </Field>
            )}
          </div>

          <section className="space-y-3 bg-slate-950 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm text-white font-semibold">Raw Notes / Transcript</p>
                <p className="text-xs text-gray-400">Paste notes or upload a transcript. Then generate with AI.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx"
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                  className="text-gray-200 text-xs"
                />
                {uploading && <span className="text-xs text-teal-400">Extracting...</span>}
                {autoGenerating && <span className="text-xs text-teal-300">Generating...</span>}
                <button
                  onClick={handleGenerate}
                  disabled={generateLoading}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
                >
                  {generateLoading ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
            </div>
            {aiError && <p className="text-sm text-red-300">{aiError}</p>}
            <textarea
              rows={4}
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="Paste notes or transcript..."
              className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
            />
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Agenda">
              <textarea
                rows={3}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Discussion Summary">
              <textarea
                rows={3}
                value={discussionSummary}
                onChange={(e) => setDiscussionSummary(e.target.value)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Decisions">
              <textarea
                rows={3}
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
            <Field label="Action Items">
              <textarea
                rows={3}
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                placeholder="Include owner + due date if possible"
                className="w-full bg-slate-950 text-white border border-slate-800 rounded-lg px-3 py-2"
              />
            </Field>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-300">{label}</label>
      {children}
    </div>
  );
}
