import { useState } from 'react';

interface StandupResponse {
  yesterday: string;
  today: string;
  blockers: string;
  formattedOutput: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function StandupGenerator() {
  const [rawInput, setRawInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StandupResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      setError('Please enter your work updates');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/standup/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rawInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate standup');
      }

      const data: StandupResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.formattedOutput) {
      navigator.clipboard.writeText(result.formattedOutput);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleGenerate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <label
          htmlFor="raw-input"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Your Work Updates
        </label>
        <textarea
          id="raw-input"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          rows={6}
          placeholder="Example: Worked on the Partners Payout API, had issues with Docker setup, tomorrow will finish the merchant transaction processing user stories"
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          onKeyDown={handleKeyPress}
        />
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Press Ctrl+Enter or Cmd+Enter to generate
          </p>
          <button
            onClick={handleGenerate}
            disabled={loading || !rawInput.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Standup'}
          </button>
        </div>
      </div>

      {/* Error Section */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Result Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Your Standup
            </h2>
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Copy to Clipboard
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
            {result.formattedOutput}
          </div>
        </div>
      )}
    </div>
  );
}
