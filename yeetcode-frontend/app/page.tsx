"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Sparkles, ArrowRight } from "lucide-react";
import { QUESTIONS } from "./components/questions";

type Difficulty = "Easy" | "Medium" | "Hard";

const Index = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);

  const difficulties: { level: Difficulty; color: string }[] = [
    { level: "Easy", color: "text-green-500" },
    { level: "Medium", color: "text-yellow-500" },
    { level: "Hard", color: "text-red-500" }
  ];

  const handleStartInterview = async () => {
    if (!selectedDifficulty) return;

    const questionData = QUESTIONS[selectedDifficulty];

    // Send setup to backend
    try {
      await fetch('http://localhost:8080/api/interview/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          difficulty: selectedDifficulty,
          question: questionData.question,
          timer: questionData.timer
        })
      });

      // Redirect to interview playground
      window.location.href = `https://localhost:3001/playground?difficulty=${selectedDifficulty}`;
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Failed to start interview. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_circle_at_50%_30%,hsl(174_72%_52%/0.07),transparent_60%)]" />

      {/* Top badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-6 flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-sm text-muted-foreground"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>AI-Powered Mock Interviews</span>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="mb-4 flex items-center gap-3"
      >
        <Code2 className="h-10 w-10 text-primary" />
        <h1 className="font-display text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          Yeet<span className="text-gradient">code</span>
        </h1>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="mb-12 max-w-md text-center text-lg text-muted-foreground"
      >
        Sharpen your skills. Pick a difficulty and start practicing now.
      </motion.p>

      {/* Difficulty selector */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="flex gap-4"
      >
        {difficulties.map(({ level, color }) => (
          <button
            key={level}
            onClick={() => setSelectedDifficulty(level)}
            className={`relative rounded-lg border px-8 py-4 font-display text-lg font-semibold transition-all hover:scale-105 ${
              selectedDifficulty === level
                ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                : 'border-border bg-card hover:border-primary/50'
            }`}
          >
            <span className={selectedDifficulty === level ? color : 'text-muted-foreground'}>
              {level}
            </span>
          </button>
        ))}
      </motion.div>

      {/* Start button */}
      <AnimatePresence>
        {selectedDifficulty && (
          <motion.button
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.35 }}
            onClick={handleStartInterview}
            className="mt-8 flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-display text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 glow-border"
          >
            Start Interview
            <ArrowRight className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-8 text-xs text-muted-foreground"
      >
        Built for developers, by developers.
      </motion.p>
    </div>
  );
};

export default Index;
