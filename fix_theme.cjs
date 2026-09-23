const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replacements = [
  { match: /\bbg-slate-900\b/g, replace: 'bg-slate-50 dark:bg-slate-900' },
  { match: /\bbg-slate-800\b/g, replace: 'bg-white dark:bg-slate-800' },
  { match: /\bbg-slate-700\b/g, replace: 'bg-slate-100 dark:bg-slate-700' },
  { match: /\bborder-slate-700\b/g, replace: 'border-slate-200 dark:border-slate-700' },
  { match: /\bborder-slate-600\b/g, replace: 'border-slate-300 dark:border-slate-600' },
  { match: /\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
  { match: /\btext-slate-400\b/g, replace: 'text-slate-500 dark:text-slate-400' },
  { match: /\btext-slate-300\b/g, replace: 'text-slate-600 dark:text-slate-300' },
];

walkDir('./src/ui', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = content;
    
    // We must avoid double replacing if dark:bg-slate-900 is already present.
    // Instead of regex, let's just do a simple replace, but carefully.
    
    // Actually, simple regex with negative lookbehind would be ideal.
    // (?<!dark:)bg-slate-900
    
    const safeReplacements = [
      { match: /(?<!dark:)\bbg-slate-900\b/g, replace: 'bg-slate-50 dark:bg-slate-900' },
      { match: /(?<!dark:)\bbg-slate-800\b/g, replace: 'bg-white dark:bg-slate-800' },
      { match: /(?<!dark:)\bbg-slate-700\b/g, replace: 'bg-slate-100 dark:bg-slate-700' },
      { match: /(?<!dark:)\bborder-slate-700\b/g, replace: 'border-slate-200 dark:border-slate-700' },
      { match: /(?<!dark:)\bborder-slate-600\b/g, replace: 'border-slate-300 dark:border-slate-600' },
      { match: /(?<!dark:)\btext-white\b/g, replace: 'text-slate-900 dark:text-white' },
      { match: /(?<!dark:)\btext-slate-400\b/g, replace: 'text-slate-500 dark:text-slate-400' },
      { match: /(?<!dark:)\btext-slate-300\b/g, replace: 'text-slate-600 dark:text-slate-300' },
    ];

    safeReplacements.forEach(r => {
      modified = modified.replace(r.match, r.replace);
    });

    if (content !== modified) {
      fs.writeFileSync(filePath, modified, 'utf-8');
      console.log('Fixed', filePath);
    }
  }
});
