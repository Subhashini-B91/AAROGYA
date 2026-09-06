export interface ParsedRecommendation {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  rawText: string;
}

/**
 * Parses physician speech-to-text or typed dictation into structured clinical fields
 * while strictly following the clinical rule:
 * - DO NOT invent or guess missing medications or dosages.
 * - If the doctor says "Continue the current medication.", store the exact statement.
 */
export function parsePhysicianDictation(rawText: string): ParsedRecommendation {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      medication: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      rawText: '',
    };
  }

  let medication = '';
  let dosage = '';
  let frequency = '';
  let duration = '';
  let instructions = '';

  // Remove leading polite or introductory conversational phrases
  let cleanText = text
    .replace(/^(?:the\s+patient\s+should\s+take|patient\s+should\s+take|please\s+give|take|start|prescribe|advise|give)\s+/i, '')
    .trim();

  // 1. Extract Dosage (e.g. "500 milligrams", "500 mg", "500mg", "10 ml", "40mg", "3g")
  const dosageMatch = cleanText.match(
    /\b(\d+(?:\.\d+)?\s*(?:milligrams?|mg|grams?|gm|g|milliliters?|ml|micrograms?|mcg|tablets?|tabs?|capsules?|caps?|drops?|teaspoons?|tsp|puffs?|IU))\b/i
  );

  // 2. Extract Duration (e.g. "for 2 days", "for two days", "5 days", "1 week", "2 weeks")
  const durationMatch = cleanText.match(
    /\b(?:for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fourteen|twenty|thirty)\s+(days?|weeks?|months?)\b/i
  );

  // 3. Extract Frequency (e.g. "twice daily", "once daily", "three times daily", "every 8 hours", "OD", "BD", "TDS")
  const frequencyMatch = cleanText.match(
    /\b(twice\s+daily|once\s+daily|thrice\s+daily|three\s+times\s+(?:a\s+)?day|three\s+times\s+daily|two\s+times\s+(?:a\s+)?day|four\s+times\s+daily|every\s+\d+\s+hours|at\s+bedtime|morning\s+and\s+night|OD|BD|TDS|QID|SOS|as\s+needed)\b/i
  );

  // 4. Extract Dosage value & normalize units
  if (dosageMatch) {
    let d = dosageMatch[1].trim();
    if (/milligrams?/i.test(d)) {
      d = d.replace(/milligrams?/i, 'mg');
    } else if (/milliliters?/i.test(d)) {
      d = d.replace(/milliliters?/i, 'ml');
    }
    dosage = d;
  }

  // 5. Extract Duration value
  if (durationMatch) {
    const numWord = durationMatch[1].toLowerCase();
    const unit = durationMatch[2].toLowerCase();
    const wordMap: Record<string, string> = {
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
      twelve: '12',
      fourteen: '14',
      twenty: '20',
      thirty: '30',
    };
    const num = wordMap[numWord] || numWord;
    duration = `${num} ${unit}`;
  }

  // 6. Extract Frequency value
  if (frequencyMatch) {
    const f = frequencyMatch[1].trim();
    frequency = f.charAt(0).toUpperCase() + f.slice(1);
  }

  // 7. Extract Medication name (words immediately before dosage)
  if (dosageMatch && dosageMatch.index !== undefined && dosageMatch.index > 0) {
    const candidate = cleanText.slice(0, dosageMatch.index).trim();
    const cleanedMed = candidate
      .replace(/^(?:tab|tablet|syp|syrup|cap|capsule|inj|injection)\s+/i, '')
      .replace(/\s+of$/i, '')
      .trim();

    if (cleanedMed.length >= 2) {
      medication = cleanedMed.charAt(0).toUpperCase() + cleanedMed.slice(1);
    }
  }

  // 8. Extract Instructions (look for phrases after food / with water / dietary notes)
  // Find what remains after medication, dosage, frequency, and duration
  let instructionCandidate = '';
  const instructionKeywords = cleanText.match(/\b((?:after|before|with)\s+(?:food|meals|breakfast|dinner|lunch|water|milk)|empty\s+stomach|maintain.*|avoid.*|return.*|follow\s+up.*)/i);
  
  if (instructionKeywords) {
    instructionCandidate = instructionKeywords[1].trim();
  }

  // Also check whatever comes after the main matches
  let lastIndex = 0;
  if (dosageMatch && dosageMatch.index !== undefined) {
    lastIndex = Math.max(lastIndex, dosageMatch.index + dosageMatch[0].length);
  }
  if (frequencyMatch && frequencyMatch.index !== undefined) {
    lastIndex = Math.max(lastIndex, frequencyMatch.index + frequencyMatch[0].length);
  }
  if (durationMatch && durationMatch.index !== undefined) {
    lastIndex = Math.max(lastIndex, durationMatch.index + durationMatch[0].length);
  }

  const remainder = cleanText.slice(lastIndex).trim();
  if (remainder) {
    const cleanedRem = remainder
      .replace(/^(?:for\s+\d+\s+(?:days?|weeks?|months?)\s*)/i, '')
      .replace(/^[,\.\-\s]+/, '')
      .trim();

    if (cleanedRem.length > 0) {
      if (!instructionCandidate || cleanedRem.length > instructionCandidate.length) {
        instructionCandidate = cleanedRem;
      }
    }
  }

  if (instructionCandidate) {
    instructions = instructionCandidate.charAt(0).toUpperCase() + instructionCandidate.slice(1);
    if (!instructions.endsWith('.')) {
      instructions += '.';
    }
  } else if (!medication && !dosage) {
    // If no medication or dosage could be found, store the physician's full statement as instructions
    instructions = text;
  }

  return {
    medication,
    dosage,
    frequency,
    duration,
    instructions,
    rawText: text,
  };
}
