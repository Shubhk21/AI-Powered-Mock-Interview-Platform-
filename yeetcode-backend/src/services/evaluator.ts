import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_EVALS || '');

const EVALUATOR_PROMPT = `You are an AI Technical Interview Evaluator.

Your task is to evaluate a coding interview strictly based on the provided rubric and generate a structured evaluation report.

IMPORTANT RULES:

1) DO NOT invent criteria outside the rubric.
2) ONLY evaluate based on evidence present in the interview conversation.
3) If something is not shown in the conversation, assume it was NOT demonstrated.
4) Be strict and objective like a real technical interviewer.
5) Scoring must follow the rubric exactly.
6) Total score MUST be normalized to a maximum of 100.
7) Cheating or warning signals MUST NOT affect technical scoring unless explicitly instructed — they belong only in the warning report section.
8) DO NOT provide chain-of-thought reasoning. Provide only final evaluation conclusions.

RUBRIC:

1) Understanding of problem — 20 marks
   - Candidate correctly interprets requirements
   - Asks clarifying questions
   - Identifies constraints and edge cases

2) Brute force approach — 20 marks
   - Candidate proposes brute force solution
   - Explains logic clearly
   - Even if not optimal, demonstrates correct thinking

3) Optimal approach — 30 marks
   - Identifies improved or optimal algorithm
   - Justifies improvement over brute force
   - Shows algorithmic reasoning

4) Time and space complexity — 30 marks
   - Correct complexity analysis
   - Clear explanation

5) Execution — 20 marks
   - Code correctness
   - Logical flow
   - Handles edge cases

OUTPUT FORMAT (STRICT — FOLLOW EXACTLY):

Student Competence Summary:
<Write ONE concise professional paragraph describing strengths, weaknesses, and overall performance.>

Score Breakdown:
- Understanding of problem: X / 20
- Brute force approach: X / 20
- Optimal approach: X / 30
- Time and space complexity: X / 30
- Execution: X / 20

Final Score:
<Normalized score out of 100>

Warning Report:
- Total warnings: <number>
- Assessment:
   * If warnings == 0 → "No suspicious behaviour detected."
   * If warnings > 0 → Provide neutral factual summary only (no assumptions).

Evaluation Guidelines:
- Be strict and realistic (FAANG-level interviewer standard).
- Avoid inflated scoring.
- Do NOT mention missing context.
- DO NOT output anything outside the specified format.`;

interface EvaluationResult {
  summary: string;
  breakdown: {
    'Understanding of problem': string;
    'Brute force approach': string;
    'Optimal approach': string;
    'Time and space complexity': string;
    'Execution': string;
  };
  finalScore: number;
  warningReport: string;
}

export async function evaluateInterview(
  conversationHistory: string,
  warningCount: number
): Promise<EvaluationResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `${EVALUATOR_PROMPT}

--------------------------------------------------

INPUT:

INTERVIEW CONVERSATION:
${conversationHistory}

NUMBER OF WARNINGS:
${warningCount}

--------------------------------------------------

Please provide the evaluation following the exact format specified above.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('Raw evaluation response:', responseText);

    // Parse the response
    const evaluation = parseEvaluation(responseText);
    return evaluation;

  } catch (error: any) {
    console.error('Evaluation error:', error);
    throw new Error('Failed to generate evaluation');
  }
}

function parseEvaluation(text: string): EvaluationResult {
  // Extract summary
  const summaryMatch = text.match(/Student Competence Summary:\s*\n(.*?)(?=\n\nScore Breakdown:|$)/s);
  const summary = summaryMatch ? summaryMatch[1].trim() : 'Evaluation summary unavailable';

  // Extract score breakdown
  const breakdownMatches = {
    'Understanding of problem': text.match(/Understanding of problem:\s*(\d+\s*\/\s*20)/i),
    'Brute force approach': text.match(/Brute force approach:\s*(\d+\s*\/\s*20)/i),
    'Optimal approach': text.match(/Optimal approach:\s*(\d+\s*\/\s*30)/i),
    'Time and space complexity': text.match(/Time and space complexity:\s*(\d+\s*\/\s*30)/i),
    'Execution': text.match(/Execution:\s*(\d+\s*\/\s*20)/i)
  };

  const breakdown = {
    'Understanding of problem': breakdownMatches['Understanding of problem']?.[1] || '0 / 20',
    'Brute force approach': breakdownMatches['Brute force approach']?.[1] || '0 / 20',
    'Optimal approach': breakdownMatches['Optimal approach']?.[1] || '0 / 30',
    'Time and space complexity': breakdownMatches['Time and space complexity']?.[1] || '0 / 30',
    'Execution': breakdownMatches['Execution']?.[1] || '0 / 20'
  };

  // Extract final score
  const finalScoreMatch = text.match(/Final Score:\s*\n?(\d+)/i);
  const finalScore = finalScoreMatch ? parseInt(finalScoreMatch[1]) : 0;

  // Extract warning report
  const warningMatch = text.match(/Warning Report:\s*\n(.*?)(?=\n\nEvaluation Guidelines:|$)/s);
  const warningReport = warningMatch ? warningMatch[1].trim() : 'No warning information available';

  return {
    summary,
    breakdown,
    finalScore,
    warningReport
  };
}
