import AppLayout from '../components/AppLayout';

const NOTIFICATION_TYPES = [
  {
    icon: (
      <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Change approvals',
    description: 'Get notified when a change request is submitted or approved.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    label: 'RAG status escalations',
    description: 'Alert when a card or sprint flips to RED.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    label: 'Blockers',
    description: 'Get alerted when a team member marks a blocker.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    label: 'Team join / invite',
    description: 'Notify when you are added to a new project.',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    label: 'Sprint events',
    description: 'Notify when a sprint is started, closed, or overdue.',
  },
];

export default function NotificationsPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Stay on top of what matters across your projects.
          </p>
        </div>

        {/* Empty state */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-700">No notifications yet</h2>
          <p className="text-sm text-gray-400 mt-1 max-w-sm mx-auto">
            You're all caught up. Notifications will appear here once the feature is enabled.
          </p>
        </div>

        {/* Coming soon */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wide">
              Coming soon
            </span>
            <h2 className="text-base font-semibold text-gray-800">Notification preferences</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            These notification types are planned for a future release. You'll be able to configure
            them per-project and per-channel (in-app, email, Slack).
          </p>
          <ul className="space-y-3">
            {NOTIFICATION_TYPES.map(({ icon, label, description }) => (
              <li
                key={label}
                className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 opacity-60"
              >
                <div className="mt-0.5 flex-shrink-0">{icon}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <div className="ml-auto flex-shrink-0">
                  <div className="w-10 h-5 rounded-full bg-gray-200" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
