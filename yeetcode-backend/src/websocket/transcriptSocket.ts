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
    let isProcessing = false;

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'start':
            console.log('Starting session');
            isProcessing = true;
            ws.send(JSON.stringify({
              type: 'status',
              message: 'Session started',
              timestamp: Date.now()
            }));
            break;

            case 'audio':
              if (!isProcessing) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'Session not started'
                }));
                return;
              }
            
              const audioBuffer = Buffer.from(data.audio, 'base64');
              const editorContent = data.editorContent || '';

              console.log('Received audio buffer size:', audioBuffer.length);
              transcriptionService.setAudioBuffer(audioBuffer);
              
              (transcriptionService as any).editorContext = editorContent;

              break;
            
            case 'stop':
              console.log('Processing audio...');
              isProcessing = false;
            
              // Step 1: Transcribe audio with ElevenLabs
              ws.send(JSON.stringify({
                type: 'status',
                message: 'Transcribing...',
                timestamp: Date.now()
              }));
            
              const transcriptResult = await transcriptionService.transcribeSingle(); // ← ONLY ONE declaration
              
              if (!transcriptResult || !transcriptResult.text) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: 'No transcript generated'
                }));
                return;
              }
            
              console.log('Transcript:', transcriptResult.text);
            
              // Send transcript to frontend
              ws.send(JSON.stringify({
                type: 'transcript',
                text: transcriptResult.text,
                timestamp: Date.now()
              }));
            
              // Step 2: Send to Gemini for response
              ws.send(JSON.stringify({
                type: 'status',
                message: 'Thinking...',
                timestamp: Date.now()
              }));

              const editorContext = (transcriptionService as any).editorContext || '';
            
              let fullGeminiResponse = '';
            
              await geminiService.generateResponse(
                transcriptResult.text, 
                editorContext, 
                async (response) => {
                if (!response.isDone && response.text) {
                  fullGeminiResponse += response.text;
                  
                  ws.send(JSON.stringify({
                    type: 'gemini_chunk',
                    text: response.text,
                    timestamp: Date.now()
                  }));
                } else if (response.isDone) {
                  console.log('Gemini response:', fullGeminiResponse);
                  
                  if (!response.shouldSpeak) {
                    console.log('Gemini stayed silent');
                    ws.send(JSON.stringify({
                      type: 'gemini_silent',
                      responseType: response.responseType,
                      timestamp: Date.now()
                    }));
                    isProcessing = true;
                    return;
                  }
                  
                  // Step 3: Convert to speech
                  ws.send(JSON.stringify({
                    type: 'status',
                    message: 'Generating speech...',
                    timestamp: Date.now()
                  }));
            
                  const audioBuffer = await ttsService.textToSpeechStream(fullGeminiResponse);
                  const audioBase64 = audioBuffer.toString('base64');
            
                  ws.send(JSON.stringify({
                    type: 'audio_response',
                    audio: audioBase64,
                    text: fullGeminiResponse,
                    timestamp: Date.now()
                  }));
            
                  console.log('Complete - audio sent');
                  isProcessing = true; // Ready for next cycle
                }
              });
            
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
      message: 'WebSocket connection established',
      timestamp: Date.now()
    }));
  });
}
