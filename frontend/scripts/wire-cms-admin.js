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
if (heroText.includes(legacyBanner)) heroText = heroText.replace(legacyBanner, '<CmsAnnouncementBanner />');
if (!heroText.includes('<CmsAnnouncementBanner />')) throw new Error('CMS announcement banner wiring verification failed');

const heroSignature = 'export const HeroSection = () => {';
if (!heroText.includes(heroSignature)) throw new Error('Unable to locate HeroSection');

// Render immediately using the last successful CMS value (or safe non-promotional defaults),
// then refresh CMS content in the background. This prevents a sleeping Render service from
// making the entire homepage appear to hang for 20-30+ seconds.
if (!heroText.includes('const [cmsHero, setCmsHero]')) {
  const heroRuntime = `const CMS_DEFAULT_HERO = {
    hero_title: 'Turn Your Moments Into Memories ❤️',
    hero_subtitle: 'Beautifully crafted photo frames and personalized gifts, made with love in Coimbatore.',
    hero_image_url: ''
  };
  const getInitialCmsHero = () => {
    if (typeof window === 'undefined') return CMS_DEFAULT_HERO;
    try {
      const cached = JSON.parse(window.localStorage.getItem('memories_cms_homepage') || 'null');
      return cached?.homepage ? { ...CMS_DEFAULT_HERO, ...cached.homepage } : CMS_DEFAULT_HERO;
    } catch (_) {
      return CMS_DEFAULT_HERO;
    }
  };
  const [cmsHero, setCmsHero] = useState(getInitialCmsHero);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const backend = process.env.REACT_APP_BACKEND_URL;
    if (!backend) {
      clearTimeout(timeoutId);
      return undefined;
    }
    fetch(\`${'${'}backend}/api/cms\`, { signal: controller.signal, cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.homepage) return;
        const next = { ...CMS_DEFAULT_HERO, ...data.homepage };
        setCmsHero(next);
        try { window.localStorage.setItem('memories_cms_homepage', JSON.stringify({ homepage: next })); } catch (_) {}
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeoutId));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);`;
  heroText = heroText.replace(heroSignature, `${heroSignature}\n  ${heroRuntime}`);
}

if (!heroText.includes('const heroImages = [')) throw new Error('Unable to locate hero image list');
heroText = heroText.replace('const heroImages = [', 'const defaultHeroImages = [');
heroText = heroText.replace(
  '  ];\n  useEffect(() => { const interval = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % heroImages.length), 4000); return () => clearInterval(interval); }, []);',
  '  ];\n  const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : defaultHeroImages;\n  useEffect(() => { const interval = setInterval(() => setCurrentImageIndex(prev => (prev + 1) % heroImages.length), 4000); return () => clearInterval(interval); }, [heroImages.length]);'
);

const legacyTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">Create <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent"> Beautiful </span>Memories with <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Custom </span>Photo Frames</h1>';
const cmsTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">{cmsHero.hero_title || CMS_DEFAULT_HERO.hero_title}</h1>';
if (heroText.includes(legacyTitle)) heroText = heroText.replace(legacyTitle, cmsTitle);

const legacySubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium"><strong>Premium photo frames and personalized gifts</strong><br/>Sublimation Printing Specialists • Custom Mugs • T-Shirts • Corporate Gifts<br/><span className="text-rose-600 font-semibold">Located at Keeranatham Road, Coimbatore</span></p>';
const cmsSubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium">{cmsHero.hero_subtitle || CMS_DEFAULT_HERO.hero_subtitle}</p>';
if (heroText.includes(legacySubtitle)) heroText = heroText.replace(legacySubtitle, cmsSubtitle);

if (!heroText.includes('const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : defaultHeroImages;')) throw new Error('CMS homepage image wiring verification failed');
if (!heroText.includes('{cmsHero.hero_title || CMS_DEFAULT_HERO.hero_title}')) throw new Error('CMS homepage title wiring verification failed');
if (!heroText.includes('{cmsHero.hero_subtitle || CMS_DEFAULT_HERO.hero_subtitle}')) throw new Error('CMS homepage subtitle wiring verification failed');

// Remove the non-CMS promotional badges around the hero image. Discounts and delivery
// offers should only appear when intentionally configured as a current promotion.
const heroPromoBadges = '<div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl animate-bounce"><span className="text-white font-bold text-sm">25% OFF</span></div><div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-pulse"><div className="text-center"><div className="text-white font-bold text-xs">FREE</div><div className="text-white font-bold text-xs">DELIVERY</div></div></div>';
if (heroText.includes(heroPromoBadges)) heroText = heroText.replace(heroPromoBadges, '');

fs.writeFileSync(heroFile, heroText, 'utf8');

// Remove the static header delivery claim as delivery offers are not permanent.
const appFile = path.join(__dirname, '..', 'src', 'App.js');
let appText = fs.readFileSync(appFile, 'utf8');
appText = appText.replace(/\s*<Badge variant="secondary" className="bg-green-100 text-green-800 animate-pulse">\s*<Truck className="w-3 h-3 mr-1"\s*\/>\s*Free Delivery Available\s*<\/Badge>/, '');
fs.writeFileSync(appFile, appText, 'utf8');

console.log('CMS Admin, announcement banner and homepage hero wiring applied; homepage CMS is now non-blocking.');
