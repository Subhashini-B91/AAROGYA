import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Send,
  Sparkles,
  AlertTriangle,
  UploadCloud,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  Activity,
  Layers,
  HelpCircle,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import {
  Language,
  ChatMessage,
  PatientProfile,
  ClinicalSchema,
  RedFlagAlert,
  UploadedDocument,
  AccessibilitySettings,
} from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';
import { CLINICAL_QUESTION_GUIDE, getInitialEmptySchema } from '../utils/clinicalData';
import { evaluateDeterministicRedFlags } from '../utils/safetyEngine';
import { DocumentUploadModal } from './DocumentUploadModal';
import { VoiceConsultationOrb } from './VoiceConsultationOrb';
import { voiceSessionManager } from '../utils/voiceSessionManager';
import {
  ClinicalCaseState,
  extractClinicalInformation,
  getInitialClinicalCaseState,
} from '../utils/clinicalExtraction';

interface ScreenInterviewProps {
  patient: PatientProfile;
  visitType: 'allopathic' | 'ayush';
  language: Language;
  onLanguageChange: (lang: Language) => void;
  accessibility: AccessibilitySettings;
  onGenerateSummary: (schema: ClinicalSchema, messages: ChatMessage[]) => void;
  documents: UploadedDocument[];
  onAddDocument: (doc: UploadedDocument) => void;
  onLiveCaseUpdate?: (caseState: ClinicalCaseState, transcripts: ChatMessage[]) => void;
  initialCaseState?: ClinicalCaseState;
}

export const ScreenInterview: React.FC<ScreenInterviewProps> = ({
  patient,
  visitType,
  language,
  onLanguageChange,
  accessibility,
  onGenerateSummary,
  documents,
  onAddDocument,
  onLiveCaseUpdate,
  initialCaseState,
}) => {
  const t = UI_TRANSLATIONS[language];

  // Mode: 'voice' (default for real-time Live Assistant) vs 'text'
  const [interviewMode, setInterviewMode] = useState<'voice' | 'text'>('voice');

  // Chat state for text mode
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [activeRedFlags, setActiveRedFlags] = useState<RedFlagAlert[]>([]);

  // Document modal state
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Structured clinical schema state extracted during interview
  const [clinicalSchema, setClinicalSchema] = useState<ClinicalSchema>(getInitialEmptySchema());

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Live case state synchronized across voice and text modes
  const [liveCase, setLiveCase] = useState<ClinicalCaseState>(() =>
    initialCaseState || getInitialClinicalCaseState()
  );

  // Auto-scroll chat on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isAiLoading]);

  // Initial greeting in text mode
  useEffect(() => {
    if (messages.length === 0) {
      const initialQuestion =
        CLINICAL_QUESTION_GUIDE[0][
          language === 'hi' ? 'questionHi' : language === 'ta' ? 'questionTa' : 'questionEn'
        ];

      const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'ai',
        text: initialQuestion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies:
          language === 'hi'
            ? ['पेट में जलन व दर्द', 'छाती में भारीपन', 'बुखार और कमजोरी', 'सिरदर्द और चक्कर']
            : language === 'ta'
            ? ['வயிற்று வலி & நெஞ்செரிச்சல்', 'காய்ச்சல் & சோர்வு', 'தலைவலி & தலைசுற்றல்']
            : ['Abdominal pain / reflux', 'Fever & fatigue', 'Headache / dizziness', 'Joint pain'],
      };

      setMessages([initialMessage]);
      setQuickReplies(initialMessage.quickReplies || []);
    }
  }, [language]);

  // Send message in text mode
  const handleSendMessage = async (userText: string) => {
    const textToSend = userText.trim();
    if (!textToSend || isAiLoading) return;

    setInputText('');

    const patientMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'patient',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, patientMsg];
    setMessages(updatedMessages);
    setIsAiLoading(true);
    setQuickReplies([]);

    // Live continuous extraction from patient utterance
    const prevAi = [...messages].reverse().find((m) => m.sender === 'ai')?.text;
    const updatedCase = extractClinicalInformation(liveCase, textToSend, 'PATIENT_TEXT', prevAi);
    setLiveCase(updatedCase);
    onLiveCaseUpdate?.(updatedCase, updatedMessages);

    // Safety Red Flag evaluation
    const detectedRedFlags = evaluateDeterministicRedFlags(textToSend, visitType);
    if (detectedRedFlags.length > 0) {
      setActiveRedFlags((prev) => [...prev, ...detectedRedFlags]);
    }

    try {
      // Fast API call
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: updatedMessages,
          clinicalSchema,
          language,
          patient,
          visitType,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text: data.replyText || 'Thank you. Could you share more details about your symptom duration?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        quickReplies: data.quickReplies || [],
        isRedFlagWarning: detectedRedFlags.length > 0,
      };

      setMessages([...updatedMessages, aiMsg]);
      setQuickReplies(data.quickReplies || []);

      if (data.extractedEntities) {
        setClinicalSchema((prev) => ({
          ...prev,
          chief_complaint: prev.chief_complaint || data.extractedEntities.chief_complaint || textToSend,
          hpi: {
            ...prev.hpi,
            site: prev.hpi.site || data.extractedEntities.hpi_site || '',
            onset: prev.hpi.onset || data.extractedEntities.hpi_onset || '',
            character: prev.hpi.character || data.extractedEntities.hpi_character || '',
            severity: prev.hpi.severity || data.extractedEntities.hpi_severity || '',
          },
        }));
      }
    } catch (err) {
      console.warn('Chat request failed:', err);
      const fallbackAiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'ai',
        text:
          language === 'hi'
            ? 'धन्यवाद। क्या आप बता सकते हैं कि यह लक्षण कब से है?'
            : language === 'ta'
            ? 'நன்றி. இந்த அறிகுறி எப்போது தொடங்கியது?'
            : 'Thank you. Could you tell me when this symptom first began?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...updatedMessages, fallbackAiMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCompleteConsultation = (customTranscript?: ChatMessage[]) => {
    voiceSessionManager.endSession();
    const finalTranscript = customTranscript && customTranscript.length > 0 ? customTranscript : messages;
    onGenerateSummary(clinicalSchema, finalTranscript);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100/60 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* If Voice Mode is active, render the dedicated Real-Time Voice Consultation UI */}
        {interviewMode === 'voice' ? (
          <VoiceConsultationOrb
            patient={patient}
            visitType={visitType}
            language={language}
            onEndConsultation={(voiceTranscript) => handleCompleteConsultation(voiceTranscript)}
            onSwitchToTextMode={() => setInterviewMode('text')}
            onLiveCaseUpdate={onLiveCaseUpdate}
            initialCaseState={initialCaseState}
            documents={documents}
            onAddDocument={onAddDocument}
          />
        ) : (
          /* Text / Chat Mode Interface */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chat Conversation */}
            <div className="lg:col-span-8 flex flex-col bg-white rounded-3xl border border-slate-200/80 shadow-xs h-[calc(100vh-10rem)] overflow-hidden">
              {/* Top Chat Bar */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-bold">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      {patient.name} ({patient.age}Y • {patient.sex})
                    </h2>
                    <p className="text-xs text-slate-500">
                      {visitType === 'ayush' ? 'Integrative Medicine' : 'General Internal Medicine'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setInterviewMode('voice')}
                    id="btn-switch-to-voice-orb"
                    className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{t.talk_with_me}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    id="btn-chat-upload-docs"
                    className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t.upload_document}</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div ref={chatScrollRef} className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/40">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'ai' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all shadow-2xs ${
                        msg.sender === 'ai'
                          ? 'bg-white border border-slate-200 text-slate-900'
                          : 'bg-teal-700 text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1 text-[11px] font-semibold opacity-70">
                        <span className="font-bold tracking-wide">{msg.sender === 'ai' ? 'AAROGYA' : 'PATIENT'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-2 h-2 rounded-full bg-teal-600 animate-bounce [animation-delay:0.4s]" />
                      <span className="text-xs text-slate-500 font-medium ml-1">
                        {t.thinking}
                      </span>
                    </div>
                  </div>
                )}
              </div>

                {/* Quick reply chips */}
                {quickReplies.length > 0 && !isAiLoading && (
                  <div className="px-5 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      Suggestions:
                    </span>
                    {quickReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(reply)}
                        id={`quick-reply-${idx}`}
                        className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 border border-slate-200 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}

              {/* Chat Input Bar */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(inputText);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={t.type_placeholder}
                    id="input-chat-message"
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-600 text-sm text-slate-900 transition-all"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isAiLoading}
                    id="btn-send-message"
                    className="p-3 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white rounded-2xl font-bold transition-all shadow-xs"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Active Clinical Data & Finish Action */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Complete Consultation Card */}
              <div className="bg-gradient-to-br from-teal-800 to-emerald-900 text-white rounded-3xl p-6 shadow-md">
                <h3 className="text-base font-bold font-serif mb-1">
                  {t.complete_consultation}
                </h3>
                <p className="text-xs text-emerald-100/90 leading-relaxed mb-4">
                  When you have finished reporting your symptoms and history, click below to generate a structured clinical case summary for your treating doctor.
                </p>

                <button
                  type="button"
                  onClick={() => handleCompleteConsultation()}
                  id="btn-finish-consultation-side"
                  className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.01]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Case Summary</span>
                </button>
              </div>

              {/* Uploaded Documents List */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex-1">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Medical Documents ({documents.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDocModalOpen(true)}
                    id="btn-upload-side"
                    className="text-xs font-bold text-teal-700 hover:text-teal-900"
                  >
                    + Upload
                  </button>
                </div>

                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    {t.no_documents_uploaded}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                      >
                        <div className="truncate pr-2">
                          <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                          <span className="text-[10px] text-slate-500 uppercase font-mono">
                            {doc.type.replace('_', ' ')} • {doc.date}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Ready
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Document Modal */}
        {isDocModalOpen && (
          <DocumentUploadModal
            patientId={patient.id}
            language={language}
            onClose={() => setIsDocModalOpen(false)}
            onAddDocument={(doc) => {
              onAddDocument(doc);
              setIsDocModalOpen(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
