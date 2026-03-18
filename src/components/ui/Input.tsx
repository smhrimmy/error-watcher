import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  icon, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text-muted mb-2 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-background text-text-main placeholder-text-muted
            shadow-neu-pressed rounded-xl
            border-none focus:ring-0 focus:outline-none
            transition-all duration-200
            ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3
            ${error ? 'ring-2 ring-danger/50' : ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-danger ml-1">{error}</p>
      )}
    </div>
  );
};
