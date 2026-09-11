import {
  IVoiceRecognitionProvider,
  VoiceRecognitionResult,
  VoiceError,
  VoiceErrorCode,
} from './VoiceRecognitionProvider';

export class WebSpeechAdapter implements IVoiceRecognitionProvider {
  private recognition: any = null;
  private listening: boolean = false;
  private timeoutTimer: any = null;

  private startCallbacks: Array<() => void> = [];
  private resultCallbacks: Array<(res: VoiceRecognitionResult) => void> = [];
  private interimCallbacks: Array<(text: string) => void> = [];
  private errorCallbacks: Array<(err: VoiceError) => void> = [];
  private endCallbacks: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.setupListeners();
      }
    }
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  }

  public mapLanguage(lang?: string): string {
    switch (lang) {
      case 'mr':
        return 'mr-IN';
      case 'hi':
        return 'hi-IN';
      case 'en':
        return 'en-IN';
      default:
        if (lang && lang.includes('-')) return lang;
        return 'mr-IN'; // Default to Marathi for KrishiSetu core demographic
    }
  }

  public async startListening(language?: string): Promise<void> {
    if (!this.isSupported() || !this.recognition) {
      this.notifyError({
        code: 'NOT_SUPPORTED',
        message: 'Speech recognition is not supported in this browser.',
      });
      return;
    }

    if (this.listening) {
      this.stopListening();
    }

    try {
      this.recognition.lang = this.mapLanguage(language);
      this.recognition.continuous = false; // Never continuous background listening
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      // Explicit 10-second max listening safety timeout timer
      if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
      this.timeoutTimer = setTimeout(() => {
        if (this.listening) {
          this.stopListening();
        }
      }, 10000);

      this.recognition.start();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        // Recognition already active, restart gracefully
        this.recognition.stop();
      } else {
        this.notifyError({
          code: 'UNKNOWN',
          message: err.message || 'Failed to start speech recognition',
        });
      }
    }
  }

  public stopListening(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.listening = false;
    }
  }

  public cancelListening(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.recognition && this.listening) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.listening = false;
    }
  }

  private setupListeners(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.listening = true;
      this.startCallbacks.forEach((cb) => cb());
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interimTranscript += res[0].transcript;
        }
      }

      if (interimTranscript && this.interimCallbacks.length > 0) {
        this.interimCallbacks.forEach((cb) => cb(interimTranscript));
      }

      if (finalTranscript) {
        if (this.timeoutTimer) {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = null;
        }
        const payload: VoiceRecognitionResult = {
          transcript: finalTranscript.trim(),
          isFinal: true,
          confidence: event.results[0]?.[0]?.confidence || 0.9,
          language: this.recognition.lang,
          timestamp: new Date().toISOString(),
        };

        this.resultCallbacks.forEach((cb) => cb(payload));
      }
    };

    this.recognition.onerror = (event: any) => {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
      this.listening = false;
      let code: VoiceErrorCode = 'UNKNOWN';
      let message = event.error || 'Speech recognition error';

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        code = 'PERMISSION_DENIED';
        message = 'Microphone permission was denied by user or browser.';
      } else if (event.error === 'no-speech') {
        code = 'NO_SPEECH';
        message = 'No speech was detected. Please try speaking again.';
      } else if (event.error === 'network') {
        code = 'NETWORK_ERROR';
        message = 'Network error occurred during speech recognition.';
      } else if (event.error === 'aborted') {
        code = 'ABORTED';
        message = 'Speech recognition was cancelled.';
      }

      this.notifyError({ code, message });
    };

    this.recognition.onend = () => {
      if (this.timeoutTimer) {
        clearTimeout(this.timeoutTimer);
        this.timeoutTimer = null;
      }
      this.listening = false;
      this.endCallbacks.forEach((cb) => cb());
    };
  }

  private notifyError(err: VoiceError): void {
    this.errorCallbacks.forEach((cb) => cb(err));
  }

  public onStart(callback: () => void): void {
    this.startCallbacks.push(callback);
  }

  public onResult(callback: (res: VoiceRecognitionResult) => void): void {
    this.resultCallbacks.push(callback);
  }

  public onInterimResult(callback: (text: string) => void): void {
    this.interimCallbacks.push(callback);
  }

  public onError(callback: (err: VoiceError) => void): void {
    this.errorCallbacks.push(callback);
  }

  public onEnd(callback: () => void): void {
    this.endCallbacks.push(callback);
  }

  public destroy(): void {
    this.cancelListening();
    this.startCallbacks = [];
    this.resultCallbacks = [];
    this.interimCallbacks = [];
    this.errorCallbacks = [];
    this.endCallbacks = [];
    this.recognition = null;
  }
}
