#!/usr/bin/env node

/**
 * Displays local network URLs and a QR code for each —
 * scan with your phone camera to open the app instantly.
 * Uses 'qrcode-terminal' (auto-installed if missing).
 */

const { networkInterfaces } = require('os');
const { execSync } = require('child_process');

// Auto-install qrcode-terminal if not present
try {
  require.resolve('qrcode-terminal');
} catch {
  console.log('📦 Installing qrcode-terminal...');
  execSync('npm install qrcode-terminal --no-save', { stdio: 'inherit' });
}

const qrcode = require('qrcode-terminal');
const nets = networkInterfaces();

const urls = [];
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      urls.push({ iface: name, url: `http://${net.address}:3000` });
    }
  }
}

if (urls.length === 0) {
  console.log('\n⚠️  No active network interfaces found. Make sure you are connected to WiFi.\n');
  process.exit(1);
}

console.log('\n╔════════════════════════════════════════╗');
console.log('║       POA App — Mobile Access          ║');
console.log('╚════════════════════════════════════════╝\n');
console.log('📱 Scan the QR code with your phone camera (same WiFi)\n');

for (const { iface, url } of urls) {
  console.log(`─── Interface: ${iface} ───────────────────`);
  console.log(`  URL: ${url}\n`);
  qrcode.generate(url, { small: true });
  console.log('');
}

console.log('💡 Tip: Make sure your phone is on the same WiFi network.\n');