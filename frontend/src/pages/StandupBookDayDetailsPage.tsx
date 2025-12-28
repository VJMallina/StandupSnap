import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../constants/roles';
import { standupBookApi } from '../services/api/standupbook';
import { sprintsApi } from '../services/api/sprints';
import { Sprint } from '../types/sprint';
import { DayMetadata, SlotGroup, DailyLock, Mom } from '../types/standupbook';
import AppLayout from '../components/AppLayout';
import LockDayWarningModal from '../components/LockDayWarningModal';

export default function StandupBookDayDetailsPage() {
  const { sprintId, date } = useParams<{ sprintId: string; date: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [dayMetadata, setDayMetadata] = useState<DayMetadata | null>(null);
  const [slotsData, setSlotsData] = useState<SlotGroup[]>([]);
  const [dailyLock, setDailyLock] = useState<DailyLock | null>(null);
  const [dayMom, setDayMom] = useState<Mom | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLockWarning, setShowLockWarning] = useState(false);
  const [emptySlots, setEmptySlots] = useState<number[]>([]);
  const [showMomModal, setShowMomModal] = useState(false);
  const [momRawInput, setMomRawInput] = useState('');
  const [generatingMom, setGeneratingMom] = useState(false);
  const [isEditingMom, setIsEditingMom] = useState(false);
  const [editMomData, setEditMomData] = useState<{
    agenda: string;
    keyDiscussionPoints: string;
    decisionsTaken: string;
    actionItems: string;
  } | null>(null);

  useEffect(() => {
    if (sprintId && date) {
      loadDayData();
    }
  }, [sprintId, date]);

  const loadDayData = async () => {
    if (!sprintId || !date) return;

    try {
      setLoading(true);
      const [sprintData, metadata, slots, lock, mom] = await Promise.all([
        sprintsApi.getById(sprintId),
        standupBookApi.getDayMetadata(sprintId, date),
        standupBookApi.getSnapsGroupedBySlots(sprintId, date),
        standupBookApi.getDailyLock(sprintId, date).catch(() => null),
        standupBookApi.getMomByDate(sprintId, date).catch(() => null),
      ]);

      setSprint(sprintData);
      setDayMetadata(metadata);
      setSlotsData(slots);
      setDailyLock(lock);
      setDayMom(mom);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLockDay = () => {
    if (!sprintId || !date) return;

    // Check for empty slots on multi-standup days
    if (dayMetadata && dayMetadata.standupSlotCount >= 2) {
      const empty = slotsData
        .filter(slot => slot.snaps.length === 0)
        .map(slot => slot.slotNumber);

      if (empty.length > 0) {
        setEmptySlots(empty);
        setShowLockWarning(true);
        return;
      }
    }

    confirmLockDay();
  };

  const confirmLockDay = async () => {
    try {
      await standupBookApi.lockDay({
        sprintId: sprintId!,
        date: date!,
      });
      setShowLockWarning(false);
      await loadDayData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateMom = async () => {
    if (!momRawInput.trim()) {
      setError('Please enter some notes or upload a transcript');
      return;
    }

    try {
      setGeneratingMom(true);
      const generated = await standupBookApi.generateMom({ rawInput: momRawInput });

      await standupBookApi.createMom({
        sprintId: sprintId!,
        date: date!,
        rawInput: momRawInput,
        agenda: generated.agenda,
        keyDiscussionPoints: generated.keyDiscussionPoints,
        decisionsTaken: generated.decisionsTaken,
        actionItems: generated.actionItems,
      });

      setShowMomModal(false);
      setMomRawInput('');
      await loadDayData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingMom(false);
    }
  };

  const handleDownloadMom = async () => {
    if (!dayMom) return;

    try {
      await standupBookApi.downloadMom(dayMom.id, 'txt');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditMom = () => {
    if (!dayMom) return;

    setIsEditingMom(true);
    setMomRawInput(dayMom.rawInput || '');
    setEditMomData({
      agenda: dayMom.agenda || '',
      keyDiscussionPoints: dayMom.keyDiscussionPoints || '',
      decisionsTaken: dayMom.decisionsTaken || '',
      actionItems: dayMom.actionItems || '',
    });
    setShowMomModal(true);
  };

  const handleUpdateMom = async () => {
    if (!dayMom || !editMomData) return;

    try {
      setGeneratingMom(true);
      await standupBookApi.updateMom(dayMom.id, {
        rawInput: momRawInput,
        ...editMomData,
      });

      setShowMomModal(false);
      setIsEditingMom(false);
      setMomRawInput('');
      setEditMomData(null);
      await loadDayData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingMom(false);
    }
  };

  const handleRegenerateMom = async () => {
    if (!momRawInput.trim()) {
      setError('Please enter some notes or upload a transcript');
      return;
    }

    try {
      setGeneratingMom(true);
      const generated = await standupBookApi.generateMom({ rawInput: momRawInput });

      setEditMomData({
        agenda: generated.agenda || '',
        keyDiscussionPoints: generated.keyDiscussionPoints || '',
        decisionsTaken: generated.decisionsTaken || '',
        actionItems: generated.actionItems || '',
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingMom(false);
    }
  };

  const handleCloseMomModal = () => {
    setShowMomModal(false);
    setIsEditingMom(false);
    setMomRawInput('');
    setEditMomData(null);
    setError(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && !dayMetadata) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading day details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-primary-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mb-6 shadow-sm">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {dayMetadata && (
            <>
              {/* Compact Header Bar */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg rounded-2xl p-5 mb-6 border border-primary-500">
                <div className="flex items-center justify-between gap-4">
                  {/* Left: Back button & Day info */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => navigate(`/standup-book?sprint=${sprintId}`)}
                      className="flex items-center gap-2 text-white/90 hover:text-white transition-colors group bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg"
                    >
                      <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      <span className="font-medium text-sm">Back</span>
                    </button>

                    <div className="flex items-center gap-3 pl-4 border-l border-white/30">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-2xl font-bold text-white">Day {dayMetadata.dayNumber}</h1>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            dayMetadata.isLocked
                              ? 'bg-green-400 text-green-900'
                              : dayMetadata.dayStatus === 'in_progress'
                              ? 'bg-blue-400 text-blue-900'
                              : 'bg-gray-300 text-gray-700'
                          }`}>
                            {dayMetadata.isLocked ? 'Locked' : dayMetadata.dayStatus === 'in_progress' ? 'In Progress' : 'Not Started'}
                          </span>
                        </div>
                        <p className="text-primary-100 text-sm">{formatDate(dayMetadata.date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Center: Stats */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{dayMetadata.totalSnaps}</p>
                      <p className="text-xs text-primary-100">Snaps</p>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{dayMetadata.totalCards}</p>
                      <p className="text-xs text-primary-100">Cards</p>
                    </div>
                    <div className="w-px h-8 bg-white/30"></div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{dayMetadata.standupSlotCount}</p>
                      <p className="text-xs text-primary-100">Slots</p>
                    </div>
                  </div>

                  {/* Right: Lock button */}
                  {hasPermission(Permission.EDIT_SPRINT) && !dayMetadata.isLocked && (
                    <button
                      onClick={handleLockDay}
                      className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-2.5 rounded-lg transition-all shadow-md hover:shadow-lg font-medium text-sm border border-white/30"
                    >
                      Lock Day
                    </button>
                  )}
                </div>
              </div>

              {/* Daily Summary (Post-Lock) */}
              {dailyLock && dailyLock.isLocked && (
                <div className="bg-gradient-to-br from-white to-green-50/30 shadow-lg rounded-2xl p-6 mb-6 border border-green-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Daily Standup Summary</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-green-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <div className="text-sm font-bold text-green-700 uppercase tracking-wide">Done</div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {dailyLock.dailySummaryDone || 'No updates'}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <div className="text-sm font-bold text-blue-700 uppercase tracking-wide">To Do</div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {dailyLock.dailySummaryToDo || 'No updates'}
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-5 shadow-sm border border-red-100">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <div className="text-sm font-bold text-red-700 uppercase tracking-wide">Blockers</div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                        {dailyLock.dailySummaryBlockers || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Standup Slots */}
              <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Standup Activities</h3>
                </div>

                {slotsData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading standup slots...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {slotsData.map((slot) => (
                      <div key={slot.slotNumber} className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <h4 className="text-lg font-bold text-primary-700">
                              Slot {slot.slotNumber}
                            </h4>
                            {sprint?.slotTimes?.[slot.slotNumber.toString()] && (
                              <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-200">
                                {sprint.slotTimes[slot.slotNumber.toString()]}
                              </span>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-semibold">
                            {slot.snaps.length} snap{slot.snaps.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {slot.snaps.length === 0 ? (
                          <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
                            <p className="text-gray-400">No updates yet for this slot</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {slot.snaps.map((snap) => (
                              <div key={snap.id} className="bg-white p-5 rounded-lg border-l-4 border-primary-500 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                  <div className="font-semibold text-gray-900">{snap.card?.title || 'Untitled Card'}</div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(snap.createdAt).toLocaleTimeString()}
                                  </div>
                                </div>

                                {snap.done && (
                                  <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <div className="text-xs font-bold text-green-700 uppercase tracking-wide">Done</div>
                                    </div>
                                    <div className="text-sm text-gray-700 pl-4">{snap.done}</div>
                                  </div>
                                )}

                                {snap.toDo && (
                                  <div className="mb-3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                      <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">To Do</div>
                                    </div>
                                    <div className="text-sm text-gray-700 pl-4">{snap.toDo}</div>
                                  </div>
                                )}

                                {snap.blockers && (
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                      <div className="text-xs font-bold text-red-700 uppercase tracking-wide">Blockers</div>
                                    </div>
                                    <div className="text-sm text-gray-700 pl-4">{snap.blockers}</div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* MOM Section */}
              <div className="bg-gradient-to-br from-white to-purple-50/20 shadow-lg rounded-2xl p-6 mb-6 border border-purple-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Minutes of Meeting</h3>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission(Permission.EDIT_SPRINT) && !dayMetadata?.isLocked && !dayMom && (
                      <button
                        onClick={() => setShowMomModal(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm"
                      >
                        Create MOM
                      </button>
                    )}
                    {dayMom && (
                      <>
                        {hasPermission(Permission.EDIT_SPRINT) && !dayMetadata?.isLocked && (
                          <button
                            onClick={handleEditMom}
                            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm"
                          >
                            Edit MOM
                          </button>
                        )}
                        <button
                          onClick={handleDownloadMom}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                        >
                          Download MOM
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {dayMom ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {dayMom.agenda && (
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Agenda</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {dayMom.agenda}
                        </div>
                      </div>
                    )}
                    {dayMom.keyDiscussionPoints && (
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Key Discussion Points</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {dayMom.keyDiscussionPoints}
                        </div>
                      </div>
                    )}
                    {dayMom.decisionsTaken && (
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Decisions Taken</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {dayMom.decisionsTaken}
                        </div>
                      </div>
                    )}
                    {dayMom.actionItems && (
                      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                        <div className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Action Items</div>
                        <div className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                          {dayMom.actionItems}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-400 text-lg">No MOM created for this day yet</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <LockDayWarningModal
        isOpen={showLockWarning}
        onClose={() => setShowLockWarning(false)}
        onConfirm={confirmLockDay}
        emptySlots={emptySlots}
        totalSlots={dayMetadata?.standupSlotCount || 1}
      />

      {/* Create/Edit MOM Modal */}
      {showMomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {isEditingMom ? 'Edit Minutes of Meeting' : 'Create Minutes of Meeting'}
                </h2>
                <button
                  onClick={handleCloseMomModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Notes / Transcript
                </label>
                <textarea
                  value={momRawInput}
                  onChange={(e) => setMomRawInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={6}
                  placeholder="Enter your meeting notes or paste a transcript here."
                />
              </div>

              {isEditingMom && editMomData && (
                <>
                  <div className="mb-4">
                    <button
                      onClick={handleRegenerateMom}
                      disabled={generatingMom || !momRawInput.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
                    >
                      {generatingMom ? 'Regenerating...' : 'Regenerate with AI'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Click to regenerate the structured fields from the meeting notes above
                    </p>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Agenda
                      </label>
                      <textarea
                        value={editMomData.agenda}
                        onChange={(e) => setEditMomData({ ...editMomData, agenda: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={2}
                        placeholder="Meeting agenda and topics discussed"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Discussion Points
                      </label>
                      <textarea
                        value={editMomData.keyDiscussionPoints}
                        onChange={(e) => setEditMomData({ ...editMomData, keyDiscussionPoints: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Important points, insights, and discussions"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Decisions Taken
                      </label>
                      <textarea
                        value={editMomData.decisionsTaken}
                        onChange={(e) => setEditMomData({ ...editMomData, decisionsTaken: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Specific decisions, conclusions, or agreements reached"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action Items
                      </label>
                      <textarea
                        value={editMomData.actionItems}
                        onChange={(e) => setEditMomData({ ...editMomData, actionItems: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        rows={3}
                        placeholder="Tasks, follow-ups, or action items assigned"
                      />
                    </div>
                  </div>
                </>
              )}

              {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleCloseMomModal}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                {isEditingMom ? (
                  <button
                    onClick={handleUpdateMom}
                    disabled={generatingMom}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {generatingMom ? 'Updating...' : 'Update MOM'}
                  </button>
                ) : (
                  <button
                    onClick={handleGenerateMom}
                    disabled={generatingMom || !momRawInput.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {generatingMom ? 'Generating...' : 'Generate MOM with AI'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
