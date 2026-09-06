import { ClinicalSchema, RedFlagAlert } from '../types';

export interface RedFlagRule {
  id: string;
  name: string;
  type: 'allopathic' | 'ayush';
  severity: 'CRITICAL' | 'WARNING';
  evaluate: (schema: Partial<ClinicalSchema>, userText: string) => boolean;
  alert: {
    title: string;
    message: string;
  };
}

export const DETERMINISTIC_RED_FLAG_RULES: RedFlagRule[] = [
  // 1. Acute Coronary / Cardiorespiratory
  {
    id: 'ALLO-CARDIO-01',
    name: 'Chest Pain with Dyspnea / Radiation',
    type: 'allopathic',
    severity: 'CRITICAL',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      const hasChestPain =
        lower.includes('chest pain') ||
        lower.includes('pressure in chest') ||
        lower.includes('सीने में दर्द') ||
        lower.includes('छाती में दर्द') ||
        lower.includes('நெஞ்சு வலி');
      const hasBreathShortness =
        lower.includes('shortness of breath') ||
        lower.includes('difficulty breathing') ||
        lower.includes('breathless') ||
        lower.includes('सांस लेने में तकलीफ') ||
        lower.includes('மூச்சுத் திணறல்') ||
        lower.includes('sweating') ||
        lower.includes('radiating to arm') ||
        lower.includes('jaw pain');
      return hasChestPain && hasBreathShortness;
    },
    alert: {
      title: 'Potential Acute Cardiorespiratory Distress',
      message:
        'Patient reports chest pain associated with dyspnea/radiation. Prioritize immediate physician triage and ECG evaluation.',
    },
  },

  // 2. Sudden Neurological Deficit
  {
    id: 'ALLO-NEURO-02',
    name: 'Sudden Neurological Weakness / Slurred Speech',
    type: 'allopathic',
    severity: 'CRITICAL',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      return (
        (lower.includes('slurred speech') ||
          lower.includes('facial droop') ||
          lower.includes('one side weakness') ||
          lower.includes('loss of vision') ||
          lower.includes('लकवा') ||
          lower.includes('हाथ पैर काम नहीं कर रहे') ||
          lower.includes('பக்கவாதம்') ||
          lower.includes('திடீர் பலவீனம்')) &&
        (lower.includes('sudden') || lower.includes('आज') || lower.includes('acute') || lower.includes('திடீரென'))
      );
    },
    alert: {
      title: 'Potential Acute Neurological Deficit (FAST Trigger)',
      message:
        'Sudden focal neurological weakness or speech impairment reported. Recommend rapid stroke triage protocol.',
    },
  },

  // 3. Loss of Consciousness / Syncope
  {
    id: 'ALLO-SYNCOPE-03',
    name: 'Unexplained Syncope / Loss of Consciousness',
    type: 'allopathic',
    severity: 'CRITICAL',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes('fainted') ||
        lower.includes('passed out') ||
        lower.includes('loss of consciousness') ||
        lower.includes('unconscious') ||
        lower.includes('बेहोश') ||
        lower.includes('चक्कर खाकर गिर') ||
        lower.includes('மயக்கம்')
      );
    },
    alert: {
      title: 'Loss of Consciousness / Syncope',
      message: 'Episode of unexplained syncope/unconsciousness reported. Immediate neurological & vitals assessment indicated.',
    },
  },

  // 4. Severe Active Bleeding / Hemoptysis / Hematemesis
  {
    id: 'ALLO-BLEED-04',
    name: 'Severe Hemorrhage / Hemoptysis / Melena',
    type: 'allopathic',
    severity: 'CRITICAL',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      return (
        lower.includes('coughing blood') ||
        lower.includes('vomiting blood') ||
        lower.includes('black stool') ||
        lower.includes('खून की उल्टी') ||
        lower.includes('खांसी में खून') ||
        lower.includes('काले दस्त') ||
        lower.includes('ரத்த வாந்தி') ||
        lower.includes('கழிச்சலில் ரத்தம்')
      );
    },
    alert: {
      title: 'Active GI / Respiratory Hemorrhage',
      message: 'Report of hematemesis, hemoptysis or gastrointestinal bleeding. Urgent stabilization required.',
    },
  },

  // 5. AYUSH: Severe Agni Disturbance with Rapid Weight Loss (Dhatu Kshaya)
  {
    id: 'AYUSH-AGNI-01',
    name: 'Severe Atyagni / Mandaagni with Rapid Dhatu Kshaya',
    type: 'ayush',
    severity: 'WARNING',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      const hasAgniCrisis =
        lower.includes('cannot digest') ||
        lower.includes('severe burning in stomach') ||
        lower.includes('severe loss of appetite') ||
        lower.includes('भूख बिल्कुल नहीं') ||
        lower.includes('पेट में तीव्र जलन') ||
        lower.includes('பசியின்மை');
      const hasWeightLoss =
        lower.includes('weight loss') ||
        lower.includes('losing weight rapidly') ||
        lower.includes('वजन तेजी से घट') ||
        lower.includes('உடல் எடை குறைவு') ||
        lower.includes('dhatu kshaya');
      return hasAgniCrisis && hasWeightLoss;
    },
    alert: {
      title: 'AYUSH Alert: Severe Agni Mandya with Progressive Dhatu Kshaya',
      message:
        'Concomitant profound digestive impairment and rapid unexplained tissue/weight depletion flagged for comprehensive metabolic evaluation.',
    },
  },

  // 6. AYUSH: Krura Koshtha with Raktapitta / Melena or Severe Udavarta
  {
    id: 'AYUSH-KOSHTHA-02',
    name: 'Krura Koshtha with Severe Shoola & Retention (Udavarta)',
    type: 'ayush',
    severity: 'WARNING',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      const hasConstipationCrisis =
        lower.includes('no bowel movement for') ||
        lower.includes('severe abdominal distension') ||
        lower.includes('intense stomach cramps and vomit') ||
        lower.includes('मल त्याग नहीं हुआ') ||
        lower.includes('पेट फूलना और उल्टी') ||
        lower.includes('மலம் வெளியேறவில்லை');
      return hasConstipationCrisis;
    },
    alert: {
      title: 'AYUSH Alert: Severe Vataja Udavarta / Suspected Acute Abdomen',
      message:
        'Prolonged obstipation with severe abdominal distension and pain noted. Needs surgical/clinical evaluation to rule out subacute obstruction.',
    },
  },

  // 7. AYUSH: Severe Ojo-Kshaya / Prameha Complications
  {
    id: 'AYUSH-OJO-03',
    name: 'Severe Drowsiness in Chronic Prameha (Ojo-Kshaya)',
    type: 'ayush',
    severity: 'CRITICAL',
    evaluate: (schema, text) => {
      const lower = text.toLowerCase();
      return (
        (lower.includes('diabetes') || lower.includes('शुगर') || lower.includes('சர்க்கரை நோய்') || lower.includes('prameha')) &&
        (lower.includes('extremely drowsy') || lower.includes('confusion') || lower.includes('fruity breath') || lower.includes('अत्यधिक उनींदापन') || lower.includes('अचेत'))
      );
    },
    alert: {
      title: 'AYUSH & Metabolic Alert: Acute Metabolic / Glycemic Crisis',
      message: 'Confusion and extreme lethargy in a diabetic patient. Urgent capillary blood glucose and ketone check advised.',
    },
  },
];

export function evaluateDeterministicRedFlags(
  recentText: string,
  schema: Partial<ClinicalSchema> = {},
  age?: number,
  visitType?: 'allopathic' | 'ayush'
): RedFlagAlert[] {
  const alerts: RedFlagAlert[] = [];
  const timestamp = new Date().toISOString();

  for (const rule of DETERMINISTIC_RED_FLAG_RULES) {
    try {
      if (rule.evaluate(schema, recentText)) {
        let category: RedFlagAlert['category'] = 'other';
        if (rule.id.includes('CARDIO')) category = 'cardiorespiratory';
        else if (rule.id.includes('NEURO')) category = 'neurological';
        else if (rule.id.includes('SYNCOPE')) category = 'syncope';
        else if (rule.id.includes('BLEED')) category = 'hemorrhage';
        else if (rule.id.includes('AGNI')) category = 'ayush_agni';
        else if (rule.id.includes('KOSHTHA')) category = 'ayush_koshtha';
        else if (rule.id.includes('OJO')) category = 'ayush_metabolic';

        alerts.push({
          id: `${rule.id}-${Date.now()}`,
          category,
          severity: rule.severity,
          title: rule.alert.title,
          message: rule.alert.message,
          suggestedAction: rule.severity === 'CRITICAL' ? 'Immediate physician triage & emergency vitals evaluation' : 'Prioritize physician consultation & investigations',
          triggeredBy: rule.name,
          timestamp,
        });
      }
    } catch {
      // safe fallback
    }
  }

  return alerts;
}

export function runDeterministicSafetyCheck(
  schema: Partial<ClinicalSchema>,
  recentText: string
): RedFlagAlert[] {
  return evaluateDeterministicRedFlags(recentText, schema);
}
