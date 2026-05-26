(() => {
  // Helper to construct API URLs
  const api = (path) => `${window.API_BASE || ''}${path}`;

  const notesList = document.getElementById('notesList');
  const viewerSection = document.getElementById('viewerSection');
  const viewerTitle = document.getElementById('viewerTitle');
  const noteViewer = document.getElementById('noteViewer');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const deleteNoteBtn = document.getElementById('deleteNoteBtn');
  const refreshBtn = document.getElementById('refreshBtn');

  let currentNote = null;
  let chatHistory = [];
  let aiEnabled = true;

  async function checkAIStatus() {
    try {
      const res = await fetch(api('/api/ai/status'));
      const data = await res.json();
      aiEnabled = !!data.enabled;
      if (!aiEnabled) {
        sendChatBtn.disabled = true;
        chatInput.disabled = true;
        chatInput.placeholder = 'AI disabled – add GEMINI_API_KEY to .env and set AI_ENABLED=true';
      } else {
        sendChatBtn.disabled = false;
        chatInput.disabled = false;
        if (!chatInput.placeholder || chatInput.placeholder.includes('disabled')) {
          chatInput.placeholder = 'Ask a question about these notes…';
        }
      }
    } catch (e) {
      // If status can't be fetched, disable chat to avoid 503 errors
      aiEnabled = false;
      sendChatBtn.disabled = true;
      chatInput.disabled = true;
      chatInput.placeholder = 'AI unavailable – try again after reload';
    }
  }

  // Simple markdown parser
  function renderMarkdown(md) {
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gim, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    
    // Wrap consecutive <li> in <ul>
    html = html.replace(/(<li>.*?<\/li>)+/gs, (match) => `<ul>${match}</ul>`);
    
    return `<p>${html}</p>`;
  }

  async function loadNotes() {
    try {
      const res = await fetch(api('/api/study-notes'));
      const data = await res.json();
      renderNotesList(data.studyNotes || []);
    } catch (err) {
      console.error(err);
      notesList.innerHTML = '<div class="empty-state">Failed to load notes</div>';
    }
  }

  function renderNotesList(notes) {
    if (!notes.length) {
      notesList.innerHTML = `
        <div class="empty-state">
          <p>No study notes yet.</p>
          <p>Go to <a href="history.html" style="color:var(--accent)">History</a> and click "Generate Study Notes" to create your first AI note!</p>
        </div>`;
      return;
    }

    notesList.innerHTML = '';
    for (const note of notes) {
      const card = document.createElement('div');
      card.className = 'note-card';
      card.innerHTML = `
        <div style="font-weight:600;">${escapeHtml(note.title)}</div>
        <div style="font-size:12px; color:var(--muted); margin-top:4px;">
          ${new Date(note.created_at).toLocaleString()}
        </div>
      `;
      card.onclick = (e) => selectNote(e, note);
      notesList.appendChild(card);
    }
  }

  async function selectNote(e, note) {
    currentNote = note;
    chatHistory = [];

    // Highlight active card
    document.querySelectorAll('.note-card').forEach(c => c.classList.remove('active'));
    if (e && e.currentTarget) {
      e.currentTarget.classList.add('active');
    }

    viewerTitle.textContent = note.title;
    noteViewer.innerHTML = renderMarkdown(note.content);
    chatMessages.innerHTML = '<div class="chat-message ai">Hi! I\'m here to help you understand this lecture. Ask me anything!</div>';
    viewerSection.style.display = 'block';
    viewerSection.scrollIntoView({ behavior: 'smooth' });
  }

  async function sendChat() {
    if (!aiEnabled) return;
    const question = chatInput.value.trim();
    if (!question || !currentNote) return;

    // Show user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.textContent = question;
    chatMessages.appendChild(userMsg);
    chatInput.value = '';

    // Show loading
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message ai';
    loadingMsg.textContent = 'Thinking...';
    chatMessages.appendChild(loadingMsg);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const res = await fetch(api(`/api/study-notes/${currentNote.id}/chat`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, history: chatHistory })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');

      loadingMsg.textContent = data.answer;
      chatHistory = data.history;
    } catch (err) {
      loadingMsg.textContent = '❌ ' + err.message;
      loadingMsg.style.color = '#ef4444';
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function deleteNote() {
    if (!currentNote) return;
    if (!confirm(`Delete "${currentNote.title}"?`)) return;

    try {
      const res = await fetch(api(`/api/study-notes/${currentNote.id}`), { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      
      viewerSection.style.display = 'none';
      currentNote = null;
      await loadNotes();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  sendChatBtn.addEventListener('click', sendChat);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
  });
  deleteNoteBtn.addEventListener('click', deleteNote);
  refreshBtn.addEventListener('click', loadNotes);

  checkAIStatus();
  loadNotes();
})();
