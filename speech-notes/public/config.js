// Configuration for connecting to Raspberry Pi server
// Change PI_SERVER_URL to your Raspberry Pi's IP address

const CONFIG = {
  // When running locally (testing): use empty string or 'http://localhost:3000'
  // When connecting to Pi: use 'http://192.168.x.x:3000' (replace with your Pi's IP)
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? '' // Same origin (local development)
    : '', // For production, add your Pi's IP: 'http://192.168.1.100:3000'
  
  // Override: Set this to your Pi's IP when serving frontend from laptop
  PI_SERVER_URL: 'http://10.202.63.147:3000',
};

// Use Pi server if specified, otherwise use API_BASE_URL
// Normalize to avoid trailing slashes which can create double slashes in URLs
(function(){
  const base = (CONFIG.PI_SERVER_URL || CONFIG.API_BASE_URL || '').replace(/\/+$/, '');
  window.API_BASE = base;
})();

console.log('🔧 API Base URL:', window.API_BASE || '(same origin)');
