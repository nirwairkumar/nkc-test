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

// ==========================================
// 1. ORIGINAL LOADING LOGO (Landscape 360x100)
// ==========================================
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 100" width="360" height="100%">
  <defs>
    <!-- Import Google Font Outfit -->
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
    
    <!-- Linear Gradient matching index.html loading page -->
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
  </defs>

  <!-- Centered Logo Text -->
  <text x="180" y="68" class="logo-text"><tspan class="cyan-part">Testo</tspan><tspan class="gold-z" dx="-3">Z</tspan><tspan class="cyan-part" dx="-2">a</tspan></text>
</svg>`;

// Write original landscape SVG files
fs.writeFileSync(path.join(publicDir, 'logo-testoza-loading.svg'), svgContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza-loading.svg'), svgContent, 'utf8');

// Render original landscape PNG
sharp(Buffer.from(svgContent))
  .resize(1440, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(publicDir, 'logo-testoza-loading.png'))
  .then(() => {
    return sharp(Buffer.from(svgContent))
      .resize(1440, 400, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(artifactDir, 'logo-testoza-loading.png'));
  })
  .then(() => {
    console.log('✓ Successfully generated landscape logo files.');
  })
  .catch((err) => {
    console.error('Error rendering landscape PNG:', err);
  });


// ==========================================
// 2. NEW SQUARE LOGO (1:1 Aspect Ratio 360x360)
// ==========================================
// We place the baseline at y="208" to optically center the 75px high text block vertically.
const svgSquareContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="360" height="360">
  <defs>
    <!-- Import Google Font Outfit -->
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
    
    <!-- Linear Gradient matching index.html loading page -->
    <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFE885" />
      <stop offset="50%" stop-color="#F4B838" />
      <stop offset="100%" stop-color="#9E6400" />
    </linearGradient>
  </defs>

  <!-- Centered Logo Text (Vertically centered baseline at y="208") -->
  <text x="180" y="208" class="logo-text"><tspan class="cyan-part">Testo</tspan><tspan class="gold-z" dx="-3">Z</tspan><tspan class="cyan-part" dx="-2">a</tspan></text>
</svg>`;

// Write square SVG files
fs.writeFileSync(path.join(publicDir, 'logo-testoza-square.svg'), svgSquareContent, 'utf8');
fs.writeFileSync(path.join(artifactDir, 'logo-testoza-square.svg'), svgSquareContent, 'utf8');

// Render square PNG (1000x1000px high-resolution transparent)
sharp(Buffer.from(svgSquareContent))
  .resize(1000, 1000, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(publicDir, 'logo-testoza-square.png'))
  .then(() => {
    return sharp(Buffer.from(svgSquareContent))
      .resize(1000, 1000, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(artifactDir, 'logo-testoza-square.png'));
  })
  .then(() => {
    console.log('✓ Successfully generated square logo files (1000x1000 transparent PNG).');
  })
  .catch((err) => {
    console.error('Error rendering square PNG:', err);
  });
