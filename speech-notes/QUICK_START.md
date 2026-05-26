# 🚀 Quick Reference - Pi Server Setup

## 1️⃣ ON RASPBERRY PI

```bash
# Get your Pi's IP
hostname -I
# Example output: 192.168.1.100

# Go to project folder
cd ~/speech-notes

# Install dependencies (first time only)
npm install

# Start server
npm start
```

**Expected Output:**
```
🚀 Speech Notes Server Running:
   Local:    http://localhost:3000
   Network:  http://192.168.1.100:3000

📱 Connect from your laptop using the Network URL
```

✅ **Leave this running!**

---

## 2️⃣ ON YOUR LAPTOP

### Option A: Direct Access (Easiest)
Just open browser and go to:
```
http://192.168.1.100:3000
```
*(Replace with your actual Pi IP)*

### Option B: Local Frontend (Better for Demo)

**Terminal 1:**
```bash
cd /Users/pritimmondal/Learnings/projects/speech-notes

# Update config (do once)
nano public/config.js
# Change: PI_SERVER_URL: 'http://192.168.1.100:3000'
```

**Terminal 2:**
```bash
cd /Users/pritimmondal/Learnings/projects/speech-notes/public
python3 -m http.server 8080
```

**Browser:**
```
http://localhost:8080
```

---

## 🧪 Test Connection

Open test page:
```
http://localhost:8080/pi-test.html
```

Or use curl:
```bash
curl http://192.168.1.100:3000/api/health
```

---

## 🎬 Demo Checklist

Before your presentation:

- [ ] Pi is powered on and connected to network
- [ ] Server running on Pi (`npm start`)
- [ ] Get Pi's IP address (write it down!)
- [ ] Test from laptop browser
- [ ] Try recording speech
- [ ] Try recording video
- [ ] Check History tab works
- [ ] (Optional) Test AI features if enabled

---

## ⚡ Troubleshooting

**Can't connect?**
```bash
# On Pi, check if port 3000 is listening:
sudo netstat -tlnp | grep 3000

# Restart server:
# Press Ctrl+C to stop, then:
npm start
```

**Wrong IP?**
```bash
# On Pi:
hostname -I
ip addr show
```

**Need to copy project to Pi?**
```bash
# From laptop:
scp -r /Users/pritimmondal/Learnings/projects/speech-notes pi@PI_IP:~/
```

---

## 📱 Using Mobile Hotspot

If no WiFi available:
1. Enable hotspot on your phone
2. Connect Pi to hotspot (via WiFi settings)
3. Connect laptop to same hotspot
4. Get Pi's IP: `hostname -I`
5. Follow normal setup

---

## 🎯 What to Tell Judges

> "Due to browser compatibility issues on the Raspberry Pi, we implemented a **client-server architecture**. The Pi runs our **Node.js backend** handling all **data processing, storage, and AI features**. The laptop acts as a thin client for the user interface, with all computation happening on the Raspberry Pi. This is actually a more scalable architecture commonly used in IoT and cloud applications."

**Key Points:**
- ✅ All processing happens on Pi
- ✅ Database is on Pi  
- ✅ AI/ML runs on Pi
- ✅ This is how production systems work
- ✅ More scalable than all-in-one

---

## 📊 Architecture Diagram (for presentation)

```
┌──────────────┐                    ┌─────────────────┐
│   LAPTOP     │                    │  RASPBERRY PI   │
├──────────────┤                    ├─────────────────┤
│ • Browser UI │ ◄──────────────► │ • Node.js       │
│ • Camera     │   HTTP Requests    │ • Express API   │
│ • Microphone │                    │ • NeDB Database │
└──────────────┘                    │ • AI Processing │
                                     │ • FFmpeg        │
                                     └─────────────────┘
```

---

Good luck! 🎉
