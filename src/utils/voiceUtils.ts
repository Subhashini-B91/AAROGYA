import { Language } from '../types';

export interface VoiceAvailability {
  sttAvailable: boolean;
  ttsAvailable: boolean;
  matchedVoiceName?: string;
  langCode: string;
}

export function getLanguageCode(lang: Language): string {
  switch (lang) {
    case 'hi':
      return 'hi-IN';
    case 'ta':
      return 'ta-IN';
    case 'en':
    default:
      return 'en-IN';
  }
}

export function checkVoiceSupport(lang: Language): Promise<VoiceAvailability> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({ sttAvailable: false, ttsAvailable: false, langCode: getLanguageCode(lang) });
    }

    const langCode = getLanguageCode(lang);
    const hasSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasTTS = 'speechSynthesis' in window;

    if (!hasTTS) {
      return resolve({
        sttAvailable: hasSTT,
        ttsAvailable: false,
        langCode,
      });
    }

    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const prefix = lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'ta';
      const matched = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith(prefix) ||
          v.lang.toLowerCase().includes(prefix) ||
          v.name.toLowerCase().includes(lang === 'hi' ? 'hindi' : lang === 'ta' ? 'tamil' : 'english')
      );

      resolve({
        sttAvailable: hasSTT,
        ttsAvailable: !!matched,
        matchedVoiceName: matched?.name,
        langCode,
      });
    };

    const initialVoices = window.speechSynthesis.getVoices();
    if (initialVoices.length > 0) {
      checkVoices();
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        checkVoices();
      };
      // Timeout fallback in case onvoiceschanged does not fire
      setTimeout(() => {
        checkVoices();
      }, 500);
    }
  });
}

export function speakText(
  text: string,
  lang: Language,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: (err: unknown) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.('SpeechSynthesis unsupported');
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any pending utterances
    const langCode = getLanguageCode(lang);
    const voices = window.speechSynthesis.getVoices();
    const prefix = lang === 'en' ? 'en' : lang === 'hi' ? 'hi' : 'ta';
    const matchedVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith(prefix) ||
        v.name.toLowerCase().includes(lang === 'hi' ? 'hindi' : lang === 'ta' ? 'tamil' : 'english')
    );

    if (!matchedVoice && lang !== 'en') {
      // Graceful fallback: do not fail with error modal, just return false
      onError?.('No voice found for language');
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = matchedVoice ? matchedVoice.lang : langCode;
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
    utterance.rate = 0.95; // Clear natural rate for healthcare intake
    utterance.pitch = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => onEnd?.();
    utterance.onerror = (e) => {
      console.warn('Speech synthesis minor error/interruption:', e);
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (err) {
    console.warn('Silent voice synthesis fallback:', err);
    onError?.(err);
    return false;
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export class BrowserSpeechRecognizer {
  private recognition: any = null;
  private isListening = false;
  private shouldKeepListening = false;
  private restartTimer: any = null;

  constructor(
    private lang: Language,
    private onResult: (transcript: string, isFinal: boolean) => void,
    private onError: (error: string) => void,
    private onStateChange: (state: 'idle' | 'listening' | 'processing') => void,
    private continuousMode = true
  ) {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = continuousMode;
        this.recognition.interimResults = true;
        this.recognition.lang = getLanguageCode(lang);

        this.recognition.onstart = () => {
          this.isListening = true;
          this.onStateChange('listening');
        };

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            this.onResult(finalTranscript.trim(), true);
          } else if (interimTranscript) {
            this.onResult(interimTranscript.trim(), false);
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition event:', event.error);
          this.isListening = false;
          this.onStateChange('idle');
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            this.onError(event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.onStateChange('idle');
          if (this.shouldKeepListening) {
            clearTimeout(this.restartTimer);
            this.restartTimer = setTimeout(() => {
              if (this.shouldKeepListening) {
                try {
                  this.recognition.lang = getLanguageCode(this.lang);
                  this.recognition.start();
                } catch {
                  // retry
                }
              }
            }, 300);
          }
        };
      }
    }
  }

  public setLanguage(lang: Language) {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = getLanguageCode(lang);
    }
  }

  public start() {
    if (!this.recognition) {
      this.onError('Speech recognition not supported in this browser');
      return;
    }
    this.shouldKeepListening = true;
    if (this.isListening) return;

    try {
      this.recognition.lang = getLanguageCode(this.lang);
      this.recognition.start();
    } catch (e) {
      console.warn('Speech recognition start error:', e);
    }
  }

  public stop() {
    this.shouldKeepListening = false;
    clearTimeout(this.restartTimer);
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListening = false;
    }
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

export function startSpeechRecognition(
  lang: Language,
  onResult: (transcript: string, isFinal: boolean) => void,
  onError?: (error: string) => void,
  onEnd?: () => void
): { stop: () => void } {
  if (!isSpeechRecognitionSupported()) {
    onError?.('Speech recognition not supported');
    return { stop: () => {} };
  }

  try {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = getLanguageCode(lang);

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        onResult(finalTranscript.trim(), true);
      } else if (interimTranscript) {
        onResult(interimTranscript.trim(), false);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      onError?.(event.error);
    };

    recognition.onend = () => {
      onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  } catch (err: any) {
    console.warn('Speech recognition init error:', err);
    onError?.(err?.message || 'Error initializing voice');
    return { stop: () => {} };
  }
}
