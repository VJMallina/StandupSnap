import React from 'react';
import { PowerLevel, InterestLevel, StakeholderQuadrant } from '../../types/stakeholder';

interface MiniPowerInterestQuadrantProps {
  powerLevel: PowerLevel;
  interestLevel: InterestLevel;
  quadrant: StakeholderQuadrant;
  stakeholderName: string;
  role: string;
}

export const MiniPowerInterestQuadrant: React.FC<MiniPowerInterestQuadrantProps> = ({
  powerLevel,
  interestLevel,
  quadrant,
  stakeholderName,
  role,
}) => {
  // Calculate dot position based on power and interest levels
  const getPowerPosition = (power: PowerLevel): number => {
    switch (power) {
      case PowerLevel.LOW:
        return 25; // 25% from left
      case PowerLevel.MEDIUM:
        return 50; // 50% from left
      case PowerLevel.HIGH:
        return 75; // 75% from left
      default:
        return 50;
    }
  };

  const getInterestPosition = (interest: InterestLevel): number => {
    switch (interest) {
      case InterestLevel.LOW:
        return 75; // 75% from top (inverted Y-axis)
      case InterestLevel.MEDIUM:
        return 50; // 50% from top
      case InterestLevel.HIGH:
        return 25; // 25% from top
      default:
        return 50;
    }
  };

  // Get dot color based on quadrant
  const getDotColor = (quad: StakeholderQuadrant): string => {
    switch (quad) {
      case StakeholderQuadrant.MANAGE_CLOSELY:
        return 'bg-red-500'; // High Power + High Interest
      case StakeholderQuadrant.KEEP_SATISFIED:
        return 'bg-amber-500'; // High Power + Low Interest
      case StakeholderQuadrant.KEEP_INFORMED:
        return 'bg-blue-500'; // Low Power + High Interest
      case StakeholderQuadrant.MONITOR:
        return 'bg-gray-500'; // Low Power + Low Interest
      default:
        return 'bg-gray-500';
    }
  };

  const getQuadrantLabel = (quad: StakeholderQuadrant): string => {
    switch (quad) {
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

  const xPos = getPowerPosition(powerLevel);
  const yPos = getInterestPosition(interestLevel);
  const dotColor = getDotColor(quadrant);

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Power-Interest Quadrant
        </p>
        <span className={`px-2 py-1 text-xs font-semibold rounded ${
          quadrant === StakeholderQuadrant.MANAGE_CLOSELY ? 'bg-red-100 text-red-800' :
          quadrant === StakeholderQuadrant.KEEP_SATISFIED ? 'bg-amber-100 text-amber-800' :
          quadrant === StakeholderQuadrant.KEEP_INFORMED ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getQuadrantLabel(quadrant)}
        </span>
      </div>

      {/* Mini Quadrant Grid */}
      <div className="relative w-full h-48 bg-white border-2 border-gray-300 rounded">
        {/* Axis Labels */}
        <div className="absolute -bottom-6 left-0 right-0 text-center text-xs font-medium text-gray-600">
          Power →
        </div>
        <div className="absolute -left-16 top-0 bottom-0 flex items-center">
          <div className="transform -rotate-90 text-xs font-medium text-gray-600 whitespace-nowrap">
            Interest →
          </div>
        </div>

        {/* Grid Lines */}
        <div className="absolute inset-0">
          {/* Vertical center line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300"></div>
          {/* Horizontal center line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300"></div>
        </div>

        {/* Quadrant Labels */}
        <div className="absolute top-2 left-2 text-xs text-gray-500 font-medium">
          Keep Informed
        </div>
        <div className="absolute top-2 right-2 text-xs text-gray-500 font-medium text-right">
          Manage Closely
        </div>
        <div className="absolute bottom-2 left-2 text-xs text-gray-500 font-medium">
          Monitor
        </div>
        <div className="absolute bottom-2 right-2 text-xs text-gray-500 font-medium text-right">
          Keep Satisfied
        </div>

        {/* Stakeholder Dot */}
        <div
          className="absolute group"
          style={{
            left: `${xPos}%`,
            top: `${yPos}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className={`w-4 h-4 rounded-full ${dotColor} border-2 border-white shadow-lg cursor-default`}></div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
            <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap shadow-lg">
              <p className="font-semibold">{stakeholderName}</p>
              <p className="text-gray-300">{role}</p>
              <p className="mt-1 text-gray-400">
                Power: {powerLevel} • Interest: {interestLevel}
              </p>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                <div className="border-4 border-transparent border-t-gray-900"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Axis Labels at Edges */}
        <div className="absolute -left-8 top-2 text-xs text-gray-600 font-medium">High</div>
        <div className="absolute -left-8 bottom-2 text-xs text-gray-600 font-medium">Low</div>
        <div className="absolute bottom-[-20px] left-2 text-xs text-gray-600 font-medium">Low</div>
        <div className="absolute bottom-[-20px] right-2 text-xs text-gray-600 font-medium">High</div>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-3 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-2">Legend:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-700">Manage Closely</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-700">Keep Satisfied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">Keep Informed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-700">Monitor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
