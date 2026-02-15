'use client';

import { useState, useEffect, useRef } from 'react';

export default function TranscriptionPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Initializing...');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [accumulatedChunks, setAccumulatedChunks] = useState(0); // Show how many chunks collected
  
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksBuffer = useRef<Blob[]>([]); // ← NEW: Store speech chunks

  useEffect(() => {
    initializeMicrophone();
    
    return () => {
      cleanup();
    };
  }, []);

  const detectSpeech = async (audioBlob: Blob): Promise<boolean> => {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      if (arrayBuffer.byteLength < 1000) {
        return false;
      }
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      
      const SPEECH_THRESHOLD = 0.0375;
      
      console.log('Audio RMS:', rms, 'Threshold:', SPEECH_THRESHOLD);
      
      return rms > SPEECH_THRESHOLD;
    } catch (error) {
      console.error('VAD error:', error);
      return true;
    }
  };

  const initializeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setStatus('Microphone ready');
      
      connectWebSocket();
      
      setTimeout(() => {
        startRecordingCycle();
      }, 1000);
      
    } catch (error) {
      console.error('Microphone access error:', error);
      setStatus('Microphone access denied');
      alert('Please allow microphone access to use transcription');
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket('ws://localhost:8080/ws/transcribe');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setStatus('Connected - Ready to record');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);
      
        switch (data.type) {
          case 'connected':
            setStatus('Ready');
            break;
          case 'transcript':
            setTranscript(prev => prev + '\n\nYou: ' + data.text);
            break;
          case 'audio_response':
            setIsAISpeaking(true);
            
            const audioBlob = base64ToBlob(data.audio, 'audio/mpeg');
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            
            audio.onended = () => {
              setIsAISpeaking(false);
              console.log('AI finished speaking, mic unmuted');
            };
            
            audio.play();
            setTranscript(prev => prev + '\n\nAI: ' + data.text + '\n');
            break;
          case 'gemini_silent':
            break;
          case 'status':
            setStatus(data.message);
            break;
          case 'error':
            console.error('Error:', data.message);
            setStatus('Error: ' + data.message);
            break;
        }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setStatus('Disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('Connection Error');
    };

    wsRef.current = ws;
  };

  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }
    
    return new Blob([new Uint8Array(byteArrays)], { type: mimeType });
  };

  const startRecordingCycle = () => {
    if (!streamRef.current || !wsRef.current) return;
    startRecording();
  };

  const sendAccumulatedAudio = async () => {
    if (audioChunksBuffer.current.length === 0) {
      console.log('No audio chunks to send');
      return;
    }
  
    console.log(`Sending ${audioChunksBuffer.current.length} accumulated chunks to backend`);
    
    const combinedBlob = new Blob(audioChunksBuffer.current, { type: 'audio/webm' });
    
    console.log('Individual chunk sizes:', audioChunksBuffer.current.map(c => c.size));
    console.log('Combined blob size:', combinedBlob.size);
    console.log('Estimated duration:', (combinedBlob.size / 16000).toFixed(2), 'seconds');
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      console.log('Base64 length:', base64.length);
      console.log('Original blob size:', combinedBlob.size);
      console.log('Size after base64:', (base64.length * 3/4).toFixed(0), '(should match blob size)');
      
      wsRef.current?.send(JSON.stringify({ type: 'start' }));
      wsRef.current?.send(JSON.stringify({
        type: 'audio',
        audio: base64
      }));
      wsRef.current?.send(JSON.stringify({ type: 'stop' }));
    };
    
    reader.readAsDataURL(combinedBlob);
    
    audioChunksBuffer.current = [];
    setAccumulatedChunks(0);
    setStatus('Sent to backend - Listening...');
  };

  const startRecording = async () => {
    if (isAISpeaking) {
      console.log('AI is speaking, skipping recording cycle');
      setTimeout(startRecording, 1000);
      return;
    }
  
    if (!wsRef.current) return;
  
    try {
      if (!streamRef.current || !streamRef.current.active) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
  
      const mediaRecorder = new MediaRecorder(streamRef.current);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
  
      mediaRecorder.onstop = async () => {
        // Combine chunks from THIS recording session
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        
        const hasSpeech = await detectSpeech(audioBlob);
        
        if (hasSpeech) {
          console.log('Speech detected, adding to buffer');
          audioChunksBuffer.current.push(audioBlob);
          setAccumulatedChunks(audioChunksBuffer.current.length);
          setStatus(`Recording... (${audioChunksBuffer.current.length} chunks)`);
          
          // Continue recording
          startRecording();
        } else {
          console.log('Silence detected');
          
          if (audioChunksBuffer.current.length > 0) {
            setStatus('Silence detected - Sending to backend...');
            await sendAccumulatedAudio();
          } else {
            setStatus('Listening...');
          }
          
          startRecording();
        }
      };
  
      // CRITICAL FIX: Request data every 100ms to build one continuous blob
      mediaRecorder.start(100); // ← CHANGED from start() to start(100)
      
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
  
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
  
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 5000);
    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus('Recording error');
    }
  };

  const cleanup = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Clear buffer
    audioChunksBuffer.current = [];
  };

  const stopAll = () => {
    cleanup();
    setIsRecording(false);
    setStatus('Stopped');
    setAccumulatedChunks(0);
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Live Transcription</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">{status}</span>
            </div>
            
            <button
              onClick={stopAll}
              className="px-6 py-2 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white"
            >
              Stop All
            </button>
          </div>

          <div className="flex gap-4 text-sm">
            <div className={`px-4 py-2 rounded ${isRecording ? 'bg-red-100 text-red-700' : 'bg-gray-100'}`}>
              {isRecording ? `Recording: ${recordingTime}s / 5s` : 'Waiting...'}
            </div>
            <div className={`px-4 py-2 rounded ${accumulatedChunks > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'}`}>
              Buffered: {accumulatedChunks} chunks
            </div>
            <div className={`px-4 py-2 rounded ${isAISpeaking ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'}`}>
              {isAISpeaking ? 'AI Speaking' : 'Ready'}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-black mb-4">Transcript</h2>
          <div className="min-h-[300px] p-4 bg-gray-50 rounded border">
            <p className="whitespace-pre-wrap text-black">{transcript || 'Waiting for transcription...'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
