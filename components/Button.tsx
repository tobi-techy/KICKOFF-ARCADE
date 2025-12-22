import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '',
  ...props 
}) => {
  const baseStyles = "font-arcade uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 font-bold shadow-lg border-b-4";
  
  const variants = {
    primary: "bg-yellow-400 text-yellow-900 border-yellow-600 hover:bg-yellow-300",
    secondary: "bg-blue-600 text-white border-blue-800 hover:bg-blue-500",
    danger: "bg-red-500 text-white border-red-700 hover:bg-red-400",
    ghost: "bg-transparent text-white border-transparent shadow-none border-b-0 hover:bg-white/10",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-xl",
  };

  const width = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${width} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
