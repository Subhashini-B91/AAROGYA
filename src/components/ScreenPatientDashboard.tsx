import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  FileText,
  Calendar,
  Volume2,
  UploadCloud,
  PlusCircle,
  Activity,
  Leaf,
  Clock,
  Sparkles,
  Download,
  ExternalLink,
  QrCode,
  CheckCircle2,
  Stethoscope,
  Printer,
  Pill,
} from 'lucide-react';
import {
  PatientProfile,
  PhysicianCaseSummary,
  UploadedDocument,
  Language,
  PhysicianRecommendation,
} from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';
import { TimelineView } from './TimelineView';
import { speakText } from '../utils/voiceUtils';
import { DocumentUploadModal } from './DocumentUploadModal';
import { downloadCaseSummaryPdf } from '../utils/pdfGenerator';

interface ScreenPatientDashboardProps {
  patient: PatientProfile;
  visitType: 'allopathic' | 'ayush';
  confirmedSummaries: PhysicianCaseSummary[];
  documents: UploadedDocument[];
  onStartNewConsultation: () => void;
  onAddDocument: (doc: UploadedDocument) => void;
  language: Language;
}

export const ScreenPatientDashboard: React.FC<ScreenPatientDashboardProps> = ({
  patient,
  visitType,
  confirmedSummaries,
  documents,
  onStartNewConsultation,
  onAddDocument,
  language,
}) => {
  const t = UI_TRANSLATIONS[language];
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<PhysicianRecommendation | null>(null);

  // Poll recommendation regularly so newly saved practitioner recommendations appear live
  useEffect(() => {
    if (!patient?.id) return;
    const fetchRecommendation = () => {
      fetch(`/api/recommendations/${patient.id}`)
        .then((res) => res.json())
        .then((data) => {
          const rec: PhysicianRecommendation | null =
            data?.latest ||
            (Array.isArray(data?.recommendations) ? data.recommendations[0] : null) ||
            data?.record ||
            null;
          if (rec) {
            setRecommendation(rec);
          }
        })
        .catch(() => {});
    };

    fetchRecommendation();
    const interval = setInterval(fetchRecommendation, 2000);
    return () => clearInterval(interval);
  }, [patient?.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    downloadCaseSummaryPdf(
      patient,
      confirmedSummaries.length > 0 ? confirmedSummaries[0] : null,
      recommendation,
      language
    );
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-100/60 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome & Action Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>{t.app_title} • {t.nav_portal}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif">
              {t.welcome_patient}, {patient.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              {t.patient_portal_subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              id="btn-print-summary-portal"
              className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>{t.print_summary}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              id="btn-download-pdf-portal"
              className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all"
            >
              <Download className="w-4 h-4 text-teal-300" />
              <span>{t.download_pdf}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              id="btn-patient-upload-doc"
              className="px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-xs transition-all"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t.upload_document}</span>
            </button>

            <button
              type="button"
              onClick={onStartNewConsultation}
              id="btn-patient-start-new-consultation"
              className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.start_preconsult}</span>
            </button>
          </div>
        </div>

        {/* Patient Profile & ABHA Digital Card Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Digital Health Identity Card */}
          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-teal-500/30 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-xs">
                    ABHA
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-200">
                      {t.digital_health_id}
                    </h3>
                    <p className="text-[10px] text-slate-400">{t.verified_card}</p>
                  </div>
                </div>
                <QrCode className="w-8 h-8 text-teal-400 opacity-80" />
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                    {t.abha_number}
                  </span>
                  <p className="text-base sm:text-lg font-mono font-bold tracking-widest text-emerald-300">
                    {patient.abhaId || '91-4521-8890-3341'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{t.patient_name}</span>
                    <p className="font-bold text-white truncate">{patient.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">{t.age_gender}</span>
                    <p className="font-bold text-white">
                      {patient.age} Yrs / {patient.sex}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span>{t.patient_id_label}: {patient.id}</span>
              <span className="text-emerald-400 font-semibold">{t.consent_active}</span>
            </div>
          </div>

          {/* Clinical Profile & Wellness Plan */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {t.clinical_care_lifestyle}
                  </h3>
                </div>
                <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full">
                  {visitType === 'ayush' ? t.ayush_medicine : t.general_medicine}
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100">
                  <span className="font-bold text-teal-950 block">{t.physician_dietary}</span>
                  <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-line">
                    {recommendation?.dietaryAdvice ||
                      (recommendation?.advice ? recommendation.advice : t.not_yet_discussed)}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block">
                    {t.physician_lifestyle}
                  </span>
                  <p className="text-slate-800 font-medium mt-0.5 whitespace-pre-line">
                    {recommendation?.lifestyleAdvice || t.not_yet_discussed}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>* {t.validated_by}: {recommendation?.doctorName || 'Attending Physician'}</span>
              {recommendation && (
                <span className="text-emerald-700 font-bold font-mono text-[10px]">
                  {t.physician_confirmed_tag}
                </span>
              )}
            </div>
          </div>

          {/* Document Vault Summary */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-700" />
                  <h3 className="text-sm font-bold text-slate-900">{t.medical_doc_locker}</h3>
                </div>
                <span className="text-xs font-bold text-teal-700 font-mono">
                  {documents.length} {t.files_count}
                </span>
              </div>

              <div className="mt-4 space-y-2 max-h-56 overflow-y-auto">
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px]">
                          Rx
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 truncate max-w-[140px]">
                            {doc.name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">{doc.date}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {t.doc_processed}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    {t.no_docs_uploaded}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDocModalOpen(true)}
              className="mt-4 w-full py-2.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>{t.add_record}</span>
            </button>
          </div>
        </div>

        {/* PHYSICIAN RECOMMENDATION DISPLAY IN PATIENT PORTAL */}
        {recommendation ? (
          <div id="portal-physician-recommendation-card" className="bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg border-2 border-emerald-400/50 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/15">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center border border-emerald-400/40 shadow-inner">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold uppercase tracking-wide text-white">
                      {t.physician_rec_title}
                    </h3>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2.5 py-0.5 rounded-full">
                      {recommendation.inputMethod === 'VOICE' ? t.voice_dictated : t.doctor_entered}
                    </span>
                  </div>
                  <p className="text-xs text-teal-200 font-medium">
                    {recommendation.doctorName
                      ? `${t.prescribed_by} ${recommendation.doctorName} • `
                      : ''}
                    {t.case_id_label}: {patient.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const speech = `Physician recommendation ${recommendation.doctorName ? `by ${recommendation.doctorName}` : ''}. Medicine: ${recommendation.medication}. Dosage: ${recommendation.dosage}. Frequency: ${recommendation.frequency}. Duration: ${recommendation.duration}. Instructions: ${recommendation.instructions || recommendation.advice}. Dietary advice: ${recommendation.dietaryAdvice || 'None'}. Lifestyle advice: ${recommendation.lifestyleAdvice || 'None'}.`;
                    speakText(speech, language);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-800/80 hover:bg-teal-700 text-teal-100 text-xs font-bold flex items-center gap-1.5 border border-teal-600 transition-colors"
                  title="Read recommendation aloud"
                >
                  <Volume2 className="w-3.5 h-3.5 text-teal-300" />
                  <span>{t.listen}</span>
                </button>
                <span className="text-[11px] font-mono text-emerald-200 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
                  {recommendation.prescribedAt ? new Date(recommendation.prescribedAt).toLocaleDateString() : 'Today'}
                </span>
              </div>
            </div>

            {/* Structured Prescription Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
              {/* Prescribed Medication */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">
                    {t.rx_medicine}
                  </span>
                  <p className="text-sm font-extrabold text-white">
                    {recommendation.medication || recommendation.recommendationText || 'Prescribed formulation'}
                  </p>
                </div>
                {recommendation.dosage && (
                  <p className="text-xs text-teal-200 font-mono mt-2 bg-black/20 px-2.5 py-1 rounded-lg">
                    {t.dosage}: {recommendation.dosage}
                  </p>
                )}
              </div>

              {/* Regimen: Frequency & Duration */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">
                    {t.regimen_duration}
                  </span>
                  <p className="text-xs text-white font-medium">
                    <strong>{t.frequency}:</strong> {recommendation.frequency || 'As advised'}
                  </p>
                  <p className="text-xs text-white font-medium mt-1">
                    <strong>{t.duration}:</strong> {recommendation.duration || 'Course duration'}
                  </p>
                </div>
                {recommendation.diagnosis && (
                  <p className="text-[11px] text-teal-100/90 mt-2 italic">
                    {t.impression}: {recommendation.diagnosis}
                  </p>
                )}
              </div>

              {/* Instructions */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">
                    {t.patient_instructions}
                  </span>
                  <p className="text-xs text-white leading-relaxed">
                    {recommendation.instructions || recommendation.advice || 'Follow prescription regimen strictly.'}
                  </p>
                </div>
                {recommendation.followUp && (
                  <div className="mt-2 text-[11px] font-semibold text-amber-200 bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
                    {t.follow_up}: {recommendation.followUp}
                  </div>
                )}
              </div>

              {/* Clinical Dietary / Lifestyle Guidance */}
              <div className="bg-white/10 rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider block mb-1">
                    {t.diet_routine}
                  </span>
                  <p className="text-xs text-white leading-relaxed">
                    <strong>{t.diet_label}:</strong> {recommendation.dietaryAdvice || 'Light fresh meals'}
                  </p>
                  <p className="text-xs text-white leading-relaxed mt-1">
                    <strong>{t.routine_label}:</strong> {recommendation.lifestyleAdvice || 'Adequate rest & hydration'}
                  </p>
                </div>
                {recommendation.ayushAssessmentNotes && (
                  <div className="mt-2 text-[11px] text-emerald-200 bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    {t.ayush_note}: {recommendation.ayushAssessmentNotes}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div id="portal-physician-recommendation-pending" className="bg-white rounded-3xl p-6 border-2 border-dashed border-teal-300 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {t.opd_in_progress}
                </h4>
                <p className="text-xs text-slate-500">
                  {t.opd_sync_msg}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200 shrink-0">
              {t.sync_live_badge}
            </span>
          </div>
        )}

        {/* Doctor-Confirmed Past Case Summaries */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-base font-bold text-slate-900">
                {t.past_confirmed_summaries}
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {confirmedSummaries.length} {t.consultations_recorded}
            </span>
          </div>

          {confirmedSummaries.length > 0 ? (
            <div className="space-y-4">
              {confirmedSummaries.map((sum) => (
                <div
                  key={sum.id}
                  className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                        {t.physician_confirmed_tag}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        {sum.confirmedAt ? sum.confirmedAt.split('T')[0] : 'Encounter Recorded'}
                      </span>
                    </div>

                    {sum.patientAudioConfirmationText && (
                      <button
                        type="button"
                        onClick={() =>
                          speakText(sum.patientAudioConfirmationText || '', language)
                        }
                        id={`btn-play-past-summary-${sum.id}`}
                        className="flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-950 bg-white px-3 py-1 rounded-xl border border-teal-200 shadow-2xs"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-teal-700" />
                        <span>{t.listen}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 uppercase text-[10px] text-indigo-900 block">
                        {t.chief_complaint_lbl}:
                      </span>
                      <p className="text-slate-800 leading-relaxed font-medium">
                        {language === 'hi'
                          ? sum.summaryHindi?.chiefComplaint || t.none_reported
                          : language === 'ta'
                          ? sum.summaryTamil?.chiefComplaint || sum.summaryEnglish?.chiefComplaint || t.none_reported
                          : sum.summaryEnglish?.chiefComplaint || t.none_reported}
                      </p>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-slate-900 uppercase text-[10px] text-emerald-900 block">
                        {t.physician_rx_plan}:
                      </span>
                      <p className="text-slate-800 leading-relaxed">
                        {sum.doctorModifications ||
                          'Prescribed clinical follow-up and symptomatic management.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-xs">
              {t.no_consultations_yet}
            </div>
          )}
        </div>

        {/* Chronological Timeline */}
        <TimelineView
          documents={documents}
          language={language}
          onSelectDoc={(doc) => {}}
        />
      </div>

      <DocumentUploadModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        patientId={patient.id}
        language={language}
        onDocumentProcessed={(doc) => {
          onAddDocument(doc);
          setIsDocModalOpen(false);
        }}
      />
    </div>
  );
};
