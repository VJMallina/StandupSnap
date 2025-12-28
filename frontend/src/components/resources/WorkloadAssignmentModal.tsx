import { useState, useEffect } from 'react';
import { Resource, resourcesApi } from '../../services/api/resources';

interface WorkloadAssignmentModalProps {
  resource: Resource;
  onClose: () => void;
  onSuccess: () => void;
}

interface WeekWorkload {
  weekStartDate: string;
  weekEndDate: string;
  availability: number;
  workload: number;
  loadPercentage: number;
  ragStatus: string;
  notes?: string;
}

export default function WorkloadAssignmentModal({ resource, onClose, onSuccess }: WorkloadAssignmentModalProps) {
  const [weeks, setWeeks] = useState<WeekWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeeklyData();
  }, [resource.id]);

  const loadWeeklyData = async () => {
    try {
      setLoading(true);

      // Fetch existing workload data from backend
      const existingWorkloads = await resourcesApi.getResourceWorkload(resource.id);
      console.log(`Fetched ${existingWorkloads.length} existing workload entries for ${resource.name}`);

      // Generate next 8 weeks starting from current week
      const startDate = getMonday(new Date());
      const weeksData: WeekWorkload[] = [];

      for (let i = 0; i < 8; i++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekStartStr = weekStart.toISOString().split('T')[0];

        // Check if we have existing data for this week
        const existingData = existingWorkloads.find(w => {
          const existingStart = new Date(w.weekStartDate).toISOString().split('T')[0];
          return existingStart === weekStartStr;
        });

        if (existingData) {
          // Use existing data
          console.log(`Week ${i + 1}: Found existing data - workload: ${existingData.workload}h`);
          weeksData.push({
            weekStartDate: weekStartStr,
            weekEndDate: weekEnd.toISOString().split('T')[0],
            availability: existingData.availability,
            workload: existingData.workload,
            loadPercentage: existingData.loadPercentage,
            ragStatus: existingData.ragStatus,
            notes: existingData.notes || ''
          });
        } else {
          // No existing data, use defaults
          weeksData.push({
            weekStartDate: weekStartStr,
            weekEndDate: weekEnd.toISOString().split('T')[0],
            availability: resource.weeklyAvailability,
            workload: 0,
            loadPercentage: 0,
            ragStatus: 'green',
            notes: ''
          });
        }
      }

      console.log(`Loaded ${weeksData.length} weeks for modal`);
      setWeeks(weeksData);
    } catch (err: any) {
      console.error('Error loading weekly data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const handleWorkloadChange = (index: number, workload: number) => {
    const updatedWeeks = [...weeks];
    const availability = updatedWeeks[index].availability;
    const loadPercentage = availability > 0 ? (workload / availability) * 100 : 0;

    let ragStatus = 'green';
    if (loadPercentage >= 80 && loadPercentage <= 100) {
      ragStatus = 'amber';
    } else if (loadPercentage > 100) {
      ragStatus = 'red';
    }

    updatedWeeks[index] = {
      ...updatedWeeks[index],
      workload,
      loadPercentage,
      ragStatus
    };

    setWeeks(updatedWeeks);
  };

  const handleAvailabilityChange = (index: number, availability: number) => {
    const updatedWeeks = [...weeks];
    const workload = updatedWeeks[index].workload;
    const loadPercentage = availability > 0 ? (workload / availability) * 100 : 0;

    let ragStatus = 'green';
    if (loadPercentage >= 80 && loadPercentage <= 100) {
      ragStatus = 'amber';
    } else if (loadPercentage > 100) {
      ragStatus = 'red';
    }

    updatedWeeks[index] = {
      ...updatedWeeks[index],
      availability,
      loadPercentage,
      ragStatus
    };

    setWeeks(updatedWeeks);
  };

  const handleNotesChange = (index: number, notes: string) => {
    const updatedWeeks = [...weeks];
    updatedWeeks[index] = {
      ...updatedWeeks[index],
      notes
    };
    setWeeks(updatedWeeks);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Save each week's workload
      for (const week of weeks) {
        if (week.workload > 0 || week.notes) {
          await resourcesApi.createOrUpdateWorkload({
            resourceId: resource.id,
            weekStartDate: week.weekStartDate,
            availability: week.availability,
            workload: week.workload,
            notes: week.notes
          });
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getRAGColor = (rag: string) => {
    switch (rag) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage Weekly Workload</h2>
            <p className="text-sm text-gray-600 mt-1">
              {resource.name} - Assign workload for upcoming weeks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Loading workload data...</p>
              <p className="text-gray-400 text-sm mt-1">Fetching existing weekly assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {weeks.map((week, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">Week {index + 1}</h3>
                      <span className="text-sm text-gray-600">
                        {formatDateRange(week.weekStartDate, week.weekEndDate)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getRAGColor(week.ragStatus)}`}>
                        {week.loadPercentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Availability (hrs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={week.availability}
                        onChange={(e) => handleAvailabilityChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Workload (hrs)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={week.workload}
                        onChange={(e) => handleWorkloadChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Load %
                      </label>
                      <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-900">
                        {week.loadPercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Week Notes (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., On training, Part-time availability, etc."
                      value={week.notes || ''}
                      onChange={(e) => handleNotesChange(index, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {/* Load Bar */}
                  <div className="mt-3">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          week.ragStatus === 'green' ? 'bg-green-500' :
                          week.ragStatus === 'amber' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(week.loadPercentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {saving ? 'Saving...' : 'Save Workload'}
          </button>
        </div>
      </div>
    </div>
  );
}
