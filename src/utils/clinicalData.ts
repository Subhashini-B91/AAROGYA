import { ClinicalSchema, Language, UploadedDocument, PatientProfile, CaseSummary, DiscrepancyFlag } from '../types';

export interface QuestionGuideNode {
  category: string;
  questionEn: string;
  questionHi: string;
  questionTa: string;
}

export const CLINICAL_QUESTION_GUIDE: QuestionGuideNode[] = [
  {
    category: 'chief_complaint',
    questionEn: 'Hello! I am your clinical pre-consultation intake assistant. What primary health concern or symptom brings you in today?',
    questionHi: 'नमस्ते! मैं आपका नैदानिक पूर्व-परामर्श सहायक हूँ। आज आपको क्या मुख्य स्वास्थ्य समस्या या लक्षण महसूस हो रहे हैं?',
    questionTa: 'வணக்கம்! நான் உங்கள் மருத்துவ ஆலோசனைக்கு முந்தைய தகவல் சேகரிப்பு உதவியாளர். இன்று உங்களுக்கு என்ன முக்கிய உடல்நலக் குறைபாடு உள்ளது?',
  },
  {
    category: 'duration_onset',
    questionEn: 'When did this symptom start, and did it come on suddenly or gradually?',
    questionHi: 'यह लक्षण कब से शुरू हुआ, और क्या यह अचानक शुरू हुआ या धीरे-धीरे?',
    questionTa: 'இந்த அறிகுறி எப்போது தொடங்கியது, திடீரென தோன்றியதா அல்லது படிப்படியாக அதிகரித்ததா?',
  },
  {
    category: 'character_severity',
    questionEn: 'How would you describe the feeling or pain (e.g. sharp, burning, dull ache), and on a scale of 1 to 10, how severe is it?',
    questionHi: 'आप इस परेशानी या दर्द को कैसे व्यक्त करेंगे (उदा. जलन, चुभन, भारीपन), और 1 से 10 के पैमाने पर इसकी तीव्रता कितनी है?',
    questionTa: 'இந்த வலியை அல்லது உபாதையை எவ்வாறு விவரிப்பீர்கள் (எ.கா. நெஞ்செரிச்சல், குத்தல், மந்த வலி), 1 முதல் 10 வரை இதன் தீவிரம் எவ்வளவு?',
  },
  {
    category: 'factors',
    questionEn: 'What makes it worse (e.g. food, exertion, lying down) and what provides relief?',
    questionHi: 'किस चीज से यह बढ़ता है (उदा. भोजन, परिश्रम, लेटना) और किस चीज से आराम मिलता है?',
    questionTa: 'எந்த செயலால் வலி கூடுகிறது, எதனால் சற்று நிவாரணம் கிடைக்கிறது?',
  },
  {
    category: 'associated',
    questionEn: 'Are there any associated symptoms such as nausea, fever, palpitations, dizziness, or shortness of breath?',
    questionHi: 'क्या इसके साथ जी मिचलाना, बुखार, घबराहट, चक्कर या सांस फूलने जैसे अन्य लक्षण भी हैं?',
    questionTa: 'இதனுடன் குமட்டல், காய்ச்சல், தலைசுற்றல், நெஞ்சு படபடப்பு போன்ற பிற அறிகுறிகள் ஏதேனும் உள்ளதா?',
  },
  {
    category: 'past_medications',
    questionEn: 'Do you have any ongoing medical conditions (Diabetes, Hypertension, Thyroid) or regular medications / known allergies?',
    questionHi: 'क्या आपको पहले से कोई बीमारी (डायबिटीज, बीपी, थायरॉइड) या नियमित दवाएं / एलर्जी हैं?',
    questionTa: 'உங்களுக்கு ஏற்கனவே உள்ள உடல்நல பாதிப்புகள் (சர்க்கரை நோய், ரத்த அழுத்தம்) அல்லது தொடர் மருந்துகள் / ஒவ்வாமை உள்ளதா?',
  },
];

export interface AyurvedaQuestionNode {
  domain: 'lakshana' | 'nidana' | 'agni' | 'ahara' | 'vihara' | 'nidra' | 'mala' | 'manas' | 'prakriti';
  labelEn: string;
  labelHi: string;
  labelTa: string;
  questionEn: string;
  questionHi: string;
  questionTa: string;
  optionsEn: string[];
  optionsHi: string[];
  optionsTa: string[];
}

export const AYURVEDA_QUESTION_GUIDE: AyurvedaQuestionNode[] = [
  {
    domain: 'lakshana',
    labelEn: 'Lakshana (Symptoms)',
    labelHi: 'लक्षण (लक्षण व कष्ट)',
    labelTa: 'லக்ஷணம் (அறிகுறிகள்)',
    questionEn: 'Namaste. What primary discomfort or health concern (Lakshana) brings you for this Ayurvedic intake today?',
    questionHi: 'नमस्ते। आज आपको मुख्य रूप से क्या शारीरिक या मानसिक कष्ट (लक्षण) महसूस हो रहा है?',
    questionTa: 'வணக்கம். இன்று உங்களுக்கு என்ன முதன்மை உடல் உபாதை அல்லது அறிகுறிகள் (லக்ஷணம்) உள்ளன?',
    optionsEn: ['Digestive distress / bloating', 'Joint stiffness & body ache', 'Fatigue / low stamina', 'Skin irritation / burning'],
    optionsHi: ['पाचन में गड़बड़ी व पेट फूलना', 'जोड़ों में दर्द व अकड़न', 'थकान व कमजोरी', 'त्वचा में जलन व खुजली'],
    optionsTa: ['செரிமானக் கோளாறு & வாயு', 'மூட்டு வலி & உடல் சோர்வு', 'அதிக சோர்வு', 'தோல் எரிச்சல் & அரிப்பு'],
  },
  {
    domain: 'nidana',
    labelEn: 'Nidana (Triggers & Causes)',
    labelHi: 'निदान (कारण व उत्तेजक)',
    labelTa: 'நிதானம் (காரணிகள்)',
    questionEn: 'Did this start after any specific trigger (Nidana), such as heavy/cold foods, seasonal change, or sudden stress?',
    questionHi: 'क्या यह परेशानी किसी विशेष कारण (निदान) जैसे भारी/ठंडे भोजन, मौसम में बदलाव या मानसिक तनाव के बाद शुरू हुई?',
    questionTa: 'இந்த உபாதை ஏதேனும் குறிப்பிட்ட உணவு, பருவகால மாற்றம் அல்லது மன அழுத்தத்திற்கு பிறகு தொடங்கியதா?',
    optionsEn: ['After heavy or spicy food', 'Weather / seasonal change', 'Physical exertion or travel', 'Gradual without clear trigger'],
    optionsHi: ['भारी या मिर्च-मसालेदार भोजन के बाद', 'मौसम के बदलाव के बाद', 'यात्रा या अत्यधिक श्रम के बाद', 'धीरे-धीरे बिना स्पष्ट कारण'],
    optionsTa: ['காரமான அல்லது கடின உணவுக்குப் பின்', 'பருவகால மாற்றத்திற்குப் பின்', 'அதிக உழைப்பு அல்லது பயணம்', 'தெளிவான காரணமின்றி படிப்படியாக'],
  },
  {
    domain: 'agni',
    labelEn: 'Agni (Digestive Fire)',
    labelHi: 'अग्नि (पाचन शक्ति व भूख)',
    labelTa: 'அக்னி (செரிமான தீ & பசி)',
    questionEn: 'How is your appetite and digestive power (Agni)? Do you experience heaviness after meals, burning, or irregular hunger?',
    questionHi: 'आपकी भूख और पाचन शक्ति (अग्नि) कैसी है? क्या खाने के बाद भारीपन, गैस, सीने में जलन या अनियमित भूख लगती है?',
    questionTa: 'உங்கள் பசி மற்றும் செரிமான சக்தி (அக்னி) எவ்வாறு உள்ளது? சாப்பிட்ட பின் மந்தம், நெஞ்செரிச்சல் அல்லது வாயு உள்ளதா?',
    optionsEn: ['Slow digestion with heaviness (Manda)', 'Sharp intense hunger with acidity (Tikshna)', 'Irregular fluctuating appetite (Vishama)', 'Normal balanced digestion (Sama)'],
    optionsHi: ['खाना देर से पचना व भारीपन (मंदाग्नि)', 'तीव्र भूख व सीने में जलन (तीक्ष्णाग्नि)', 'अनियमित व बदलती भूख (विषमाग्नि)', 'संतुलित व सामान्य पाचन (समाग्नि)'],
    optionsTa: ['மந்தமான செரிமானம் & கனம் (மந்தாக்னி)', 'அதிக பசி & நெஞ்செரிச்சல் (தீக்ஷ்ணாக்னி)', 'மாறிவரும் ஒழுங்கற்ற பசி (விஷமாக்னி)', 'சீரான செரிமானம் (சமாக்னி)'],
  },
  {
    domain: 'ahara',
    labelEn: 'Ahara (Diet & Food Habits)',
    labelHi: 'आहार (खान-पान व रुचि)',
    labelTa: 'ஆகாரம் (உணவு முறை)',
    questionEn: 'What are your daily dietary habits (Ahara)? Do you prefer warm cooked meals or cold items, and do you take meals at fixed times?',
    questionHi: 'आपकी खान-पान की आदतें (आहार) कैसी हैं? क्या आप गर्म ताजा खाना पसंद करते हैं या ठंडा, और क्या भोजन का समय निश्चित रहता है?',
    questionTa: 'உங்கள் தினசரி உணவு பழக்கம் (ஆகாரம்) எப்படி உள்ளது? சூடான உணவை விரும்புகிறீர்களா, மற்றும் நேரத்திற்கு சாப்பிடுகிறீர்களா?',
    optionsEn: ['Prefer warm, home-cooked food', 'Prefer spicy & sour tastes', 'Irregular meal timings', 'Frequent cold drinks / raw foods'],
    optionsHi: ['गर्म व ताजा घरेलू खाना पसंद', 'तीखा, खट्टा व तला-भुना अधिक', 'भोजन का अनियमित समय', 'ठंडे पेय व कच्चे फल/सलाद अधिक'],
    optionsTa: ['சூடான வீட்டு உணவு விருப்பம்', 'காரமான & புளிப்பான உணவு விருப்பம்', 'ஒழுங்கற்ற உணவு நேரம்', 'குளிர்ந்த உணவு / பானங்கள் அதிகம்'],
  },
  {
    domain: 'vihara',
    labelEn: 'Vihara (Daily Routine & Activity)',
    labelHi: 'विहार (दिनचर्या व व्यायाम)',
    labelTa: 'விஹாரம் (வாழ்க்கை முறை & செயல்பாடு)',
    questionEn: 'What is your daily physical routine (Vihara)? Do you sit for long hours, exercise regularly, or sleep during the daytime?',
    questionHi: 'आपकी दिनचर्या (विहार) और शारीरिक सक्रियता कैसी है? क्या आप लंबे समय तक बैठे रहते हैं, नियमित व्यायाम करते हैं, या दिन में सोते हैं?',
    questionTa: 'உங்கள் தினசரி நடைமுறை மற்றும் உடற்பயிற்சி (விஹாரம்) எப்படி உள்ளது? நீண்ட நேரம் அமர்ந்திருக்கும் பழக்கம் அல்லது பகல் தூக்கம் உள்ளதா?',
    optionsEn: ['Mostly desk-bound / sedentary', 'Regular walking or yoga', 'Heavy physical work / fatigue', 'Habit of daytime sleep (Diva-swapna)'],
    optionsHi: ['ज्यादातर बैठकर काम (कम शारीरिक गति)', 'नियमित टहलना या योग', 'अत्यधिक भागदौड़ व शारीरिक थकान', 'दोपहर में सोने की आदत (दिवास्वप्न)'],
    optionsTa: ['அமர்ந்தே பணிபுரியும் நிலை', 'தினசரி நடைப்பயிற்சி அல்லது யோகா', 'அதிக உடலுழைப்பு & சோர்வு', 'பகல் தூக்கம் பழக்கம்'],
  },
  {
    domain: 'nidra',
    labelEn: 'Nidra (Sleep Quality)',
    labelHi: 'निद्रा (नींद व विश्राम)',
    labelTa: 'நித்ரா (தூக்கம் & ஓய்வு)',
    questionEn: 'How is your sleep (Nidra)? Do you fall asleep easily, wake up in the middle of the night, or feel refreshed in the morning?',
    questionHi: 'आपकी नींद (निद्रा) कैसी रहती है? क्या आसानी से नींद आती है, रात में बार-बार टूटती है, या सुबह उठने पर ताजगी महसूस होती है?',
    questionTa: 'உங்கள் தூக்கம் (நித்ரா) எவ்வாறு உள்ளது? ஆழ்ந்த தூக்கம் வருகிறதா, அல்லது இரவில் விழிப்பு வந்து சோர்வாக உணர்கிறீர்களா?',
    optionsEn: ['Sound, uninterrupted sleep (6-8 hrs)', 'Difficulty falling asleep / restlessness', 'Frequent night awakenings', 'Waking up feeling tired or heavy'],
    optionsHi: ['गहरी व शांत नींद (6-8 घंटे)', 'नींद आने में कठिनाई व बेचैनी', 'रात में बार-बार नींद खुलना', 'सुबह उठने पर आलस्य व भारीपन'],
    optionsTa: ['ஆழ்ந்த சீரான தூக்கம்', 'தூங்குவதில் சிரமம் & அமைதியின்மை', 'இரவில் அடிக்கடி விழிப்பு வருதல்', 'காலையில் சோர்வு அல்லது மந்த உணர்வு'],
  },
  {
    domain: 'mala',
    labelEn: 'Mala (Elimination & Bowels)',
    labelHi: 'मल (मल-मूत्र निष्कासन)',
    labelTa: 'மலம் (கழிவு வெளியேற்றம்)',
    questionEn: 'How is your bowel movement and elimination (Mala)? Are your motions regular, dry/hard, or loose with bloating?',
    questionHi: 'आपका पेट साफ होने की प्रक्रिया (मल प्रवृत्ति) कैसी है? क्या शौच नियमित है, कब्ज/कड़ापन रहता है, या ढीला मल व गैस बनती है?',
    questionTa: 'உங்கள் குடல் இயக்கம் (மலம்) எப்படி உள்ளது? மலச்சிக்கல், ஒழுங்கற்ற மலம் அல்லது வாயு உபாதை ஏதேனும் உள்ளதா?',
    optionsEn: ['Regular once daily, comfortable', 'Constipation / hard dry stool', 'Loose or frequent motions', 'Gas, bloating & incomplete feeling'],
    optionsHi: ['प्रतिदिन एक बार साफ व नियमित', 'कब्जियत व सूखा कड़ा मल', 'पतला या बार-बार शौच आना', 'पेट में गैस, अफारा व अधूरापन'],
    optionsTa: ['தினமும் ஒரு முறை இயல்பானது', 'மலச்சிக்கல் / இறுக்கமான மலம்', 'அடிக்கடி மலம் அல்லது பேதி', 'வாயு, உப்புசம் & முழுமையற்ற உணர்வு'],
  },
  {
    domain: 'manas',
    labelEn: 'Manas (Mind & Stress State)',
    labelHi: 'मानस (मानसिक स्थिति व तनाव)',
    labelTa: 'மானஸம் (மன நிலை & அமைதி)',
    questionEn: 'How is your mental peace and emotional state (Manas)? Have you noticed feeling stressed, anxious, irritable, or worried lately?',
    questionHi: 'आपकी मानसिक स्थिति और मन की शांति (मानस) कैसी है? क्या हाल ही में तनाव, घबराहट, अत्यधिक चिंता या चिड़चिड़ापन महसूस हो रहा है?',
    questionTa: 'உங்கள் மன அமைதி (மானஸம்) எவ்வாறு உள்ளது? சமீப காலமாக மன அழுத்தம், கவலை அல்லது பதற்றம் உள்ளதா?',
    optionsEn: ['Calm and peaceful', 'Occasional work/life stress', 'High anxiety & constant overthinking', 'Irritable or easily agitated'],
    optionsHi: ['शांत व स्थिर मन', 'कभी-कभार सामान्य काम का तनाव', 'अत्यधिक चिंता व घबराहट', 'जल्दी चिड़चिड़ापन व क्रोध'],
    optionsTa: ['அமைதியானது', 'சாதாரண பணிச்சுமை & அழுத்தம்', 'அதிக பதற்றம் & தொடர் கவலை', 'எரிச்சல் அல்லது கோபம்'],
  },
  {
    domain: 'prakriti',
    labelEn: 'Prakriti (Constitutional Tendencies)',
    labelHi: 'प्रकृति (शारीरिक प्रवृत्ति)',
    labelTa: 'பிரகிருதி (இயற்கை உடல்வாகு)',
    questionEn: 'To assist the doctor in understanding your constitutional tendencies (Prakriti), do you naturally tolerate heat or cold better, and is your skin dry or oily?',
    questionHi: 'डॉक्टर द्वारा आपकी शारीरिक प्रकृति को समझने के लिए, क्या आप ठंड या गर्मी में से किसे अधिक सहन कर पाते हैं, और आपकी त्वचा सूखी है या तैलीय?',
    questionTa: 'மருத்துவர் உங்கள் உடல்வாகை (பிரகிருதி) அறிய, உங்களுக்கு குளிர் ஒத்துக்கொள்ளுமா அல்லது வெப்பமா, மற்றும் தோல் வறண்டதா அல்லது பளபளப்பானதா?',
    optionsEn: ['Dislike cold, prefer warmth (Dry skin)', 'Dislike heat, sweat easily (Warm body)', 'Comfortable in all seasons (Oily skin)', 'Fluctuating sensitivity'],
    optionsHi: ['ठंड सहन नहीं होती, गर्मी पसंद (रूखी त्वचा)', 'गर्मी सहन नहीं होती, पसीना अधिक (गर्म शरीर)', 'सभी मौसम में सहज (तैलीय/चिकनी त्वचा)', 'बदलती हुई संवेदनशीलता'],
    optionsTa: ['குளிர் பிடிக்காது, வெயில் விருப்பம் (வறண்ட தோல்)', 'வெப்பம் தாங்காது, அதிக வியர்வை', 'எல்லா காலநிலையிலும் இயல்பு', 'மாறுபட்ட உணர்வு'],
  },
];

export function getInitialEmptySchema(): ClinicalSchema {
  return {
    chief_complaint: '',
    hpi: {
      site: '',
      onset: '',
      character: '',
      radiation: '',
      associated_symptoms: [],
      timing: '',
      aggravating_factors: [],
      relieving_factors: [],
      severity: '',
    },
    past_history: [],
    medications: [],
    allergies: [],
    family_history: [],
    social_history: {
      diet: '',
      smoking: '',
      alcohol: '',
      occupation: '',
      exercise: '',
      sleep: '',
      habits: [],
    },
    review_of_systems: {
      general: '',
      cardiorespiratory: '',
      gastrointestinal: '',
      genitourinary: '',
      neurological: '',
      musculoskeletal: '',
      dermatological: '',
    },
    red_flags: [],
    discrepancies: [],
    unknown_or_missing: [],
    reconciliation_discrepancies: [],
  };
}

export function reconcileInterviewAndDocs(
  schema: ClinicalSchema,
  documents: UploadedDocument[]
): DiscrepancyFlag[] {
  const discrepancies: DiscrepancyFlag[] = [];

  const patientReportedMeds = schema.medications.map((m) => m.name.toLowerCase().trim());

  const docMeds: string[] = [];
  documents.forEach((doc) => {
    if (doc.structuredData?.medications) {
      doc.structuredData.medications.forEach((m) => {
        if (m.name && !docMeds.includes(m.name.toLowerCase().trim())) {
          docMeds.push(m.name.toLowerCase().trim());
        }
      });
    }
  });

  docMeds.forEach((docMed) => {
    const isReported = patientReportedMeds.some((pMed) => pMed.includes(docMed) || docMed.includes(pMed));
    if (!isReported && docMed.length > 2) {
      discrepancies.push({
        id: `DISC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        field: 'Medication Reconciliation',
        description: `Medication "${docMed}" found in uploaded health records but not mentioned in patient verbal history.`,
        patientReported: 'Not mentioned during intake',
        documentFound: docMed,
        status: 'pending',
      });
    }
  });

  return discrepancies;
}
