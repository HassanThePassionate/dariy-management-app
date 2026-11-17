import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface LoaderProps {
  message?: string;
  submessage?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message, submessage }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-300">
      <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-blue-100 text-center animate-fade-in">
        {/* Milk Bottle Animation */}
        <div className="relative mb-5 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center relative">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-brand-500 animate-ping opacity-25"></div>
            
            {/* Custom Milk Bottle & Glass SVG */}
            <svg
              className="w-12 h-12 text-brand-600 animate-milk-pulse"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Milk Bottle */}
              <path
                d="M16 10V6C16 4.89543 16.8954 4 18 4H24C25.1046 4 26 4.89543 26 6V10M14 15L16 10H26L28 15V42C28 43.1046 27.1046 44 26 44H16C14.8954 44 14 43.1046 14 42V15Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 26C16 25 20 27 28 26V42C28 43.1046 27.1046 44 26 44H16C14.8954 44 14 43.1046 14 42V26Z"
                fill="currentColor"
                fillOpacity="0.2"
              />
              {/* Milk Glass */}
              <path
                d="M32 20L34 42C34 43.1046 34.8954 44 36 44H40C41.1046 44 42 43.1046 42 42L44 20H32Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M33 30C35 29 38 31 43 30L42 42C42 43.1046 41.1046 44 40 44H36C34.8954 44 34 43.1046 34 42L33 30Z"
                fill="currentColor"
                fillOpacity="0.25"
              />
              {/* Sparkle drop */}
              <circle cx="21" cy="20" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Text */}
        <h3 className="text-lg font-bold text-slate-800 mb-1">
          {message || t.loading}
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          {submessage || 'SQLite database initializing...'}
        </p>

        {/* Progress bar */}
        <div className="w-48 h-1.5 bg-slate-100 rounded-full mt-5 overflow-hidden">
          <div className="h-full bg-brand-600 rounded-full animate-pulse w-3/4"></div>
        </div>
      </div>
    </div>
  );
};
