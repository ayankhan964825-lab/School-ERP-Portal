const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'storefront/public/products');
const tempDir = path.join(__dirname, 'storefront/public/temp_images');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const mapping = {
  'amla-powder.webp': 'raw-banana-powder.webp',
  'beet-root-powder.webp': 'curry-leaves-powder.webp',
  'carrot-powder.webp': 'green-chilli-powder.webp',
  'curry-leaves-powder.webp': 'spinach-palak-powder.webp',
  'garlic-powder.webp': 'amla-powder.webp',
  'ginger-powder.webp': 'lemon-powder.webp',
  'guava-candy.webp': 'red-onion-powder.webp',
  'haldi-powder.webp': 'moringa-powder.webp',
  'jamun-honey.webp': 'rose-powder.webp',
  'kiwi-candy.webp': 'beet-root-powder.webp',
  'lichee-honey.webp': 'tomato-powder.webp',
  'multiflora-honey.webp': 'dhaniya-leaves-powder.webp',
  'nutriboost.webp': 'pudina-powder.webp',
  'pudina-powder.webp': 'carrot-powder.webp',
  'raw-banana-powder.webp': 'karela-powder.webp',
  'raw-mango-leather-bar.webp': 'nutriboost.webp',
  'red-onion-powder.webp': 'garlic-powder.webp',
  'rose-powder.webp': 'ginger-powder.webp',
  'spinach-palak-powder.webp': 'haldi-powder.webp',
  'tomato-powder.webp': 'nutriboost-sugar-free.webp'
};

// Step 1: Move all matched files to temp folder with their NEW names
for (const [oldName, newName] of Object.entries(mapping)) {
  const oldPath = path.join(publicDir, oldName);
  const tempPath = path.join(tempDir, newName);
  
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, tempPath);
    console.log(`Moved ${oldName} to temp as ${newName}`);
  } else {
    console.log(`Missing ${oldName}`);
  }
}

// Step 2: Move them back to products folder
const tempFiles = fs.readdirSync(tempDir);
for (const file of tempFiles) {
  const tempPath = path.join(tempDir, file);
  const finalPath = path.join(publicDir, file);
  fs.renameSync(tempPath, finalPath);
  console.log(`Moved ${file} back to products/`);
}

// Clean up temp dir
fs.rmdirSync(tempDir);
console.log('Done!');
