import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupTranscriptionWebSocket } from './websocket/new-socket';
import transcriptionRoutes from './routes/transcription';

import multer from 'multer';
import { processVideoChunk } from './services/twelvelabs';
import { evaluateInterview } from './services/evaluator';

export let interviewConfig: { question: string; timer: number; difficulty: string } | null = null;

export function setInterviewConfig(config: typeof interviewConfig) {
  interviewConfig = config;
}

dotenv.config();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '.webm');
  }
});

const upload = multer({ storage });

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/transcribe' });

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://localhost:3001'  // ← Add this!
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/interview/evaluate', async (req, res) => {
  try {

    const { conversationHistory, warningCount } = req.body;
    console.log('📥 Request body:', {
      historyLength: conversationHistory?.length,
      warningCount,
      historyPreview: conversationHistory?.substring(0, 100)
    });

    // return res.json("check console")


    if (!conversationHistory) {
      return res.status(400).json({ error: 'conversationHistory is required' });
    }

    console.log('Evaluating interview...');
    
    const evaluation = await evaluateInterview(
      conversationHistory,
      warningCount || 0
    );

    console.log('Evaluation complete:', evaluation);

    return res.json(evaluation);
  } catch (error: any) {
    console.error('Evaluation endpoint error:', error);
    res.status(500).json({ error: error.message || 'Evaluation failed' });
  }
});

// Twelve Labs video upload endpoint
app.post('/api/video/upload', upload.single('video'), async (req, res) => {
  try {
    const filePath = req.file?.path;
    const sessionId = req.body.sessionId;

    if (!filePath || !sessionId) {
      return res.status(400).json({ error: 'Missing file or sessionId' });
    }

    // Process async (don't block response)
    processVideoChunk(filePath, sessionId).then(cheatingDetected => {
      if (cheatingDetected) {
        console.log('⚠️ CHEATING DETECTED for session:', sessionId);
      }
    });

    res.json({ queued: true });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Interview setup endpoint
app.post('/api/interview/setup', (req, res) => {
  const { difficulty, question, timer } = req.body;
  
  setInterviewConfig({ difficulty, question, timer });
  
  console.log('Interview configured:', interviewConfig);
  
  res.json({ success: true });
});

// Endpoint to get current config (optional, for debugging)
app.get('/api/interview/config', (req, res) => {
  res.json(interviewConfig || { error: 'No interview configured' });
});

app.use('/api/transcription', transcriptionRoutes);

setupTranscriptionWebSocket(wss);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket available at ws://localhost:${PORT}/ws/transcribe`);
});
