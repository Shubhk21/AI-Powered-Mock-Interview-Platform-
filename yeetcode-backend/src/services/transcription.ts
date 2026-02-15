import { ElevenLabsClient } from 'elevenlabs';

interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export class TranscriptionService {
  private client: ElevenLabsClient;
  private currentAudioBuffer: Buffer | null; // ← CHANGED

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY_STT
    });
    this.currentAudioBuffer = null;
  }

  setAudioBuffer(audioBuffer: Buffer): void {
    this.currentAudioBuffer = audioBuffer;
    console.log('Set audio buffer, size:', audioBuffer.length);
  }

  async transcribeSingle(): Promise<TranscriptionResult | null> {
    if (!this.currentAudioBuffer) {
      console.log('No audio to transcribe');
      return null;
    }

    try {
      console.log('Transcribing audio, size:', this.currentAudioBuffer.length);
      
      const audioBlob = new Blob([new Uint8Array(this.currentAudioBuffer)], { type: 'audio/webm' });
      
      const result = await this.client.speechToText.convert({
        file: audioBlob,
        model_id: 'scribe_v2',
        language_code: 'eng'
      });

      console.log('Transcription result:', result.text);

      this.currentAudioBuffer = null; // Clear after use

      return {
        text: result.text,
        isFinal: true,
        confidence: 0.95,
        timestamp: Date.now()
      };

    } catch (error: any) {
      console.error('ElevenLabs transcription error:', error?.message);
      throw error;
    }
  }
}
