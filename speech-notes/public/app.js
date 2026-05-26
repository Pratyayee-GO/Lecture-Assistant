(() => {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const historyBtn = document.getElementById('historyBtn');
  const startVideoBtn = document.getElementById('startVideoBtn');
  const stopVideoBtn = document.getElementById('stopVideoBtn');
  const live = document.getElementById('live');
  const statusEl = document.getElementById('status');
  const videoStatusEl = document.getElementById('videoStatus');
  const savedList = document.getElementById('savedList');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const hasMediaRecorder = typeof window.MediaRecorder !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  if (!SpeechRecognition) {
    status('SpeechRecognition not supported. Try Chrome on desktop.');
    startBtn.disabled = true;
    stopBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = true; // keep listening
  recognition.interimResults = true; // show partials

  let listening = false;
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];

  recognition.onstart = () => {
    listening = true;
    status('Listening…');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    // Speech and video are now separate; no auto-start of video
  };

  recognition.onend = () => {
    listening = false;
    status('Idle');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    // Do not auto-stop video; user controls it separately
  };

  recognition.onerror = (e) => {
    console.error('recognition error', e);
    status('Error: ' + (e.error || 'unknown'));
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i];
      const text = r[0].transcript;
      if (r.isFinal) {
        appendSaved(text.trim());
        saveToBackend(text.trim());
      } else {
        interimTranscript += text;
      }
    }
    live.textContent = interimTranscript;
  };

  function status(msg) {
    statusEl.textContent = msg;
  }

  function appendSaved(text) {
    if (!text) return;
    const li = document.createElement('li');
    li.className = 'item';
    li.innerHTML = `<div class="text">${escapeHtml(text)}</div>`;
    savedList.prepend(li);
  }

  async function saveToBackend(text) {
    try {
      const url = `${window.API_BASE || ''}/api/notes`;
      console.log('[notes] POST', url, { text });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[notes] save failed', res.status, body);
        throw new Error(`Failed to save (${res.status})`);
      }
      console.log('[notes] saved OK');
    } catch (err) {
      console.error(err);
      status('Could not save to DB (will stay local in this view)');
    }
  }

  function escapeHtml(str) {
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  startBtn.addEventListener('click', () => {
    if (!listening) {
      recognition.start();
    }
  });
  stopBtn.addEventListener('click', () => {
    if (listening) {
      recognition.stop();
    }
  });
  historyBtn.addEventListener('click', () => {
    window.open('history.html', '_blank');
  });

  // Initialize video buttons
  if (!hasMediaRecorder) {
    startVideoBtn.disabled = true;
    stopVideoBtn.disabled = true;
    videoStatus('MediaRecorder not supported in this browser');
  } else {
    videoStatus('Not recording');
  }

  startVideoBtn.addEventListener('click', () => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      startVideoRecording().catch(err => {
        console.error('video start failed', err);
        videoStatus('Video error: ' + (err && err.message ? err.message : 'unknown'));
      });
    }
  });
  stopVideoBtn.addEventListener('click', () => {
    stopVideoRecordingAndUpload();
  });

  async function startVideoRecording() {
    if (!hasMediaRecorder) return;
    // Video-only recording (no audio)
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const mime = pickSupportedMimeType();
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, mime ? { mimeType: mime } : undefined);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      if (!recordedChunks.length) return cleanupStream();
      const blob = new Blob(recordedChunks, { type: mime || 'video/webm' });
      try {
        await uploadVideoBlob(blob);
        videoStatus('Video saved');
      } catch (e) {
        console.error('upload failed', e);
        videoStatus('Video upload failed');
      } finally {
        cleanupStream();
      }
    };
    mediaRecorder.start();
    startVideoBtn.disabled = true;
    stopVideoBtn.disabled = false;
    videoStatus('Recording… (no audio)');
  }

  function stopVideoRecordingAndUpload() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      startVideoBtn.disabled = false;
      stopVideoBtn.disabled = true;
    } else {
      cleanupStream();
    }
  }

  function cleanupStream() {
    if (mediaStream) {
      for (const track of mediaStream.getTracks()) track.stop();
    }
    mediaStream = null;
    mediaRecorder = null;
    recordedChunks = [];
  }

  function pickSupportedMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac' // often not supported for MediaRecorder in browsers
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
    }
    return '';
  }

  async function uploadVideoBlob(blob) {
    const form = new FormData();
    const filename = `recording-${Date.now()}.webm`;
    form.append('video', blob, filename);
    const url = `${window.API_BASE || ''}/api/videos`;
    console.log('[video] POST', url, filename, 'size', blob.size);
    const res = await fetch(url, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn('[video] upload failed', res.status, body);
      throw new Error(`upload failed (${res.status})`);
    }
    console.log('[video] upload OK');
  }

  function videoStatus(msg) {
    videoStatusEl.textContent = msg;
  }
})();
