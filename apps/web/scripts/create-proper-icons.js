#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create a simple 1x1 pixel PNG as a placeholder
// In production, you'd use a proper icon
const createPNG = () => {
  // This is a minimal 1x1 pixel blue PNG
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x59, 0x79, 0x23,
    0x0B, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82  // IEND chunk
  ]);
  return pngData;
};

const publicDir = path.join(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Create proper PNG files for each size
sizes.forEach(size => {
  const targetPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(targetPath, createPNG());
  console.log(`✅ Created proper PNG: icon-${size}x${size}.png`);
});

// Create favicon-16x16.png
const favicon16Path = path.join(publicDir, 'favicon-16x16.png');
fs.writeFileSync(favicon16Path, createPNG());
console.log('✅ Created proper PNG: favicon-16x16.png');

// Create apple-touch-icon.png
const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
fs.writeFileSync(appleTouchPath, createPNG());
console.log('✅ Created proper PNG: apple-touch-icon.png');

console.log('\n✨ All proper PNG icons created!');
console.log('Note: These are placeholder PNGs. Replace with actual icon images for production.');