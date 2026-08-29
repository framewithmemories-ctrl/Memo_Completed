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

// The CMS endpoint is authoritative. Never hydrate the homepage from localStorage and
// never paint the old hard-coded hero image while the CMS request is in flight.
if (!heroText.includes('const [cmsHero, setCmsHero]')) {
  const heroRuntime = `const CMS_DEFAULT_HERO = {
    hero_title: 'Turn Your Moments Into Memories ❤️',
    hero_subtitle: 'Beautifully crafted photo frames and personalized gifts, made with love in Coimbatore.',
    hero_image_url: ''
  };
  const getInitialCmsHero = () => CMS_DEFAULT_HERO;
  const [cmsHero, setCmsHero] = useState(getInitialCmsHero);
  const [cmsHeroLoading, setCmsHeroLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const backend = process.env.REACT_APP_BACKEND_URL;
    if (!backend) {
      clearTimeout(timeoutId);
      setCmsHeroLoading(false);
      return undefined;
    }
    fetch(\`${'${'}backend}/api/cms\`, { signal: controller.signal, cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled) return;
        if (data?.homepage) setCmsHero({ ...CMS_DEFAULT_HERO, ...data.homepage });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setCmsHeroLoading(false);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);`;
  heroText = heroText.replace(heroSignature, `${heroSignature}\n  ${heroRuntime}`);
}

// Replace the legacy hard-coded image carousel with the single authoritative CMS image.
const oldImageBlock = /  const (?:defaultHeroImages|heroImages) = \[[\s\S]*?\n  \];\n  useEffect\(\(\) => \{ const interval = setInterval\(\(\) => setCurrentImageIndex\(prev => \(prev \+ 1\) % heroImages\.length\), 4000\); return \(\) => clearInterval\(interval\); \}, \[[^\]]*\]\);/;
if (oldImageBlock.test(heroText)) {
  heroText = heroText.replace(oldImageBlock, '  const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : [];');
} else if (!heroText.includes('const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : [];')) {
  const oldArrayStart = heroText.indexOf('  const heroImages = [');
  if (oldArrayStart === -1) throw new Error('Unable to locate legacy hero image list');
  const oldArrayEnd = heroText.indexOf('  ];', oldArrayStart);
  if (oldArrayEnd === -1) throw new Error('Unable to locate end of legacy hero image list');
  heroText = heroText.slice(0, oldArrayStart) + '  const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : [];\n' + heroText.slice(oldArrayEnd + 5);
}

const legacyTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">Create <span className="bg-gradient-to-r from-rose-600 via-pink-600 to-orange-500 bg-clip-text text-transparent"> Beautiful </span>Memories with <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"> Custom </span>Photo Frames</h1>';
const cmsTitle = '<h1 className="text-5xl md:text-7xl font-bold text-gray-900 leading-tight">{cmsHero.hero_title || CMS_DEFAULT_HERO.hero_title}</h1>';
if (heroText.includes(legacyTitle)) heroText = heroText.replace(legacyTitle, cmsTitle);

const legacySubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium"><strong>Premium photo frames and personalized gifts</strong><br/>Sublimation Printing Specialists • Custom Mugs • T-Shirts • Corporate Gifts<br/><span className="text-rose-600 font-semibold">Located at Keeranatham Road, Coimbatore</span></p>';
const cmsSubtitle = '<p className="text-xl text-gray-700 leading-relaxed font-medium">{cmsHero.hero_subtitle || CMS_DEFAULT_HERO.hero_subtitle}</p>';
if (heroText.includes(legacySubtitle)) heroText = heroText.replace(legacySubtitle, cmsSubtitle);

// Remove the old image element and carousel dots. Show a neutral skeleton until CMS media arrives.
const oldImageMarkup = /<img src=\{heroImages\[currentImageIndex\]\} alt="Beautiful custom photo frames showcase" className="w-full h-full object-cover rounded-2xl shadow-lg transition-all duration-1000"\/><div className="flex justify-center space-x-2 mt-4">\{heroImages\.map\(\(_,index\)=>[^<]*<button key=\{index\}[^>]*\/>\)\}</div>/;
if (oldImageMarkup.test(heroText)) {
  heroText = heroText.replace(oldImageMarkup, '{cmsHeroLoading ? <div className="w-full h-full rounded-2xl bg-rose-50 animate-pulse" aria-label="Loading homepage image" /> : cmsHero.hero_image_url ? <img src={cmsHero.hero_image_url} alt="Memories homepage" className="w-full h-full object-cover rounded-2xl shadow-lg" /> : <div className="w-full h-full rounded-2xl bg-rose-50 flex items-center justify-center text-rose-300 font-medium">Memories</div>}');
}

if (!heroText.includes('const heroImages = cmsHero.hero_image_url ? [cmsHero.hero_image_url] : [];')) throw new Error('CMS homepage image wiring verification failed');
if (!heroText.includes('{cmsHero.hero_title || CMS_DEFAULT_HERO.hero_title}')) throw new Error('CMS homepage title wiring verification failed');
if (!heroText.includes('{cmsHero.hero_subtitle || CMS_DEFAULT_HERO.hero_subtitle}')) throw new Error('CMS homepage subtitle wiring verification failed');
if (!heroText.includes('cmsHeroLoading')) throw new Error('CMS homepage loading-state wiring verification failed');
if (heroText.includes('images.unsplash.com/photo-1513519245088-0e12902e5a38')) throw new Error('Legacy hero image was not removed');

// Remove the non-CMS promotional badges around the hero image. Discounts and delivery
// offers should only appear when intentionally configured as a current promotion.
const heroPromoBadges = '<div className="absolute -top-6 -right-6 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl animate-bounce"><span className="text-white font-bold text-sm">25% OFF</span></div><div className="absolute -bottom-6 -left-6 w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-pulse"><div className="text-center"><div className="text-white font-bold text-xs">FREE</div><div className="text-white font-bold text-xs">DELIVERY</div></div></div>';
if (heroText.includes(heroPromoBadges)) heroText = heroText.replace(heroPromoBadges, '');

fs.writeFileSync(heroFile, heroText, 'utf8');

// Do not rewrite App.js here. App.js is authoritative source and must remain valid JSX.
console.log('CMS Admin, announcement banner and homepage hero wiring applied; legacy hero image removed and homepage now waits for authoritative CMS media.');
