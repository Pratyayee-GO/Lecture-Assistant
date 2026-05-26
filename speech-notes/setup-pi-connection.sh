#!/bin/bash

# Quick setup script for connecting to Raspberry Pi server
# This script helps you configure the frontend to connect to your Pi

echo "🔧 Raspberry Pi Server Configuration"
echo "===================================="
echo ""

# Get Pi IP from user
read -p "Enter your Raspberry Pi's IP address (e.g., 192.168.1.100): " PI_IP

if [ -z "$PI_IP" ]; then
  echo "❌ Error: IP address cannot be empty"
  exit 1
fi

# Validate IP format (basic check)
if ! [[ $PI_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "❌ Error: Invalid IP address format"
  exit 1
fi

# Update config.js
CONFIG_FILE="public/config.js"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: config.js not found. Are you in the project root?"
  exit 1
fi

# Backup original config
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup"

# Update the PI_SERVER_URL
sed -i.bak "s|PI_SERVER_URL: ''|PI_SERVER_URL: 'http://$PI_IP:3000'|g" "$CONFIG_FILE"

echo "✅ Configuration updated!"
echo ""
echo "📋 Next Steps:"
echo "   1. On your Pi, run: npm start"
echo "   2. On this laptop, run: python3 -m http.server 8080 (in public/ folder)"
echo "   3. Open browser to: http://localhost:8080"
echo ""
echo "🌐 Or directly access: http://$PI_IP:3000"
echo ""
echo "💾 Original config backed up to: ${CONFIG_FILE}.backup"
