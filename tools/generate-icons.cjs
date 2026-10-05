const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, '../assets/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create a beautiful SVG for Cardable temporary dev icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14151B"/>
      <stop offset="50%" stop-color="#090A0D"/>
      <stop offset="100%" stop-color="#040405"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#8E9399" stop-opacity="0.8"/>
      <stop offset="35%" stop-color="#3A3D45" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="#707682" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#1E2026" stop-opacity="0.3"/>
    </linearGradient>
    <linearGradient id="coreGrad" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="50%" stop-color="#9BA1AC"/>
      <stop offset="100%" stop-color="#484C56"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00F0FF" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="#7000FF" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#FF007A" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Base background with rounded corners -->
  <rect x="16" y="16" width="480" height="480" rx="96" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="4"/>

  <!-- Inner subtle bezel -->
  <rect x="32" y="32" width="448" height="448" rx="82" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1.5"/>

  <!-- Cardable Die / GPU Card Silhouette -->
  <!-- Outer card frame -->
  <rect x="96" y="68" width="320" height="376" rx="32" fill="#0C0D11" stroke="url(#borderGrad)" stroke-width="3"/>
  <rect x="110" y="82" width="292" height="348" rx="22" fill="#111217" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

  <!-- Holographic accent ribbon / top stripe -->
  <path d="M 124 96 L 388 96" stroke="url(#accentGrad)" stroke-width="3" stroke-linecap="round" opacity="0.85"/>

  <!-- Stylized Geometric "C" / GPU Core Fan Aperture -->
  <g transform="translate(256, 226)">
    <!-- Outer rotor ring -->
    <circle cx="0" cy="0" r="76" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
    <!-- Bold Titanium C mark -->
    <path d="M 46 -46 A 65 65 0 1 0 46 46 L 24 24 A 35 35 0 1 1 24 -24 Z" fill="url(#coreGrad)" filter="url(#glow)"/>
    <!-- Center die core -->
    <rect x="-16" y="-16" width="32" height="32" rx="6" fill="#08080A" stroke="url(#coreGrad)" stroke-width="2"/>
    <circle cx="0" cy="0" r="4" fill="#00F0FF" opacity="0.9"/>
  </g>

  <!-- Gold/Titan contact pins at card bottom -->
  <g transform="translate(136, 386)">
    <rect x="0" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="24" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="48" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="72" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="120" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="144" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="168" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="192" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
    <rect x="216" y="0" width="16" height="20" rx="3" fill="#8E9399" opacity="0.6"/>
  </g>

  <!-- Typography: CARDABLE -->
  <text x="256" y="344" text-anchor="middle" font-family="'Inter', system-ui, sans-serif" font-weight="700" font-size="22" letter-spacing="4" fill="#F5F5F7">CARDABLE</text>
  <text x="256" y="364" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-weight="500" font-size="11" letter-spacing="2" fill="#8E8E93">DEV EDITION</text>
</svg>`;

const svgPath = path.join(iconsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgContent, 'utf8');

function renderWithChrome(size, outputPath) {
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${size}px; height: ${size}px; background: rgba(0,0,0,0); overflow: hidden; }
    img { width: ${size}px; height: ${size}px; display: block; }
  </style>
</head>
<body>
  <img src="file://${svgPath.replace(/\\/g, '/')}" />
</body>
</html>`;
  const tempHtml = path.join(iconsDir, `temp-${size}.html`);
  fs.writeFileSync(tempHtml, htmlContent, 'utf8');

  try {
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const cmd = `"${chromePath}" --headless --disable-gpu --default-background-color=00000000 --hide-scrollbars --window-size=${size},${size} --screenshot="${outputPath}" "file://${tempHtml.replace(/\\/g, '/')}"`;
    execSync(cmd, { stdio: 'pipe' });
  } finally {
    if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
  }
}

function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const entries = [];
  for (const item of pngBuffers) {
    entries.push({
      width: item.width >= 256 ? 0 : item.width,
      height: item.height >= 256 ? 0 : item.height,
      size: item.buffer.length,
      offset: offset,
      buffer: item.buffer
    });
    offset += item.buffer.length;
  }
  const icoBuffer = Buffer.alloc(offset);
  icoBuffer.writeUInt16LE(0, 0); // reserved
  icoBuffer.writeUInt16LE(1, 2); // type: icon
  icoBuffer.writeUInt16LE(count, 4); // count
  let entryOffset = 6;
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, entryOffset);
    icoBuffer.writeUInt8(entry.height, entryOffset + 1);
    icoBuffer.writeUInt8(0, entryOffset + 2);
    icoBuffer.writeUInt8(0, entryOffset + 3);
    icoBuffer.writeUInt16LE(1, entryOffset + 4);
    icoBuffer.writeUInt16LE(32, entryOffset + 6);
    icoBuffer.writeUInt32LE(entry.size, entryOffset + 8);
    icoBuffer.writeUInt32LE(entry.offset, entryOffset + 12);
    entry.buffer.copy(icoBuffer, entry.offset);
    entryOffset += 16;
  }
  return icoBuffer;
}

async function main() {
  console.log('Rendering Cardable temporary icons...');
  const sizes = [512, 256, 128, 64, 48, 32, 16];
  const pngBuffers = [];

  for (const s of sizes) {
    const pngPath = path.join(iconsDir, s === 512 ? 'icon.png' : `icon-${s}.png`);
    renderWithChrome(s, pngPath);
    console.log(`Rendered ${s}x${s} -> ${pngPath}`);
    if (s <= 256) {
      pngBuffers.push({
        width: s,
        height: s,
        buffer: fs.readFileSync(pngPath)
      });
    }
  }

  // Also build icon.ico
  const icoPath = path.join(iconsDir, 'icon.ico');
  const icoData = buildIco(pngBuffers);
  fs.writeFileSync(icoPath, icoData);
  console.log(`Assembled multi-resolution ICO -> ${icoPath} (${icoData.length} bytes)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
