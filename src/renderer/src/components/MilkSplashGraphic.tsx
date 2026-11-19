import React from 'react';

interface MilkSplashGraphicProps {
  className?: string;
  size?: number;
}

export const MilkSplashGraphic: React.FC<MilkSplashGraphicProps> = ({
  className = 'w-48 h-48',
  size = 200,
}) => {
  return (
    <div
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background Soft Glow */}
      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl transform scale-90" />

      <svg
        viewBox="0 0 320 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,102,255,0.35)]"
      >
        <defs>
          {/* Glass Gradients */}
          <linearGradient id="bottleGlass" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#dbeafe" stopOpacity="0.15" />
            <stop offset="50%" stopColor="#93c5fd" stopOpacity="0.05" />
            <stop offset="85%" stopColor="#bfdbfe" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="milkLiquid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <linearGradient id="splashGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="80%" stopColor="#f1f5f9" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0066ff" stopOpacity="0" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Cyan ambient wave */}
        <path
          d="M20 220 C60 190, 110 240, 160 215 C210 190, 260 235, 300 215 C315 208, 318 245, 310 270 C280 295, 40 295, 10 265 Z"
          fill="url(#cyanGlow)"
        />

        {/* 1. Behind Milk Splashes */}
        {/* Left Splash Crown */}
        <path
          d="M80 180 C60 140, 45 160, 40 185 C35 210, 60 225, 95 220 C75 200, 75 185, 80 180 Z"
          fill="url(#splashGradient)"
          opacity="0.95"
        />
        <circle cx="38" cy="145" r="4.5" fill="#ffffff" />
        <circle cx="28" cy="165" r="3" fill="#ffffff" />
        <circle cx="55" cy="130" r="2.5" fill="#ffffff" />

        {/* Right Splash Crown */}
        <path
          d="M235 180 C260 135, 275 155, 280 180 C285 205, 260 225, 225 220 C245 200, 245 185, 235 180 Z"
          fill="url(#splashGradient)"
          opacity="0.95"
        />
        <circle cx="282" cy="140" r="4.5" fill="#ffffff" />
        <circle cx="292" cy="160" r="3" fill="#ffffff" />
        <circle cx="265" cy="125" r="2.5" fill="#ffffff" />

        {/* 2. Glass of Milk (Small glass on the left) */}
        <g transform="translate(10, 15)">
          {/* Glass Base & Outline */}
          <path
            d="M88 155 L96 220 C96.5 225, 101 228, 107 228 L123 228 C129 228, 133.5 225, 134 220 L142 155 Z"
            fill="url(#bottleGlass)"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="2"
          />
          {/* Milk Inside Glass */}
          <path
            d="M90 170 L96 220 C96.5 223, 100 225, 105 225 L125 225 C130 225, 133.5 223, 134 220 L140 170 C130 173, 100 173, 90 170 Z"
            fill="url(#milkLiquid)"
          />
          {/* Milk Surface Ellipse */}
          <ellipse cx="115" cy="170" rx="25" ry="4" fill="#ffffff" />
          {/* Glass Reflection */}
          <path
            d="M93 160 L99 218"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* 3. Main Milk Bottle (Center & Tall) */}
        <g>
          {/* Bottle Shadow */}
          <ellipse cx="185" cy="245" rx="42" ry="8" fill="rgba(0,0,0,0.35)" filter="url(#softGlow)" />

          {/* Bottle Milk Fill Body */}
          <path
            d="M162 100 C162 100, 152 115, 150 135 L146 225 C145.5 235, 152 242, 162 242 L208 242 C218 242, 224.5 235, 224 225 L220 135 C218 115, 208 100, 208 100 Z"
            fill="url(#milkLiquid)"
          />

          {/* Milk level surface in bottle neck */}
          <ellipse cx="185" cy="100" rx="23" ry="5" fill="#f8fafc" />

          {/* Glass Bottle Shape (Over liquid) */}
          {/* Cap / Lip */}
          <rect
            x="173"
            y="35"
            width="24"
            height="8"
            rx="3"
            fill="url(#bottleGlass)"
            stroke="rgba(255,255,255,0.8)"
            strokeWidth="2"
          />
          <path
            d="M174 43 L175 65 C175 80, 162 95, 150 120 L146 225 C145 238, 153 245, 165 245 L205 245 C217 245, 225 238, 224 225 L220 120 C208 95, 195 80, 195 65 L196 43 Z"
            fill="url(#bottleGlass)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
          />

          {/* Shiny Glass Highlights */}
          <path
            d="M152 135 L149 220"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M157 140 L155 210"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M178 50 L178 68"
            stroke="rgba(255,255,255,0.9)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* 4. Foreground Dynamic Liquid Splash Waves */}
        <path
          d="M30 240 C60 215, 90 260, 130 235 C160 215, 180 250, 220 230 C250 215, 275 245, 305 235 C310 240, 310 265, 290 275 C250 290, 80 290, 20 270 C15 255, 20 245, 30 240 Z"
          fill="url(#splashGradient)"
        />

        {/* Droplets & Splash Crest Highlights */}
        <path
          d="M45 240 C75 220, 105 255, 140 235 C170 215, 195 248, 235 230 C265 215, 285 240, 298 235"
          stroke="#ffffff"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Floating Milk Droplets */}
        <circle cx="120" cy="195" r="4" fill="#ffffff" />
        <circle cx="170" cy="200" r="3" fill="#ffffff" />
        <circle cx="215" cy="190" r="4.5" fill="#ffffff" />
        <circle cx="245" cy="205" r="3" fill="#ffffff" />
        <circle cx="100" cy="215" r="2.5" fill="#ffffff" />
      </svg>
    </div>
  );
};
