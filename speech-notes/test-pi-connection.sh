#!/bin/bash

# Test script to verify Pi server connectivity

echo "🧪 Testing Raspberry Pi Server Connection"
echo "=========================================="
echo ""

if [ -z "$1" ]; then
  echo "Usage: ./test-pi-connection.sh <PI_IP_ADDRESS>"
  echo "Example: ./test-pi-connection.sh 192.168.1.100"
  exit 1
fi

PI_IP=$1
BASE_URL="http://$PI_IP:3000"

echo "Testing connection to: $BASE_URL"
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
if curl -s --connect-timeout 5 "$BASE_URL/api/health" > /dev/null; then
  echo "   ✅ Server is reachable!"
  RESPONSE=$(curl -s "$BASE_URL/api/health")
  echo "   Response: $RESPONSE"
else
  echo "   ❌ Cannot reach server. Make sure:"
  echo "      - Pi is powered on and connected to network"
  echo "      - Server is running (npm start on Pi)"
  echo "      - IP address is correct"
  exit 1
fi

echo ""

# Test 2: Check notes API
echo "2️⃣  Testing notes API..."
if curl -s "$BASE_URL/api/notes" > /dev/null; then
  echo "   ✅ Notes API working!"
else
  echo "   ⚠️  Notes API might have issues"
fi

echo ""

# Test 3: Check videos API
echo "3️⃣  Testing videos API..."
if curl -s "$BASE_URL/api/videos" > /dev/null; then
  echo "   ✅ Videos API working!"
else
  echo "   ⚠️  Videos API might have issues"
fi

echo ""

# Test 4: Check AI status
echo "4️⃣  Testing AI status..."
AI_STATUS=$(curl -s "$BASE_URL/api/ai/status")
echo "   AI Status: $AI_STATUS"

echo ""
echo "=========================================="
echo "✨ Connection test complete!"
echo ""
echo "🌐 Open in browser: $BASE_URL"
echo ""
