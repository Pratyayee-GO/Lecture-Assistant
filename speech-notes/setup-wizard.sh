#!/bin/bash

# Color codes for better terminal output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

clear

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🎓 SPEECH NOTES - RASPBERRY PI SETUP WIZARD 🎓         ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${YELLOW}This wizard will help you set up your project to work with Raspberry Pi${NC}"
echo ""
echo "📋 What we'll do:"
echo "   1. Get your Raspberry Pi's IP address"
echo "   2. Update configuration files"
echo "   3. Provide setup instructions"
echo ""
echo -e "${BOLD}Press Enter to continue...${NC}"
read

# Step 1: Get Pi IP
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}STEP 1: Raspberry Pi IP Address${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "To find your Pi's IP address, run this on your Pi:"
echo -e "${GREEN}   hostname -I${NC}"
echo ""
read -p "Enter your Raspberry Pi's IP address: " PI_IP

# Validate IP
if [ -z "$PI_IP" ]; then
  echo -e "${RED}❌ Error: IP address cannot be empty${NC}"
  exit 1
fi

if ! [[ $PI_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}❌ Error: Invalid IP address format${NC}"
  exit 1
fi

echo -e "${GREEN}✓ IP address set to: $PI_IP${NC}"

# Step 2: Update config
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}STEP 2: Updating Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

CONFIG_FILE="public/config.js"

if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ Error: config.js not found. Are you in the project root?${NC}"
  exit 1
fi

# Backup
cp "$CONFIG_FILE" "${CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
echo -e "${YELLOW}📦 Original config backed up${NC}"

# Update
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|PI_SERVER_URL: ''|PI_SERVER_URL: 'http://$PI_IP:3000'|g" "$CONFIG_FILE"
else
  # Linux
  sed -i "s|PI_SERVER_URL: ''|PI_SERVER_URL: 'http://$PI_IP:3000'|g" "$CONFIG_FILE"
fi

echo -e "${GREEN}✓ Configuration updated${NC}"

# Step 3: Instructions
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}STEP 3: Next Steps${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BOLD}📱 On your Raspberry Pi:${NC}"
echo ""
echo "   1. Copy this project to your Pi:"
echo -e "      ${GREEN}scp -r $(pwd) pi@$PI_IP:~/${NC}"
echo ""
echo "   2. SSH into your Pi:"
echo -e "      ${GREEN}ssh pi@$PI_IP${NC}"
echo ""
echo "   3. Install dependencies and start server:"
echo -e "      ${GREEN}cd ~/speech-notes${NC}"
echo -e "      ${GREEN}npm install${NC}"
echo -e "      ${GREEN}npm start${NC}"
echo ""
echo -e "${BOLD}💻 On this laptop:${NC}"
echo ""
echo "   1. Start local server:"
echo -e "      ${GREEN}cd public${NC}"
echo -e "      ${GREEN}python3 -m http.server 8080${NC}"
echo ""
echo "   2. Open browser to:"
echo -e "      ${GREEN}http://localhost:8080${NC}"
echo ""
echo -e "${BOLD}🧪 Test Connection:${NC}"
echo ""
echo "   Open: ${GREEN}http://localhost:8080/pi-test.html${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}${BOLD}✨ Setup Complete!${NC}"
echo ""
echo "📚 For detailed instructions, see:"
echo "   • PI_SETUP_GUIDE.md (comprehensive guide)"
echo "   • QUICK_START.md (quick reference)"
echo ""
