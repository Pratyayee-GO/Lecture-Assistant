# Speech Notes - AI-Powered Study Assistant

English speech-to-text with video recording + **AI study notes generation** using Google Gemini (free tier).

Perfect for recording classroom lectures and generating comprehensive, interactive study notes automatically.

## 🎯 Raspberry Pi Mode

**Having issues with Pi's browser?** This project now supports running the **server on Raspberry Pi** while accessing the **frontend from your laptop**!

👉 **[Complete Pi Setup Guide](PI_SETUP_GUIDE.md)** - Quick 20-minute setup

**Quick start:**
- Run `npm start` on your Pi
- Access from laptop: `http://PI_IP_ADDRESS:3000`
- All processing happens on Pi, UI on your laptop

## Features

- **Silent Video Recording** - Records blackboard/whiteboard without audio
- **Local Database** - All data stored locally via NeDB (file-based)
- **History Management** - Browse, play, and delete text notes and videos
- **🤖 AI Study Notes Generator** - Analyzes lecture transcript + video frames to create comprehensive study notes
- **💬 Interactive AI Chat** - Ask questions about your notes, get explanations like a teacher

## Requirements

- Node.js 18+ recommended
- Chrome browser (best for Web Speech API and MediaRecorder)
- Google Gemini API key (free tier - no credit card needed)

## Quick Setup

### 1. Install dependencies

```zsh
cd /Users/pritimmondal/Learnings/projects/speech-notes
npm install
```

### 2. Get your free Google Gemini API key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key" (completely free, generous limits)
4. Copy the key

### 3. Configure environment

```zsh
cp .env.example .env
```

Edit `.env` and add your API key:

```env
GEMINI_API_KEY=your_actual_api_key_here
AI_ENABLED=true
PORT=3000
```

### 4. Start the server

```zsh
npm start
```

Then open http://localhost:3000 in Chrome.

## How to Use

### Recording a Lecture

1. Open http://localhost:3000
2. Click **"Start Listening"** - grants mic permission, begins transcribing speech
3. Click **"Start Video"** - grants camera permission, records the board (silent, no audio)
4. During the lecture, your speech is converted to text and saved automatically
5. Click **"Stop Video"** when done recording the board
6. Click **"Stop"** to end speech recognition

### Generating AI Study Notes

1. Click **"Open History"** to see all your text notes and videos
2. **Check the boxes** next to relevant text notes and videos from a lecture
3. Click **"🤖 Generate Study Notes from Selected"**
4. Enter a title (e.g., "Physics Lecture - Newton's Laws")
5. Wait 30-60 seconds while AI analyzes everything
6. Study notes appear on the **Study Notes** page

### What AI Creates

Your AI-generated notes include:
- **Title & Overview** - Clear summary of the lecture
- **Key Concepts** - Main ideas explained simply
- **Important Points** - Bullet-point highlights
- **Diagrams & Visual Notes** - Descriptions of blackboard content from video frames
- **Formulas & Equations** - Mathematical/scientific formulas
- **Examples** - Worked examples from the lecture
- **Important Questions** - 5-10 practice questions (recall, understanding, application)
- **Quick Summary** - One-paragraph recap for revision

### Chatting with Your Notes

On the Study Notes page:
1. Select a note to view it
2. Scroll to the chat box at the bottom
3. Ask questions like:
   - "Explain this concept in simpler terms"
   - "Give me an example of..."
   - "What's the difference between X and Y?"
   - "How do I solve this type of problem?"
   - "Can you break down this formula?"

The AI acts like a patient teacher, answering based on your lecture content.

## Project Structure

```
speech-notes/
├── server.js              # Express server + REST API
├── db.js                  # NeDB database (notes, videos, study notes)
├── services/
│   ├── videoProcessor.js  # FFmpeg frame extraction
│   └── aiService.js       # Google Gemini integration
├── public/
│   ├── index.html         # Live recording page
│   ├── history.html       # Manage notes/videos
│   ├── study-notes.html   # View AI notes + chat
│   ├── app.js             # Speech + video recording logic
│   ├── history.js         # History page logic
│   └── study-notes.js     # Study notes page logic
└── data/
    ├── notes.db           # Text transcripts
    ├── videos.db          # Video metadata
    ├── study-notes.db     # AI-generated notes
    └── videos/            # Video files (.webm)
```

## API Endpoints

### Notes
- `GET /api/health` - Health check
- `GET /api/notes` - List all text notes
- `POST /api/notes` - Create a note `{ text: string }`
- `DELETE /api/notes/:id` - Delete one note
- `DELETE /api/notes` - Delete all notes

### Videos
- `GET /api/videos` - List all videos
- `POST /api/videos` - Upload video (multipart, field: video)
- `GET /api/videos/:id/stream` - Stream/play video
- `DELETE /api/videos/:id` - Delete one video
- `DELETE /api/videos` - Delete all videos

### Study Notes (AI)
- `GET /api/study-notes` - List all AI-generated notes
- `POST /api/study-notes/generate` - Generate notes `{ noteIds: [], videoIds: [], title: string }`
- `GET /api/study-notes/:id` - Get specific study note
- `POST /api/study-notes/:id/chat` - Chat with AI `{ question: string, history: [] }`
- `DELETE /api/study-notes/:id` - Delete study note

## How It Works

1. **Speech Recognition**: Browser's Web Speech API converts your voice to text in real-time
2. **Video Capture**: MediaRecorder API records camera (silent mode for board/whiteboard)
3. **Frame Extraction**: FFmpeg extracts 8 key frames from each video
4. **AI Analysis**: Google Gemini 1.5 Flash (multimodal) analyzes:
   - Full lecture transcript
   - Visual content from video frames (diagrams, equations, board notes)
5. **Note Generation**: AI creates comprehensive study notes in markdown
6. **Interactive Chat**: Gemini maintains context for Q&A about your notes

## Why Google Gemini?

- **Free Tier** - No credit card required, generous limits
- **Multimodal** - Analyzes both text and images
- **High Quality** - Excellent at understanding educational content
- **Fast** - Generates notes in 30-60 seconds
- **No Compromise** - Production-grade AI, free for students

## Troubleshooting

**"AI not configured" error**
- Make sure you copied `.env.example` to `.env`
- Add your actual Gemini API key (not `your_api_key_here`)
- Set `AI_ENABLED=true` in `.env`
- Restart the server

**Video frames not appearing in notes**
- FFmpeg automatically installs with dependencies
- Check terminal for any ffmpeg errors
- Video must be valid .webm format

**Speech recognition not working**
- Use Chrome browser (best support)
- Grant microphone permission when prompted
- Check browser console for errors

**Chat not responding**
- Check Gemini API quota (free tier has daily limits)
- Verify API key is valid
- Check network connection

## Data Storage

All data is stored locally on your machine:
- Text notes: `data/notes.db`
- Video metadata: `data/videos.db`
- Video files: `data/videos/*.webm`
- Study notes: `data/study-notes.db`

Nothing is sent to cloud storage. Only the Gemini API receives data when you generate study notes.

## Privacy & Security

- Your API key stays in `.env` (gitignored)
- Videos/transcripts stored locally
- Only sent to Gemini when you click "Generate Study Notes"
- No third-party analytics or tracking

## Next Steps

- Add export to PDF/Markdown
- Support multiple languages
- Batch process multiple lectures
- Add note templates by subject
- Mobile app version
- Offline AI with local models

## License

MIT

---

**Built for students who want AI-powered study notes that feel hand-written and actually help you learn.**
