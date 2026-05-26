const { GoogleGenerativeAI } = require('@google/generative-ai');

let clients = null; // [{version:'v1', client}, {version:'v1beta', client}]
let defaultModelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

function initialize() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured. Get free key at https://aistudio.google.com/app/apikey');
  }
  if (!clients) {
    // Prefer v1 first, then fall back to v1beta for keys that are still on beta
    clients = [
      { version: 'v1', client: new GoogleGenerativeAI(apiKey, { apiVersion: 'v1' }) },
      { version: 'v1beta', client: new GoogleGenerativeAI(apiKey, { apiVersion: 'v1beta' }) }
    ];
  }
}

function getModelCandidates() {
  const name = defaultModelName;
  const candidates = [];
  // start with the configured name
  candidates.push(name);
  // try "-latest" alias
  if (!name.endsWith('-latest')) candidates.push(`${name}-latest`);
  // try common fallbacks
  candidates.push('gemini-1.5-flash');
  candidates.push('gemini-1.5-flash-latest');
  candidates.push('gemini-1.5-pro');
  candidates.push('gemini-1.5-pro-latest');
  candidates.push('gemini-pro'); // legacy text model
  // de-dup while preserving order
  return [...new Set(candidates)];
}

/**
 * Generate comprehensive study notes from lecture transcript and video frames
 * @param {string} lectureText - Combined transcript from speech recognition
 * @param {string[]} frameBase64Array - Array of base64-encoded PNG frames
 * @returns {Promise<string>} - Markdown formatted study notes
 */
async function generateStudyNotes(lectureText, frameBase64Array = []) {
  initialize();

  const prompt = `You are an expert AI study assistant helping students create comprehensive class notes.

**Context**: A student recorded a classroom lecture. You have:
1. The lecture transcript (what the teacher said)
2. Photos of the blackboard/whiteboard showing diagrams, equations, and key points

**Your task**: Create detailed study notes in markdown format that feel like they were hand-written by an attentive student. Include:

1. **Title & Overview** - Clear topic title and 2-3 sentence summary
2. **Key Concepts** - Main ideas explained simply with examples
3. **Important Points** - Bullet points of critical information
4. **Diagrams & Visual Notes** - Describe any diagrams, equations, or board drawings you see in the images
5. **Formulas & Equations** - Any mathematical or scientific formulas, properly formatted
6. **Examples** - Worked examples or case studies mentioned
7. **Important Questions** - 5-10 practice questions covering the material (mix of recall, understanding, and application)
8. **Quick Summary** - One paragraph recap for revision

**Lecture Transcript:**
${lectureText}

${frameBase64Array.length > 0 ? `**Board/Screen Captures:** ${frameBase64Array.length} images provided showing diagrams and notes` : '**Note:** No images available, working from transcript only'}

Create the notes now. Use clear markdown formatting with headers, bullet points, numbered lists, code blocks for formulas, and emphasis. Write naturally as if a smart student created these notes.`;

  const textOnlyParts = [{ text: prompt }];
  const multimodalParts = [...textOnlyParts];
  for (const base64Frame of frameBase64Array) {
    multimodalParts.push({ inlineData: { mimeType: 'image/png', data: base64Frame } });
  }

  const candidates = getModelCandidates();
  let lastErr = null;
  for (const { version, client } of clients) {
    for (const candidate of candidates) {
      // Try multimodal first, then retry text-only if the model rejects images
      for (const partsVariant of [multimodalParts, textOnlyParts]) {
        try {
          const model = client.getGenerativeModel({ model: candidate });
          const result = await model.generateContent(partsVariant);
          const response = await result.response;
          defaultModelName = candidate; // remember the working model
          return response.text();
        } catch (error) {
          const msg = String(error && error.message || error);
          const retriable = /404|not found|unsupported|ListModels|INVALID_ARGUMENT|does not support|not supported for generateContent/i.test(msg);
          lastErr = error;
          if (retriable) {
            continue; // try next variant/model/version
          }
          console.error(`Gemini API error (${version}/${candidate}):`, error);
          throw new Error('Failed to generate study notes: ' + msg);
        }
      }
    }
  }
  console.error('Gemini model selection failed. Tried versions/models:', clients.map(c=>c.version), candidates);
  throw new Error('Failed to generate study notes: ' + (lastErr ? lastErr.message : 'No compatible model/version found'));
}

/**
 * Chat with AI about the study notes (Q&A, clarifications, teaching)
 * @param {string} notesContent - The generated study notes
 * @param {string} userQuestion - Student's question
 * @param {Array} chatHistory - Previous messages [{role: 'user'|'model', parts: [{text: '...'}]}]
 * @returns {Promise<{answer: string, history: Array}>} - AI response and updated history
 */
async function chatWithNotes(notesContent, userQuestion, chatHistory = []) {
  initialize();

  const systemContext = `You are a friendly, patient teacher helping a student understand their class notes. 

**The student's study notes:**
${notesContent}

**Your role:**
- Answer questions about the notes clearly and simply
- Explain concepts in multiple ways if needed
- Give examples to clarify difficult topics
- Encourage the student and build their confidence
- If asked about something not in the notes, politely say you can only help with this specific lecture material
- Use analogies, step-by-step breakdowns, and visual descriptions
- Be encouraging and supportive like a great teacher

Always respond in a warm, helpful tone. Keep explanations concise but thorough.`;

  // Build full conversation history
  const fullHistory = [
    { role: 'user', parts: [{ text: systemContext }] },
    { role: 'model', parts: [{ text: 'I understand! I\'m here to help you learn this material. What would you like to know?' }] },
    ...chatHistory,
    { role: 'user', parts: [{ text: userQuestion }] }
  ];

  const candidates = getModelCandidates();
  let lastErr = null;
  for (const { version, client } of clients) {
    for (const candidate of candidates) {
      try {
        const chatModel = client.getGenerativeModel({ model: candidate });
        const chat = chatModel.startChat({ history: fullHistory.slice(0, -1) });
        const result = await chat.sendMessage(userQuestion);
        const response = await result.response;
        const answer = response.text();
        defaultModelName = candidate;
        const updatedHistory = [
          ...chatHistory,
          { role: 'user', parts: [{ text: userQuestion }] },
          { role: 'model', parts: [{ text: answer }] }
        ];
        return { answer, history: updatedHistory };
      } catch (error) {
        const msg = String(error && error.message || error);
        const retriable = /404|not found|unsupported|ListModels|INVALID_ARGUMENT|not supported/i.test(msg);
        lastErr = error;
        if (retriable) continue;
        console.error(`Chat error (${version}/${candidate}):`, error);
        throw new Error('Failed to process question: ' + msg);
      }
    }
  }
  console.error('Gemini chat model selection failed. Tried versions/models:', clients.map(c=>c.version), candidates);
  throw new Error('Failed to process question: ' + (lastErr ? lastErr.message : 'No compatible model/version found'));
}

/**
 * Check if AI service is properly configured
 */
function isConfigured() {
  const key = process.env.GEMINI_API_KEY;
  return key && key !== 'your_api_key_here' && process.env.AI_ENABLED === 'true';
}

module.exports = {
  generateStudyNotes,
  chatWithNotes,
  isConfigured
};
