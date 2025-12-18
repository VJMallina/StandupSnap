import { useState, useEffect } from 'react';
import { resourcesApi, HeatmapData } from '../../services/api/resources';

interface ResourceHeatmapProps {
  projectId: string;
}

type ViewLevel = 'month' | 'week' | 'day';

interface ViewState {
  level: ViewLevel;
  resourceId?: string;
  resourceName?: string;
  weekIndex?: number;
  weekStartDate?: Date;
}

export default function ResourceHeatmap({ projectId }: ResourceHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState(() => new Date().getMonth());

  const [viewState, setViewState] = useState<ViewState>({ level: 'month' });

  useEffect(() => {
    loadHeatmapData();
  }, [projectId, selectedYear, selectedMonthIdx, viewState.level]);

  const loadHeatmapData = async () => {
    try {
      setLoading(true);

      let startDate, endDate;

      // For month view, fetch only current month. For week/day view, fetch full year
      if (viewState.level === 'month') {
        startDate = new Date(selectedYear, selectedMonthIdx, 1);
        endDate = new Date(selectedYear, selectedMonthIdx + 1, 0);
      } else {
        // For week/day views, fetch full year to have all data
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31);
      }

      const data = await resourcesApi.getHeatmapData(
        projectId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      setHeatmapData(data);
    } catch (err) {
      console.error('Failed to load heatmap data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRAGColor = (ragStatus: string, loadPercentage: number) => {
    // Return color with intensity based on load percentage
    switch (ragStatus) {
      case 'green':
        // Green shades: lighter for lower load
        if (loadPercentage < 30) return 'bg-green-200';
        if (loadPercentage < 50) return 'bg-green-300';
        if (loadPercentage < 70) return 'bg-green-400';
        return 'bg-green-500';
      case 'amber':
        // Amber shades: 80-100%
        if (loadPercentage < 85) return 'bg-amber-400';
        if (loadPercentage < 95) return 'bg-amber-500';
        return 'bg-amber-600';
      case 'red':
        // Red shades: > 100%
        if (loadPercentage < 110) return 'bg-red-400';
        if (loadPercentage < 125) return 'bg-red-500';
        return 'bg-red-600';
      default:
        return 'bg-gray-200';
    }
  };

  const changeYear = (direction: number) => {
    setSelectedYear(selectedYear + direction);
    setViewState({ level: 'month' });
  };

  const handleBubbleClick = (resourceId: string, resourceName: string, weekIndex: number, weekStartDate: string) => {
    console.log('Bubble clicked:', { resourceId, resourceName, weekIndex, weekStartDate });
    try {
      setViewState({
        level: 'week',
        resourceId,
        resourceName,
        weekIndex,
        weekStartDate: new Date(weekStartDate),
      });
    } catch (error) {
      console.error('Error navigating to week view:', error);
    }
  };

  const handleWeekClick = () => {
    setViewState({ ...viewState, level: 'day' });
  };

  const handleBreadcrumbClick = (level: ViewLevel) => {
    if (level === 'month') {
      setViewState({ level: 'month' });
    } else if (level === 'week') {
      setViewState({ ...viewState, level: 'week' });
    }
  };

  const getDaysInWeek = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getCurrentResourceData = () => {
    return heatmapData.find(r => r.resourceId === viewState.resourceId);
  };

  const getCurrentWeekData = () => {
    const resourceData = getCurrentResourceData();
    if (!resourceData || !viewState.weekStartDate) {
      console.log('getCurrentWeekData: No data found', {
        hasResourceData: !!resourceData,
        hasWeekStartDate: !!viewState.weekStartDate
      });
      return null;
    }

    // Find week by weekStartDate for more reliable matching
    const weekStartStr = viewState.weekStartDate.toISOString().split('T')[0];
    const weekData = resourceData.weeklyData.find(w =>
      w.weekStartDate.split('T')[0] === weekStartStr
    );

    console.log('getCurrentWeekData:', {
      totalWeeks: resourceData.weeklyData.length,
      searchingFor: weekStartStr,
      foundData: !!weekData
    });

    return weekData || null;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="h-6 w-56 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-48">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-2 animate-pulse"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="flex-1 grid grid-cols-6 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <div key={j} className="h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (heatmapData.length === 0) {
    const monthName = new Date(selectedYear, selectedMonthIdx, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const handleMonthChange = (direction: number) => {
      const newMonth = selectedMonthIdx + direction;
      if (newMonth < 0) {
        setSelectedMonthIdx(11);
        changeYear(-1);
      } else if (newMonth > 11) {
        setSelectedMonthIdx(0);
        changeYear(1);
      } else {
        setSelectedMonthIdx(newMonth);
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Resource Workload Heatmap</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center">
              {monthName}
            </span>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-gray-500 text-sm mb-2">No workload data for {monthName}</p>
            <p className="text-gray-400 text-xs">Click on "Manage Weekly Workload" in the resource table to add data</p>
          </div>
        </div>
      </div>
    );
  }

  // Monthly View (RT-UC09) - Professional Resource Tracker Style
  if (viewState.level === 'month') {
    const monthName = new Date(selectedYear, selectedMonthIdx, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    const handleMonthChange = (direction: number) => {
      const newMonth = selectedMonthIdx + direction;
      if (newMonth < 0) {
        setSelectedMonthIdx(11);
        changeYear(-1);
      } else if (newMonth > 11) {
        setSelectedMonthIdx(0);
        changeYear(1);
      } else {
        setSelectedMonthIdx(newMonth);
      }
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 hover:bg-gray-100 rounded transition-colors"
              title={isCollapsed ? 'Expand heatmap' : 'Collapse heatmap'}
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-gray-900">Resource Workload Heatmap</h3>
          </div>

          <div className="flex items-center gap-4">
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-green-500"></div>
                <span className="text-gray-600">&lt; 80%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-amber-500"></div>
                <span className="text-gray-600">80-100%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-red-500"></div>
                <span className="text-gray-600">&gt; 100%</span>
              </div>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center gap-2 border-l pl-4">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Previous month"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm font-medium text-gray-900 min-w-[140px] text-center">
                {monthName}
              </span>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Next month"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Collapsible */}
        {!isCollapsed && (
          <div className="px-5 py-5">
            <div className="space-y-4 max-h-[500px] overflow-visible pr-2">
              {heatmapData.map((resourceData) => (
                <div key={resourceData.resourceId} className="border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors overflow-visible">
                  <div className="flex items-center gap-4 overflow-visible">
                    {/* Resource Name - Left */}
                    <div className="w-48 flex-shrink-0">
                      <p className="font-semibold text-gray-900 text-sm">{resourceData.resourceName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{resourceData.role}</p>
                    </div>

                    {/* Week Grid - Center */}
                    <div className="flex-1 overflow-visible">
                      {resourceData.weeklyData.length === 0 ? (
                        <p className="text-sm text-gray-400 italic py-2">No workload data for this month</p>
                      ) : (
                        <div className="grid grid-cols-6 gap-3 overflow-visible">
                          {resourceData.weeklyData.map((week, idx) => {
                            // Find the actual week index in all weekly data for proper navigation
                            const globalWeekIndex = resourceData.weeklyData.indexOf(week);

                            return (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleBubbleClick(
                                    resourceData.resourceId,
                                    resourceData.resourceName,
                                    globalWeekIndex,
                                    week.weekStartDate
                                  );
                                }}
                                className={`h-16 ${getRAGColor(week.ragStatus, week.loadPercentage)} rounded-lg border-2 border-gray-300 hover:border-gray-900 hover:shadow-lg transition-all cursor-pointer group relative flex flex-col items-center justify-center overflow-visible`}
                              >
                                {/* Percentage */}
                                <span className="text-lg font-bold text-white drop-shadow-md">
                                  {week.loadPercentage.toFixed(0)}%
                                </span>
                                {/* Week Label */}
                                <span className="text-[10px] text-white opacity-90 mt-0.5">
                                  Week {idx + 1}
                                </span>

                                {/* Tooltip on hover - smart positioning based on grid position */}
                                <div className={`hidden group-hover:flex absolute z-[100] bg-gray-900 text-white text-xs rounded-lg p-3 shadow-2xl flex-col w-48
                                  ${idx === 0 || idx === 1
                                    ? 'top-0 left-full ml-2' // Left columns: show on right
                                    : idx === 4 || idx === 5
                                    ? 'top-0 right-full mr-2' // Right columns: show on left
                                    : 'bottom-full left-1/2 -translate-x-1/2 mb-2' // Middle columns: show above centered
                                  }`}>
                                  <p className="font-semibold mb-1.5 text-center">Week {idx + 1}</p>
                                  <div className="space-y-0.5">
                                    <p>Availability: <span className="font-semibold">{week.availability}h</span></p>
                                    <p>Workload: <span className="font-semibold">{week.workload}h</span></p>
                                    <p>Load: <span className="font-semibold text-teal-400">{week.loadPercentage.toFixed(1)}%</span></p>
                                  </div>
                                  <p className="text-gray-400 mt-1.5 pt-1.5 text-[10px] border-t border-gray-700">
                                    {new Date(week.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(week.weekEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                  {week.notes && (
                                    <p className="text-teal-300 mt-1 italic text-[10px] border-t border-gray-700 pt-1 whitespace-normal break-words">
                                      {week.notes}
                                    </p>
                                  )}
                                  {/* Arrow pointer - positioned based on tooltip location */}
                                  {idx === 0 || idx === 1 ? (
                                    <div className="absolute top-4 right-full w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-transparent border-r-gray-900"></div>
                                  ) : idx === 4 || idx === 5 ? (
                                    <div className="absolute top-4 left-full w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-transparent border-l-gray-900"></div>
                                  ) : (
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900"></div>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                            {/* Fill empty slots */}
                            {Array.from({ length: 6 - resourceData.weeklyData.length }).map((_, idx) => (
                              <div key={`empty-${idx}`} className="h-16 bg-gray-100 rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center gap-1">
                                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                                <span className="text-[10px] text-gray-500 font-medium">No Data</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Weekly View (RT-UC10)
  if (viewState.level === 'week') {
    const weekData = getCurrentWeekData();
    if (!weekData) {
      console.error('Week data not found, returning to month view');
      // Fallback to month view if week data not found
      setTimeout(() => setViewState({ level: 'month' }), 100);
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">Loading week details...</p>
        </div>
      );
    }

    const monthName = new Date(selectedYear, selectedMonthIdx, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={() => handleBreadcrumbClick('month')}
            className="text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {monthName}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Weekly View - {viewState.resourceName}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(weekData.weekStartDate).toLocaleDateString()} - {new Date(weekData.weekEndDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handleWeekClick}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
          >
            View Day Breakdown
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Availability</p>
                <p className="text-2xl font-bold text-gray-900">{weekData.availability}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Workload</p>
                <p className="text-2xl font-bold text-gray-900">{weekData.workload}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Load %</p>
                <p className="text-2xl font-bold text-gray-900">{weekData.loadPercentage.toFixed(1)}%</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Load Intensity</p>
              <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${getRAGColor(weekData.ragStatus, weekData.loadPercentage)} transition-all`}
                  style={{ width: `${Math.min(weekData.loadPercentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                weekData.ragStatus === 'green' ? 'bg-green-100 text-green-800' :
                weekData.ragStatus === 'amber' ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {weekData.ragStatus.toUpperCase()} STATUS
              </span>
            </div>

            {weekData.notes && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">{weekData.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Daily View (RT-UC11) - GitHub-style grid
  if (viewState.level === 'day') {
    const weekData = getCurrentWeekData();
    if (!weekData || !viewState.weekStartDate) {
      console.error('Day view: Week data not found, returning to week view');
      // Fallback to week view if data not found
      setTimeout(() => setViewState({ ...viewState, level: 'week' }), 100);
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <p className="text-gray-500 text-center">Loading daily breakdown...</p>
        </div>
      );
    }

    const daysInWeek = getDaysInWeek(viewState.weekStartDate);
    const dailyWorkload = weekData.workload / 5; // Distribute evenly across 5 weekdays
    const dailyAvailability = weekData.availability / 5;
    const monthName = new Date(selectedYear, selectedMonthIdx, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <button
            onClick={() => handleBreadcrumbClick('month')}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            {monthName}
          </button>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button
            onClick={() => handleBreadcrumbClick('week')}
            className="text-teal-600 hover:text-teal-700 font-medium"
          >
            Weekly View
          </button>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">Daily View</span>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Breakdown - {viewState.resourceName}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(weekData.weekStartDate).toLocaleDateString()} - {new Date(weekData.weekEndDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-4 mb-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-gray-600">Low (&lt;60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500"></div>
            <span className="text-gray-600">Medium (60-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span className="text-gray-600">High (&gt;100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-300"></div>
            <span className="text-gray-600">Weekend</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {daysInWeek.map((day, idx) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const dailyLoad = isWeekend ? 0 : (dailyWorkload / dailyAvailability) * 100;

            const getDayColor = () => {
              if (isWeekend) return 'bg-gray-300';
              if (dailyLoad < 60) return 'bg-green-500';
              if (dailyLoad <= 100) return 'bg-amber-500';
              return 'bg-red-500';
            };

            return (
              <div key={idx} className="flex flex-col items-center group">
                <div className="text-xs text-gray-600 mb-2">
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div
                  className={`w-16 h-16 ${getDayColor()} rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm relative cursor-pointer`}
                >
                  {isWeekend ? '-' : dailyLoad.toFixed(0) + '%'}

                  <div className="hidden group-hover:block absolute top-20 bg-gray-900 text-white text-xs rounded-lg p-3 z-10 whitespace-nowrap shadow-lg">
                    <p className="font-semibold mb-1">{day.toLocaleDateString()}</p>
                    {!isWeekend ? (
                      <>
                        <p>Availability: {dailyAvailability.toFixed(1)}h</p>
                        <p>Workload: {dailyWorkload.toFixed(1)}h</p>
                        <p>Load: {dailyLoad.toFixed(1)}%</p>
                      </>
                    ) : (
                      <p className="text-gray-400">Weekend - No allocation</p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Daily workload is evenly distributed across weekdays for visualization.
            Weekend days show no allocation by default.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
