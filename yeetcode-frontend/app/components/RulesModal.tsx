"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface RulesModalProps {
  onClose: () => void;
}

const RulesModal = ({ onClose }: RulesModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Interview Guidelines</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-3 mb-6 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Introduce yourself as soon as you land on the playground</span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>Everything will be shared by your interviewer about the interview</span>
          </li>
        </ul>

        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold hover:brightness-110 transition-all"
        >
          Got it, let's start!
        </button>
      </motion.div>
    </div>
  );
};

export default RulesModal;
