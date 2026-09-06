import React, { useEffect, useState, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  MessageSquare,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Activity,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  UploadCloud,
  FileText,
} from 'lucide-react';
import { Language, PatientProfile, ChatMessage, UploadedDocument } from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';
import {
  voiceSessionManager,
  LiveVoiceState,
  VoiceDiagnostics,
} from '../utils/voiceSessionManager';
import {
  ClinicalCaseState,
  extractClinicalInformation,
  getInitialClinicalCaseState,
} from '../utils/clinicalExtraction';
import { BrowserSpeechRecognizer } from '../utils/voiceUtils';
import { DocumentUploadModal } from './DocumentUploadModal';

interface VoiceConsultationOrbProps {
  patient: PatientProfile;
  visitType: 'allopathic' | 'ayush';
  language: Language;
  onEndConsultation: (transcript: ChatMessage[]) => void;
  onSwitchToTextMode: () => void;
  onLiveCaseUpdate?: (caseState: ClinicalCaseState, transcripts: ChatMessage[]) => void;
  initialCaseState?: ClinicalCaseState;
  documents?: UploadedDocument[];
  onAddDocument?: (doc: UploadedDocument) => void;
}

export const VoiceConsultationOrb: React.FC<VoiceConsultationOrbProps> = ({
  patient,
  visitType,
  language,
  onEndConsultation,
  onSwitchToTextMode,
  onLiveCaseUpdate,
  initialCaseState,
  documents = [],
  onAddDocument,
}) => {
  const t = UI_TRANSLATIONS[language];

  const [voiceState, setVoiceState] = useState<LiveVoiceState>('connecting');
  const [inputVol, setInputVol] = useState(0);
  const [outputVol, setOutputVol] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscripts, setLiveTranscripts] = useState<ChatMessage[]>([]);
  const [showCaptions, setShowCaptions] = useState(true);
  const [showFactsCard, setShowFactsCard] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [typedInput, setTypedInput] = useState('');
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [attachedDocs, setAttachedDocs] = useState<UploadedDocument[]>(documents || []);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>(() =>
    voiceSessionManager.getDiagnostics()
  );

  // Live accumulated clinical state from voice conversation
  const [clinicalCase, setClinicalCase] = useState<ClinicalCaseState>(() =>
    initialCaseState || getInitialClinicalCaseState()
  );

  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const speechRecognizerRef = useRef<BrowserSpeechRecognizer | null>(null);

  const clinicalCaseRef = useRef<ClinicalCaseState>(
    initialCaseState || getInitialClinicalCaseState()
  );
  const liveTranscriptsRef = useRef<ChatMessage[]>([]);
  const onLiveCaseUpdateRef = useRef(onLiveCaseUpdate);
  onLiveCaseUpdateRef.current = onLiveCaseUpdate;

  // Unified transcript updater: captures both Patient and AAROGYA chronologically,
  // updates interim speech in place, avoids duplicates, and triggers clinical extraction
  const updateTranscript = (speaker: 'ai' | 'patient', text: string, isFinal: boolean = true) => {
    if (!isMountedRef.current) return;
    const clean = text.trim();
    if (!clean && !isFinal) return;

    const currentTranscripts = [...liveTranscriptsRef.current];
    const lastIndex = currentTranscripts.length - 1;
    const last = lastIndex >= 0 ? currentTranscripts[lastIndex] : null;

    if (speaker === 'patient') {
      if (!clean) return;

      if (last && last.sender === 'patient') {
        if (
          last.isInterim ||
          clean.toLowerCase().startsWith(last.text.toLowerCase()) ||
          last.text.toLowerCase().startsWith(clean.toLowerCase())
        ) {
          // Update in-place to avoid duplicate lines
          currentTranscripts[lastIndex] = {
            ...last,
            text: clean,
            isInterim: !isFinal,
          };
        } else if (last.text.toLowerCase() === clean.toLowerCase()) {
          if (!isFinal) return;
          currentTranscripts[lastIndex] = { ...last, isInterim: false };
        } else {
          currentTranscripts.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'patient',
            text: clean,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isInterim: !isFinal,
          });
        }
      } else {
        currentTranscripts.push({
          id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          sender: 'patient',
          text: clean,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isInterim: !isFinal,
        });
      }

      liveTranscriptsRef.current = currentTranscripts;
      setLiveTranscripts(currentTranscripts);

      if (isFinal) {
        const prevAiQuestion = [...currentTranscripts].reverse().find((m) => m.sender === 'ai')?.text;
        const updatedCase = extractClinicalInformation(
          clinicalCaseRef.current,
          clean,
          'PATIENT_VOICE',
          prevAiQuestion
        );
        clinicalCaseRef.current = updatedCase;
        setClinicalCase(updatedCase);

        setTimeout(() => {
          if (isMountedRef.current) {
            onLiveCaseUpdateRef.current?.(updatedCase, currentTranscripts);
          }
        }, 0);
      }
    } else {
      // AI (AAROGYA) turn
      if (last && last.sender === 'ai') {
        if (isFinal && !clean) {
          currentTranscripts[lastIndex] = { ...last, isInterim: false };
        } else if (clean) {
          let mergedText = last.text;
          if (last.isInterim) {
            if (clean.startsWith(last.text)) {
              mergedText = clean;
            } else if (!last.text.includes(clean)) {
              mergedText = `${last.text} ${clean}`.trim();
            }
          } else {
            if (!last.text.includes(clean)) {
              mergedText = `${last.text} ${clean}`.trim();
            }
          }
          currentTranscripts[lastIndex] = {
            ...last,
            text: mergedText,
            isInterim: !isFinal,
          };
        }
      } else {
        if (clean) {
          currentTranscripts.push({
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sender: 'ai',
            text: clean,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isInterim: !isFinal,
          });
        }
      }

      liveTranscriptsRef.current = currentTranscripts;
      setLiveTranscripts(currentTranscripts);

      if (isFinal) {
        setTimeout(() => {
          if (isMountedRef.current) {
            onLiveCaseUpdateRef.current?.(clinicalCaseRef.current, currentTranscripts);
          }
        }, 0);
      }
    }
  };

  // Browser continuous speech recognizer for capturing patient answers directly from mic
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        speechRecognizerRef.current = new BrowserSpeechRecognizer(
          language,
          (transcript, isFinal) => {
            if (transcript && isMountedRef.current) {
              updateTranscript('patient', transcript, isFinal);
            }
          },
          (err) => {
            console.warn('[VoiceConsultationOrb] Speech recognition note:', err);
          },
          () => {},
          true
        );
        speechRecognizerRef.current.start();
      } catch (err) {
        console.warn('Speech recognition setup warning:', err);
      }
    }

    return () => {
      if (speechRecognizerRef.current) {
        speechRecognizerRef.current.stop();
        speechRecognizerRef.current = null;
      }
    };
  }, [language]);

  // Voice session initialization with Gemini Live
  useEffect(() => {
    isMountedRef.current = true;

    voiceSessionManager.startSession({
      language,
      patientName: patient.name,
      patientAge: patient.age,
      patientSex: patient.sex,
      visitType,
      onStateChange: (state) => {
        if (isMountedRef.current) {
          setVoiceState(state);
          setDiagnostics(voiceSessionManager.getDiagnostics());
        }
      },
      onTranscript: (speaker, text, isFinal) => {
        if (!isMountedRef.current) return;
        updateTranscript(speaker, text, isFinal !== undefined ? isFinal : true);
      },
      onVolumeChange: (inV, outV) => {
        if (isMountedRef.current) {
          setInputVol(inV);
          setOutputVol(outV);
        }
      },
      onError: (err) => {
        if (isMountedRef.current) {
          console.warn('[VoiceConsultationOrb] Voice error notice:', err);
          setErrorMessage(err);
          setDiagnostics(voiceSessionManager.getDiagnostics());
        }
      },
      onDiagnosticsUpdate: (diag) => {
        if (isMountedRef.current) {
          setDiagnostics(diag);
        }
      },
    });

    return () => {
      isMountedRef.current = false;
      voiceSessionManager.endSession();
    };
  }, [language, patient.name, patient.age, patient.sex, visitType]);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [liveTranscripts]);

  const handleToggleMute = () => {
    const muted = voiceSessionManager.toggleMute();
    setIsMuted(muted);
    if (muted) {
      speechRecognizerRef.current?.stop();
    } else {
      speechRecognizerRef.current?.start();
    }
    setDiagnostics(voiceSessionManager.getDiagnostics());
  };

  const handleSendTypedUtterance = (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;
    setTypedInput('');
    updateTranscript('patient', clean, true);
    voiceSessionManager.sendTextMessage(clean);
  };

  const handleFinish = async () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
    }
    await voiceSessionManager.endSession();
    onEndConsultation(liveTranscriptsRef.current);
  };

  const handleSwitchToText = async () => {
    if (speechRecognizerRef.current) {
      speechRecognizerRef.current.stop();
    }
    await voiceSessionManager.endSession();
    onSwitchToTextMode();
  };

  const handleDocumentUploaded = (newDoc: UploadedDocument) => {
    setAttachedDocs((prev) => [newDoc, ...prev]);
    onAddDocument?.(newDoc);
    setIsDocModalOpen(false);
    setUploadSuccessNotice(`"${newDoc.name}" uploaded successfully and attached to patient case.`);
    setTimeout(() => setUploadSuccessNotice(null), 5000);
  };

  // Determine visual scaling factor based on current volume & state
  const activeVol =
    voiceState === 'speaking' ? outputVol : voiceState === 'listening' ? inputVol : 0.08;
  const orbScale = 1 + Math.min(0.45, activeVol * 0.6);
  const ringScale1 = 1 + Math.min(0.7, activeVol * 0.9);
  const ringScale2 = 1 + Math.min(1.1, activeVol * 1.3);

  const getStatusText = () => {
    switch (voiceState) {
      case 'connecting':
        return language === 'hi'
          ? 'आरोग्य सहायक से कनेक्ट हो रहा है...'
          : language === 'ta'
          ? 'இணைக்கிறது...'
          : 'Connecting to AAROGYA Voice...';
      case 'listening':
        return language === 'hi'
          ? 'आपकी आवाज़ सुनी जा रही है...'
          : language === 'ta'
          ? 'உங்கள் குரலைக் கேட்கிறது...'
          : 'Listening to patient...';
      case 'thinking':
        return language === 'hi'
          ? 'नैदानिक विश्लेषण हो रहा है...'
          : language === 'ta'
          ? 'செயலாக்குகிறது...'
          : 'Analyzing clinical facts...';
      case 'speaking':
        return language === 'hi'
          ? 'आरोग्य बोल रहा है...'
          : language === 'ta'
          ? 'ஆரோக்யா பேசுகிறார்...'
          : 'AAROGYA Speaking...';
      case 'muted':
        return language === 'hi' ? 'माइक म्यूट है' : language === 'ta' ? 'மைக் மியூட்' : 'Microphone Muted';
      case 'error':
        return 'Connection Notice';
      default:
        return 'Ready';
    }
  };

  const getStatusBadgeColor = () => {
    switch (voiceState) {
      case 'speaking':
        return 'bg-emerald-500/15 text-emerald-800 border-emerald-300';
      case 'listening':
        return 'bg-teal-500/15 text-teal-800 border-teal-300';
      case 'thinking':
        return 'bg-amber-500/15 text-amber-800 border-amber-300';
      case 'muted':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'error':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  // Helper to determine whether any clinical facts have been captured yet
  const hasDiscoveredFacts = Boolean(
    clinicalCase.chiefComplaint ||
      clinicalCase.duration ||
      clinicalCase.associatedSymptoms.length > 0 ||
      clinicalCase.pastMedicalHistory.length > 0 ||
      clinicalCase.medicationHistory.length > 0 ||
      clinicalCase.allergies.length > 0 ||
      (clinicalCase.ayushHistory &&
        (clinicalCase.ayushHistory.agni?.appetite ||
          clinicalCase.ayushHistory.ahara?.foodPreferences ||
          clinicalCase.ayushHistory.nidra?.quality))
  );

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-10rem)] w-full max-w-4xl mx-auto px-4 py-6">
      {/* Top Patient & Department info + Upload Button */}
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 px-4 py-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {patient.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{patient.name}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  visitType === 'ayush'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    : 'bg-teal-100 text-teal-900 border border-teal-200'
                }`}
              >
                {visitType === 'ayush' ? 'Ayurveda / AYUSH' : 'Modern Medicine'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {patient.age} Yrs • {patient.sex} •{' '}
              {visitType === 'ayush' ? 'Integrative Ayurveda Intake' : 'General Internal Medicine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Functional Document Upload Button */}
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            id="btn-voice-upload-document"
            className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <UploadCloud className="w-3.5 h-3.5 text-teal-700" />
            <span>Upload Record</span>
            {attachedDocs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-700 text-white text-[10px] font-mono">
                {attachedDocs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleSwitchToText}
            id="btn-switch-to-text-mode"
            className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.switch_to_text}</span>
          </button>
        </div>
      </div>

      {/* Upload confirmation notice banner */}
      {uploadSuccessNotice && (
        <div className="w-full mt-3 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{uploadSuccessNotice}</span>
        </div>
      )}

      {/* Central Visual Pulsing Voice Orb */}
      <div className="my-6 flex flex-col items-center justify-center relative w-full">
        <div className="relative flex items-center justify-center w-56 h-56 sm:w-64 sm:h-64">
          {/* Dynamic outer animated rings */}
          <div
            className="absolute rounded-full border border-teal-400/30 transition-transform duration-100 ease-out"
            style={{
              width: '100%',
              height: '100%',
              transform: `scale(${ringScale2})`,
              opacity: voiceState === 'speaking' || voiceState === 'listening' ? 0.8 : 0.2,
            }}
          />
          <div
            className="absolute rounded-full border border-teal-500/40 transition-transform duration-100 ease-out"
            style={{
              width: '82%',
              height: '82%',
              transform: `scale(${ringScale1})`,
              opacity: voiceState === 'speaking' || voiceState === 'listening' ? 0.9 : 0.3,
            }}
          />

          {/* Central Orb */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center transition-all duration-150 shadow-2xl relative z-10 ${
              voiceState === 'speaking'
                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/30'
                : voiceState === 'listening'
                ? 'bg-gradient-to-tr from-teal-700 to-sky-600 shadow-teal-500/30'
                : voiceState === 'thinking'
                ? 'bg-gradient-to-tr from-amber-600 to-teal-600 shadow-amber-500/20'
                : 'bg-gradient-to-tr from-slate-700 to-slate-800 shadow-slate-500/20'
            }`}
            style={{
              transform: `scale(${orbScale})`,
            }}
          >
            {voiceState === 'speaking' ? (
              <Volume2 className="w-12 h-12 text-white animate-pulse" />
            ) : isMuted ? (
              <MicOff className="w-12 h-12 text-slate-300" />
            ) : (
              <Mic className="w-12 h-12 text-white" />
            )}
            <span className="text-[11px] font-bold text-white/90 tracking-wider uppercase mt-1">
              AAROGYA
            </span>
          </div>
        </div>

        {/* State Status Pill */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <div
            className={`px-4 py-1.5 rounded-full border text-xs sm:text-sm font-bold tracking-wide flex items-center gap-2 shadow-xs transition-all ${getStatusBadgeColor()}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                voiceState === 'speaking'
                  ? 'bg-emerald-500 animate-ping'
                  : voiceState === 'listening'
                  ? 'bg-teal-600 animate-pulse'
                  : voiceState === 'thinking'
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-slate-400'
              }`}
            />
            <span>{getStatusText()}</span>
          </div>

          <p className="text-xs text-slate-500 font-medium text-center max-w-sm">
            {language === 'hi'
              ? 'स्वाभाविक रूप से बोलें। आप किसी भी समय बोलकर टोक सकते हैं।'
              : language === 'ta'
              ? 'இயல்பாகப் பேசுங்கள். நீங்கள் எப்போது வேண்டுமானாலும் குறுக்கிடலாம்.'
              : 'Speak naturally. You can speak at any time to interrupt.'}
          </p>
        </div>

        {errorMessage && (
          <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2 max-w-md">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Real-time Patient Speech / Utterance Bar */}
        <div className="w-full max-w-xl bg-white/95 rounded-2xl border border-teal-200/80 p-3 shadow-xs mt-4 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendTypedUtterance(typedInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'माइक में बोलें या यहाँ लिखें (उदा. पेट में तीन दिन से दर्द है...)'
                  : language === 'ta'
                  ? 'மைக் மூலம் பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள்...'
                  : 'Speak into mic or type (e.g., Stomach pain for three days...)'
              }
              id="input-voice-manual-utterance"
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 font-medium"
            />
            <button
              type="submit"
              disabled={!typedInput.trim()}
              id="btn-voice-send-utterance"
              className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Send
            </button>
          </form>

          {/* Quick test responses for User Acceptance Test Scenario */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
              Test Spoken Phrases:
            </span>
            <button
              type="button"
              id="btn-test-pain-duration"
              onClick={() => handleSendTypedUtterance('I have severe stomach pain since three days.')}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-medium transition-colors"
            >
              "Stomach pain 3 days"
            </button>
            <button
              type="button"
              id="btn-test-right-side-eating"
              onClick={() => handleSendTypedUtterance('It is mostly on the right side and worse after eating.')}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-medium transition-colors"
            >
              "Right side & worse after eating"
            </button>
            <button
              type="button"
              id="btn-test-vomiting"
              onClick={() => handleSendTypedUtterance('I have been having nausea and vomiting.')}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-medium transition-colors"
            >
              "Nausea and vomiting"
            </button>
            <button
              type="button"
              id="btn-test-diabetes-metformin"
              onClick={() => handleSendTypedUtterance('I have diabetes and take metformin. Allergic to penicillin.')}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 font-medium transition-colors"
            >
              "Diabetes, Metformin, Penicillin allergy"
            </button>
            <button
              type="button"
              id="btn-test-agni-appetite"
              onClick={() => handleSendTypedUtterance('My appetite is low and digestion feels sluggish and heavy.')}
              className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200 font-medium transition-colors"
            >
              "Low appetite / sluggish Agni"
            </button>
          </div>
        </div>
      </div>

      {/* LIVE TRANSCRIPT — MUST WORK (Shows BOTH Patient and AAROGYA chronologically) */}
      <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setShowCaptions(!showCaptions)}
          className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="font-black uppercase tracking-wider text-teal-950 text-xs sm:text-sm">
              {language === 'hi'
                ? 'लाइव बातचीत ट्रांसक्रिप्ट (मरीज एवं आरोग्य)'
                : language === 'ta'
                ? 'நேரடி உரை (நோயாளி & ஆரோக்யா)'
                : 'LIVE TRANSCRIPT (PATIENT & AAROGYA)'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-200">
              {liveTranscripts.length} exchanges
            </span>
          </div>
          {showCaptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showCaptions && (
          <div
            ref={transcriptScrollRef}
            id="live-transcript-container"
            className="p-4 max-h-64 overflow-y-auto space-y-3 text-xs bg-slate-50/50"
          >
            {liveTranscripts.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="font-medium text-xs">
                  {language === 'hi'
                    ? 'बातचीत शुरू होते ही दोनों वक्ताओं की बातें यहाँ लाइव दिखाई देंगी...'
                    : language === 'ta'
                    ? 'உரையாடல் தொடங்கும் போது இருவரின் உரையும் இங்கு தோன்றும்...'
                    : 'Live transcript will appear here chronologically as you converse...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Both <strong>PATIENT</strong> and <strong>AAROGYA</strong> turns are captured.
                </p>
              </div>
            ) : (
              liveTranscripts.map((msg) => {
                const isAarogya = msg.sender === 'ai';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAarogya ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isAarogya
                            ? 'bg-teal-100 text-teal-900 border border-teal-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {isAarogya ? 'AAROGYA' : 'PATIENT'}
                      </span>
                      {msg.isInterim && (
                        <span className="text-[10px] text-amber-600 font-medium animate-pulse">
                          (speaking...)
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed font-medium ${
                        isAarogya
                          ? 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
                          : 'bg-teal-700 text-white shadow-xs'
                      }`}
                    >
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* DISCOVERED CLINICAL FACTS — ONLY RELEVANT DISCOVERED FACTS (NO EMPTY BOXES) */}
      <div className="w-full bg-white rounded-2xl border border-teal-200/90 shadow-sm overflow-hidden mb-4">
        <button
          type="button"
          onClick={() => setShowFactsCard(!showFactsCard)}
          className="w-full px-4 py-2.5 bg-teal-50/70 hover:bg-teal-100/70 border-b border-teal-200 flex items-center justify-between text-xs font-bold text-teal-950 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-700" />
            <span className="font-black uppercase tracking-wider">
              DISCOVERED CLINICAL FACTS (LIVE)
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
              Active Sync
            </span>
          </div>
          {showFactsCard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFactsCard && (
          <div className="p-4 bg-slate-50/40 text-xs">
            {!hasDiscoveredFacts ? (
              <p className="text-slate-500 italic text-center py-2">
                Listening actively to the consultation. Clinical facts will appear here as they are discussed.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {clinicalCase.chiefComplaint && (
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-900 shadow-2xs flex items-center gap-1.5">
                    <span className="font-bold text-teal-900 uppercase text-[10px]">Complaint:</span>
                    <span className="font-extrabold">{clinicalCase.chiefComplaint}</span>
                    {clinicalCase.duration && (
                      <span className="text-slate-500 text-[11px]">({clinicalCase.duration})</span>
                    )}
                  </div>
                )}

                {clinicalCase.associatedSymptoms.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
                    <span className="font-bold text-teal-900 uppercase text-[10px]">Associated:</span>
                    <span>{clinicalCase.associatedSymptoms.join(', ')}</span>
                  </div>
                )}

                {clinicalCase.pastMedicalHistory.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
                    <span className="font-bold text-teal-900 uppercase text-[10px]">Past History:</span>
                    <span>{clinicalCase.pastMedicalHistory.join(', ')}</span>
                  </div>
                )}

                {clinicalCase.medicationHistory.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
                    <span className="font-bold text-teal-900 uppercase text-[10px]">Medications:</span>
                    <span className="font-medium text-teal-950">
                      {clinicalCase.medicationHistory.join(', ')}
                    </span>
                  </div>
                )}

                {clinicalCase.allergies.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-2xs flex items-center gap-1.5">
                    <span className="font-bold uppercase text-[10px] text-rose-950">Allergy:</span>
                    <span className="font-extrabold">{clinicalCase.allergies.join(', ')}</span>
                  </div>
                )}

                {visitType === 'ayush' && clinicalCase.ayushHistory && (
                  <>
                    {clinicalCase.ayushHistory.agni?.appetite &&
                      clinicalCase.ayushHistory.agni.appetite !== 'Not yet discussed' && (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-2xs flex items-center gap-1.5">
                          <span className="font-bold uppercase text-[10px]">Agni (Digestion):</span>
                          <span>{clinicalCase.ayushHistory.agni.appetite}</span>
                        </div>
                      )}

                    {clinicalCase.ayushHistory.ahara?.foodPreferences &&
                      clinicalCase.ayushHistory.ahara.foodPreferences !== 'Not yet discussed' && (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-2xs flex items-center gap-1.5">
                          <span className="font-bold uppercase text-[10px]">Ahara (Diet):</span>
                          <span>{clinicalCase.ayushHistory.ahara.foodPreferences}</span>
                        </div>
                      )}

                    {clinicalCase.ayushHistory.nidra?.quality &&
                      clinicalCase.ayushHistory.nidra.quality !== 'Not yet discussed' && (
                        <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-2xs flex items-center gap-1.5">
                          <span className="font-bold uppercase text-[10px]">Nidra (Sleep):</span>
                          <span>{clinicalCase.ayushHistory.nidra.quality}</span>
                        </div>
                      )}
                  </>
                )}

                {attachedDocs.length > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-teal-100/70 border border-teal-300 text-teal-950 shadow-2xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-800" />
                    <span className="font-bold uppercase text-[10px]">Attached Documents:</span>
                    <span>{attachedDocs.map((d) => d.name).join(', ')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Controls */}
      <div className="w-full flex items-center justify-center gap-4">
        {/* Mute / Unmute Button */}
        <button
          type="button"
          onClick={handleToggleMute}
          id="btn-voice-toggle-mute"
          className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-sm ${
            isMuted
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
          }`}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-teal-600" />}
          <span>{isMuted ? t.ready_mic : t.stop_mic}</span>
        </button>

        {/* End Consultation Button */}
        <button
          type="button"
          onClick={handleFinish}
          id="btn-voice-end-consultation"
          className="px-6 py-3 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-rose-900/20 transition-all hover:scale-[1.02]"
        >
          <PhoneOff className="w-4 h-4" />
          <span>{t.complete_consultation}</span>
        </button>
      </div>

      {/* Development Diagnostics Bar */}
      <div className="mt-4 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-[11px] font-mono text-slate-500 flex items-center gap-3">
        <Activity className="w-3 h-3 text-teal-600 shrink-0" />
        <span>Live sessions: {diagnostics.activeLiveSessions}/1</span>
        <span>•</span>
        <span>Mic streams: {diagnostics.activeMicrophoneStreams}/1</span>
        <span>•</span>
        <span>Audio contexts: {diagnostics.activeAudioContexts}/1</span>
        <span>•</span>
        <span>Transcripts: {liveTranscripts.length}</span>
      </div>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        patientId={patient.id}
        onDocumentProcessed={handleDocumentUploaded}
        language={language}
      />
    </div>
  );
};
