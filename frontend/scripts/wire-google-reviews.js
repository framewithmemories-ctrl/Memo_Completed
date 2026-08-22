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

// Always route the store button to the actual Memories Google Business Profile,
// never to the nearby Plus Code location.
const plusCodeUrl = "https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu";
const businessProfileUrl = "https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw";

if (text.includes(plusCodeUrl)) {
  text = text.replace(plusCodeUrl, businessProfileUrl);
  console.log('Google store wiring applied: Visit Our Store now opens the Memories Business Profile.');
} else {
  console.log('Google store wiring: Plus Code URL not found; leaving existing store link unchanged.');
}

const replacement = `const TestimonialsSection = () => null;`;
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(appPath, text, 'utf8');
console.log('Google review wiring applied: legacy sample testimonials disabled.');
