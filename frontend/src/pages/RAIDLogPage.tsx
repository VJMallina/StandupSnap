import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { risksApi } from '../services/api/risks';
import { assumptionsApi } from '../services/api/assumptions';
import { Risk, RiskSeverity } from '../types/risk';
import { Assumption, AssumptionStatus } from '../types/assumption';

interface RAIDSummary {
  risks: {
    total: number;
    open: number;
    closed: number;
    archived: number;
    severityDistribution: {
      LOW: number;
      MEDIUM: number;
      HIGH: number;
      VERY_HIGH: number;
    };
  };
  assumptions: {
    total: number;
    open: number;
    archived: number;
  };
  issues: {
    total: number;
    open: number;
    resolved: number;
    archived: number;
  };
  decisions: {
    total: number;
    made: number;
    pending: number;
    archived: number;
  };
}

type HealthStatus = 'HEALTHY' | 'ATTENTION' | 'AT_RISK';

const RAIDLogPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RAIDSummary>({
    risks: {
      total: 0,
      open: 0,
      closed: 0,
      archived: 0,
      severityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0, VERY_HIGH: 0 },
    },
    assumptions: { total: 0, open: 0, archived: 0 },
    issues: { total: 0, open: 0, resolved: 0, archived: 0 },
    decisions: { total: 0, made: 0, pending: 0, archived: 0 },
  });

  useEffect(() => {
    if (!selectedProjectId) {
      setError('Select a project to view RAID Log.');
      setLoading(false);
      return;
    }

    loadRAIDSummary();
  }, [selectedProjectId]);

  const loadRAIDSummary = async () => {
    if (!selectedProjectId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch all risks for the project (including archived)
      const allRisks = await risksApi.getByProject(selectedProjectId, {
        includeArchived: true,
      });

      // Fetch all assumptions for the project (including archived)
      const allAssumptions = await assumptionsApi.getByProject(selectedProjectId, {
        includeArchived: true,
      });

      // Calculate summaries
      const riskSummary = calculateRiskSummary(allRisks);
      const assumptionSummary = calculateAssumptionSummary(allAssumptions);

      // TODO: Fetch issues, decisions when APIs are ready
      setSummary({
        risks: riskSummary,
        assumptions: assumptionSummary,
        issues: { total: 0, open: 0, resolved: 0, archived: 0 },
        decisions: { total: 0, made: 0, pending: 0, archived: 0 },
      });
    } catch (err: any) {
      console.error('Failed to load RAID summary:', err);
      setError('Unable to load RAID details.');
    } finally {
      setLoading(false);
    }
  };

  const calculateRiskSummary = (risks: Risk[]) => {
    const active = risks.filter(r => !r.isArchived);
    const archived = risks.filter(r => r.isArchived);
    const open = active.filter(r => r.status === 'OPEN' || r.status === 'IN_PROGRESS');
    const closed = active.filter(r => r.status === 'MITIGATED' || r.status === 'CLOSED');

    const severityDistribution = {
      LOW: active.filter(r => r.severity === 'LOW').length,
      MEDIUM: active.filter(r => r.severity === 'MEDIUM').length,
      HIGH: active.filter(r => r.severity === 'HIGH').length,
      VERY_HIGH: active.filter(r => r.severity === 'VERY_HIGH').length,
    };

    return {
      total: active.length,
      open: open.length,
      closed: closed.length,
      archived: archived.length,
      severityDistribution,
    };
  };

  const calculateAssumptionSummary = (assumptions: Assumption[]) => {
    const active = assumptions.filter(a => !a.isArchived);
    const archived = assumptions.filter(a => a.isArchived);
    const open = active.filter(a => a.status === AssumptionStatus.OPEN);

    return {
      total: active.length,
      open: open.length,
      archived: archived.length,
    };
  };

  const calculateHealthStatus = (): HealthStatus => {
    const { risks, issues } = summary;

    // High priority: Very High or High severity open risks
    if (risks.severityDistribution.VERY_HIGH > 0 || risks.severityDistribution.HIGH > 0) {
      return 'AT_RISK';
    }

    // Medium priority: Medium severity risks or multiple open issues
    if (risks.severityDistribution.MEDIUM > 0 || issues.open > 3) {
      return 'ATTENTION';
    }

    return 'HEALTHY';
  };

  const getHealthColor = (status: HealthStatus): string => {
    switch (status) {
      case 'AT_RISK': return 'text-red-600 bg-red-50';
      case 'ATTENTION': return 'text-amber-600 bg-amber-50';
      case 'HEALTHY': return 'text-green-600 bg-green-50';
    }
  };

  const getHealthLabel = (status: HealthStatus): string => {
    switch (status) {
      case 'AT_RISK': return 'At Risk';
      case 'ATTENTION': return 'Attention Needed';
      case 'HEALTHY': return 'Healthy';
    }
  };

  const healthStatus = calculateHealthStatus();

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="p-6 flex items-center justify-center h-96">
          <div className="text-center">
            <svg className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-600 text-lg">Select a project to view RAID Log.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ArtifactsNavigation />
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RAID Log</h1>
            <p className="text-gray-600 mt-1">
              Risks, Assumptions, Issues, and Decisions
            </p>
          </div>

          {/* RAID Health Indicator */}
          <div className={`px-6 py-3 rounded-lg border-2 ${getHealthColor(healthStatus)}`}>
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase">RAID Health</span>
                <span className="text-lg font-bold">{getHealthLabel(healthStatus)}</span>
              </div>
              <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20">
                {healthStatus === 'HEALTHY' && (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                )}
                {healthStatus === 'ATTENTION' && (
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                )}
                {healthStatus === 'AT_RISK' && (
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                )}
              </svg>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading RAID summary...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        )}

        {/* RAID Summary Widgets */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Risk Summary Widget */}
            <div
              onClick={() => navigate('/artifacts/risks')}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-red-500"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risks</h3>
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">{summary.risks.total}</span>
                  <span className="text-sm text-gray-500">Total Active</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Open</span>
                    <span className="font-semibold text-blue-600">{summary.risks.open}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Closed</span>
                    <span className="font-semibold text-green-600">{summary.risks.closed}</span>
                  </div>
                </div>

                {summary.risks.total > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-gray-500 mb-1">Severity</div>
                    <div className="flex gap-1">
                      {summary.risks.severityDistribution.VERY_HIGH > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                          VH: {summary.risks.severityDistribution.VERY_HIGH}
                        </span>
                      )}
                      {summary.risks.severityDistribution.HIGH > 0 && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                          H: {summary.risks.severityDistribution.HIGH}
                        </span>
                      )}
                      {summary.risks.severityDistribution.MEDIUM > 0 && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                          M: {summary.risks.severityDistribution.MEDIUM}
                        </span>
                      )}
                      {summary.risks.severityDistribution.LOW > 0 && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          L: {summary.risks.severityDistribution.LOW}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
                  View Risks
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Assumptions Summary Widget */}
            <div
              onClick={() => navigate('/artifacts/raid-log/assumptions')}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-blue-500"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assumptions</h3>
                <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">{summary.assumptions.total}</span>
                  <span className="text-sm text-gray-500">Total</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Open</span>
                    <span className="font-semibold text-blue-600">{summary.assumptions.open}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Archived</span>
                    <span className="font-semibold text-gray-600">{summary.assumptions.archived}</span>
                  </div>
                </div>

                {summary.assumptions.total === 0 && (
                  <div className="pt-2 text-sm text-gray-400 italic">
                    No assumptions yet
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View Assumptions
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Issues Summary Widget */}
            <div
              onClick={() => navigate('/artifacts/raid-log/issues')}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-amber-500"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Issues</h3>
                <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">{summary.issues.total}</span>
                  <span className="text-sm text-gray-500">Total</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Open</span>
                    <span className="font-semibold text-amber-600">{summary.issues.open}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Resolved</span>
                    <span className="font-semibold text-green-600">{summary.issues.resolved}</span>
                  </div>
                </div>

                {summary.issues.total === 0 && (
                  <div className="pt-2 text-sm text-gray-400 italic">
                    No issues yet
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1">
                  View Issues
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Decisions Summary Widget */}
            <div
              onClick={() => navigate('/artifacts/raid-log/decisions')}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-lg transition-shadow border-l-4 border-purple-500"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Decisions</h3>
                <svg className="h-8 w-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">{summary.decisions.total}</span>
                  <span className="text-sm text-gray-500">Total</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Made</span>
                    <span className="font-semibold text-green-600">{summary.decisions.made}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-500">Pending</span>
                    <span className="font-semibold text-purple-600">{summary.decisions.pending}</span>
                  </div>
                </div>

                {summary.decisions.total === 0 && (
                  <div className="pt-2 text-sm text-gray-400 italic">
                    No decisions yet
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                  View Decisions
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Info */}
        {!loading && !error && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="h-6 w-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  <strong>RAID Log</strong> helps you track and manage project challenges. Click on any widget above to view details or add new items.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default RAIDLogPage;
