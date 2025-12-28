import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import ArtifactsNavigation from '../components/artifacts/ArtifactsNavigation';
import { useProjectSelection } from '../context/ProjectSelectionContext';
import { stakeholdersApi } from '../services/api/stakeholders';
import {
  Stakeholder,
  StakeholderFilters,
  PowerLevel,
  InterestLevel,
  StakeholderQuadrant,
} from '../types/stakeholder';
import { StakeholderDetailPanel } from '../components/stakeholders/StakeholderDetailPanel';

const PowerInterestGridPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectSelection();

  // State
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<StakeholderFilters>({
    includeArchived: false,
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Panel
  const [selectedStakeholder, setSelectedStakeholder] = useState<Stakeholder | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);

  // Hover state
  const [hoveredStakeholder, setHoveredStakeholder] = useState<Stakeholder | null>(null);

  // Fetch stakeholders
  useEffect(() => {
    if (!selectedProjectId) {
      navigate('/artifacts');
      return;
    }

    fetchData();
  }, [selectedProjectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Only fetch active stakeholders (exclude archived)
      const activeStakeholders = await stakeholdersApi.getByProject(selectedProjectId!, {
        ...filters,
        search: searchQuery || undefined,
        includeArchived: false,
      });
      setStakeholders(activeStakeholders);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load stakeholders');
    } finally {
      setLoading(false);
    }
  };

  // Calculate dot position based on power and interest levels
  const getPowerPosition = (power: PowerLevel): number => {
    switch (power) {
      case PowerLevel.LOW:
        return 20; // 20% from left
      case PowerLevel.MEDIUM:
        return 50; // 50% from left
      case PowerLevel.HIGH:
        return 80; // 80% from left
      default:
        return 50;
    }
  };

  const getInterestPosition = (interest: InterestLevel): number => {
    switch (interest) {
      case InterestLevel.LOW:
        return 80; // 80% from top (inverted Y-axis)
      case InterestLevel.MEDIUM:
        return 50; // 50% from top
      case InterestLevel.HIGH:
        return 20; // 20% from top
      default:
        return 50;
    }
  };

  // Get dot color based on quadrant
  const getDotColor = (quadrant: StakeholderQuadrant): string => {
    switch (quadrant) {
      case StakeholderQuadrant.MANAGE_CLOSELY:
        return 'bg-red-500 border-red-600'; // High Power + High Interest
      case StakeholderQuadrant.KEEP_SATISFIED:
        return 'bg-amber-500 border-amber-600'; // High Power + Low Interest
      case StakeholderQuadrant.KEEP_INFORMED:
        return 'bg-blue-500 border-blue-600'; // Low Power + High Interest
      case StakeholderQuadrant.MONITOR:
        return 'bg-gray-500 border-gray-600'; // Low Power + Low Interest
      default:
        return 'bg-gray-500 border-gray-600';
    }
  };

  const getQuadrantLabel = (quadrant: StakeholderQuadrant): string => {
    switch (quadrant) {
      case StakeholderQuadrant.MANAGE_CLOSELY:
        return 'Manage Closely';
      case StakeholderQuadrant.KEEP_SATISFIED:
        return 'Keep Satisfied';
      case StakeholderQuadrant.KEEP_INFORMED:
        return 'Keep Informed';
      case StakeholderQuadrant.MONITOR:
        return 'Monitor';
      default:
        return '';
    }
  };

  const handleStakeholderClick = (stakeholder: Stakeholder) => {
    setSelectedStakeholder(stakeholder);
    setIsDetailPanelOpen(true);
  };

  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedStakeholder(null);
  };

  const handleBackToRegister = () => {
    navigate('/artifacts/stakeholders');
  };

  if (!selectedProjectId) {
    return (
      <AppLayout>
        <ArtifactsNavigation />
        <div className="p-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl">
            Please select a project from the Artifacts Hub to view the Power-Interest Grid.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Power-Interest Grid</h1>
            <p className="text-sm text-gray-600 mt-1">
              Visual representation of stakeholder power and interest levels
            </p>
          </div>
          <button
            onClick={handleBackToRegister}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ← Back to Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl flex items-start justify-between">
            <div>{error}</div>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900 font-semibold">
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, role, email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Power Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Power Level</label>
              <select
                value={filters.powerLevel || ''}
                onChange={(e) => setFilters({ ...filters, powerLevel: e.target.value as PowerLevel || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">All</option>
                <option value={PowerLevel.LOW}>Low</option>
                <option value={PowerLevel.MEDIUM}>Medium</option>
                <option value={PowerLevel.HIGH}>High</option>
              </select>
            </div>

            {/* Interest Filter */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Interest Level</label>
              <select
                value={filters.interestLevel || ''}
                onChange={(e) => setFilters({ ...filters, interestLevel: e.target.value as InterestLevel || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">All</option>
                <option value={InterestLevel.LOW}>Low</option>
                <option value={InterestLevel.MEDIUM}>Medium</option>
                <option value={InterestLevel.HIGH}>High</option>
              </select>
            </div>

            {/* Apply Filters Button */}
            <div className="flex items-end">
              <button
                onClick={fetchData}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>

        {/* Grid Container */}
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-600">Loading Power-Interest Grid...</p>
              </div>
            </div>
          ) : stakeholders.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-gray-600 font-medium mb-2">No stakeholders available to display</p>
                <p className="text-sm text-gray-500">
                  {searchQuery || filters.powerLevel || filters.interestLevel
                    ? 'Try adjusting your filters or search query.'
                    : 'Add stakeholders to see them on the Power-Interest Grid.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Grid Visual */}
              <div className="flex-1">
                <div className="relative w-full" style={{ paddingBottom: '100%' }}>
                  <div className="absolute inset-0 bg-white border-4 border-gray-400 rounded-lg">
                    {/* Axis Labels */}
                    <div className="absolute -bottom-12 left-0 right-0 text-center text-sm font-bold text-gray-700">
                      Power →
                    </div>
                    <div className="absolute -left-20 top-0 bottom-0 flex items-center">
                      <div className="transform -rotate-90 text-sm font-bold text-gray-700 whitespace-nowrap">
                        Interest →
                      </div>
                    </div>

                    {/* Grid Lines */}
                    <div className="absolute inset-0">
                      {/* Vertical center line */}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gray-400"></div>
                      {/* Horizontal center line */}
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-400"></div>
                    </div>

                    {/* Quadrant Background Colors (subtle) */}
                    <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-50 opacity-30"></div>
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-red-50 opacity-30"></div>
                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gray-50 opacity-30"></div>
                    <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-amber-50 opacity-30"></div>

                    {/* Quadrant Labels */}
                    <div className="absolute top-4 left-4 text-sm font-bold text-blue-700">
                      Keep Informed
                    </div>
                    <div className="absolute top-4 right-4 text-sm font-bold text-red-700 text-right">
                      Manage Closely
                    </div>
                    <div className="absolute bottom-4 left-4 text-sm font-bold text-gray-600">
                      Monitor
                    </div>
                    <div className="absolute bottom-4 right-4 text-sm font-bold text-amber-700 text-right">
                      Keep Satisfied
                    </div>

                    {/* Stakeholder Dots */}
                    {stakeholders.map((stakeholder) => {
                      const xPos = getPowerPosition(stakeholder.powerLevel);
                      const yPos = getInterestPosition(stakeholder.interestLevel);
                      const dotColor = getDotColor(stakeholder.quadrant);
                      const isHovered = hoveredStakeholder?.id === stakeholder.id;

                      return (
                        <div
                          key={stakeholder.id}
                          className="absolute group"
                          style={{
                            left: `${xPos}%`,
                            top: `${yPos}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          onMouseEnter={() => setHoveredStakeholder(stakeholder)}
                          onMouseLeave={() => setHoveredStakeholder(null)}
                          onClick={() => handleStakeholderClick(stakeholder)}
                        >
                          <div
                            className={`w-5 h-5 rounded-full ${dotColor} border-2 border-white shadow-lg cursor-pointer transition-transform hover:scale-150 ${
                              isHovered ? 'scale-150 z-10' : ''
                            }`}
                          ></div>

                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 z-20">
                              <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-2xl">
                                <p className="font-bold text-sm mb-1">{stakeholder.stakeholderName}</p>
                                <p className="text-gray-300 mb-1">{stakeholder.role}</p>
                                <div className="border-t border-gray-700 my-1"></div>
                                <p className="text-gray-400">
                                  <span className="font-semibold">Power:</span> {stakeholder.powerLevel}
                                </p>
                                <p className="text-gray-400">
                                  <span className="font-semibold">Interest:</span> {stakeholder.interestLevel}
                                </p>
                                <p className="text-primary-300 mt-1 font-semibold">
                                  {getQuadrantLabel(stakeholder.quadrant)}
                                </p>
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                  <div className="border-8 border-transparent border-t-gray-900"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Axis Markers */}
                    <div className="absolute -left-12 top-2 text-xs text-gray-600 font-bold">High</div>
                    <div className="absolute -left-12 bottom-2 text-xs text-gray-600 font-bold">Low</div>
                    <div className="absolute -bottom-8 left-2 text-xs text-gray-600 font-bold">Low</div>
                    <div className="absolute -bottom-8 right-2 text-xs text-gray-600 font-bold">High</div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="lg:w-72">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sticky top-6">
                  <h3 className="text-sm font-bold text-gray-900 mb-4">Legend</h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Manage Closely</p>
                        <p className="text-xs text-gray-600">High Power + High Interest</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Keep Satisfied</p>
                        <p className="text-xs text-gray-600">High Power + Low Interest</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Keep Informed</p>
                        <p className="text-xs text-gray-600">Low Power + High Interest</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-gray-500 border-2 border-white shadow mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Monitor</p>
                        <p className="text-xs text-gray-600">Low Power + Low Interest</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-4">
                    <p className="text-xs text-gray-700 font-semibold mb-2">Total Stakeholders</p>
                    <p className="text-2xl font-bold text-primary-600">{stakeholders.length}</p>
                  </div>

                  <div className="border-t border-gray-300 mt-4 pt-4">
                    <p className="text-xs text-gray-600">
                      <strong>Tip:</strong> Click any dot to view stakeholder details. Hover to see quick info.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <StakeholderDetailPanel
          isOpen={isDetailPanelOpen}
          stakeholder={selectedStakeholder}
          onClose={handleCloseDetailPanel}
          onEdit={() => {
            handleCloseDetailPanel();
            navigate('/artifacts/stakeholders');
          }}
          onArchive={() => {
            handleCloseDetailPanel();
            navigate('/artifacts/stakeholders');
          }}
        />
      </div>
    </AppLayout>
  );
};

export default PowerInterestGridPage;
