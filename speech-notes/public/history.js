(() => {
  // Helper to construct API URLs
  const api = (path) => `${window.API_BASE || ''}${path}`;

  const listEl = document.getElementById('historyList');
  const refreshBtn = document.getElementById('refreshBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const generateStudyNotesBtn = document.getElementById('generateStudyNotesBtn');

  const videoListEl = document.getElementById('videoList');
  const refreshVideosBtn = document.getElementById('refreshVideosBtn');
  const clearAllVideosBtn = document.getElementById('clearAllVideosBtn');

  let selectedNoteIds = [];
  let selectedVideoIds = [];
  let aiEnabled = true;

  async function checkAIStatus() {
    try {
      const res = await fetch(api('/api/ai/status'));
      const data = await res.json();
      aiEnabled = !!data.enabled;
      if (!aiEnabled) {
        generateStudyNotesBtn.disabled = true;
        generateStudyNotesBtn.title = (data.reason ? `${data.reason}. ` : '') + 'Add GEMINI_API_KEY to .env and set AI_ENABLED=true';
        generateStudyNotesBtn.textContent = '🤖 Generate Study Notes (AI disabled)';
      } else {
        generateStudyNotesBtn.disabled = false;
        generateStudyNotesBtn.title = `Using model: ${data.model || 'gemini-1.5-flash'}`;
      }
    } catch (e) {
      // If status call fails, leave button as-is but don't crash the page
      aiEnabled = false;
      generateStudyNotesBtn.disabled = true;
      generateStudyNotesBtn.title = 'AI status unavailable';
      generateStudyNotesBtn.textContent = '🤖 Generate Study Notes (AI unavailable)';
    }
  }

  async function load() {
    const res = await fetch(api('/api/notes'));
    const data = await res.json();
    render(data.notes || []);
  }

  async function loadVideos() {
    const res = await fetch(api('/api/videos'));
    const data = await res.json();
    renderVideos(data.videos || []);
  }

  function render(items) {
    listEl.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = '<div>No notes yet.</div>';
      listEl.appendChild(li);
      return;
    }
    for (const n of items) {
      const li = document.createElement('li');
      li.className = 'item';
      const isSelected = selectedNoteIds.includes(n.id);
      li.innerHTML = `
        <div style="display:flex; align-items:start; gap:8px;">
          <input type="checkbox" data-note-id="${n.id}" ${isSelected ? 'checked' : ''} 
            style="margin-top:4px;" />
          <div>
            <div class="text">${escapeHtml(n.text)}</div>
            <div class="meta">${new Date(n.created_at).toLocaleString()}</div>
          </div>
        </div>
        <div>
          <button data-id="${n.id}" class="danger">Delete</button>
        </div>
      `;
      listEl.appendChild(li);
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

  listEl.addEventListener('click', async (e) => {
    const checkbox = e.target.closest('input[data-note-id]');
    if (checkbox) {
      const id = checkbox.getAttribute('data-note-id');
      if (checkbox.checked) {
        if (!selectedNoteIds.includes(id)) selectedNoteIds.push(id);
      } else {
        selectedNoteIds = selectedNoteIds.filter(x => x !== id);
      }
      return;
    }

    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!confirm('Delete this note?')) return;
    const res = await fetch(api(`/api/notes/${id}`), { method: 'DELETE' });
    if (res.ok) {
      await load();
    }
  });

  clearAllBtn.addEventListener('click', async () => {
    if (!confirm('This will delete ALL notes. Continue?')) return;
    const res = await fetch(api('/api/notes'), { method: 'DELETE' });
    if (res.ok) await load();
  });

  refreshBtn.addEventListener('click', load);

  // Videos section
  function renderVideos(items) {
    videoListEl.innerHTML = '';
    if (!items.length) {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = '<div>No videos yet.</div>';
      videoListEl.appendChild(li);
      return;
    }
    for (const v of items) {
      const li = document.createElement('li');
      li.className = 'item';
      const sizeKb = v.size ? Math.round(v.size / 1024) : 0;
      const isSelected = selectedVideoIds.includes(v.id);
      li.innerHTML = `
        <div style="display:flex; align-items:start; gap:8px;">
          <input type="checkbox" data-video-id="${v.id}" ${isSelected ? 'checked' : ''} 
            style="margin-top:4px;" />
          <div>
            <div class="text">${escapeHtml(v.originalName || v.filename)}</div>
            <div class="meta">${new Date(v.created_at).toLocaleString()} · ${sizeKb} KB</div>
          </div>
        </div>
        <div>
          <button data-play-id="${v.id}">Play</button>
          <button data-delv-id="${v.id}" class="danger">Delete</button>
        </div>
      `;
      videoListEl.appendChild(li);
    }
  }

  videoListEl.addEventListener('click', async (e) => {
    const checkbox = e.target.closest('input[data-video-id]');
    if (checkbox) {
      const id = checkbox.getAttribute('data-video-id');
      if (checkbox.checked) {
        if (!selectedVideoIds.includes(id)) selectedVideoIds.push(id);
      } else {
        selectedVideoIds = selectedVideoIds.filter(x => x !== id);
      }
      return;
    }

    const playBtn = e.target.closest('button[data-play-id]');
    if (playBtn) {
      const id = playBtn.getAttribute('data-play-id');
      const container = playBtn.closest('.item');
      if (container && !container.querySelector('video')) {
        const video = document.createElement('video');
        video.controls = true;
        video.style.maxWidth = '100%';
        // Use API base so it works when frontend served from localhost
        const base = (window.API_BASE || '').replace(/\/+$/, '');
        video.src = `${base}/api/videos/${id}/stream`;
        video.setAttribute('crossorigin', 'anonymous');
        container.appendChild(video);
      }
      return;
    }
    const delBtn = e.target.closest('button[data-delv-id]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-delv-id');
      if (!confirm('Delete this video?')) return;
      const res = await fetch(api(`/api/videos/${id}`), { method: 'DELETE' });
      if (res.ok) await loadVideos();
    }
  });

  refreshVideosBtn.addEventListener('click', loadVideos);
  clearAllVideosBtn.addEventListener('click', async () => {
    if (!confirm('This will delete ALL videos. Continue?')) return;
    const res = await fetch(api('/api/videos'), { method: 'DELETE' });
    if (res.ok) await loadVideos();
  });

  generateStudyNotesBtn.addEventListener('click', async () => {
    if (!aiEnabled) {
      alert('AI features are disabled. Please add GEMINI_API_KEY to .env and set AI_ENABLED=true, then restart the server.');
      return;
    }
    if (selectedNoteIds.length === 0 && selectedVideoIds.length === 0) {
      alert('Please select at least one text note or video to generate study notes.');
      return;
    }

    const title = prompt('Enter a title for your study notes:', `Lecture - ${new Date().toLocaleDateString()}`);
    if (!title) return;

    generateStudyNotesBtn.disabled = true;
    generateStudyNotesBtn.textContent = '⏳ Generating...';

    try {
      const res = await fetch(api('/api/study-notes/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteIds: selectedNoteIds,
          videoIds: selectedVideoIds,
          title
        })
      });

      const data = await res.json();
      if (!res.ok) {
        const extra = data && data.setup ? `\n\nSetup: ${data.setup}` : '';
        throw new Error((data && data.error) ? `${data.error}${extra}` : 'Generation failed');
      }

      alert('✅ Study notes generated successfully!');
      window.location.href = '/study-notes.html';
    } catch (err) {
      alert('❌ Failed to generate study notes:\n' + err.message);
    } finally {
      generateStudyNotesBtn.disabled = false;
      generateStudyNotesBtn.textContent = '🤖 Generate Study Notes from Selected';
    }
  });

  // Initial loads
  checkAIStatus();
  load();
  loadVideos();
})();
