import { Language } from '../types';
import { stopSpeaking } from './voiceUtils';

export type LiveVoiceState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'error';

export interface VoiceDiagnostics {
  activeLiveSessions: number;
  activeMicrophoneStreams: number;
  activeAudioContexts: number;
  activePlaybackPipelines: number;
  sessionId: string | null;
}

export interface VoiceSessionConfig {
  language: Language;
  patientName: string;
  patientAge?: number | string;
  patientSex?: string;
  visitType: 'allopathic' | 'ayush';
  onStateChange: (state: LiveVoiceState) => void;
  onTranscript: (speaker: 'ai' | 'patient', text: string, isFinal?: boolean) => void;
  onVolumeChange: (inputVol: number, outputVol: number) => void;
  onError: (error: string) => void;
  onDiagnosticsUpdate?: (diagnostics: VoiceDiagnostics) => void;
}

class VoiceSessionController {
  // SINGLE SOURCE OF TRUTH (Singleton Architecture)
  private activeLiveSession: WebSocket | null = null;
  private activeAudioStream: MediaStream | null = null;
  private activeInputAudioContext: AudioContext | null = null;
  private activeOutputAudioContext: AudioContext | null = null;
  private activeScriptProcessor: ScriptProcessorNode | null = null;
  private activeSourceNode: MediaStreamAudioSourceNode | null = null;
  private activePlaybackQueue: AudioBufferSourceNode[] = [];

  private activeSessionId: string | null = null;
  private currentConfig: VoiceSessionConfig | null = null;
  private state: LiveVoiceState = 'disconnected';
  private isMuted: boolean = false;
  private isModelSpeaking: boolean = false;
  private isUserTalking: boolean = false;
  private scheduledTime: number = 0;
  private speechDebounceTimer: any = null;
  private connectionPromise: Promise<void> | null = null;

  public getDiagnostics(): VoiceDiagnostics {
    const liveSessions =
      this.activeLiveSession && this.activeLiveSession.readyState === WebSocket.OPEN
        ? 1
        : this.activeLiveSession
        ? 1
        : 0;
    const micStreams = this.activeAudioStream && this.activeAudioStream.active ? 1 : 0;
    const audioContexts =
      (this.activeInputAudioContext ? 1 : 0) + (this.activeOutputAudioContext ? 1 : 0) > 0 ? 1 : 0;
    const playbackPipelines = this.activeOutputAudioContext ? 1 : 0;

    return {
      activeLiveSessions: liveSessions,
      activeMicrophoneStreams: micStreams,
      activeAudioContexts: audioContexts,
      activePlaybackPipelines: playbackPipelines,
      sessionId: this.activeSessionId,
    };
  }

  // Development Diagnostics Logger
  public printDiagnostics(eventTag: string) {
    const diag = this.getDiagnostics();
    console.log(
      `[VoiceDiagnostics - ${eventTag}] Active Live sessions: ${diag.activeLiveSessions}/1 | Active microphone streams: ${diag.activeMicrophoneStreams}/1 | Active audio contexts: ${diag.activeAudioContexts}/1 | Active playback pipelines: ${diag.activePlaybackPipelines}/1 | SessionId: ${
        diag.sessionId || 'none'
      }`
    );
    if (this.currentConfig?.onDiagnosticsUpdate) {
      this.currentConfig.onDiagnosticsUpdate(diag);
    }
  }

  public getSessionId(): string | null {
    return this.activeSessionId;
  }

  public getState(): LiveVoiceState {
    return this.state;
  }

  public async startSession(config: VoiceSessionConfig): Promise<void> {
    // 1. Wait if another connection is in flight
    if (this.connectionPromise) {
      try {
        await this.connectionPromise;
      } catch {}
    }

    // 2. Check if an active session already exists with identical parameters -> reuse it
    if (
      this.activeLiveSession &&
      this.activeLiveSession.readyState === WebSocket.OPEN &&
      this.currentConfig &&
      this.currentConfig.patientName === config.patientName &&
      this.currentConfig.language === config.language &&
      this.currentConfig.visitType === config.visitType
    ) {
      console.log(`[VoiceSessionManager] Reusing active session: ${this.activeSessionId}`);
      this.currentConfig = config;
      this.notifyState(this.state);
      this.printDiagnostics('SESSION_REUSED');
      return;
    }

    // 3. Completely close and clean up any old session first
    this.endSession();

    // 4. Create new unique session ID
    const newSessionId = 'ses_' + Math.random().toString(36).substring(2, 9);
    this.activeSessionId = newSessionId;
    this.currentConfig = config;
    this.isMuted = false;
    this.isModelSpeaking = false;
    this.isUserTalking = false;
    this.scheduledTime = 0;

    console.log(`LIVE SESSION CREATED: ${newSessionId}`);
    this.printDiagnostics('SESSION_CREATED');

    // Silence any background browser speech synthesis
    stopSpeaking();

    this.connectionPromise = this.internalConnect(newSessionId, config);
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async internalConnect(sessionId: string, config: VoiceSessionConfig): Promise<void> {
    this.setState('connecting');

    try {
      // Step 1: Open single microphone MediaStream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Verify session was not cancelled during getUserMedia
      if (this.activeSessionId !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      this.activeAudioStream = stream;

      // Step 2: Open single AudioContexts
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.activeInputAudioContext = new AudioCtx({ sampleRate: 16000 });
      this.activeOutputAudioContext = new AudioCtx({ sampleRate: 24000 });

      if (this.activeInputAudioContext.state === 'suspended') {
        await this.activeInputAudioContext.resume();
      }
      if (this.activeOutputAudioContext.state === 'suspended') {
        await this.activeOutputAudioContext.resume();
      }

      if (this.activeSessionId !== sessionId) {
        this.endSession();
        return;
      }

      // Step 3: Setup single WebSocket connection to server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const params = new URLSearchParams({
        lang: config.language,
        patientName: config.patientName || 'Patient',
        patientAge: String(config.patientAge || ''),
        patientSex: String(config.patientSex || ''),
        visitType: config.visitType,
        sessionId,
      });

      const wsUrl = `${protocol}//${host}/api/live?${params.toString()}`;
      const ws = new WebSocket(wsUrl);
      this.activeLiveSession = ws;

      ws.onopen = () => {
        if (this.activeSessionId !== sessionId) {
          ws.close();
          return;
        }
        this.setState('connected');
        this.startMicPipeline(sessionId);
        this.printDiagnostics('SESSION_CONNECTED');
      };

      ws.onmessage = (event) => {
        if (this.activeSessionId !== sessionId) return;
        this.handleServerMessage(event.data);
      };

      ws.onerror = (err) => {
        if (this.activeSessionId !== sessionId) return;
        console.warn(`[VoiceSessionManager ${sessionId}] WebSocket error:`, err);
        this.currentConfig?.onError('Connection issue with live voice assistant.');
        this.setState('error');
      };

      ws.onclose = () => {
        if (this.activeSessionId === sessionId && this.state !== 'disconnected') {
          this.setState('disconnected');
          this.printDiagnostics('SESSION_WS_CLOSED');
        }
      };
    } catch (err: any) {
      if (this.activeSessionId === sessionId) {
        console.error(`[VoiceSessionManager ${sessionId}] Initialization failure:`, err);
        this.currentConfig?.onError(
          err?.message || 'Unable to access microphone. Please check permissions.'
        );
        this.setState('error');
        this.endSession();
      }
    }
  }

  private startMicPipeline(sessionId: string) {
    if (!this.activeInputAudioContext || !this.activeAudioStream || this.activeSessionId !== sessionId) {
      return;
    }

    try {
      this.activeSourceNode = this.activeInputAudioContext.createMediaStreamSource(this.activeAudioStream);
      this.activeScriptProcessor = this.activeInputAudioContext.createScriptProcessor(4096, 1, 1);

      this.activeScriptProcessor.onaudioprocess = (e) => {
        if (this.activeSessionId !== sessionId) return;

        if (this.isMuted || !this.activeLiveSession || this.activeLiveSession.readyState !== WebSocket.OPEN) {
          this.currentConfig?.onVolumeChange(0, this.isModelSpeaking ? 0.6 : 0);
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sumSquares / inputData.length);
        const normalizedVol = Math.min(1, rms * 5);

        this.currentConfig?.onVolumeChange(
          normalizedVol,
          this.isModelSpeaking ? 0.4 + Math.random() * 0.4 : 0
        );

        // Immediate Barge-in: If user speaks loud enough while AI is speaking, flush AI audio immediately
        if (rms > 0.042 && this.isModelSpeaking) {
          this.handleBargeIn();
        }

        // Convert Float32Array to 16-bit PCM Linear
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        let binary = '';
        const bytes = new Uint8Array(pcm16.buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Audio = btoa(binary);

        this.activeLiveSession.send(
          JSON.stringify({
            type: 'realtime_input',
            audio: base64Audio,
          })
        );

        if (rms > 0.03) {
          if (!this.isUserTalking && !this.isModelSpeaking) {
            this.isUserTalking = true;
            this.setState('listening');
          }
          if (this.speechDebounceTimer) clearTimeout(this.speechDebounceTimer);
          this.speechDebounceTimer = setTimeout(() => {
            this.isUserTalking = false;
            if (!this.isModelSpeaking && this.state === 'listening') {
              this.setState('thinking');
            }
          }, 1200);
        }
      };

      this.activeSourceNode.connect(this.activeScriptProcessor);
      this.activeScriptProcessor.connect(this.activeInputAudioContext.destination);
      this.setState('listening');
    } catch (err) {
      console.warn('[VoiceSessionManager] Error starting mic pipeline:', err);
    }
  }

  private handleServerMessage(rawData: string) {
    try {
      const msg = JSON.parse(rawData);

      if (msg.type === 'audio' && msg.data) {
        this.playAudioChunk(msg.data);
      } else if (msg.type === 'interrupted') {
        this.flushAudioPlayback();
        this.setState('listening');
      } else if (msg.type === 'transcript') {
        if (msg.text && msg.text.trim()) {
          this.currentConfig?.onTranscript(
            msg.speaker || 'ai',
            msg.text.trim(),
            msg.isFinal !== undefined ? msg.isFinal : false
          );
        }
      } else if (msg.type === 'turn_complete') {
        this.currentConfig?.onTranscript('ai', '', true);
        setTimeout(() => {
          if (!this.isUserTalking && this.activePlaybackQueue.length === 0) {
            this.setState('listening');
          }
        }, 300);
      } else if (msg.type === 'error') {
        this.currentConfig?.onError(msg.error || 'Live voice service error.');
      }
    } catch (e) {
      console.warn('[VoiceSessionManager] Error parsing message:', e);
    }
  }

  private playAudioChunk(base64Pcm: string) {
    if (!this.activeOutputAudioContext) return;

    if (!this.isModelSpeaking) {
      this.isModelSpeaking = true;
      this.setState('speaking');
    }

    try {
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      const audioBuffer = this.activeOutputAudioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = this.activeOutputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.activeOutputAudioContext.destination);

      const currentTime = this.activeOutputAudioContext.currentTime;
      if (this.scheduledTime < currentTime) {
        this.scheduledTime = currentTime;
      }

      source.start(this.scheduledTime);
      this.scheduledTime += audioBuffer.duration;

      this.activePlaybackQueue.push(source);

      source.onended = () => {
        const index = this.activePlaybackQueue.indexOf(source);
        if (index > -1) {
          this.activePlaybackQueue.splice(index, 1);
        }
        if (this.activePlaybackQueue.length === 0 && this.activeOutputAudioContext) {
          if (this.activeOutputAudioContext.currentTime >= this.scheduledTime - 0.05) {
            this.isModelSpeaking = false;
            if (this.state === 'speaking') {
              this.setState('listening');
            }
          }
        }
      };
    } catch (err) {
      console.warn('[VoiceSessionManager] Error playing audio chunk:', err);
    }
  }

  // Flushes the entire playback queue immediately
  public flushAudioPlayback() {
    this.activePlaybackQueue.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    });
    this.activePlaybackQueue = [];
    if (this.activeOutputAudioContext) {
      this.scheduledTime = this.activeOutputAudioContext.currentTime;
    }
    this.isModelSpeaking = false;
  }

  // Handles Patient Barge-in / Interruption
  public handleBargeIn() {
    this.flushAudioPlayback();
    if (this.activeLiveSession && this.activeLiveSession.readyState === WebSocket.OPEN) {
      this.activeLiveSession.send(JSON.stringify({ type: 'client_interrupted' }));
    }
    this.setState('listening');
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.setState('muted');
    } else {
      this.setState(this.isModelSpeaking ? 'speaking' : 'listening');
    }
    this.printDiagnostics('TOGGLE_MUTE');
    return this.isMuted;
  }

  public sendTextMessage(text: string) {
    if (this.activeLiveSession && this.activeLiveSession.readyState === WebSocket.OPEN) {
      this.activeLiveSession.send(
        JSON.stringify({
          type: 'text_input',
          text,
        })
      );
      this.setState('thinking');
    }
  }

  // Complete cleanup of the entire session
  public endSession() {
    const closingId = this.activeSessionId;

    // 1. Flush and stop any active audio playback
    this.flushAudioPlayback();

    // 2. Disconnect ScriptProcessor and SourceNode
    if (this.activeScriptProcessor) {
      try {
        this.activeScriptProcessor.disconnect();
      } catch {}
      this.activeScriptProcessor = null;
    }

    if (this.activeSourceNode) {
      try {
        this.activeSourceNode.disconnect();
      } catch {}
      this.activeSourceNode = null;
    }

    // 3. Stop all tracks on microphone stream
    if (this.activeAudioStream) {
      try {
        this.activeAudioStream.getTracks().forEach((track) => track.stop());
      } catch {}
      this.activeAudioStream = null;
    }

    // 4. Close AudioContexts
    if (this.activeInputAudioContext) {
      try {
        this.activeInputAudioContext.close().catch(() => {});
      } catch {}
      this.activeInputAudioContext = null;
    }

    if (this.activeOutputAudioContext) {
      try {
        this.activeOutputAudioContext.close().catch(() => {});
      } catch {}
      this.activeOutputAudioContext = null;
    }

    // 5. Close WebSocket cleanly
    if (this.activeLiveSession) {
      try {
        this.activeLiveSession.onopen = null;
        this.activeLiveSession.onmessage = null;
        this.activeLiveSession.onerror = null;
        this.activeLiveSession.onclose = null;
        this.activeLiveSession.close();
      } catch {}
      this.activeLiveSession = null;
    }

    if (this.speechDebounceTimer) {
      clearTimeout(this.speechDebounceTimer);
      this.speechDebounceTimer = null;
    }

    this.activeSessionId = null;
    this.currentConfig = null;
    this.setState('disconnected');

    if (closingId) {
      console.log(`LIVE SESSION CLOSED: ${closingId}`);
      this.printDiagnostics('SESSION_CLOSED');
    }
  }

  private setState(newState: LiveVoiceState) {
    this.state = newState;
    this.notifyState(newState);
  }

  private notifyState(newState: LiveVoiceState) {
    if (this.currentConfig?.onStateChange) {
      this.currentConfig.onStateChange(newState);
    }
  }
}

// Global Singleton Export
export const voiceSessionManager = new VoiceSessionController();
