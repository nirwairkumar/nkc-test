import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Construct absolute paths
const publicDir = 'd:/Yuga Yatra/nkc-Test-platform/frontend/public';
const artifactDir = 'C:/Users/kumar/.gemini/antigravity/brain/43b54aa3-7b6b-4275-90b1-f91f83697d07/artifacts';

// Ensure directories exist
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

console.log('Starting asset generation pipeline...');

// ==========================================
// 1. LANDSCAPE LOGO (360x100 Viewport)
// ==========================================
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 100" width="360" height="100%">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&amp;display=swap');
      
      .logo-text {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 700;
        font-size: 54px;
        letter-spacing: -0.02em;
        text-anchor: middle;
        dominant-baseline: alphabetic;
      }
      
      .cyan-part {
        fill: #38bdf8;
      }
      
      .gold-z {
        font-weight: 900;
        font-size: 68.04px; /* 1.26 * 54px */
        fill: url(#gold-gradient);
      }
    </style>
    
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
  </defs>

  <text x="180" y="68" class="logo-text"><tspan class="cyan-part">Testo</tspan><tspan class="gold-z" dx="-3">Z</tspan><tspan class="cyan-part" dx="-2">a</tspan></text>
</svg>`;

// Write landscape SVG files
fs.writeFileSync(path.join(publicDir, 'logo-testoza.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(publicDir, 'logo-testoza-loading.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza-loading.svg'), svgContent, 'utf8');

// Render landscape PNG
sharp(Buffer.from(svgContent))
  .resize(1440, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(publicDir, 'logo-testoza-loading.png'));

// ==========================================
// 2. SQUARE LOGO (1:1 Aspect Ratio 360x360)
// ==========================================
const svgSquareContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;900&amp;display=swap');
      
      .logo-text {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 700;
        font-size: 90px;
        letter-spacing: -0.02em;
        text-anchor: middle;
        dominant-baseline: alphabetic;
      }
      
      .cyan-part {
        fill: #38bdf8;
      }
      
      .gold-z {
        font-weight: 900;
        font-size: 113.4px;
        fill: url(#gold-gradient);
      }
    </style>
    
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
  </defs>

  <text x="180" y="220" class="logo-text"><tspan class="cyan-part">Testo</tspan><tspan class="gold-z" dx="-5">Z</tspan><tspan class="cyan-part" dx="-3.5">a</tspan></text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'logo-testoza-square.svg'), svgSquareContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza-square.svg'), svgSquareContent, 'utf8');

sharp(Buffer.from(svgSquareContent))
  .resize(1000, 1000, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(publicDir, 'logo-testoza-square.png'));


// ==========================================
// 3. ICON LOGO / FAVICON (128x128 Viewport, "Z" only)
// ==========================================
const svgIconContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;display=swap');
      
      .gold-z-icon {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 900;
        font-size: 120px;
        fill: url(#gold-gradient);
        text-anchor: middle;
      }
    </style>
    
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
  </defs>

  <text x="64" y="98" class="gold-z-icon">Z</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'logo-testoza-icon.svg'), svgIconContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza-icon.svg'), svgIconContent, 'utf8');

// Overwrite favicon.ico with the icon PNG using sharp
// We also create favicon.png for modern browsers
sharp(Buffer.from(svgIconContent))
  .resize(32, 32)
  .png()
  .toFile(path.join(publicDir, 'favicon.png'))
  .then(() => {
    return sharp(Buffer.from(svgIconContent))
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
  })
  .then(() => {
    console.log('✓ Successfully generated Z-only favicon.ico and favicon.png.');
  })
  .catch((err) => {
    console.error('Error generating favicon:', err);
  });


// ==========================================
// 4. OPEN GRAPH IMAGE (1200x630 Viewport)
// ==========================================
const svgOgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;900&amp;display=swap');
      
      .bg {
        fill: #020617;
      }
      
      .logo-text {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 700;
        font-size: 130px;
        letter-spacing: -0.02em;
        text-anchor: middle;
        dominant-baseline: alphabetic;
      }
      
      .cyan-part {
        fill: #38bdf8;
      }
      
      .gold-z {
        font-weight: 900;
        font-size: 163.8px;
        fill: url(#gold-gradient);
      }
      
      .tagline {
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-weight: 500;
        font-size: 36px;
        fill: #94a3b8;
        text-anchor: middle;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
    </style>
    
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
    
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="100" result="blur" />
    </filter>
  </defs>

  <rect width="1200" height="630" class="bg" />
  
  <circle cx="200" cy="150" r="220" fill="#0284c7" opacity="0.18" filter="url(#glow)" />
  <circle cx="1000" cy="480" r="250" fill="#f59e0b" opacity="0.14" filter="url(#glow)" />

  <text x="600" y="280" class="logo-text"><tspan class="cyan-part">Testo</tspan><tspan class="gold-z" dx="-6">Z</tspan><tspan class="cyan-part" dx="-4">a</tspan></text>
  <text x="600" y="400" class="tagline">Conduct Secure Online Exams &amp; Mock Tests</text>
  <text x="600" y="460" class="tagline" font-size="28px" fill="#64748b">Create Instantly with AI • Anti-Cheat Proctoring • Auto-Grading</text>
</svg>`;

// Write OG SVG files
fs.writeFileSync(path.join(publicDir, 'default-og.svg'), svgOgContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'default-og.svg'), svgOgContent, 'utf8');

// Render OG PNG and WebP
sharp(Buffer.from(svgOgContent))
  .resize(1200, 630)
  .png()
  .toFile(path.join(publicDir, 'default-og.png'))
  .then(() => {
    return sharp(Buffer.from(svgOgContent))
      .resize(1200, 630)
      .webp({ quality: 90 })
      .toFile(path.join(publicDir, 'default-og.webp'));
  })
  .then(() => {
    return sharp(Buffer.from(svgOgContent))
      .resize(1200, 630)
      .png()
      .toFile(path.join(artifactDir, 'default-og.png'));
  })
  .then(() => {
    return sharp(Buffer.from(svgOgContent))
      .resize(1200, 630)
      .webp({ quality: 90 })
      .toFile(path.join(artifactDir, 'default-og.webp'));
  })
  .then(() => {
    console.log('✓ Successfully generated Open Graph banner default-og.png and default-og.webp.');
  })
  .catch((err) => {
    console.error('Error generating OG image:', err);
  });
