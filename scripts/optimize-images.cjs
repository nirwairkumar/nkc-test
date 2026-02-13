const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');

const imagesToConvert = [
  { name: 'default-og.png', quality: 85 },
  { name: 'education_anime_bg.png', quality: 85 },
  { name: 'education_bg.png', quality: 85 },
  { name: 'math_formula.png', quality: 85 },
  { name: 'verified-badge.png', quality: 85 },
  { name: 'anime_flask.png', quality: 85 },
  { name: 'chem_1.png', quality: 85 },
  { name: 'chem_2.png', quality: 85 },
  { name: 'chem_3.png', quality: 85 },
];

async function convertImage(filename, quality) {
  const inputPath = path.join(publicDir, filename);
  const outputPath = path.join(publicDir, filename.replace('.png', '.webp'));
  
  if (!fs.existsSync(inputPath)) {
    console.log(`⚠️  Skipping ${filename} - file not found`);
    return;
  }
  
  try {
    const originalStats = fs.statSync(inputPath);
    
    await sharp(inputPath)
      .webp({ 
        quality: quality,
        effort: 6,
        smartSubsample: true,
        nearLossless: false
      })
      .toFile(outputPath);
    
    const newStats = fs.statSync(outputPath);
    const savings = ((originalStats.size - newStats.size) / originalStats.size * 100).toFixed(1);
    
    console.log(`✅ ${filename} → ${filename.replace('.png', '.webp')}`);
    console.log(`   Original: ${(originalStats.size / 1024).toFixed(1)} KB`);
    console.log(`   WebP: ${(newStats.size / 1024).toFixed(1)} KB`);
    console.log(`   Savings: ${savings}%\n`);
  } catch (error) {
    console.error(`❌ Error converting ${filename}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Starting image optimization...\n');
  
  for (const { name, quality } of imagesToConvert) {
    await convertImage(name, quality);
  }
  
  console.log('✨ Image optimization complete!');
  console.log('\n📝 Usage in your components:');
  console.log('   <picture>');
  console.log('     <source srcSet="/image.webp" type="image/webp" />');
  console.log('     <img src="/image.png" alt="Description" loading="lazy" />');
  console.log('   </picture>');
}

main();