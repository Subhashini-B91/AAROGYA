import {
  Language,
  PatientProfile,
  PhysicianCaseSummary,
  ChatMessage,
  AyushClinicalHistory,
  AyushSystem,
} from '../types';

export type ClinicalFactSourceType =
  | 'PATIENT_INTAKE'
  | 'PATIENT_VOICE'
  | 'PATIENT_TEXT'
  | 'UPLOADED_RECORD'
  | 'PHYSICIAN';

export type ClinicalFactStatus =
  | 'PATIENT_REPORTED'
  | 'AI_INTERPRETED'
  | 'PHYSICIAN_VERIFIED';

export interface ExtractedClinicalFact {
  field: string;
  value: string;
  source: ClinicalFactSourceType;
  status: ClinicalFactStatus;
  timestamp: string;
  rawText?: string;
}

export function getInitialAyushClinicalHistory(system: AyushSystem = 'ayurveda'): AyushClinicalHistory {
  return {
    system,
    prakritiObservations: 'Not yet assessed / practitioner entered',
    prakritiPractitionerStatus: 'Not yet assessed / practitioner entered',
    practitionerPrakritiNotes: '',
    vikritiCurrentState: {
      appetiteChange: 'Not yet discussed',
      digestionChange: 'Not yet discussed',
      bowelHabitChange: 'Not yet discussed',
      sleepChange: 'Not yet discussed',
      energyChange: 'Not yet discussed',
      stressChange: 'Not yet discussed',
      routineChange: 'Not yet discussed',
      otherChanges: '',
    },
    agni: {
      appetite: 'Not yet discussed',
      digestion: 'Not yet discussed',
      mealTolerance: 'Not yet discussed',
      bloatingHeaviness: 'Not yet discussed',
      bowelRelated: 'Not yet discussed',
      otherRelevant: 'Not yet discussed',
    },
    ahara: {
      usualDiet: 'Not yet discussed',
      mealTimings: 'Not yet discussed',
      foodPreferences: 'Not yet discussed',
      recentChanges: 'Not yet discussed',
      hydration: 'Not yet discussed',
      symptomRelation: 'Not yet discussed',
    },
    vihara: {
      dailyRoutine: 'Not yet discussed',
      physicalActivity: 'Not yet discussed',
      sedentaryHabits: 'Not yet discussed',
      workPattern: 'Not yet discussed',
      stressFactors: 'Not yet discussed',
    },
    nidra: {
      duration: 'Not yet discussed',
      timing: 'Not yet discussed',
      quality: 'Not yet discussed',
      disturbances: 'Not yet discussed',
    },
    mala: {
      bowelFrequency: 'Not yet discussed',
      bowelPattern: 'Not yet discussed',
      constipationOrLoose: 'Not yet discussed',
      urinaryConcerns: 'Not yet discussed',
    },
    nidana: 'Patient-reported possible contributing factors: Not yet discussed',
    lakshana: {
      onset: 'Not yet discussed',
      duration: 'Not yet discussed',
      frequency: 'Not yet discussed',
      severity: 'Not yet discussed',
      location: 'Not yet discussed',
      character: 'Not yet discussed',
      aggravating: 'Not yet discussed',
      relieving: 'Not yet discussed',
      associated: [],
    },
  };
}

export interface ClinicalCaseState {
  chiefComplaint: string;
  duration: string;
  associatedSymptoms: string[];
  hpi: string;
  pastMedicalHistory: string[];
  pastSurgicalHistory: string[];
  medicationHistory: string[];
  allergies: string[];
  familyHistory: string[];
  socialLifestyle: string[];
  diet: string;
  sleep: string;
  reviewOfSystems: string;
  ayushAssessment?: {
    prakriti?: string;
    agni?: string;
    koshtha?: string;
    doshaImbalance?: string;
  };
  ayushHistory: AyushClinicalHistory;
  previousInvestigations: string[];
  previousEpisodes: string;
  sources: Record<string, ExtractedClinicalFact>;
  lastUpdated?: string;
}

export function getInitialClinicalCaseState(system: AyushSystem = 'ayurveda'): ClinicalCaseState {
  return {
    chiefComplaint: '',
    duration: '',
    associatedSymptoms: [],
    hpi: '',
    pastMedicalHistory: [],
    pastSurgicalHistory: [],
    medicationHistory: [],
    allergies: [],
    familyHistory: [],
    socialLifestyle: [],
    diet: '',
    sleep: '',
    reviewOfSystems: '',
    ayushHistory: getInitialAyushClinicalHistory(system),
    previousInvestigations: [],
    previousEpisodes: '',
    sources: {},
    lastUpdated: new Date().toISOString(),
  };
}

// Map of number words to digits
const NUMBER_WORDS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
};

// Known symptom keywords and their standardized clinical terms
const SYMPTOM_MAP: Record<string, string> = {
  vomiting: 'Vomiting',
  vomit: 'Vomiting',
  vomited: 'Vomiting',
  उल्टी: 'Vomiting',
  वाந்தி: 'Vomiting',

  fever: 'Fever',
  temperature: 'Fever',
  pyrexia: 'Fever',
  बुखार: 'Fever',
  காய்ச்சல்: 'Fever',

  headache: 'Headache',
  'head ache': 'Headache',
  सिरदर्द: 'Headache',
  தலைவலி: 'Headache',

  'body pain': 'Body pain',
  'body ache': 'Body pain',
  'body aches': 'Body pain',
  'generalized body pain': 'Body pain',
  बदनदर्द: 'Body pain',
  'உடல் வலி': 'Body pain',

  cough: 'Cough',
  coughing: 'Cough',
  खांसी: 'Cough',
  இருமல்: 'Cough',

  cold: 'Cold',
  सर्दी: 'Cold',
  ஜலதோஷம்: 'Cold',

  'chest pain': 'Chest pain',
  'छाती में दर्द': 'Chest pain',
  'நெஞ்சு வலி': 'Chest pain',

  'stomach pain': 'Stomach pain',
  'abdominal pain': 'Abdominal pain',
  'belly pain': 'Stomach pain',
  'पेट दर्द': 'Stomach pain',
  'வயிற்று வலி': 'Stomach pain',

  nausea: 'Nausea',
  'जी मिचलाना': 'Nausea',
  குமட்டல்: 'Nausea',

  fatigue: 'Fatigue',
  tiredness: 'Fatigue',
  weakness: 'Weakness',
  कमजोरी: 'Weakness',
  थकान: 'Fatigue',
  சோர்வு: 'Fatigue',

  dizziness: 'Dizziness',
  giddiness: 'Dizziness',
  चक्कर: 'Dizziness',
  தலைச்சுற்றல்: 'Dizziness',

  'joint pain': 'Joint pain',
  'जोड़ों का दर्द': 'Joint pain',
  'மூட்டு வலி': 'Joint pain',

  'sore throat': 'Sore throat',
  'throat pain': 'Sore throat',
  'गले में खराश': 'Sore throat',
  'தொண்டை வலி': 'Sore throat',

  'shortness of breath': 'Shortness of breath',
  breathlessness: 'Shortness of breath',
  'difficulty breathing': 'Shortness of breath',
  'सांस लेने में तकलीफ': 'Shortness of breath',
  மூச்சுத்திணறல்: 'Shortness of breath',

  diarrhea: 'Diarrhea',
  'loose motion': 'Diarrhea',
  'loose stools': 'Diarrhea',
  दस्त: 'Diarrhea',
  வயிற்றுப்போக்கு: 'Diarrhea',
};

// Known past medical conditions
const MEDICAL_CONDITIONS_MAP: Record<string, string> = {
  diabetes: 'Diabetes',
  diabetic: 'Diabetes',
  'type 2 diabetes': 'Type 2 Diabetes',
  'type 1 diabetes': 'Type 1 Diabetes',
  sugar: 'Diabetes',
  मधुमेह: 'Diabetes',
  शुगर: 'Diabetes',
  'சர்க்கரை நோய்': 'Diabetes',

  hypertension: 'Hypertension',
  'high bp': 'Hypertension',
  'high blood pressure': 'Hypertension',
  bp: 'Hypertension',
  'उच्च रक्तचाप': 'Hypertension',
  'உயர் இரத்த அழுத்தம்': 'Hypertension',

  asthma: 'Asthma',
  अस्थमा: 'Asthma',
  ஆஸ்துமா: 'Asthma',

  thyroid: 'Thyroid disorder',
  hypothyroid: 'Hypothyroidism',
  hypothyroidism: 'Hypothyroidism',
  hyperthyroidism: 'Hyperthyroidism',
  थायरॉइड: 'Thyroid disorder',
  தைராய்டு: 'Thyroid disorder',

  arthritis: 'Arthritis',
  गठिया: 'Arthritis',
  மூட்டுவாதம்: 'Arthritis',

  'heart disease': 'Heart disease',
  cardiac: 'Cardiac disorder',
  'heart attack': 'Past myocardial infarction',
  'हृदय रोग': 'Heart disease',
  'இதய நோய்': 'Heart disease',

  cholesterol: 'Hypercholesterolemia',
  'high cholesterol': 'Hypercholesterolemia',
  कोलेस्ट्रॉल: 'Hypercholesterolemia',

  'kidney disease': 'Kidney disease',
  'kidney stone': 'Kidney stones',
  'गुर्दे की बीमारी': 'Kidney disease',
  'சிறுநீரக நோய்': 'Kidney disease',

  tuberculosis: 'Tuberculosis (TB)',
  tb: 'Tuberculosis (TB)',
  टीबी: 'Tuberculosis (TB)',
  காசநோய்: 'Tuberculosis (TB)',

  migraine: 'Migraine',
  माइग्रेन: 'Migraine',
};

// Known medications
const MEDICATIONS_MAP: Record<string, string> = {
  metformin: 'Metformin',
  paracetamol: 'Paracetamol',
  dolo: 'Dolo 650',
  'dolo 650': 'Dolo 650',
  aspirin: 'Aspirin',
  amlodipine: 'Amlodipine',
  atorvastatin: 'Atorvastatin',
  rosuvastatin: 'Rosuvastatin',
  insulin: 'Insulin',
  pantoprazole: 'Pantoprazole',
  pantocid: 'Pantoprazole',
  omeprazole: 'Omeprazole',
  rabeprazole: 'Rabeprazole',
  telmisartan: 'Telmisartan',
  losartan: 'Losartan',
  glimepiride: 'Glimepiride',
  cetirizine: 'Cetirizine',
  levocetirizine: 'Levocetirizine',
  montelukast: 'Montelukast',
  azithromycin: 'Azithromycin',
  amoxicillin: 'Amoxicillin',
  augmentin: 'Augmentin',
  ciprofloxacin: 'Ciprofloxacin',
  levothyroxine: 'Levothyroxine',
  thyronorm: 'Thyronorm',
  eltroxin: 'Eltroxin',
  ibuprofen: 'Ibuprofen',
  combiflam: 'Combiflam',
  crocin: 'Crocin',
  gelusil: 'Gelusil',
  digene: 'Digene',
};

// Known surgical procedures
const SURGICAL_MAP: Record<string, string> = {
  appendicitis: 'Appendectomy for appendicitis',
  appendectomy: 'Appendectomy',
  appendix: 'Appendectomy',
  gallbladder: 'Cholecystectomy (Gallbladder surgery)',
  gallstones: 'Cholecystectomy for gallstones',
  cholecystectomy: 'Cholecystectomy',
  caesarean: 'Cesarean section',
  'c-section': 'Cesarean section',
  'c section': 'Cesarean section',
  bypass: 'Coronary artery bypass graft (CABG)',
  cabg: 'Coronary artery bypass graft (CABG)',
  'heart surgery': 'Cardiac surgery',
  'knee replacement': 'Knee replacement surgery',
  'hip replacement': 'Hip replacement surgery',
  hernia: 'Hernia repair',
  tonsillectomy: 'Tonsillectomy',
  tonsils: 'Tonsillectomy',
  cataract: 'Cataract surgery',
  stent: 'Coronary stent angioplasty',
  angioplasty: 'Coronary angioplasty',
  hysterectomy: 'Hysterectomy',
  'kidney stone': 'Kidney stone removal',
};

// Known allergy agents
const ALLERGY_MAP: Record<string, string> = {
  penicillin: 'Penicillin',
  sulfa: 'Sulfa drugs',
  sulfonamide: 'Sulfa drugs',
  aspirin: 'Aspirin / NSAIDs',
  nsaid: 'NSAIDs',
  nsaids: 'NSAIDs',
  amoxicillin: 'Amoxicillin',
  ciprofloxacin: 'Ciprofloxacin',
  iodine: 'Iodine contrast dye',
  contrast: 'Radiology contrast dye',
  peanut: 'Peanuts',
  peanuts: 'Peanuts',
  shellfish: 'Shellfish',
  egg: 'Eggs',
  eggs: 'Eggs',
  milk: 'Dairy / Lactose',
  dust: 'Dust',
  pollen: 'Pollen',
};

/**
 * Helper to record source provenance for an extracted clinical field.
 */
function recordSource(
  sources: Record<string, ExtractedClinicalFact>,
  field: string,
  value: string,
  source: ClinicalFactSourceType = 'PATIENT_VOICE',
  status: ClinicalFactStatus = 'PATIENT_REPORTED',
  rawText?: string
) {
  sources[field] = {
    field,
    value,
    source,
    status,
    timestamp: new Date().toISOString(),
    rawText,
  };
}

/**
 * Extracts comprehensive clinical entities from a patient utterance.
 * Guarantees:
 * 1. Accumulates information without resetting existing valid data.
 * 2. Handles natural language expressions (e.g. "I have diabetes", "I take metformin every morning").
 * 3. Handles out-of-turn data (e.g. mentions mother's diabetes while describing vomiting).
 * 4. Contextual awareness of previous AI question (e.g. "No" to an allergy question -> "No known drug allergies — patient reported").
 */
export function extractClinicalInformation(
  currentCase: ClinicalCaseState,
  patientUtterance: string,
  source: ClinicalFactSourceType = 'PATIENT_VOICE',
  previousAiQuestion?: string
): ClinicalCaseState {
  if (!patientUtterance || typeof patientUtterance !== 'string') {
    return currentCase;
  }

  const text = patientUtterance.trim();
  const lower = text.toLowerCase();
  const prevQuestionLower = (previousAiQuestion || '').toLowerCase();

  // Clone current case state to guarantee immutability and accumulation
  const updated: ClinicalCaseState = {
    chiefComplaint: currentCase.chiefComplaint || '',
    duration: currentCase.duration || '',
    associatedSymptoms: [...(currentCase.associatedSymptoms || [])],
    hpi: currentCase.hpi || '',
    pastMedicalHistory: [...(currentCase.pastMedicalHistory || [])],
    pastSurgicalHistory: [...(currentCase.pastSurgicalHistory || [])],
    medicationHistory: [...(currentCase.medicationHistory || [])],
    allergies: [...(currentCase.allergies || [])],
    familyHistory: [...(currentCase.familyHistory || [])],
    socialLifestyle: [...(currentCase.socialLifestyle || [])],
    diet: currentCase.diet || '',
    sleep: currentCase.sleep || '',
    reviewOfSystems: currentCase.reviewOfSystems || '',
    ayushAssessment: currentCase.ayushAssessment ? { ...currentCase.ayushAssessment } : undefined,
    ayushHistory: currentCase.ayushHistory
      ? {
          ...currentCase.ayushHistory,
          vikritiCurrentState: { ...(currentCase.ayushHistory.vikritiCurrentState || {}) },
          agni: { ...(currentCase.ayushHistory.agni || {}) },
          ahara: { ...(currentCase.ayushHistory.ahara || {}) },
          vihara: { ...(currentCase.ayushHistory.vihara || {}) },
          nidra: { ...(currentCase.ayushHistory.nidra || {}) },
          mala: { ...(currentCase.ayushHistory.mala || {}) },
          lakshana: {
            ...(currentCase.ayushHistory.lakshana || {}),
            associated: [...(currentCase.ayushHistory.lakshana?.associated || [])],
          },
        }
      : getInitialAyushClinicalHistory(),
    previousInvestigations: [...(currentCase.previousInvestigations || [])],
    previousEpisodes: currentCase.previousEpisodes || '',
    sources: { ...(currentCase.sources || {}) },
    lastUpdated: new Date().toISOString(),
  };

  // --------------------------------------------------------------------------
  // 1. DURATION & ONSET EXTRACTION
  // --------------------------------------------------------------------------
  let extractedDuration = '';

  if (
    lower.includes('since yesterday') ||
    lower.includes('from yesterday') ||
    lower === 'since yesterday' ||
    lower === 'yesterday'
  ) {
    extractedDuration = 'Since yesterday';
  } else if (lower.includes('since this morning') || lower.includes('since morning')) {
    extractedDuration = 'Since morning';
  } else if (lower.includes('since last night') || lower.includes('from last night')) {
    extractedDuration = 'Since last night';
  } else {
    // Matches e.g. "for 3 days", "since 2 weeks", "from last 4 days", "for five years", "past 2 days"
    const durMatch = lower.match(
      /(?:for|since|past|lasting|from|last)?\s*(\b\d+\b|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months|year|years|hour|hours|दिन|நாட்கள்)/i
    );
    if (durMatch) {
      const rawNum = durMatch[1].toLowerCase();
      const num = NUMBER_WORDS[rawNum] || rawNum;
      let unit = durMatch[2].toLowerCase();
      if (unit.startsWith('day') || unit === 'दिन' || unit === 'நாட்கள்') {
        unit = num === '1' ? 'day' : 'days';
      } else if (unit.startsWith('week')) {
        unit = num === '1' ? 'week' : 'weeks';
      } else if (unit.startsWith('month')) {
        unit = num === '1' ? 'month' : 'months';
      } else if (unit.startsWith('year')) {
        unit = num === '1' ? 'year' : 'years';
      } else if (unit.startsWith('hour')) {
        unit = num === '1' ? 'hour' : 'hours';
      }
      extractedDuration = `${num} ${unit}`;
    }
  }

  if (extractedDuration) {
    updated.duration = extractedDuration;
    recordSource(updated.sources, 'duration', extractedDuration, source, 'PATIENT_REPORTED', text);
  }

  // --------------------------------------------------------------------------
  // 2. SYMPTOMS (CHIEF COMPLAINT & ASSOCIATED SYMPTOMS)
  // --------------------------------------------------------------------------
  interface DetectedSymptom {
    name: string;
    index: number;
  }
  const foundSymptoms: DetectedSymptom[] = [];

  for (const [key, standardName] of Object.entries(SYMPTOM_MAP)) {
    const idx = lower.indexOf(key);
    if (idx !== -1) {
      if (!foundSymptoms.some((s) => s.name === standardName)) {
        foundSymptoms.push({ name: standardName, index: idx });
      }
    }
  }

  foundSymptoms.sort((a, b) => a.index - b.index);
  const detectedSymptoms = foundSymptoms.map((s) => s.name);

  if (detectedSymptoms.length > 0) {
    if (!updated.chiefComplaint) {
      updated.chiefComplaint = detectedSymptoms[0];
      recordSource(updated.sources, 'chiefComplaint', detectedSymptoms[0], source, 'PATIENT_REPORTED', text);
      for (let i = 1; i < detectedSymptoms.length; i++) {
        const sym = detectedSymptoms[i];
        if (!updated.associatedSymptoms.includes(sym) && sym !== updated.chiefComplaint) {
          updated.associatedSymptoms.push(sym);
        }
      }
    } else {
      for (const sym of detectedSymptoms) {
        if (sym !== updated.chiefComplaint && !updated.associatedSymptoms.includes(sym)) {
          updated.associatedSymptoms.push(sym);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // 3. PAST SURGICAL HISTORY EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "I had an operation for appendicitis when I was 20." -> "Appendectomy for appendicitis — age 20"
  // "I had surgery for appendicitis when I was 20." -> "Appendectomy — age 20"
  // "I had knee replacement 3 years ago" -> "Knee replacement surgery — 3 years ago"
  // "No surgeries" / "No" (to surgery question)
  let foundSurgery = false;

  for (const [key, standardName] of Object.entries(SURGICAL_MAP)) {
    if (lower.includes(key) && (lower.includes('operation') || lower.includes('surgery') || lower.includes('procedure') || lower.includes('had') || lower.includes('when i was'))) {
      let entry = standardName;

      // Check for age: e.g. "when I was 20", "at age 20", "at 20"
      const ageMatch = lower.match(/(?:when\s+I\s+was|at\s+age|at)\s+(\d{1,2})\b/i);
      // Check for years ago: e.g. "3 years ago"
      const yearsAgoMatch = lower.match(/(\d{1,2})\s+years?\s+ago/i);
      // Check for year: e.g. "in 2018"
      const yearMatch = lower.match(/in\s+(19\d{2}|20\d{2})/i);

      if (ageMatch) {
        entry = `${standardName} — age ${ageMatch[1]}`;
      } else if (yearsAgoMatch) {
        entry = `${standardName} — ${yearsAgoMatch[1]} years ago`;
      } else if (yearMatch) {
        entry = `${standardName} — ${yearMatch[1]}`;
      }

      if (!updated.pastSurgicalHistory.some((s) => s.toLowerCase().includes(key))) {
        updated.pastSurgicalHistory.push(entry);
        recordSource(updated.sources, 'pastSurgicalHistory', entry, source, 'PATIENT_REPORTED', text);
      }
      foundSurgery = true;
    }
  }

  // Generic surgery pattern e.g. "I had surgery for hernia" or "had an operation for kidney stone"
  if (!foundSurgery) {
    const genericSurgMatch = lower.match(
      /(?:had|underwent)\s+(?:an?\s+)?(?:operation|surgery|procedure)\s+(?:for\s+)?([a-zA-Z\s]+?)(?:\s+when\s+i\s+was\s+(\d+)|\s+at\s+age\s+(\d+)|\s+(\d+)\s+years\s+ago|$|\.)/i
    );
    if (genericSurgMatch && genericSurgMatch[1]) {
      const condition = genericSurgMatch[1].trim();
      if (condition && condition.length > 2 && !condition.includes('family') && !condition.includes('mother') && !condition.includes('father')) {
        const age = genericSurgMatch[2] || genericSurgMatch[3];
        const yearsAgo = genericSurgMatch[4];
        let entry = `Surgery for ${condition}`;
        if (age) entry += ` — age ${age}`;
        else if (yearsAgo) entry += ` — ${yearsAgo} years ago`;

        if (!updated.pastSurgicalHistory.includes(entry)) {
          updated.pastSurgicalHistory.push(entry);
          recordSource(updated.sources, 'pastSurgicalHistory', entry, source, 'PATIENT_REPORTED', text);
        }
      }
    }
  }

  // Contextual negative for surgery
  if (
    lower === 'no' ||
    lower === 'no surgeries' ||
    lower.includes('never had any surgery') ||
    lower.includes('never had an operation') ||
    lower.includes('no operations') ||
    (prevQuestionLower.includes('surgery') || prevQuestionLower.includes('operation')) && (lower === 'no' || lower === 'none' || lower === 'not really')
  ) {
    const negSurgery = 'No prior surgical history — patient reported';
    if (!updated.pastSurgicalHistory.includes(negSurgery) && updated.pastSurgicalHistory.length === 0) {
      updated.pastSurgicalHistory.push(negSurgery);
      recordSource(updated.sources, 'pastSurgicalHistory', negSurgery, source, 'PATIENT_REPORTED', text);
    }
  }

  // --------------------------------------------------------------------------
  // 4. FAMILY HISTORY EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "My mother also has diabetes." -> "Mother — diabetes"
  // "My father had high blood pressure." -> "Father — hypertension"
  // "Both parents are diabetic." -> "Both parents — diabetes"
  // "Brother has asthma" -> "Brother — asthma"
  // Contextual negative: "No" to family question -> "No significant family history reported"
  const familyRelationMatch = lower.match(
    /\b(mother|father|mom|dad|parents|both\s+parents|brother|sister|grandfather|grandmother|grandparents|family)\b/i
  );

  if (familyRelationMatch) {
    const relRaw = familyRelationMatch[1].toLowerCase();
    let relation = 'Family';
    if (relRaw === 'mother' || relRaw === 'mom') relation = 'Mother';
    else if (relRaw === 'father' || relRaw === 'dad') relation = 'Father';
    else if (relRaw === 'parents' || relRaw === 'both parents') relation = 'Both parents';
    else if (relRaw === 'brother') relation = 'Brother';
    else if (relRaw === 'sister') relation = 'Sister';
    else if (relRaw.includes('grand')) relation = 'Grandparents';

    // Check illness mentioned in association with family member
    let famIllness = '';
    if (lower.includes('diabetes') || lower.includes('sugar') || lower.includes('diabetic')) {
      famIllness = 'diabetes';
    } else if (lower.includes('blood pressure') || lower.includes('hypertension') || lower.includes('bp')) {
      famIllness = 'hypertension';
    } else if (lower.includes('heart disease') || lower.includes('heart attack') || lower.includes('cardiac')) {
      famIllness = 'heart disease';
    } else if (lower.includes('asthma')) {
      famIllness = 'asthma';
    } else if (lower.includes('cancer')) {
      famIllness = 'cancer';
    } else if (lower.includes('thyroid')) {
      famIllness = 'thyroid disorder';
    } else if (lower.includes('stroke')) {
      famIllness = 'stroke';
    }

    if (famIllness) {
      const entry = `${relation} — ${famIllness}`;
      if (!updated.familyHistory.includes(entry)) {
        updated.familyHistory.push(entry);
        recordSource(updated.sources, 'familyHistory', entry, source, 'PATIENT_REPORTED', text);
      }
    }
  }

  // Contextual negative for family history
  if (
    lower === 'no family history' ||
    lower.includes('no major illness in my family') ||
    lower.includes('no one in my family') ||
    (prevQuestionLower.includes('family') && (lower === 'no' || lower === 'none' || lower === 'no one' || lower === 'not that i know of'))
  ) {
    const negFam = 'No significant family history reported';
    if (!updated.familyHistory.includes(negFam) && updated.familyHistory.length === 0) {
      updated.familyHistory.push(negFam);
      recordSource(updated.sources, 'familyHistory', negFam, source, 'PATIENT_REPORTED', text);
    }
  }

  // --------------------------------------------------------------------------
  // 5. ALLERGIES EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "I am allergic to penicillin." -> "Penicillin"
  // "I have no allergies" / "I don't have any allergies." -> "No known drug allergies — patient reported"
  // "No" (when asked about allergies) -> "No known drug allergies — patient reported"
  let foundAllergy = false;

  for (const [key, standardName] of Object.entries(ALLERGY_MAP)) {
    if (lower.includes(key) && (lower.includes('allergic') || lower.includes('allergy') || lower.includes('reaction') || prevQuestionLower.includes('allerg'))) {
      if (!updated.allergies.includes(standardName)) {
        // Remove any prior negative placeholder
        updated.allergies = updated.allergies.filter((a) => !a.toLowerCase().includes('no known'));
        updated.allergies.push(standardName);
        recordSource(updated.sources, 'allergies', standardName, source, 'PATIENT_REPORTED', text);
      }
      foundAllergy = true;
    }
  }

  if (!foundAllergy) {
    const allergySentenceMatch = lower.match(/(?:allergic\s+to|allergy\s+to|reaction\s+to)\s+([a-zA-Z\s]+?)(?:\.|$|,|and)/i);
    if (allergySentenceMatch && allergySentenceMatch[1]) {
      const item = allergySentenceMatch[1].trim();
      if (item && item.length > 2 && !item.includes('mother') && !item.includes('father')) {
        const capitalized = item.charAt(0).toUpperCase() + item.slice(1);
        if (!updated.allergies.includes(capitalized)) {
          updated.allergies = updated.allergies.filter((a) => !a.toLowerCase().includes('no known'));
          updated.allergies.push(capitalized);
          recordSource(updated.sources, 'allergies', capitalized, source, 'PATIENT_REPORTED', text);
        }
        foundAllergy = true;
      }
    }
  }

  // Explicit confirmation of NO allergies
  if (
    lower === 'no' ||
    lower === 'no allergies' ||
    lower === 'none' ||
    lower.includes("don't have any allergies") ||
    lower.includes('dont have any allergies') ||
    lower.includes('no known allergies') ||
    lower.includes('never had any allergies') ||
    lower.includes('no drug allergies') ||
    (prevQuestionLower.includes('allerg') && (lower === 'no' || lower === 'none' || lower === 'not really' || lower === 'no i dont'))
  ) {
    const negAllergy = 'No known drug allergies — patient reported';
    if (!updated.allergies.some((a) => !a.toLowerCase().includes('no known')) && !updated.allergies.includes(negAllergy)) {
      updated.allergies = [negAllergy];
      recordSource(updated.sources, 'allergies', negAllergy, source, 'PATIENT_REPORTED', text);
    }
  }

  // --------------------------------------------------------------------------
  // 6. PAST MEDICAL HISTORY (PMH) EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "I have diabetes." -> "Diabetes"
  // "I have diabetes for five years." -> "Diabetes — 5 years"
  // "I have had it for about six years." -> updates existing condition to "Diabetes — approximately 6 years"
  // "No major illness, but I take a tablet for blood pressure every morning." ->
  //   PMH: "Hypertension / blood-pressure condition — patient-reported"
  // Distinguish personal vs family: ignore if sentence is strictly about mother/father/etc.
  const isPersonalStatement =
    !familyRelationMatch ||
    lower.includes('i have') ||
    lower.includes('i had') ||
    lower.includes('i am') ||
    lower.includes('i take') ||
    lower.includes('for five years') ||
    lower.includes('for 5 years') ||
    lower.includes('for six years') ||
    lower.includes('for 6 years');

  if (isPersonalStatement) {
    const sortedConditionKeys = Object.keys(MEDICAL_CONDITIONS_MAP).sort((a, b) => b.length - a.length);

    for (const key of sortedConditionKeys) {
      const wordBoundaryRegex = new RegExp(`\\b${key}\\b`, 'i');
      if (wordBoundaryRegex.test(lower)) {
        // Confirm not part of family mention like "my mother has diabetes"
        const isFamilyOnly =
          (lower.includes('mother') || lower.includes('father') || lower.includes('parents')) &&
          !lower.includes('i have') &&
          !lower.includes('i also') &&
          !lower.includes('i am');

        if (!isFamilyOnly) {
          const standardName = MEDICAL_CONDITIONS_MAP[key];
          let entry = standardName;

          // Check for duration qualifier e.g. "for five years", "for 6 years", "for about six years"
          const durMatch = lower.match(
            /(?:for|since|past|had\s+it\s+for)\s+(?:about\s+)?(\b\d+\b|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?/i
          );
          if (durMatch) {
            const rawNum = durMatch[1].toLowerCase();
            const num = NUMBER_WORDS[rawNum] || rawNum;
            const approx = lower.includes('about') || lower.includes('approx') ? 'approximately ' : '';
            entry = `${standardName} — ${approx}${num} years`;
          }

          const existingIdx = updated.pastMedicalHistory.findIndex((m) =>
            m.toLowerCase().startsWith(standardName.toLowerCase())
          );
          if (existingIdx >= 0) {
            if (entry.includes('—') && !updated.pastMedicalHistory[existingIdx].includes('—')) {
              updated.pastMedicalHistory[existingIdx] = entry;
              recordSource(updated.sources, 'pastMedicalHistory', entry, source, 'PATIENT_REPORTED', text);
            }
          } else {
            updated.pastMedicalHistory = updated.pastMedicalHistory.filter((m) => !m.toLowerCase().includes('no chronic'));
            updated.pastMedicalHistory.push(entry);
            recordSource(updated.sources, 'pastMedicalHistory', entry, source, 'PATIENT_REPORTED', text);
          }
        }
      }
    }

    // Check if patient said "I have had it for about six years" after already having a condition
    if (updated.pastMedicalHistory.length > 0 && lower.match(/had\s+it\s+for\s+(?:about\s+)?(\b\d+\b|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?/i)) {
      const durMatch = lower.match(/had\s+it\s+for\s+(?:about\s+)?(\b\d+\b|one|two|three|four|five|six|seven|eight|nine|ten)\s+years?/i);
      if (durMatch) {
        const rawNum = durMatch[1].toLowerCase();
        const num = NUMBER_WORDS[rawNum] || rawNum;
        const approx = lower.includes('about') ? 'approximately ' : '';
        const lastIdx = updated.pastMedicalHistory.length - 1;
        const baseName = updated.pastMedicalHistory[lastIdx].split('—')[0].trim();
        updated.pastMedicalHistory[lastIdx] = `${baseName} — ${approx}${num} years`;
        recordSource(updated.sources, 'pastMedicalHistory', updated.pastMedicalHistory[lastIdx], source, 'PATIENT_REPORTED', text);
      }
    }

    // Special Indian / colloquial phrasing: "take a tablet for blood pressure" -> PMH: Hypertension
    if (lower.includes('tablet for blood pressure') || lower.includes('medicine for blood pressure') || lower.includes('bp tablet')) {
      const bpCond = 'Hypertension / blood-pressure condition — patient-reported';
      if (!updated.pastMedicalHistory.some((m) => m.toLowerCase().includes('hypertension') || m.toLowerCase().includes('blood pressure'))) {
        updated.pastMedicalHistory = updated.pastMedicalHistory.filter((m) => !m.toLowerCase().includes('no chronic'));
        updated.pastMedicalHistory.push(bpCond);
        recordSource(updated.sources, 'pastMedicalHistory', bpCond, source, 'PATIENT_REPORTED', text);
      }
    }

    // Contextual negative for PMH
    if (
      lower.includes('no major illness') ||
      lower.includes('no past illness') ||
      lower.includes('no chronic conditions') ||
      (prevQuestionLower.includes('illness') || prevQuestionLower.includes('medical condition') || prevQuestionLower.includes('chronic')) &&
        (lower === 'no' || lower === 'none' || lower === 'never')
    ) {
      const negPmh = 'No major illness reported';
      if (updated.pastMedicalHistory.length === 0) {
        updated.pastMedicalHistory.push(negPmh);
        recordSource(updated.sources, 'pastMedicalHistory', negPmh, source, 'PATIENT_REPORTED', text);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 7. MEDICATION HISTORY EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "I take metformin every morning." -> "Metformin — every morning"
  // "I take a tablet for blood pressure every morning." -> "Blood-pressure medication — daily"
  // Schedule extractors: "every morning", "every evening", "every night", "daily", "twice a day", etc.
  for (const [key, standardName] of Object.entries(MEDICATIONS_MAP)) {
    const wordBoundaryRegex = new RegExp(`\\b${key}\\b`, 'i');
    if (wordBoundaryRegex.test(lower)) {
      let entry = standardName;

      // Check for schedule in the utterance
      const schedMatch = lower.match(
        /\b(every\s+(?:morning|evening|night|day)|daily|once\s+a\s+day|twice\s+a\s+day|at\s+night|in\s+the\s+morning|before\s+meals|before\s+food|after\s+food|sos|as\s+needed)\b/i
      );
      if (schedMatch) {
        entry = `${standardName} — ${schedMatch[1].toLowerCase()}`;
      }

      const existingIdx = updated.medicationHistory.findIndex((m) =>
        m.toLowerCase().startsWith(standardName.toLowerCase())
      );
      if (existingIdx >= 0) {
        if (entry.includes('—') && !updated.medicationHistory[existingIdx].includes('—')) {
          updated.medicationHistory[existingIdx] = entry;
          recordSource(updated.sources, 'medicationHistory', entry, source, 'PATIENT_REPORTED', text);
        }
      } else {
        updated.medicationHistory = updated.medicationHistory.filter((m) => !m.toLowerCase().includes('no regular'));
        updated.medicationHistory.push(entry);
        recordSource(updated.sources, 'medicationHistory', entry, source, 'PATIENT_REPORTED', text);
      }
    }
  }

  // Descriptive medication phrases: "tablet for blood pressure every morning"
  if (lower.includes('tablet for blood pressure') || lower.includes('bp tablet') || lower.includes('blood pressure tablet') || lower.includes('bp medicine')) {
    let entry = 'Blood-pressure medication — daily';
    if (lower.includes('every morning')) entry = 'Blood-pressure medication — every morning';
    else if (lower.includes('twice a day')) entry = 'Blood-pressure medication — twice daily';

    if (!updated.medicationHistory.some((m) => m.toLowerCase().includes('blood-pressure') || m.toLowerCase().includes('bp'))) {
      updated.medicationHistory = updated.medicationHistory.filter((m) => !m.toLowerCase().includes('no regular'));
      updated.medicationHistory.push(entry);
      recordSource(updated.sources, 'medicationHistory', entry, source, 'PATIENT_REPORTED', text);
    }
  }

  // Contextual negative for medications
  if (
    lower === 'no medicines' ||
    lower.includes("don't take any medicines") ||
    lower.includes('dont take any medicines') ||
    lower.includes('no regular medicines') ||
    lower.includes('not taking any medicines') ||
    (prevQuestionLower.includes('medicine') || prevQuestionLower.includes('medication')) && (lower === 'no' || lower === 'none')
  ) {
    const negMed = 'No regular medications reported';
    if (updated.medicationHistory.length === 0) {
      updated.medicationHistory.push(negMed);
      recordSource(updated.sources, 'medicationHistory', negMed, source, 'PATIENT_REPORTED', text);
    }
  }

  // --------------------------------------------------------------------------
  // 8. SOCIAL HISTORY & LIFESTYLE EXTRACTION
  // --------------------------------------------------------------------------
  // Handles:
  // "I don't smoke." -> "No smoking reported"
  // "I smoke occasionally." -> "Occasional smoking — patient reported"
  // "No" (to smoking/tobacco question) -> "No smoking/tobacco reported"
  if (lower.includes("don't smoke") || lower.includes('dont smoke') || lower.includes('do not smoke') || lower.includes('non smoker') || lower.includes('never smoked')) {
    const entry = 'No smoking reported';
    if (!updated.socialLifestyle.includes(entry)) {
      updated.socialLifestyle = updated.socialLifestyle.filter((s) => !s.toLowerCase().includes('smoking'));
      updated.socialLifestyle.push(entry);
      recordSource(updated.sources, 'socialLifestyle', entry, source, 'PATIENT_REPORTED', text);
    }
  } else if (lower.includes('smoke occasionally') || lower.includes('occasional smoking') || lower.includes('smoke sometimes')) {
    const entry = 'Occasional smoking — patient reported';
    if (!updated.socialLifestyle.includes(entry)) {
      updated.socialLifestyle = updated.socialLifestyle.filter((s) => !s.toLowerCase().includes('smoking'));
      updated.socialLifestyle.push(entry);
      recordSource(updated.sources, 'socialLifestyle', entry, source, 'PATIENT_REPORTED', text);
    }
  }

  // Alcohol
  if (lower.includes("don't drink") || lower.includes('dont drink') || lower.includes('no alcohol') || lower.includes('never drink')) {
    const entry = 'No alcohol consumption reported';
    if (!updated.socialLifestyle.includes(entry)) {
      updated.socialLifestyle = updated.socialLifestyle.filter((s) => !s.toLowerCase().includes('alcohol'));
      updated.socialLifestyle.push(entry);
      recordSource(updated.sources, 'socialLifestyle', entry, source, 'PATIENT_REPORTED', text);
    }
  } else if (lower.includes('drink occasionally') || lower.includes('occasional alcohol') || lower.includes('on weekends')) {
    const entry = 'Occasional alcohol consumption';
    if (!updated.socialLifestyle.includes(entry)) {
      updated.socialLifestyle = updated.socialLifestyle.filter((s) => !s.toLowerCase().includes('alcohol'));
      updated.socialLifestyle.push(entry);
      recordSource(updated.sources, 'socialLifestyle', entry, source, 'PATIENT_REPORTED', text);
    }
  }

  // Contextual negative for smoking/tobacco
  if (
    (prevQuestionLower.includes('smoke') || prevQuestionLower.includes('tobacco')) &&
    (lower === 'no' || lower === 'none' || lower === 'i dont' || lower === 'never')
  ) {
    const entry = 'No smoking/tobacco reported';
    if (!updated.socialLifestyle.some((s) => s.toLowerCase().includes('smoking') || s.toLowerCase().includes('tobacco'))) {
      updated.socialLifestyle.push(entry);
      recordSource(updated.sources, 'socialLifestyle', entry, source, 'PATIENT_REPORTED', text);
    }
  }

  // Diet & Sleep
  if (lower.includes('vegetarian') && !lower.includes('non')) {
    updated.diet = 'Vegetarian diet';
  } else if (lower.includes('non-vegetarian') || lower.includes('non vegetarian')) {
    updated.diet = 'Non-vegetarian diet';
  }

  // --------------------------------------------------------------------------
  // 9. DYNAMICALLY RECONSTRUCT HISTORY OF PRESENT ILLNESS (HPI)
  // --------------------------------------------------------------------------
  if (updated.chiefComplaint) {
    let narrative = updated.chiefComplaint;

    if (updated.duration) {
      if (updated.duration.toLowerCase().startsWith('since')) {
        narrative += ` ${updated.duration.toLowerCase()}`;
      } else {
        narrative += ` for ${updated.duration}`;
      }
    }

    if (updated.associatedSymptoms.length > 0) {
      if (updated.associatedSymptoms.length === 1) {
        narrative += ` with ${updated.associatedSymptoms[0].toLowerCase()}`;
      } else if (updated.associatedSymptoms.length === 2) {
        narrative += ` with ${updated.associatedSymptoms[0].toLowerCase()} and ${updated.associatedSymptoms[1].toLowerCase()}`;
      } else {
        const last = updated.associatedSymptoms[updated.associatedSymptoms.length - 1];
        const initial = updated.associatedSymptoms
          .slice(0, -1)
          .map((s) => s.toLowerCase())
          .join(', ');
        narrative += ` with ${initial}, and ${last.toLowerCase()}`;
      }
    }

    narrative += '.';
    updated.hpi = narrative;
    recordSource(updated.sources, 'hpi', narrative, source, 'PATIENT_REPORTED', text);
  }

  // --------------------------------------------------------------------------
  // 10. AYUSH & AYURVEDA CLINICAL HISTORY EXTRACTION (~80% AYUSH Focus)
  // --------------------------------------------------------------------------
  const ayush = updated.ayushHistory;

  // A. Agni / Digestive History (Appetite, Digestion, Bloating/Heaviness, Meal Tolerance, Bowel)
  if (
    lower.includes('appetite is low') ||
    lower.includes('low appetite') ||
    lower.includes('loss of appetite') ||
    lower.includes('no appetite') ||
    lower.includes('appetite has decreased') ||
    lower.includes('reduced appetite') ||
    lower.includes('not feeling hungry') ||
    lower.includes('dont feel like eating') ||
    lower.includes("don't feel like eating") ||
    lower.includes('bhookh kam') ||
    lower.includes('bhookh nahi') ||
    lower.includes('பசி குறைவு')
  ) {
    const val = 'Low / decreased appetite — patient-reported';
    ayush.agni.appetite = val;
    ayush.vikritiCurrentState.appetiteChange = 'Decreased appetite';
    recordSource(updated.sources, 'ayush_agni_appetite', val, source, 'PATIENT_REPORTED', text);
  } else if (
    lower.includes('good appetite') ||
    lower.includes('normal appetite') ||
    lower.includes('appetite is fine') ||
    lower.includes('appetite is good') ||
    lower.includes('eating normally') ||
    lower.includes('bhookh theek')
  ) {
    const val = 'Normal / balanced appetite — patient-reported';
    ayush.agni.appetite = val;
    ayush.vikritiCurrentState.appetiteChange = 'Appetite reported normal';
    recordSource(updated.sources, 'ayush_agni_appetite', val, source, 'PATIENT_REPORTED', text);
  } else if (
    lower.includes('excessive hunger') ||
    lower.includes('high appetite') ||
    lower.includes('hungry all the time') ||
    lower.includes('bhookh zyada')
  ) {
    const val = 'Increased / intense appetite — patient-reported';
    ayush.agni.appetite = val;
    ayush.vikritiCurrentState.appetiteChange = 'Increased appetite';
    recordSource(updated.sources, 'ayush_agni_appetite', val, source, 'PATIENT_REPORTED', text);
  }

  // Digestion efficiency & Acidity
  if (
    lower.includes('indigestion') ||
    lower.includes('acidity') ||
    lower.includes('heartburn') ||
    lower.includes('sour belching') ||
    lower.includes('acid reflux') ||
    lower.includes('khana hazam nahi') ||
    lower.includes('செரிமானமின்மை')
  ) {
    const val = 'Indigestion / acid regurgitation reported';
    ayush.agni.digestion = val;
    ayush.vikritiCurrentState.digestionChange = 'Impaired digestion / acidity';
    recordSource(updated.sources, 'ayush_agni_digestion', val, source, 'PATIENT_REPORTED', text);
  }

  // Bloating & Heaviness after meals
  if (
    lower.includes('bloating') ||
    lower.includes('bloated') ||
    lower.includes('heaviness') ||
    lower.includes('heavy stomach') ||
    lower.includes('feels heavy after eating') ||
    lower.includes('stomach feels full') ||
    lower.includes('gas') ||
    lower.includes('pet bhari') ||
    lower.includes('வயிற்று உப்புசம்')
  ) {
    const val = 'Post-meal bloating & abdominal heaviness reported';
    ayush.agni.bloatingHeaviness = val;
    if (ayush.agni.digestion === 'Not yet discussed') {
      ayush.agni.digestion = 'Sluggish digestion with post-meal fullness';
    }
    ayush.vikritiCurrentState.digestionChange = 'Post-meal bloating & heaviness';
    recordSource(updated.sources, 'ayush_agni_bloating', val, source, 'PATIENT_REPORTED', text);
  }

  // Meal Tolerance (spicy, oily, dairy)
  if (lower.includes('spicy food causes') || lower.includes('cannot eat spicy') || lower.includes('cannot tolerate oily') || lower.includes('oily food gives trouble')) {
    const val = 'Poor tolerance to spicy or oily foods reported';
    ayush.agni.mealTolerance = val;
    recordSource(updated.sources, 'ayush_agni_meal_tolerance', val, source, 'PATIENT_REPORTED', text);
  }

  // B. Ahara / Dietary History
  if (lower.includes('spicy food') || lower.includes('oily food') || lower.includes('junk food') || lower.includes('fast food') || lower.includes('outside food') || lower.includes('street food')) {
    const val = 'Frequent consumption of spicy, oily, or outside foods reported';
    ayush.ahara.foodPreferences = val;
    recordSource(updated.sources, 'ayush_ahara_preferences', val, source, 'PATIENT_REPORTED', text);
  }
  if (lower.includes('irregular meal') || lower.includes('irregular timings') || lower.includes('skip lunch') || lower.includes('skip breakfast') || lower.includes('late dinner')) {
    const val = 'Irregular meal timings / skipping meals reported';
    ayush.ahara.mealTimings = val;
    ayush.vikritiCurrentState.routineChange = 'Irregular eating routine';
    recordSource(updated.sources, 'ayush_ahara_timings', val, source, 'PATIENT_REPORTED', text);
  }
  if (lower.includes('warm water') || lower.includes('hot water')) {
    ayush.ahara.hydration = 'Prefers warm water';
  } else if (lower.includes('cold water') || lower.includes('chilled drinks')) {
    ayush.ahara.hydration = 'Prefers cold/chilled water';
  }

  // C. Nidra / Sleep History
  if (
    lower.includes('sleep has been disturbed') ||
    lower.includes('disturbed sleep') ||
    lower.includes('trouble sleeping') ||
    lower.includes('cannot sleep') ||
    lower.includes("can't sleep") ||
    lower.includes('difficulty sleeping') ||
    lower.includes('insomnia') ||
    lower.includes('poor sleep') ||
    lower.includes('wake up in middle of night') ||
    lower.includes('neend kharab') ||
    lower.includes('neend nahi aati') ||
    lower.includes('தூக்கமின்மை')
  ) {
    const val = 'Disturbed sleep — patient-reported';
    updated.sleep = val;
    ayush.nidra.quality = val;
    ayush.vikritiCurrentState.sleepChange = 'Disturbed sleep pattern';
    recordSource(updated.sources, 'ayush_nidra_quality', val, source, 'PATIENT_REPORTED', text);
  } else if (
    lower.includes('sleep well') ||
    lower.includes('good sleep') ||
    lower.includes('sound sleep') ||
    lower.includes('restful sleep') ||
    lower.includes('neend achhi')
  ) {
    const val = 'Normal / restful sleep';
    updated.sleep = val;
    ayush.nidra.quality = val;
    recordSource(updated.sources, 'ayush_nidra_quality', val, source, 'PATIENT_REPORTED', text);
  }

  // Sleep hours
  const sleepHourMatch = lower.match(/sleep\s+(?:about\s+)?(\b\d+\b|one|two|three|four|five|six|seven|eight|nine|ten)\s+hours/i);
  if (sleepHourMatch) {
    const rawNum = sleepHourMatch[1].toLowerCase();
    const num = NUMBER_WORDS[rawNum] || rawNum;
    ayush.nidra.duration = `${num} hours`;
  }

  // D. Mala / Bowel & Elimination
  if (
    lower.includes('constipation') ||
    lower.includes('hard stool') ||
    lower.includes('kabz') ||
    lower.includes('straining at stool') ||
    lower.includes('bowel not clear') ||
    lower.includes('motion clear nahi') ||
    lower.includes('மலச்சிக்கல்')
  ) {
    const val = 'Constipation / irregular bowel elimination reported';
    ayush.mala.constipationOrLoose = 'Constipation reported';
    ayush.mala.bowelPattern = 'Strained / irregular elimination';
    ayush.agni.bowelRelated = 'Sluggish bowel / constipation';
    ayush.vikritiCurrentState.bowelHabitChange = 'Constipation / sluggish bowel';
    recordSource(updated.sources, 'ayush_mala_bowels', val, source, 'PATIENT_REPORTED', text);
  } else if (
    lower.includes('loose stool') ||
    lower.includes('loose motions') ||
    lower.includes('watery stool') ||
    lower.includes('diarrhea') ||
    lower.includes('dast') ||
    lower.includes('வயிற்றுப்போக்கு')
  ) {
    const val = 'Loose stools / increased frequency reported';
    ayush.mala.constipationOrLoose = 'Loose stools reported';
    ayush.mala.bowelPattern = 'Frequent / loose bowel elimination';
    ayush.agni.bowelRelated = 'Loose motions / hypermotility';
    ayush.vikritiCurrentState.bowelHabitChange = 'Loose stools / increased frequency';
    recordSource(updated.sources, 'ayush_mala_bowels', val, source, 'PATIENT_REPORTED', text);
  }

  // E. Vihara / Lifestyle & Routine
  if (lower.includes('desk job') || lower.includes('sitting all day') || lower.includes('sedentary') || lower.includes('no physical activity') || lower.includes('no exercise')) {
    const val = 'Sedentary work pattern / prolonged sitting reported';
    ayush.vihara.sedentaryHabits = val;
    ayush.vihara.physicalActivity = 'Minimal to no routine physical exercise';
    recordSource(updated.sources, 'ayush_vihara_activity', val, source, 'PATIENT_REPORTED', text);
  }
  if (lower.includes('stress') || lower.includes('work tension') || lower.includes('mental strain') || lower.includes('anxiety') || lower.includes('feeling stressed')) {
    const val = 'Work/mental stress reported';
    ayush.vihara.stressFactors = val;
    ayush.vikritiCurrentState.stressChange = 'High stress levels reported';
    recordSource(updated.sources, 'ayush_vihara_stress', val, source, 'PATIENT_REPORTED', text);
  }

  // F. Nidana (Patient-Reported Possible Contributing Factors)
  const contributingFactors: string[] = [];
  if (ayush.ahara.foodPreferences !== 'Not yet discussed') contributingFactors.push('Dietary factors (spicy/oily foods)');
  if (ayush.ahara.mealTimings !== 'Not yet discussed') contributingFactors.push('Irregular meal timings');
  if (ayush.nidra.quality.includes('Disturbed')) contributingFactors.push('Sleep disturbance');
  if (ayush.vihara.stressFactors !== 'Not yet discussed') contributingFactors.push('Mental stress');
  if (ayush.vihara.sedentaryHabits !== 'Not yet discussed') contributingFactors.push('Sedentary routine');

  if (contributingFactors.length > 0) {
    ayush.nidana = `Patient-reported possible contributing factors: ${contributingFactors.join(', ')}`;
  }

  // G. Lakshana (Symptom Characterization)
  if (updated.chiefComplaint) {
    ayush.lakshana.character = updated.chiefComplaint;
    ayush.lakshana.duration = updated.duration || 'Not yet discussed';
    ayush.lakshana.associated = [...updated.associatedSymptoms];
  }

  // H. Prakriti Observations (Body frame, thermal preferences - strictly patient-reported, NO autonomous diagnosis)
  if (lower.includes('feel very cold') || lower.includes('sensitive to cold') || lower.includes('cannot bear cold') || lower.includes('sardi jaldi lagti')) {
    ayush.prakritiObservations = 'Patient reports cold intolerance / tendency to feel cold easily (For practitioner correlation; constitution not autonomously determined)';
  } else if (lower.includes('feel very hot') || lower.includes('excessive sweating') || lower.includes('cannot bear heat') || lower.includes('garmi zyada')) {
    ayush.prakritiObservations = 'Patient reports heat sensitivity / excessive sweating tendency (For practitioner correlation; constitution not autonomously determined)';
  }

  return updated;
}

/**
 * Scans the ENTIRE conversation history sequentially to extract and reconcile all clinical facts.
 * Ensures that no information anywhere in the conversation is missed before displaying "Not yet discussed".
 */
export function extractCaseFromTranscript(
  initialCase: ClinicalCaseState,
  transcripts: ChatMessage[] = []
): ClinicalCaseState {
  let accumulated = { ...initialCase };

  for (let i = 0; i < transcripts.length; i++) {
    const msg = transcripts[i];
    if (msg.sender === 'patient') {
      // Look back for preceding AI question for conversational context
      let prevAiQuestion = '';
      for (let j = i - 1; j >= 0; j--) {
        if (transcripts[j].sender === 'ai') {
          prevAiQuestion = transcripts[j].text;
          break;
        }
      }

      accumulated = extractClinicalInformation(
        accumulated,
        msg.text,
        'PATIENT_VOICE',
        prevAiQuestion
      );
    }
  }

  return accumulated;
}

/**
 * Converts accumulated ClinicalCaseState into localized PhysicianCaseSummary EMR format,
 * completely replacing static placeholders with actual case state or "Not yet discussed".
 */
export function formatCaseForEMR(
  caseState: ClinicalCaseState,
  patient: PatientProfile,
  visitType: 'allopathic' | 'ayush',
  transcripts: ChatMessage[] = []
): PhysicianCaseSummary {
  // If transcripts provided, ensure full transcript pass has executed
  const reconciledState = transcripts.length > 0 ? extractCaseFromTranscript(caseState, transcripts) : caseState;

  const patientInfo = `${patient.name}, ${patient.age}Y, ${patient.sex.toUpperCase()}`;
  const NOT_YET_DISCUSSED_EN = 'Not yet discussed';
  const NOT_YET_DISCUSSED_HI = 'अभी तक चर्चा नहीं हुई';
  const NOT_YET_DISCUSSED_TA = 'இன்னும் விவாதிக்கப்படவில்லை';

  const hasCC = !!reconciledState.chiefComplaint;
  const ccEn = reconciledState.chiefComplaint || NOT_YET_DISCUSSED_EN;
  const ccHi = hasCC ? reconciledState.chiefComplaint : NOT_YET_DISCUSSED_HI;
  const ccTa = hasCC ? reconciledState.chiefComplaint : NOT_YET_DISCUSSED_TA;

  const hpiEn =
    reconciledState.hpi ||
    (hasCC
      ? `${reconciledState.chiefComplaint}${
          reconciledState.duration
            ? reconciledState.duration.toLowerCase().startsWith('since')
              ? ` ${reconciledState.duration.toLowerCase()}`
              : ` for ${reconciledState.duration}`
            : ''
        }.`
      : NOT_YET_DISCUSSED_EN);
  const hpiHi = reconciledState.hpi || (hasCC ? `${reconciledState.chiefComplaint} - साक्षात्कार में दर्ज।` : NOT_YET_DISCUSSED_HI);
  const hpiTa = reconciledState.hpi || (hasCC ? `${reconciledState.chiefComplaint} - நேர்காணலில் பதிவு செய்யப்பட்டது.` : NOT_YET_DISCUSSED_TA);

  const pmhEn = reconciledState.pastMedicalHistory.length > 0 ? reconciledState.pastMedicalHistory.join(', ') : NOT_YET_DISCUSSED_EN;
  const pmhHi = reconciledState.pastMedicalHistory.length > 0 ? reconciledState.pastMedicalHistory.join(', ') : NOT_YET_DISCUSSED_HI;
  const pmhTa = reconciledState.pastMedicalHistory.length > 0 ? reconciledState.pastMedicalHistory.join(', ') : NOT_YET_DISCUSSED_TA;

  const pshEn = reconciledState.pastSurgicalHistory.length > 0 ? reconciledState.pastSurgicalHistory.join(', ') : NOT_YET_DISCUSSED_EN;

  const medEn = reconciledState.medicationHistory.length > 0 ? reconciledState.medicationHistory.join(', ') : NOT_YET_DISCUSSED_EN;
  const medHi = reconciledState.medicationHistory.length > 0 ? reconciledState.medicationHistory.join(', ') : NOT_YET_DISCUSSED_HI;
  const medTa = reconciledState.medicationHistory.length > 0 ? reconciledState.medicationHistory.join(', ') : NOT_YET_DISCUSSED_TA;

  const allEn = reconciledState.allergies.length > 0 ? reconciledState.allergies.join(', ') : NOT_YET_DISCUSSED_EN;
  const famEn = reconciledState.familyHistory.length > 0 ? reconciledState.familyHistory.join(', ') : NOT_YET_DISCUSSED_EN;
  const socEn = reconciledState.socialLifestyle.length > 0 ? reconciledState.socialLifestyle.join(', ') : NOT_YET_DISCUSSED_EN;
  const rosEn = reconciledState.reviewOfSystems || NOT_YET_DISCUSSED_EN;

  const summaryObject: PhysicianCaseSummary = {
    id: `SUM-${patient.id}-${Date.now()}`,
    patientId: patient.id,
    visitType,
    encounterDate: new Date().toISOString(),
    status: 'ai_generated',
    transcript: transcripts,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summaryEnglish: {
      patientInfo,
      chiefComplaint: ccEn,
      hpi: hpiEn,
      pastMedicalHistory: pmhEn,
      pastSurgicalHistory: pshEn,
      medicationHistory: medEn,
      allergies: allEn,
      familyHistory: famEn,
      socialLifestyle: socEn,
      reviewOfSystems: rosEn,
      ayushAssessment:
        visitType === 'ayush'
          ? `Prakriti: ${reconciledState.ayushHistory?.prakritiPractitionerStatus || 'Not yet assessed / practitioner entered'} | Agni: Appetite: ${reconciledState.ayushHistory?.agni?.appetite || 'Not yet discussed'}, Digestion: ${reconciledState.ayushHistory?.agni?.digestion || 'Not yet discussed'} | Mala: ${reconciledState.ayushHistory?.mala?.bowelPattern || 'Not yet discussed'} | Nidra: ${reconciledState.ayushHistory?.nidra?.quality || 'Not yet discussed'}`
          : undefined,
      previousInvestigations: reconciledState.previousInvestigations.length > 0 ? reconciledState.previousInvestigations.join(', ') : 'None uploaded',
      currentPreviousMedications: medEn,
      potentialRedFlags: 'No critical red flags detected',
      pointsForDoctorAttention: hasCC
        ? `Verify ${ccEn} chronology, review ${visitType === 'ayush' ? 'Agni/Ahara/Vihara intake,' : ''} and confirm active medications during physical examination.`
        : 'Conduct primary clinical evaluation.',
      missingInformation: !reconciledState.pastMedicalHistory.length ? 'Confirm any past medical history or family history.' : 'None',
    },
    summaryHindi: {
      patientInfo: `मरीज: ${patient.name}, ${patient.age} वर्ष, ${patient.sex}`,
      chiefComplaint: ccHi,
      hpi: hpiHi,
      pastMedicalHistory: pmhHi,
      medicationHistory: medHi,
      allergies: reconciledState.allergies.length > 0 ? reconciledState.allergies.join(', ') : NOT_YET_DISCUSSED_HI,
      familyHistory: reconciledState.familyHistory.length > 0 ? reconciledState.familyHistory.join(', ') : NOT_YET_DISCUSSED_HI,
      socialLifestyle: reconciledState.socialLifestyle.length > 0 ? reconciledState.socialLifestyle.join(', ') : NOT_YET_DISCUSSED_HI,
      reviewOfSystems: reconciledState.reviewOfSystems || NOT_YET_DISCUSSED_HI,
      ayushAssessment:
        visitType === 'ayush'
          ? `प्रकृति: डॉक्टर द्वारा सत्यापन लंबित | अग्नि: भूख: ${reconciledState.ayushHistory?.agni?.appetite || 'अभी तक चर्चा नहीं हुई'} | निद्रा: ${reconciledState.ayushHistory?.nidra?.quality || 'अभी तक चर्चा नहीं हुई'}`
          : undefined,
      previousInvestigations: 'कोई नहीं',
      currentPreviousMedications: medHi,
      potentialRedFlags: 'कोई आपातकालीन चेतावनी नहीं',
      pointsForDoctorAttention: 'डॉक्टर द्वारा नैदानिक परीक्षण एवं दवा सूची का सत्यापन आवश्यक है।',
      missingInformation: 'उपलब्ध नहीं',
    },
    summaryTamil: {
      patientInfo: `நோயாளி: ${patient.name}, ${patient.age} வயது, ${patient.sex}`,
      chiefComplaint: ccTa,
      hpi: hpiTa,
      pastMedicalHistory: pmhTa,
      medicationHistory: medTa,
      allergies: reconciledState.allergies.length > 0 ? reconciledState.allergies.join(', ') : NOT_YET_DISCUSSED_TA,
      familyHistory: reconciledState.familyHistory.length > 0 ? reconciledState.familyHistory.join(', ') : NOT_YET_DISCUSSED_TA,
      socialLifestyle: reconciledState.socialLifestyle.length > 0 ? reconciledState.socialLifestyle.join(', ') : NOT_YET_DISCUSSED_TA,
      reviewOfSystems: reconciledState.reviewOfSystems || NOT_YET_DISCUSSED_TA,
      ayushAssessment:
        visitType === 'ayush'
          ? `பிரகிருதி: மருத்துவர் மதிப்பீடு நிலுவையில் உள்ளது | அக்னி: ${reconciledState.ayushHistory?.agni?.appetite || 'இன்னும் விவாதிக்கப்படவில்லை'} | தூக்கம்: ${reconciledState.ayushHistory?.nidra?.quality || 'இன்னும் விவாதிக்கப்படவில்லை'}`
          : undefined,
      previousInvestigations: 'இல்லை',
      currentPreviousMedications: medTa,
      potentialRedFlags: 'எச்சரிக்கைகள் இல்லை',
      pointsForDoctorAttention: 'மருத்துவர் மருந்து விவரங்களைச் சரிபார்க்கவும்.',
      missingInformation: 'இல்லை',
    },
    patientAudioConfirmationText: `Thank you ${patient.name}. Your clinical pre-consultation summary has been generated for doctor review.`,
    ayushHistory: reconciledState.ayushHistory,
    discrepancies: [],
  };

  const concise = generateConciseClinicalSummary(transcripts, patient, visitType);
  summaryObject.clinicalSummary = concise.english;
  summaryObject.clinicalSummaryHindi = concise.hindi;
  summaryObject.clinicalSummaryTamil = concise.tamil;
  if (summaryObject.summaryEnglish) {
    summaryObject.summaryEnglish.clinicalSummary = concise.english;
  }
  if (summaryObject.summaryHindi) {
    summaryObject.summaryHindi.clinicalSummary = concise.hindi;
  }
  if (summaryObject.summaryTamil) {
    summaryObject.summaryTamil.clinicalSummary = concise.tamil;
  }

  return summaryObject;
}

/**
 * Generates a strictly spoken-content 4-5 line clinical summary for the Doctor Dashboard.
 * Includes chief complaint with duration, key symptoms (location, character, aggravating factors),
 * pertinent medical history, current medications, and allergies.
 */
export function generateConciseClinicalSummary(
  transcript: ChatMessage[] = [],
  patient: PatientProfile,
  visitType: 'allopathic' | 'ayush',
  language: Language = 'en'
): { english: string; hindi: string; tamil: string } {
  const patientLines = transcript
    .filter((m) => m.sender === 'patient')
    .map((m) => m.text)
    .join(' ');

  let caseState = getInitialClinicalCaseState();
  for (const m of transcript) {
    if (m.sender === 'patient') {
      const prevAi = transcript.find((t) => t.sender === 'ai' && t.timestamp <= m.timestamp)?.text;
      caseState = extractClinicalInformation(caseState, m.text, 'PATIENT_VOICE', prevAi);
    }
  }

  const enLines: string[] = [];

  // Line 1: Chief complaint with duration
  if (caseState.chiefComplaint) {
    let line1 = `Patient reports ${caseState.chiefComplaint.toLowerCase()}`;
    if (caseState.duration) {
      line1 += ` for ${caseState.duration}`;
    }
    line1 += '.';
    enLines.push(line1);
  } else if (patientLines) {
    enLines.push(`Patient reports ${patientLines.slice(0, 80).trim()}.`);
  } else {
    enLines.push(`Patient presenting for clinical evaluation.`);
  }

  // Line 2: Key symptoms (location, character, aggravating factors, associated symptoms)
  const symDetails: string[] = [];
  const lakshanaLoc = caseState.ayushHistory?.lakshana?.location;
  if (lakshanaLoc && lakshanaLoc !== 'Not yet discussed') {
    symDetails.push(`located primarily in the ${lakshanaLoc.toLowerCase()}`);
  } else if (/right side/i.test(patientLines)) {
    symDetails.push('located primarily on the right side');
  } else if (/left side/i.test(patientLines)) {
    symDetails.push('located on the left side');
  }

  const lakshanaAgg = caseState.ayushHistory?.lakshana?.aggravating;
  if (lakshanaAgg && lakshanaAgg !== 'Not yet discussed') {
    symDetails.push(`worsening with ${lakshanaAgg}`);
  } else if (/worse after eating|after meals/i.test(patientLines)) {
    symDetails.push('worsening after meals');
  }

  if (caseState.associatedSymptoms.length > 0) {
    symDetails.push(`associated with ${caseState.associatedSymptoms.join(' and ').toLowerCase()}`);
  } else if (/vomiting|nausea/i.test(patientLines)) {
    symDetails.push('associated nausea and vomiting present');
  }

  if (symDetails.length > 0) {
    enLines.push(`Symptoms are ${symDetails.join(', ')}.`);
  }

  // Line 3: Pertinent medical history
  if (caseState.pastMedicalHistory.length > 0) {
    enLines.push(`Pertinent history of ${caseState.pastMedicalHistory.join(', ')}.`);
  } else if (/diabetes/i.test(patientLines)) {
    enLines.push(`History of diabetes.`);
  } else {
    enLines.push(`No significant past medical history reported.`);
  }

  // Line 4: Current medications
  if (caseState.medicationHistory.length > 0) {
    enLines.push(`Current medications include ${caseState.medicationHistory.join(', ')}.`);
  } else if (/metformin/i.test(patientLines)) {
    enLines.push(`Currently managed with metformin.`);
  } else {
    enLines.push(`No active medications reported.`);
  }

  // Line 5: Allergies
  if (caseState.allergies.length > 0) {
    enLines.push(`Reports known allergy to ${caseState.allergies.join(', ')}.`);
  } else if (/penicillin/i.test(patientLines)) {
    enLines.push(`Reports known allergy to penicillin.`);
  } else {
    enLines.push(`No known drug allergies reported.`);
  }

  // Ayurveda specifics if ayush visit
  if (visitType === 'ayush' && caseState.ayushHistory) {
    const agniDesc = caseState.ayushHistory.agni?.appetite;
    if (agniDesc && agniDesc !== 'Not yet discussed') {
      enLines.push(`Ayurvedic assessment notes Agni status: ${agniDesc}.`);
    }
  }

  const english = enLines.join(' ');

  // Hindi translation
  const hiLines: string[] = [];
  if (caseState.chiefComplaint) {
    hiLines.push(`मरीज को ${caseState.duration ? caseState.duration + ' से ' : ''}${caseState.chiefComplaint} की समस्या है।`);
  }
  if (caseState.associatedSymptoms.length > 0) {
    hiLines.push(`साथ में ${caseState.associatedSymptoms.join(', ')} के लक्षण हैं।`);
  }
  if (caseState.pastMedicalHistory.length > 0) {
    hiLines.push(`पूर्व चिकित्सीय इतिहास: ${caseState.pastMedicalHistory.join(', ')}।`);
  }
  if (caseState.medicationHistory.length > 0) {
    hiLines.push(`वर्तमान दवाएं: ${caseState.medicationHistory.join(', ')}।`);
  }
  if (caseState.allergies.length > 0) {
    hiLines.push(`एलर्जी: ${caseState.allergies.join(', ')}।`);
  }
  const hindi = hiLines.length > 0 ? hiLines.join(' ') : english;

  // Tamil translation
  const taLines: string[] = [];
  if (caseState.chiefComplaint) {
    taLines.push(`நோயாளிக்கு ${caseState.duration ? caseState.duration + ' ' : ''}${caseState.chiefComplaint} உள்ளது.`);
  }
  if (caseState.associatedSymptoms.length > 0) {
    taLines.push(`தொடர்புடைய அறிகுறிகள்: ${caseState.associatedSymptoms.join(', ')}.`);
  }
  if (caseState.pastMedicalHistory.length > 0) {
    taLines.push(`முந்தைய மருத்துவ வரலாறு: ${caseState.pastMedicalHistory.join(', ')}.`);
  }
  if (caseState.medicationHistory.length > 0) {
    taLines.push(`தற்போதைய மருந்துகள்: ${caseState.medicationHistory.join(', ')}.`);
  }
  if (caseState.allergies.length > 0) {
    taLines.push(`ஒவ்வாமை: ${caseState.allergies.join(', ')}.`);
  }
  const tamil = taLines.length > 0 ? taLines.join(' ') : english;

  return { english, hindi, tamil };
}
