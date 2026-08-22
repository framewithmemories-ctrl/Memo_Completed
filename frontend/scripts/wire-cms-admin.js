const fs = require('fs');
const path = require('path');

// Admin CMS wiring
const adminFile = path.join(__dirname, '..', 'src', 'components', 'AdminPanel.js');
let adminText = fs.readFileSync(adminFile, 'utf8');

if (!adminText.includes('import ContentManagement from "./ContentManagement";')) {
  const importAnchor = "import {";
  const importIndex = adminText.indexOf(importAnchor);
  if (importIndex === -1) throw new Error('Unable to find AdminPanel import block');
  adminText = adminText.slice(0, importIndex) + 'import ContentManagement from "./ContentManagement";\n' + adminText.slice(importIndex);
}

const start = adminText.indexOf('  const renderContentManagement = () => (');
const end = adminText.indexOf('\n\n  if (!isAuthenticated)', start);
if (start === -1 || end === -1) {
  throw new Error('Unable to locate AdminPanel CMS placeholder block');
}

const replacement = '  const renderContentManagement = () => <ContentManagement API={API} authConfig={adminAuthConfig} />;';
adminText = adminText.slice(0, start) + replacement + adminText.slice(end);

fs.writeFileSync(adminFile, adminText, 'utf8');

const updatedAdmin = fs.readFileSync(adminFile, 'utf8');
if (!updatedAdmin.includes('ContentManagement API={API} authConfig={adminAuthConfig}')) {
  throw new Error('CMS Admin wiring verification failed');
}

// Customer-facing announcement banner and homepage hero wiring.
const heroFile = path.join(__dirname, '..', 'src', 'components', 'MainComponents.js');
let heroText = fs.readFileSync(heroFile, 'utf8');

if (!heroText.includes('import CmsAnnouncementBanner from "./CmsAnnouncementBanner";')) {
  const importAnchor = 'import { Button } from "./ui/button";';
  const importIndex = heroText.indexOf(importAnchor);
  if (importIndex === -1) throw new Error('Unable to find MainComponents import block');
  heroText = heroText.slice(0, importIndex) + 'import CmsAnnouncementBanner from "./CmsAnnouncementBanner";\n' + heroText.slice(importIndex);
}

const legacyBanner = '<span>🎉 Grand Opening Offer: 25% OFF All Frames + Free Home Delivery! 🎉</span>';
if (heroText.includes(legacyBanner)) {
  heroText = heroText.replace(legacyBanner, '<CmsAnnouncementBanner />');
}

if (!heroText.includes('<CmsAnnouncementBanner />')) {
  throw new Error('CMS announcement banner wiring verification failed');
}

// Load homepage CMS content publicly at runtime. The existing hero remains the fallback,
// while title, subtitle and uploaded image override it whenever Admin has saved them.
const heroSignature = 'export const HeroSection = () => {';
if (!heroText.includes(heroSignature)) throw new Error('Unable to locate HeroSection');
if (!heroText.includes('const [cmsHero, setCmsHero]')) {
  heroText = heroText.replace(
    heroSignature,
    `${heroSignature}\n  const [cmsHero, setCmsHero] = useState({ hero_title: '', hero_subtitle: '', hero_image_url: '' });\n  useEffect(() => {\n    let cancelled = false;\n    const backend = process.env.REACT_APP_BACKEND_URL;\n    if (!backend) return undefined;\n    fetch(\`${'${'}backend}/api/cms\`)\n      .then((r) => r.ok ? r.json() : null)\n      .then((data) => { if (!cancelled && data?.homepage) setCmsHero(data.homepage); })\n      .catch(() => {});\n    return () => { cancelled = true; };\n  }, []);`
  );
}

if (!heroText.includes('const heroImages = [')) throw new Error('Unable to locate hero image list');
heroText = heroText.replace(
  'const heroImages = [',
  'const defaultHeroImages = ['
);
heroText = heroText.replace(
  '  ];\n  useEffect(() => { const interval = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % heroImages.length), 4000); return () => clearInterval(interval); }, []);',
  '  ];\n  const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : defaultHeroImages;\n  useEffect(() => { const interval = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % heroImages.length), 4000); return () => clearInterval(interval); }, [heroImages.length]);'
);

const legacyTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">Create <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent"> Beautiful </span>Memories with <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Custom </span>Photo Frames</h1>';
const cmsTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">{cmsHero.hero_title || <>Create <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent"> Beautiful </span>Memories with <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Custom </span>Photo Frames</>}</h1>';
if (heroText.includes(legacyTitle)) heroText = heroText.replace(legacyTitle, cmsTitle);

const legacySubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium"><strong>Premium photo frames and personalized gifts</strong><br/>Sublimation Printing Specialists • Custom Mugs • T-Shirts • Corporate Gifts<br/><span className="text-rose-600 font-semibold">Located at Keeranatham Road, Coimbatore</span></p>';
const cmsSubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium">{cmsHero.hero_subtitle || <> <strong>Premium photo frames and personalized gifts</strong><br/>Sublimation Printing Specialists • Custom Mugs • T-Shirts • Corporate Gifts<br/><span className="text-rose-600 font-semibold">Located at Keeranatham Road, Coimbatore</span></>}</p>';
if (heroText.includes(legacySubtitle)) heroText = heroText.replace(legacySubtitle, cmsSubtitle);

if (!heroText.includes('const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : defaultHeroImages;')) {
  throw new Error('CMS homepage image wiring verification failed');
}
if (!heroText.includes('{cmsHero.hero_title ||')) {
  throw new Error('CMS homepage title wiring verification failed');
}
if (!heroText.includes('{cmsHero.hero_subtitle ||')) {
  throw new Error('CMS homepage subtitle wiring verification failed');
}

fs.writeFileSync(heroFile, heroText, 'utf8');
console.log('CMS Admin, announcement banner and homepage hero wiring applied and verified.');
