import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'table-row' | 'card' | 'dashboard-widget' | 'list-item' | 'text' | 'circle';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  count = 1,
  className = '',
}) => {
  const baseShimmerClass = 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:1000px_100%]';

  const renderSkeleton = () => {
    switch (variant) {
      case 'table-row':
        return (
          <tr className="border-b border-gray-200">
            <td className="px-6 py-4">
              <div className={`h-4 w-32 rounded ${baseShimmerClass}`}></div>
            </td>
            <td className="px-6 py-4">
              <div className={`h-4 w-24 rounded ${baseShimmerClass}`}></div>
            </td>
            <td className="px-6 py-4">
              <div className={`h-4 w-20 rounded ${baseShimmerClass}`}></div>
            </td>
            <td className="px-6 py-4">
              <div className={`h-4 w-28 rounded ${baseShimmerClass}`}></div>
            </td>
            <td className="px-6 py-4">
              <div className={`h-4 w-16 rounded ${baseShimmerClass}`}></div>
            </td>
          </tr>
        );

      case 'card':
        return (
          <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
            <div className={`h-6 w-3/4 rounded mb-4 ${baseShimmerClass}`}></div>
            <div className={`h-4 w-full rounded mb-2 ${baseShimmerClass}`}></div>
            <div className={`h-4 w-5/6 rounded mb-2 ${baseShimmerClass}`}></div>
            <div className={`h-4 w-2/3 rounded ${baseShimmerClass}`}></div>
          </div>
        );

      case 'dashboard-widget':
        return (
          <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`h-5 w-32 rounded ${baseShimmerClass}`}></div>
              <div className={`h-8 w-8 rounded-lg ${baseShimmerClass}`}></div>
            </div>
            <div className={`h-10 w-24 rounded mb-2 ${baseShimmerClass}`}></div>
            <div className={`h-3 w-full rounded ${baseShimmerClass}`}></div>
          </div>
        );

      case 'list-item':
        return (
          <div className={`flex items-center gap-4 p-4 border-b border-gray-200 ${className}`}>
            <div className={`h-10 w-10 rounded-full flex-shrink-0 ${baseShimmerClass}`}></div>
            <div className="flex-1">
              <div className={`h-4 w-3/4 rounded mb-2 ${baseShimmerClass}`}></div>
              <div className={`h-3 w-1/2 rounded ${baseShimmerClass}`}></div>
            </div>
          </div>
        );

      case 'circle':
        return (
          <div className={`h-12 w-12 rounded-full ${baseShimmerClass} ${className}`}></div>
        );

      case 'text':
      default:
        return (
          <div className={`h-4 w-full rounded ${baseShimmerClass} ${className}`}></div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

// Specialized skeleton components for common use cases

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <table className="min-w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3"><div className="h-4 w-24 rounded bg-gray-200"></div></th>
          <th className="px-6 py-3"><div className="h-4 w-20 rounded bg-gray-200"></div></th>
          <th className="px-6 py-3"><div className="h-4 w-16 rounded bg-gray-200"></div></th>
          <th className="px-6 py-3"><div className="h-4 w-28 rounded bg-gray-200"></div></th>
          <th className="px-6 py-3"><div className="h-4 w-16 rounded bg-gray-200"></div></th>
        </tr>
      </thead>
      <tbody>
        <SkeletonLoader variant="table-row" count={rows} />
      </tbody>
    </table>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <SkeletonLoader variant="dashboard-widget" count={6} />
  </div>
);

export const CardGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <SkeletonLoader variant="card" count={count} />
  </div>
);
