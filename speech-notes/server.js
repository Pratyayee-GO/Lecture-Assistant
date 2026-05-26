require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const db = require('./db');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { extractKeyFrames } = require('./services/videoProcessor');
const aiService = require('./services/aiService');
const os = require('os');
const http = require('http');
const https = require('https');

// Optional HTTPS support: provide SSL_KEY_PATH and SSL_CERT_PATH in .env
let sslOptions = null;
if (process.env.SSL_KEY_PATH && process.env.SSL_CERT_PATH) {
  try {
    sslOptions = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH)
    };
    console.log('[startup] HTTPS certs loaded');
  } catch (e) {
    console.warn('[startup] Failed to load SSL cert/key, falling back to HTTP:', e.message);
    sslOptions = null;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

app.use(morgan('dev'));
app.use(express.json());

// If you end up hosting frontend separately, CORS helps; for now, same-origin is fine
app.use(cors());

// Serve static frontend
app.use(express.static(path.join(__dirname, 'public')));

// Ensure videos dir
const videosDir = path.join(db.paths.dataDir, 'videos');
fs.mkdirSync(videosDir, { recursive: true });

// Multer storage for videos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.webm';
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // up to 1GB
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'speech-notes', time: new Date().toISOString() });
});

// List all notes
app.get('/api/notes', async (req, res) => {
  const notes = await db.getAllNotes();
  res.json({ notes });
});

// Add a note
app.post('/api/notes', async (req, res) => {
  const { text } = req.body || {};
  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required as non-empty string' });
  }
  const note = await db.addNote(text.trim());
  res.status(201).json({ note });
});

// Delete single note
app.delete('/api/notes/:id', async (req, res) => {
  const id = req.params.id;
  if (!id) {
    return res.status(400).json({ error: 'invalid id' });
  }
  const ok = await db.deleteNote(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// Delete all notes
app.delete('/api/notes', async (req, res) => {
  const count = await db.deleteAll();
  res.json({ ok: true, deleted: count });
});

// Videos API
app.get('/api/videos', async (req, res) => {
  const videos = await db.getAllVideos();
  res.json({ videos });
});

app.post('/api/videos', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'video file required (field name: video)' });
    const now = new Date().toISOString();
    const meta = await db.addVideo({
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype || 'video/webm',
      created_at: now
    });
    res.status(201).json({ video: meta });
  } catch (e) {
    console.error('Upload error', e);
    res.status(500).json({ error: 'upload failed' });
  }
});

app.get('/api/videos/:id/stream', async (req, res) => {
  const id = req.params.id;
  const list = await db.getAllVideos();
  const v = list.find(x => String(x.id) === String(id));
  if (!v) return res.status(404).json({ error: 'not found' });
  const abs = path.join(videosDir, v.filename);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'file missing' });

  try {
    const stat = fs.statSync(abs);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = v.mime || 'video/webm';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
        res.status(416).set({ 'Content-Range': `bytes */${fileSize}` }).end();
        return;
      }
      const chunkSize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(abs, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(abs).pipe(res);
    }
  } catch (err) {
    console.error('Video stream error', err);
    res.status(500).json({ error: 'stream failed' });
  }
});

app.delete('/api/videos/:id', async (req, res) => {
  const id = req.params.id;
  const list = await db.getAllVideos();
  const v = list.find(x => String(x.id) === String(id));
  if (!v) return res.status(404).json({ error: 'not found' });
  try {
    const ok = await db.deleteVideo(id);
    const abs = path.join(videosDir, v.filename);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    if (!ok) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete video error', e);
    res.status(500).json({ error: 'failed to delete' });
  }
});

app.delete('/api/videos', async (req, res) => {
  const list = await db.getAllVideos();
  let deleted = 0;
  for (const v of list) {
    const abs = path.join(videosDir, v.filename);
    if (fs.existsSync(abs)) {
      try { fs.unlinkSync(abs); } catch {}
    }
    deleted++;
  }
  const count = await db.deleteAllVideos();
  res.json({ ok: true, deleted: count });
});

// Optional: placeholder to send a note to an AI model later
// Enable by setting SEND_TO_AI=true and implementing your integration in ai.js
app.post('/api/notes/:id/send', async (req, res) => {
  try {
    const idNum = Number(req.params.id);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }
    if (process.env.SEND_TO_AI !== 'true') {
      return res.status(501).json({ error: 'AI integration disabled. Set SEND_TO_AI=true in .env and implement ai.js.' });
    }
    // Lazy-load ai integration (to avoid requiring deps when not needed)
    // eslint-disable-next-line global-require
    const { sendNoteToAI } = require('./services/ai');
    const notes = await db.getAllNotes();
    const note = notes.find(n => String(n.id) === String(idNum));
    if (!note) return res.status(404).json({ error: 'not found' });
    const result = await sendNoteToAI(note);
    res.json({ ok: true, result });
  } catch (err) {
    console.error('AI send error:', err);
    res.status(500).json({ error: 'failed to send to AI' });
  }
});

// Study Notes API
app.get('/api/study-notes', async (req, res) => {
  const notes = await db.getAllStudyNotes();
  res.json({ studyNotes: notes });
});

// Simple config status endpoint so the frontend can enable/disable AI features gracefully
app.get('/api/ai/status', (req, res) => {
  const enabled = aiService.isConfigured();
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  let reason = null;
  if (!enabled) {
    const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_api_key_here';
    const aiEnabledVar = process.env.AI_ENABLED;
    const parts = [];
    if (!hasKey) parts.push('GEMINI_API_KEY missing');
    if (aiEnabledVar !== 'true') parts.push('AI_ENABLED must be set to "true"');
    reason = parts.join('; ') || 'AI not configured';
  }
  res.json({ enabled, model, reason });
});

app.post('/api/study-notes/generate', async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({ 
        error: 'AI not configured. Add GEMINI_API_KEY to .env and set AI_ENABLED=true',
        setup: 'Get free API key at https://aistudio.google.com/app/apikey'
      });
    }

    const { noteIds = [], videoIds = [], title } = req.body;
    
    if (noteIds.length === 0 && videoIds.length === 0) {
      return res.status(400).json({ error: 'At least one noteId or videoId required' });
    }

    // Gather lecture text from notes
    const allNotes = await db.getAllNotes();
    const selectedNotes = allNotes.filter(n => noteIds.includes(n.id));
    const lectureText = selectedNotes.map(n => n.text).join('\n\n');

    // Extract frames from videos
    let frameBase64Array = [];
    if (videoIds.length > 0) {
      const allVideos = await db.getAllVideos();
      const selectedVideos = allVideos.filter(v => videoIds.includes(v.id));
      
      for (const video of selectedVideos) {
        const videoPath = path.join(videosDir, video.filename);
        if (fs.existsSync(videoPath)) {
          try {
            const frames = await extractKeyFrames(videoPath, 8);
            frameBase64Array = frameBase64Array.concat(frames);
          } catch (err) {
            console.error('Frame extraction failed for', video.filename, err);
          }
        }
      }
    }

    // Generate study notes using AI
    const content = await aiService.generateStudyNotes(lectureText, frameBase64Array);
    
    const studyNote = await db.addStudyNote({
      title: title || `Lecture Notes - ${new Date().toLocaleDateString()}`,
      content,
      noteIds,
      videoIds,
      created_at: new Date().toISOString()
    });

    res.status(201).json({ studyNote });
  } catch (err) {
    console.error('Study notes generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate study notes' });
  }
});

app.get('/api/study-notes/:id', async (req, res) => {
  const note = await db.getStudyNoteById(req.params.id);
  if (!note) return res.status(404).json({ error: 'not found' });
  res.json({ studyNote: note });
});

app.post('/api/study-notes/:id/chat', async (req, res) => {
  try {
    if (!aiService.isConfigured()) {
      return res.status(503).json({ error: 'AI not configured' });
    }

    const note = await db.getStudyNoteById(req.params.id);
    if (!note) return res.status(404).json({ error: 'not found' });

    const { question, history = [] } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'question is required' });
    }

    const result = await aiService.chatWithNotes(note.content, question, history);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

app.delete('/api/study-notes/:id', async (req, res) => {
  const ok = await db.deleteStudyNote(req.params.id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

// Helper to get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server with port fallback if 3000 is busy
function start(port, attempt = 0) {
  const localIP = getLocalIP();
  const protocol = sslOptions ? 'https' : 'http';
  const create = () => sslOptions ? https.createServer(sslOptions, app) : http.createServer(app);
  const server = create();
  server.listen(port, HOST, () => {
    console.log(`\n🚀 Speech Notes Server Running:`);
    console.log(`   Local:    ${protocol}://localhost:${port}`);
    console.log(`   Network:  ${protocol}://${localIP}:${port}`);
    // if (!sslOptions) {
    //   console.log(`\n🔐 getUserMedia requires a secure context. For mic/video from Pi hostname/IP you need https or serve frontend from http://localhost.`);
    //   console.log(`   To enable HTTPS: set SSL_KEY_PATH & SSL_CERT_PATH in .env to your key/cert files.`);
    // }
    console.log(`\n📱 Connect from your laptop using the Network URL\n`);
  });
  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempt < 5) {
      const next = Number(port) + 1;
      console.warn(`Port ${port} in use, trying ${next}...`);
      start(next, attempt + 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}

start(Number(PORT));
