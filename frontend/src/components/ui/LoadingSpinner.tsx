import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  fullScreen?: boolean;
  variant?: 'primary' | 'white';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  fullScreen = false,
  variant = 'primary',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const borderClasses = {
    primary: 'border-primary-600 border-r-transparent',
    white: 'border-white border-r-transparent',
  };

  const containerClasses = fullScreen
    ? 'flex justify-center items-center min-h-[60vh]'
    : 'flex justify-center items-center';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className={`inline-block ${sizeClasses[size]} animate-spin rounded-full border-4 border-solid ${borderClasses[variant]} mx-auto`}></div>
        {text && (
          <p className={`mt-4 font-medium ${variant === 'white' ? 'text-white' : 'text-gray-600'}`}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
};
