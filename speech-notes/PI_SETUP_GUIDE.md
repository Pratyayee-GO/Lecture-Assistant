# 🚀 Raspberry Pi Server + Laptop Client Setup Guide

## Overview
This setup allows you to run the backend/server on your Raspberry Pi while accessing the frontend from your laptop's browser. The laptop captures audio/video data and sends it to the Pi for processing.

## Architecture
```
┌─────────────────┐         Network          ┌──────────────────┐
│   Your Laptop   │ ◄────────────────────► │  Raspberry Pi    │
│                 │                          │                  │
│ • Browser UI    │    HTTP/WebSocket        │ • Node.js Server │
│ • Camera/Mic    │                          │ • Database       │
│ • Video Capture │                          │ • AI Processing  │
└─────────────────┘                          └──────────────────┘
```

## 📋 Prerequisites
- Raspberry Pi with network connection (WiFi or Ethernet)
- Laptop on the same network as the Pi
- SD card with fresh Raspberry Pi OS (if issues persist)

---

## 🔧 Setup Instructions

### **Part 1: Setup Raspberry Pi Server (15 mins)**

#### 1. Get Your Pi's IP Address
SSH into your Raspberry Pi or connect directly, then run:
```bash
hostname -I
```
You'll see something like: `192.168.1.100` (note this down!)

#### 2. Transfer Your Project to Pi
From your laptop, copy the project folder to the Pi:
```bash
# Option A: Using SCP (from your laptop)
scp -r /Users/pritimmondal/Learnings/projects/speech-notes pi@192.168.1.100:~/

# Option B: Using rsync (better for updates)
rsync -avz --progress /Users/pritimmondal/Learnings/projects/speech-notes pi@192.168.1.100:~/
```

#### 3. Install Dependencies on Pi
SSH into your Pi:
```bash
ssh pi@192.168.1.100
```

Then navigate to the project and install:
```bash
cd ~/speech-notes
npm install
```

#### 4. Configure Environment Variables (if using AI features)
Create or edit `.env` file on the Pi:
```bash
nano .env
```

Add your configuration:
```env
PORT=3000
GEMINI_API_KEY=your_api_key_here
AI_ENABLED=true
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

#### 5. Start the Server on Pi
```bash
npm start
```

You should see:
```
🚀 Speech Notes Server Running:
   Local:    http://localhost:3000
   Network:  http://192.168.1.100:3000

📱 Connect from your laptop using the Network URL
```

**Keep this terminal running!** The Pi is now your server.

---

### **Part 2: Connect from Your Laptop (5 mins)**

#### Option A: Quick Test (Direct Access)
Simply open your laptop's browser and go to:
```
http://192.168.1.100:3000
```
(Replace with your Pi's actual IP)

This works immediately but requires typing the IP each time.

#### Option B: Serve Frontend Locally (Better for Demo)

1. **Update config on your laptop:**
   Edit `/Users/pritimmondal/Learnings/projects/speech-notes/public/config.js`:
   ```javascript
   const CONFIG = {
     API_BASE_URL: '',
     PI_SERVER_URL: 'http://192.168.1.100:3000', // Your Pi's IP
   };
   ```

2. **Start a simple HTTP server on your laptop:**
   ```bash
   cd /Users/pritimmondal/Learnings/projects/speech-notes/public
   python3 -m http.server 8080
   ```

3. **Open in browser:**
   ```
   http://localhost:8080
   ```

Now your laptop serves the UI, but all processing happens on the Pi!

---

## ✅ Testing the Setup

### 1. Test Speech Recognition
- Click "Start Listening" button
- Speak into your laptop's microphone
- Text should appear and be saved to Pi's database
- Check Pi's terminal for logs: `POST /api/notes 201`

### 2. Test Video Recording
- Click "Start Video" button
- Allow camera access
- Record for a few seconds
- Click "Stop Video"
- Check Pi's terminal: `POST /api/videos 201`

### 3. Test AI Features (if enabled)
- Go to History tab
- Select some notes
- Click "Generate Study Notes"
- Should create AI-processed notes stored on Pi

---

## 🎯 For Your Demonstration

### What to Show the Judges:

1. **Show the Architecture:**
   - Point out the Pi running the server (terminal with logs)
   - Show your laptop browser accessing the Pi
   - Explain: "Browser can't open on Pi due to segfault, so we split the architecture"

2. **Demonstrate Functionality:**
   - Record audio → saved to Pi's database
   - Record video → processed and stored on Pi
   - Show AI features → Gemini API runs on Pi

3. **Show Network Connection:**
   - In browser DevTools (F12) → Network tab
   - Show requests going to `192.168.1.100:3000`
   - This proves the Pi is doing the work!

4. **Emphasize Pi's Role:**
   - "The Raspberry Pi is our backend server"
   - "All data processing, storage, and AI happens on the Pi"
   - "The laptop is just a client interface"

---

## 🔍 Troubleshooting

### Can't Connect from Laptop?
```bash
# On Pi, check if server is running:
sudo netstat -tlnp | grep 3000

# Check firewall (usually not needed on Pi OS):
sudo ufw status

# Test from Pi itself:
curl http://localhost:3000/api/health
```

### CORS Errors in Browser?
The server is already configured with CORS enabled. If you still see errors:
1. Make sure you updated `config.js` with the correct Pi IP
2. Clear browser cache (Cmd+Shift+R on Mac)

### Pi IP Address Changes?
If your Pi's IP changes (common with DHCP):
```bash
# On Pi, set static IP:
sudo nano /etc/dhcpcd.conf

# Add at the end:
interface wlan0
static ip_address=192.168.1.100/24
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

### Node.js Out of Memory on Pi?
```bash
# Increase Node memory limit:
node --max-old-space-size=512 server.js
```

---

## 📱 Alternative: Mobile Hotspot Setup

If you don't have WiFi:
1. Create hotspot on your phone
2. Connect both Pi and laptop to hotspot
3. Follow same setup process
4. Get Pi's IP: `hostname -I`

---

## 🚀 Quick Start Commands (Summary)

**On Raspberry Pi:**
```bash
cd ~/speech-notes
npm start
# Note the Network IP shown
```

**On Your Laptop:**
```bash
# Update config.js with Pi's IP, then:
cd /Users/pritimmondal/Learnings/projects/speech-notes/public
python3 -m http.server 8080
# Open browser to http://localhost:8080
```

---

## 💡 Tips for Success

1. **Keep Pi terminal visible** during demo to show live logging
2. **Test everything before** the presentation
3. **Have a backup**: Take screenshots/video in case of demo issues
4. **Explain clearly**: This is a valid distributed system architecture!
5. **Practice your pitch**: "We encountered hardware limitations but adapted by implementing a client-server architecture, which is actually more scalable!"

---

## 📊 What's Running Where?

| Component | Location | Purpose |
|-----------|----------|---------|
| **Frontend HTML/CSS/JS** | Laptop Browser | User interface |
| **Camera/Microphone** | Laptop Hardware | Media capture |
| **HTTP Server** | Raspberry Pi | API endpoints |
| **Database (NeDB)** | Raspberry Pi | Data storage |
| **AI Processing** | Raspberry Pi | Gemini API calls |
| **Video Processing** | Raspberry Pi | FFmpeg keyframe extraction |

---

## 🎓 Technical Justification (for Judges)

This architecture is actually **superior** in many ways:
- **Scalability**: Multiple clients can connect to one Pi server
- **Resource Optimization**: Heavy processing on server, light UI on client
- **Modern Pattern**: Similar to web applications (React → Node.js backend)
- **Real IoT**: This IS how IoT devices work in production!

The segmentation fault issue led to a more robust, production-ready architecture. 🎉

---

Good luck with your presentation! 🚀
