import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  icon,
  className = '',
  ...props 
}) => {
  
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Neumorphic Styles
  // Default is 'raised' look. Active state is 'pressed' look.
  const shadowStyles = "shadow-neu-button active:shadow-neu-button-active hover:text-primary";
  
  const variants = {
    primary: "text-primary hover:text-primary-dark",
    secondary: "text-text-main hover:text-text-muted",
    danger: "text-danger hover:text-red-600",
    warning: "text-warning hover:text-yellow-600",
    success: "text-success hover:text-green-600",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-6 py-3 text-sm rounded-xl",
    lg: "px-8 py-4 text-base rounded-2xl",
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${shadowStyles} ${variants[variant]} ${sizes[size]} ${width} ${className} bg-background`}
      {...props}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};
