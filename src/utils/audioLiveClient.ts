import { Language } from '../types';
import { voiceSessionManager, LiveVoiceState, VoiceSessionConfig } from './voiceSessionManager';

export type { LiveVoiceState, VoiceSessionConfig as LiveClientConfig };

// Backward-compatible LiveAudioClient class that connects to the singleton VoiceSessionManager
export class LiveAudioClient {
  constructor(private config: VoiceSessionConfig) {}

  public async connect(): Promise<void> {
    await voiceSessionManager.startSession(this.config);
  }

  public toggleMute(): boolean {
    return voiceSessionManager.toggleMute();
  }

  public sendTextMessage(text: string): void {
    voiceSessionManager.sendTextMessage(text);
  }

  public stopModelAudioPlayback(): void {
    voiceSessionManager.flushAudioPlayback();
  }

  public disconnect(): void {
    voiceSessionManager.endSession();
  }
}
