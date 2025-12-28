import React, { useState, useEffect } from 'react';
import {
  Risk,
  CreateRiskInput,
  UpdateRiskInput,
  RiskType,
  ProbabilityLevel,
  ImpactLevel,
  RiskStrategy,
  RiskStatus,
} from '../../types/risk';
import { TeamMember } from '../../types/teamMember';
import { useRiskCalculation } from '../../hooks/useRiskCalculation';
import { RiskScoreDisplay } from './RiskScoreDisplay';

interface RiskFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  risk?: Risk | null;
  projectId: string;
  teamMembers: TeamMember[];
  onClose: () => void;
  onSubmit: (data: CreateRiskInput | UpdateRiskInput) => Promise<void>;
  isLoading?: boolean;
}

export const RiskFormModal: React.FC<RiskFormModalProps> = ({
  isOpen,
  mode,
  risk,
  projectId,
  teamMembers,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const { calculateScores } = useRiskCalculation();

  // Keyboard ESC support
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Form state
  const [formData, setFormData] = useState({
    // A. Identification
    title: '',
    riskType: 'THREAT' as RiskType,
    category: '',
    dateIdentified: new Date().toISOString().split('T')[0],
    riskStatement: '',
    currentStatusAssumptions: '',

    // B. Assessment
    probability: 'MEDIUM' as ProbabilityLevel,
    costImpact: '' as ImpactLevel | '',
    timeImpact: '' as ImpactLevel | '',
    scheduleImpact: '' as ImpactLevel | '',
    rationale: '',

    // C. Response & Ownership
    strategy: 'MITIGATE' as RiskStrategy,
    mitigationPlan: '',
    contingencyPlan: '',
    ownerId: '',
    targetClosureDate: '',

    // D. Status
    status: 'OPEN' as RiskStatus,
    progressNotes: '',
  });

  // Load existing risk data in edit mode
  useEffect(() => {
    if (mode === 'edit' && risk) {
      setFormData({
        title: risk.title,
        riskType: risk.riskType,
        category: risk.category,
        dateIdentified: risk.dateIdentified.split('T')[0],
        riskStatement: risk.riskStatement,
        currentStatusAssumptions: risk.currentStatusAssumptions || '',

        probability: risk.probability,
        costImpact: risk.costImpact || '',
        timeImpact: risk.timeImpact || '',
        scheduleImpact: risk.scheduleImpact || '',
        rationale: risk.rationale || '',

        strategy: risk.strategy,
        mitigationPlan: risk.mitigationPlan || '',
        contingencyPlan: risk.contingencyPlan || '',
        ownerId: risk.owner.id,
        targetClosureDate: risk.targetClosureDate ? risk.targetClosureDate.split('T')[0] : '',

        status: risk.status,
        progressNotes: risk.progressNotes || '',
      });
    } else if (mode === 'create') {
      // Reset form for create mode
      setFormData({
        title: '',
        riskType: 'THREAT',
        category: '',
        dateIdentified: new Date().toISOString().split('T')[0],
        riskStatement: '',
        currentStatusAssumptions: '',
        probability: 'MEDIUM',
        costImpact: '',
        timeImpact: '',
        scheduleImpact: '',
        rationale: '',
        strategy: 'MITIGATE',
        mitigationPlan: '',
        contingencyPlan: '',
        ownerId: '',
        targetClosureDate: '',
        status: 'OPEN',
        progressNotes: '',
      });
    }
  }, [mode, risk, isOpen]);

  // Calculate scores in real-time
  const metrics = calculateScores(
    formData.probability,
    formData.costImpact || undefined,
    formData.timeImpact || undefined,
    formData.scheduleImpact || undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.title) {
      alert('Please enter a risk title');
      return;
    }
    if (!formData.category) {
      alert('Please enter a category');
      return;
    }
    if (!formData.riskStatement) {
      alert('Please enter a risk statement');
      return;
    }
    if (!formData.ownerId || formData.ownerId.trim() === '') {
      if (teamMembers.length === 0) {
        alert('No team members available. Please add team members to the project first.');
      } else {
        alert('Please select a risk owner');
      }
      return;
    }

    const payload: any = {
      ...formData,
      costImpact: formData.costImpact || undefined,
      timeImpact: formData.timeImpact || undefined,
      scheduleImpact: formData.scheduleImpact || undefined,
      ownerId: formData.ownerId.trim(), // Required field - ensure no whitespace
      targetClosureDate: formData.targetClosureDate || undefined,
      currentStatusAssumptions: formData.currentStatusAssumptions || undefined,
      rationale: formData.rationale || undefined,
      mitigationPlan: formData.mitigationPlan || undefined,
      contingencyPlan: formData.contingencyPlan || undefined,
      progressNotes: formData.progressNotes || undefined,
    };

    if (mode === 'create') {
      payload.projectId = projectId;
    }

    console.log('=== RISK FORM DEBUG ===');
    console.log('Form Data ownerId:', formData.ownerId);
    console.log('Payload ownerId:', payload.ownerId);
    console.log('ownerId type:', typeof payload.ownerId);
    console.log('ownerId length:', payload.ownerId?.length);
    console.log('Available team members:', teamMembers.map(m => ({ id: m.id, name: m.fullName })));
    console.log('Full payload:', JSON.stringify(payload, null, 2));
    console.log('======================');

    await onSubmit(payload);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 px-6 py-4 rounded-t-xl flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">
            {mode === 'create' ? 'Add New Risk' : 'Edit Risk'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* A. Identification Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">A. Identification</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.riskType}
                  onChange={(e) => setFormData({ ...formData, riskType: e.target.value as RiskType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="THREAT">Threat</option>
                  <option value="OPPORTUNITY">Opportunity</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., Technical, Financial, Schedule"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Identified
                </label>
                <input
                  type="date"
                  value={formData.dateIdentified}
                  onChange={(e) => setFormData({ ...formData, dateIdentified: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Risk Statement <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.riskStatement}
                onChange={(e) => setFormData({ ...formData, riskStatement: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe the risk in detail..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Status / Assumptions
              </label>
              <textarea
                rows={2}
                value={formData.currentStatusAssumptions}
                onChange={(e) => setFormData({ ...formData, currentStatusAssumptions: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* B. Assessment Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">B. Assessment</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Probability <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: e.target.value as ProbabilityLevel })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="VERY_HIGH">Very High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost Impact
                </label>
                <select
                  value={formData.costImpact}
                  onChange={(e) => setFormData({ ...formData, costImpact: e.target.value as ImpactLevel | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="VERY_HIGH">Very High</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Impact
                </label>
                <select
                  value={formData.timeImpact}
                  onChange={(e) => setFormData({ ...formData, timeImpact: e.target.value as ImpactLevel | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="VERY_HIGH">Very High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule Impact
                </label>
                <select
                  value={formData.scheduleImpact}
                  onChange={(e) => setFormData({ ...formData, scheduleImpact: e.target.value as ImpactLevel | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="VERY_HIGH">Very High</option>
                </select>
              </div>
            </div>

            {/* Auto-Calculated Scores */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <RiskScoreDisplay {...metrics} compact={false} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rationale
              </label>
              <textarea
                rows={2}
                value={formData.rationale}
                onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Explain the reasoning behind the assessment..."
              />
            </div>
          </div>

          {/* C. Response & Ownership Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">C. Response & Ownership</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strategy <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.strategy}
                  onChange={(e) => setFormData({ ...formData, strategy: e.target.value as RiskStrategy })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="AVOID">Avoid</option>
                  <option value="MITIGATE">Mitigate</option>
                  <option value="ACCEPT">Accept</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="EXPLOIT">Exploit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Owner <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.ownerId}
                  onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={teamMembers.length === 0}
                >
                  <option value="">
                    {teamMembers.length === 0 ? 'No team members available' : 'Select owner...'}
                  </option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName || member.fullName}
                    </option>
                  ))}
                </select>
                {teamMembers.length === 0 && (
                  <p className="mt-1 text-sm text-red-600">
                    Please add team members to the project before creating a risk.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mitigation Plan
              </label>
              <textarea
                rows={3}
                value={formData.mitigationPlan}
                onChange={(e) => setFormData({ ...formData, mitigationPlan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe the plan to mitigate this risk..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contingency Plan
              </label>
              <textarea
                rows={3}
                value={formData.contingencyPlan}
                onChange={(e) => setFormData({ ...formData, contingencyPlan: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe the contingency plan if the risk occurs..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Closure Date
              </label>
              <input
                type="date"
                value={formData.targetClosureDate}
                onChange={(e) => setFormData({ ...formData, targetClosureDate: e.target.value })}
                min={formData.dateIdentified}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* D. Status Tracking Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">D. Status Tracking</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RiskStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="MITIGATED">Mitigated</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Progress Notes
              </label>
              <textarea
                rows={3}
                value={formData.progressNotes}
                onChange={(e) => setFormData({ ...formData, progressNotes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Add notes about the progress..."
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end rounded-b-xl border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 text-white bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg hover:from-primary-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Risk' : 'Update Risk'}
          </button>
        </div>
      </div>
    </div>
  );
};
