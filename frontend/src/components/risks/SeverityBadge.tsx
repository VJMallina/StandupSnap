import React from 'react';
import { RiskSeverity } from '../../types/risk';
import { useRiskCalculation } from '../../hooks/useRiskCalculation';

interface SeverityBadgeProps {
  severity: RiskSeverity;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  showIcon = false,
}) => {
  const { getSeverityClasses } = useRiskCalculation();

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const severityLabels: Record<RiskSeverity, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    VERY_HIGH: 'Very High',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${getSeverityClasses(
        severity
      )} ${sizeClasses[size]}`}
    >
      {showIcon && (
        <svg
          className={iconSizes[size]}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <circle cx="10" cy="10" r="6" />
        </svg>
      )}
      {severityLabels[severity]}
    </span>
  );
};
