import React from 'react';

export interface CowLogoProps {
  className?: string;
  variant?: 'black' | 'white' | 'badge-green' | 'badge-white' | 'badge-blue' | 'svg';
  alt?: string;
  size?: number;
  style?: React.CSSProperties;
}

export const CowLogo: React.FC<CowLogoProps> = ({
  className = 'w-10 h-10',
  variant = 'black',
  alt = 'Milk Shop Logo',
  size,
  style,
}) => {
  // SVG Vector Fallback if image fails or for crisp vector icons
  if (variant === 'svg') {
    return (
      <svg viewBox="0 0 64 64" className={className} style={{ width: size, height: size, ...style }} xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="10" cy="22" rx="7" ry="9" fill="currentColor" opacity="0.95" />
        <ellipse cx="54" cy="22" rx="7" ry="9" fill="currentColor" opacity="0.95" />
        <ellipse cx="32" cy="34" rx="22" ry="19" fill="currentColor" />
        <ellipse cx="32" cy="43" rx="14" ry="10" fill="white" opacity="0.92" />
        <ellipse cx="20" cy="24" rx="5.5" ry="7" fill="white" opacity="0.5" />
        <ellipse cx="44" cy="20" rx="4" ry="5" fill="white" opacity="0.4" />
        <ellipse cx="27" cy="43" rx="2" ry="2.6" fill="currentColor" />
        <ellipse cx="37" cy="43" rx="2" ry="2.6" fill="currentColor" />
        <circle cx="22" cy="30" r="3" fill="white" />
        <circle cx="42" cy="30" r="3" fill="white" />
        <circle cx="22" cy="30" r="1.4" fill="currentColor" />
        <circle cx="42" cy="30" r="1.4" fill="currentColor" />
        <path d="M18 14C16 10 17 6 20 5" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M46 14C48 10 47 6 44 5" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.9" />
      </svg>
    );
  }

  const src = '/cow-logo.png';

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: size ? `${size}px` : undefined,
        height: size ? `${size}px` : undefined,
        maxWidth: size ? `${size}px` : '100%',
        maxHeight: size ? `${size}px` : '100%',
        ...style,
      }}
      className={`rounded-full object-contain select-none pointer-events-none ${className}`}
      loading="eager"
    />
  );
};
