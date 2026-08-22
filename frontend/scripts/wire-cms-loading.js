const fs = require('fs');
const path = require('path');

// Build-time guard for the public homepage. Do NOT hide the hero while CMS
// requests are in flight: a sleeping backend can wake slowly on Render, and
// hiding the hero creates a visible blank/fold effect on first load.
const bannerFile = path.join(__dirname, '..', 'src', 'components', 'CmsAnnouncementBanner.js');
let bannerText = fs.readFileSync(bannerFile, 'utf8');

// The banner component owns a fixed-height placeholder while CMS data loads.
// Keep this script idempotent and refuse to reintroduce the old hard-coded offer.
if (bannerText.includes('Grand Opening Offer: 25% OFF All Frames + Free Home Delivery!')) {
  throw new Error('Legacy announcement fallback is still present');
}
if (!bannerText.includes('min-h-[20px]')) {
  throw new Error('CMS announcement banner must reserve stable height while loading');
}

// wire-cms-admin.js is responsible for homepage CMS wiring. This script
// intentionally does not add an opacity/loading gate around HeroSection.
const heroFile = path.join(__dirname, '..', 'src', 'components', 'MainComponents.js');
let heroText = fs.readFileSync(heroFile, 'utf8');

// Remove the old loading gate if it exists in a previously transformed working tree.
heroText = heroText.replace(
  /className=\{`relative min-h-\[700px\] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden \$\{cmsHeroLoaded \? "opacity-100" : "opacity-0"\}`\}/g,
  'className="relative min-h-[700px] bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 overflow-hidden"'
);

fs.writeFileSync(heroFile, heroText, 'utf8');
console.log('CMS loading guard verified: homepage renders immediately and announcement height remains stable.');
