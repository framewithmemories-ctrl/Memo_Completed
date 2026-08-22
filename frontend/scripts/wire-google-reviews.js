const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.js');
let text = fs.readFileSync(appPath, 'utf8');

// Use the verified Google Business Profile Place ID returned by the live review integration.
// Google recommends Maps URLs with a query + place ID for exact place details and directions.
const GOOGLE_PLACE_ID = 'ChIJ9dQb1b33qDsRTLJ9I1nkuqo';
const GOOGLE_STORE_QUERY = 'Memories Frames & Gift Shop, 19 B KANNI NILLAM, Keeranatham Rd, near RUBY SCHOOL, Saravanampatti, Coimbatore, Tamil Nadu 641035';
const GOOGLE_STORE_PROFILE_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(GOOGLE_STORE_QUERY)}&query_place_id=${GOOGLE_PLACE_ID}`;
const GOOGLE_STORE_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(GOOGLE_STORE_QUERY)}&destination_place_id=${GOOGLE_PLACE_ID}`;

// Remove the old nearby Plus Code and stale hand-built Google Maps place URL from the homepage/footer.
const oldStoreUrls = [
  'https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu',
  'https://maps.google.com/?q=32J2+PJ+Coimbatore,+Tamil+Nadu',
  'https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw'
];
for (const oldUrl of oldStoreUrls) {
  text = text.replaceAll(oldUrl, GOOGLE_STORE_PROFILE_URL);
}

// Patch the separate About Us page too. Keep its links tied to the same verified Place ID.
const aboutPath = path.join(__dirname, '..', 'src', 'components', 'AboutUsPage.js');
let aboutText = fs.readFileSync(aboutPath, 'utf8');
const constantsPattern = /const GOOGLE_PLACE_ID = .*?;\nconst GOOGLE_STORE_QUERY = .*?;\nconst GOOGLE_STORE_PROFILE_URL = .*?;\nconst GOOGLE_STORE_DIRECTIONS_URL = .*?;/s;
const constantsReplacement = `const GOOGLE_PLACE_ID = "${GOOGLE_PLACE_ID}";\nconst GOOGLE_STORE_QUERY = "${GOOGLE_STORE_QUERY}";\nconst GOOGLE_STORE_PROFILE_URL = \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(GOOGLE_STORE_QUERY)}&query_place_id=\${GOOGLE_PLACE_ID}\`;\nconst GOOGLE_STORE_DIRECTIONS_URL = \`https://www.google.com/maps/dir/?api=1&destination=\${encodeURIComponent(GOOGLE_STORE_QUERY)}&destination_place_id=\${GOOGLE_PLACE_ID}\`;`;
if (constantsPattern.test(aboutText)) {
  aboutText = aboutText.replace(constantsPattern, constantsReplacement);
}

// Navigate directly instead of opening an intermediate blank tab/window.
aboutText = aboutText.replaceAll(
  'onClick={() => window.open(GOOGLE_STORE_DIRECTIONS_URL, \'_blank\', \'noopener,noreferrer\')}',
  'onClick={() => { window.location.href = GOOGLE_STORE_DIRECTIONS_URL; }}'
);
aboutText = aboutText.replaceAll(
  'onClick={() => window.open(GOOGLE_STORE_PROFILE_URL, \'_blank\', \'noopener,noreferrer\')}',
  'onClick={() => { window.location.href = GOOGLE_STORE_PROFILE_URL; }}'
);

fs.writeFileSync(appPath, text, 'utf8');
fs.writeFileSync(aboutPath, aboutText, 'utf8');
console.log('Google store wiring applied: exact verified Place ID used for homepage/footer/About Us directions and store links.');
