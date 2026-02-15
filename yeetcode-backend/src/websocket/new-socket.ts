import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { TranscriptionService } from '../services/transcription';
import { GeminiService } from '../services/gemini';
import { ElevenLabsTTSService } from '../services/elevenlabs-tts';

export function setupTranscriptionWebSocket(wss: WebSocketServer) {
  console.log('WebSocket server initialized');

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log('New WebSocket connection established');
    
    const transcriptionService = new TranscriptionService();
    const geminiService = new GeminiService();
    const ttsService = new ElevenLabsTTSService();

    // HARD LOCK FOR AVOIDING RACE CONDITION:
    let isProcessing = false;

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'start':
            console.log('Starting interview session');
            
            ws.send(JSON.stringify({
              type: 'status',
              message: 'Interview started',
              timestamp: Date.now()
            }));
            break;

            case 'audio':
              if (isProcessing) {
                console.log('❌ BLOCKED: isProcessing=true, dropping audio');
                return;
              }
            
              const audioBuffer = Buffer.from(data.audio, 'base64');
              const editorContent = data.editorContent || '';

              console.log('Received audio buffer size:', audioBuffer.length);

              transcriptionService.setAudioBuffer(audioBuffer); // ← CHANGED
              (transcriptionService as any).editorContext = editorContent;
              break;
              
              case 'stop':
                // ← HARD GATE
                if (isProcessing) {
                  console.log('❌ BLOCKED: isProcessing=true, dropping stop signal');
                  return;
                }

                console.log('Processing audio chunk...');
                isProcessing = true;
                console.log('🔒 LOCKED');

                ws.send(JSON.stringify({
                  type: 'lock',
                  message: 'Processing your input...',
                  timestamp: Date.now()
                }));
                
                // Step 1: Transcribe
                const transcriptResult = await transcriptionService.transcribeSingle(); // ← CHANGED
                
                if (!transcriptResult || !transcriptResult.text.trim()) {
                  console.log('No speech detected, skipping...');
                  ws.send(JSON.stringify({
                    type: 'unlock',
                    timestamp: Date.now()
                  }));
                  
                  isProcessing = false;
                  return;
                }
              
                console.log('Transcript:', transcriptResult.text);
              
                // Send transcript to frontend
                ws.send(JSON.stringify({
                  type: 'transcript',
                  text: transcriptResult.text,
                  timestamp: Date.now()
                }));

                const editorContext = (transcriptionService as any).editorContext || '';
              
                // Step 2: Send to Gemini for decision
                await geminiService.generateResponse(transcriptResult.text, editorContext,  async (response) => {
                  if (!response.isDone) {
                    if (response.shouldSpeak && response.text) {

                      console.log(`Gemini speaking (${response.responseType}):`, response.text);
                      
                      const audioBuffer = await ttsService.textToSpeechStream(response.text);
                      const audioBase64 = audioBuffer.toString('base64');
              
                      ws.send(JSON.stringify({
                        type: 'audio_response',
                        audio: audioBase64,
                        text: response.text,
                        responseType: response.responseType,
                        timestamp: Date.now()
                      }));

                      // 🔓 UNLOCK immediately after sending
                      isProcessing = false;
                      console.log('🔓 UNLOCKED - Audio sent to frontend');

                    }
                  } else {
                    if (!response.shouldSpeak) {

                      isProcessing = false;
                      console.log(`Gemini stayed silent (${response.responseType})`);

                      ws.send(JSON.stringify({
                        type: 'unlock',
                        timestamp: Date.now()
                      }));

                    }
                    
                    // If audio sent, lock stays ON until frontend confirms

                  }
                });
              
                break;

          case 'end_interview':
            console.log('Ending interview session');
            isProcessing = false;
            
            // Get full history
            const history = geminiService.getHistory();
            
            ws.send(JSON.stringify({
              type: 'interview_ended',
              history: history,
              timestamp: Date.now()
            }));
            
            geminiService.clearHistory();
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error: any) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error?.message || 'Unknown error'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Interview session ready',
      timestamp: Date.now()
    }));
  });
}
