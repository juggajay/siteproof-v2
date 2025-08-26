#!/usr/bin/env node

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');

// Create a proper icon with "SP" text (SiteProof)
function createIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#3B82F6'); // Blue
  gradient.addColorStop(1, '#1E40AF'); // Darker blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // White circle background for text
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Add "SP" text
  ctx.fillStyle = '#1E40AF';
  ctx.font = `bold ${size * 0.35}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', size / 2, size / 2);

  return canvas;
}

// Generate all required icon sizes
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

console.log('Generating icons...');

sizes.forEach((size) => {
  const canvas = createIcon(size);
  const buffer = canvas.toBuffer('image/png');

  // Save to icons directory
  if (size !== 16 && size !== 32) {
    const iconPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    fs.writeFileSync(iconPath, buffer);
    console.log(`✓ Generated ${iconPath}`);
  }

  // Save special files
  if (size === 16) {
    fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), buffer);
    console.log(`✓ Generated favicon-16x16.png`);
  }
  if (size === 32) {
    fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), buffer);
    console.log(`✓ Generated favicon-32x32.png`);
  }
  if (size === 144) {
    fs.writeFileSync(path.join(publicDir, 'icon-144.png'), buffer);
    console.log(`✓ Generated icon-144.png`);
  }
  if (size === 192) {
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buffer);
    console.log(`✓ Generated apple-touch-icon.png`);
  }
});

// Generate favicon.ico (multi-size)
const favicon16 = createIcon(16).toBuffer('image/png');
const favicon32 = createIcon(32).toBuffer('image/png');
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);
console.log('✓ Generated favicon.ico');

console.log('All icons generated successfully!');
