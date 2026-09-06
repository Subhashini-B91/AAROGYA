import React from 'react';
import {
  X,
  Eye,
  Type,
  Volume2,
  Video,
  Languages,
  Check,
  Sparkles,
} from 'lucide-react';
import { AccessibilitySettings, Language } from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';
import { speakText } from '../utils/voiceUtils';

interface AccessibilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onUpdateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export const AccessibilityPanel: React.FC<AccessibilityPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  language,
  onLanguageChange,
}) => {
  if (!isOpen) return null;
  const t = UI_TRANSLATIONS[language];

  const handleToggleAudioGuide = (enabled: boolean) => {
    onUpdateSettings({ audioGuided: enabled });
    if (enabled) {
      speakText(
        language === 'hi'
          ? 'ऑडियो-निर्देशित मोड सक्रिय किया गया। स्क्रीन के सभी मुख्य विकल्प बोलकर बताए जाएंगे।'
          : language === 'ta'
          ? 'ஆடியோ வழிகாட்டுதல் முறை இயக்கப்பட்டது.'
          : 'Audio-guided navigation mode enabled. Key screen elements will be announced automatically.',
        language
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div
        id="accessibility-panel-modal"
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">{t.accessibility_settings}</h3>
              <p className="text-xs text-slate-400">Inclusive design for elderly, low-vision & multi-ability patients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="close-accessibility-panel-btn"
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Options */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* 1. High Contrast */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-200 text-slate-800">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{t.high_contrast}</h4>
                <p className="text-xs text-slate-500">Sharper borders, pitch-dark text, and high-visibility action focus</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ highContrast: !settings.highContrast })}
              id="toggle-high-contrast-btn"
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.highContrast ? 'bg-teal-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.highContrast ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 2. Large Font Size */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{t.large_text}</h4>
                <p className="text-xs text-slate-500">Increases base font size and button touch targets site-wide</p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ largeText: !settings.largeText })}
              id="toggle-large-text-btn"
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.largeText ? 'bg-teal-700' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.largeText ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 3. Audio Guided Mode */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800">
                <Volume2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900">{t.audio_guided}</h4>
                <p className="text-xs text-slate-500">Automatically speaks screen content & spoken instructions for low-literacy users</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleAudioGuide(!settings.audioGuided)}
              id="toggle-audio-guided-btn"
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                settings.audioGuided ? 'bg-amber-600' : 'bg-slate-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  settings.audioGuided ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* 4. Language Selector */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-teal-700" />
              <h4 className="text-sm font-semibold text-slate-900">{t.preferred_lang}</h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'en', label: 'English', sub: 'Default' },
                { code: 'hi', label: 'हिंदी', sub: 'Hindi' },
                { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
              ].map((item) => (
                <button
                  key={item.code}
                  onClick={() => onLanguageChange(item.code as Language)}
                  id={`lang-opt-${item.code}`}
                  className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all ${
                    language === item.code
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs">{item.label}</span>
                    {language === item.code && <Check className="w-3.5 h-3.5 text-teal-700" />}
                  </div>
                  <span className="text-[10px] text-slate-500">{item.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Sign Language Visual Mode */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-800">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{t.sign_avatar}</h4>
                  <p className="text-xs text-slate-500">Visual ISL assistance and enhanced animated visual feedback during voice consultations</p>
                </div>
              </div>
              <button
                onClick={() => onUpdateSettings({ signLanguageAvatar: !settings.signLanguageAvatar })}
                id="toggle-sign-avatar-btn"
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.signLanguageAvatar ? 'bg-teal-700' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    settings.signLanguageAvatar ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            id="accessibility-done-btn"
            className="px-5 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-colors shadow-xs"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
