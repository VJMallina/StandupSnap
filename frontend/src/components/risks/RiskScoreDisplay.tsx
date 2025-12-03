import React from 'react';
import { RiskSeverity } from '../../types/risk';
import { SeverityBadge } from './SeverityBadge';

interface RiskScoreDisplayProps {
  probabilityScore: number;
  impactScore: number;
  riskScore: number;
  severity: RiskSeverity;
  compact?: boolean;
}

export const RiskScoreDisplay: React.FC<RiskScoreDisplayProps> = ({
  probabilityScore,
  impactScore,
  riskScore,
  severity,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          {probabilityScore} × {impactScore} = {riskScore}
        </span>
        <SeverityBadge severity={severity} size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Score Calculation */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Probability:</span>
          <span className="font-semibold text-gray-900">{probabilityScore}</span>
        </div>
        <span className="text-gray-400">×</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Impact:</span>
          <span className="font-semibold text-gray-900">{impactScore}</span>
        </div>
        <span className="text-gray-400">=</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Risk Score:</span>
          <span className="font-bold text-gray-900 text-lg">{riskScore}</span>
        </div>
      </div>

      {/* Severity Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Severity:</span>
        <SeverityBadge severity={severity} size="md" showIcon />
      </div>

      {/* Score Range Explanation */}
      <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
        <div className="grid grid-cols-2 gap-1">
          <div>1-3: Low</div>
          <div>4-6: Medium</div>
          <div>7-9: High</div>
          <div>10-16: Very High</div>
        </div>
      </div>
    </div>
  );
};
