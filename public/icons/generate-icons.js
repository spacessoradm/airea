import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'airea-icon.svg');

async function generateIcons() {
  console.log('Generating PWA icons from SVG...');
  
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated icon-${size}x${size}.png`);
  }
  
  // Also generate 16x16 and 32x32 for favicon
  for (const size of [16, 32]) {
    const outputPath = path.join(__dirname, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✓ Generated icon-${size}x${size}.png (favicon)`);
  }
  
  console.log('\n✓ All PWA icons generated successfully!');
}

generateIcons().catch(console.error);
