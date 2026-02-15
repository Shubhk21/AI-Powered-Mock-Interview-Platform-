import { ElevenLabsClient } from 'elevenlabs';
import { Readable } from 'stream';

export class ElevenLabsTTSService {
  private client: ElevenLabsClient;
  private voiceId: string;

  constructor() {
    this.client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY_TTS
    });
    // Default voice (you can change this)
    this.voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George voice
  }

  async textToSpeechStream(text: string): Promise<Buffer> {
    try {
      const audio = await this.client.textToSpeech.convert(this.voiceId, {
        text: text,
        model_id: 'eleven_monolingual_v1'
      });

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      const readable = Readable.from(audio as any);
      
      for await (const chunk of readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }
}
