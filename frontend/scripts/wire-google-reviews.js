const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'App.js');
let text = fs.readFileSync(appPath, 'utf8');

// Use the verified Google Business Profile Place ID returned by the live review integration.
// The safest customer-facing destination is the verified Google Business Profile itself.
// Google Maps can reinterpret direct directions URLs, so both "Visit Store" and "Get Directions"
// intentionally open the same verified profile and let Google provide the Directions action.
const GOOGLE_PLACE_ID = 'ChIJ9dQb1b33qDsRTLJ9I1nkuqo';
const GOOGLE_STORE_NAME = 'Memories Frames & Gift Shop';
const GOOGLE_STORE_QUERY = 'Memories Frames & Gift Shop, 19 B KANNI NILLAM, Keeranatham Rd, near RUBY SCHOOL, Saravanampatti, Coimbatore, Tamil Nadu 641035';
const GOOGLE_STORE_COORDS = '11.0755,76.9983';
const GOOGLE_STORE_PROFILE_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(GOOGLE_STORE_NAME)}&query_place_id=${GOOGLE_PLACE_ID}`;
const GOOGLE_STORE_DIRECTIONS_URL = GOOGLE_STORE_PROFILE_URL;

// Remove old nearby Plus Code and stale hand-built Google Maps URLs from the homepage/footer.
const oldStoreUrls = [
  'https://maps.google.com/?q=32J2%2BPJ+Coimbatore,+Tamil+Nadu',
  'https://maps.google.com/?q=32J2+PJ+Coimbatore,+Tamil+Nadu',
  'https://www.google.com/maps/place/Memories+-+Photo+Frames+%26+Customized+Gift+Shop/@11.0755,76.9983,17z/data=!4m8!3m7!1s0x3ba859410e43c55f:0xd0f1eaeacbc9bf40!8m2!3d11.0755!4d76.9983!9m1!1b1!16s%2Fg%2F11s2y8k8qw'
];
for (const oldUrl of oldStoreUrls) {
  text = text.replaceAll(oldUrl, GOOGLE_STORE_PROFILE_URL);
}

// Replace the old homepage/footer Visit Our Store handler with the same verified profile URL.
text = text.replace(
  /onClick=\{\(\) => window\.open\('https:\/\/www\.google\.com\/maps\/place\/Memories[^']*', '_blank'\)\}/,
  "onClick={() => { window.location.href = GOOGLE_STORE_PROFILE_URL; }}"
);

// Make the initial product request tolerant of a sleeping backend. The old 6-second request
// produced a user-facing toast during normal backend cold starts. Retry silently instead.
const oldProductFetch = `const fetchProducts = async () => {\n      try {\n        const response = await axios.get(\`${'${API}'}/products\`, { timeout: 6000 });\n        if (!cancelled) setProducts(Array.isArray(response.data) ? response.data : []);\n      } catch (error) {\n        console.error('Error fetching products:', error);\n        if (!cancelled) toast.error(\"Products are taking longer to load. You can still browse and call us!\");\n      } finally {\n        if (!cancelled) setLoading(false);\n      }\n    };`;
const newProductFetch = `const fetchProducts = async () => {\n      const maxAttempts = 4;\n      for (let attempt = 1; attempt <= maxAttempts && !cancelled; attempt += 1) {\n        try {\n          const response = await axios.get(\`${'${API}'}/products\`, { timeout: 20000 });\n          if (!cancelled) setProducts(Array.isArray(response.data) ? response.data : []);\n          if (!cancelled) setLoading(false);\n          return;\n        } catch (error) {\n          console.error(\`Error fetching products (attempt ${'${attempt}'}/${'${maxAttempts}'}):\`, error);\n          if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 2500));\n        }\n      }\n      if (!cancelled) setLoading(false);\n    };`;
if (text.includes(oldProductFetch)) {
  text = text.replace(oldProductFetch, newProductFetch);
}

// Patch the Google review client so a sleeping backend does not permanently show a failure.
const reviewPath = path.join(__dirname, '..', 'src', 'components', 'ReviewSystemEnhanced.js');
let reviewText = fs.readFileSync(reviewPath, 'utf8');
const oldReviewLoader = `const loadGoogleReviews = async () => {\n    setIsLoading(true);\n    try {\n      const response = await axios.get(\`${'${API}'}/google-reviews\`, { timeout: 4500, headers: { Accept: 'application/json' } });\n      setGoogleData(response.data || null);\n    } catch (error) {\n      console.error('Unable to load Google reviews:', error);\n      setGoogleData({ configured: false, error: 'google_reviews_unavailable' });\n    } finally {\n      setIsLoading(false);\n    }\n  };`;
const newReviewLoader = `const loadGoogleReviews = async () => {\n    setIsLoading(true);\n    const maxAttempts = 4;\n    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {\n      try {\n        const response = await axios.get(\`${'${API}'}/google-reviews\`, { timeout: 15000, headers: { Accept: 'application/json' } });\n        setGoogleData(response.data || null);\n        setIsLoading(false);\n        return;\n      } catch (error) {\n        console.error(\`Unable to load Google reviews (attempt ${'${attempt}'}/${'${maxAttempts}'}):\`, error);\n        if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 3000));\n      }\n    }\n    setGoogleData({ configured: false, error: 'google_reviews_unavailable' });\n    setIsLoading(false);\n  };`;
if (reviewText.includes(oldReviewLoader)) {
  reviewText = reviewText.replace(oldReviewLoader, newReviewLoader);
}
reviewText = reviewText.replace('const timer = setTimeout(loadGoogleReviews, 1200);', 'const timer = setTimeout(loadGoogleReviews, 3000);');

// Patch the separate About Us page too. Keep all store-location actions tied to the same verified profile.
const aboutPath = path.join(__dirname, '..', 'src', 'components', 'AboutUsPage.js');
let aboutText = fs.readFileSync(aboutPath, 'utf8');
const constantsPattern = /const GOOGLE_PLACE_ID = .*?;\nconst GOOGLE_STORE_QUERY = .*?;\nconst GOOGLE_STORE_PROFILE_URL = .*?;\nconst GOOGLE_STORE_DIRECTIONS_URL = .*?;/s;
const constantsReplacement = `const GOOGLE_PLACE_ID = "${GOOGLE_PLACE_ID}";\nconst GOOGLE_STORE_NAME = "${GOOGLE_STORE_NAME}";\nconst GOOGLE_STORE_QUERY = "${GOOGLE_STORE_QUERY}";\nconst GOOGLE_STORE_COORDS = "${GOOGLE_STORE_COORDS}";\nconst GOOGLE_STORE_PROFILE_URL = \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(GOOGLE_STORE_NAME)}&query_place_id=\${GOOGLE_PLACE_ID}\`;\nconst GOOGLE_STORE_DIRECTIONS_URL = GOOGLE_STORE_PROFILE_URL;`;
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
fs.writeFileSync(reviewPath, reviewText, 'utf8');
fs.writeFileSync(aboutPath, aboutText, 'utf8');
console.log('Google store wiring applied: all location actions use the verified Google Business Profile; product and review loading retry silently during backend cold starts.');
