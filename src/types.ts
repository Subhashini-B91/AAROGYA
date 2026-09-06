export type Language = 'en' | 'hi' | 'ta';

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  audioGuided: boolean;
  signLanguageAvatar: boolean;
}

export interface PatientProfile {
  id: string;
  name: string;
  abhaId: string;
  age: number;
  sex: 'Male' | 'Female' | 'Other';
  preferredLanguage: Language;
  phone?: string;
  password?: string;
  department?: string;
  primaryConcern?: string;
  consentDataCapture: boolean;
  consentDataSharing: boolean;
  consentTimestamp?: string;
  isRegistered?: boolean;
}

export interface HPI {
  site: string;
  onset: string;
  character: string;
  radiation: string;
  associated_symptoms: string[];
  timing: string;
  aggravating_factors: string[];
  relieving_factors: string[];
  severity: string;
}

export interface MedicationItem {
  name: string;
  dose?: string;
  frequency?: string;
  duration?: string;
  status?: 'active' | 'discontinued' | 'as_needed';
  source?: 'patient_reported' | 'document_extracted';
}

export interface SocialHistory {
  diet?: string;
  smoking?: string;
  alcohol?: string;
  occupation?: string;
  exercise?: string;
  sleep?: string;
  habits?: string[];
}

export interface ReviewOfSystems {
  general?: string;
  cardiorespiratory?: string;
  gastrointestinal?: string;
  genitourinary?: string;
  neurological?: string;
  musculoskeletal?: string;
  dermatological?: string;
}

export type AyushSystem =
  | 'ayurveda'
  | 'siddha'
  | 'unani'
  | 'homoeopathy'
  | 'yoga_naturopathy'
  | 'sowa_rigpa';

export interface AgniDigestiveHistory {
  appetite?: string; // Appetite status, e.g. "Low / Mandagni" or "Not yet discussed"
  digestion?: string; // Digestion efficiency, e.g. "Indigestion reported" or "Not yet discussed"
  mealTolerance?: string; // Tolerance to specific foods (spicy, oily, heavy) or "Not yet discussed"
  bloatingHeaviness?: string; // Post-meal abdominal bloating/heaviness or "Not yet discussed"
  postMealHeaviness?: string;
  bowelRelated?: string; // Bowel-related characteristics or "Not yet discussed"
  otherRelevant?: string;
}

export interface AharaDietaryHistory {
  usualDiet?: string; // Vegetarian, non-vegetarian, etc.
  mealTimings?: string; // Regularity of eating
  foodPreferences?: string; // Tastes/Gunas preferred (spicy, sour, sweet)
  recentChanges?: string; // Recent dietary shifts
  hydration?: string; // Water intake / warm water
  waterIntake?: string;
  symptomRelation?: string; // Foods that aggravate or soothe symptoms
}

export interface ViharaLifestyleHistory {
  dailyRoutine?: string; // Dinacharya / daily schedule
  physicalActivity?: string; // Exercise, walking, yoga
  sedentaryHabits?: string; // Sitting hours, screen time
  workPattern?: string; // Shift work, occupational strain
  occupationalStrain?: string;
  stressFactors?: string; // Mental stress, tension
}

export interface NidraSleepHistory {
  duration?: string; // Hours of sleep
  timing?: string; // Night owl vs early to bed
  quality?: string; // Restful, disturbed, unrefreshing
  disturbances?: string; // Mid-night waking, difficulty falling asleep
}

export interface MalaEliminationHistory {
  bowelFrequency?: string; // Times per day
  bowelPattern?: string; // Regular, irregular, strained
  frequency?: string;
  constipationOrLoose?: string; // Constipated, loose, mucus
  urinaryConcerns?: string; // Urgency, burning, nocturia
  micturition?: string;
}

export interface LakshanaCharacterization {
  nature?: string;
  onset?: string;
  duration?: string;
  frequency?: string;
  severity?: string;
  location?: string;
  character?: string;
  aggravating?: string;
  aggravatingFactors?: string;
  relieving?: string;
  relievingFactors?: string;
  associated?: string[];
}

export interface AyushClinicalHistory {
  system: AyushSystem;
  prakritiObservations: string; // Extracted conversation observations (body frame, thermal preference, skin)
  prakritiPractitionerStatus: string; // Default: "Not yet assessed / practitioner entered"
  practitionerPrakritiNotes?: string; // Doctor-entered Prakriti evaluation
  vikritiCurrentState: {
    appetiteChange?: string;
    digestionChange?: string;
    bowelHabitChange?: string;
    sleepChange?: string;
    energyChange?: string;
    stressChange?: string;
    routineChange?: string;
    otherChanges?: string;
  };
  agni: AgniDigestiveHistory;
  ahara: AharaDietaryHistory;
  vihara: ViharaLifestyleHistory;
  nidra: NidraSleepHistory;
  mala: MalaEliminationHistory;
  nidana?: string | { dietaryTriggers?: string; lifestyleTriggers?: string; seasonalInfluence?: string };
  lakshana: LakshanaCharacterization;
  manas?: { stressLevel?: string; emotionalDisposition?: string; sleepImpact?: string };
}

export interface AyushAssessment {
  prakriti?: string; // Constitution (Vata, Pitta, Kapha or dual/Sama)
  vikriti?: string; // Current Dosha imbalance
  sara?: string; // Tissue/Dhatu excellence (Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra)
  samhanana?: string; // Body compactness/build
  pramana?: string; // Proportions & anthropometry
  satmya?: string; // Suitability / adaptability to diet & climate
  sattva?: string; // Mental strength / psychological resilience (Pravara, Madhyama, Avara)
  ahara_shakti?: string; // Abhyavaharana & Jarana shakti (Food intake & digestion power)
  vyayama_shakti?: string; // Exercise & physical endurance capacity
  vaya?: string; // Age category (Balya, Madhyama, Vardhakya)
  nidana?: string; // Causative aetiological factors (Ahara/Vihara triggers)
  agni?: string; // Digestive fire state (Sama, Vishama, Tikshna, Manda)
  koshtha?: string; // Bowel habit (Mrudu, Madhyama, Krura)
  ahara_vihara?: string; // Specific dietary and regimen habits (Ritu-charya, Dinacharya)
}

export interface RedFlagAlert {
  id: string;
  category: 'cardiorespiratory' | 'neurological' | 'syncope' | 'hemorrhage' | 'ayush_agni' | 'ayush_koshtha' | 'ayush_metabolic' | 'other';
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  message: string;
  suggestedAction: string;
  triggeredBy?: string;
  timestamp?: string;
}

export interface DiscrepancyFlag {
  id: string;
  field: string;
  message?: string;
  description?: string;
  patientReported: string;
  documentReported?: string;
  documentFound?: string;
  status: 'pending' | 'resolved' | 'acknowledged';
}

export type ClinicalDiscrepancy = DiscrepancyFlag;

export interface ClinicalSchema {
  patient?: PatientProfile;
  visit_type?: 'allopathic' | 'ayush';
  chief_complaint: string;
  hpi: HPI;
  past_history: string[];
  medications: MedicationItem[];
  allergies: string[];
  family_history: string[];
  social_history?: SocialHistory;
  review_of_systems?: ReviewOfSystems;
  ayush_assessment?: AyushAssessment;
  red_flags?: RedFlagAlert[];
  discrepancies?: DiscrepancyFlag[];
  unknown_or_missing: string[];
  reconciliation_discrepancies?: DiscrepancyFlag[];
}

export interface StructuredDocData {
  medications?: Array<{ name: string; dose?: string; frequency?: string; duration?: string }>;
  diagnoses?: string[];
  labTests?: Array<{
    testName: string;
    value: string;
    unit: string;
    referenceRange?: string;
    status?: 'normal' | 'abnormal' | 'critical';
  }>;
  procedures?: string[];
  hospitalOrDoctor?: string;
  dates?: string[];
}

export interface UploadedDocument {
  id: string;
  patientId: string;
  name: string;
  type: 'prescription' | 'lab_report' | 'discharge_summary' | 'radiology' | 'ayush_pariksha' | 'other';
  date: string;
  imageUrl: string;
  rawOcrText: string;
  ocrConfidence: 'high' | 'medium' | 'low';
  structuredData: StructuredDocData;
  status: 'uploading' | 'ocr' | 'extracting' | 'complete' | 'error';
  errorMessage?: string;
  createdAt: string;
}

export interface SummarySections {
  patientInfo: string;
  clinicalSummary?: string; // 4-5 line AI-generated concise summary
  chiefComplaint: string;
  hpi: string;
  pastMedicalHistory: string;
  pastSurgicalHistory?: string;
  medicationHistory: string;
  allergies: string;
  familyHistory: string;
  socialLifestyle: string;
  reviewOfSystems: string;
  ayushAssessment?: string;
  previousInvestigations: string;
  currentPreviousMedications?: string;
  potentialRedFlags: string;
  pointsForDoctorAttention?: string;
  missingInformation: string;
}

export interface PhysicianMedicationRecommendation {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  prescribedBy?: string;
  prescribedAt?: string;
}

export interface PhysicianRecommendation {
  id?: string;
  patientId: string;
  caseId?: string;
  doctorName: string;
  recommendationText?: string; // The primary exact clinical recommendation (e.g. "Follow up after two weeks and continue the current treatment.")
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  rawDictation?: string;
  source: 'PHYSICIAN';
  inputMethod: 'VOICE' | 'TEXT';
  status: 'PHYSICIAN_CONFIRMED' | 'AWAITING_REVIEW';
  prescribedAt: string;
  diagnosis?: string;
  advice?: string;
  notes?: string;
  dietaryAdvice?: string;
  lifestyleAdvice?: string;
  followUp?: string;
  ayushAssessmentNotes?: string;
}

export interface LiveCaseData {
  patientId: string;
  patientName: string;
  patientAge: number | string;
  patientSex: string;
  department: string;
  status: 'in_progress' | 'completed';
  chiefComplaint: string;
  duration: string;
  associatedSymptoms: string[];
  pastMedicalHistory: string[];
  medications: string[];
  allergies: string[];
  familyHistory: string[];
  ayushAssessment?: AyushAssessment;
  transcript: ChatMessage[];
  lastUpdated: string;
}

export interface PhysicianCaseSummary {
  id: string;
  patientId: string;
  visitType: 'allopathic' | 'ayush';
  department?: string;
  encounterDate: string;
  transcript?: ChatMessage[];
  clinicalSummary?: string; // 4-5 line AI-generated concise clinical summary
  clinicalSummaryHindi?: string;
  clinicalSummaryTamil?: string;
  summaryEnglish: SummarySections;
  summaryHindi: SummarySections;
  summaryTamil?: SummarySections;
  patientAudioConfirmationText: string;
  discrepancies?: DiscrepancyFlag[];
  ayushHistory?: AyushClinicalHistory;
  status: 'ai_generated' | 'doctor_confirmed';
  doctorModifications?: string;
  doctorSignature?: string;
  physicianRecommendation?: PhysicianRecommendation;
  physicianRecommendations?: PhysicianMedicationRecommendation[];
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseSummary = PhysicianCaseSummary;

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'patient' | 'system';
  text: string;
  timestamp: string;
  translatedText?: Record<Language, string>;
  quickReplies?: string[];
  category?: string;
  extractedCategory?: string;
  isRedFlagWarning?: boolean;
}

export type InterviewMode = 'normal' | 'voice_conversation';
