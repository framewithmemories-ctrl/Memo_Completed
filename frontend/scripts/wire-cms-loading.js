const fs = require('fs');
const path = require('path');

// Build-time guard for the public homepage. CMS and lower-page APIs must never
// block the first paint of the storefront.
const bannerFile = path.join(__dirname, '..', 'src', 'components', 'CmsAnnouncementBanner.js');
let bannerText = fs.readFileSync(bannerFile, 'utf8');

if (bannerText.includes('Grand Opening Offer: 25% OFF All Frames + Free Home Delivery!')) {
  throw new Error('Legacy announcement fallback is still present');
}
if (!bannerText.includes('min-h-[44px]')) {
  throw new Error('CMS announcement banner must reserve stable height while loading');
}

// Keep the hero visible immediately; CMS data is hydrated in the background by
// wire-cms-admin.js using cached data/safe defaults.
const heroFile = path.join(__dirname, '..', 'src', 'components', 'MainComponents.js');
let heroText = fs.readFileSync(heroFile, 'utf8');
heroText = heroText.replace(
  /className=\{`relative min-h-\[700px\] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden \$\{cmsHeroLoaded \? "opacity-100" : "opacity-0"\}`\}/g,
  'className="relative min-h-[700px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden"'
);
fs.writeFileSync(heroFile, heroText, 'utf8');

// Critical performance fix: the previous Home component returned a full-screen
// loading page until /api/products responded. Render the storefront immediately
// and let ProductGrid populate when the products request completes.
const appFile = path.join(__dirname, '..', 'src', 'App.js');
let appText = fs.readFileSync(appFile, 'utf8');

const loadingGate = /\n\s*if \(loading\) \{\n\s*return \(\n\s*<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-50">[\s\S]*?\n\s*\);\n\s*\}\n/;
if (loadingGate.test(appText)) {
  appText = appText.replace(loadingGate, '\n');
}

// Product data is optional for first paint. A slow/waking backend must not keep
// the homepage behind a spinner. Also cap the request so it cannot linger.
appText = appText.replace(
  'const response = await axios.get(`${API}/products`);',
  'const response = await axios.get(`${API}/products`, { timeout: 6000 });'
);

// The legacy hard-coded TestimonialsSection contains invented customer names and
// review text. Google Reviews is now the sole customer-review presentation.
appText = appText.replace(/\n\s*<TestimonialsSection \/>/g, '');

fs.writeFileSync(appFile, appText, 'utf8');

const verified = fs.readFileSync(appFile, 'utf8');
if (/if \(loading\) \{/.test(verified)) {
  throw new Error('Homepage product loading gate was not removed');
}
if (!verified.includes('timeout: 6000')) {
  throw new Error('Homepage product request timeout was not applied');
}
if (verified.includes('<TestimonialsSection />')) {
  throw new Error('Legacy hard-coded testimonials are still rendered');
}

console.log('Homepage loading guard applied: storefront renders immediately, products load in background, legacy testimonials removed.');
