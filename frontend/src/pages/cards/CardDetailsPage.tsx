import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cardsApi } from '../../services/api/cards';
import { workflowApi } from '../../services/api/workflow';
import { teamMembersApi } from '../../services/api/teamMembers';
import { sprintsApi } from '../../services/api/sprints';
import {
  Card,
  CardStatus,
  CardRAG,
  CardPriority,
  CardType,
  CardActivity,
  CardComment,
  CardCommentType,
  WorkflowTemplate,
} from '../../types/card';
import { TeamMember } from '../../types/teamMember';
import { Sprint } from '../../types/sprint';
import AppLayout from '../../components/AppLayout';
import SnapsList from '../../components/snaps/SnapsList';

const PRIORITY_CONFIG: Record<CardPriority, { label: string; color: string; dot: string }> = {
  [CardPriority.LOW]: { label: 'Low', color: 'text-gray-600', dot: 'bg-gray-400' },
  [CardPriority.MEDIUM]: { label: 'Medium', color: 'text-blue-600', dot: 'bg-blue-400' },
  [CardPriority.HIGH]: { label: 'High', color: 'text-orange-600', dot: 'bg-orange-400' },
  [CardPriority.CRITICAL]: { label: 'Critical', color: 'text-red-600', dot: 'bg-red-500' },
};

const RAG_CONFIG: Record<CardRAG, { label: string; bg: string; text: string }> = {
  [CardRAG.RED]: { label: 'Red', bg: 'bg-red-100', text: 'text-red-700' },
  [CardRAG.AMBER]: { label: 'Amber', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  [CardRAG.GREEN]: { label: 'Green', bg: 'bg-green-100', text: 'text-green-700' },
};

const TYPE_CONFIG: Record<CardType, { label: string; bg: string; text: string }> = {
  [CardType.EPIC]: { label: 'Epic', bg: 'bg-purple-100', text: 'text-purple-700' },
  [CardType.CARD]: { label: 'Card', bg: 'bg-blue-100', text: 'text-blue-700' },
  [CardType.SUB_CARD]: { label: 'Sub-card', bg: 'bg-gray-100', text: 'text-gray-600' },
};

export default function CardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [card, setCard] = useState<Card | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowTemplate | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activity, setActivity] = useState<CardActivity | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'activity' | 'snaps'>('details');
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Inline edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (id) loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const cardData = await cardsApi.getById(id!);
      setCard(cardData);
      setFieldValues({
        title: cardData.title,
        description: cardData.description || '',
        acceptanceCriteria: cardData.acceptanceCriteria || '',
        storyPoints: cardData.storyPoints ?? '',
        estimatedTime: cardData.estimatedTime,
        priority: cardData.priority,
        dueDate: cardData.dueDate ? cardData.dueDate.split('T')[0] : '',
        labels: (cardData.labels || []).join(', '),
      });

      if (cardData.project?.id) {
        const [wf, members, sprintList] = await Promise.all([
          workflowApi.getDefaultWorkflow(cardData.project.id).catch(() => null),
          teamMembersApi.getProjectTeam(cardData.project.id).catch(() => []),
          sprintsApi.getAll({ projectId: cardData.project.id }).catch(() => []),
        ]);
        setWorkflow(wf);
        setTeamMembers(members);
        setSprints(sprintList);
      }

      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveField = async (field: string, value: any) => {
    if (!card) return;
    setSaving(true);
    try {
      let payload: any = {};

      if (field === 'labels') {
        payload.labels = value ? value.split(',').map((l: string) => l.trim()).filter(Boolean) : [];
      } else if (field === 'storyPoints') {
        payload.storyPoints = value === '' ? undefined : Number(value);
      } else if (field === 'estimatedTime') {
        payload.estimatedTime = Number(value);
      } else if (field === 'dueDate') {
        payload.dueDate = value || null;
      } else {
        payload[field] = value;
      }

      const updated = await cardsApi.update(card.id, payload);
      setCard(updated);
      setFieldValues((prev) => ({ ...prev, [field]: value }));
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const handleLaneChange = async (laneId: string) => {
    if (!card) return;
    setSaving(true);
    try {
      const updated = await cardsApi.moveToLane(card.id, laneId);
      setCard(updated);
      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      alert('Failed to move card: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    if (!card) return;
    setSaving(true);
    try {
      const updated = await cardsApi.update(card.id, { assigneeId: assigneeId || null });
      setCard(updated);
      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      alert('Failed to update assignee: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSprintChange = async (sprintId: string) => {
    if (!card) return;
    setSaving(true);
    try {
      const updated = await cardsApi.update(card.id, { sprintId: sprintId || null });
      setCard(updated);
    } catch (err: any) {
      alert('Failed to update sprint: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !card) return;
    setSubmittingComment(true);
    try {
      await cardsApi.addComment(card.id, newComment.trim());
      setNewComment('');
      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      alert('Failed to add comment: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!card) return;
    setSubmittingComment(true);
    try {
      await cardsApi.updateComment(card.id, commentId, editingCommentBody);
      setEditingCommentId(null);
      setEditingCommentBody('');
      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      alert('Failed to update comment: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!card || !window.confirm('Delete this comment?')) return;
    try {
      await cardsApi.deleteComment(card.id, commentId);
      const act = await cardsApi.getActivity(id!).catch(() => null);
      setActivity(act);
    } catch (err: any) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!card || !window.confirm(`Delete "${card.title}"? This cannot be undone.`)) return;
    try {
      await cardsApi.delete(card.id);
      navigate(`/cards?projectId=${card.project?.id}`);
    } catch (err: any) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const mergedTimeline = activity
    ? [
        ...activity.comments.map((c) => ({ type: 'comment' as const, date: c.createdAt, data: c })),
        ...activity.assignmentHistory.map((h) => ({ type: 'history' as const, date: h.assignedAt, data: h })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const sortedLanes = workflow ? [...workflow.lanes].sort((a, b) => a.order - b.order) : [];

  if (loading && !card) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      </AppLayout>
    );
  }

  if (error && !card) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 text-red-600 p-4 rounded">{error}</div>
        </div>
      </AppLayout>
    );
  }

  if (!card) return null;

  const typeCfg = TYPE_CONFIG[card.cardType] ?? TYPE_CONFIG[CardType.CARD];

  const ragCfg = card.ragStatus ? RAG_CONFIG[card.ragStatus] : null;
  const isLocked = (card.sprint?.isClosed ?? false) || card.status === CardStatus.CLOSED;
  const canEdit = !isLocked && !card.project?.isArchived;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <button onClick={() => navigate(-1)} className="hover:text-primary-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span>/</span>
          <span className="text-gray-400">{card.project?.name}</span>
          <span>/</span>
          <span className="text-gray-700 truncate max-w-xs">{card.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content — left 2/3 */}
          <div className="lg:col-span-2 space-y-4">

            {/* Title + type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${typeCfg.bg} ${typeCfg.text} flex-shrink-0 mt-0.5`}>
                  {typeCfg.label}
                </span>
                {card.externalId && (
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">{card.externalId}</span>
                )}
                {isLocked && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">Locked</span>
                )}
                {saving && <span className="text-xs text-gray-400 italic">Saving…</span>}
              </div>

              {/* Editable title */}
              {editingField === 'title' ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={fieldValues.title}
                    onChange={(e) => setFieldValues((p) => ({ ...p, title: e.target.value }))}
                    className="flex-1 text-xl font-bold border border-primary-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveField('title', fieldValues.title);
                      if (e.key === 'Escape') setEditingField(null);
                    }}
                  />
                  <button onClick={() => saveField('title', fieldValues.title)} className="text-sm text-primary-600 font-medium">Save</button>
                  <button onClick={() => setEditingField(null)} className="text-sm text-gray-400">✕</button>
                </div>
              ) : (
                <h1
                  className={`text-xl font-bold text-gray-900 ${canEdit ? 'cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1' : ''}`}
                  onClick={() => canEdit && setEditingField('title')}
                >
                  {card.title}
                </h1>
              )}

              {/* Labels */}
              <div className="mt-3">
                {editingField === 'labels' ? (
                  <div className="flex gap-2 items-center">
                    <input
                      autoFocus
                      value={fieldValues.labels}
                      onChange={(e) => setFieldValues((p) => ({ ...p, labels: e.target.value }))}
                      placeholder="label1, label2, label3"
                      className="flex-1 text-sm border border-primary-400 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveField('labels', fieldValues.labels);
                        if (e.key === 'Escape') setEditingField(null);
                      }}
                    />
                    <button onClick={() => saveField('labels', fieldValues.labels)} className="text-sm text-primary-600 font-medium">Save</button>
                    <button onClick={() => setEditingField(null)} className="text-sm text-gray-400">✕</button>
                  </div>
                ) : (
                  <div
                    className={`flex flex-wrap gap-1.5 min-h-[24px] ${canEdit ? 'cursor-pointer hover:bg-gray-50 rounded px-1 -ml-1' : ''}`}
                    onClick={() => canEdit && setEditingField('labels')}
                  >
                    {card.labels && card.labels.length > 0 ? (
                      card.labels.map((l) => (
                        <span key={l} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">{l}</span>
                      ))
                    ) : (
                      canEdit && <span className="text-xs text-gray-400 italic">+ Add labels</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100">
                {(['details', 'activity', 'snaps'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? 'border-b-2 border-primary-600 text-primary-600 bg-primary-50'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                    {tab === 'activity' && activity && (
                      <span className="ml-1.5 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                        {activity.comments.filter(c => c.commentType === CardCommentType.COMMENT).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {activeTab === 'details' && (
                  <div className="space-y-5">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Description</label>
                      {editingField === 'description' ? (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            value={fieldValues.description}
                            onChange={(e) => setFieldValues((p) => ({ ...p, description: e.target.value }))}
                            rows={5}
                            className="w-full border border-primary-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveField('description', fieldValues.description)} className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded">Save</button>
                            <button onClick={() => setEditingField(null)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`text-sm text-gray-700 whitespace-pre-wrap rounded-lg p-2 min-h-[60px] ${canEdit ? 'cursor-pointer hover:bg-gray-50 border border-transparent hover:border-gray-200' : ''}`}
                          onClick={() => canEdit && setEditingField('description')}
                        >
                          {card.description || (canEdit ? <span className="text-gray-400 italic">Click to add description…</span> : <span className="text-gray-400">No description</span>)}
                        </div>
                      )}
                    </div>

                    {/* Acceptance Criteria */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Acceptance Criteria</label>
                      {editingField === 'acceptanceCriteria' ? (
                        <div className="space-y-2">
                          <textarea
                            autoFocus
                            value={fieldValues.acceptanceCriteria}
                            onChange={(e) => setFieldValues((p) => ({ ...p, acceptanceCriteria: e.target.value }))}
                            rows={4}
                            placeholder="- Given... When... Then..."
                            className="w-full border border-primary-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => saveField('acceptanceCriteria', fieldValues.acceptanceCriteria)} className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded">Save</button>
                            <button onClick={() => setEditingField(null)} className="text-sm text-gray-500 px-3 py-1.5 rounded">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`text-sm text-gray-700 whitespace-pre-wrap rounded-lg p-2 min-h-[50px] font-mono ${canEdit ? 'cursor-pointer hover:bg-gray-50 border border-transparent hover:border-gray-200' : ''}`}
                          onClick={() => canEdit && setEditingField('acceptanceCriteria')}
                        >
                          {card.acceptanceCriteria || (canEdit ? <span className="text-gray-400 italic font-sans">Click to add acceptance criteria…</span> : <span className="text-gray-400 font-sans">None</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {/* Add comment */}
                    <div>
                      <textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment…"
                        rows={3}
                        disabled={!canEdit}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                      />
                      {newComment.trim() && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={handleAddComment}
                            disabled={submittingComment}
                            className="text-sm text-white bg-primary-600 hover:bg-primary-700 px-4 py-1.5 rounded disabled:bg-gray-400"
                          >
                            {submittingComment ? 'Saving…' : 'Save'}
                          </button>
                          <button onClick={() => setNewComment('')} className="text-sm text-gray-500 px-3 py-1.5 rounded">Cancel</button>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    {mergedTimeline.length === 0 ? (
                      <p className="text-sm text-gray-400 italic text-center py-6">No activity yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {mergedTimeline.map((item, i) => {
                          if (item.type === 'comment') {
                            const comment = item.data as CardComment;
                            const isSystem = comment.commentType === CardCommentType.SYSTEM;
                            const isEditing = editingCommentId === comment.id;
                            return (
                              <div key={comment.id} className={`flex gap-3 ${isSystem ? 'opacity-70' : ''}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${isSystem ? 'bg-gray-100' : 'bg-primary-100'}`}>
                                  {isSystem ? (
                                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <span className="text-xs font-bold text-primary-600">
                                      {comment.author ? `${comment.author.firstName[0]}${comment.author.lastName[0]}` : '?'}
                                    </span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-gray-700">
                                      {isSystem ? 'System' : (comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : 'Unknown')}
                                    </span>
                                    <span className="text-xs text-gray-400">{formatDateTime(comment.createdAt)}</span>
                                    {comment.isEdited && <span className="text-xs text-gray-400">(edited)</span>}
                                  </div>
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <textarea
                                        autoFocus
                                        value={editingCommentBody}
                                        onChange={(e) => setEditingCommentBody(e.target.value)}
                                        rows={3}
                                        className="w-full border border-primary-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      />
                                      <div className="flex gap-2">
                                        <button onClick={() => handleEditComment(comment.id)} disabled={submittingComment} className="text-sm text-white bg-primary-600 px-3 py-1.5 rounded">Save</button>
                                        <button onClick={() => { setEditingCommentId(null); setEditingCommentBody(''); }} className="text-sm text-gray-500 px-3 py-1.5 rounded">Cancel</button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                                      {comment.body}
                                    </div>
                                  )}
                                  {!isSystem && !isEditing && canEdit && (
                                    <div className="flex gap-3 mt-1">
                                      <button
                                        onClick={() => { setEditingCommentId(comment.id); setEditingCommentBody(comment.body); }}
                                        className="text-xs text-gray-400 hover:text-primary-600"
                                      >
                                        Edit
                                      </button>
                                      <button onClick={() => handleDeleteComment(comment.id)} className="text-xs text-gray-400 hover:text-red-500">Delete</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          } else {
                            const hist = item.data as any;
                            const assigneeName = hist.user ? `${hist.user.firstName} ${hist.user.lastName}` : 'Unassigned';
                            return (
                              <div key={`hist-${i}`} className="flex gap-3 opacity-70">
                                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">{assigneeName}</span>
                                    {hist.unassignedAt ? (
                                      <> was assigned → handed off on {formatDate(hist.unassignedAt)}</>
                                    ) : (
                                      <> became assignee on {formatDate(hist.assignedAt)}</>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'snaps' && (
                  <SnapsList
                    cardId={card.id}
                    cardTitle={card.title}
                    sprintId={card.sprint?.id || ''}
                    dailyStandupCount={card.sprint?.dailyStandupCount || 1}
                    isLocked={isLocked}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar — right 1/3 */}
          <div className="space-y-4">

            {/* Status & Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</h3>
                {canEdit && (
                  <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                )}
              </div>

              {/* Lane selector */}
              {sortedLanes.length > 0 ? (
                <div className="space-y-1.5">
                  {sortedLanes.map((lane) => (
                    <button
                      key={lane.id}
                      onClick={() => canEdit && handleLaneChange(lane.id)}
                      disabled={!canEdit || saving}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                        card.laneId === lane.id
                          ? 'text-white shadow-sm'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed'
                      }`}
                      style={card.laneId === lane.id ? { backgroundColor: lane.color } : {}}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${card.laneId === lane.id ? 'bg-white/70' : 'bg-gray-300'}`} />
                      {lane.name}
                      {card.laneId === lane.id && <svg className="w-3.5 h-3.5 ml-auto" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400 italic">No workflow configured</div>
              )}

              {/* RAG badge */}
              {ragCfg && (
                <div className={`mt-3 px-3 py-1.5 rounded-lg text-center text-sm font-bold ${ragCfg.bg} ${ragCfg.text}`}>
                  RAG: {ragCfg.label}
                </div>
              )}
            </div>

            {/* Details sidebar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</h3>

              {/* Assignee */}
              <SidebarField label="Assignee">
                <select
                  value={card.assignee?.id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.fullName}</option>
                  ))}
                </select>
              </SidebarField>

              {/* Sprint */}
              <SidebarField label="Sprint">
                <select
                  value={card.sprint?.id || ''}
                  onChange={(e) => handleSprintChange(e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                >
                  <option value="">Backlog (no sprint)</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </SidebarField>

              {/* Priority */}
              <SidebarField label="Priority">
                <select
                  value={card.priority}
                  onChange={(e) => canEdit && saveField('priority', e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </SidebarField>

              {/* Story Points */}
              <SidebarField label="Story Points">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={fieldValues.storyPoints}
                  onChange={(e) => setFieldValues((p) => ({ ...p, storyPoints: e.target.value }))}
                  onBlur={(e) => canEdit && saveField('storyPoints', e.target.value)}
                  disabled={!canEdit || saving}
                  placeholder="—"
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </SidebarField>

              {/* Estimated Time */}
              <SidebarField label="Estimated Hours">
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={fieldValues.estimatedTime}
                  onChange={(e) => setFieldValues((p) => ({ ...p, estimatedTime: e.target.value }))}
                  onBlur={(e) => canEdit && saveField('estimatedTime', e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </SidebarField>

              {/* Due Date */}
              <SidebarField label="Due Date">
                <input
                  type="date"
                  value={fieldValues.dueDate}
                  onChange={(e) => setFieldValues((p) => ({ ...p, dueDate: e.target.value }))}
                  onBlur={(e) => canEdit && saveField('dueDate', e.target.value)}
                  disabled={!canEdit || saving}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
                />
              </SidebarField>

              {/* Dates */}
              <SidebarField label="Created">
                <span className="text-sm text-gray-600">{formatDate(card.createdAt)}</span>
              </SidebarField>

              {card.startedAt && (
                <SidebarField label="Started">
                  <span className="text-sm text-gray-600">{formatDate(card.startedAt)}</span>
                </SidebarField>
              )}

              {card.completedAt && (
                <SidebarField label="Completed">
                  <span className="text-sm text-gray-600">{formatDate(card.completedAt)}</span>
                </SidebarField>
              )}
            </div>

            {/* Assignment History */}
            {activity && activity.assignmentHistory.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ownership History</h3>
                <div className="space-y-2">
                  {[...activity.assignmentHistory]
                    .sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime())
                    .map((h) => {
                      const name = h.user ? `${(h as any).user.firstName} ${(h as any).user.lastName}` : 'Unassigned';
                      const isCurrent = !h.unassignedAt;
                      return (
                        <div key={h.id} className="flex items-start gap-2 text-xs">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold ${isCurrent ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                            {name[0]}
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">{name}</span>
                            {isCurrent && <span className="ml-1.5 text-[10px] bg-primary-50 text-primary-600 px-1.5 rounded-full">current</span>}
                            <div className="text-gray-400 mt-0.5">
                              from {formatDate(h.assignedAt)}
                              {h.unassignedAt && <> to {formatDate(h.unassignedAt)}</>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
