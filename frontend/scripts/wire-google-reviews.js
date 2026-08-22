const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.js');
let text = fs.readFileSync(appPath, 'utf8');

// Build-time safety wiring: only the genuine Google review component is rendered.
// The source file remains unchanged so this is repeatable on every clean deployment.
const start = text.indexOf('const TestimonialsSection = () => {');
const endMarker = '\n\nconst Home = () => {';
const end = text.indexOf(endMarker, start);
if (start === -1 || end === -1) {
  throw new Error('Legacy TestimonialsSection block not found; refusing to modify App.js.');
}

const replacement = `const TestimonialsSection = () => null;`;
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(appPath, text, 'utf8');
console.log('Google review wiring applied: legacy sample testimonials disabled.');
