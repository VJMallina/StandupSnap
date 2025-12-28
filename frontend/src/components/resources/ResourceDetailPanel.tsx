import { Resource, ResourceRole, ResourceRAGStatus } from '../../services/api/resources';

interface ResourceDetailPanelProps {
  resource: Resource;
  onClose: () => void;
  onEdit: (resource: Resource) => void;
}

export default function ResourceDetailPanel({ resource, onClose, onEdit }: ResourceDetailPanelProps) {
  const getRAGColor = (rag: ResourceRAGStatus) => {
    switch (rag) {
      case ResourceRAGStatus.GREEN:
        return 'bg-green-100 text-green-800 border-green-200';
      case ResourceRAGStatus.AMBER:
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case ResourceRAGStatus.RED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-semibold text-gray-900">Resource Details</h2>
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
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{resource.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {resource.role === ResourceRole.OTHER && resource.customRoleName
                    ? resource.customRoleName
                    : resource.role}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold border ${getRAGColor(resource.ragStatus)}`}>
                  {resource.ragStatus.toUpperCase()}
                </span>
                {resource.isArchived && (
                  <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                    ARCHIVED
                  </span>
                )}
              </div>
            </div>

            {/* Load Metrics */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Availability</p>
                <p className="text-xl font-bold text-gray-900">{resource.weeklyAvailability}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Workload</p>
                <p className="text-xl font-bold text-gray-900">{resource.weeklyWorkload}h</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Load %</p>
                <p className="text-xl font-bold text-gray-900">{Number(resource.loadPercentage).toFixed(1)}%</p>
              </div>
            </div>

            {/* Load Bar */}
            <div className="mt-4">
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    resource.ragStatus === ResourceRAGStatus.GREEN ? 'bg-green-500' :
                    resource.ragStatus === ResourceRAGStatus.AMBER ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(Number(resource.loadPercentage), 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Skills */}
          {resource.skills && resource.skills.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {resource.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {resource.notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Notes / Constraints</h4>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{resource.notes}</p>
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Created</p>
                <p className="font-medium text-gray-900">
                  {new Date(resource.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {new Date(resource.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Mini Heatmap Preview - Placeholder */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Monthly Snapshot</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">
                Navigate to heatmap view for detailed weekly/daily breakdown
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => onEdit(resource)}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Edit Resource
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
