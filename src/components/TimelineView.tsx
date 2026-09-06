import React from 'react';
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  Activity,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { UploadedDocument, Language } from '../types';
import { UI_TRANSLATIONS } from '../utils/translations';

interface TimelineViewProps {
  documents: UploadedDocument[];
  language: Language;
  onSelectDoc: (doc: UploadedDocument) => void;
  selectedDocId?: string;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  documents,
  language,
  onSelectDoc,
  selectedDocId,
}) => {
  const t = UI_TRANSLATIONS[language];

  // Sort documents by date descending (or date ascending)
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt).getTime();
    const dateB = new Date(b.date || b.createdAt).getTime();
    return dateB - dateA;
  });

  const getDocTypeIcon = (type: UploadedDocument['type']) => {
    switch (type) {
      case 'prescription':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'lab_report':
        return <Activity className="w-4 h-4 text-indigo-600" />;
      case 'discharge_summary':
        return <FileSpreadsheet className="w-4 h-4 text-blue-600" />;
      case 'ayush_pariksha':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const getDocTypeBadge = (type: UploadedDocument['type']) => {
    switch (type) {
      case 'prescription':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'lab_report':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'discharge_summary':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ayush_pariksha':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  if (sortedDocs.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
        <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          {t.timeline_title}
        </h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No medical records uploaded yet. Upload previous prescriptions, lab reports, or discharge summaries to generate an intelligent chronological timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-teal-700" />
          <h3 className="text-sm font-bold text-slate-900">{t.timeline_title}</h3>
        </div>
        <span className="text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
          {sortedDocs.length} {sortedDocs.length === 1 ? 'Record' : 'Records'} Logged
        </span>
      </div>

      {/* Visual Timeline Track */}
      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {sortedDocs.map((doc, idx) => {
          const isSelected = selectedDocId === doc.id;
          const medsCount = doc.structuredData?.medications?.length || 0;
          const labsCount = doc.structuredData?.labTests?.length || 0;
          const diagCount = doc.structuredData?.diagnoses?.length || 0;

          return (
            <div
              key={doc.id}
              onClick={() => onSelectDoc(doc)}
              id={`timeline-item-${doc.id}`}
              className={`relative group cursor-pointer transition-all ${
                isSelected ? 'scale-[1.01]' : ''
              }`}
            >
              {/* Timeline Marker Dot */}
              <div
                className={`absolute -left-[27px] top-1.5 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-all ${
                  isSelected
                    ? 'border-teal-600 ring-4 ring-teal-100'
                    : 'border-slate-400 group-hover:border-teal-500'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-teal-600" />
              </div>

              {/* Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-teal-50/50 border-teal-500 shadow-sm'
                    : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${getDocTypeBadge(
                        doc.type
                      )}`}
                    >
                      {getDocTypeIcon(doc.type)}
                      {doc.type.replace('_', ' ')}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-teal-800 transition-colors">
                      {doc.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{doc.date || doc.createdAt.split('T')[0]}</span>
                  </div>
                </div>

                {/* Structured Extraction Highlights */}
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  {doc.structuredData?.hospitalOrDoctor && (
                    <p className="text-[11px] font-medium text-slate-700">
                      🏥 {doc.structuredData.hospitalOrDoctor}
                    </p>
                  )}

                  {diagCount > 0 && (
                    <p className="text-slate-800">
                      <span className="font-semibold text-slate-900">Dx: </span>
                      {doc.structuredData.diagnoses?.join(', ')}
                    </p>
                  )}

                  {medsCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.structuredData.medications?.slice(0, 3).map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded"
                        >
                          💊 {m.name} {m.dose || ''}
                        </span>
                      ))}
                      {medsCount > 3 && (
                        <span className="text-[10px] text-slate-500 self-center">
                          +{medsCount - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {labsCount > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {doc.structuredData.labTests?.slice(0, 3).map((l, lIdx) => (
                        <span
                          key={lIdx}
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            l.status === 'abnormal'
                              ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold'
                              : 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          🧪 {l.testName}: {l.value} {l.unit}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">
                    OCR Confidence:{' '}
                    <strong
                      className={
                        doc.ocrConfidence === 'high'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }
                    >
                      {doc.ocrConfidence.toUpperCase()}
                    </strong>
                  </span>
                  <span className="text-teal-700 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Inspect extracted data <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
