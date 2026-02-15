import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

const questions = [
  { id: "1", label: "Two Sum", difficulty: "Easy" },
  { id: "2", label: "Reverse Linked List", difficulty: "Easy" },
  { id: "3", label: "Binary Tree Level Order Traversal", difficulty: "Medium" },
  { id: "4", label: "Longest Substring Without Repeating Characters", difficulty: "Medium" },
  { id: "5", label: "Merge K Sorted Lists", difficulty: "Hard" },
];

const difficultyColor: Record<string, string> = {
  Easy: "text-green-400",
  Medium: "text-yellow-400",
  Hard: "text-red-400",
};

interface Props {
  selected: string | null;
  onSelect: (id: string) => void;
}

const QuestionSelector = ({ selected, onSelect }: Props) => {
  const [open, setOpen] = useState(false);
  const selectedQuestion = questions.find((q) => q.id === selected);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={selectedQuestion ? "text-foreground" : "text-muted-foreground"}>
          {selectedQuestion
            ? selectedQuestion.label
            : "Select a coding challenge..."}
        </span>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            {questions.map((q) => (
              <li key={q.id}>
                <button
                  onClick={() => {
                    onSelect(q.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        selected === q.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selected === q.id && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </span>
                    <span className="text-sm text-foreground">{q.label}</span>
                  </div>
                  <span className={`font-display text-xs ${difficultyColor[q.difficulty]}`}>
                    {q.difficulty}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionSelector;
