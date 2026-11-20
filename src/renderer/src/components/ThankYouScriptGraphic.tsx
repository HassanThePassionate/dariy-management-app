import React from 'react';

interface ThankYouScriptProps {
  className?: string;
  width?: number | string;
  height?: number | string;
  color?: string;
  text?: string;
}

export const ThankYouScriptGraphic: React.FC<ThankYouScriptProps> = ({
  className = '',
  width = 190,
  height = 54,
  color = 'currentColor',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 200 50"
        width={width}
        height={height}
        style={{ overflow: 'visible' }}
      >
        {/* Slanted cursive styled "Thank You!" */}
        <text
          x="100"
          y="28"
          textAnchor="middle"
          fill={color}
          fontSize="24"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Brush Script MT', 'Dancing Script', 'Caveat', 'Playfair Display', cursive, serif"
          letterSpacing="0.5px"
        >
          Thank You!
        </text>

        {/* Artistic curved underline flourish matching the reference photo */}
        <path
          d="M 52,36 Q 100,43 148,35 Q 120,44 75,41"
          fill={color}
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
