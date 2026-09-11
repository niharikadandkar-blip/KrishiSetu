export interface VoiceRecognitionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
  language: string;
  timestamp: string;
}

export type VoiceErrorCode =
  | 'NOT_SUPPORTED'
  | 'PERMISSION_DENIED'
  | 'NO_SPEECH'
  | 'NETWORK_ERROR'
  | 'ABORTED'
  | 'UNKNOWN';

export interface VoiceError {
  code: VoiceErrorCode;
  message: string;
}

export interface IVoiceRecognitionProvider {
  isSupported(): boolean;
  startListening(language?: string): Promise<void>;
  stopListening(): void;
  cancelListening(): void;
  
  onStart(callback: () => void): void;
  onResult(callback: (result: VoiceRecognitionResult) => void): void;
  onInterimResult(callback: (interimText: string) => void): void;
  onError(callback: (error: VoiceError) => void): void;
  onEnd(callback: () => void): void;

  destroy(): void;
}
