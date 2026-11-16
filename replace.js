import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (!['node_modules', '.next', '.git', '.vscode', '.gemini'].includes(f)) {
                walk(dirPath, callback);
            }
        } else {
            if (f.endsWith('.js') || f.endsWith('.md') || f.endsWith('.json') || f.endsWith('.css') || f.endsWith('.mjs')) {
                callback(dirPath);
            }
        }
    });
}

walk('.', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let newContent = content
        .replace(/Matessa/g, 'Matessa')
        .replace(/Matessa/g, 'Matessa')
        .replace(/matessa/g, 'matessa')
        .replace(/Matessa/g, 'Matessa')
        .replace(/matessa/g, 'matessa')
        .replace(/Matessa/gi, 'Matessa'); // Case insensitive fallback
    
    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
        console.log('Updated', filePath);
    }
});
