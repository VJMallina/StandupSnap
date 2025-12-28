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
        <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent"></div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-secondary-50/20">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          <header className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-secondary-500 to-primary-500 rounded-lg shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-primary-600 uppercase tracking-wider">{isEdit ? 'Edit' : 'Create'} MOM</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Update Minutes' : 'New Meeting Minutes'}</h1>
              <p className="text-gray-600">Fill in details or let AI generate from your notes</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/mom')} className="px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all active:scale-95">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 font-bold active:scale-95 disabled:active:scale-100">{saving ? 'Saving...' : 'Save MOM'}</button>
            </div>
          </header>

          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{error}</div>}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-100 p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Project *">
                <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setSelectedProjectId(e.target.value); setSprintId(undefined); }} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full">
                  <option value="">Select project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </Field>
              <Field label="Sprint (optional)">
                <select value={sprintId || ''} onChange={(e) => setSprintId(e.target.value || undefined)} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full">
                  <option value="">No sprint</option>
                  {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Meeting Title *">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full" placeholder="Enter meeting title..." />
              </Field>
              <Field label="Meeting Date *">
                <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full" />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Meeting Type *">
                <select value={meetingType} onChange={(e) => setMeetingType(e.target.value as StandaloneMeetingType)} className="bg-white border-2 border-gray-200 text-gray-700 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full">
                  {meetingTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </Field>
              {(meetingType === 'Other' || meetingType === 'Custom') && (
                <Field label="Custom Meeting Type">
                  <input type="text" value={customMeetingType} onChange={(e) => setCustomMeetingType(e.target.value)} className="bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all w-full" placeholder="Specify type..." />
                </Field>
              )}
            </div>

            <div className="bg-gradient-to-br from-primary-50 to-secondary-50 border-2 border-primary-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <p className="text-sm font-bold text-primary-900">AI-Powered Generation</p>
                  </div>
                  <p className="text-xs text-primary-700">Paste notes or upload a file, then click generate</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="px-4 py-2 bg-white border-2 border-primary-300 text-primary-700 rounded-xl hover:bg-primary-50 font-bold cursor-pointer transition-all text-sm active:scale-95">
                    <input type="file" accept=".txt,application/pdf,.docx" onChange={(e) => handleUpload(e.target.files?.[0])} className="hidden" />
                    Upload File
                  </label>
                  {uploading && <span className="text-xs text-primary-700 font-semibold animate-pulse">Extracting...</span>}
                  {autoGenerating && <span className="text-xs text-primary-700 font-semibold animate-pulse">Generating...</span>}
                  <button onClick={handleGenerate} disabled={generateLoading} className="px-5 py-2 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg text-sm flex items-center gap-2 active:scale-95 disabled:active:scale-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {generateLoading ? 'Generating...' : 'Generate with AI'}
                  </button>
                </div>
              </div>
              {aiError && <p className="text-sm text-red-700 font-medium bg-red-50 border border-red-200 rounded-lg p-3">{aiError}</p>}
              <textarea rows={6} value={rawNotes} onChange={(e) => setRawNotes(e.target.value)} placeholder="Paste your raw meeting notes or transcript here..." className="w-full bg-white border-2 border-primary-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all resize-none" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Agenda">
                <textarea rows={4} value={agenda} onChange={(e) => setAgenda(e.target.value)} className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none" placeholder="Meeting agenda..." />
              </Field>
              <Field label="Discussion Summary">
                <textarea rows={4} value={discussionSummary} onChange={(e) => setDiscussionSummary(e.target.value)} className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none" placeholder="Key discussion points..." />
              </Field>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Field label="Decisions">
                <textarea rows={4} value={decisions} onChange={(e) => setDecisions(e.target.value)} className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none" placeholder="Decisions made..." />
              </Field>
              <Field label="Action Items">
                <textarea rows={4} value={actionItems} onChange={(e) => setActionItems(e.target.value)} placeholder="Action items with owner & due date..." className="w-full bg-white border-2 border-gray-200 text-gray-900 rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder-gray-400 transition-all resize-none" />
              </Field>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
