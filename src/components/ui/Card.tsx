import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false }) => {
  return (
    <div className={`bg-background shadow-neu rounded-2xl ${noPadding ? '' : 'p-6'} ${className} transition-all duration-300`}>
      {children}
    </div>
  );
};
