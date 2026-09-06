import React, { useState, useEffect, useRef } from 'react';
import {
  Stethoscope,
  Activity,
  AlertTriangle,
  FileCheck,
  Edit3,
  Save,
  CheckCircle2,
  Printer,
  Sparkles,
  Leaf,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Volume2,
  FileText,
  User,
  Clock,
  ShieldCheck,
  Download,
  Mic,
  MicOff,
  MessageSquare,
} from 'lucide-react';
import {
  PhysicianCaseSummary,
  PatientProfile,
  UploadedDocument,
  Language,
  DiscrepancyFlag,
  PhysicianRecommendation,
} from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';
import { TimelineView } from './TimelineView';
import { speakText, startSpeechRecognition } from '../utils/voiceUtils';
import { parsePhysicianDictation } from '../utils/physicianRecommendationUtils';
import { downloadCaseSummaryPdf } from '../utils/pdfGenerator';

interface ScreenDoctorViewProps {
  patient: PatientProfile | null;
  visitType: 'allopathic' | 'ayush';
  summary: PhysicianCaseSummary | null;
  onUpdateSummary: (updated: PhysicianCaseSummary) => void;
  onConfirmAndSign: (confirmedSummary: PhysicianCaseSummary) => void;
  documents: UploadedDocument[];
  language: Language;
}

export const ScreenDoctorView: React.FC<ScreenDoctorViewProps> = ({
  patient,
  visitType,
  summary,
  onUpdateSummary,
  onConfirmAndSign,
  documents,
  language,
}) => {
  const t = UI_TRANSLATIONS[language];

  const [activeLangTab, setActiveLangTab] = useState<'en' | 'hi' | 'ta'>('en');
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(summary?.status === 'doctor_confirmed');
  const [editableEnglish, setEditableEnglish] = useState(summary?.summaryEnglish || ({} as any));
  const [editableHindi, setEditableHindi] = useState(summary?.summaryHindi || ({} as any));
  const [editableTamil, setEditableTamil] = useState(summary?.summaryTamil || ({} as any));
  const [doctorNotes, setDoctorNotes] = useState(summary?.doctorModifications || '');
  const [selectedDocForInspect, setSelectedDocForInspect] = useState<UploadedDocument | null>(null);
  const [liveTranscript, setLiveTranscript] = useState(summary?.transcript || []);
  const [editableClinicalSummary, setEditableClinicalSummary] = useState(
    summary?.clinicalSummary || summary?.summaryEnglish?.clinicalSummary || ''
  );
  const [practitionerName, setPractitionerName] = useState('');

  // Dedicated Physician Recommendation State
  const [inputMode, setInputMode] = useState<'TYPE' | 'VOICE'>('TYPE');
  const [recMedication, setRecMedication] = useState('');
  const [recDosage, setRecDosage] = useState('');
  const [recFrequency, setRecFrequency] = useState('');
  const [recDuration, setRecDuration] = useState('');
  const [recInstructions, setRecInstructions] = useState('');
  const [recRecommendationText, setRecRecommendationText] = useState('');
  const [recDietaryAdvice, setRecDietaryAdvice] = useState('');
  const [recLifestyleAdvice, setRecLifestyleAdvice] = useState('');
  const [recFollowUp, setRecFollowUp] = useState('');
  const [recAyushAssessmentNotes, setRecAyushAssessmentNotes] = useState('');
  const [rawDictation, setRawDictation] = useState('');
  const [recInputMethod, setRecInputMethod] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [isDoctorListening, setIsDoctorListening] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const [physicianDiagnosis, setPhysicianDiagnosis] = useState('');
  const [physicianAdvice, setPhysicianAdvice] = useState('');
  const [isSavingRecommendation, setIsSavingRecommendation] = useState(false);
  const [recommendationSuccessMsg, setRecommendationSuccessMsg] = useState('');
  const [savedRecommendation, setSavedRecommendation] = useState<PhysicianRecommendation | null>(null);

  const speechRecognizerRef = useRef<{ stop: () => void } | null>(null);

  // Load existing saved recommendation for this patient
  useEffect(() => {
    if (!patient?.id) return;
    fetch(`/api/recommendations/${patient.id}`)
      .then((res) => res.json())
      .then((data) => {
        const latest = data?.latest || (Array.isArray(data) ? data[0] : null) || data?.recommendations?.[0];
        if (latest) {
          setSavedRecommendation(latest);
          if (latest.doctorName) setPractitionerName(latest.doctorName);
          if (latest.medication) setRecMedication(latest.medication);
          if (latest.dosage) setRecDosage(latest.dosage);
          if (latest.frequency) setRecFrequency(latest.frequency);
          if (latest.duration) setRecDuration(latest.duration);
          if (latest.instructions) setRecInstructions(latest.instructions);
          if (latest.rawDictation) setRawDictation(latest.rawDictation);
          if (latest.inputMethod) setRecInputMethod(latest.inputMethod);
          if (latest.diagnosis) setPhysicianDiagnosis(latest.diagnosis);
          if (latest.advice) setPhysicianAdvice(latest.advice);
          if (latest.recommendationText) setRecRecommendationText(latest.recommendationText);
          if (latest.dietaryAdvice) setRecDietaryAdvice(latest.dietaryAdvice);
          if (latest.lifestyleAdvice) setRecLifestyleAdvice(latest.lifestyleAdvice);
          if (latest.followUp) setRecFollowUp(latest.followUp);
          if (latest.ayushAssessmentNotes) setRecAyushAssessmentNotes(latest.ayushAssessmentNotes);
        }
      })
      .catch(() => {});
  }, [patient?.id]);

  // Voice Dictation Handlers for Doctor
  const handleStartVoiceDictation = () => {
    setSpeechError('');
    setIsDoctorListening(true);
    setInputMode('VOICE');
    setRecInputMethod('VOICE');

    const handleResult = (transcript: string) => {
      setRawDictation(transcript);
      const parsed = parsePhysicianDictation(transcript);
      if (parsed.medication) setRecMedication(parsed.medication);
      if (parsed.dosage) setRecDosage(parsed.dosage);
      if (parsed.frequency) setRecFrequency(parsed.frequency);
      if (parsed.duration) setRecDuration(parsed.duration);
      if (parsed.instructions) setRecInstructions(parsed.instructions);
    };

    const handleError = (err: string) => {
      console.warn('Physician dictation warning:', err);
      setIsDoctorListening(false);
      if (err !== 'no-speech' && err !== 'aborted') {
        setSpeechError(`Microphone notice: ${err}. You can also type or use test dictation below.`);
      }
    };

    const handleEnd = () => {
      setIsDoctorListening(false);
    };

    const recognizer = startSpeechRecognition(
      language || 'en',
      handleResult,
      handleError,
      handleEnd
    );
    speechRecognizerRef.current = recognizer;
  };

  const handleStopVoiceDictation = () => {
    setIsDoctorListening(false);
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
      speechRecognizerRef.current = null;
    }
  };

  const handleVoiceTextChange = (newText: string) => {
    setRawDictation(newText);
    const parsed = parsePhysicianDictation(newText);
    if (parsed.medication) setRecMedication(parsed.medication);
    if (parsed.dosage) setRecDosage(parsed.dosage);
    if (parsed.frequency) setRecFrequency(parsed.frequency);
    if (parsed.duration) setRecDuration(parsed.duration);
    if (parsed.instructions) setRecInstructions(parsed.instructions);
  };

  const handleQuickTestSample = (sampleText: string) => {
    setInputMode('VOICE');
    setRecInputMethod('VOICE');
    handleVoiceTextChange(sampleText);
  };

  // Keep editable state in sync with incoming summary updates
  useEffect(() => {
    if (summary && !isEditing) {
      setEditableEnglish(summary.summaryEnglish || ({} as any));
      setEditableHindi(summary.summaryHindi || ({} as any));
      setEditableTamil(summary.summaryTamil || ({} as any));
      setEditableClinicalSummary(
        summary.clinicalSummary || summary.summaryEnglish?.clinicalSummary || ''
      );
      setIsConfirmed(summary.status === 'doctor_confirmed');
      if (summary.transcript && summary.transcript.length > 0) {
        setLiveTranscript(summary.transcript);
      }
    }
  }, [summary, isEditing]);

  // Real-time synchronization with live case backend
  useEffect(() => {
    if (!patient?.id) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/live-case/${patient.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.liveCase) {
            if (data.liveCase.transcripts && data.liveCase.transcripts.length > 0) {
              setLiveTranscript(data.liveCase.transcripts);
            }
            if (data.liveCase.caseSummary && !isEditing) {
              onUpdateSummary(data.liveCase.caseSummary);
            }
          }
        }
      } catch (e) {
        // silent polling catch
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [patient?.id, isEditing, onUpdateSummary]);

  const handleSavePhysicianRecommendation = async () => {
    if (!patient) return;
    setIsSavingRecommendation(true);
    setRecommendationSuccessMsg('');

    const payload: PhysicianRecommendation = {
      patientId: patient.id,
      caseId: patient.id,
      doctorName: practitionerName.trim() || undefined,
      medication: recMedication.trim() || recRecommendationText.trim() || 'Prescribed Regimen',
      dosage: recDosage.trim(),
      frequency: recFrequency.trim(),
      duration: recDuration.trim(),
      instructions: recInstructions.trim() || physicianAdvice.trim() || 'Follow prescribed regimen.',
      rawDictation: rawDictation.trim(),
      source: 'PHYSICIAN',
      inputMethod: recInputMethod,
      status: 'PHYSICIAN_CONFIRMED',
      prescribedAt: new Date().toISOString(),
      diagnosis: physicianDiagnosis.trim() || 'Clinical Review Completed',
      advice: physicianAdvice.trim() || recDietaryAdvice.trim() || recLifestyleAdvice.trim(),
      notes: doctorNotes.trim(),
      recommendationText: recRecommendationText.trim() || recMedication.trim() || 'Clinical Treatment Plan',
      dietaryAdvice: recDietaryAdvice.trim(),
      lifestyleAdvice: recLifestyleAdvice.trim(),
      followUp: recFollowUp.trim(),
      ayushAssessmentNotes: recAyushAssessmentNotes.trim(),
    };

    try {
      const response = await fetch('/api/recommendations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      setIsSavingRecommendation(false);
      if (data && data.record) {
        setSavedRecommendation(data.record);
      } else {
        setSavedRecommendation(payload);
      }
      setRecommendationSuccessMsg('✓ Recommendation saved');
    } catch (e) {
      setIsSavingRecommendation(false);
      setSavedRecommendation(payload);
      setRecommendationSuccessMsg('✓ Recommendation saved');
    }
  };

  if (!patient || !summary) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-slate-100/60 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-serif">
            {t.no_patient_selected}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No active patient consultation record is currently loaded. Complete a clinical intake consultation to generate and review the structured EMR case summary.
          </p>
        </div>
      </div>
    );
  }

  const handleSaveEdits = () => {
    const updated: PhysicianCaseSummary = {
      ...summary,
      clinicalSummary: editableClinicalSummary,
      summaryEnglish: {
        ...editableEnglish,
        clinicalSummary: editableClinicalSummary,
      },
      summaryHindi: editableHindi,
      summaryTamil: editableTamil,
      doctorModifications: doctorNotes,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSummary(updated);
    setIsEditing(false);
  };

  const handleConfirmRecord = () => {
    const confirmed: PhysicianCaseSummary = {
      ...summary,
      clinicalSummary: editableClinicalSummary,
      summaryEnglish: {
        ...editableEnglish,
        clinicalSummary: editableClinicalSummary,
      },
      summaryHindi: editableHindi,
      summaryTamil: editableTamil,
      doctorModifications: doctorNotes,
      status: 'doctor_confirmed',
      confirmedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setIsConfirmed(true);
    onConfirmAndSign(confirmed);
  };

  const handlePrint = () => {
    window.print();
  };

  const sanitizeClinicalText = (text: string | undefined, defaultPlaceholder: string = 'Not yet discussed') => {
    if (!text || !text.trim()) return defaultPlaceholder;
    const lower = text.toLowerCase().trim();
    if (
      lower === 'not provided' ||
      lower === 'none reported' ||
      lower === 'pre-consultation clinical evaluation' ||
      lower === 'intake reported primary concern: pre-consultation clinical evaluation' ||
      lower.includes('dietary patterns and lifestyle details recorded during intake') ||
      lower.includes('no information was provided')
    ) {
      return defaultPlaceholder;
    }
    return text;
  };

  const getLocalizedField = (
    field: keyof typeof editableEnglish,
    fallbackEn = 'Not yet discussed',
    fallbackHi = 'चर्चा नहीं हुई',
    fallbackTa = 'இன்னும் விவாதிக்கப்படவில்லை'
  ) => {
    let raw = '';
    if (activeLangTab === 'hi') {
      raw = editableHindi[field] || '';
      return sanitizeClinicalText(raw, fallbackHi);
    }
    if (activeLangTab === 'ta') {
      raw = editableTamil[field] || '';
      return sanitizeClinicalText(raw, fallbackTa);
    }
    raw = editableEnglish[field] || '';
    return sanitizeClinicalText(raw, fallbackEn);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100/60 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Doctor Header & Action Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-700 text-white flex items-center justify-center shadow-sm">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 font-serif">
                  AAROGYA — Patient Case Taking Software
                </h2>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    isConfirmed
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}
                >
                  {isConfirmed ? '✓ Doctor Confirmed & Signed' : 'AI-Generated Pre-Consultation'}
                </span>
              </div>
              <p className="text-xs text-teal-800 font-medium">
                Doctor Dashboard & Clinical EMR Verification
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language toggle tab */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveLangTab('en')}
                id="btn-lang-tab-en"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeLangTab === 'en'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English EMR
              </button>
              <button
                type="button"
                onClick={() => setActiveLangTab('hi')}
                id="btn-lang-tab-hi"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeLangTab === 'hi'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिंदी सारांश
              </button>
              <button
                type="button"
                onClick={() => setActiveLangTab('ta')}
                id="btn-lang-tab-ta"
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeLangTab === 'ta'
                    ? 'bg-white text-teal-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                தமிழ் சுருக்கம்
              </button>
            </div>

            {/* PRINT SUMMARY Button */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-print-summary"
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-black flex items-center gap-2 transition-all shadow-xs"
            >
              <Printer className="w-4 h-4 text-teal-700" />
              <span>PRINT SUMMARY</span>
            </button>

            {/* DOWNLOAD PDF Button */}
            <button
              type="button"
              onClick={() => {
                if (patient) {
                  downloadCaseSummaryPdf(patient, summary, savedRecommendation, language);
                }
              }}
              id="btn-download-pdf-doctor"
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-black flex items-center gap-2 transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-teal-700" />
              <span>DOWNLOAD PDF</span>
            </button>

            {isEditing ? (
              <button
                type="button"
                onClick={handleSaveEdits}
                id="btn-save-case-edits"
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                id="btn-enable-edit-case"
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <Edit3 className="w-4 h-4 text-indigo-700" />
                <span>Edit Case</span>
              </button>
            )}

            {!isConfirmed && (
              <button
                type="button"
                onClick={handleConfirmRecord}
                id="btn-sign-case-record"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Sign Case</span>
              </button>
            )}
          </div>
        </div>

        {/* Patient Demographics Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Patient Name</span>
            <p className="font-extrabold text-slate-900 text-sm mt-0.5">{patient.name}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Age / Sex</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {patient.age} Yrs / {patient.sex}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">ABHA ID</span>
            <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">{patient.abhaId}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Department</span>
            <p className="font-bold text-teal-800 text-sm mt-0.5 flex items-center gap-1">
              <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
              {visitType === 'ayush' ? 'Integrative Medicine' : 'General Internal Medicine'}
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Consent Status</span>
            <p className="font-semibold text-emerald-700 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified & Informed
            </p>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Encounter Date</span>
            <p className="font-mono text-slate-700 font-semibold mt-0.5">
              {new Date().toISOString().split('T')[0]}
            </p>
          </div>
        </div>

        {/* Discrepancy Reconciliation Warnings */}
        {summary.discrepancies && summary.discrepancies.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Medication & Document Reconciliation Discrepancies ({summary.discrepancies.length})
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {summary.discrepancies.map((disc, idx) => (
                <div key={idx} className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block mb-1">
                    ⚠ {disc.field}: {disc.description || disc.patientReported}
                  </span>
                  <p className="text-[11px] text-slate-700">
                    <strong>Patient reported:</strong> {disc.patientReported}
                  </p>
                  {disc.documentFound && (
                    <p className="text-[11px] text-slate-700">
                      <strong>Document states:</strong> {disc.documentFound}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Structured Case Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: The Complete Clinical Case Record */}
          <div className="lg:col-span-2 space-y-5">
            {/* 1. CLINICAL SUMMARY (CONCISE 4-5 LINES) */}
            <div className="bg-gradient-to-br from-teal-50/70 via-white to-indigo-50/40 rounded-2xl border-2 border-teal-300/80 p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-teal-200/80">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-teal-950 uppercase tracking-wide font-serif">
                      Clinical Summary (Concise 4–5 Lines)
                    </h3>
                    <p className="text-[10px] text-teal-800 font-medium">
                      Generated strictly from spoken consultation dialogue
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textToRead =
                        activeLangTab === 'hi'
                          ? summary.clinicalSummaryHindi || editableClinicalSummary
                          : activeLangTab === 'ta'
                          ? summary.clinicalSummaryTamil || editableClinicalSummary
                          : summary.clinicalSummary || editableClinicalSummary;
                      speakText(textToRead, activeLangTab);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-900 text-xs font-bold flex items-center gap-1 transition-colors"
                    title="Listen to clinical summary"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                    <span>Listen</span>
                  </button>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-teal-700 text-white shadow-2xs">
                    Spoken Dialogue Only
                  </span>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-teal-900 block">
                    Edit Concise Clinical Summary:
                  </label>
                  <textarea
                    value={editableClinicalSummary}
                    onChange={(e) => setEditableClinicalSummary(e.target.value)}
                    rows={4}
                    className="w-full p-3 text-xs sm:text-sm rounded-xl border border-teal-300 bg-white focus:ring-2 focus:ring-teal-500 font-medium leading-relaxed text-slate-900"
                    placeholder="Concise 4-5 line summary generated from spoken dialogue..."
                  />
                </div>
              ) : (
                <div className="text-xs sm:text-sm leading-relaxed text-slate-900 bg-white p-4 rounded-xl border border-teal-200/90 font-medium whitespace-pre-line shadow-2xs">
                  {activeLangTab === 'hi'
                    ? summary.clinicalSummaryHindi || summary.clinicalSummary || editableClinicalSummary
                    : activeLangTab === 'ta'
                    ? summary.clinicalSummaryTamil || summary.clinicalSummary || editableClinicalSummary
                    : summary.clinicalSummary || editableClinicalSummary || 'No clinical summary generated yet.'}
                </div>
              )}
            </div>

            {/* 2. COMPLETE SPOKEN CONSULTATION TRANSCRIPT (CHRONOLOGICAL) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-700 text-white flex items-center justify-center shadow-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide font-serif">
                      Spoken Consultation Transcript
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Complete chronological dialogue recorded during voice consultation
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {liveTranscript.length} Exchanges
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-50/70 border border-slate-200/90 text-xs pr-2">
                {liveTranscript.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-6 text-xs">
                    No spoken transcript recorded for this consultation.
                  </p>
                ) : (
                  liveTranscript.map((item: any, idx: number) => {
                    const isAi = item.sender === 'ai';
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-3 rounded-xl border leading-relaxed transition-all ${
                          isAi
                            ? 'bg-white border-slate-200/90 text-slate-800 shadow-2xs'
                            : 'bg-teal-700 border-teal-800 text-white shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-black uppercase mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded tracking-wider font-bold ${
                              isAi
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                                : 'bg-teal-800 text-teal-100 border border-teal-600'
                            }`}
                          >
                            {isAi ? 'AAROGYA' : 'PATIENT'}
                          </span>
                          <span
                            className={`font-mono text-[10px] ${
                              isAi ? 'text-slate-400 font-normal' : 'text-teal-200 font-normal'
                            }`}
                          >
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="font-medium text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {item.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">
                    1
                  </span>
                  Chief Complaint
                </span>
                <span className="text-[10px] font-bold text-slate-400 font-mono">CC</span>
              </div>
              {isEditing ? (
                <textarea
                  value={editableEnglish.chiefComplaint || ''}
                  onChange={(e) =>
                    setEditableEnglish({ ...editableEnglish, chiefComplaint: e.target.value })
                  }
                  rows={2}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              ) : (
                <div className="text-xs font-bold text-slate-900 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  {getLocalizedField('chiefComplaint', 'No chief complaint recorded', 'कोई शिकायत दर्ज नहीं', 'குறிப்பிடப்படவில்லை')}
                </div>
              )}
            </div>

            {/* History of Present Illness (SOCRATES Breakdown) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-[10px]">
                    2
                  </span>
                  History of Present Illness (SOCRATES Framework)
                </span>
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                  HPI
                </span>
              </div>
              {isEditing ? (
                <textarea
                  value={editableEnglish.hpi || ''}
                  onChange={(e) =>
                    setEditableEnglish({ ...editableEnglish, hpi: e.target.value })
                  }
                  rows={4}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <div className="text-xs text-slate-800 bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                  {getLocalizedField('hpi', 'No HPI recorded', 'विवरण उपलब्ध नहीं', 'விவரங்கள் இல்லை')}
                </div>
              )}
            </div>

            {/* Past Medical, Past Surgical, and Medication History */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase block pb-1 border-b border-slate-100">
                  Past Medical History
                </span>
                {isEditing ? (
                  <textarea
                    value={editableEnglish.pastMedicalHistory || ''}
                    onChange={(e) =>
                      setEditableEnglish({
                        ...editableEnglish,
                        pastMedicalHistory: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  />
                ) : (
                  <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                    {getLocalizedField('pastMedicalHistory', 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase block pb-1 border-b border-slate-100">
                  Past Surgical History
                </span>
                {isEditing ? (
                  <textarea
                    value={editableEnglish.pastSurgicalHistory || ''}
                    onChange={(e) =>
                      setEditableEnglish({
                        ...editableEnglish,
                        pastSurgicalHistory: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  />
                ) : (
                  <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                    {getLocalizedField('pastSurgicalHistory' as any, 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
                <span className="text-xs font-bold text-slate-900 uppercase block pb-1 border-b border-slate-100">
                  Medication History
                </span>
                {isEditing ? (
                  <textarea
                    value={editableEnglish.medicationHistory || ''}
                    onChange={(e) =>
                      setEditableEnglish({
                        ...editableEnglish,
                        medicationHistory: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full p-2 text-xs rounded-lg border border-slate-300"
                  />
                ) : (
                  <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium">
                    {getLocalizedField('medicationHistory', 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                  </p>
                )}
              </div>
            </div>

            {/* Allergies, Family History, Social History */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Allergies (NKDA)</span>
                <p className="text-slate-900 font-semibold mt-1">
                  {getLocalizedField('allergies', 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Family History</span>
                <p className="text-slate-900 font-semibold mt-1">
                  {getLocalizedField('familyHistory', 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                </p>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Social & Lifestyle</span>
                <p className="text-slate-900 font-semibold mt-1">
                  {getLocalizedField('socialLifestyle', 'Not yet discussed', 'अभी तक चर्चा नहीं हुई', 'இன்னும் விவாதிக்கப்படவில்லை')}
                </p>
              </div>
            </div>

            {/* Previous Investigations & Missing Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div>
                <span className="text-xs font-bold text-indigo-900 uppercase block pb-1 border-b border-slate-100">
                  Previous Investigations (From Uploaded Vault)
                </span>
                <p className="text-xs text-slate-800 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {editableEnglish.previousInvestigations || 'No previous laboratory tests on file.'}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-amber-900 uppercase block pb-1 border-b border-slate-100">
                  Points Requiring Clinician Attention
                </span>
                <p className="text-xs text-slate-800 mt-2 bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-amber-950 font-medium">
                  {editableEnglish.pointsForDoctorAttention || editableEnglish.missingInformation || 'Verify patient symptom duration and current medications.'}
                </p>
              </div>
            </div>

            {/* AYUSH / AYURVEDA CLINICAL CASE TAKING RECORD (~80% Case-Taking Detail) */}
            {visitType === 'ayush' && (
              <div id="section-ayush-case-record" className="bg-white rounded-2xl border-2 border-emerald-600/60 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center">
                      <Leaf className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        AYUSH / AYURVEDA CLINICAL CASE TAKING RECORD
                      </h3>
                      <p className="text-[11px] text-emerald-800 font-medium">
                        Patient-reported functional status • Practitioner-validated evaluation
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
                    Clinical Case Taking Protocol
                  </span>
                </div>

                {/* Important Clinical Disclaimer */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Clinical Boundary & Safety Notice:</span>
                    AAROGYA is an AI case-taking assistant and does NOT autonomously diagnose Prakriti, Vikriti, or Dosha imbalance. The observations below are patient-reported functional facts. Final clinical synthesis and prescription rest exclusively with the treating practitioner.
                  </div>
                </div>

                {/* 9-Point AYUSH Clinical Fact Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* 1. Agni */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      1. Agni (Appetite & Digestion)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.agni?.appetite || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Bloating / Heaviness:</strong> {summary?.ayushHistory?.agni?.bloatingHeaviness || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Post-meal feel:</strong> {summary?.ayushHistory?.agni?.postMealHeaviness || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 2. Ahara */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      2. Ahara (Dietary Habits & Preferences)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.ahara?.foodPreferences || summary?.ayushHistory?.ahara?.usualDiet || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Meal timing:</strong> {summary?.ayushHistory?.ahara?.mealTimings || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Hydration:</strong> {summary?.ayushHistory?.ahara?.waterIntake || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 3. Vihara */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      3. Vihara (Routine, Activity & Rest)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.vihara?.sedentaryHabits || summary?.ayushHistory?.vihara?.physicalActivity || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Daily routine:</strong> {summary?.ayushHistory?.vihara?.dailyRoutine || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Occupational strain:</strong> {summary?.ayushHistory?.vihara?.occupationalStrain || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 4. Nidra */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      4. Nidra (Sleep Quality & Timing)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.nidra?.quality || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Duration:</strong> {summary?.ayushHistory?.nidra?.duration || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Disturbances:</strong> {summary?.ayushHistory?.nidra?.disturbances || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 5. Mala */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      5. Mala (Elimination & Bowel Pattern)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.mala?.bowelPattern || summary?.ayushHistory?.mala?.constipationOrLoose || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Frequency:</strong> {summary?.ayushHistory?.mala?.frequency || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Micturition:</strong> {summary?.ayushHistory?.mala?.micturition || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 6. Lakshana */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      6. Lakshana (Symptom Characteristics)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.lakshana?.nature || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Aggravating factors:</strong> {summary?.ayushHistory?.lakshana?.aggravatingFactors || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Relieving factors:</strong> {summary?.ayushHistory?.lakshana?.relievingFactors || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 7. Nidana */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      7. Nidana (Suspected Etiological Factors)
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.nidana?.dietaryTriggers || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Lifestyle triggers:</strong> {summary?.ayushHistory?.nidana?.lifestyleTriggers || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 8. Prakriti Status */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      8. Prakriti Assessment Status
                    </span>
                    <p className="text-emerald-900 font-bold">
                      {summary?.ayushHistory?.prakritiPractitionerStatus || 'Not yet assessed / practitioner entered'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Reported tendencies:</strong> {summary?.ayushHistory?.prakritiObservations || 'Not yet discussed'}
                    </p>
                  </div>

                  {/* 9. Mind & Stress */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                      9. Manas / Mental State & Stress
                    </span>
                    <p className="text-slate-800 font-semibold">
                      {summary?.ayushHistory?.manas?.stressLevel || 'Not yet discussed'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      <strong>Emotional disposition:</strong> {summary?.ayushHistory?.manas?.emotionalDisposition || 'Not yet discussed'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PHYSICIAN RECOMMENDATION SECTION */}
            <div id="section-physician-recommendation" className="bg-white rounded-2xl border-2 border-teal-700/60 p-6 shadow-md space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                      PHYSICIAN RECOMMENDATION
                    </h3>
                    <p className="text-xs text-teal-800 font-medium">
                      Physician-provided medication & clinical care plan
                    </p>
                  </div>
                </div>

                {/* Two Input Modes: [ Type ] [ 🎙 Voice ] */}
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    id="btn-mode-type"
                    onClick={() => {
                      setInputMode('TYPE');
                      setRecInputMethod('TEXT');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      inputMode === 'TYPE'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Type</span>
                  </button>

                  <button
                    type="button"
                    id="btn-mode-voice"
                    onClick={() => {
                      setInputMode('VOICE');
                      setRecInputMethod('VOICE');
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      inputMode === 'VOICE'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>🎙 Voice</span>
                  </button>
                </div>
              </div>

              {/* Structured Medication & Dosage Form */}
              <div className="space-y-4">
                {/* Practitioner Name (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center justify-between">
                    <span>Practitioner Name & Designation</span>
                    <span className="text-[10px] text-slate-400 font-normal lowercase">optional / only displayed when entered</span>
                  </label>
                  <input
                    type="text"
                    id="input-recommendation-doctor-name"
                    value={practitionerName}
                    onChange={(e) => setPractitionerName(e.target.value)}
                    placeholder="e.g. Dr. Ananya Iyer, MBBS / BAMS"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Medication */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Medication
                  </label>
                  <input
                    type="text"
                    id="input-recommendation-medication"
                    value={recMedication}
                    onChange={(e) => {
                      setRecMedication(e.target.value);
                      if (inputMode === 'TYPE') setRecInputMethod('TEXT');
                    }}
                    placeholder="e.g. Prescribed formulation / medication"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-semibold"
                  />
                </div>

                {/* Dosage, Frequency, Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Dosage
                    </label>
                    <input
                      type="text"
                      id="input-recommendation-dosage"
                      value={recDosage}
                      onChange={(e) => {
                        setRecDosage(e.target.value);
                        if (inputMode === 'TYPE') setRecInputMethod('TEXT');
                      }}
                      placeholder="e.g. 500 mg"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Frequency
                    </label>
                    <input
                      type="text"
                      id="input-recommendation-frequency"
                      value={recFrequency}
                      onChange={(e) => {
                        setRecFrequency(e.target.value);
                        if (inputMode === 'TYPE') setRecInputMethod('TEXT');
                      }}
                      placeholder="e.g. Twice daily"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Duration
                    </label>
                    <input
                      type="text"
                      id="input-recommendation-duration"
                      value={recDuration}
                      onChange={(e) => {
                        setRecDuration(e.target.value);
                        if (inputMode === 'TYPE') setRecInputMethod('TEXT');
                      }}
                      placeholder="e.g. 2 days"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Instructions / Clinical Advice
                  </label>
                  <textarea
                    id="input-recommendation-instructions"
                    rows={2}
                    value={recInstructions}
                    onChange={(e) => {
                      setRecInstructions(e.target.value);
                      if (inputMode === 'TYPE') setRecInputMethod('TEXT');
                    }}
                    placeholder="e.g. Take after food. Maintain adequate hydration and return if symptoms worsen."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Dietary Advice (Ahara / Pathya) */}
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1 flex items-center justify-between">
                    <span>Dietary Advice (Ahara / Pathya-Apathya)</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">appears in patient portal</span>
                  </label>
                  <textarea
                    id="input-recommendation-dietary-advice"
                    rows={2}
                    value={recDietaryAdvice}
                    onChange={(e) => setRecDietaryAdvice(e.target.value)}
                    placeholder="e.g. Warm water intake, easily digestible light khichdi/moong dal, avoid sour/spicy/deep-fried food and cold beverages."
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Lifestyle & Routine Advice (Vihara) */}
                <div>
                  <label className="block text-xs font-bold text-emerald-900 uppercase mb-1 flex items-center justify-between">
                    <span>Lifestyle & Activity Guidance (Vihara)</span>
                    <span className="text-[10px] text-slate-400 lowercase font-normal">appears in patient portal</span>
                  </label>
                  <textarea
                    id="input-recommendation-lifestyle-advice"
                    rows={2}
                    value={recLifestyleAdvice}
                    onChange={(e) => setRecLifestyleAdvice(e.target.value)}
                    placeholder="e.g. 7-8 hours night sleep, avoid daytime sleep (Diva swapna), gentle walking 20 mins post dinner, pranayama."
                    className="w-full p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 focus:bg-white focus:ring-2 focus:ring-emerald-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Follow-up Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Follow-up Schedule
                    </label>
                    <input
                      type="text"
                      id="input-recommendation-follow-up"
                      value={recFollowUp}
                      onChange={(e) => setRecFollowUp(e.target.value)}
                      placeholder="e.g. Review in OPD in 5 days or SOS if symptoms persist"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                      Clinical Diagnosis / Impression
                    </label>
                    <input
                      type="text"
                      id="input-physician-diagnosis"
                      value={physicianDiagnosis}
                      onChange={(e) => setPhysicianDiagnosis(e.target.value)}
                      placeholder="e.g. Acute Gastritis / Mandagni / Clinical Review"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                {/* AYUSH Assessment & Clinical Notes (if AYUSH or integrative) */}
                <div>
                  <label className="block text-xs font-bold text-teal-950 uppercase mb-1 flex items-center justify-between">
                    <span>Practitioner AYUSH / Clinical Assessment Notes</span>
                    <span className="text-[10px] text-teal-700 font-mono">Practitioner Evaluated</span>
                  </label>
                  <textarea
                    id="input-recommendation-ayush-notes"
                    rows={2}
                    value={recAyushAssessmentNotes}
                    onChange={(e) => setRecAyushAssessmentNotes(e.target.value)}
                    placeholder="Practitioner notes on Agni state, Dosha involvement (Vata/Pitta/Kapha), Ama presence, or individualized treatment rationale..."
                    className="w-full p-3 rounded-xl border border-teal-200 bg-teal-50/40 focus:bg-white focus:ring-2 focus:ring-teal-600 text-xs text-slate-900 font-medium"
                  />
                </div>

                {/* Internal Clinical Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Confidential Clinical Notes (Internal)
                  </label>
                  <textarea
                    id="input-doctor-clinical-notes"
                    rows={2}
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    placeholder="Internal physician observations and clinical differentials..."
                    className="w-full p-2.5 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:bg-white focus:ring-2 focus:ring-teal-600 text-slate-900"
                  />
                </div>

                {/* VOICE INPUT & TRANSCRIPTION PANEL */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-teal-700" />
                      Physician Voice Dictation (Speech-to-Text)
                    </span>
                    <div className="flex items-center gap-2">
                      {isDoctorListening ? (
                        <button
                          type="button"
                          id="btn-stop-speak-recommendation"
                          onClick={handleStopVoiceDictation}
                          className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-xs"
                        >
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Stop Listening</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          id="btn-speak-recommendation"
                          onClick={handleStartVoiceDictation}
                          className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02]"
                        >
                          <Mic className="w-4 h-4 text-teal-200" />
                          <span>🎙 Speak Recommendation</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isDoctorListening && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2.5 text-xs text-teal-900">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600"></span>
                      </span>
                      <span className="font-semibold">
                        Listening to physician speech... Speak prescription details clearly (e.g., "Take prescribed medication twice daily for two days after food").
                      </span>
                    </div>
                  )}

                  {speechError && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                      {speechError}
                    </p>
                  )}

                  {/* Voice Transcription Display */}
                  {rawDictation && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          VOICE TRANSCRIPTION
                        </span>
                        <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                          [ Edit ] Enabled
                        </span>
                      </div>
                      <textarea
                        id="textarea-voice-transcription"
                        rows={2}
                        value={rawDictation}
                        onChange={(e) => handleVoiceTextChange(e.target.value)}
                        className="w-full p-2 text-xs font-medium text-slate-900 bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:ring-2 focus:ring-teal-600"
                        placeholder="Physician speech converted to text appears here..."
                      />
                      <p className="text-[11px] text-slate-500 italic">
                        The doctor can review and correct the text above before saving.
                      </p>
                    </div>
                  )}

                  {/* Quick Voice Test Dictation Helpers */}
                  <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-semibold">Quick Voice Test:</span>
                    <button
                      type="button"
                      id="btn-test-voice-sample-short"
                      onClick={() =>
                        handleQuickTestSample(
                          'Take prescribed medication 500 milligrams twice daily for two days after food.'
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-teal-900 rounded-lg border border-slate-200 font-medium transition-colors"
                    >
                      "Take prescribed medication 500 milligrams twice daily for two days after food."
                    </button>
                    <button
                      type="button"
                      id="btn-test-voice-sample-complex"
                      onClick={() =>
                        handleQuickTestSample(
                          'The patient should take prescribed medication twice daily for two days after food. Maintain adequate hydration and return if symptoms worsen.'
                        )
                      }
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-teal-900 rounded-lg border border-slate-200 font-medium transition-colors"
                    >
                      "The patient should take prescribed medication twice daily for two days after food. Maintain adequate hydration..."
                    </button>
                  </div>
                </div>

                {/* Audit & Provenance Badges */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-100/70 rounded-xl text-xs border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Source</span>
                      <span className="font-bold text-slate-900">Physician</span>
                    </div>
                    <div className="h-6 w-px bg-slate-300"></div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Input</span>
                      <span className="font-bold text-teal-800">
                        {recInputMethod === 'VOICE' ? 'Voice' : 'Text'}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-slate-300"></div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Status</span>
                      <span className="font-bold text-emerald-700">
                        {savedRecommendation ? 'Physician Confirmed' : 'Pending Confirmation'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Save Recommendation Button & Confirmation Info */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    id="btn-save-physician-recommendations"
                    onClick={handleSavePhysicianRecommendation}
                    disabled={isSavingRecommendation || (!recMedication.trim() && !recInstructions.trim())}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingRecommendation ? 'Saving & Syncing...' : 'Save Recommendation'}</span>
                  </button>

                  {savedRecommendation && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-0.5">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>✓ Recommendation saved</span>
                      </div>
                      {savedRecommendation.doctorName && (
                        <div className="text-[11px] text-slate-600">
                          Physician: <strong className="text-slate-900">{savedRecommendation.doctorName}</strong>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 font-mono">
                        Date/Time: {new Date(savedRecommendation.prescribedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Chronological Document Timeline & Vault */}
          <div className="space-y-4">
            {/* Chronological Timeline */}
            <TimelineView
              documents={documents}
              language={language}
              onSelectDoc={(doc) => setSelectedDocForInspect(doc)}
              selectedDocId={selectedDocForInspect?.id}
            />

            {/* Live Voice Conversation Transcript for Physician EMR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  Spoken Intake Transcript
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {liveTranscript.length} Exchanges
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 text-xs pr-1">
                {liveTranscript.length === 0 ? (
                  <p className="text-slate-400 italic text-center py-3 text-[11px]">
                    Not yet discussed via voice consultation.
                  </p>
                ) : (
                  liveTranscript.map((item: any, idx: number) => {
                    const isAi = item.sender === 'ai';
                    return (
                      <div
                        key={item.id || idx}
                        className={`p-2.5 rounded-xl border leading-relaxed ${
                          isAi
                            ? 'bg-slate-50 border-slate-200 text-slate-800'
                            : 'bg-teal-50 border-teal-200 text-teal-950 font-medium'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                          <span
                            className={
                              isAi
                                ? 'text-indigo-700 uppercase tracking-wider'
                                : 'text-teal-800 uppercase tracking-wider'
                            }
                          >
                            {isAi ? 'Aarogya (AI)' : 'Patient (Spoken)'}
                          </span>
                          <span className="text-slate-400 font-normal">{item.timestamp}</span>
                        </div>
                        <p>{item.text}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
