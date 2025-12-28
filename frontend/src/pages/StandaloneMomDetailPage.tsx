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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/30">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-bold text-primary-600 uppercase tracking-wider">Meeting Details</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{mom?.title || 'Minutes of Meeting'}</h1>
              {mom && (
                <div className="flex items-center gap-3 text-gray-600">
                  <span className="px-3 py-1 bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold rounded-full uppercase">
                    {mom.customMeetingType || mom.meetingType}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {mom.meetingDate}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => navigate('/mom')} className="px-5 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all active:scale-95">Back to List</button>
              {mom && !mom.archived && (
                <button onClick={() => navigate(`/mom/${mom.id}/edit`)} className="px-5 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-xl hover:from-primary-700 hover:to-secondary-700 transition-all shadow-lg font-bold flex items-center gap-2 active:scale-95">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownload('txt')} className="px-4 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 font-bold active:scale-95">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  TXT
                </button>
                <button onClick={() => handleDownload('docx')} className="px-4 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 text-white rounded-xl transition-all shadow-lg flex items-center gap-2 font-bold active:scale-95">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  DOCX
                </button>
              </div>
            </div>
          </header>

          {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{error}</div>}
          {actionError && <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-xl p-4 shadow-lg font-medium">{actionError}</div>}

          {loading || !mom ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-500 border-t-transparent"></div></div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Info label="Project" value={mom.project?.name || mom.projectId || 'N/A'} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} />
                  <Info label="Sprint" value={mom.sprint?.name || 'Not tagged'} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>} />
                  <Info label="Created By" value={mom.createdBy?.email || mom.createdBy?.id || 'N/A'} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
                  <Info label="Last Updated" value={new Date(mom.updatedAt).toLocaleString()} icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Agenda" body={mom.agenda || 'Not specified'} gradient="from-primary-600 to-secondary-600" />
                <Section title="Discussion Summary" body={mom.discussionSummary || 'Not specified'} gradient="from-primary-600 to-secondary-600" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Decisions" body={mom.decisions || 'No decisions recorded'} gradient="from-primary-600 to-secondary-600" />
                <Section title="Action Items" body={mom.actionItems || 'No action items'} gradient="from-primary-600 to-secondary-600" />
              </div>

              {!mom.archived && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Document Actions</p>
                    <div className="flex items-center gap-3">
                      <button onClick={handleArchive} className="px-5 py-3 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 font-bold transition-all flex items-center gap-2 active:scale-95">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        Archive
                      </button>
                      <button onClick={handleDelete} className="px-5 py-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl hover:bg-red-100 font-bold transition-all flex items-center gap-2 active:scale-95 hover:scale-110 hover:rotate-3">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Section({ title, body, gradient }: { title: string; body: string; gradient: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} px-6 py-4`}>
        <h3 className="text-lg font-black text-white uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-6">
        <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-200 rounded-lg text-primary-600">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
