import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { standaloneMomApi } from '../services/api/standaloneMom';
import { StandaloneMom } from '../types/standaloneMom';

export default function StandaloneMomDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [mom, setMom] = useState<StandaloneMom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMom(id);
    }
  }, [id]);

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
    const confirmed = window.confirm('Are you sure you want to archive this MOM? You can restore it later.');
    if (!confirmed) return;
    try {
      await standaloneMomApi.archive(id);
      navigate('/mom');
    } catch (err: any) {
      setActionError(err.message || 'Unable to perform the action. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    const confirmed = window.confirm('This will permanently delete the MOM. This action cannot be undone.');
    if (!confirmed) return;
    try {
      await standaloneMomApi.remove(id);
      navigate('/mom');
    } catch (err: any) {
      setActionError(err.message || 'Unable to perform the action. Please try again.');
    }
  };

  const handleDownload = async (format: 'txt' | 'docx') => {
    if (!id) return;
    try {
      await standaloneMomApi.download(id, format);
    } catch (err: any) {
      setActionError(err.message || 'Unable to generate file. Please try again.');
    }
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-teal-300">Standalone MOM</p>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">{mom?.title || 'Minutes of Meeting'}</h1>
            {mom && (
              <p className="text-gray-400 text-sm">
                {mom.customMeetingType || mom.meetingType} • {mom.meetingDate}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/mom')} className="text-gray-300 hover:text-white text-sm px-3 py-2">
              Back to list
            </button>
            {mom && !mom.archived && (
              <button
                onClick={() => navigate(`/mom/${mom.id}/edit`)}
                className="bg-slate-800 border border-teal-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                Edit MOM
              </button>
            )}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleDownload('txt')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                Download TXT
              </button>
              <button
                onClick={() => handleDownload('docx')}
                className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-2 rounded-lg text-sm"
              >
                DOCX
              </button>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-950/40 border border-red-700 text-red-200 p-3 rounded-lg text-sm">{error}</div>}
        {actionError && (
          <div className="bg-red-950/40 border border-red-700 text-red-200 p-3 rounded-lg text-sm">{actionError}</div>
        )}

        {loading || !mom ? (
          <div className="text-gray-300">Loading...</div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-300">
              <Info label="Project" value={mom.project?.name || mom.projectId} />
              <Info label="Sprint" value={mom.sprint?.name || 'Not tagged'} />
              <Info label="Created By" value={mom.createdBy?.email || mom.createdBy?.id || 'N/A'} />
              <Info label="Last Updated" value={new Date(mom.updatedAt).toLocaleString()} />
            </div>

            <Section title="Agenda" body={mom.agenda || 'None'} />
            <Section title="Discussion Summary" body={mom.discussionSummary || 'None'} />
            <Section title="Decisions" body={mom.decisions || 'None'} />
            <Section title="Action Items" body={mom.actionItems || 'None'} />

            {!mom.archived && (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleArchive}
                  className="bg-slate-800 border border-teal-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Archive
                </button>
                <button
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2">
      <p className="text-sm font-semibold text-teal-300">{title}</p>
      <p className="text-gray-200 whitespace-pre-wrap">{body}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-white">{value}</p>
    </div>
  );
}
