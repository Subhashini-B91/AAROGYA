import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { AccessibilityPanel } from './components/AccessibilityPanel';
import { ScreenIntake } from './components/ScreenIntake';
import { ScreenInterview } from './components/ScreenInterview';
import { ScreenDoctorView } from './components/ScreenDoctorView';
import { ScreenPatientDashboard } from './components/ScreenPatientDashboard';
import {
  Language,
  AccessibilitySettings,
  PatientProfile,
  UploadedDocument,
  PhysicianCaseSummary,
  ClinicalSchema,
  ChatMessage,
} from './types';
import { reconcileInterviewAndDocs } from './utils/clinicalData';
import { speakText } from './utils/voiceUtils';
import { voiceSessionManager } from './utils/voiceSessionManager';
import {
  ClinicalCaseState,
  formatCaseForEMR,
  extractClinicalInformation,
  getInitialClinicalCaseState,
  generateConciseClinicalSummary,
} from './utils/clinicalExtraction';

export default function App() {
  // Navigation State
  const [currentScreen, setCurrentScreen] = useState<'intake' | 'interview' | 'doctor' | 'dashboard'>('intake');

  // Locale & Accessibility
  const [language, setLanguage] = useState<Language>('en');
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>({
    highContrast: false,
    largeText: false,
    audioGuided: false,
    signLanguageAvatar: false,
  });
  const [isAccessibilityModalOpen, setIsAccessibilityModalOpen] = useState(false);

  // Active Patient & Session Data (Default empty states)
  const [activePatient, setActivePatient] = useState<PatientProfile | null>(null);
  const [visitType, setVisitType] = useState<'allopathic' | 'ayush'>('allopathic');
  const [liveCaseState, setLiveCaseState] = useState<ClinicalCaseState>(getInitialClinicalCaseState());

  // Clinical Documents & Summaries (Default empty states)
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [currentSummary, setCurrentSummary] = useState<PhysicianCaseSummary | null>(null);
  const [confirmedSummaries, setConfirmedSummaries] = useState<PhysicianCaseSummary[]>([]);

  // Loading state
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Apply Accessibility Classes to Body
  useEffect(() => {
    if (accessibility.highContrast) {
      document.documentElement.classList.add('contrast-more');
    } else {
      document.documentElement.classList.remove('contrast-more');
    }

    if (accessibility.largeText) {
      document.documentElement.classList.add('text-lg');
    } else {
      document.documentElement.classList.remove('text-lg');
    }
  }, [accessibility.highContrast, accessibility.largeText]);

  // Handle Intake Completion
  const handleCompleteIntake = (
    patient: PatientProfile,
    vType: 'allopathic' | 'ayush',
    isReturning: boolean
  ) => {
    setActivePatient(patient);
    setVisitType(vType);
    setLanguage(patient.preferredLanguage);

    const initialCase = extractClinicalInformation(
      getInitialClinicalCaseState(),
      patient.primaryConcern || ''
    );
    setLiveCaseState(initialCase);
    const initialEMR = formatCaseForEMR(initialCase, patient, vType);
    setCurrentSummary(initialEMR);

    if (isReturning) {
      // Returning patient -> go to dashboard
      setCurrentScreen('dashboard');
    } else {
      // New patient -> proceed to AI Clinical Interview
      setCurrentScreen('interview');
    }
  };

  // Live case synchronization from ongoing voice or text consultation
  const handleLiveCaseUpdate = useCallback((updatedCase: ClinicalCaseState, transcripts: ChatMessage[]) => {
    setLiveCaseState(updatedCase);
    if (activePatient) {
      const liveEMR = formatCaseForEMR(updatedCase, activePatient, visitType, transcripts);
      setCurrentSummary(liveEMR);
      const cacheKey = `${activePatient.id}-${visitType}`;
      summaryCacheRef.current.set(cacheKey, liveEMR);

      // Asynchronously synchronize with backend liveCases map
      fetch('/api/live-case/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activePatient.id,
          liveData: {
            caseState: updatedCase,
            transcripts,
            caseSummary: liveEMR,
          },
        }),
      }).catch((e) => console.warn('Live case sync error:', e));
    }
  }, [activePatient, visitType]);

  // Summary cache to prevent duplicate model calls
  const summaryCacheRef = useRef<Map<string, PhysicianCaseSummary>>(new Map());

  // Handle Generating Clinical Case Summary
  const handleGenerateSummary = async (schema: ClinicalSchema, transcript: ChatMessage[]) => {
    if (!activePatient) return;

    // Check if summary was already generated for this patient & encounter
    const cacheKey = `${activePatient.id}-${visitType}`;
    if (summaryCacheRef.current.has(cacheKey)) {
      const cached = summaryCacheRef.current.get(cacheKey)!;
      setCurrentSummary(cached);
      setCurrentScreen('doctor');
      return;
    }

    setIsGeneratingSummary(true);

    try {
      const res = await fetch('/api/summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: activePatient,
          visitType,
          clinicalSchema: schema,
          documents,
          transcript,
          targetLanguage: language,
        }),
      });

      const data = await res.json();

      // Check discrepancies between interview and uploaded documents
      const discrepancies = reconcileInterviewAndDocs(schema, documents);
      const fallbackFromLive = formatCaseForEMR(liveCaseState, activePatient, visitType, transcript);

      // Generate concise 4-5 line spoken summary
      const conciseSummary = generateConciseClinicalSummary(
        transcript,
        activePatient,
        visitType,
        language
      );

      const clinicalSummaryEn =
        data.clinicalSummary ||
        data.summaryEnglish?.clinicalSummary ||
        conciseSummary.english;
      const clinicalSummaryHi =
        data.clinicalSummaryHindi ||
        data.summaryHindi?.clinicalSummary ||
        conciseSummary.hindi;
      const clinicalSummaryTa =
        data.clinicalSummaryTamil ||
        data.summaryTamil?.clinicalSummary ||
        conciseSummary.tamil;

      const newSummary: PhysicianCaseSummary = {
        id: `SUM-${Date.now()}`,
        patientId: activePatient.id,
        visitType,
        encounterDate: new Date().toISOString(),
        transcript,
        clinicalSummary: clinicalSummaryEn,
        clinicalSummaryHindi: clinicalSummaryHi,
        clinicalSummaryTamil: clinicalSummaryTa,
        summaryEnglish: {
          ...fallbackFromLive.summaryEnglish,
          ...(data.summaryEnglish || {}),
          clinicalSummary: clinicalSummaryEn,
        },
        summaryHindi: {
          ...fallbackFromLive.summaryHindi,
          ...(data.summaryHindi || {}),
          clinicalSummary: clinicalSummaryHi,
        },
        summaryTamil: {
          ...fallbackFromLive.summaryTamil,
          ...(data.summaryTamil || {}),
          clinicalSummary: clinicalSummaryTa,
        },
        patientAudioConfirmationText:
          data.patientAudioConfirmationText ||
          fallbackFromLive.patientAudioConfirmationText,
        discrepancies,
        status: 'ai_generated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      summaryCacheRef.current.set(cacheKey, newSummary);
      setCurrentSummary(newSummary);
      setIsGeneratingSummary(false);
      setCurrentScreen('doctor');

      if (accessibility.audioGuided) {
        speakText(
          'Clinical case summary generated successfully. Now viewing Doctor EMR dashboard.',
          language
        );
      }
    } catch (err) {
      console.error('Error generating summary:', err);
      if (activePatient) {
        const fallbackFromLive = formatCaseForEMR(liveCaseState, activePatient, visitType, transcript);
        const conciseSummary = generateConciseClinicalSummary(
          transcript,
          activePatient,
          visitType,
          language
        );
        fallbackFromLive.clinicalSummary = conciseSummary.english;
        fallbackFromLive.clinicalSummaryHindi = conciseSummary.hindi;
        fallbackFromLive.clinicalSummaryTamil = conciseSummary.tamil;
        if (fallbackFromLive.summaryEnglish) {
          fallbackFromLive.summaryEnglish.clinicalSummary = conciseSummary.english;
        }
        if (fallbackFromLive.summaryHindi) {
          fallbackFromLive.summaryHindi.clinicalSummary = conciseSummary.hindi;
        }
        if (fallbackFromLive.summaryTamil) {
          fallbackFromLive.summaryTamil.clinicalSummary = conciseSummary.tamil;
        }
        setCurrentSummary(fallbackFromLive);
      }
      setIsGeneratingSummary(false);
      setCurrentScreen('doctor');
    }
  };

  // Handle Confirm and Sign Case by Doctor
  const handleConfirmAndSign = async (confirmedSummary: PhysicianCaseSummary) => {
    if (!activePatient) return;

    try {
      await fetch('/api/records/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activePatient.id,
          confirmedCaseSummary: confirmedSummary,
          uploadedDocuments: documents,
        }),
      });
    } catch (e) {
      console.warn('Record save error:', e);
    }

    setCurrentSummary(confirmedSummary);
    setConfirmedSummaries([confirmedSummary, ...confirmedSummaries.filter((s) => s.id !== confirmedSummary.id)]);

    if (accessibility.audioGuided) {
      speakText('Case confirmed and signed by doctor. Saved to patient health locker.', language);
    }
  };

  const handleAddDocument = (doc: UploadedDocument) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        accessibility.highContrast
          ? 'bg-black text-white'
          : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Universal Header */}
      <Header
        currentScreen={currentScreen}
        onNavigate={(scr) => {
          voiceSessionManager.endSession();
          setCurrentScreen(scr);
        }}
        language={language}
        onLanguageChange={(lang) => setLanguage(lang)}
        accessibility={accessibility}
        onToggleAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
        activePatient={activePatient}
        visitType={visitType}
      />

      {/* Main Screen Body */}
      <main className="flex-1">
        {isGeneratingSummary && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-slate-200 space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center mx-auto animate-bounce">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Generating Bilingual Case Summary...
              </h3>
              <p className="text-xs text-slate-500">
                Synthesizing SOCRATES interview breakdown, clinical assessments, and OCR document reconciliation.
              </p>
            </div>
          </div>
        )}

        {currentScreen === 'intake' && (
          <ScreenIntake
            language={language}
            onLanguageChange={(lang) => setLanguage(lang)}
            onCompleteIntake={handleCompleteIntake}
            accessibility={accessibility}
            onOpenAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
          />
        )}

        {currentScreen === 'interview' && (
          activePatient ? (
            <ScreenInterview
              patient={activePatient}
              visitType={visitType}
              language={language}
              onLanguageChange={(lang) => setLanguage(lang)}
              accessibility={accessibility}
              onGenerateSummary={handleGenerateSummary}
              documents={documents}
              onAddDocument={handleAddDocument}
              onLiveCaseUpdate={handleLiveCaseUpdate}
              initialCaseState={liveCaseState}
            />
          ) : (
            <ScreenIntake
              language={language}
              onLanguageChange={(lang) => setLanguage(lang)}
              onCompleteIntake={handleCompleteIntake}
              accessibility={accessibility}
              onOpenAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
            />
          )
        )}

        {currentScreen === 'doctor' && (
          <ScreenDoctorView
            patient={activePatient}
            visitType={visitType}
            summary={currentSummary}
            onUpdateSummary={(updated) => setCurrentSummary(updated)}
            onConfirmAndSign={handleConfirmAndSign}
            documents={documents}
            language={language}
          />
        )}

        {currentScreen === 'dashboard' && (
          activePatient ? (
            <ScreenPatientDashboard
              patient={activePatient}
              visitType={visitType}
              confirmedSummaries={confirmedSummaries}
              documents={documents}
              onStartNewConsultation={() => setCurrentScreen('interview')}
              onAddDocument={handleAddDocument}
              language={language}
            />
          ) : (
            <ScreenIntake
              language={language}
              onLanguageChange={(lang) => setLanguage(lang)}
              onCompleteIntake={handleCompleteIntake}
              accessibility={accessibility}
              onOpenAccessibilityModal={() => setIsAccessibilityModalOpen(true)}
            />
          )
        )}
      </main>

      {/* Accessibility Controls Modal */}
      <AccessibilityPanel
        isOpen={isAccessibilityModalOpen}
        onClose={() => setIsAccessibilityModalOpen(false)}
        settings={accessibility}
        onUpdateSettings={(newSettings) => setAccessibility((prev) => ({ ...prev, ...newSettings }))}
        language={language}
        onLanguageChange={(lang) => setLanguage(lang)}
      />
    </div>
  );
}
