import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  className = '' 
}) => {
  const variants = {
    primary: "text-primary shadow-neu-sm",
    success: "text-success shadow-neu-sm",
    warning: "text-warning shadow-neu-sm",
    danger: "text-danger shadow-neu-sm",
    neutral: "text-text-muted shadow-neu-sm",
  };

  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-medium 
      bg-background ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  );
};
