import React from 'react';

interface CowIllustrationProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

/**
 * High-definition vector illustration of a dairy cow and calf
 * grazing on a soft green pasture mound with leaves,
 * precisely matching the style of the reference invoice design.
 */
export const CowIllustrationGraphic: React.FC<CowIllustrationProps> = ({
  className = '',
  width = 170,
  height = 105,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 145"
      width={width}
      height={height}
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Soft pasture hill gradient */}
        <linearGradient id="hillGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b4e4ba" />
          <stop offset="100%" stopColor="#8ecf97" />
        </linearGradient>
        {/* Subtle shadow under cows */}
        <ellipse id="shadow" cx="0" cy="0" rx="30" ry="4" fill="#6ba773" opacity="0.45" />
      </defs>

      {/* --- Grassy Pasture Mound --- */}
      <path
        d="M 5,140 Q 60,95 140,110 Q 195,120 235,140 L 5,140 Z"
        fill="url(#hillGrad)"
      />
      {/* Secondary lower hill layer */}
      <path
        d="M 30,140 Q 90,115 170,122 Q 210,126 235,140 L 30,140 Z"
        fill="#82c48c"
        opacity="0.35"
      />

      {/* Ground shadows under hooves */}
      <use href="#shadow" x="78" y="128" transform="scale(1.2, 1)" />
      <use href="#shadow" x="180" y="132" transform="scale(0.8, 0.9)" />

      {/* --- Green Sprout / Leaves on right --- */}
      <g transform="translate(208, 102)">
        {/* Stem */}
        <path d="M 4,24 Q 5,14 10,6" fill="none" stroke="#2e7d32" strokeWidth="2" strokeLinecap="round" />
        {/* Left leaf */}
        <path
          d="M 6,14 C 0,10 0,3 7,5 C 9,8 8,13 6,14 Z"
          fill="#4caf50"
          stroke="#2e7d32"
          strokeWidth="0.8"
        />
        {/* Right leaf */}
        <path
          d="M 10,7 C 12,0 18,1 17,8 C 15,11 11,9 10,7 Z"
          fill="#66bb6a"
          stroke="#2e7d32"
          strokeWidth="0.8"
        />
      </g>

      {/* --- MOTHER COW (Holstein Dairy Cow) --- */}
      <g id="mother-cow" transform="translate(18, 12)">
        {/* Tail */}
        <path
          d="M 112,48 Q 120,62 118,80 Q 117,88 120,95"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Tail tuft */}
        <path d="M 120,95 C 123,98 124,103 121,105 C 118,104 118,99 120,95 Z" fill="#1e293b" />

        {/* Hind Legs (Back layer) */}
        <path d="M 100,68 L 100,112 L 95,112 L 96,68 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.8" />
        <rect x="94" y="110" width="7" height="3.5" rx="1" fill="#1e293b" />

        {/* Foreleg (Back layer) */}
        <path d="M 42,65 L 42,110 L 37,110 L 39,65 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.8" />
        <rect x="36" y="108" width="7" height="3.5" rx="1" fill="#1e293b" />

        {/* Udder */}
        <path d="M 82,72 Q 88,82 96,75 Z" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1" />
        <circle cx="86" cy="80" r="1.5" fill="#f43f5e" />
        <circle cx="92" cy="79" r="1.5" fill="#f43f5e" />

        {/* Cow Main Body (White base) */}
        <path
          d="M 32,45 C 32,32 50,30 75,32 C 95,33 112,38 114,48 C 116,58 114,75 106,75 C 98,75 92,72 80,73 C 65,74 52,75 42,75 C 34,75 32,58 32,45 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Black Holstein Spots on Body */}
        {/* Spot 1 (Back/Rump) */}
        <path
          d="M 88,33 C 98,34 112,38 113,48 C 114,56 108,65 102,62 C 96,59 95,48 88,48 C 84,48 84,33 88,33 Z"
          fill="#1e293b"
        />
        {/* Spot 2 (Middle Belly/Flank) */}
        <path
          d="M 58,40 C 68,38 75,44 76,54 C 77,62 70,68 64,68 C 58,68 56,60 55,54 C 54,46 52,42 58,40 Z"
          fill="#1e293b"
        />
        {/* Spot 3 (Shoulder) */}
        <path
          d="M 33,40 C 38,36 46,38 46,46 C 46,54 40,62 35,60 C 32,55 32,46 33,40 Z"
          fill="#1e293b"
        />

        {/* Hind Leg (Front layer) */}
        <path
          d="M 108,55 C 109,68 111,88 108,114 L 102,114 C 103,96 102,78 98,68 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="2.2"
        />
        <rect x="101" y="112" width="8" height="4" rx="1" fill="#1e293b" />

        {/* Foreleg (Front layer) */}
        <path
          d="M 48,52 C 48,68 47,88 47,112 L 41,112 C 42,92 43,74 44,58 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="2.2"
        />
        <rect x="40" y="110" width="8" height="4" rx="1" fill="#1e293b" />

        {/* Neck */}
        <path
          d="M 33,46 L 24,30 C 23,28 27,24 33,26 L 44,38 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="2"
        />

        {/* Cow Head */}
        <g transform="translate(10, 16)">
          {/* Horns */}
          <path d="M 16,10 Q 18,3 23,5" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M 22,9 Q 25,2 29,4" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Ears */}
          <path d="M 12,14 C 7,12 6,18 11,18 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />
          <path d="M 28,13 C 33,11 34,17 29,17 Z" fill="#1e293b" />

          {/* Head Base */}
          <path
            d="M 14,13 C 14,8 26,8 26,13 C 27,18 28,26 25,31 C 23,35 15,35 13,31 C 11,26 13,18 14,13 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="2.2"
          />

          {/* Black Head Spot */}
          <path d="M 14,13 C 15,9 22,9 24,13 C 24,18 20,20 16,18 Z" fill="#1e293b" />

          {/* Eyes */}
          <circle cx="16" cy="18" r="1.8" fill="#1e293b" />
          <circle cx="16.5" cy="17.5" r="0.6" fill="#ffffff" />
          <circle cx="23" cy="18" r="1.8" fill="#1e293b" />
          <circle cx="23.5" cy="17.5" r="0.6" fill="#ffffff" />

          {/* Snout / Muzzle */}
          <ellipse cx="19" cy="30" rx="6.5" ry="4.2" fill="#fed7aa" stroke="#1e293b" strokeWidth="1.6" />
          <circle cx="16.5" cy="30" r="1" fill="#7c2d12" />
          <circle cx="21.5" cy="30" r="1" fill="#7c2d12" />
        </g>
      </g>

      {/* --- BABY CALF (Next to Mother Cow on Right) --- */}
      <g id="baby-calf" transform="translate(138, 52)">
        {/* Tail */}
        <path d="M 52,28 Q 57,36 55,46" fill="none" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />

        {/* Back Legs */}
        <path d="M 46,38 L 46,68 L 43,68 L 44,38 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="42.5" y="67" width="4.5" height="2.5" rx="0.5" fill="#1e293b" />
        <path d="M 50,34 L 50,70 L 47,70 L 48,34 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
        <rect x="46.5" y="69" width="4.5" height="2.5" rx="0.5" fill="#1e293b" />

        {/* Front Legs */}
        <path d="M 22,36 L 22,68 L 19,68 L 20,36 Z" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
        <rect x="18.5" y="67" width="4.5" height="2.5" rx="0.5" fill="#1e293b" />
        <path d="M 26,32 L 26,70 L 23,70 L 24,32 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
        <rect x="22.5" y="69" width="4.5" height="2.5" rx="0.5" fill="#1e293b" />

        {/* Calf Body */}
        <path
          d="M 18,24 C 18,17 28,16 42,17 C 50,18 54,22 53,28 C 53,35 48,43 42,43 C 32,43 24,42 18,24 Z"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="1.8"
        />

        {/* Calf Spots */}
        <path d="M 38,18 C 45,19 50,22 48,28 C 46,33 40,32 37,28 C 35,24 35,19 38,18 Z" fill="#1e293b" />
        <path d="M 22,22 C 26,20 28,24 26,28 C 24,32 20,30 20,26 Z" fill="#1e293b" />

        {/* Calf Head */}
        <g transform="translate(6, 6)">
          {/* Ears */}
          <path d="M 8,8 C 4,6 4,11 8,11 Z" fill="#ffffff" stroke="#1e293b" strokeWidth="1.2" />
          <path d="M 18,7 C 22,5 23,10 19,10 Z" fill="#1e293b" />

          {/* Head Shape */}
          <path
            d="M 9,8 C 9,4 17,4 17,8 C 18,12 18,18 16,21 C 14,24 10,24 8,21 C 7,18 8,12 9,8 Z"
            fill="#ffffff"
            stroke="#1e293b"
            strokeWidth="1.6"
          />
          <path d="M 9,8 C 10,5 15,5 16,8 C 16,11 13,12 11,11 Z" fill="#1e293b" />

          {/* Eyes */}
          <circle cx="10.5" cy="11.5" r="1.3" fill="#1e293b" />
          <circle cx="15.5" cy="11.5" r="1.3" fill="#1e293b" />

          {/* Snout */}
          <ellipse cx="13" cy="20" rx="4.5" ry="3" fill="#fed7aa" stroke="#1e293b" strokeWidth="1.2" />
          <circle cx="11.5" cy="20" r="0.7" fill="#7c2d12" />
          <circle cx="14.5" cy="20" r="0.7" fill="#7c2d12" />
        </g>
      </g>
    </svg>
  );
};
