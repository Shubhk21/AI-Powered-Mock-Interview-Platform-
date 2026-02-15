import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface TextEditorProps {
  isRecording: boolean;
  isResponding: boolean;
  text: string;
  setText: (text: string) => void;
  timerLimit: number;
  onTimeUp: () => void;
}

const TextEditor = ({ isRecording, isResponding, text, setText, timerLimit, onTimeUp }: TextEditorProps) => {

  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpCalledRef = useRef(false);

  useEffect(() => {
    // Start the timer
    intervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Check if time is up
  useEffect(() => {
    console.log('⏱️ Timer check:', elapsedTime, 'vs limit:', timerLimit * 60);
    
    if (elapsedTime >= timerLimit * 60) {
      console.log('🛑 STOPPING TIMER NOW!');
      timeUpCalledRef.current = true;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      onTimeUp();

    }
  }, [elapsedTime, timerLimit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Editor</h2>
          
          <div className="relative">
            {isResponding ? (
              <MicOff className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Mic 
                className={`w-4 h-4 transition-colors ${
                  isRecording ? 'text-red-500 animate-pulse' : 'text-primary'
                }`} 
              />
            )}
          </div>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="text-xs font-mono text-muted-foreground/70">
            {formatTime(elapsedTime)}
          </span>
        </div>
        
        <span className="text-xs text-muted-foreground">{text?.length || 0} chars</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Start writing..."
        className="flex-1 w-full resize-none bg-[hsl(var(--editor-bg))] p-6 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none font-[Georgia,serif]"
        spellCheck
      />
    </div>
  );
};

export default TextEditor;
