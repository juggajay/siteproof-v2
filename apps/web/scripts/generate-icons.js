#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple script to duplicate the existing icon for all required sizes
// In production, you'd use a proper image resizing tool

const sourceIcon = path.join(__dirname, '../public/icon-144.png');
const publicDir = path.join(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Icon sizes needed
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Copy icon for each size (in production, these would be properly resized)
sizes.forEach(size => {
  const targetPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  if (!fs.existsSync(targetPath)) {
    fs.copyFileSync(sourceIcon, targetPath);
    console.log(`✅ Created icon-${size}x${size}.png`);
  }
});

// Create favicon-16x16.png
const favicon16Path = path.join(publicDir, 'favicon-16x16.png');
if (!fs.existsSync(favicon16Path)) {
  fs.copyFileSync(sourceIcon, favicon16Path);
  console.log('✅ Created favicon-16x16.png');
}

// Create apple-touch-icon.png
const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
if (!fs.existsSync(appleTouchPath)) {
  fs.copyFileSync(sourceIcon, appleTouchPath);
  console.log('✅ Created apple-touch-icon.png');
}

console.log('\n✨ All icons generated successfully!');
console.log('Note: In production, use proper image resizing tools for optimal quality.');