import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Volume2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Activity,
  Layers,
  Sparkles,
  FileText,
  UserPlus,
  LogIn,
  KeyRound,
  Leaf,
  HeartPulse,
} from 'lucide-react';
import { Language, PatientProfile, AccessibilitySettings } from '../types';
import { UI_TRANSLATIONS, CONSENT_AUDIO_TEXT } from '../utils/translations';
import { speakText, stopSpeaking } from '../utils/voiceUtils';

interface ScreenIntakeProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onCompleteIntake: (
    patient: PatientProfile,
    visitType: 'allopathic' | 'ayush',
    isReturning: boolean
  ) => void;
  accessibility: AccessibilitySettings;
  onOpenAccessibilityModal: () => void;
}

export const ScreenIntake: React.FC<ScreenIntakeProps> = ({
  language,
  onLanguageChange,
  onCompleteIntake,
  accessibility,
  onOpenAccessibilityModal,
}) => {
  const t = UI_TRANSLATIONS[language];

  // Two Primary Entry Options: 'new' (New Patient Intake) or 'portal' (Patient Portal)
  const [activeMode, setActiveMode] = useState<'new' | 'portal'>('new');
  const [visitType, setVisitType] = useState<'allopathic' | 'ayush'>('allopathic');
  const [ayushDepartment, setAyushDepartment] = useState<'ayurveda' | 'yoga_naturopathy' | 'homeopathy' | 'unani_siddha'>('ayurveda');

  // New Patient Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [sex, setSex] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [abhaId, setAbhaId] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [consentCapture, setConsentCapture] = useState(true);
  const [consentSharing, setConsentSharing] = useState(true);

  // Returning Patient Portal Login (Health ID + Phone)
  const [loginHealthId, setLoginHealthId] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isPlayingConsentAudio, setIsPlayingConsentAudio] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePlayConsentAudio = () => {
    if (isPlayingConsentAudio) {
      stopSpeaking();
      setIsPlayingConsentAudio(false);
      return;
    }

    setIsPlayingConsentAudio(true);
    speakText(
      CONSENT_AUDIO_TEXT[language],
      language,
      () => setIsPlayingConsentAudio(true),
      () => setIsPlayingConsentAudio(false),
      () => setIsPlayingConsentAudio(false)
    );
  };

  const handleNewPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया मरीज का पूरा नाम दर्ज करें'
          : language === 'ta'
          ? 'தயவுசெய்து நோயாளியின் முழு பெயரை உள்ளிடவும்'
          : 'Please enter patient full name'
      );
      return;
    }

    if (!age || Number(age) < 1 || Number(age) > 120) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया वैध उम्र (1-120) दर्ज करें'
          : language === 'ta'
          ? 'சரியான வயதை உள்ளிடவும் (1-120)'
          : 'Please enter a valid age (1-120)'
      );
      return;
    }

    if (!consentCapture) {
      setErrorMessage(
        language === 'hi'
          ? 'परामर्श शुरू करने के लिए सहमति आवश्यक है'
          : language === 'ta'
          ? 'ஆலோசனை தொடங்க ஒப்புதல் தேவை'
          : 'Informed consent is required to proceed with pre-consultation intake'
      );
      return;
    }

    const assignedId = `PT-${Math.floor(10000 + Math.random() * 89999)}`;
    const generatedAbha = abhaId.trim() || `91-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}-${Math.floor(1000 + Math.random() * 8999)}`;

    const newPatient: PatientProfile = {
      id: assignedId,
      name: name.trim(),
      abhaId: generatedAbha,
      age: Number(age),
      sex,
      preferredLanguage: language,
      phone: phone.trim() || '9876543210',
      consentDataCapture: consentCapture,
      consentDataSharing: consentSharing,
      consentTimestamp: new Date().toISOString(),
      isRegistered: true,
      department: visitType === 'ayush' ? ayushDepartment : 'allopathic',
      primaryConcern: primaryConcern.trim() || 'Routine Consultation',
    };

    onCompleteIntake(newPatient, visitType, false);
  };

  const handlePortalLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!loginHealthId.trim()) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया अपना हेल्थ आईडी / आभा आईडी दर्ज करें'
          : language === 'ta'
          ? 'தயவுசெய்து உங்கள் சுகாதார அடையாள எண் (Health ID) உள்ளிடவும்'
          : 'Please enter your Health ID or ABHA ID'
      );
      return;
    }

    if (!loginPhone.trim()) {
      setErrorMessage(
        language === 'hi'
          ? 'कृपया अपना पंजीकृत फोन नंबर दर्ज करें'
          : language === 'ta'
          ? 'தயவுசெய்து உங்கள் பதிவு செய்யப்பட்ட தொலைபேசி எண்ணை உள்ளிடவும்'
          : 'Please enter your registered Phone Number (Password)'
      );
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/patient/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          healthId: loginHealthId.trim(),
          phone: loginPhone.trim(),
        }),
      });

      const data = await res.json();
      setIsLoggingIn(false);

      if (data && data.patient) {
        const patientData: PatientProfile = {
          ...data.patient,
          preferredLanguage: language,
        };
        onCompleteIntake(patientData, (data.patient.department === 'allopathic' ? 'allopathic' : 'ayush'), true);
      } else {
        // Fallback login
        const fallbackPatient: PatientProfile = {
          id: loginHealthId.trim(),
          name: 'Registered Patient',
          abhaId: loginHealthId.trim().includes('-') ? loginHealthId.trim() : `91-${loginHealthId.trim()}-4421`,
          age: 42,
          sex: 'Male',
          phone: loginPhone.trim(),
          preferredLanguage: language,
          consentDataCapture: true,
          consentDataSharing: true,
          consentTimestamp: new Date().toISOString(),
          isRegistered: true,
        };
        onCompleteIntake(fallbackPatient, visitType, true);
      }
    } catch (err) {
      setIsLoggingIn(false);
      const fallbackPatient: PatientProfile = {
        id: loginHealthId.trim(),
        name: 'Registered Patient',
        abhaId: loginHealthId.trim().includes('-') ? loginHealthId.trim() : `91-${loginHealthId.trim()}-4421`,
        age: 42,
        sex: 'Male',
        phone: loginPhone.trim(),
        preferredLanguage: language,
        consentDataCapture: true,
        consentDataSharing: true,
        consentTimestamp: new Date().toISOString(),
        isRegistered: true,
      };
      onCompleteIntake(fallbackPatient, visitType, true);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100/60 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Product Branding Banner */}
        <div className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.app_badge}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-serif tracking-tight">
              {t.app_title}
            </h1>
            <p className="text-xs sm:text-sm font-medium text-teal-200">
              {t.app_subtitle}
            </p>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              {t.app_desc}
            </p>
          </div>

          {/* Consolidated Language Selection */}
          <div className="bg-slate-800/90 p-2 rounded-2xl border border-slate-700 space-y-1">
            <span className="text-[10px] font-bold uppercase text-slate-400 block px-1 tracking-wider">
              {t.select_language}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onLanguageChange('en')}
                id="btn-lang-intake-en"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  language === 'en' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('hi')}
                id="btn-lang-intake-hi"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  language === 'hi' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => onLanguageChange('ta')}
                id="btn-lang-intake-ta"
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  language === 'ta' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>

        {/* TWO PRIMARY ENTRY OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: NEW PATIENT INTAKE */}
          <div
            onClick={() => setActiveMode('new')}
            id="card-new-patient-intake"
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
              activeMode === 'new'
                ? 'bg-white border-teal-700 shadow-md ring-2 ring-teal-600/20'
                : 'bg-white/80 border-slate-200 hover:border-teal-400 hover:bg-white'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  activeMode === 'new' ? 'bg-teal-700 text-white shadow-sm' : 'bg-teal-50 text-teal-700'
                }`}>
                  <UserPlus className="w-6 h-6" />
                </div>
                {activeMode === 'new' && (
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                    {t.active_selection}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-serif">
                  {t.new_intake_title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {t.new_intake_desc}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-800">
              <span>{t.start_intake_btn}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2: PATIENT PORTAL */}
          <div
            onClick={() => setActiveMode('portal')}
            id="card-patient-portal-login"
            className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
              activeMode === 'portal'
                ? 'bg-white border-teal-700 shadow-md ring-2 ring-teal-600/20'
                : 'bg-white/80 border-slate-200 hover:border-teal-400 hover:bg-white'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  activeMode === 'portal' ? 'bg-teal-700 text-white shadow-sm' : 'bg-teal-50 text-teal-700'
                }`}>
                  <LogIn className="w-6 h-6" />
                </div>
                {activeMode === 'portal' && (
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                    {t.active_selection}
                  </span>
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 font-serif">
                  {t.portal_title}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {t.portal_desc}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-800">
              <span>{t.login_portal_link}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Main Content Area based on Selection */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeMode === 'new' ? (
            /* NEW PATIENT INTAKE FLOW */
            <div className="space-y-6">
              {/* Department Selection with AYUSH & Allopathic */}
              <div>
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                  {t.step_department}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setVisitType('allopathic')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      visitType === 'allopathic'
                        ? 'border-teal-700 bg-teal-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Stethoscope className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-bold text-slate-900">{t.general_medicine}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{t.general_desc}</p>
                  </div>

                  <div
                    onClick={() => setVisitType('ayush')}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      visitType === 'ayush'
                        ? 'border-teal-700 bg-teal-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Leaf className="w-4 h-4 text-teal-700" />
                      <span className="text-xs font-bold text-slate-900">{t.ayush_medicine}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{t.integrative_desc}</p>
                  </div>
                </div>

                {/* AYUSH Sub-specialty selection if AYUSH is chosen */}
                {visitType === 'ayush' && (
                  <div className="mt-3 p-3 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-2">
                    <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wider block">
                      {t.select_ayush_system}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {[
                        { id: 'ayurveda', label: t.ayurveda, sub: 'कायचिकित्सा' },
                        { id: 'yoga_naturopathy', label: t.yoga_naturopathy, sub: 'योग व प्राकृतिक' },
                        { id: 'homeopathy', label: t.homeopathy, sub: 'होम्योपैथी' },
                        { id: 'unani_siddha', label: t.unani_siddha, sub: 'यूनानी एवं सिद्ध' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setAyushDepartment(item.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            ayushDepartment === item.id
                              ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-xs'
                              : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400'
                          }`}
                        >
                          <div className="text-xs font-bold leading-tight">{item.label}</div>
                          <div className={`text-[10px] mt-0.5 ${ayushDepartment === item.id ? 'text-teal-200' : 'text-slate-400'}`}>
                            {item.sub}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Patient Demographics */}
              <form onSubmit={handleNewPatientSubmit} className="space-y-4">
                <span className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  {t.step_patient_info}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.full_name} *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.full_name_placeholder}
                      id="input-patient-name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.age} *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        required
                        value={age}
                        onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={t.age_placeholder}
                        id="input-patient-age"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.sex}
                      </label>
                      <select
                        value={sex}
                        onChange={(e) => setSex(e.target.value as any)}
                        id="select-patient-sex"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                      >
                        <option value="Male">{t.male}</option>
                        <option value="Female">{t.female}</option>
                        <option value="Other">{t.other}</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.phone}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t.phone_placeholder}
                      id="input-patient-phone"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {t.abha_id}
                    </label>
                    <input
                      type="text"
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                      placeholder={t.abha_hint}
                      id="input-patient-abha"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.primary_concern}
                  </label>
                  <input
                    type="text"
                    value={primaryConcern}
                    onChange={(e) => setPrimaryConcern(e.target.value)}
                    placeholder={t.primary_concern_placeholder}
                    id="input-primary-concern"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Informed Consent Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      {t.consent_title}
                    </span>
                    <button
                      type="button"
                      onClick={handlePlayConsentAudio}
                      id="btn-play-consent"
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isPlayingConsentAudio ? t.stop_audio : t.play_consent_audio}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{t.consent_body}</p>

                  <div className="space-y-2 pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentCapture}
                        onChange={(e) => setConsentCapture(e.target.checked)}
                        id="check-consent-capture"
                        className="mt-0.5 rounded-sm text-teal-700 focus:ring-teal-600"
                      />
                      <span>{t.consent_capture}</span>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentSharing}
                        onChange={(e) => setConsentSharing(e.target.checked)}
                        id="check-consent-sharing"
                        className="mt-0.5 rounded-sm text-teal-700 focus:ring-teal-600"
                      />
                      <span>{t.consent_sharing}</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-start-intake"
                  className="w-full py-4 bg-teal-700 hover:bg-teal-800 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
                >
                  <span>{t.register_button}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            /* PATIENT PORTAL LOGIN FLOW (Health ID + Phone) */
            <div className="space-y-6">
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-700" />
                  <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider">
                    {t.portal_auth_title}
                  </h4>
                </div>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {t.portal_auth_desc}
                </p>
              </div>

              <form onSubmit={handlePortalLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.portal_health_id_label}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={loginHealthId}
                      onChange={(e) => setLoginHealthId(e.target.value)}
                      placeholder={t.portal_health_id_placeholder}
                      id="input-portal-health-id"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-mono font-medium"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t.portal_login_tip}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.portal_phone_label}
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="password"
                      required
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder={t.portal_phone_placeholder}
                      id="input-portal-phone"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-mono font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  id="btn-login-portal-submit"
                  className="w-full py-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
                >
                  <span>{isLoggingIn ? t.verifying_credentials : t.login_button}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
