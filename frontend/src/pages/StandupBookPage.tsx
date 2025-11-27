import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { standupBookApi } from '../services/api/standupbook';
import { projectsApi } from '../services/api/projects';
import { sprintsApi } from '../services/api/sprints';
import { Project } from '../types/project';
import { Sprint } from '../types/sprint';
import { SprintDay } from '../types/standupbook';
import AppLayout from '../components/AppLayout';

interface DayBook extends SprintDay {
  isLocked?: boolean;
  hasMom?: boolean;
  snapCount?: number;
}

export default function StandupBookPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [dayBooks, setDayBooks] = useState<DayBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    const sprintId = searchParams.get('sprint');
    if (sprintId) {
      loadSprintFromUrl(sprintId);
    }
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadActiveSprint();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeSprint) {
      loadSprintDays();
    }
  }, [activeSprint]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data.filter((p: Project) => !p.isArchived));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadSprintFromUrl = async (sprintId: string) => {
    try {
      setLoading(true);
      const sprint = await sprintsApi.getById(sprintId);
      setActiveSprint(sprint);
      setSelectedProjectId(sprint.project.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveSprint = async () => {
    try {
      setLoading(true);
      const sprint = await standupBookApi.getActiveSprint(selectedProjectId);
      setActiveSprint(sprint);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSprintDays = async () => {
    if (!activeSprint) return;

    try {
      setLoading(true);
      const days = await standupBookApi.getSprintDays(activeSprint.id);

      // Enrich days with lock and MOM status
      const enrichedDays: DayBook[] = await Promise.all(
        days.map(async (day) => {
          try {
            const [metadata, lock, mom] = await Promise.all([
              standupBookApi.getDayMetadata(activeSprint.id, day.date).catch(() => null),
              standupBookApi.getDailyLock(activeSprint.id, day.date).catch(() => null),
              standupBookApi.getMomByDate(activeSprint.id, day.date).catch(() => null),
            ]);

            return {
              ...day,
              isLocked: lock?.isLocked || false,
              hasMom: !!mom,
              snapCount: metadata?.totalSnaps || 0,
            };
          } catch {
            return {
              ...day,
              isLocked: false,
              hasMom: false,
              snapCount: 0,
            };
          }
        })
      );

      setDayBooks(enrichedDays);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = (day: DayBook) => {
    if (!day.isAccessible) {
      return;
    }
    navigate(`/standup-book/${activeSprint!.id}/${day.date}`);
  };

  const getBookColor = (day: DayBook) => {
    if (!day.isAccessible) {
      return 'from-gray-200 to-gray-300 border-gray-400';
    }
    if (day.isLocked) {
      return 'from-green-400 to-green-600 border-green-700';
    }
    const today = new Date().toISOString().split('T')[0];
    if (day.date === today) {
      return 'from-blue-400 to-blue-600 border-blue-700';
    }
    return 'from-teal-400 to-teal-600 border-teal-700';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Compact Hero Bar */}
          <div className="relative bg-gradient-to-r from-teal-600 to-teal-700 shadow-lg rounded-2xl p-5 mb-6 overflow-hidden">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between gap-6">
              {/* Left: Title & Icon */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Standup Book</h1>
                  <p className="text-teal-100 text-sm">Daily activities & meetings</p>
                </div>
              </div>

              {/* Right: Project Selection */}
              <div className="flex items-center gap-3 flex-1 max-w-xl">
                <svg className="w-6 h-6 text-white/80 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 bg-white/95 backdrop-blur border-0 rounded-xl px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-white focus:outline-none transition-all shadow-md font-medium text-sm"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6 shadow-sm">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!activeSprint && selectedProjectId && !loading && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6 shadow-sm">
              <p className="text-sm text-yellow-700">
                No active sprint found. Please create or activate a sprint first.
              </p>
            </div>
          )}

          {activeSprint && (
            <>
              {/* Sprint Info - Compact */}
              <div className="bg-gradient-to-r from-teal-600 to-teal-700 shadow-lg rounded-2xl p-5 mb-6 text-white border border-teal-500">
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Sprint Name & Dates */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30 flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{activeSprint.name}</h2>
                      <p className="text-teal-100 text-sm">
                        {new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Center: Sprint Goal (if exists) */}
                  {activeSprint.goal && (
                    <div className="flex-1 px-6 border-l border-white/30">
                      <p className="text-xs uppercase tracking-wide text-teal-200 mb-1">Sprint Goal</p>
                      <p className="text-white/90 text-sm line-clamp-2">{activeSprint.goal}</p>
                    </div>
                  )}

                  {/* Right: Total Days */}
                  <div className="text-center bg-white/10 rounded-xl px-6 py-3 border border-white/20 flex-shrink-0">
                    <div className="text-3xl font-bold text-white">{dayBooks.length}</div>
                    <div className="text-teal-100 uppercase tracking-wide text-xs">Total Days</div>
                  </div>
                </div>
              </div>

              {/* Book Shelf */}
              <div className="bg-white shadow-xl rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                    <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Day Books</h3>
                  <div className="flex-1"></div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-b from-green-400 to-green-600 rounded border-2 border-green-700"></div>
                      <span className="text-gray-600">Locked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-b from-blue-400 to-blue-600 rounded border-2 border-blue-700"></div>
                      <span className="text-gray-600">Today</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-b from-teal-400 to-teal-600 rounded border-2 border-teal-700"></div>
                      <span className="text-gray-600">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-gradient-to-b from-gray-200 to-gray-300 rounded border-2 border-gray-400"></div>
                      <span className="text-gray-600">Future</span>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-teal-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading day books...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-6">
                    {dayBooks.map((day) => (
                      <button
                        key={day.date}
                        onClick={() => handleBookClick(day)}
                        disabled={!day.isAccessible}
                        className={`
                          relative group
                          bg-gradient-to-b ${getBookColor(day)}
                          rounded-lg shadow-lg hover:shadow-2xl
                          transform transition-all duration-300
                          ${day.isAccessible ? 'hover:-translate-y-2 hover:scale-105 cursor-pointer' : 'cursor-not-allowed opacity-60'}
                          border-4
                          h-48
                          flex flex-col items-center justify-center
                          p-4
                        `}
                      >
                        {/* Book Spine Effect */}
                        <div className="absolute top-0 left-0 w-full h-full">
                          <div className="absolute top-0 left-0 w-2 h-full bg-black/10"></div>
                          <div className="absolute bottom-0 left-0 w-full h-2 bg-black/10"></div>
                        </div>

                        {/* Day Number - Engraved */}
                        <div className="relative z-10 text-center">
                          <div className="text-5xl font-bold text-white drop-shadow-lg mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                            {day.dayNumber}
                          </div>
                          <div className="text-xs font-semibold text-white/90 uppercase tracking-wider">
                            {formatDate(day.date)}
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="absolute bottom-2 left-2 right-2 flex flex-col gap-1">
                          {day.isLocked && (
                            <div className="flex items-center justify-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                              <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs font-bold text-green-700">Locked</span>
                            </div>
                          )}
                          {day.hasMom && (
                            <div className="flex items-center justify-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                              <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                              </svg>
                              <span className="text-xs font-bold text-purple-700">MOM</span>
                            </div>
                          )}
                          {day.snapCount > 0 && (
                            <div className="flex items-center justify-center gap-1 bg-white/90 rounded-full px-2 py-0.5">
                              <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs font-bold text-teal-700">{day.snapCount}</span>
                            </div>
                          )}
                        </div>

                        {/* Hover Glow Effect */}
                        {day.isAccessible && (
                          <div className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/20 transition-all duration-300"></div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
