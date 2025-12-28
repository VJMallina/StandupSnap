const fs = require('fs');
const path = require('path');

// Replacement mapping
const replacements = {
  'teal-50': 'whatsapp-50',
  'teal-100': 'whatsapp-100',
  'teal-200': 'whatsapp-200',
  'teal-300': 'whatsapp-300',
  'teal-400': 'whatsapp-400',
  'teal-500': 'whatsapp-500',
  'teal-600': 'whatsapp-600',
  'teal-700': 'whatsapp-700',
  'teal-800': 'whatsapp-800',
  'teal-900': 'whatsapp-900',
};

// Gradient replacements per user instructions
const gradientReplacements = {
  'from-emerald-600 via-teal-600 to-cyan-600': 'from-whatsapp-500 via-whatsapp-600 to-whatsapp-700',
  'from-teal-500 to-cyan-500': 'from-whatsapp-500 to-whatsapp-600',
  'from-cyan-500 via-teal-500 to-emerald-600': 'from-whatsapp-600 via-whatsapp-500 to-whatsapp-400',
};

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walkDirectory(filePath, callback);
    } else if (/\.(tsx|ts|jsx|js)$/.test(file)) {
      callback(filePath);
    }
  });
}

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Apply gradient replacements first (more specific patterns)
  for (const [oldGradient, newGradient] of Object.entries(gradientReplacements)) {
    if (content.includes(oldGradient)) {
      content = content.split(oldGradient).join(newGradient);
      modified = true;
    }
  }

  // Apply color replacements
  for (const [oldColor, newColor] of Object.entries(replacements)) {
    if (content.includes(oldColor)) {
      content = content.split(oldColor).join(newColor);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
    return 1;
  }

  return 0;
}

// Process src directory
const srcDir = path.join(__dirname, 'src');
let filesUpdated = 0;

console.log('Starting teal to whatsapp color replacement...\n');

walkDirectory(srcDir, (filePath) => {
  filesUpdated += replaceInFile(filePath);
});

console.log(`\nComplete! Updated ${filesUpdated} files.`);
