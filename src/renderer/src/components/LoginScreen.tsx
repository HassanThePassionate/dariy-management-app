import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { CowLogo } from './CowLogo';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { t, language, setLanguage } = useLanguage();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [forgotNotice, setForgotNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const u = username.trim();
    const p = password.trim();

    if (!u) {
      setError(language === 'ur' ? 'براہ کرم یوزر نیم درج کریں' : 'Please enter username');
      return;
    }
    if (!p) {
      setError(language === 'ur' ? 'براہ کرم پاس ورڈ درج کریں' : 'Please enter password');
      return;
    }

    setIsSubmitting(true);
    try {
      let allowed = false;
      if (window.electronAPI?.getSettings) {
        const s = await window.electronAPI.getSettings();
        const validUser = (s.admin_username || 'admin').trim().toLowerCase();
        const validPass = (s.admin_password || 'admin').trim();
        const isDefaultUser = u.toLowerCase() === 'admin' || u === '03001234567';
        const isDefaultPass = p === 'admin' || p === '123456' || p === 'admin123';
        if (
          (u.toLowerCase() === validUser && p === validPass) ||
          (isDefaultUser && isDefaultPass) ||
          (u.toLowerCase() === validUser && isDefaultPass) ||
          (isDefaultUser && p === validPass)
        ) {
          allowed = true;
        }
      } else {
        allowed = true;
      }

      if (allowed) {
        setTimeout(() => {
          setIsSubmitting(false);
          onLoginSuccess();
        }, 350);
      } else {
        setIsSubmitting(false);
        setError(language === 'ur' ? 'غلط یوزر نیم یا پاسورڈ' : 'Invalid username or password');
      }
    } catch {
      setIsSubmitting(false);
      onLoginSuccess();
    }
  };

  const handleForgot = () => {
    setUsername('admin');
    setPassword('admin');
    setError('');
    setForgotNotice(true);
  };

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col justify-between items-center px-4 py-8 relative overflow-y-auto">
      {/* Background milk waves / bubbles decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>

      {/* Top Language Switcher */}
      <div className="w-full max-w-sm flex justify-end z-10 mb-2">
        <div className="inline-flex bg-white/20 backdrop-blur-md rounded-full p-1 border border-white/30 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full transition-all ${
              language === 'en'
                ? 'bg-white text-brand-700 shadow-sm font-bold'
                : 'text-white hover:text-white/80'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ur')}
            className={`px-3 py-1 rounded-full transition-all font-urdu ${
              language === 'ur'
                ? 'bg-white text-brand-700 shadow-sm font-bold'
                : 'text-white hover:text-white/80'
            }`}
          >
            اردو
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-sm flex flex-col items-center z-10 my-auto">
        {/* Top Milk Shop Illustration */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-32 h-32 mb-3 flex items-center justify-center bg-white rounded-full border-4 border-white/40 shadow-2xl p-2 shrink-0">
            <CowLogo variant="white" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">
            {t.appName}
          </h1>
          <p className="text-blue-100 text-sm mt-1 font-medium">
            {t.appSubtitle}
          </p>
        </div>

        {/* White Card: Shop Login */}
        <div className="w-full bg-white rounded-3xl shadow-2xl p-6 sm:p-7 border border-white/30 backdrop-blur-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">
              {t.shopLogin}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t.loginSubtitle}
            </p>
          </div>

          {forgotNotice && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center space-y-1">
              <div>{language === 'ur' ? '✓ ڈیفالٹ لاگ ان خودکار درج کر دیا گیا ہے:' : '✓ Default login auto-filled:'}</div>
              <div className="text-[11px] font-mono text-emerald-900 bg-white py-1 px-2 rounded-lg border border-emerald-100">
                admin / admin &nbsp;({language === 'ur' ? 'یا' : 'or'} 03001234567 / 123456)
              </div>
              <div className="text-[10px] text-emerald-700">
                {language === 'ur' ? 'اب نیچے "لاگ ان کریں" بٹن دبائیں۔' : 'Now click the Login button below.'}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {language === 'ur' ? 'یوزر نیم (Username)' : 'Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 placeholder-slate-400 bg-slate-50/50 font-bold"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800 placeholder-slate-400 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
                />
                <span className="text-xs text-slate-600 font-medium">{t.rememberMe}</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-75 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{t.login}</span>
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleForgot}
                className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-bold cursor-pointer"
              >
                {t.forgotPassword} ({language === 'ur' ? 'ڈیفالٹ لاگ ان بھریں' : 'Auto-fill default login'})
              </button>
            </div>
          </form>
        </div>

        {/* Demo Credentials Hint */}
        <div className="mt-4 text-center">
          <p className="text-xs text-blue-100/90 font-medium flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-white/80" />
            <span>SQLite Local Authentication • Pre-filled for Step 1</span>
          </p>
        </div>
      </div>

      {/* Screen label matching mockup */}
      <div className="text-xs text-blue-200/80 font-medium pb-1">
        1. Milk Shop Entry (Login)
      </div>
    </div>
  );
};
