import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const replacements = [
    [/bg-\[\#0F1115\]/g, 'bg-theme-base'],
    [/ring-offset-\[\#0F1115\]/g, 'ring-offset-theme-base'],
    [/bg-\[\#16181D\]/g, 'bg-theme-card'],
    [/bg-white\/5/g, 'bg-theme-border/50'],
    [/bg-white\/10/g, 'bg-theme-border/100'],
    [/border-white\/5/g, 'border-theme-border'],
    [/border-white\/10/g, 'border-theme-border'],
    [/border-white\/20/g, 'border-theme-border'],
    [/text-white/g, 'text-theme-text'],
    [/text-gray-400/g, 'text-theme-muted'],
    [/text-gray-500/g, 'text-theme-muted/80'],
    [/(text|bg|border|from|to|via)-emerald-/g, '$1-theme-accent2-'],
    [/(text|bg|border|from|to|via)-blue-/g, '$1-theme-accent1-'],
    [/(text|bg|border|from|to|via)-purple-/g, '$1-theme-accent3-'],
    [/(text|bg|border)-yellow-/g, '$1-yellow-'], // leave yellow alone for warnings
    [/(text|bg|border)-red-/g, '$1-red-'] // leave red alone for errors
];

walkDir('./src', (filePath) => {
    if (!filePath.match(/\.(tsx|ts)$/)) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    replacements.forEach(([regex, replacement]) => {
        content = content.replace(regex, replacement);
    });

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Updated ' + filePath);
    }
});
