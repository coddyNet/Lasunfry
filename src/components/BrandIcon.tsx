import React from 'react';

interface BrandIconProps {
  size?: number;
  className?: string;
}

export function BrandIcon({ size = 24, className = "" }: BrandIconProps) {
  return (
    <img 
      src="/logo.png" 
      alt="Lasunfry Logo" 
      width={size} 
      height={size} 
      className={`object-contain ${className}`}
    />
  );
}
