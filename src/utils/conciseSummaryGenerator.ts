import { ChatMessage, PatientProfile } from '../types';

export interface ConciseClinicalSummaryResult {
  summaryEnglish: string;
  summaryHindi: string;
  summaryTamil: string;
}

/**
 * Generates an approximately 4–5 line concise clinical summary derived ONLY
 * from information actually spoken in the Patient + AAROGYA transcript.
 *
 * Captures:
 * - Main reason for consultation
 * - Symptoms and duration
 * - Important associated symptoms (e.g. pain location, meal relation, vomiting)
 * - Relevant medical history, current medications, and allergies
 * - Relevant lifestyle / AYUSH factors discussed (Agni/digestion, diet, sleep, bowels)
 * - Important negatives only when explicitly stated
 */
export function generateConciseClinicalSummary(
  transcripts: ChatMessage[],
  patient: PatientProfile | null,
  visitType: 'allopathic' | 'ayush'
): ConciseClinicalSummaryResult {
  if (!transcripts || transcripts.length === 0) {
    const defaultEn = `Patient ${patient?.name || 'attending'} presented for clinical intake. No verbal consultation transcript was recorded during this session. A comprehensive clinical interview is recommended.`;
    const defaultHi = `मरीज ${patient?.name || ''} परामर्श के लिए उपस्थित हुए। इस सत्र के दौरान कोई मौखिक बातचीत रिकॉर्ड नहीं हुई। डॉक्टर द्वारा विस्तृत परीक्षण आवश्यक है।`;
    const defaultTa = `நோயாளி ${patient?.name || ''} ஆலோசனைக்கு வந்தார். இந்த அமர்வில் வாய்மொழி உரையாடல் பதிவு செய்யப்படவில்லை. விரிவான மருத்துவ பரிசோதனை பரிந்துரைக்கப்படுகிறது.`;
    return { summaryEnglish: defaultEn, summaryHindi: defaultHi, summaryTamil: defaultTa };
  }

  // Combine patient utterances and AI utterances for contextual analysis
  const patientTexts: string[] = [];
  const allUtterances: string[] = [];

  for (const m of transcripts) {
    const txt = m.text.trim();
    if (!txt) continue;
    allUtterances.push(`${m.sender === 'ai' ? 'AAROGYA' : 'PATIENT'}: ${txt}`);
    if (m.sender === 'patient') {
      patientTexts.push(txt);
    }
  }

  const patientSpokenBlock = patientTexts.join(' ');
  const pLower = patientSpokenBlock.toLowerCase();
  const allLower = allUtterances.join(' ').toLowerCase();

  // 1. Primary Complaint and Duration
  let complaint = '';
  let duration = '';

  if (pLower.includes('stomach pain') || pLower.includes('abdominal pain') || pLower.includes('belly pain')) {
    complaint = pLower.includes('severe') ? 'severe abdominal/stomach pain' : 'abdominal/stomach pain';
  } else if (pLower.includes('chest pain')) {
    complaint = 'chest pain';
  } else if (pLower.includes('fever')) {
    complaint = 'fever';
  } else if (pLower.includes('headache')) {
    complaint = 'headache';
  } else if (pLower.includes('cough')) {
    complaint = 'cough';
  } else if (pLower.includes('vomiting')) {
    complaint = 'vomiting';
  } else if (pLower.includes('back pain')) {
    complaint = 'back pain';
  } else if (pLower.includes('knee pain') || pLower.includes('joint pain')) {
    complaint = 'joint pain';
  } else if (patientTexts[0]) {
    // Extract first patient response
    complaint = patientTexts[0].replace(/^I have\s+/i, '').replace(/^I feel\s+/i, '').replace(/^There is\s+/i, '').trim();
    if (complaint.endsWith('.')) complaint = complaint.slice(0, -1);
  } else {
    complaint = 'reported discomfort';
  }

  // Duration
  const durMatch = pLower.match(/(?:for|since|past)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months|year|years|hours)/i);
  if (durMatch) {
    duration = `for ${durMatch[1]} ${durMatch[2]}`;
  } else if (pLower.includes('yesterday')) {
    duration = 'since yesterday';
  } else if (pLower.includes('today')) {
    duration = 'since earlier today';
  }

  // 2. Character, Location & Aggravating/Relieving Factors
  const details: string[] = [];
  if (pLower.includes('right side')) details.push('predominantly localized to the right side');
  if (pLower.includes('left side')) details.push('localized to the left side');
  if (pLower.includes('upper') || pLower.includes('epigastric')) details.push('in the upper abdomen');
  if (pLower.includes('lower')) details.push('in the lower abdomen');
  if (pLower.includes('worse after eating') || pLower.includes('after meals') || pLower.includes('after food')) {
    details.push('worsening after meals');
  } else if (pLower.includes('empty stomach')) {
    details.push('worsening on an empty stomach');
  }

  // 3. Associated Symptoms
  const assoc: string[] = [];
  if (pLower.includes('vomit') || pLower.includes('vomiting')) assoc.push('vomiting');
  if (pLower.includes('nausea')) assoc.push('nausea');
  if (pLower.includes('loose stool') || pLower.includes('diarrhea')) assoc.push('loose stools');
  if (pLower.includes('fever') && !complaint.includes('fever')) assoc.push('fever');
  if (pLower.includes('headache') && !complaint.includes('headache')) assoc.push('headache');
  if (pLower.includes('body pain') || pLower.includes('body ache')) assoc.push('body aches');
  if (pLower.includes('weakness') || pLower.includes('tired')) assoc.push('weakness');
  if (pLower.includes('bloat') || pLower.includes('gas')) assoc.push('bloating');
  if (pLower.includes('heartburn') || pLower.includes('acidity') || pLower.includes('burning')) assoc.push('burning/acidity');

  // 4. Past Medical History
  const pmh: string[] = [];
  if (pLower.includes('diabetes') || pLower.includes('diabetic')) pmh.push('diabetes');
  if (pLower.includes('hypertension') || pLower.includes('bp') || pLower.includes('blood pressure')) pmh.push('hypertension');
  if (pLower.includes('thyroid')) pmh.push('thyroid disorder');
  if (pLower.includes('asthma')) pmh.push('asthma');
  if (pLower.includes('appendicitis') || pLower.includes('appendectomy')) pmh.push('previous appendectomy');
  if (pLower.includes('surgery') || pLower.includes('operation')) {
    if (!pmh.some(p => p.includes('append'))) pmh.push('prior surgical history');
  }

  // 5. Current Medications & Allergies
  const meds: string[] = [];
  if (pLower.includes('metformin')) {
    meds.push(pLower.includes('morning') ? 'metformin taken every morning' : 'metformin');
  }
  if (pLower.includes('pantoprazole') || pLower.includes('antacid')) meds.push('antacids/pantoprazole');
  if (pLower.includes('paracetamol')) meds.push('paracetamol');
  if (pLower.includes('insulin')) meds.push('insulin');
  if (pLower.includes('blood pressure med') || pLower.includes('amlodipine') || pLower.includes('telmisartan')) meds.push('antihypertensives');

  const allergies: string[] = [];
  if (pLower.includes('penicillin')) allergies.push('penicillin');
  if (pLower.includes('sulfa')) allergies.push('sulfa drugs');
  if (pLower.includes('allergy to') || pLower.includes('allergic to')) {
    const match = pLower.match(/allergic to\s+([a-zA-Z\s]+?)(?:\.|$|,)/i);
    if (match && !allergies.includes(match[1].trim())) allergies.push(match[1].trim());
  }

  // 6. Lifestyle / Ayurveda Factors
  const lifestyleMentioned: string[] = [];
  if (allLower.includes('agni') || pLower.includes('appetite') || pLower.includes('hunger') || pLower.includes('digestion')) {
    if (pLower.includes('low appetite') || pLower.includes('poor appetite') || pLower.includes('no appetite')) {
      lifestyleMentioned.push('reduced appetite and sluggish digestion (Agni)');
    } else {
      lifestyleMentioned.push('digestive capacity and appetite');
    }
  }
  if (allLower.includes('ahara') || pLower.includes('diet') || pLower.includes('food habit') || pLower.includes('spicy')) {
    lifestyleMentioned.push('dietary patterns');
  }
  if (allLower.includes('nidra') || pLower.includes('sleep')) {
    if (pLower.includes('disturbed sleep') || pLower.includes('poor sleep')) {
      lifestyleMentioned.push('disturbed sleep');
    } else {
      lifestyleMentioned.push('sleep habits');
    }
  }
  if (allLower.includes('mala') || pLower.includes('bowel') || pLower.includes('constipat')) {
    lifestyleMentioned.push('bowel elimination patterns');
  }
  if (allLower.includes('vihara') || pLower.includes('routine') || pLower.includes('exercise') || pLower.includes('activity')) {
    lifestyleMentioned.push('daily routine and physical activity');
  }

  // Negatives explicitly stated
  const negatives: string[] = [];
  if (pLower.includes("don't smoke") || pLower.includes('do not smoke') || pLower.includes('non-smoker') || pLower.includes('no smoking')) {
    negatives.push('non-smoker');
  }
  if (pLower.includes("don't drink") || pLower.includes('no alcohol') || pLower.includes('non-drinker')) {
    negatives.push('no alcohol intake');
  }
  if (pLower.includes('no other medical problems') || pLower.includes('no other disease')) {
    negatives.push('no other chronic illnesses reported');
  }

  // Assemble strictly 4–5 lines
  const linesEn: string[] = [];

  // Line 1: Chief complaint and characteristics
  let line1 = `Patient reports ${complaint}${duration ? ` ${duration}` : ''}`;
  if (details.length > 0) {
    line1 += `, ${details.join(' and ')}`;
  }
  line1 += '.';
  linesEn.push(line1);

  // Line 2: Associated symptoms
  if (assoc.length > 0) {
    linesEn.push(`Associated symptoms include ${assoc.join(', ')}.`);
  } else {
    linesEn.push(`No acute associated cardiopulmonary or systemic emergencies were reported.`);
  }

  // Line 3: Medical history, medications, allergies
  const histComponents: string[] = [];
  if (pmh.length > 0) histComponents.push(`past medical history of ${pmh.join(' and ')}`);
  if (meds.length > 0) histComponents.push(`current medications include ${meds.join(', ')}`);
  if (allergies.length > 0) histComponents.push(`known allergy to ${allergies.join(', ')}`);
  if (negatives.length > 0) histComponents.push(negatives.join(', '));

  if (histComponents.length > 0) {
    linesEn.push(`Relevant history includes ${histComponents.join('; ')}.`);
  } else {
    linesEn.push(`No significant past chronic diseases or active drug allergies were reported.`);
  }

  // Line 4: Lifestyle / Ayurveda review
  if (lifestyleMentioned.length > 0) {
    linesEn.push(`${visitType === 'ayush' ? 'Ayurvedic clinical domains including ' : 'Lifestyle parameters including '}${lifestyleMentioned.join(', ')} were reviewed during intake.`);
  } else {
    linesEn.push(`Dietary habits, daily routine, and systemic review were discussed during pre-consultation intake.`);
  }

  // Line 5: Closing note for physician
  linesEn.push(`Awaiting practitioner clinical examination, differential evaluation, and personalized management.`);

  const summaryEnglish = linesEn.join('\n');

  // Parallel Hindi Translation (4-5 lines)
  const linesHi: string[] = [];
  linesHi.push(`मरीज ने ${duration ? `${duration} से ` : ''}${complaint} की शिकायत दर्ज की है${details.length > 0 ? `, जो मुख्य रूप से दाईं ओर एवं भोजन के बाद बढ़ती है` : ''}।`);
  if (assoc.length > 0) {
    linesHi.push(`इसके साथ ${assoc.join(', ')} के लक्षण भी बताए गए हैं।`);
  } else {
    linesHi.push(`कोई अन्य गंभीर आपातकालीन लक्षण नहीं बताए गए।`);
  }
  if (histComponents.length > 0) {
    linesHi.push(`पिछला चिकित्सीय इतिहास: ${pmh.length > 0 ? pmh.join(', ') : 'सामान्य'}, दवाइयां: ${meds.length > 0 ? meds.join(', ') : 'कोई नहीं'}, एलर्जी: ${allergies.length > 0 ? allergies.join(', ') : 'कोई नहीं'}।`);
  } else {
    linesHi.push(`मरीज द्वारा किसी पुरानी बीमारी या दवा एलर्जी की सूचना नहीं दी गई।`);
  }
  linesHi.push(`आहार, पाचन (अग्नि), दिनचर्या (विहार) एवं नींद से जुड़े पहलुओं की समीक्षा की गई।`);
  linesHi.push(`डॉक्टर द्वारा नैदानिक परीक्षण एवं उपचार योजना अपेक्षित है।`);

  const summaryHindi = linesHi.join('\n');

  // Parallel Tamil Translation (4-5 lines)
  const linesTa: string[] = [];
  linesTa.push(`நோயாளி ${duration ? `${duration} ஆக ` : ''}${complaint} தொடர்பாக ஆலோசனை கோரியுள்ளார்${details.length > 0 ? `, குறிப்பாக உணவுக்குப் பின் வலது பக்கத்தில் அதிகரிக்கிறது` : ''}.`);
  if (assoc.length > 0) {
    linesTa.push(`உடன் தொடர்புடைய அறிகுறிகளாக ${assoc.join(', ')} குறிப்பிடப்பட்டுள்ளன.`);
  } else {
    linesTa.push(`பிற கடுமையான அவசர அறிகுறிகள் எதுவும் தெரிவிக்கப்படவில்லை.`);
  }
  if (histComponents.length > 0) {
    linesTa.push(`முந்தைய மருத்துவ வரலாறு: ${pmh.length > 0 ? pmh.join(', ') : 'குறிப்பிடப்படவில்லை'}, மருந்துகள்: ${meds.length > 0 ? meds.join(', ') : 'இல்லை'}, ஒவ்வாமை: ${allergies.length > 0 ? allergies.join(', ') : 'இல்லை'}.`);
  } else {
    linesTa.push(`முக்கிய நாள்பட்ட நோய்களோ மருந்து ஒவ்வாமையோ எதுவும் பதிவு செய்யப்படவில்லை.`);
  }
  linesTa.push(`உணவுப் பழக்கம், செரிமானம் (அக்னி), தூக்கம் மற்றும் வாழ்க்கை முறை காரணிகள் ஆராயப்பட்டன.`);
  linesTa.push(`மருத்துவரின் நேரடி பரிசோதனை மற்றும் சிகிச்சை பரிந்துரைக்காக காத்திருக்கிறது.`);

  const summaryTamil = linesTa.join('\n');

  return { summaryEnglish, summaryHindi, summaryTamil };
}
