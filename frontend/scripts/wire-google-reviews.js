const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.js');
let text = fs.readFileSync(appPath, 'utf8');

const start = text.indexOf('const TestimonialsSection = () => {');
const endMarker = '\n\nconst Home = () => {';
const end = text.indexOf(endMarker, start);
if (start === -1 || end === -1) {
  throw new Error('Legacy TestimonialsSection block not found; refusing to modify App.js.');
}

// Route store links to the actual Memories Google Business Profile, never the nearby Plus Code.
const plusCodeUrls = [
  'https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu',
  'https://maps.google.com/?q=32J2+PJ+Coimbatore,+Tamil+Nadu'
];
const businessProfileUrl = 'https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw';
for (const plusCodeUrl of plusCodeUrls) {
  text = text.replaceAll(plusCodeUrl, businessProfileUrl);
}

const replacement = `const TestimonialsSection = () => null;`;
text = text.slice(0, start) + replacement + text.slice(end);
fs.writeFileSync(appPath, text, 'utf8');
console.log('Google store/review wiring applied: store links use the Memories Business Profile and legacy sample testimonials are disabled.');
