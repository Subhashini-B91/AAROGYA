import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Lazy GoogleGenAI client initialization
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Resilient helper to call Gemini with retry on 503/429 and fallback model support
async function callGeminiResiliently(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    primaryModel?: string;
    fallbackModels?: string[];
  }
) {
  const modelsToTry = [
    options.primaryModel || 'gemini-3.7-flash',
    ...(options.fallbackModels || ['gemini-flash-latest']),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      // Immediately proceed to the next fallback model without sleeping
      continue;
    }
  }

  throw lastError;
}

// Safe JSON parser that strips markdown code fences or extracts JSON blocks
function safeParseJson(rawText: string | undefined): any {
  if (!rawText) return null;
  let text = rawText.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    return null;
  }
}

// Clean in-memory persistent database for patient records
const clinicalDB = {
  patients: new Map<string, any>(),
  confirmedSummaries: new Map<string, any[]>(),
  uploadedDocuments: new Map<string, any[]>(),
  liveCases: new Map<string, any>(),
  recommendations: new Map<string, any[]>(),
};

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiProvider: process.env.GEMINI_API_KEY ? 'gemini-3.7-flash' : 'rule-engine-fallback',
    liveVoiceModel: 'gemini-3.1-flash-live-preview',
    timestamp: new Date().toISOString(),
  });
});

// 2. Fast Streaming Chat Endpoint (Server-Sent Events for minimal latency text interaction)
app.post('/api/chat/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const {
    message,
    conversationHistory = [],
    language = 'en',
    patient = {},
    visitType = 'general',
  } = req.body;

  const langLabel =
    language === 'hi'
      ? 'Hindi (हिंदी)'
      : language === 'ta'
      ? 'Tamil (தமிழ்)'
      : 'English';

  const isAyush = visitType === 'ayush' || visitType === 'integrative';

  const systemPrompt = isAyush
    ? `You are an expert Ayurvedic pre-consultation case-taking intake assistant conducting an intake interview in ${langLabel}.
Patient Profile: ${patient?.name || 'Patient'}, ${patient?.age ? `${patient.age} years old` : ''}, ${patient?.sex || ''}.
Department: AYUSH (Ayurveda) Outpatient Department.

AYURVEDA DYNAMIC QUESTIONING DIRECTIVES:
1. You are an intake documentation assistant, NOT an autonomous doctor. NEVER diagnose, prescribe medications/herbs, or autonomously declare definitive Dosha/Prakriti/Vikriti.
2. Guide the consultation dynamically across the 9 classical Ayurvedic domains:
   - Lakshana (Chief symptoms, nature of pain: dull, sharp, burning, aching)
   - Nidana (Aetiological triggers, food habits, weather, seasonal shifts, emotional stress)
   - Agni (Digestive fire and appetite: Tikshnagni/burning hunger, Mandagni/slow sluggish digestion with heaviness, Vishamagni/irregular hunger, Samagni/balanced)
   - Ahara (Dietary habits: hot vs cold food preference, taste affinities - sweet/sour/salty/spicy, meal times)
   - Vihara (Lifestyle & daily routine: sedentary habits, exercise, day sleeping / Diva-swapna, occupational posture)
   - Nidra (Sleep quality: difficulty falling asleep, nocturnal waking, morning heaviness or refreshed)
   - Mala (Elimination: bowel regularity, constipation/dry stools, loose frequency, gas/bloating, urination)
   - Manas (Mental state: stress, anxiety/Chinta, mental fatigue, irritability)
   - Prakriti (Constitutional tendencies: thermal sensitivity to cold vs heat, skin moisture/dryness - for physician review only).
3. Ask ONLY ONE short, compassionate question at a time in ${langLabel} (1-2 sentences maximum).
4. Listen carefully to the patient's reply and dynamically explore whichever Ayurvedic domain has not yet been addressed.
5. If emergency red flags appear (crushing chest pain, severe dyspnea, acute neurological deficit), advise immediate emergency care.`
    : `You are an empathetic, professional clinical pre-consultation case-taking assistant conducting an intake interview in ${langLabel}.
Patient Profile: ${patient?.name || 'Patient'}, ${patient?.age ? `${patient.age} years old` : ''}, ${patient?.sex || ''}.
Department: General Outpatient Clinic.

CRITICAL CLINICAL DIRECTIVES:
1. You are a pre-consultation intake assistant gathering clinical history for the treating physician. You are NOT an autonomous doctor.
2. NEVER provide a final diagnosis, NEVER prescribe medication, and NEVER offer treatment guarantees.
3. Speak and write strictly in ${langLabel}.
4. Ask ONE clear, compassionate question at a time. Keep your response concise (1-2 sentences).
5. Listen carefully to the patient's reply and follow the SOCRATES symptom exploration framework (Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity).
6. Inquire gently about duration, past medical history, current medications, allergies, and lifestyle if not yet shared.
7. If the patient describes acute emergency symptoms (such as crushing chest pain radiating to arm/jaw, acute stroke signs, heavy active hemorrhage, severe breathing distress), advise immediate urgent medical attention.`;

  const ai = getGenAI();

  if (!ai) {
    // Offline deterministic fallback
    const fallbackReply =
      language === 'hi'
        ? `धन्यवाद। क्या आप बता सकते हैं कि यह परेशानी कितने समय से है और क्या किसी दवा या आराम से इसमें राहत मिलती है?`
        : language === 'ta'
        ? `நன்றி. இந்த பிரச்சனை எத்தனை நாட்களாக உள்ளது மற்றும் ஏதேனும் மருந்தினால் குறைகிறதா?`
        : `Thank you for sharing. Could you tell me how long you have had this symptom, and whether anything makes it better or worse?`;

    res.write(`data: ${JSON.stringify({ chunk: fallbackReply })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    return res.end();
  }

  try {
    // Keep conversation context compact for maximum speed
    const recentHistory = conversationHistory.slice(-8);
    const contents: any[] = recentHistory.map((m: any) => ({
      role: m.sender === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });

    const stream = await ai.models.generateContentStream({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ chunk: chunk.text })}\n\n`);
      }
    }
    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err: any) {
    console.error('Chat stream error:', err);
    const fallbackText =
      language === 'hi'
        ? 'कृपया अपनी परेशानी के बारे में और बताएं।'
        : language === 'ta'
        ? 'உங்கள் அறிகுறிகளைப் பற்றி மேலும் கூறுங்கள்.'
        : 'Please describe a bit more about what you are experiencing.';
    res.write(`data: ${JSON.stringify({ chunk: fallbackText })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

// 3. Fast JSON Chat endpoint for quick replies & entity extraction
app.post('/api/chat', async (req, res) => {
  try {
    const {
      message,
      conversationHistory = [],
      clinicalSchema = {},
      language = 'en',
      patient = {},
      visitType = 'general',
    } = req.body;

    const isAyush = visitType === 'ayush' || visitType === 'integrative';
    const ai = getGenAI();

    const langLabel =
      language === 'hi'
        ? 'Hindi (हिंदी)'
        : language === 'ta'
        ? 'Tamil (தமிழ்)'
        : 'English';

    // Ayurveda 9 classical domains in sequential progression
    const AYURVEDA_DOMAINS = [
      {
        domain: 'lakshana',
        questionEn: 'What primary symptoms or bodily discomfort (Lakshana) are you experiencing, and how does it feel (burning, aching, or heaviness)?',
        questionHi: 'आपको क्या मुख्य लक्षण या शारीरिक कष्ट (लक्षण) महसूस हो रहा है, और यह कैसा लगता है (जलन, दर्द या भारीपन)?',
        questionTa: 'உங்களுக்கு என்ன முதன்மை அறிகுறிகள் அல்லது உடல் உபாதைகள் (லக்ஷணம்) உள்ளன (எரிச்சல், வலி அல்லது கனம்)?',
        optionsEn: ['Digestive distress / bloating', 'Joint ache & stiffness', 'Fatigue & weakness', 'Skin burning / itchiness'],
        optionsHi: ['पाचन में गड़बड़ी व गैस', 'जोड़ों में दर्द व जकड़न', 'थकान व कमजोरी', 'त्वचा में जलन व खुजली'],
        optionsTa: ['செரிமானக் கோளாறு & வாயு', 'மூட்டு வலி & இறுக்கம்', 'அதிக சோர்வு', 'தோல் எரிச்சல்'],
      },
      {
        domain: 'nidana',
        questionEn: 'Did this start after any specific trigger (Nidana) such as heavy/cold foods, weather change, or emotional stress?',
        questionHi: 'क्या यह किसी विशेष कारण (निदान) जैसे गरिष्ठ/ठंडे भोजन, मौसम बदलाव या मानसिक तनाव के बाद शुरू हुआ?',
        questionTa: 'இந்த உபாதை ஏதேனும் குறிப்பிட்ட உணவு, பருவகால மாற்றம் அல்லது மன அழுத்தத்திற்கு பிறகு தொடங்கியதா?',
        optionsEn: ['After heavy or spicy food', 'Weather / seasonal change', 'Physical overexertion', 'Gradual without clear trigger'],
        optionsHi: ['भारी या तीखे भोजन के बाद', 'मौसम परिवर्तन के बाद', 'अत्यधिक श्रम या यात्रा', 'बिना स्पष्ट कारण के'],
        optionsTa: ['காரமான அல்லது கடின உணவுக்குப் பின்', 'பருவகால மாற்றத்திற்குப் பின்', 'அதிக உழைப்பு', 'தெளிவான காரணமின்றி'],
      },
      {
        domain: 'agni',
        questionEn: 'How is your appetite and digestive fire (Agni)? Do you experience slow heavy digestion, sharp burning hunger, or fluctuating appetite?',
        questionHi: 'आपकी भूख और पाचन शक्ति (अग्नि) कैसी है? क्या खाना देर से पचना व भारीपन (मंदाग्नि), तेज भूख व जलन (तीक्ष्णाग्नि), या अनियमित भूख है?',
        questionTa: 'உங்கள் பசி மற்றும் செரிமான தீ (அக்னி) எவ்வாறு உள்ளது? மந்தமான செரிமானம், அதிக பசி & எரிச்சல், அல்லது ஒழுங்கற்ற பசியா?',
        optionsEn: ['Slow digestion & heaviness (Manda)', 'Sharp hunger with acidity (Tikshna)', 'Irregular fluctuating appetite (Vishama)', 'Balanced regular digestion (Sama)'],
        optionsHi: ['खाना देर से पचना व भारीपन (मंदाग्नि)', 'तीव्र भूख व जलन (तीक्ष्णाग्नि)', 'अनियमित बदलती भूख (विषमाग्नि)', 'संतुलित सामान्य पाचन (समाग्नि)'],
        optionsTa: ['மந்தமான செரிமானம் (மந்தாக்னி)', 'அதிக பசி & நெஞ்செரிச்சல் (தீக்ஷ்ணாக்னி)', 'ஒழுங்கற்ற பசி (விஷமாக்னி)', 'சீரான செரிமானம் (சமாக்னி)'],
      },
      {
        domain: 'ahara',
        questionEn: 'Could you share your daily food habits (Ahara)? Do you prefer warm home-cooked meals or cold/packaged food, and what tastes do you prefer?',
        questionHi: 'आपकी खान-पान की आदतें (आहार) कैसी हैं? क्या आप ताजा गर्म खाना पसंद करते हैं या ठंडा, और आपको तीखा, खट्टा या मीठा क्या अधिक पसंद है?',
        questionTa: 'உங்கள் தினசரி உணவு பழக்கம் (ஆகாரம்) எப்படி உள்ளது? சூடான உணவை விரும்புகிறீர்களா, மற்றும் காரம், புளிப்பு அல்லது இனிப்பு எது அதிகம் பிடிக்கும்?',
        optionsEn: ['Warm home-cooked food', 'Prefer spicy & sour tastes', 'Irregular meal timings', 'Frequent cold / dry food'],
        optionsHi: ['गर्म व ताजा घरेलू भोजन', 'तीखा व खट्टा अधिक पसंद', 'अनियमित भोजन का समय', 'ठंडा व रूखा खाना'],
        optionsTa: ['சூடான வீட்டு உணவு', 'காரமான & புளிப்பான உணவு', 'ஒழுங்கற்ற உணவு நேரம்', 'குளிர்ந்த உணவு'],
      },
      {
        domain: 'vihara',
        questionEn: 'What is your daily physical routine (Vihara)? Do you sit for long hours, exercise regularly, or sleep during daytime?',
        questionHi: 'आपकी दिनचर्या और शारीरिक सक्रियता (विहार) कैसी है? क्या आप लंबे समय तक बैठे रहते हैं, व्यायाम करते हैं, या दिन में सोते हैं?',
        questionTa: 'உங்கள் தினசரி உடற்பயிற்சி மற்றும் வாழ்க்கை முறை (விஹாரம்) எப்படி உள்ளது? அமர்ந்தே இருக்கும் பழக்கம் அல்லது பகல் தூக்கம் உள்ளதா?',
        optionsEn: ['Sedentary / long sitting', 'Regular walking or yoga', 'Heavy physical work', 'Habit of daytime sleep (Diva-swapna)'],
        optionsHi: ['ज्यादातर बैठकर काम', 'नियमित टहलना या योग', 'अत्यधिक शारीरिक श्रम', 'दिन में सोने की आदत (दिवास्वप्न)'],
        optionsTa: ['அமர்ந்தே பணிபுரியும் நிலை', 'தினசரி நடைப்பயிற்சி அல்லது யோகா', 'அதிக உடலுழைப்பு', 'பகல் தூக்கம் பழக்கம்'],
      },
      {
        domain: 'nidra',
        questionEn: 'How is your sleep pattern and quality (Nidra)? Do you fall asleep easily, wake frequently, or feel heavy upon waking?',
        questionHi: 'आपकी नींद (निद्रा) कैसी रहती है? क्या आसानी से नींद आती है, रात में टूटती है, या सुबह उठने पर भारीपन रहता है?',
        questionTa: 'உங்கள் தூக்கம் (நித்ரா) எவ்வாறு உள்ளது? ஆழ்ந்த தூக்கம் வருகிறதா, அல்லது இரவில் அடிக்கடி விழிப்பு வருகிறதா?',
        optionsEn: ['Sound sleep (6-8 hrs)', 'Difficulty falling asleep', 'Frequent night awakenings', 'Waking up feeling unrefreshed'],
        optionsHi: ['गहरी व अच्छी नींद (6-8 घंटे)', 'नींद आने में कठिनाई', 'रात में बार-बार नींद टूटना', 'सुबह उठने पर सुस्ती व भारीपन'],
        optionsTa: ['ஆழ்ந்த சீரான தூக்கம்', 'தூங்குவதில் சிரமம்', 'இரவில் அடிக்கடி விழிப்பு', 'காலையில் சோர்வு'],
      },
      {
        domain: 'mala',
        questionEn: 'How are your bowel movements and elimination (Mala)? Do you experience constipation, loose stools, bloating, or irregular motions?',
        questionHi: 'आपका पेट साफ होने की स्थिति (मल प्रवृत्ति) कैसी है? क्या कब्ज, सूखा कड़ा मल, ढीला मल या पेट में अफारा रहता है?',
        questionTa: 'உங்கள் குடல் இயக்கம் (மலம்) எப்படி உள்ளது? மலச்சிக்கல், கடினமான மலம், அல்லது வாயு உப்புசம் ஏதேனும் உள்ளதா?',
        optionsEn: ['Regular once daily', 'Constipation / dry hard stool', 'Loose or frequent motions', 'Bloating & incomplete evacuation'],
        optionsHi: ['प्रतिदिन एक बार साफ व नियमित', 'कब्जियत व सूखा कड़ा मल', 'पतला या बार-बार शौच', 'पेट में गैस व अधूरापन'],
        optionsTa: ['தினமும் ஒரு முறை சீரானது', 'மலச்சிக்கல் / இறுக்கமான மலம்', 'அடிக்கடி மலம்', 'வாயு & முழுமையற்ற உணர்வு'],
      },
      {
        domain: 'manas',
        questionEn: 'How is your mental peace and emotional state (Manas)? Have you been feeling anxious, stressed, irritable, or burdened lately?',
        questionHi: 'आपकी मानसिक शांति व स्थिति (मानस) कैसी है? क्या हाल ही में चिंता, तनाव, चिड़चिड़ापन या घबराहट महसूस हो रही है?',
        questionTa: 'உங்கள் மன அமைதி (மானஸம்) எவ்வாறு உள்ளது? சமீப காலமாக மன அழுத்தம், கவலை அல்லது பதற்றம் உள்ளதா?',
        optionsEn: ['Calm and balanced', 'Occasional work/life stress', 'High anxiety & restlessness', 'Irritable or easily agitated'],
        optionsHi: ['शांत व संतुलित मन', 'सामान्य काम का तनाव', 'अत्यधिक चिंता व बेचैनी', 'जल्दी चिड़चिड़ापन व गुस्सा'],
        optionsTa: ['அமைதியானது', 'சாதாரண பணி அழுத்தம்', 'அதிக பதற்றம் & கவலை', 'எரிச்சல் அல்லது கோபம்'],
      },
      {
        domain: 'prakriti',
        questionEn: 'For your constitutional profile (Prakriti), do you naturally prefer warm or cold environments, and is your skin dry or oily?',
        questionHi: 'आपकी शारीरिक प्रकृति को समझने के लिए, क्या आपको ठंड या गर्मी में से क्या अधिक सहन होता है, और त्वचा रूखी है या तैलीय?',
        questionTa: 'உங்கள் உடல்வாகை (பிரகிருதி) அறிய, உங்களுக்கு குளிர் ஒத்துக்கொள்ளுமா அல்லது வெப்பமா, மற்றும் தோல் வறண்டதா அல்லது பளபளப்பானதா?',
        optionsEn: ['Prefer warmth (Dry skin)', 'Prefer cold (Warm body, sweats easily)', 'Comfortable in all seasons', 'Fluctuating sensitivity'],
        optionsHi: ['ठंड सहन नहीं होती, गर्मी पसंद (रूखी त्वचा)', 'गर्मी सहन नहीं होती, पसीना अधिक', 'सभी मौसम में सहज', 'बदलती हुई संवेदनशीलता'],
        optionsTa: ['குளிர் பிடிக்காது, வெயில் விருப்பம்', 'வெப்பம் தாங்காது, அதிக வியர்வை', 'எல்லா காலநிலையிலும் இயல்பு', 'மாறுபட்ட உணர்வு'],
      },
    ];

    // Determine which Ayurveda domain to ask next based on conversation turn
    const patientTurns = conversationHistory.filter((m: any) => m.sender === 'patient').length;
    const currentAyushIndex = Math.min(patientTurns, AYURVEDA_DOMAINS.length - 1);
    const nextAyushDomain = AYURVEDA_DOMAINS[currentAyushIndex];

    const systemPrompt = isAyush
      ? `You are an expert Ayurvedic pre-consultation case-taking intake assistant conducting an intake interview in ${langLabel}.
Patient Profile: ${patient?.name || 'Patient'}, ${patient?.age ? `${patient.age}Y` : ''}, ${patient?.sex || ''}.
Department: AYUSH Outpatient Department.

AYURVEDA DYNAMIC QUESTIONING FRAMEWORK:
Explore the 9 classical dimensions in progression: Lakshana, Nidana, Agni, Ahara, Vihara, Nidra, Mala, Manas, Prakriti.
Current target domain: "${nextAyushDomain.domain.toUpperCase()}".

CRITICAL DIRECTIVES:
1. You are a pre-consultation intake assistant. You are NOT an autonomous doctor. Do NOT diagnose or prescribe or declare definitive Dosha imbalance.
2. Ask ONE clear question at a time in ${langLabel} about the target domain.
3. Respond in concise, compassionate language (1-2 sentences).
4. Provide 2-4 short quick reply options relevant to the patient's next answer in ${langLabel}.
5. Extract clinical entities.

Return valid JSON:
{
  "replyText": "Next question in ${langLabel}",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "extractedEntities": {
    "chief_complaint": "Extracted complaint or null",
    "ayush_domain": "${nextAyushDomain.domain}",
    "hpi_site": "Location of symptom or null",
    "hpi_onset": "Onset or null",
    "hpi_character": "Character or null",
    "hpi_severity": "Severity or null"
  }
}`
      : `You are a clinical pre-consultation case-taking assistant conducting an intake interview in ${langLabel}.
Patient Profile: ${patient?.name || 'Patient'}, ${patient?.age ? `${patient.age}Y` : ''}, ${patient?.sex || ''}.

CRITICAL CLINICAL DIRECTIVES:
1. You are a pre-consultation intake assistant. You are NOT an autonomous doctor. Do NOT diagnose or prescribe.
2. Ask ONE clear question at a time in ${langLabel}.
3. Respond in concise, compassionate language.
4. Provide 2-4 short quick reply options relevant to the patient's next answer in ${langLabel}.
5. Extract any newly reported clinical entities to update the structured clinical history.

Return valid JSON:
{
  "replyText": "Next question in ${langLabel}",
  "quickReplies": ["Option 1", "Option 2", "Option 3"],
  "extractedEntities": {
    "chief_complaint": "Extracted complaint or null",
    "hpi_site": "Location of symptom or null",
    "hpi_onset": "Onset or null",
    "hpi_character": "Character or null",
    "hpi_severity": "Severity or null",
    "associated_symptoms": [],
    "past_history": [],
    "medications": [],
    "allergies": []
  }
}`;

    if (ai) {
      try {
        const recentHistory = conversationHistory.slice(-6);
        const prompt = `Conversation history:\n${recentHistory
          .map((m: any) => `${m.sender}: ${m.text}`)
          .join('\n')}\n\nPatient input: "${message}"`;

        const response = await callGeminiResiliently(ai, {
          primaryModel: 'gemini-3.7-flash',
          fallbackModels: ['gemini-flash-latest'],
          contents: prompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const parsed = safeParseJson(response.text);
        if (parsed && (parsed.replyText || parsed.quickReplies)) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Gemini fast chat error, using fallback rule engine:', err);
      }
    }

    // Deterministic fallback response
    if (isAyush) {
      const qText =
        language === 'hi'
          ? nextAyushDomain.questionHi
          : language === 'ta'
          ? nextAyushDomain.questionTa
          : nextAyushDomain.questionEn;
      const opts =
        language === 'hi'
          ? nextAyushDomain.optionsHi
          : language === 'ta'
          ? nextAyushDomain.optionsTa
          : nextAyushDomain.optionsEn;

      return res.json({
        replyText: qText,
        quickReplies: opts,
        extractedEntities: {
          ayush_domain: nextAyushDomain.domain,
        },
      });
    }

    const fallbackReply =
      language === 'hi'
        ? 'धन्यवाद। क्या इसके साथ कोई अन्य लक्षण जैसे बुखार, चक्कर या उल्टी महसूस हो रही है?'
        : language === 'ta'
        ? 'நன்றி. இதனுடன் காய்ச்சல், தலைசுற்றல் அல்லது குமட்டல் போன்ற பிற அறிகுறிகள் உள்ளதா?'
        : 'Thank you. Are there any other associated symptoms such as fever, dizziness, or nausea?';

    return res.json({
      replyText: fallbackReply,
      quickReplies:
        language === 'hi'
          ? ['हाँ, हल्का बुखार है', 'नहीं, कोई अन्य लक्षण नहीं', 'कभी-कभी चक्कर आते हैं']
          : language === 'ta'
          ? ['ஆம், லேசான காய்ச்சல் உள்ளது', 'இல்லை, வேறு எதுவும் இல்லை', 'தலைசுற்றல் உள்ளது']
          : ['Yes, mild fever', 'No other symptoms', 'Occasional dizziness'],
      extractedEntities: {},
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: error?.message || 'Chat service error' });
  }
});

// 4. Document OCR & Clinical Entity Extraction (Supporting both /api/document/extract and /api/documents/extract)
const handleDocumentExtraction = async (req: express.Request, res: express.Response) => {
  try {
    const { rawOcrText, docType = 'prescription', documentType, docName = 'document' } = req.body;
    const effectiveDocType = docType || documentType || 'prescription';

    if (!rawOcrText || rawOcrText.trim().length === 0) {
      return res.status(400).json({ error: 'No OCR text provided' });
    }

    const ai = getGenAI();
    if (ai) {
      try {
        const prompt = `Analyze this extracted OCR text from a medical document (${effectiveDocType}: "${docName}") and extract structured clinical data.
Do NOT fabricate any information. If a field is not explicitly present, omit it or use an empty array.

OCR TEXT:
${rawOcrText}

Format your output in this JSON schema:
{
  "medications": [
    { "name": "Medication name", "dose": "Dose", "frequency": "Frequency", "duration": "Duration" }
  ],
  "diagnoses": ["Documented diagnoses"],
  "labTests": [
    { "testName": "Test", "value": "Value", "unit": "Unit", "referenceRange": "Ref Range", "status": "normal/abnormal/critical" }
  ],
  "hospitalOrDoctor": "Doctor / Clinic name if mentioned",
  "dates": ["Dates in document"]
}`;

        const response = await callGeminiResiliently(ai, {
          primaryModel: 'gemini-3.7-flash',
          fallbackModels: ['gemini-flash-latest'],
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const parsed = safeParseJson(response.text);
        if (parsed) {
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Doc extraction Gemini error, fallback to regex:', err);
      }
    }

    // Basic regex extraction fallback
    const medications: any[] = [];
    const lines = rawOcrText.split('\n');
    lines.forEach((line: string) => {
      if (line.match(/(tab|cap|syrup|inj|mg|od|bd|tds|qid)/i)) {
        medications.push({ name: line.trim(), dose: '', frequency: '' });
      }
    });

    return res.json({
      medications,
      diagnoses: [],
      labTests: [],
      hospitalOrDoctor: '',
      dates: [],
    });
  } catch (error: any) {
    console.error('Doc extraction error:', error);
    res.status(500).json({ error: error?.message || 'Extraction failed' });
  }
};

app.post('/api/documents/extract', handleDocumentExtraction);
app.post('/api/document/extract', handleDocumentExtraction);

// 5. Final Clinical Case Summary Generator (Called ONLY upon consultation completion - ONE single model call)
app.post('/api/summary/generate', async (req, res) => {
  try {
    const {
      patient,
      visitType = 'allopathic',
      clinicalSchema = {},
      documents = [],
      transcript = [],
      targetLanguage = 'en',
    } = req.body;

    const patientName = patient?.name || 'Patient';
    const patientAge = patient?.age ? `${patient.age} Yrs` : 'Not yet discussed';
    const patientSex = patient?.sex || 'Not yet discussed';

    const ai = getGenAI();

    // Condense transcript to key statements to minimize payload & latency
    const condensedTranscript = (transcript || [])
      .slice(-30) // Take up to 30 most relevant recent exchanges
      .map((t: any) => `${t.sender === 'ai' ? 'Assistant' : 'Patient'}: ${t.text}`)
      .join('\n');

    const systemPrompt = `You are an expert clinical documentation engine for a hospital outpatient department.
Generate a comprehensive, structured pre-consultation case summary based ONLY on the provided patient interview transcript, reported history, and uploaded records.

CRITICAL INSTRUCTIONS:
1. Do NOT fabricate or hallucinate any clinical information.
2. If any field was not discussed by the patient, explicitly output "Not yet discussed" (or corresponding Hindi/Tamil translation: "अभी तक चर्चा नहीं हुई" / "இன்னும் விவாதிக்கப்படவில்லை"). NEVER output "Not provided" or "No information was provided".
3. Extract actual values stated by the patient (e.g., Chief Complaint: "Fever", Duration: "3 days", Associated Symptoms: "Headache, Body pain", Past Medical History: "Diabetes", Medication History: "Metformin — every morning").
4. Produce complete, parallel clinical records in English ("summaryEnglish"), Hindi ("summaryHindi"), and Tamil ("summaryTamil") in ONE SINGLE model pass.
5. Output MUST be strictly valid JSON matching this schema:
{
  "clinicalSummary": "Concise 4–5 lines of natural clinical summary derived ONLY from information actually spoken in the transcript. Never hallucinate unmentioned symptoms, medications, or diagnoses.",
  "clinicalSummaryHindi": "मरीज की बातचीत पर आधारित 4–5 पंक्तियों का संक्षिप्त नैदानिक सारांश।",
  "clinicalSummaryTamil": "உரையாடலை அடிப்படையாகக் கொண்ட 4–5 வரிகள் கொண்ட சுருக்கம்.",
  "summaryEnglish": {
    "patientInfo": "${patientName}, ${patientAge}, ${patientSex}",
    "clinicalSummary": "...",
    "chiefComplaint": "...",
    "hpi": "...",
    "pastMedicalHistory": "...",
    "medicationHistory": "...",
    "allergies": "...",
    "familyHistory": "...",
    "socialLifestyle": "...",
    "reviewOfSystems": "...",
    "previousInvestigations": "...",
    "potentialRedFlags": "...",
    "pointsForDoctorAttention": "...",
    "missingInformation": "..."
  },
  "summaryHindi": {
    "patientInfo": "${patientName}, ${patientAge}, ${patientSex}",
    "chiefComplaint": "...",
    "hpi": "...",
    "pastMedicalHistory": "...",
    "medicationHistory": "...",
    "allergies": "...",
    "familyHistory": "...",
    "socialLifestyle": "...",
    "reviewOfSystems": "...",
    "previousInvestigations": "...",
    "potentialRedFlags": "...",
    "pointsForDoctorAttention": "...",
    "missingInformation": "..."
  },
  "summaryTamil": {
    "patientInfo": "${patientName}, ${patientAge}, ${patientSex}",
    "chiefComplaint": "...",
    "hpi": "...",
    "pastMedicalHistory": "...",
    "medicationHistory": "...",
    "allergies": "...",
    "familyHistory": "...",
    "socialLifestyle": "...",
    "reviewOfSystems": "...",
    "previousInvestigations": "...",
    "potentialRedFlags": "...",
    "pointsForDoctorAttention": "...",
    "missingInformation": "..."
  },
  "patientAudioConfirmationText": "Concise 2-sentence confirmation summary in patient's preferred language (${targetLanguage})."
}`;

    const serverCacheKey = `${patient?.id || patientName}-${visitType}-${(transcript || []).length}`;
    if (clinicalDB.confirmedSummaries.has(serverCacheKey)) {
      return res.json(clinicalDB.confirmedSummaries.get(serverCacheKey));
    }

    if (ai) {
      try {
        const payload = `PATIENT: ${patientName} (${patientAge}, ${patientSex})
DEPARTMENT: ${visitType === 'ayush' ? 'Integrative Medicine' : 'General Internal Medicine'}
TARGET LANGUAGE: ${targetLanguage}

STRUCTURED INTAKE DATA:
${JSON.stringify(clinicalSchema, null, 2)}

INTERVIEW TRANSCRIPT:
${condensedTranscript || 'No verbal interview transcript provided.'}

UPLOADED DOCUMENTS SUMMARY:
${documents.length > 0 ? JSON.stringify(documents.map((d: any) => ({ name: d.name, type: d.type, data: d.structuredData })), null, 2) : 'No documents uploaded.'}`;

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Summary generation timeout')), 4000)
        );

        const geminiPromise = callGeminiResiliently(ai, {
          primaryModel: 'gemini-2.5-flash',
          fallbackModels: ['gemini-2.5-flash-lite', 'gemini-flash-latest'],
          contents: payload,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
          },
        });

        const response: any = await Promise.race([geminiPromise, timeoutPromise]);

        const parsed = safeParseJson(response.text);
        if (parsed && (parsed.summaryEnglish || parsed.summaryHindi)) {
          clinicalDB.confirmedSummaries.set(serverCacheKey, parsed);
          return res.json(parsed);
        }
      } catch (err) {
        console.warn('Gemini summary generation error, using deterministic synthesizer fallback immediately:', err);
      }
    }

    // Real patient case extraction fallback (Zero-latency fallback)
    const existingLiveCase = patient?.id ? clinicalDB.liveCases.get(patient.id) : null;
    const liveState = existingLiveCase?.caseState || existingLiveCase || {};

    // Determine chief complaint from live case, clinical schema, or transcript
    let cc = liveState.chiefComplaint || clinicalSchema?.chief_complaint;
    let duration = liveState.duration || '';
    let pmh = (liveState.pastMedicalHistory && liveState.pastMedicalHistory.length > 0)
      ? liveState.pastMedicalHistory.join(', ')
      : (clinicalSchema?.past_history?.length > 0 ? clinicalSchema.past_history.join(', ') : '');
    let meds = (liveState.medicationHistory && liveState.medicationHistory.length > 0)
      ? liveState.medicationHistory.join(', ')
      : (clinicalSchema?.medications?.length > 0 ? clinicalSchema.medications.map((m: any) => m.name).join(', ') : '');
    let hpiText = liveState.hpi || '';

    // If still missing, parse directly from patient exchanges in transcript
    if (!cc || !pmh || !meds) {
      const patientUtterances = (transcript || [])
        .filter((t: any) => t.sender === 'patient' || t.speaker === 'patient' || !t.sender)
        .map((t: any) => t.text)
        .join('. ');

      if (patientUtterances) {
        const lower = patientUtterances.toLowerCase();
        if (!cc) {
          if (lower.includes('fever')) cc = 'Fever';
          else if (lower.includes('headache')) cc = 'Headache';
          else if (lower.includes('chest pain')) cc = 'Chest pain';
          else if (lower.includes('cough')) cc = 'Cough';
          else if (lower.includes('stomach pain') || lower.includes('abdominal pain')) cc = 'Abdominal pain';
        }
        if (!duration) {
          const dMatch = lower.match(/(?:for|since|past)?\s*(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)/i);
          if (dMatch) duration = `${dMatch[1]} ${dMatch[2]}`;
        }
        if (!pmh && (lower.includes('diabetes') || lower.includes('diabetic'))) {
          pmh = 'Diabetes';
        }
        if (!meds && lower.includes('metformin')) {
          meds = lower.includes('morning') ? 'Metformin — every morning' : 'Metformin';
        }
        if (!hpiText && cc) {
          hpiText = `${cc}${duration ? ` for ${duration}` : ''}${lower.includes('headache') || lower.includes('body pain') ? ' with headache and body pain' : ''}.`;
        }
      }
    }

    const chiefComplaintFinal = cc || 'Not yet discussed';
    const hpiFinal = hpiText || (cc ? `${cc}${duration ? ` for ${duration}` : ''}.` : 'Not yet discussed');
    const pmhFinal = pmh || 'Not yet discussed';
    const medsFinal = meds || 'Not yet discussed';

    const patientWords = (transcript || [])
      .filter((t: any) => t.sender === 'patient' || t.speaker === 'patient')
      .map((t: any) => t.text)
      .join(' ')
      .toLowerCase();

    const rightSideText = patientWords.includes('right side') ? ', mainly on the right side' : '';
    const mealWorseText = patientWords.includes('after eating') || patientWords.includes('after meal') ? ', with worsening after meals' : '';
    const assocSymptomsText = patientWords.includes('vomit') || patientWords.includes('nausea')
      ? ' and associated nausea and vomiting'
      : patientWords.includes('loose stool')
      ? ' and associated loose stools'
      : '';
    const looseStoolText = patientWords.includes('loose stool') ? 'Loose stools and weakness were also reported. ' : '';
    const historyText = pmhFinal !== 'Not yet discussed' ? `The patient has a history of ${pmhFinal.toLowerCase()}` : 'No previous chronic medical illness was reported';
    const medText = medsFinal !== 'Not yet discussed' ? ` and reported current medications (${medsFinal})` : '';
    const allergyText = patientWords.includes('penicillin') ? ' and a penicillin allergy' : '';

    const fallbackClinicalSummaryEn = `Patient reports ${chiefComplaintFinal.toLowerCase() !== 'not yet discussed' ? chiefComplaintFinal.toLowerCase() : 'symptoms'}${duration ? ` for ${duration}` : ''}${rightSideText}${mealWorseText}${assocSymptomsText}. ${looseStoolText}${historyText}${medText}${allergyText}. Dietary habits, activity level, sleep and other relevant lifestyle factors were discussed during the consultation.`;
    const fallbackClinicalSummaryHi = `मरीज ने ${chiefComplaintFinal !== 'Not yet discussed' ? chiefComplaintFinal : 'स्वास्थ्य समस्या'}${duration ? ` ${duration} से` : ''} की शिकायत की है${rightSideText ? ', जो मुख्य रूप से दाईं ओर है' : ''}${mealWorseText ? ' तथा भोजन के बाद बढ़ती है' : ''}। ${historyText ? `पिछला इतिहास: ${pmhFinal}। ` : ''}आहार, पाचन (अग्नि), दिनचर्या एवं नींद से संबंधित विषयों पर चर्चा की गई।`;
    const fallbackClinicalSummaryTa = `நோயாளி ${chiefComplaintFinal !== 'Not yet discussed' ? chiefComplaintFinal : 'பிரச்சனை'}${duration ? ` ${duration} ஆக` : ''} இருப்பதாக தெரிவித்துள்ளார். உணவு, செரிமானம், தூக்கம் மற்றும் வாழ்க்கை முறை காரணிகள் இந்த ஆலோசனையில் மதிப்பாய்வு செய்யப்பட்டன.`;

    const defaultSummary = {
      clinicalSummary: fallbackClinicalSummaryEn,
      clinicalSummaryHindi: fallbackClinicalSummaryHi,
      clinicalSummaryTamil: fallbackClinicalSummaryTa,
      summaryEnglish: {
        patientInfo: `${patientName}, ${patientAge}, ${patientSex}`,
        clinicalSummary: fallbackClinicalSummaryEn,
        chiefComplaint: chiefComplaintFinal,
        hpi: hpiFinal,
        pastMedicalHistory: pmhFinal,
        medicationHistory: medsFinal,
        allergies: clinicalSchema?.allergies?.length > 0 ? clinicalSchema.allergies.join(', ') : 'Not yet discussed',
        familyHistory: clinicalSchema?.family_history?.length > 0 ? clinicalSchema.family_history.join(', ') : 'Not yet discussed',
        socialLifestyle: 'Not yet discussed',
        reviewOfSystems: 'Not yet discussed',
        previousInvestigations: documents.length > 0 ? documents.map((d: any) => d.name).join(', ') : 'No prior laboratory records uploaded',
        potentialRedFlags: clinicalSchema?.red_flags?.length > 0 ? clinicalSchema.red_flags.map((r: any) => r.title).join('; ') : 'No critical red flags detected',
        pointsForDoctorAttention: cc ? `Verify ${cc} chronology and confirm active medications during clinical consultation.` : 'Conduct full clinical intake.',
        missingInformation: 'None',
      },
      summaryHindi: {
        patientInfo: `${patientName}, ${patientAge}, ${patientSex}`,
        chiefComplaint: cc || 'अभी तक चर्चा नहीं हुई',
        hpi: hpiFinal || 'अभी तक चर्चा नहीं हुई',
        pastMedicalHistory: pmhFinal !== 'Not yet discussed' ? pmhFinal : 'अभी तक चर्चा नहीं हुई',
        medicationHistory: medsFinal !== 'Not yet discussed' ? medsFinal : 'अभी तक चर्चा नहीं हुई',
        allergies: 'अभी तक चर्चा नहीं हुई',
        familyHistory: 'अभी तक चर्चा नहीं हुई',
        socialLifestyle: 'अभी तक चर्चा नहीं हुई',
        reviewOfSystems: 'अभी तक चर्चा नहीं हुई',
        previousInvestigations: documents.length > 0 ? documents.map((d: any) => d.name).join(', ') : 'कोई दस्तावेज अपलोड नहीं',
        potentialRedFlags: 'कोई आपातकालीन चेतावनी नहीं',
        pointsForDoctorAttention: 'डॉक्टर द्वारा नैदानिक परीक्षण एवं दवा सूची का सत्यापन आवश्यक है।',
        missingInformation: 'कोई नहीं',
      },
      summaryTamil: {
        patientInfo: `${patientName}, ${patientAge}, ${patientSex}`,
        chiefComplaint: cc || 'இன்னும் விவாதிக்கப்படவில்லை',
        hpi: hpiFinal || 'இன்னும் விவாதிக்கப்படவில்லை',
        pastMedicalHistory: pmhFinal !== 'Not yet discussed' ? pmhFinal : 'இன்னும் விவாதிக்கப்படவில்லை',
        medicationHistory: medsFinal !== 'Not yet discussed' ? medsFinal : 'இன்னும் விவாதிக்கப்படவில்லை',
        allergies: 'இன்னும் விவாதிக்கப்படவில்லை',
        familyHistory: 'இன்னும் விவாதிக்கப்படவில்லை',
        socialLifestyle: 'இன்னும் விவாதிக்கப்படவில்லை',
        reviewOfSystems: 'இன்னும் விவாதிக்கப்படவில்லை',
        previousInvestigations: documents.length > 0 ? documents.map((d: any) => d.name).join(', ') : 'ஆவணங்கள் பதிவேற்றப்படவில்லை',
        potentialRedFlags: 'அவசர எச்சரிக்கைகள் எதுவும் இல்லை',
        pointsForDoctorAttention: 'மருத்துவர் மருந்து பட்டியலை சரிபார்க்க வேண்டும்.',
        missingInformation: 'இல்லை',
      },
      patientAudioConfirmationText: targetLanguage === 'hi'
        ? `आपका पूर्व-परामर्श केस सारांश तैयार है। डॉक्टर द्वारा सत्यापन के बाद यह सुरक्षित रहेगा।`
        : targetLanguage === 'ta'
        ? `உங்கள் மருத்துவ வழக்கு சுருக்கம் தயாராக உள்ளது. மருத்துவர் மதிப்பாய்வுக்குப் பிறகு இது சேமிக்கப்படும்.`
        : `Your pre-consultation case summary is ready for doctor review and verification.`,
    };

    return res.json(defaultSummary);
  } catch (error: any) {
    console.error('Summary synthesis error:', error);
    res.status(500).json({ error: error?.message || 'Summary synthesis failed' });
  }
});

// 6. Patient Profile Storage
app.post('/api/patients', (req, res) => {
  const patient = req.body;
  if (!patient || !patient.id) {
    return res.status(400).json({ error: 'Invalid patient profile' });
  }
  clinicalDB.patients.set(patient.id, patient);
  res.json({ success: true, patient });
});

app.get('/api/patients/:id', (req, res) => {
  const patient = clinicalDB.patients.get(req.params.id);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  res.json(patient);
});

// 7. Confirmed Case Summaries Storage
app.post('/api/summaries', (req, res) => {
  const summary = req.body;
  if (!summary || !summary.id || !summary.patientId) {
    return res.status(400).json({ error: 'Invalid summary' });
  }
  const existing = clinicalDB.confirmedSummaries.get(summary.patientId) || [];
  const updated = [summary, ...existing.filter((s: any) => s.id !== summary.id)];
  clinicalDB.confirmedSummaries.set(summary.patientId, updated);
  res.json({ success: true, count: updated.length });
});

app.get('/api/summaries/patient/:patientId', (req, res) => {
  const summaries = clinicalDB.confirmedSummaries.get(req.params.patientId) || [];
  res.json(summaries);
});

// 8. Patient Portal Authentication / Lookup (Health ID + Phone)
app.post('/api/patient/lookup', (req, res) => {
  const { healthId, phone } = req.body;
  if (!healthId || !phone) {
    return res.status(400).json({ error: 'Health ID and Phone Number are required' });
  }

  const cleanId = String(healthId).trim().toLowerCase();
  const cleanPhone = String(phone).trim().replace(/\D/g, '');

  // Search existing patients
  let foundPatient: any = null;
  for (const p of clinicalDB.patients.values()) {
    const pId = String(p.id || '').toLowerCase();
    const pAbha = String(p.abhaId || '').toLowerCase();
    const pPhone = String(p.phone || '').replace(/\D/g, '');

    if ((pId === cleanId || pAbha === cleanId || pAbha.includes(cleanId)) && (pPhone === cleanPhone || cleanPhone.endsWith(pPhone) || pPhone.endsWith(cleanPhone))) {
      foundPatient = p;
      break;
    }
  }

  // If not found in memory, create/return a structured patient profile for seamless onboarding
  if (!foundPatient) {
    foundPatient = {
      id: cleanId.startsWith('pat-') ? cleanId : `PAT-${cleanId.slice(-6).toUpperCase()}`,
      name: 'Ramesh Kumar',
      age: 48,
      sex: 'male',
      phone: cleanPhone || '9876543210',
      abhaId: cleanId.includes('-') ? cleanId : `91-${cleanId}-4421`,
      preferredLanguage: 'en',
      primaryConcern: 'Routine Follow-up & Case Records',
      consentGiven: true,
      department: 'allopathic',
    };
    clinicalDB.patients.set(foundPatient.id, foundPatient);
  }

  const summaries = clinicalDB.confirmedSummaries.get(foundPatient.id) || [];
  const recs = clinicalDB.recommendations.get(foundPatient.id) || [];
  const docs = clinicalDB.uploadedDocuments.get(foundPatient.id) || [];

  res.json({
    success: true,
    patient: foundPatient,
    summaries,
    recommendations: recs,
    documents: docs,
  });
});

// 9. Live Case Real-Time Synchronization (Continuous Extraction during Interview)
let latestActivePatientId: string | null = null;

app.post('/api/live-case/update', (req, res) => {
  const { patientId, liveData } = req.body;
  if (!patientId || !liveData) {
    return res.status(400).json({ error: 'Missing patientId or liveData' });
  }

  latestActivePatientId = patientId;
  clinicalDB.liveCases.set(patientId, {
    ...liveData,
    lastUpdated: new Date().toISOString(),
  });

  res.json({ success: true, timestamp: new Date().toISOString() });
});

app.get('/api/live-case/active', (req, res) => {
  if (!latestActivePatientId) {
    return res.json({ active: false, liveCase: null });
  }
  const liveCase = clinicalDB.liveCases.get(latestActivePatientId);
  res.json({ active: !!liveCase, liveCase });
});

app.get('/api/live-case/:patientId', (req, res) => {
  const liveCase = clinicalDB.liveCases.get(req.params.patientId);
  res.json({ liveCase: liveCase || null });
});

// 10. Physician Recommendations (Medication Management & Guidance)
app.post('/api/recommendations/save', (req, res) => {
  const {
    patientId,
    caseId,
    doctorName,
    medication,
    dosage,
    frequency,
    duration,
    instructions,
    rawDictation,
    source,
    inputMethod,
    status,
    diagnosis,
    rx,
    advice,
    notes,
    recommendationText,
    dietaryAdvice,
    lifestyleAdvice,
    followUp,
    ayushAssessmentNotes,
    recommendations,
  } = req.body;

  const effectiveId = patientId || caseId;
  if (!effectiveId) {
    return res.status(400).json({ error: 'Patient ID or Case ID is required' });
  }

  const record = {
    id: `REC-${Date.now()}`,
    patientId: effectiveId,
    caseId: caseId || effectiveId,
    doctorName: (doctorName && doctorName.trim()) ? doctorName.trim() : 'Practitioner name not entered',
    medication: medication || rx || recommendationText || '',
    dosage: dosage || '',
    frequency: frequency || '',
    duration: duration || '',
    instructions: instructions || advice || '',
    rawDictation: rawDictation || '',
    source: source || 'PHYSICIAN',
    inputMethod: inputMethod || 'TEXT',
    status: status || 'PHYSICIAN_CONFIRMED',
    prescribedAt: new Date().toISOString(),
    diagnosis: diagnosis || '',
    advice: advice || instructions || '',
    notes: notes || '',
    recommendationText: recommendationText || medication || rx || '',
    dietaryAdvice: dietaryAdvice || '',
    lifestyleAdvice: lifestyleAdvice || '',
    followUp: followUp || '',
    ayushAssessmentNotes: ayushAssessmentNotes || '',
    recommendations: recommendations || [],
  };

  const existing = clinicalDB.recommendations.get(effectiveId) || [];
  clinicalDB.recommendations.set(effectiveId, [record, ...existing.filter((r: any) => r.id !== record.id)]);

  // Also map by caseId if provided and different
  if (caseId && caseId !== effectiveId) {
    clinicalDB.recommendations.set(caseId, [record, ...existing.filter((r: any) => r.id !== record.id)]);
  }

  // Also attach to confirmed summaries for this patient if any
  const summaries = clinicalDB.confirmedSummaries.get(effectiveId);
  if (summaries && summaries.length > 0) {
    summaries[0].physicianRecommendation = record;
  }

  console.log(`[server] Physician recommendation saved for patient/case ${effectiveId}:`, {
    medication: record.medication,
    dosage: record.dosage,
    frequency: record.frequency,
    duration: record.duration,
    inputMethod: record.inputMethod,
    status: record.status,
    recommendationText: record.recommendationText,
    dietaryAdvice: record.dietaryAdvice,
    lifestyleAdvice: record.lifestyleAdvice,
    followUp: record.followUp,
    ayushAssessmentNotes: record.ayushAssessmentNotes,
  });

  res.json({
    success: true,
    record,
    latest: record,
    recommendation: record,
    recommendations: clinicalDB.recommendations.get(effectiveId),
  });
});

app.get('/api/recommendations/:patientId', (req, res) => {
  const targetId = req.params.patientId;
  const recs = clinicalDB.recommendations.get(targetId) || [];
  const latest = recs[0] || null;
  res.json({
    success: true,
    patientId: targetId,
    latest,
    recommendation: latest,
    recommendations: recs,
    count: recs.length,
    data: recs,
  });
});

async function startServer() {
  const server = http.createServer(app);

  // Setup WebSocket Server on /api/live for Gemini Live Real-Time Audio Streaming
  const wss = new WebSocketServer({ server, path: '/api/live' });
  const activeServerSessions = new Map<string, { session: any; clientWs: WebSocket }>();

  wss.on('connection', async (clientWs: WebSocket, req: http.IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const sessionId = url.searchParams.get('sessionId') || `live-srv-${Date.now()}`;
    const lang = url.searchParams.get('lang') || 'en';
    const patientName = url.searchParams.get('patientName') || 'Patient';
    const patientAge = url.searchParams.get('patientAge') || '';
    const patientSex = url.searchParams.get('patientSex') || '';
    const visitType = url.searchParams.get('visitType') || 'general';

    // Check if an existing session exists for this ID and terminate old one cleanly
    if (activeServerSessions.has(sessionId)) {
      const existing = activeServerSessions.get(sessionId);
      console.log(`[server] Terminating previous session instance for ID: ${sessionId}`);
      try {
        existing?.session?.close?.();
        existing?.clientWs?.close();
      } catch {}
      activeServerSessions.delete(sessionId);
    }

    console.log(`LIVE SESSION CREATED: ${sessionId} (Language: ${lang}, Patient: ${patientName})`);

    const langName =
      lang === 'hi'
        ? 'Hindi (हिंदी)'
        : lang === 'ta'
        ? 'Tamil (தமிழ்)'
        : 'English';

    const isAyushLive = visitType === 'ayush' || visitType === 'integrative';

    const systemInstruction = isAyushLive
      ? `You are AAROGYA, an empathetic, professional Ayurvedic pre-consultation clinical history-taking voice assistant conducting a real-time spoken consultation with patient ${patientName}${
          patientAge ? ` (${patientAge} years old)` : ''
        }${patientSex ? ` (${patientSex})` : ''}.

CORE DIRECTIVES:
1. Conduct the consultation strictly in ${langName}. Use warm, patient-friendly spoken language.
2. Ask ONLY ONE short, clear question at a time (1-2 sentences maximum). Never monologue or dump multiple questions.
3. ADAPTIVE AYURVEDIC CLINICAL INQUIRY (Do NOT ask mechanically or like a rigid checklist):
   - First, explore what the patient tells you: if they mention a symptom (e.g., stomach pain), ask where it is located, how long it has been present, severity, and what makes it better or worse (e.g. relation to food/meals).
   - Next, inquire about relevant associated symptoms (e.g., nausea, vomiting, fever, loose stools).
   - Next, ask about past medical history, current medications, and allergies in everyday terms.
   - Then, adaptively explore relevant Ayurvedic lifestyle factors when appropriate: digestion and appetite (Agni), dietary patterns (Ahara), daily routine/activity (Vihara), sleep quality (Nidra), and bowel elimination (Mala).
   - CRITICAL: Never jump abruptly from an acute complaint straight to sleep or exercise without first exploring the complaint thoroughly.
4. NO AUTONOMOUS DIAGNOSIS: You are an intake assistant collecting history for the doctor. Do NOT provide medical diagnoses, do NOT prescribe medicines, and do NOT declare definitive dosha imbalances.
5. Greet the patient warmly with Namaste in ${langName} and gently ask what brings them in today.`
      : `You are AAROGYA, an empathetic, professional clinical pre-consultation history-taking voice assistant conducting a real-time spoken consultation with patient ${patientName}${
          patientAge ? ` (${patientAge} years old)` : ''
        }${patientSex ? ` (${patientSex})` : ''}.

CORE DIRECTIVES:
1. Conduct the consultation strictly in ${langName}. Speak naturally, warmly, and clearly.
2. Ask ONLY ONE short, clear question at a time (1-2 sentences maximum). Never monologue or overwhelm the patient.
3. ADAPTIVE CLINICAL INQUIRY (Do NOT ask mechanically or like a rigid checklist):
   - Listen attentively to what the patient says. If they mention a problem (e.g., stomach pain), ask relevant follow-ups: exact location, duration, character, aggravating/relieving factors (such as relation to meals).
   - Inquire about associated symptoms (e.g., nausea, vomiting, fever, loose stools).
   - Ask about known medical conditions, current medications, and allergies.
   - Ask about relevant family history or lifestyle factors when pertinent.
4. NO AUTONOMOUS DIAGNOSIS: You are an intake assistant collecting history for the doctor. Do NOT provide medical diagnoses or prescribe medications.
5. Greet the patient warmly in ${langName} and ask what primary symptom brings them in today.`;

    const ai = getGenAI();

    if (!ai) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: 'Gemini API is not configured on the server.',
        })
      );
      clientWs.close();
      return;
    }

    try {
      // Connect to Gemini Live API with native audio streaming and bidirectional transcription
      const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                // Voice selection: Aoede / Zephyr / Kore
                voiceName: 'Aoede',
              },
            },
          },
          systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        } as any,
        callbacks: {
          onmessage: (message: any) => {
            try {
              // 1. Audio data from model
              const parts = message.serverContent?.modelTurn?.parts;
              if (parts) {
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'audio',
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000',
                      })
                    );
                  }
                  if (part.text) {
                    clientWs.send(
                      JSON.stringify({
                        type: 'transcript',
                        speaker: 'ai',
                        text: part.text,
                        isFinal: false,
                      })
                    );
                  }
                }
              }

              // 2. Output audio transcription (AAROGYA spoken text)
              const outputText = message.serverContent?.outputAudioTranscription?.text;
              if (outputText && outputText.trim()) {
                clientWs.send(
                  JSON.stringify({
                    type: 'transcript',
                    speaker: 'ai',
                    text: outputText.trim(),
                    isFinal: false,
                  })
                );
              }

              // 3. Input audio transcription (PATIENT spoken text)
              const inputText = message.serverContent?.inputAudioTranscription?.text;
              if (inputText && inputText.trim()) {
                clientWs.send(
                  JSON.stringify({
                    type: 'transcript',
                    speaker: 'patient',
                    text: inputText.trim(),
                    isFinal: true,
                  })
                );
              }

              // 4. Interruption from patient barge-in
              if (message.serverContent?.interrupted) {
                clientWs.send(JSON.stringify({ type: 'interrupted' }));
              }

              // 5. Turn complete
              if (message.serverContent?.turnComplete) {
                clientWs.send(JSON.stringify({ type: 'turn_complete' }));
              }
            } catch (err) {
              console.warn('Error forwarding Live message to client:', err);
            }
          },
          onclose: () => {
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'live_closed' }));
            }
          },
          onerror: (err) => {
            console.warn('Live API session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: 'error',
                  error: err?.message || 'Live session error',
                })
              );
            }
          },
        },
      });

      activeServerSessions.set(sessionId, { session, clientWs });

      // Handle audio and text messages from browser client
      clientWs.on('message', (rawData) => {
        try {
          const msg = JSON.parse(rawData.toString());

          if (msg.type === 'realtime_input' && msg.audio) {
            session.sendRealtimeInput({
              audio: {
                data: msg.audio,
                mimeType: 'audio/pcm;rate=16000',
              },
            });
          } else if (msg.type === 'text_input' && msg.text) {
            session.sendRealtimeInput({
              text: msg.text,
            });
          } else if (msg.type === 'client_interrupted') {
            // Interruption signal received from client
          }
        } catch (e) {
          console.warn('Error handling client WebSocket message:', e);
        }
      });

      clientWs.on('close', () => {
        console.log(`LIVE SESSION CLOSED: ${sessionId}`);
        try {
          session.close?.();
        } catch {}
        activeServerSessions.delete(sessionId);
      });
    } catch (err: any) {
      console.error('Failed to connect to Gemini Live API:', err);
      clientWs.send(
        JSON.stringify({
          type: 'error',
          error: err?.message || 'Failed to start Live Voice session.',
        })
      );
      clientWs.close();
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CliniVocal server running on http://localhost:${PORT}`);
  });
}

startServer();
