import React from 'react';
import {
  Stethoscope,
  Volume2,
  SlidersHorizontal,
  User,
  Globe,
  Sparkles,
  FileText,
  Activity,
} from 'lucide-react';
import { Language, AccessibilitySettings, PatientProfile } from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';

interface HeaderProps {
  currentScreen: 'intake' | 'interview' | 'doctor' | 'dashboard';
  onNavigate: (screen: 'intake' | 'interview' | 'doctor' | 'dashboard') => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  accessibility: AccessibilitySettings;
  onToggleAccessibilityModal: () => void;
  activePatient: PatientProfile | null;
  visitType: 'allopathic' | 'ayush';
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  language,
  onLanguageChange,
  accessibility,
  onToggleAccessibilityModal,
  activePatient,
  visitType,
}) => {
  const t = UI_TRANSLATIONS[language];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('intake')}
          className="flex items-center gap-3 cursor-pointer group"
          id="brand-logo-btn"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-700 to-emerald-800 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 font-serif">
                {t.app_title || 'AAROGYA'}
              </span>
              <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">
                Case Taking
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">
              {t.app_subtitle || 'Patient Case Taking Software'}
            </p>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
          <button
            onClick={() => onNavigate('intake')}
            id="nav-intake-btn"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentScreen === 'intake'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.nav_intake}</span>
          </button>

          <button
            onClick={() => onNavigate('interview')}
            id="nav-interview-btn"
            disabled={!activePatient}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentScreen === 'interview'
                ? 'bg-teal-700 text-white shadow-xs'
                : activePatient
                ? 'text-slate-700 hover:text-slate-900'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.nav_consultation}</span>
          </button>

          <button
            onClick={() => onNavigate('doctor')}
            id="nav-doctor-btn"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentScreen === 'doctor'
                ? 'bg-indigo-700 text-white shadow-xs'
                : 'text-slate-700 hover:text-indigo-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t.nav_doctor}</span>
          </button>

          <button
            onClick={() => onNavigate('dashboard')}
            id="nav-dashboard-btn"
            disabled={!activePatient}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              currentScreen === 'dashboard'
                ? 'bg-emerald-700 text-white shadow-xs'
                : activePatient
                ? 'text-slate-700 hover:text-emerald-900'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.nav_portal}</span>
          </button>
        </nav>

        {/* Right Tools: Language, Accessibility, Patient Status */}
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-medium">
            <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              id="lang-selector-select"
              className="bg-transparent border-none py-1 pl-1 pr-6 text-xs text-slate-800 font-semibold focus:outline-hidden cursor-pointer"
            >
              <option value="en">English (EN)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* Accessibility Settings Trigger */}
          <button
            onClick={onToggleAccessibilityModal}
            id="accessibility-modal-btn"
            title="Accessibility Controls (Large text, High contrast, Audio guide)"
            className={`p-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              accessibility.highContrast || accessibility.largeText || accessibility.audioGuided
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-teal-700" />
            <span className="hidden lg:inline">{t.accessibility_settings}</span>
            {accessibility.audioGuided && <Volume2 className="w-3.5 h-3.5 text-amber-700 animate-pulse" />}
          </button>

          {/* Active Patient Badge */}
          {activePatient && (
            <div className="hidden xl:flex items-center gap-2 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
              <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px]">
                {activePatient.name.charAt(0)}
              </div>
              <div className="leading-tight">
                <p className="font-semibold text-slate-900 truncate max-w-[110px]">{activePatient.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{activePatient.id}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
