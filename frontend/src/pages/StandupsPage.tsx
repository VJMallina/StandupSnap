import AppLayout from '../components/AppLayout';

export default function StandupsPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg
            className="mx-auto h-24 w-24 text-gray-400 mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Standups</h2>
          <p className="text-lg text-gray-600 mb-8">
            Daily standup updates and team collaboration
          </p>
          <div className="inline-flex items-center px-6 py-3 bg-teal-50 rounded-lg border border-teal-200">
            <svg
              className="h-5 w-5 text-teal-500 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-teal-700 font-medium">
              This feature is coming soon
            </span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
