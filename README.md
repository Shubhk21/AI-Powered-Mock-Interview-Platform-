# 🚀 YeetCode - AI Mock Interview Platform

> Built in 24 hours at Hack_NCState

YeetCode is an AI-powered technical interview platform that conducts voice-to-voice coding interviews with real-time code visibility, anti-cheating measures, and comprehensive performance evaluation.

## ✨ Features

### 🎙️ Voice-to-Voice Interview
- Real-time speech-to-text transcription (ElevenLabs)
- Natural AI interviewer responses (Google Gemini 2.5 Flash)
- Text-to-speech for AI responses
- Adaptive silence detection for seamless conversation

### 💻 Live Code Editor
- Real-time code editor with syntax highlighting
- AI can see what you type as you code
- Character count and timer display
- Supports all programming languages

### ⏱️ Timed Challenges
- **Easy**: Two Sum (10 minutes)
- **Medium**: Reverse Linked List (20 minutes)
- **Hard**: Merge K Sorted Lists (30 minutes)

### 🛡️ Anti-Cheating System
- Continuous video monitoring (Twelve Labs)
- 20-second video chunks uploaded for analysis
- Detects suspicious behavior

### 📊 AI Evaluation
- FAANG-level rubric scoring
- Breakdown by:
  - Understanding of problem (20 pts)
  - Brute force approach (20 pts)
  - Optimal approach (30 pts)
  - Time/space complexity (30 pts)
  - Code execution (20 pts)
- Warning report for detected cheating attempts

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (TypeScript)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Audio**: WebSockets, MediaRecorder API
- **Dev**: HTTPS proxy (local-ssl-proxy) for camera/mic access

### Backend
- **Runtime**: Node.js (TypeScript)
- **Server**: Express.js
- **WebSocket**: ws library
- **APIs**:
  - ElevenLabs (Speech-to-Text & Text-to-Speech)
  - Google Gemini 2.5 Flash (AI Interviewer & Evaluator)
  - Twelve Labs (Video Analysis)

## 📂 Project Structure

```
yeetcode/
├── yeetcode-frontend/          # Next.js application
│   ├── app/
│   │   ├── page.tsx           # Home - difficulty selector
│   │   ├── playground/        # Interview interface
│   │   └── components/
│   │       ├── TextEditor.tsx # Code editor + timer
│   │       ├── ProfileCard.tsx # AI avatar
│   │       ├── ChatWindow.tsx # Conversation display
│   │       ├── RulesModal.tsx # Interview guidelines
│   │       └── questions.ts   # Question bank
│   └── package.json
│
├── yeetcode-backend/           # Node.js backend
│   ├── src/
│   │   ├── server.ts          # Express + WebSocket server
│   │   ├── services/
│   │   │   ├── gemini.ts      # AI interviewer logic
│   │   │   ├── evaluator.ts   # Performance evaluation
│   │   │   ├── transcription.ts # ElevenLabs STT
│   │   │   ├── elevenlabs-tts.ts # TTS
│   │   │   └── twelvelabs.ts  # Video monitoring
│   │   └── websocket/
│   │       └── transcriptSocket.ts # Audio pipeline
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm/yarn/pnpm
- API Keys:
  - [ElevenLabs API Key](https://elevenlabs.io/)
  - [Google Gemini API Key](https://aistudio.google.com/app/apikey)
  - [Twelve Labs API Key](https://twelvelabs.io/)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/yeetcode.git
cd yeetcode
```

2. **Set up Backend**
```bash
cd yeetcode-backend
npm install

# Create .env file
cp .env.example .env
# Add your API keys:
# GEMINI_API_KEY=your_key_here
# ELEVENLABS_API_KEY=your_key_here
# TWELVELABS_API_KEY=your_key_here
```

3. **Set up Frontend**
```bash
cd ../yeetcode-frontend
npm install
```

### Running the Application

**Terminal 1 - Backend:**
```bash
cd yeetcode-backend
npm run dev
# Server runs on http://localhost:8080
```

**Terminal 2 - Frontend:**
```bash
cd yeetcode-frontend
npm run dev
# App runs on http://localhost:3000
```

**Terminal 3 - HTTPS Proxy (for camera/mic access):**
```bash
npx local-ssl-proxy --source 3001 --target 3000
# Access app at https://localhost:3001
```

### First Interview

1. Open `https://localhost:3001`
2. Select difficulty (Easy/Medium/Hard)
3. Accept camera and microphone permissions
4. Read the rules modal
5. Start coding and talking to the AI interviewer!
6. Timer will auto-end the interview
7. View your evaluation scores

## 🎯 Key Features Explained

### Voice Activity Detection (VAD)
- Records in 3-second windows
- Uses RMS audio analysis to detect speech
- Accumulates speech chunks until 2 consecutive silences detected
- Prevents cutting off mid-sentence

### Backend Locking Mechanism
- Prevents race conditions in audio processing
- Ensures only one AI response at a time
- Frontend audio queue drops duplicates

### Real-time Code Visibility
- Editor content sent with each audio chunk
- AI can reference code in responses
- Enables contextual technical discussions

### Interview Evaluation Rubric
```
1. Understanding of problem (20 points)
   - Correctly interprets requirements
   - Asks clarifying questions
   - Identifies edge cases

2. Brute force approach (20 points)
   - Proposes initial solution
   - Explains logic clearly

3. Optimal approach (30 points)
   - Identifies improvements
   - Justifies optimizations

4. Time/space complexity (30 points)
   - Correct Big-O analysis
   - Clear explanations

5. Code execution (20 points)
   - Working implementation
   - Handles edge cases
```

## 🐛 Known Issues / Future Improvements

- [ ] Rate limiting on Gemini API (free tier: 5 req/min for 2.5 Flash)
- [ ] Video analysis integration needs completion
- [ ] Add support for multiple programming languages in editor
- [ ] Persist interview history
- [ ] Add user authentication

## 🏆 Hackathon Achievements

- ✅ Full voice-to-voice interview loop working
- ✅ Real-time code editor visibility
- ✅ Timed challenges with auto-end
- ✅ AI evaluation with rubric scoring
- ✅ Video monitoring setup (Twelve Labs integration ready)
- ✅ Anti-cheating warning system

## 📝 License

MIT License - feel free to use this project for learning!

## 👥 Team

- Saniddhya Dubey - Full Stack Development
- Shubham Kakde - Full Stack Development

## 🙏 Acknowledgments

- ElevenLabs for amazing voice APIs
- Google Gemini for powerful AI capabilities
- Twelve Labs for video analysis infrastructure
- Hack_NCState for the opportunity!

---

**Built with ❤️ in 24 hours**
