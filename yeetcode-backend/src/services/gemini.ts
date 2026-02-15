import { GoogleGenerativeAI } from '@google/generative-ai';
import { interviewConfig } from '../server';

interface GeminiStreamResponse {
  text: string;
  isDone: boolean;
  shouldSpeak: boolean;
  responseType: string;
}

interface GeminiDecision {
  should_speak: boolean;
  response_type: string;
  message: string;
  reasoning?: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private conversationHistory: string[];
  private systemPrompt: string;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash'
    });
    this.conversationHistory = [];

    // Get question and timer from global config
    const question = interviewConfig?.question || 'Two Sum';
    const timer = interviewConfig?.timer || 10;
    const difficulty = interviewConfig?.difficulty || 'Easy';

    this.systemPrompt = `You are a senior FAANG technical interviewer. This is a ${timer}-minute LIVE CODING ROUND.

CONTEXT:
- Problem: ${question} (${difficulty} difficulty)
- Candidate doesn't know the problem yet
- You see their editor content in real-time
- This is NOT a friendly chat - this is an evaluation

YOUR JOB: TEST IF THEY CAN THINK ON THEIR FEET

INTERVIEW BEHAVIOR:
1. Present problem clearly, then WAIT for them to drive
2. Don't hand-hold - make THEM explain their approach first
3. Push back on weak explanations: "Why that approach?" "What's the complexity?"
4. If they ask vague questions → answer briefly, push it back: "What do you think?"
5. If they're silent → stay silent. They need to fill the void.
6. When you see their code → ONLY comment if:
   - There's a critical bug
   - They explicitly ask for feedback
   - You're pushing them: "I see nested loops - can we do better?"

CODE EDITOR VISIBILITY:
You see what they type. Use it strategically:
- If code contradicts what they said → call it out
- If code has obvious bugs → let them find it first, then hint
- If code is correct → challenge them to optimize
- NEVER narrate their code ("I see you're writing a for loop") - that's hand-holding

SPEAKING DECISION RULES:
✅ SPEAK when:
- Candidate asks a direct question
- Candidate finishes explaining an approach (ask follow-up)
- Candidate makes a claim you need to challenge
- Long silence AND they seem genuinely stuck (give small hint)
- They write code and pause → ask about complexity/edge cases

❌ STAY SILENT when:
- Candidate is mid-sentence (trailing off, "umm", "so...")
- Candidate is actively typing/thinking
- You just spoke - give them space to respond
- Candidate hasn't tried to explain yet

CHALLENGING QUESTIONS TO ASK:
- "What's the time complexity? Can we do better?"
- "What if the array is empty? Or has duplicates?"
- "Why did you choose that data structure?"
- "Walk me through your code with an example"
- "I see your solution works - how would you optimize it?"

RESPONSE FORMAT (JSON only):
{
  "should_speak": true/false,
  "response_type": "greeting" | "problem_statement" | "challenge" | "pushback" | "clarification" | "hint" | "silence",
  "message": "your response (brief, 1-2 sentences max)",
  "reasoning": "your decision logic"
}

TWO SUM PROBLEM:
"Given an array of integers 'nums' and an integer 'target', return indices of two numbers that add up to target. Assume exactly one solution exists. You cannot use the same element twice. Example: nums=[2,7,11,15], target=9 → return [0,1] because nums[0]+nums[1]=9."

TONE: Professional, direct, evaluative. Not mean, but not friendly. Like a real FAANG interview where YOU'RE being tested.

CRITICAL: Keep responses SHORT (1-2 sentences). Long explanations = hand-holding. Make THEM do the work.`;
  }

  async generateResponse(
    userMessage: string, 
    editorContent: string,
    callback: (response: GeminiStreamResponse) => void
  ): Promise<void> {
    try {
      this.conversationHistory.push(`User: ${userMessage}`);
  
      // Build context-aware prompt
      let contextSection = '';
      if (editorContent && editorContent.trim().length > 0) {
        // Truncate if too long (keep last 1000 chars to stay within token limits)
        const truncatedContent = editorContent.length > 1000 
          ? '...' + editorContent.slice(-1000) 
          : editorContent;
        
        contextSection = `
  
  CANDIDATE'S CODE EDITOR CONTENT:
  \`\`\`
  ${truncatedContent}
  \`\`\`
  
  Note: The candidate is actively working on code above. Use this context to understand their thought process, help debug, suggest optimizations, or ask clarifying questions about their implementation.
  `;
      }
  
      const prompt = `${this.systemPrompt}
  
  CONVERSATION HISTORY:
  ${this.conversationHistory.join('\n')}
  ${contextSection}
  
  Analyze the latest user input and decide how to respond. Return ONLY valid JSON.`;
  
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      
      console.log('Gemini raw response:', responseText);
  
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in response');
        callback({
          text: '',
          isDone: true,
          shouldSpeak: false,
          responseType: 'silence'
        });
        return;
      }
  
      const decision: GeminiDecision = JSON.parse(jsonMatch[0]);
      
      console.log('Gemini decision:', decision);
  
      if (decision.should_speak && decision.message) {
        this.conversationHistory.push(`Interviewer: ${decision.message}`);
        
        callback({
          text: decision.message,
          isDone: false,
          shouldSpeak: true,
          responseType: decision.response_type
        });
      }
  
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-40);
      }
  
      callback({
        text: '',
        isDone: true,
        shouldSpeak: decision.should_speak,
        responseType: decision.response_type
      });
  
    } catch (error: any) {
      console.error('Gemini generation error:', error);
      throw error;
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
  }

  getHistory(): string[] {
    return this.conversationHistory;
  }
}
