import { ImpactLevel, ProbabilityLevel, RiskSeverity } from '../types/risk';

interface RiskMetrics {
  probabilityScore: number;
  impactScore: number;
  riskScore: number;
  severity: RiskSeverity;
}

export const useRiskCalculation = () => {
  /**
   * Convert level to numeric score
   * LOW = 1, MEDIUM = 2, HIGH = 3, VERY_HIGH = 4
   */
  const levelToScore = (level: ImpactLevel | ProbabilityLevel | undefined): number => {
    if (!level) return 0;
    const scoreMap: Record<string, number> = {
      LOW: 1,
      MEDIUM: 2,
      HIGH: 3,
      VERY_HIGH: 4,
    };
    return scoreMap[level] || 0;
  };

  /**
   * Calculate all risk metrics
   * Returns: probabilityScore, impactScore, riskScore, severity
   */
  const calculateScores = (
    probability: ProbabilityLevel,
    costImpact?: ImpactLevel,
    timeImpact?: ImpactLevel,
    scheduleImpact?: ImpactLevel,
  ): RiskMetrics => {
    // Calculate probability score
    const probabilityScore = levelToScore(probability);

    // Calculate impact score as MAX of all impacts
    const impactScores: number[] = [
      levelToScore(costImpact),
      levelToScore(timeImpact),
      levelToScore(scheduleImpact),
    ].filter(score => score > 0);

    const impactScore = impactScores.length > 0 ? Math.max(...impactScores) : 1;

    // Calculate final risk score
    const riskScore = probabilityScore * impactScore;

    // Determine severity based on risk score
    let severity: RiskSeverity;
    if (riskScore <= 3) {
      severity = 'LOW';
    } else if (riskScore <= 6) {
      severity = 'MEDIUM';
    } else if (riskScore <= 9) {
      severity = 'HIGH';
    } else {
      severity = 'VERY_HIGH';
    }

    return {
      probabilityScore,
      impactScore,
      riskScore,
      severity,
    };
  };

  /**
   * Get severity color for UI display
   */
  const getSeverityColor = (severity: RiskSeverity): string => {
    const colorMap: Record<RiskSeverity, string> = {
      LOW: 'green',
      MEDIUM: 'yellow',
      HIGH: 'amber',
      VERY_HIGH: 'red',
    };
    return colorMap[severity];
  };

  /**
   * Get severity background and text color classes
   */
  const getSeverityClasses = (severity: RiskSeverity): string => {
    const classMap: Record<RiskSeverity, string> = {
      LOW: 'bg-green-100 text-green-800 border-green-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      HIGH: 'bg-amber-100 text-amber-800 border-amber-300',
      VERY_HIGH: 'bg-red-100 text-red-800 border-red-300',
    };
    return classMap[severity];
  };

  return {
    calculateScores,
    levelToScore,
    getSeverityColor,
    getSeverityClasses,
  };
};
