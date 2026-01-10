const fs = require('fs').promises;
const path = require('path');

// Simple function to create basic square colored PNG data URLs
function createBasicIcon(size, bgColor = '#1a1a1a', textColor = '#ffffff') {
  // This creates a simple canvas-like data URL for basic testing
  // In production, proper icons would be generated using design tools
  const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.floor(size/8)}" fill="${bgColor}"/>
    <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="${Math.floor(size/4)}" font-weight="bold" fill="${textColor}">A</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(svgIcon).toString('base64')}`;
}

async function createIcons() {
  const iconSizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];
  const iconsDir = path.join(__dirname, 'public', 'icons');
  
  try {
    await fs.mkdir(iconsDir, { recursive: true });
    
    // Generate basic icon data for each size
    for (const size of iconSizes) {
      const iconData = createBasicIcon(size);
      console.log(`Generated icon data for ${size}x${size}`);
      
      // For now, we'll create placeholder files
      // In production, you would convert SVG to actual PNG files
      await fs.writeFile(
        path.join(iconsDir, `icon-${size}x${size}.png.txt`),
        `Icon placeholder for ${size}x${size}\nSVG Data: ${iconData.substring(0, 100)}...`
      );
    }
    
    console.log('Basic icon placeholders created!');
    console.log('Note: For production, convert the SVG icons to actual PNG files using a tool like sharp or imagemagick');
    
  } catch (error) {
    console.error('Error creating icons:', error);
  }
}

// Run only if called directly
if (require.main === module) {
  createIcons();
}

module.exports = { createIcons, createBasicIcon };